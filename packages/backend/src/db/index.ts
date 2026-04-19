import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from './schema.js';

let connection: ReturnType<typeof postgres> | null = null;
let db: PostgresJsDatabase<typeof schema> | null = null;

function ensureInitialized(): {
  connection: ReturnType<typeof postgres>;
  db: PostgresJsDatabase<typeof schema>;
} {
  if (db && connection) return { db, connection };

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('Missing required env var: DATABASE_URL');
  }

  connection = postgres(connectionString);
  db = drizzle(connection, { schema });
  return { db, connection };
}

/** Lazy-initialized Drizzle ORM instance */
export function getDb(): PostgresJsDatabase<typeof schema> {
  return ensureInitialized().db;
}

/** Lazy-initialized raw postgres.js connection — for graceful shutdown */
export function getConnection(): ReturnType<typeof postgres> {
  return ensureInitialized().connection;
}

/** Close the connection pool and reset state */
export async function closeDb(): Promise<void> {
  if (connection) {
    await connection.end();
    connection = null;
    db = null;
  }
}
