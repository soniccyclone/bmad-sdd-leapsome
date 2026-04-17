import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('Missing required env var: DATABASE_URL');
}

/** Raw postgres.js connection — export for graceful shutdown */
export const connection = postgres(connectionString);

/** Drizzle ORM instance */
export const db = drizzle(connection, { schema });
