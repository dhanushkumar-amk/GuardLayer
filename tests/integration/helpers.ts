import axios from 'axios';

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:8080';
const CONFIG_URL = process.env.CONFIG_URL || 'http://localhost:3001';
const AUDIT_URL = process.env.AUDIT_URL || 'http://localhost:8004';

/**
 * Polls service health endpoint until it returns 200, timing out after 60 seconds.
 */
export async function waitForService(url: string, timeoutMs = 60000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await axios.get(`${url}/health`, { timeout: 1000 });
      if (res.status === 200) {
        return;
      }
    } catch (err) {
      // Ignore error and try again
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Timeout waiting for service health at ${url}`);
}

/**
 * Registers an admin user and logs them in, returning their JWT authorization token.
 */
export async function createAdminAndLogin(): Promise<string> {
  const email = `admin-${Date.now()}@guardlayer.com`;
  const password = 'SuperSecretPassword123!';

  try {
    await axios.post(`${GATEWAY_URL}/auth/register`, { email, password });
  } catch (err: any) {
    // If registration is blocked because admin exists, try logging in with the default seeded credentials
    if (err.response?.status !== 403) {
      throw err;
    }
  }

  const loginRes = await axios.post(`${GATEWAY_URL}/auth/login`, {
    email,
    password,
  });

  return loginRes.data.token;
}

/**
 * Creates a new API key through the config-service.
 */
export async function createApiKey(jwt: string): Promise<string> {
  const res = await axios.post(
    `${CONFIG_URL}/api/keys`,
    { name: `integration-key-${Date.now()}` },
    {
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
    }
  );
  return res.data.key;
}

/**
 * Sends a chat completions request to the API Gateway.
 */
export async function sendChatRequest(
  apiKey: string,
  message: string,
  conversationHistory: any[] = []
): Promise<any> {
  const messages = [...conversationHistory, { role: 'user', content: message }];
  return axios.post(
    `${GATEWAY_URL}/v1/chat/completions`,
    {
      messages,
      model: 'gpt-3.5-turbo',
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      validateStatus: () => true, // Don't throw on non-200 responses so we can assert status
    }
  );
}

/**
 * Fetches audit logs from the audit-service.
 */
export async function getAuditLogs(jwt: string, params: any = {}): Promise<any[]> {
  const res = await axios.get(`${AUDIT_URL}/api/audit`, {
    headers: {
      Authorization: `Bearer ${jwt}`,
    },
    params,
  });
  return res.data.data;
}

/**
 * Fetches threat logs from the audit-service.
 */
export async function getThreats(jwt: string, params: any = {}): Promise<any[]> {
  const res = await axios.get(`${AUDIT_URL}/api/threats`, {
    headers: {
      Authorization: `Bearer ${jwt}`,
    },
    params,
  });
  return res.data.data;
}
