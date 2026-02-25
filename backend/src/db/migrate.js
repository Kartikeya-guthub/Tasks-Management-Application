'use strict';

require('dotenv').config();

const fs   = require('fs');
const path = require('path');
const { Client } = require('pg');

const MIGRATIONS_DIR = path.join(__dirname, '../../migrations');

async function runMigrations() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  console.log('[migrate] Connected to database.');

  // ── Ensure tracking table exists ──────────────────────────────
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename   TEXT        PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // ── Load applied migrations ────────────────────────────────────
  const { rows } = await client.query('SELECT filename FROM schema_migrations');
  const applied = new Set(rows.map((r) => r.filename));

  // ── Read and sort migration files ─────────────────────────────
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  // ── Run pending migrations ─────────────────────────────────────
  for (const file of files) {
    if (applied.has(file)) {
      console.log(`[migrate] Skipping (already applied): ${file}`);
      continue;
    }

    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');

    console.log(`[migrate] Applying: ${file}`);
    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query(
        'INSERT INTO schema_migrations (filename) VALUES ($1)',
        [file]
      );
      await client.query('COMMIT');
      console.log(`[migrate] Applied:  ${file}`);
    } catch (err) {
      await client.query('ROLLBACK');
      throw new Error(`Failed on ${file}: ${err.message}`);
    }
  }

  await client.end();
  console.log('[migrate] All migrations complete.');
}

runMigrations().catch((err) => {
  console.error('[migrate] ERROR:', err.message);
  process.exit(1);
});
