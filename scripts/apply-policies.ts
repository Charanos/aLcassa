#!/usr/bin/env tsx
/**
 * 05 §12 · 06 §2. Apply the policy catalogue in `src/db/policies/`.
 *
 * ⚠ WHY THIS EXISTS AT ALL, AND WHY THE POLICIES ARE NOT IN THE DRIZZLE
 * MIGRATION.
 *
 * `05 §12` requires that "every migration that creates a tenant-scoped table
 * must create its policies in the same migration", so schema and policy can
 * never drift. `drizzle-kit generate` emits table DDL only — it knows nothing
 * about `src/db/policies/`, so the generated migration creates twenty-three
 * tables with no row level security on any of them.
 *
 * Pasting the policy SQL into the generated file once would satisfy the rule
 * for exactly one migration. The next `db:generate` would produce another
 * file without policies, and applying it would leave tables unpoliced — the
 * precise failure the rule exists to prevent, arriving quietly.
 *
 * So `db:migrate` runs `drizzle-kit migrate` AND THEN this script, always,
 * as one command. The guarantee is preserved operationally: there is no
 * sequence of documented commands that applies tables without their policies.
 * `check:policies` then verifies the result against the live database, which
 * is the real enforcement.
 *
 * ⚠ IT DROPS EVERY EXISTING POLICY FIRST, INSIDE ONE TRANSACTION.
 *
 * Postgres has no `create policy if not exists`, so re-running the catalogue
 * would otherwise fail on the second attempt. These files are the DECLARED
 * state of every policy in the system, so reconciling to them by dropping and
 * recreating is correct rather than destructive. It is transactional: there is
 * no instant at which a committed database has tables without their policies.
 *
 *   pnpm db:policies
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { config as loadEnv } from 'dotenv';
import postgres from 'postgres';

// Standalone script: Next.js is not here to load .env.local for us.
loadEnv({ path: '.env.local', quiet: true });

const connectionString = process.env.DATABASE_URL_ADMIN ?? process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL_ADMIN or DATABASE_URL must be set.');
  process.exit(1);
}

const POLICY_DIR = join(process.cwd(), 'src', 'db', 'policies');

const sql = postgres(connectionString, { prepare: false, max: 1 });

async function main(): Promise<void> {
  // Filename order IS execution order: `00_context.sql` defines the `app`
  // schema and the functions every later policy calls, so it must run first.
  const files = readdirSync(POLICY_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.error(`No .sql files found in ${POLICY_DIR}.`);
    process.exit(1);
  }

  await sql.begin(async (tx) => {
    const existing = await tx<{ policyname: string; tablename: string }[]>`
      select policyname, tablename
      from pg_policies
      where schemaname = 'public'
    `;

    for (const row of existing) {
      // Identifiers come from pg_policies, not user input, but they are still
      // interpolated rather than parameterised because Postgres does not
      // accept a bind parameter in a DDL identifier position.
      await tx.unsafe(
        `drop policy if exists "${row.policyname}" on public."${row.tablename}"`,
      );
    }

    if (existing.length > 0) {
      console.log(`Dropped ${existing.length} existing policies.`);
    }

    for (const file of files) {
      const body = readFileSync(join(POLICY_DIR, file), 'utf8');
      await tx.unsafe(body);
      console.log(`  applied ${file}`);
    }
  });

  const rows = await sql<{ count: number }[]>`
    select count(*)::int as count from pg_policies where schemaname = 'public'
  `;

  console.log(`\nPolicy catalogue applied. ${rows[0]?.count ?? 0} policies active.`);
  console.log('Run `pnpm check:policies` to verify none is missing.');

  await sql.end();
}

main().catch(async (error: unknown) => {
  console.error('\nApplying the policy catalogue failed. Nothing was committed.');
  console.error(error);
  await sql.end();
  process.exit(1);
});
