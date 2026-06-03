import request from 'supertest';
import { app, server, queueService } from '../src/index';
import pool from '../src/db/postgres';
import { LoggerService } from '../src/services/logger.service';
import crypto from 'crypto';

const ANALYTICS_KEY = '66666666-6666-6666-6666-666666666666';
const EMPTY_KEY = '77777777-7777-7777-7777-777777777777';

const reqId1 = crypto.randomUUID();
const reqId2 = crypto.randomUUID();
const reqId3 = crypto.randomUUID();

const threatId1 = crypto.randomUUID();
const threatId2 = crypto.randomUUID();

const logger = new LoggerService();

afterAll(async () => {
  await queueService.stop();
  server.close();

  // Cleanup seeded data
  await pool.query('DELETE FROM threat_logs WHERE api_key_id IN ($1, $2)', [ANALYTICS_KEY, EMPTY_KEY]);
  await pool.query('DELETE FROM audit_logs WHERE api_key_id IN ($1, $2)', [ANALYTICS_KEY, EMPTY_KEY]);
  await pool.query('DELETE FROM api_keys WHERE id IN ($1, $2)', [ANALYTICS_KEY, EMPTY_KEY]);
  await pool.end();
});

describe('Analytics API Endpoints', () => {
  beforeAll(async () => {
    // Insert test keys
    await pool.query(
      `INSERT INTO api_keys (id, name, key_hash, key_prefix, is_active)
       VALUES ($1, 'akey-1', 'ahash-1', 'prefix5', true)
       ON CONFLICT (id) DO NOTHING`,
      [ANALYTICS_KEY]
    );

    await pool.query(
      `INSERT INTO api_keys (id, name, key_hash, key_prefix, is_active)
       VALUES ($1, 'akey-empty', 'ahash-empty', 'prefix6', true)
       ON CONFLICT (id) DO NOTHING`,
      [EMPTY_KEY]
    );

    const now = new Date();

    // 1. Audit Log 1: 3 hours ago, blocked, latency = 100ms
    await logger.writeAuditLog({
      request_id: reqId1,
      api_key_id: ANALYTICS_KEY,
      original_input: 'bad input 1',
      was_blocked: true,
      block_reason: 'Jailbreak',
      latency_ms: 100,
      created_at: new Date(now.getTime() - 3 * 60 * 60 * 1000)
    });

    // 2. Audit Log 2: 2 hours ago, clean, latency = 200ms
    await logger.writeAuditLog({
      request_id: reqId2,
      api_key_id: ANALYTICS_KEY,
      original_input: 'clean input 2',
      was_blocked: false,
      latency_ms: 200,
      created_at: new Date(now.getTime() - 2 * 60 * 60 * 1000)
    });

    // 3. Audit Log 3: 1 hour ago, clean, latency = 300ms, PII scrubber triggered
    await logger.writeAuditLog({
      request_id: reqId3,
      api_key_id: ANALYTICS_KEY,
      original_input: 'email@example.com input 3',
      was_blocked: false,
      latency_ms: 300,
      input_guards_triggered: [{ guard: 'pii_scrubber', score: 0.85, details: {} }],
      created_at: new Date(now.getTime() - 1 * 60 * 60 * 1000)
    });

    // Seed threats associated
    // Threat 1: jailbreak on req 1
    await logger.writeThreatLog({
      id: threatId1,
      request_id: reqId1,
      api_key_id: ANALYTICS_KEY,
      threat_type: 'jailbreak',
      threat_score: 0.95,
      detected_at: new Date(now.getTime() - 3 * 60 * 60 * 1000),
      guard_name: 'jailbreak_guard'
    });

    // Threat 2: pii on req 3
    await logger.writeThreatLog({
      id: threatId2,
      request_id: reqId3,
      api_key_id: ANALYTICS_KEY,
      threat_type: 'pii',
      threat_score: 0.85,
      detected_at: new Date(now.getTime() - 1 * 60 * 60 * 1000),
      guard_name: 'presidio_guard'
    });
  });

  it('should return aggregate analytics for a 24h period with hourly buckets', async () => {
    const res = await request(app)
      .get(`/api/analytics?api_key_id=${ANALYTICS_KEY}&period=24h`);

    expect(res.status).toBe(200);
    expect(res.body.total_requests).toBe(3);
    expect(res.body.blocked_requests).toBe(1);
    expect(res.body.block_rate).toBeCloseTo(33.33, 1);
    expect(res.body.average_latency_ms).toBe(200); // (100+200+300)/3
    expect(res.body.pii_detections_count).toBe(1);
    expect(res.body.threats_by_type).toEqual({
      jailbreak: 1,
      pii: 1
    });
    expect(res.body.top_threat_types).toHaveLength(2);
    expect(res.body.requests_over_time.length).toBeGreaterThanOrEqual(1);
  });

  it('should return aggregate analytics for a 7d period with daily buckets', async () => {
    const res = await request(app)
      .get(`/api/analytics?api_key_id=${ANALYTICS_KEY}&period=7d`);

    expect(res.status).toBe(200);
    expect(res.body.total_requests).toBe(3);
    // Over time should return daily buckets (check date truncations)
    expect(res.body.requests_over_time.length).toBeGreaterThanOrEqual(1);
  });

  it('should return overall summary stats across all API keys', async () => {
    const res = await request(app).get('/api/analytics/summary?period=24h');
    expect(res.status).toBe(200);
    // Summary aggregates everything, so total must be at least 3
    expect(res.body.total_requests).toBeGreaterThanOrEqual(3);
    expect(res.body.blocked_requests).toBeGreaterThanOrEqual(1);
  });

  it('should handle periods with empty data by returning zeros not errors', async () => {
    const res = await request(app)
      .get(`/api/analytics?api_key_id=${EMPTY_KEY}&period=24h`);

    expect(res.status).toBe(200);
    expect(res.body.total_requests).toBe(0);
    expect(res.body.blocked_requests).toBe(0);
    expect(res.body.block_rate).toBe(0);
    expect(res.body.average_latency_ms).toBe(0);
    expect(res.body.pii_detections_count).toBe(0);
    expect(res.body.threats_by_type).toEqual({});
    expect(res.body.requests_over_time).toEqual([]);
  });
});
