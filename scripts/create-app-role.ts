#!/usr/bin/env tsx
/**
 * 06 §3 · 06 §7. THE LEAST-PRIVILEGE APPLICATION ROLE.
 *
 * ⚠ THE ISOLATION SUITE IS MEANINGLESS IF IT RUNS AS A SUPERUSER.
 *
 * `postgres` carries `BYPASSRLS`. Every policy in this database is inert for
 * it — not weakened, INERT — so a suite run as `postgres` proves nothing at
 * all about tenant isolation while appearing to exercise it thoroughly.
 *
 * This has now caught the project out twice:
 *
 *   M1, on the development database. `DATABASE_URL` was pointed at `postgres`
 *   by mistake. `.env.example` had said in terms that it is "the RLS-bound
 *   connection … NOT the service role", and it was set wrongly anyway.
 *   Recorded as the finding that produced `alcassa_app`.
 *
 *   28 Aug 2026, in CI, on the first run that ever reached a database. The
 *   workflow set BOTH `DATABASE_URL` and `DATABASE_URL_ADMIN` to the
 *   container's `postgres` superuser. 66 isolation cases failed loudly, which
 *   is the good outcome — the dangerous version is a suite written loosely
 *   enough to pass under a superuser, which would then be green and worthless.
 *
 * So CI provisions the same two roles the development database has, and the
 * suite connects as the same least-privilege role the application does. A
 * gate that does not reproduce production's privileges is not a gate.
 *
 *   pnpm db:app-role
 */

import { config as loadEnv } from 'dotenv';
import postgres from 'postgres';

loadEnv({ path: '.env.local', quiet: true });

const connectionString = process.env.DATABASE_URL_ADMIN;

if (!connectionString) {
  console.error(
    'DATABASE_URL_ADMIN must be set: creating a role needs privileges the app role does not have.',
  );
  process.exit(1);
}

/**
 * ⚠ THE PASSWORD IS FOR AN EPHEMERAL CI CONTAINER AND NOTHING ELSE.
 *
 * This script is only ever run against a throwaway database — the CI service
 * container, or a local development one. The real environments provision
 * their roles through Supabase, where the password is generated and stored as
 * a secret. `APP_ROLE_PASSWORD` exists so CI can set one it already knows;
 * there is no production path through this file.
 */
const ROLE = 'alcassa_app';
const password = process.env.APP_ROLE_PASSWORD ?? 'alcassa_app';

const sql = postgres(connectionString, { prepare: false, max: 1 });

async function main(): Promise<void> {
  // Idempotent: CI runs this on a fresh container every time, but a developer
  // may run it against a database that already has the role.
  await sql.unsafe(`
    do $$
    begin
      if not exists (select 1 from pg_roles where rolname = '${ROLE}') then
        create role ${ROLE} login password '${password}';
      end if;
    end
    $$;
  `);

  /**
   * ⚠ NOBYPASSRLS, STATED EXPLICITLY RATHER THAN ASSUMED — AND BEST-EFFORT.
   *
   * It is the default for a new role, and it is the single property this
   * entire file exists to guarantee. Setting it explicitly means the
   * guarantee survives somebody later altering the role for an unrelated
   * reason, and it makes the intent greppable.
   *
   * ⚠ SUPABASE REFUSES THIS, AND THAT IS CORRECT OF IT.
   *
   * `supautils` blocks `alter role` even from the project's `postgres` user,
   * so running this against a Supabase database returns "permission denied to
   * alter role". That is a managed platform declining to let a tenant of its
   * own weaken role attributes — the same instinct as everything in `06`.
   *
   * So the ALTER is attempted and its refusal tolerated. What is NOT
   * tolerated is the outcome: the verification below is unconditional, and it
   * exits non-zero if the role can bypass RLS no matter how it got that way.
   * Asserting the property is what matters; being the one to set it is not.
   */
  try {
    await sql.unsafe(`alter role ${ROLE} nobypassrls nosuperuser nocreatedb nocreaterole`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`  note: could not alter ${ROLE} (${message}). Verifying its attributes instead.`);
  }

  /**
   * The grants. Each one is applied on its own so a platform that refuses one
   * does not skip the rest — a partially-granted role that reports success
   * would fail later, in a test, with a confusing message.
   *
   * `drizzle` is deliberately absent from the schema list: the app role does
   * not migrate, and the health check learned not to read the migration table
   * because of exactly that boundary.
   *
   * DML only. No DDL, no ownership, and no TRUNCATE — which bypasses RLS on
   * its own, which is why it is not here.
   */
  const GRANTS = [
    `grant usage on schema public to ${ROLE}`,
    `grant usage on schema app to ${ROLE}`,
    `grant select, insert, update, delete on all tables in schema public to ${ROLE}`,
    `grant usage, select on all sequences in schema public to ${ROLE}`,
    `grant execute on all functions in schema app to ${ROLE}`,
    // Anything a later migration creates, without needing this script re-run.
    `alter default privileges in schema public grant select, insert, update, delete on tables to ${ROLE}`,
    `alter default privileges in schema public grant usage, select on sequences to ${ROLE}`,
  ];

  const refused: string[] = [];
  for (const statement of GRANTS) {
    try {
      await sql.unsafe(statement);
    } catch (error) {
      refused.push(`${statement.slice(0, 60)}… — ${error instanceof Error ? error.message : ''}`);
    }
  }

  if (refused.length > 0) {
    console.warn(`  note: ${refused.length} grant(s) refused by the platform:`);
    for (const line of refused) console.warn(`    ${line}`);
  }

  const [role] = await sql<{ rolbypassrls: boolean; rolsuper: boolean }[]>`
    select rolbypassrls, rolsuper from pg_roles where rolname = ${ROLE}
  `;

  /**
   * ⚠ THE ONE ASSERTION THAT MATTERS, AND IT IS UNCONDITIONAL.
   *
   * Everything above is best-effort, because a managed platform may refuse to
   * let anything alter a role. This is not: if the role can bypass row level
   * security, every isolation case in the suite is testing nothing, and the
   * right response is to stop rather than to run a green and worthless gate.
   */
  if (!role) {
    console.error(`\n✗ ${ROLE} does not exist and could not be created.\n`);
    await sql.end();
    process.exit(1);
  }

  if (role.rolbypassrls || role.rolsuper) {
    console.error(`\n✗ ${ROLE} can bypass row level security. Refusing to continue.\n`);
    await sql.end();
    process.exit(1);
  }

  const [tables] = await sql<{ n: number }[]>`
    select count(*)::int as n from information_schema.table_privileges
    where grantee = ${ROLE} and privilege_type = 'SELECT'
  `;

  console.log(`✓ ${ROLE} ready · nobypassrls, select on ${tables?.n ?? 0} tables`);
  await sql.end();
}

main().catch(async (error: unknown) => {
  console.error('Creating the application role failed:', error);
  await sql.end().catch(() => undefined);
  process.exit(1);
});
