#!/usr/bin/env tsx
/**
 * 06 §2 rule 1. THE HIGHEST-VALUE SCRIPT IN THE REPOSITORY.
 *
 * Write this before the first table. It is a hundred lines and it makes an
 * entire class of mistake impossible for nine weeks. 11 §11.
 *
 * It runs BEFORE the tests in CI. A tenant-scoped table without a policy fails
 * the build, which is what stops the schema and the policy catalogue from ever
 * drifting apart. There is no override and no exception path: a merge blocked
 * by this script is a merge that would have shipped a hole.
 *
 *   pnpm check:policies
 */

import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL_ADMIN ?? process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL_ADMIN or DATABASE_URL must be set.');
  process.exit(1);
}

const sql = postgres(connectionString, { prepare: false, max: 1 });

type Failure = { table: string; problem: string };

/**
 * Tables that carry `tenant_id` but are deliberately not policed by the
 * standard shape, each with the reason. This list is REVIEWED AT M1 AND M6 by a
 * person reading every policy, because an exception list is exactly where a
 * hole hides. It is currently empty and it should stay that way.
 */
const DOCUMENTED_EXCEPTIONS = new Map<string, string>();

/**
 * Append-only tables. 05 I-11 asserts these have NO update and NO delete
 * policy, so a migration that adds one fails the build rather than quietly
 * making history editable.
 */
const APPEND_ONLY = new Set(['audit_log', 'platform_audit_log']);

async function main(): Promise<void> {
  const failures: Failure[] = [];

  // ── Tenant-scoped tables: anything in `public` carrying a tenant_id column ─
  const tenantScoped = await sql<{ table_name: string }[]>`
    select c.relname as table_name
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    join pg_attribute a on a.attrelid = c.oid
    where n.nspname = 'public'
      and c.relkind = 'r'
      and a.attname = 'tenant_id'
      and a.attnum > 0
      and not a.attisdropped
    order by c.relname
  `;

  const rlsEnabled = await sql<{ table_name: string; relrowsecurity: boolean; relforcerowsecurity: boolean }[]>`
    select c.relname as table_name, c.relrowsecurity, c.relforcerowsecurity
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
  `;

  const policies = await sql<
    { table_name: string; policyname: string; cmd: string; qual: string | null; with_check: string | null }[]
  >`
    select tablename as table_name, policyname, cmd, qual, with_check
    from pg_policies
    where schemaname = 'public'
  `;

  const rlsByTable = new Map(rlsEnabled.map((r) => [r.table_name, r]));
  const policiesByTable = new Map<string, typeof policies>();
  for (const policy of policies) {
    const existing = policiesByTable.get(policy.table_name) ?? ([] as unknown as typeof policies);
    policiesByTable.set(policy.table_name, [...existing, policy] as typeof policies);
  }

  const isModify = (cmd: string) =>
    ['ALL', 'INSERT', 'UPDATE', 'DELETE'].includes(cmd.toUpperCase());

  for (const { table_name: table } of tenantScoped) {
    if (DOCUMENTED_EXCEPTIONS.has(table)) continue;

    const rls = rlsByTable.get(table);
    const tablePolicies = policiesByTable.get(table) ?? [];

    // ── Assertion 1 · RLS is enabled ──────────────────────────────────────
    if (!rls?.relrowsecurity) {
      failures.push({ table, problem: 'has tenant_id but Row Level Security is not enabled' });
      continue;
    }

    // `force` matters: without it the table OWNER bypasses every policy, and
    // in a Supabase project the owner is a role migrations run as. It is the
    // difference between a policy that applies to everyone and one that
    // applies to everyone except the connection most likely to be misused.
    if (!rls.relforcerowsecurity) {
      failures.push({
        table,
        problem: 'RLS is enabled but not FORCED, so the table owner bypasses every policy',
      });
    }

    // ── Assertion 2 · at least one SELECT policy ──────────────────────────
    const selects = tablePolicies.filter(
      (p) => p.cmd.toUpperCase() === 'SELECT' || p.cmd.toUpperCase() === 'ALL',
    );
    if (selects.length === 0) {
      failures.push({ table, problem: 'has no SELECT policy' });
    }

    // ── Assertion 3 · at least one modify policy, unless append-only ──────
    const modifies = tablePolicies.filter((p) => isModify(p.cmd));

    if (APPEND_ONLY.has(table)) {
      const forbidden = tablePolicies.filter((p) =>
        ['UPDATE', 'DELETE', 'ALL'].includes(p.cmd.toUpperCase()),
      );
      if (forbidden.length > 0) {
        failures.push({
          table,
          problem: `is append-only (05 I-11) but has ${forbidden
            .map((p) => `${p.cmd} policy "${p.policyname}"`)
            .join(', ')}. History must not be amendable.`,
        });
      }
      if (!tablePolicies.some((p) => p.cmd.toUpperCase() === 'INSERT')) {
        failures.push({ table, problem: 'is append-only but has no INSERT policy' });
      }
      continue;
    }

    if (modifies.length === 0) {
      failures.push({ table, problem: 'has no modify policy' });
    }

    // ── Assertion 4 · every modify policy carries a WITH CHECK ────────────
    // Without one, a user can UPDATE a row's tenant_id and move it into
    // another tenant. The commonest way this happens is copy-pasting a select
    // policy and changing `for select` to `for all`. 05 I-03.
    for (const policy of modifies) {
      // DELETE genuinely has no WITH CHECK in Postgres, so it is exempt.
      if (policy.cmd.toUpperCase() === 'DELETE') continue;

      if (!policy.with_check) {
        failures.push({
          table,
          problem: `policy "${policy.policyname}" (${policy.cmd}) has no WITH CHECK clause, so it permits tenant reassignment`,
        });
      }
    }

    // ── Assertion 5 · policies reference the isolation context ────────────
    // A policy that never mentions app.current_tenant_id() is not isolating
    // anything, however plausible its predicate looks.
    const referencesContext = tablePolicies.some(
      (p) =>
        p.qual?.includes('current_tenant_id') || p.with_check?.includes('current_tenant_id'),
    );
    if (!referencesContext) {
      failures.push({
        table,
        problem: 'no policy references app.current_tenant_id(), so nothing is scoped to a tenant',
      });
    }
  }

  // ── Report ──────────────────────────────────────────────────────────────
  const checked = tenantScoped.length - DOCUMENTED_EXCEPTIONS.size;

  if (failures.length === 0) {
    console.log(`✓ policy check passed · ${checked} tenant-scoped tables, 0 problems`);
    await sql.end();
    return;
  }

  console.error(`\n✗ POLICY CHECK FAILED · ${failures.length} problem(s) across ${checked} tables\n`);
  for (const failure of failures) {
    console.error(`  ${failure.table}`);
    console.error(`    ${failure.problem}\n`);
  }
  console.error('Read 06 §2 before fixing any of these. A table without a policy fails the build.\n');

  await sql.end();
  process.exit(1);
}

main().catch(async (error: unknown) => {
  console.error('policy check could not run:', error);
  await sql.end().catch(() => undefined);
  process.exit(1);
});
