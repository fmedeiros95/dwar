import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('Defina DATABASE_URL no arquivo .env.');
export const pool = new pg.Pool({ connectionString, max: 10 });
export const db = drizzle(pool, { schema });

export function createNotificationClient() {
  return new pg.Client({
    connectionString,
    application_name: 'dwar-realtime',
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
    connectionTimeoutMillis: 5000,
    query_timeout: 5000,
  });
}

export * from './schema.js';
export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
