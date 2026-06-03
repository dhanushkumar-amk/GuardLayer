const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function run() {
  const host = process.env.POSTGRES_HOST || 'postgres';
  const port = parseInt(process.env.POSTGRES_PORT || '5432', 10);
  const user = process.env.POSTGRES_USER;
  const password = process.env.POSTGRES_PASSWORD;
  const database = process.env.POSTGRES_DB;

  console.log(`Connecting to Postgres at ${host}:${port}/${database} as ${user}...`);

  const client = new Client({
    host,
    port,
    user,
    password,
    database,
  });

  try {
    await client.connect();
    console.log('Connected successfully. Initializing migration table...');

    // 1. Create migrations tracking table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        run_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Fetch already run migrations
    const { rows } = await client.query('SELECT name FROM schema_migrations;');
    const executedMigrations = new Set(rows.map(row => row.name));

    // 3. Read migration directory
    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir);
    const sqlFiles = files
      .filter(file => file.endsWith('.sql'))
      .sort(); // Sorts alphabetically (001_..., 002_...)

    console.log(`Found ${sqlFiles.length} migration file(s) total.`);

    // 4. Run pending migrations in sequence
    for (const file of sqlFiles) {
      if (executedMigrations.has(file)) {
        console.log(`Migration ${file} is already applied. Skipping.`);
        continue;
      }

      console.log(`Applying migration: ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`Successfully applied migration: ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`Error applying migration ${file}. Rolled back transaction.`);
        throw err;
      }
    }

    console.log('All migrations executed successfully.');
    await client.end();
    process.exit(0);
  } catch (err) {
    console.error('Migration running failed:', err);
    try {
      await client.end();
    } catch (_) {}
    process.exit(1);
  }
}

run();
