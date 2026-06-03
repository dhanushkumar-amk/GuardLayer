import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

function loadEnv() {
  // Check typical env path (walk up to find it)
  let dir = __dirname;
  while (dir && dir !== path.parse(dir).root) {
    const envPath = path.join(dir, '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const idx = trimmed.indexOf('=');
          if (idx !== -1) {
            const key = trimmed.substring(0, idx).trim();
            const val = trimmed.substring(idx + 1).trim();
            if (!process.env[key]) {
              process.env[key] = val;
            }
          }
        }
      }
      break;
    }
    dir = path.dirname(dir);
  }
}

export default async function globalTeardown() {
  console.log('\n[Teardown] Cleaning up Postgres integration test database data...');
  loadEnv();

  const pool = new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    database: process.env.POSTGRES_DB || 'guardlayer',
  });

  try {
    await pool.query('DELETE FROM threat_logs');
    await pool.query('DELETE FROM audit_logs');
    await pool.query('DELETE FROM config');
    await pool.query('DELETE FROM api_keys');
    await pool.query('DELETE FROM admin_users');
    console.log('[Teardown] Database tables cleared.');
  } catch (err: any) {
    console.error('[Teardown] Error clearing database tables:', err.message);
  } finally {
    await pool.end();
  }

  // Delete temp state file
  const statePath = path.join(__dirname, 'test-state.json');
  if (fs.existsSync(statePath)) {
    try {
      fs.unlinkSync(statePath);
    } catch (e) {
      // Ignore unlink errors
    }
  }
  console.log('[Teardown] Teardown process finalized.');
}
export { globalTeardown };
