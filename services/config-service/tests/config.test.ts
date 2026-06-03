import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/index';
import pool from '../src/db/postgres';
import redis from '../src/db/redis';

const JWT_SECRET = process.env.JWT_SECRET || 'guardlayer-default-jwt-secret-key';
const validToken = jwt.sign({ admin: true }, JWT_SECRET);

jest.mock('../src/db/postgres', () => {
  return {
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

describe('Config API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/config/:apiKeyId', () => {
    it('should return config from cache if available', async () => {
      const mockConfig = { id: 'c-1', api_key_id: 'k-1', prompt_injection_enabled: true };
      (redis.get as jest.Mock).mockResolvedValueOnce(JSON.stringify(mockConfig));

      const res = await request(app)
        .get('/api/config/k-1')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.prompt_injection_enabled).toBe(true);
      expect(pool.query).not.toHaveBeenCalled();
    });

    it('should fetch from DB and store in cache on cache miss', async () => {
      const mockConfig = { id: 'c-1', api_key_id: 'k-1', prompt_injection_enabled: true };
      (redis.get as jest.Mock).mockResolvedValueOnce(null);
      (pool.query as jest.Mock).mockResolvedValueOnce({
        rowCount: 1,
        rows: [mockConfig],
      });

      const res = await request(app)
        .get('/api/config/k-1')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.prompt_injection_enabled).toBe(true);
      expect(pool.query).toHaveBeenCalledWith(expect.any(String), ['k-1']);
      expect(redis.setex).toHaveBeenCalledWith('config:k-1', 300, JSON.stringify(mockConfig));
    });
  });

  describe('GET /api/config/default', () => {
    it('should return global default config', async () => {
      const mockDefaultConfig = { id: 'default-config', api_key_id: null, max_tokens: 2000 };
      (redis.get as jest.Mock).mockResolvedValueOnce(null);
      (pool.query as jest.Mock).mockResolvedValueOnce({
        rowCount: 1,
        rows: [mockDefaultConfig],
      });

      const res = await request(app)
        .get('/api/config/default')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.api_key_id).toBeNull();
      expect(res.body.max_tokens).toBe(2000);
    });
  });

  describe('PUT /api/config/:apiKeyId', () => {
    it('should update config and invalidate cache', async () => {
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rowCount: 1 }) // check exists
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [{ api_key_id: 'k-1', max_tokens: 1000 }],
        }); // update config

      const res = await request(app)
        .put('/api/config/k-1')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ max_tokens: 1000 });

      expect(res.status).toBe(200);
      expect(res.body.max_tokens).toBe(1000);
      expect(redis.del).toHaveBeenCalledWith('config:k-1');
    });
  });
});
