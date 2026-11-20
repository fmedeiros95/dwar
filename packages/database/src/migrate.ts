import { readFile, readdir } from 'node:fs/promises';
import { pool } from './index.js';

const client = await pool.connect();
try {
  await client.query('BEGIN');
  await client.query("SELECT pg_advisory_xact_lock(hashtext('dwar:migrations'))");
  await client.query(
    'CREATE TABLE IF NOT EXISTS schema_migrations (id text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())',
  );
  const directory = new URL('../migrations/', import.meta.url);
  const files = (await readdir(directory)).filter((name) => /^\d+_[\w-]+\.sql$/.test(name)).sort();
  for (const file of files) {
    const id = file.slice(0, -4);
    const applied = await client.query('SELECT id FROM schema_migrations WHERE id = $1', [id]);
    if (applied.rowCount !== 0) continue;
    await client.query(await readFile(new URL(file, directory), 'utf8'));
    await client.query('INSERT INTO schema_migrations (id) VALUES ($1)', [id]);
    console.log(`Migração ${id} aplicada.`);
  }
  await client.query('COMMIT');
  console.log('Banco atualizado.');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
  await pool.end();
}
