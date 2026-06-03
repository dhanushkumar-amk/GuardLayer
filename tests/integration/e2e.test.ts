import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { sendChatRequest, createApiKey } from './helpers';

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:8080';
const CONFIG_URL = process.env.CONFIG_URL || 'http://localhost:3001';

function getTestState() {
  const statePath = path.join(__dirname, 'test-state.json');
  return JSON.parse(fs.readFileSync(statePath, 'utf8'));
}

describe('End-to-End Gateway Proxy & Key Verification', () => {
  let token = '';
  let validApiKey = '';

  beforeAll(() => {
    const state = getTestState();
    token = state.token;
    validApiKey = state.apiKey;
  });

  it('should return an OpenAI compatible response for a clean message with a valid API key', async () => {
    const res = await sendChatRequest(validApiKey, 'Hello, what is 2+2?');
    expect(res.status).toBe(200);
    // Response should be parsed and normalized correctly (id, object, choices, usage)
    expect(res.data.id).toBeDefined();
    expect(res.data.object).toBeDefined();
    expect(res.data.choices).toBeInstanceOf(Array);
    expect(res.data.choices[0].message).toBeDefined();
    expect(res.data.usage).toBeDefined();
    expect(res.data.usage.total_tokens).toBeDefined();
  });

  it('should return 401 when sending a request with no API key', async () => {
    const res = await axios.post(
      `${GATEWAY_URL}/v1/chat/completions`,
      { messages: [{ role: 'user', content: 'Hi' }], model: 'gpt-3.5-turbo' },
      { validateStatus: () => true }
    );
    expect(res.status).toBe(401);
  });

  it('should return 401 when sending a request with an invalid API key', async () => {
    const res = await sendChatRequest('gl-invalid-key-value-1234567890', 'Hello');
    expect(res.status).toBe(401);
  });

  it('should return 401 when sending a request with a revoked API key', async () => {
    // 1. Create a new key
    const keyRes = await axios.post(
      `${CONFIG_URL}/api/keys`,
      { name: 'temp-revoke-key' },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const tempKey = keyRes.data.key;
    const tempId = keyRes.data.id;

    // Verify it works first
    const okRes = await sendChatRequest(tempKey, 'Ping');
    expect(okRes.status).toBe(200);

    // 2. Revoke it
    const revokeRes = await axios.delete(`${CONFIG_URL}/api/keys/${tempId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(revokeRes.status).toBe(200);

    // 3. Try to use it again
    const failedRes = await sendChatRequest(tempKey, 'Ping after revoke');
    expect(failedRes.status).toBe(401);
  });

  it('should rate-limit requests to 100/min and return 429 on the 101st request', async () => {
    // We send 100 requests concurrent, then check that the 101st fails with 429
    const requests = [];
    for (let i = 0; i < 100; i++) {
      requests.push(sendChatRequest(validApiKey, 'Rate limit test'));
    }

    const responses = await Promise.all(requests);
    expect(responses.every((r) => r.status === 200)).toBe(true);

    const limitRes = await sendChatRequest(validApiKey, 'The 101st request');
    expect(limitRes.status).toBe(429);
    expect(limitRes.data.code).toBe('TOO_MANY_REQUESTS');
  });

  it('should allocate separate rate limit buckets for different API keys', async () => {
    // Create a second API key
    const secondaryKey = await createApiKey(token);

    // Send 1 request with the secondary key and assert it passes even though first key was rate-limited
    const res = await sendChatRequest(secondaryKey, 'Separate rate bucket test');
    expect(res.status).toBe(200);
  });
});
export {};
