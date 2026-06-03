import { waitForService, createAdminAndLogin, createApiKey } from './helpers';
import fs from 'fs';
import path from 'path';

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:8080';
const CONFIG_URL = process.env.CONFIG_URL || 'http://localhost:3001';
const AUDIT_URL = process.env.AUDIT_URL || 'http://localhost:8004';
const INPUT_GUARD_URL = process.env.INPUT_GUARD_URL || 'http://localhost:8001';
const OUTPUT_GUARD_URL = process.env.OUTPUT_GUARD_URL || 'http://localhost:8002';
const LLM_PROXY_URL = process.env.LLM_PROXY_URL || 'http://localhost:8003';

export default async function globalSetup() {
  console.log('\n[Setup] Waiting for services to become healthy...');

  await Promise.all([
    waitForService(GATEWAY_URL),
    waitForService(CONFIG_URL),
    waitForService(AUDIT_URL),
    waitForService(INPUT_GUARD_URL),
    waitForService(OUTPUT_GUARD_URL),
    waitForService(LLM_PROXY_URL),
  ]);

  console.log('[Setup] All services are healthy. Authenticating...');
  const token = await createAdminAndLogin();

  console.log('[Setup] Initializing integration test API key...');
  const apiKey = await createApiKey(token);

  // Persist state to file for sharing across Jest worker test suites
  const statePath = path.join(__dirname, 'test-state.json');
  fs.writeFileSync(statePath, JSON.stringify({ token, apiKey }, null, 2));

  console.log('[Setup] Global setup complete. Saved credentials to state.');
}
export { globalSetup };
