import request from 'supertest';
import app from '../src/index';
import pool from '../src/db/postgres';
import redis from '../src/db/redis';
import { ConfigServiceClient } from '../src/services/config.service';
import bcrypt from 'bcryptjs';

jest.mock('../src/db/postgres', () => {
  return {
    query: jest.fn(),
  };
});

const mockMulti = {
  incr: jest.fn().mockReturnThis(),
  ttl: jest.fn().mockReturnThis(),
  exec: jest.fn(),
};

jest.mock('../src/db/redis', () => {
  return {
    __esModule: true,
    default: {
      multi: jest.fn(() => mockMulti),
      expire: jest.fn().mockResolvedValue('OK'),
    },
  };
});

jest.mock('../src/services/config.service', () => {
  return {
    ConfigServiceClient: {
      fetchConfig: jest.fn(),
    },
  };
});

describe('API Key Authentication & Rate Limiting Middleware', () => {
  const validRawKey = 'gl-validkey1234567890';
  let validKeyHash: string;

  beforeAll(async () => {
    validKeyHash = await bcrypt.hash(validRawKey, 10);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock behavior for Redis multi to avoid rate limiting
    mockMulti.exec.mockResolvedValue([
      [null, 1], // incr result
      [null, 59], // ttl result
    ]);
  });

  describe('GET /v1/chat/completions (Protected Endpoint)', () => {
    it('should return 401 if Authorization header is missing', async () => {
      const res = await request(app)
        .post('/v1/chat/completions')
        .send({});

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED_MISSING_API_KEY');
    });

    it('should return 401 if API key format does not start with gl-', async () => {
      const res = await request(app)
        .post('/v1/chat/completions')
        .set('Authorization', 'Bearer invalidkey123')
        .send({});

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED_INVALID_KEY_FORMAT');
    });

    it('should return 401 if API key is not found in database', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 0, rows: [] });

      const res = await request(app)
        .post('/v1/chat/completions')
        .set('Authorization', `Bearer ${validRawKey}`)
        .send({});

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED_INVALID_KEY');
    });

    it('should return 401 if API key matches hash but is revoked/inactive', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'key-id-123', key_hash: validKeyHash, is_active: false }],
      });

      const res = await request(app)
        .post('/v1/chat/completions')
        .set('Authorization', `Bearer ${validRawKey}`)
        .send({});

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED_REVOKED_KEY');
    });

    it('should return 200 placeholder and attach config on valid active API key', async () => {
      const mockConfig = { id: 'config-uuid-999', prompt_injection_enabled: true, max_tokens: 1500 };
      
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [{ id: 'key-id-123', key_hash: validKeyHash, is_active: true }],
        }) // select query
        .mockResolvedValueOnce({ rowCount: 1 }); // update query (last_used_at)

      (ConfigServiceClient.fetchConfig as jest.Mock).mockResolvedValueOnce(mockConfig);

      const res = await request(app)
        .post('/v1/chat/completions')
        .set('Authorization', `Bearer ${validRawKey}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('proxy coming in next phase');
      expect(res.body.config).toEqual(mockConfig);
      expect(ConfigServiceClient.fetchConfig).toHaveBeenCalledWith('key-id-123');
    });

    it('should return 429 when API key rate limit is exceeded (101 requests)', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'key-id-123', key_hash: validKeyHash, is_active: true }],
      });

      // Mock rate limiter to return 101 requests (exceeded max 100)
      mockMulti.exec.mockResolvedValueOnce([
        [null, 101], // incr result
        [null, 45], // ttl result
      ]);

      const res = await request(app)
        .post('/v1/chat/completions')
        .set('Authorization', `Bearer ${validRawKey}`)
        .send({});

      expect(res.status).toBe(429);
      expect(res.body.code).toBe('TOO_MANY_REQUESTS');
    });
  });
});
