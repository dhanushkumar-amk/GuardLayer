import request from 'supertest';
import { app, server, queueService } from '../src/index';
import pool from '../src/db/postgres';
import { LoggerService } from '../src/services/logger.service';
import crypto from 'crypto';

const TEST_KEY_1 = '22222222-2222-2222-2222-222222222222';
const TEST_KEY_2 = '33333333-3333-3333-3333-333333333333';

const reqId1 = crypto.randomUUID();
const reqId2 = crypto.randomUUID();
const reqId3 = crypto.randomUUID();
const reqId4 = crypto.randomUUID();
const reqId5 = crypto.randomUUID();

const logger = new LoggerService();

afterAll(async () => {
  // Shutdown queue listener and server
  await queueService.stop();
  server.close();

  // Cleanup test data
  await pool.query('DELETE FROM audit_logs WHERE api_key_id IN ($1, $2)', [TEST_KEY_1, TEST_KEY_2]);
  await pool.query('DELETE FROM api_keys WHERE id IN ($1, $2)', [TEST_KEY_1, TEST_KEY_2]);
  await pool.end();
});

describe('Audit API Endpoints', () => {
  beforeAll(async () => {
    // Insert test keys
    await pool.query(
      `INSERT INTO api_keys (id, name, key_hash, key_prefix, is_active)
       VALUES ($1, 'key-1', 'hash-1', 'prefix1', true)
       ON CONFLICT (id) DO NOTHING`,
      [TEST_KEY_1]
    );

    await pool.query(
      `INSERT INTO api_keys (id, name, key_hash, key_prefix, is_active)
       VALUES ($1, 'key-2', 'hash-2', 'prefix2', true)
       ON CONFLICT (id) DO NOTHING`,
      [TEST_KEY_2]
    );

    // Seed audit logs
    const now = new Date();
    
    // Log 1: Key 1, blocked, 4 hours ago
    await logger.writeAuditLog({
      request_id: reqId1,
      api_key_id: TEST_KEY_1,
      original_input: 'Blocked prompt 1',
      was_blocked: true,
      block_reason: 'Jailbreak',
      created_at: new Date(now.getTime() - 4 * 60 * 60 * 1000)
    });

    // Log 2: Key 1, clean, 3 hours ago
    await logger.writeAuditLog({
      request_id: reqId2,
      api_key_id: TEST_KEY_1,
      original_input: 'Clean prompt 2',
      was_blocked: false,
      created_at: new Date(now.getTime() - 3 * 60 * 60 * 1000)
    });

    // Log 3: Key 2, blocked, 2 hours ago
    await logger.writeAuditLog({
      request_id: reqId3,
      api_key_id: TEST_KEY_2,
      original_input: 'Blocked prompt 3',
      was_blocked: true,
      block_reason: 'Toxicity',
      created_at: new Date(now.getTime() - 2 * 60 * 60 * 1000)
    });

    // Log 4: Key 1, clean, 1 hour ago
    await logger.writeAuditLog({
      request_id: reqId4,
      api_key_id: TEST_KEY_1,
      original_input: 'Clean prompt 4',
      was_blocked: false,
      created_at: new Date(now.getTime() - 1 * 60 * 60 * 1000)
    });

    // Log 5: Key 1, clean, just now
    await logger.writeAuditLog({
      request_id: reqId5,
      api_key_id: TEST_KEY_1,
      original_input: 'Clean prompt 5',
      was_blocked: false,
      created_at: now
    });
  });

  it('should return paginated audit logs', async () => {
    const res = await request(app).get('/api/audit');
    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.data.length).toBeGreaterThanOrEqual(5);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.total).toBeGreaterThanOrEqual(5);
  });

  it('should filter audit logs by api_key_id', async () => {
    const res = await request(app).get(`/api/audit?api_key_id=${TEST_KEY_1}`);
    expect(res.status).toBe(200);
    // Should return 4 logs seeded for TEST_KEY_1
    const matching = res.body.data.filter((d: any) => d.api_key_id === TEST_KEY_1);
    expect(matching.length).toBe(4);
  });

  it('should filter audit logs by was_blocked true', async () => {
    const res = await request(app).get('/api/audit?was_blocked=true');
    expect(res.status).toBe(200);
    // Should return 2 blocked logs
    const matching = res.body.data.filter((d: any) => d.api_key_id === TEST_KEY_1 || d.api_key_id === TEST_KEY_2);
    expect(matching.filter((d: any) => d.was_blocked === true).length).toBe(2);
  });

  it('should filter audit logs by date range', async () => {
    const now = new Date();
    const fromDate = new Date(now.getTime() - 2.5 * 60 * 60 * 1000).toISOString(); // 2.5 hours ago
    const toDate = new Date(now.getTime() - 0.5 * 60 * 60 * 1000).toISOString();   // 0.5 hours ago

    const res = await request(app).get(`/api/audit?from_date=${fromDate}&to_date=${toDate}`);
    expect(res.status).toBe(200);
    
    // Within this range, Log 3 (2h ago) and Log 4 (1h ago) should match
    const ids = res.body.data.map((d: any) => d.id);
    expect(ids).toContain(reqId3);
    expect(ids).toContain(reqId4);
    expect(ids).not.toContain(reqId1); // 4h ago
    expect(ids).not.toContain(reqId5); // just now
  });

  it('should return a single audit log by request_id', async () => {
    const res = await request(app).get(`/api/audit/${reqId2}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(reqId2);
    expect(res.body.original_input).toBe('Clean prompt 2');
  });

  it('should enforce limit and page parameters correctly', async () => {
    const res = await request(app).get('/api/audit?page=1&limit=2');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
    expect(res.body.pagination.limit).toBe(2);
    expect(res.body.pagination.page).toBe(1);
  });

  it('should cap limit parameter to 100 if a higher value is provided', async () => {
    const res = await request(app).get('/api/audit?limit=150');
    expect(res.status).toBe(200);
    expect(res.body.pagination.limit).toBe(100);
  });
});
