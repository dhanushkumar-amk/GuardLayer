import request from 'supertest';
import { app, server, queueService } from '../src/index';
import pool from '../src/db/postgres';
import { LoggerService } from '../src/services/logger.service';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const THREAT_KEY_1 = '44444444-4444-4444-4444-444444444444';
const THREAT_KEY_2 = '55555555-5555-5555-5555-555555555555';

const reqId1 = crypto.randomUUID();
const reqId2 = crypto.randomUUID();
const reqId3 = crypto.randomUUID();
const reqId4 = crypto.randomUUID();
const reqId5 = crypto.randomUUID();

const threatId1 = crypto.randomUUID();
const threatId2 = crypto.randomUUID();
const threatId3 = crypto.randomUUID();
const threatId4 = crypto.randomUUID();
const threatId5 = crypto.randomUUID();

const logger = new LoggerService();

afterAll(async () => {
  await queueService.stop();
  server.close();

  // Cleanup seeded data
  await pool.query('DELETE FROM threat_logs WHERE api_key_id IN ($1, $2)', [THREAT_KEY_1, THREAT_KEY_2]);
  await pool.query('DELETE FROM audit_logs WHERE api_key_id IN ($1, $2)', [THREAT_KEY_1, THREAT_KEY_2]);
  await pool.query('DELETE FROM api_keys WHERE id IN ($1, $2)', [THREAT_KEY_1, THREAT_KEY_2]);
  await pool.end();
});

describe('Threat API Endpoints', () => {
  beforeAll(async () => {
    // Insert test keys
    await pool.query(
      `INSERT INTO api_keys (id, name, key_hash, key_prefix, is_active)
       VALUES ($1, 'tkey-1', 'thash-1', 'prefix3', true)
       ON CONFLICT (id) DO NOTHING`,
      [THREAT_KEY_1]
    );

    await pool.query(
      `INSERT INTO api_keys (id, name, key_hash, key_prefix, is_active)
       VALUES ($1, 'tkey-2', 'thash-2', 'prefix4', true)
       ON CONFLICT (id) DO NOTHING`,
      [THREAT_KEY_2]
    );

    const now = new Date();

    // Log 1: Key 1, jailbreak, 4 hours ago
    await logger.writeThreatLog({
      id: threatId1,
      request_id: reqId1,
      api_key_id: THREAT_KEY_1,
      threat_type: 'jailbreak',
      threat_score: 0.95,
      detected_at: new Date(now.getTime() - 4 * 60 * 60 * 1000),
      guard_name: 'jailbreak_guard'
    });

    // Log 2: Key 1, toxicity, 3 hours ago
    await logger.writeThreatLog({
      id: threatId2,
      request_id: reqId2,
      api_key_id: THREAT_KEY_1,
      threat_type: 'toxicity',
      threat_score: 0.88,
      detected_at: new Date(now.getTime() - 3 * 60 * 60 * 1000),
      guard_name: 'detoxify_guard'
    });

    // Log 3: Key 2, jailbreak, 2 hours ago
    await logger.writeThreatLog({
      id: threatId3,
      request_id: reqId3,
      api_key_id: THREAT_KEY_2,
      threat_type: 'jailbreak',
      threat_score: 0.91,
      detected_at: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      guard_name: 'jailbreak_guard'
    });

    // Log 4: Key 1, pii, 1 hour ago
    await logger.writeThreatLog({
      id: threatId4,
      request_id: reqId4,
      api_key_id: THREAT_KEY_1,
      threat_type: 'pii',
      threat_score: 0.85,
      detected_at: new Date(now.getTime() - 1 * 60 * 60 * 1000),
      guard_name: 'presidio_guard'
    });

    // Log 5: Key 1, toxicity, just now
    await logger.writeThreatLog({
      id: threatId5,
      request_id: reqId5,
      api_key_id: THREAT_KEY_1,
      threat_type: 'toxicity',
      threat_score: 0.99,
      detected_at: now,
      guard_name: 'detoxify_guard'
    });
  });

  it('should return paginated threat logs', async () => {
    const res = await request(app).get('/api/threats');
    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.data.length).toBeGreaterThanOrEqual(5);
    expect(res.body.pagination).toBeDefined();
  });

  it('should filter threats by threat_type', async () => {
    const res = await request(app).get('/api/threats?threat_type=jailbreak');
    expect(res.status).toBe(200);
    const matching = res.body.data.filter((d: any) => d.api_key_id === THREAT_KEY_1 || d.api_key_id === THREAT_KEY_2);
    expect(matching.length).toBe(2);
    expect(matching.every((d: any) => d.threat_type === 'jailbreak')).toBe(true);
  });

  it('should return recent threats feed capped at 20', async () => {
    const res = await request(app).get('/api/threats/recent');
    expect(res.status).toBe(200);
    expect(res.body).toBeInstanceOf(Array);
    expect(res.body.length).toBeLessThanOrEqual(20);
    // Verified sorting
    if (res.body.length >= 2) {
      const date1 = new Date(res.body[0].detected_at).getTime();
      const date2 = new Date(res.body[1].detected_at).getTime();
      expect(date1).toBeGreaterThanOrEqual(date2);
    }
  });

  it('should filter threats by api_key_id', async () => {
    const res = await request(app).get(`/api/threats?api_key_id=${THREAT_KEY_1}`);
    expect(res.status).toBe(200);
    const matching = res.body.data.filter((d: any) => d.api_key_id === THREAT_KEY_1);
    expect(matching.length).toBe(4);
  });

  it('should filter threats by date range', async () => {
    const now = new Date();
    const fromDate = new Date(now.getTime() - 2.5 * 60 * 60 * 1000).toISOString(); // 2.5 hours ago
    const toDate = new Date(now.getTime() - 0.5 * 60 * 60 * 1000).toISOString();   // 0.5 hours ago

    const res = await request(app).get(`/api/threats?from_date=${fromDate}&to_date=${toDate}`);
    expect(res.status).toBe(200);

    const ids = res.body.data.map((d: any) => d.id);
    // Should contain Log 3 (2h ago) and Log 4 (1h ago)
    expect(ids).toContain(threatId3);
    expect(ids).toContain(threatId4);
    expect(ids).not.toContain(threatId1); // 4h ago
    expect(ids).not.toContain(threatId5); // just now
  });

  it('should return 401 for threats export without authorization header', async () => {
    const res = await request(app).get('/api/threats/export');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Missing authentication token');
  });

  it('should return 401 for threats export with invalid JWT token', async () => {
    const res = await request(app)
      .get('/api/threats/export')
      .set('Authorization', 'Bearer invalid-token-sig');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid or expired token');
  });

  it('should return 200 and stream CSV for threats export with valid JWT token', async () => {
    const token = jwt.sign({ userId: 'test-admin' }, process.env.JWT_SECRET || 'guardlayer-default-jwt-secret-key');
    const res = await request(app)
      .get('/api/threats/export')
      .set('Authorization', `Bearer ${token}`);
    
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toContain('attachment; filename="guardlayer-threats-');
    expect(res.text).toContain('Threat ID');
    expect(res.text).toContain('Threat Type');
  });
});
