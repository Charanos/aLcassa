import 'server-only';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@/db/schema';

/**
 * ADR-004. Drizzle owns schema, migrations and typed queries. The Supabase
 * client owns auth and storage. They talk to the same Postgres.
 *
 * THE DETAIL THAT MATTERS: this connects as an RLS-BOUND ROLE, not the service
 * role. A Drizzle client connected as the service role would silently bypass
 * every policy in the system, which is the single worst mistake available in
 * this codebase, and it would not fail a single test because everything would
 * appear to work.
 *
 * Two clearly named clients exist for that reason: `db` here, and
 * `dbAsService` in serviceClient.ts, whose import path is lint-guarded to
 * src/modules/platform. 06 §7.
 *
 * `prepare: false` because Supabase's pooler runs in transaction mode, where
 * prepared statements do not survive between checkouts.
 */

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    'DATABASE_URL is not set. Copy .env.example to .env.local and fill it in. See README, Running locally.',
  );
}

declare global {
  var __aLcassaSql: ReturnType<typeof postgres> | undefined;
}

// One pool across hot reloads in development. In production each serverless
// instance gets its own, which is what the connection ceiling in 04 §8 counts.
const sql =
  globalThis.__aLcassaSql ??
  postgres(connectionString, {
    prepare: false,
    max: process.env.NODE_ENV === 'production' ? 10 : 4,
    idle_timeout: 20,
    connect_timeout: 10,
  });

if (process.env.NODE_ENV !== 'production') globalThis.__aLcassaSql = sql;

export const db = drizzle(sql, { schema });

export type Database = typeof db;
export type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];
