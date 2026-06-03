import axios from 'axios';

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:8080';
const CONFIG_URL = process.env.CONFIG_URL || 'http://localhost:3001';

describe('API Gateway Auth Integration Tests', () => {
  const email = `admin-auth-${Date.now()}@guardlayer.com`;
  const password = 'IntegrationPassWord2026!';
  let jwtToken = '';

  it('should successfully register the first admin user', async () => {
    const res = await axios.post(`${GATEWAY_URL}/auth/register`, {
      email,
      password,
    });
    expect(res.status).toBe(201);
    expect(res.data.user.email).toBe(email);
  });

  it('should login successfully with correct credentials and return a JWT', async () => {
    const res = await axios.post(`${GATEWAY_URL}/auth/login`, {
      email,
      password,
    });
    expect(res.status).toBe(200);
    expect(res.data.token).toBeDefined();
    jwtToken = res.data.token;
  });

  it('should fail login with wrong password and return 401', async () => {
    try {
      await axios.post(`${GATEWAY_URL}/auth/login`, {
        email,
        password: 'incorrectpassword',
      });
      fail('Expected login request to fail with 401');
    } catch (err: any) {
      expect(err.response.status).toBe(401);
    }
  });

  it('should fail to access config keys protected endpoint without JWT and return 401', async () => {
    try {
      await axios.get(`${CONFIG_URL}/api/keys`);
      fail('Expected request to fail with 401');
    } catch (err: any) {
      expect(err.response.status).toBe(401);
    }
  });

  it('should allow access to config keys protected endpoint with a valid JWT and return 200', async () => {
    const res = await axios.get(`${CONFIG_URL}/api/keys`, {
      headers: {
        Authorization: `Bearer ${jwtToken}`,
      },
    });
    expect(res.status).toBe(200);
    expect(res.data).toBeInstanceOf(Array);
  });

  it('should reject requests with an expired, malformed or invalid JWT and return 401', async () => {
    const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMyIsImV4cCI6MTIzNDU2fQ.invalid_sig';
    try {
      await axios.get(`${CONFIG_URL}/api/keys`, {
        headers: {
          Authorization: `Bearer ${invalidToken}`,
        },
      });
      fail('Expected request to fail with 401');
    } catch (err: any) {
      expect(err.response.status).toBe(401);
    }
  });
});
export {};
