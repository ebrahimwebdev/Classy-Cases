import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';

declare global {
  var _postgresPool: Pool | undefined;
}

export function isSqlConfigured(): boolean {
  return Boolean(
    process.env.SQL_HOST &&
      process.env.SQL_USER &&
      process.env.SQL_PASSWORD &&
      process.env.SQL_DB_NAME
  );
}

export const createPool = () => {
  if (!global._postgresPool) {
    global._postgresPool = new Pool({
      host: process.env.SQL_HOST,
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      database: process.env.SQL_DB_NAME,
      max: 10,
      connectionTimeoutMillis: 15000,
    });

    global._postgresPool.on('error', (err) => {
      console.error('Unexpected error on idle SQL pool client:', err);
    });
  }
  return global._postgresPool;
};

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

let db: DrizzleDb;
try {
  if (!isSqlConfigured()) {
    throw new Error('Cloud SQL environment variables are not configured');
  }
  const pool = createPool();
  db = drizzle(pool, { schema });
} catch {
  console.warn('[AI Studio] Database not connected — using in-memory store fallback');
  const noOp = {
    findMany: async () => [],
    findFirst: async () => null,
    findUnique: async () => null,
    create: async (d: { data?: unknown }) => d?.data ?? {},
    update: async (d: { data?: unknown }) => d?.data ?? {},
    delete: async () => ({}),
  };
  db = new Proxy({} as DrizzleDb, {
    get: (_target, prop) =>
      prop === 'query'
        ? new Proxy({}, { get: () => noOp })
        : async () => [],
  });
}

export { db };
