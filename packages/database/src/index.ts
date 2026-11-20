import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema.js';

if (!process.env.DATABASE_URL) throw new Error('Defina DATABASE_URL no arquivo .env.');
export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 10 });
export const db = drizzle(pool, { schema });
export * from './schema.js';
export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
