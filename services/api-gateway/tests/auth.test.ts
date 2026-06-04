import request from 'supertest';
import app from '../src/index';
import pool from '../src/db/postgres';
import bcrypt from 'bcryptjs';

jest.mock('../src/db/postgres', () => {
  return {
    query: jest.fn(),
  };
});

jest.mock('../src/db/redis', () => {
  return {
    __esModule: true,
    default: {
      multi: jest.fn(),
      expire: jest.fn(),
    },
  };
});

describe('Admin Authentication API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /auth/register', () => {
    it('should register the first admin user successfully', async () => {
      (pool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // Count query
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [{ id: 'admin-uuid-1', email: 'admin@guardlayer.dev', created_at: new Date() }],
        }); // Insert query

      const res = await request(app)
        .post('/auth/register')
        .send({ email: 'admin@guardlayer.dev', password: 'securepassword123' });

      expect(res.status).toBe(201);
      expect(res.body.user.email).toBe('admin@guardlayer.dev');
      expect(res.body.user).toHaveProperty('id');
      expect(pool.query).toHaveBeenCalledTimes(2);
    });

    it('should block registration of a second admin user and return 403', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ count: '1' }] });

      const res = await request(app)
        .post('/auth/register')
        .send({ email: 'admin2@guardlayer.dev', password: 'securepassword123' });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('blocked');
      expect(res.body.code).toBe('FORBIDDEN_ADMIN_EXISTS');
      expect(pool.query).toHaveBeenCalledTimes(1);
    });
  });

  describe('POST /auth/login', () => {
    const password = 'securepassword123';
    let passwordHash: string;

    beforeAll(async () => {
      passwordHash = await bcrypt.hash(password, 10);
    });

    it('should login successfully with correct credentials and return a JWT', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'admin-uuid-1', email: 'admin@guardlayer.dev', password_hash: passwordHash }],
      });

      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'admin@guardlayer.dev', password });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.email).toBe('admin@guardlayer.dev');
    });

    it('should fail login with wrong password and return 401', async () => {
      (pool.query as jest.Mock).mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 'admin-uuid-1', email: 'admin@guardlayer.dev', password_hash: passwordHash }],
      });

      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'admin@guardlayer.dev', password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Invalid');
      expect(res.body.code).toBe('UNAUTHORIZED_INVALID_CREDENTIALS');
    });
  });
});
