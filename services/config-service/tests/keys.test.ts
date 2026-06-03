import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/index';
import pool from '../src/db/postgres';
import redis from '../src/db/redis';

const JWT_SECRET = process.env.JWT_SECRET || 'guardlayer-default-jwt-secret-key';
const validToken = jwt.sign({ admin: true }, JWT_SECRET);

jest.mock('../src/db/postgres', () => {
  const mClient = {
    query: jest.fn(),
    release: jest.fn(),
  };
  return {
    connect: jest.fn(() => Promise.resolve(mClient)),
    query: jest.fn(),
  };
});

jest.mock('../src/db/redis', () => {
  return {
    get: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
  };
});

describe('Keys API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/keys', () => {
    it('should return 401 when missing token', async () => {
      const res = await request(app)
        .post('/api/keys')
        .send({ name: 'test' });
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED_MISSING_TOKEN');
    });

    it('should return 401 when invalid token', async () => {
      const res = await request(app)
        .post('/api/keys')
        .set('Authorization', 'Bearer invalid-token')
        .send({ name: 'test' });
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED_INVALID_TOKEN');
    });

    it('should create an API key when token is valid', async () => {
      const mockClient = await pool.connect();
      (mockClient.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{ id: 'key-id-123', name: 'test-app', key_prefix: 'gl-abcde', created_at: new Date() }],
        }) // Create key
        .mockResolvedValueOnce({
          rows: [{ id: 'config-id-123' }],
        }) // Create config
        .mockResolvedValueOnce({}); // Update key config_id

      const res = await request(app)
        .post('/api/keys')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ name: 'test-app' });

      expect(res.status).toBe(201);
      expect(res.body.key).toMatch(/^gl-[a-f0-9]{32}$/);
      expect(res.body.key_prefix).toBe(res.body.key.substring(0, 8));
      expect(res.body.id).toBe('key-id-123');
    });
  });

  describe('GET /api/keys', () => {
    it('should list API keys', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({
        rows: [
          { id: '1', name: 'key-1', key_prefix: 'gl-abc', is_active: true, created_at: new Date(), last_used_at: null },
        ],
      });

      const res = await request(app)
        .get('/api/keys')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0].name).toBe('key-1');
      expect(res.body[0].key_hash).toBeUndefined();
    });
  });

  describe('DELETE /api/keys/:id', () => {
    it('should revoke API key', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'key-id-123' }],
      });

      const res = await request(app)
        .delete('/api/keys/key-id-123')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(redis.del).toHaveBeenCalledWith('config:key-id-123');
    });
  });
});
