import { QueueService } from '../src/services/queue.service';
import { LoggerService } from '../src/services/logger.service';
import { redisClient } from '../src/db/redis';
import pool from '../src/db/postgres';
import crypto from 'crypto';

const TEST_API_KEY_ID = '11111111-1111-1111-1111-111111111111';

describe('Queue Service Pub/Sub Processing', () => {
  let queueService: QueueService;

  beforeAll(async () => {
    // Insert test api key
    await pool.query(
      `INSERT INTO api_keys (id, name, key_hash, key_prefix, is_active)
       VALUES ($1, 'test-queue-key', 'hash-queue-key', 'prefix', true)
       ON CONFLICT (id) DO NOTHING`,
      [TEST_API_KEY_ID]
    );

    queueService = new QueueService();
    await queueService.start();
    // Wait briefly for subscription to stabilize
    await new Promise((resolve) => setTimeout(resolve, 200));
  });

  afterAll(async () => {
    await queueService.stop();
    await pool.query('DELETE FROM threat_logs WHERE api_key_id = $1', [TEST_API_KEY_ID]);
    await pool.query('DELETE FROM audit_logs WHERE api_key_id = $1', [TEST_API_KEY_ID]);
    await pool.query('DELETE FROM api_keys WHERE id = $1', [TEST_API_KEY_ID]);
    await redisClient.quit();
    await pool.end();
  });

  it('should consume audit events published to Redis and write to postgres', async () => {
    const requestId = crypto.randomUUID();
    const event = {
      request_id: requestId,
      api_key_id: TEST_API_KEY_ID,
      original_input: 'Queue audit text',
      scrubbed_input: 'Queue audit text',
      llm_response: 'Response content',
      scrubbed_response: 'Response content',
      was_blocked: false,
      latency_ms: 120,
      llm_provider: 'groq',
      llm_model: 'llama3'
    };

    await redisClient.publish('guardlayer:audit', JSON.stringify(event));

    // Wait for the consumer to write
    await new Promise((resolve) => setTimeout(resolve, 300));

    const result = await pool.query('SELECT * FROM audit_logs WHERE id = $1', [requestId]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].original_input).toBe('Queue audit text');
  });

  it('should consume threat events published to Redis and write to postgres', async () => {
    const requestId = crypto.randomUUID();
    const threatId = crypto.randomUUID();
    const event = {
      id: threatId,
      request_id: requestId,
      api_key_id: TEST_API_KEY_ID,
      threat_type: 'jailbreak',
      threat_score: 0.92,
      original_input: 'bad prompt',
      guard_name: 'jailbreak_guard'
    };

    await redisClient.publish('guardlayer:threats', JSON.stringify(event));

    // Wait for consumer
    await new Promise((resolve) => setTimeout(resolve, 300));

    const result = await pool.query('SELECT * FROM threat_logs WHERE id = $1', [threatId]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].threat_type).toBe('jailbreak');
  });

  it('should handle malformed JSON event gracefully without crashing service', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await redisClient.publish('guardlayer:audit', 'invalid_json{');
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should retry failed writes 3 times on postgres error', async () => {
    const originalWrite = LoggerService.prototype.writeAuditLog;
    
    let calls = 0;
    LoggerService.prototype.writeAuditLog = async function() {
      calls++;
      throw new Error('DB write failure');
    };

    const requestId = crypto.randomUUID();
    const event = {
      request_id: requestId,
      api_key_id: TEST_API_KEY_ID
    };

    await redisClient.publish('guardlayer:audit', JSON.stringify(event));
    // Wait for retries (100ms, 200ms, 400ms delay backoff)
    await new Promise((resolve) => setTimeout(resolve, 1200));

    // 1 initial try + 3 retries = 4 calls total
    expect(calls).toBe(4);

    // Restore original method
    LoggerService.prototype.writeAuditLog = originalWrite;
  });
});
