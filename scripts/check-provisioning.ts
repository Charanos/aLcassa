#!/usr/bin/env tsx
/**
 * Does provisioning actually work?
 *
 * ⚠ WRITTEN BECAUSE THE ANSWER WAS NO, AND NOTHING ON SCREEN SAID SO.
 *
 * The provisioning modal offered four plans — `starter`, `growth`, `scale`,
 * `custom` — of which three had never existed in this product, and defaulted to
 * one of the three. The operator's choice was then dropped before it reached
 * the service: `provisionTenantSchema` had no plan field at all, so
 * `provisionTenant` wrote a tenant, its settings, the owner profile and the
 * membership, and NO SUBSCRIPTION ROW. A workspace came out of it with no plan,
 * therefore no entitlements, therefore no ceilings — while the modal's own
 * five-step panel promised, in writing, "plan entitlements resolved and
 * snapshotted onto the workspace".
 *
 * Every one of those failures is invisible from the console: the dialog closes,
 * the toast says provisioned, and the workspace appears in the list with "—" in
 * the plan column, which reads as a rendering gap rather than a missing row.
 *
 * So this checks the whole chain against the database instead, in the order the
 * chain runs:
 *
 *   1. the plan catalogue exists and is active
 *   2. every code the console can offer resolves to a row
 *   3. each plan carries entitlements, so a resolved plan means real ceilings
 *   4. every existing tenant has exactly one subscription
 *   5. a provisioned workspace is complete — settings, owner, subscription
 *
 * Nothing here writes. Run it, read the ✗, fix that one thing.
 *
 *   pnpm db:check-provisioning
 */

import { config as loadEnv } from 'dotenv';
import postgres from 'postgres';

loadEnv({ path: '.env.local', quiet: true });

const connectionString = process.env.DATABASE_URL_ADMIN ?? process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL_ADMIN or DATABASE_URL must be set.');
  process.exit(1);
}

const sql = postgres(connectionString, { prepare: false, onnotice: () => {} });

const ok = (s: string) => console.log(`  ✓ ${s}`);
const bad = (s: string) => {
  console.log(`  ✗ ${s}`);
  failures += 1;
};
let failures = 0;

async function main() {
  console.log('\nPROVISIONING · end to end\n');

  // ── 1 · the catalogue ────────────────────────────────────────────────────
  console.log('1. Plan catalogue');
  const plans = await sql<
    { id: string; code: string; name: string; price_amount: string; is_active: boolean }[]
  >`select id, code, name, price_amount, is_active from plans order by sort_order`;

  if (plans.length === 0) {
    bad('no rows in `plans`. Provisioning cannot resolve any code. Run `pnpm db:seed`.');
    return;
  }
  ok(`${plans.length} plans: ${plans.map((p) => p.code).join(', ')}`);

  const active = plans.filter((p) => p.is_active);
  if (active.length === 0) bad('every plan is inactive; the modal will offer nothing.');
  else ok(`${active.length} active`);

  // ── 2 · the codes the console has ever named ─────────────────────────────
  //
  // The stale list is checked explicitly rather than dropped, because the point
  // is to fail loudly if anything re-introduces it.
  console.log('\n2. Codes the console offers resolve to rows');
  const RETIRED = ['starter', 'growth', 'scale'];
  const codes = new Set(active.map((p) => p.code));

  for (const retired of RETIRED) {
    if (codes.has(retired)) {
      ok(`\`${retired}\` exists (it did not when this check was written)`);
    }
  }
  const stillOffered = RETIRED.filter((r) => !codes.has(r));
  ok(`retired codes absent from the catalogue: ${stillOffered.join(', ') || 'none'}`);

  // ── 3 · entitlements ─────────────────────────────────────────────────────
  console.log('\n3. Each plan carries entitlements');
  const ents = await sql<{ code: string; n: number; limits: number }[]>`
    select p.code,
           count(*)::int as n,
           count(*) filter (where e.kind = 'limit')::int as limits
      from plan_entitlements e
      join plans p on p.id = e.plan_id
     group by p.code`;

  for (const plan of active) {
    const row = ents.find((e) => e.code === plan.code);
    if (!row || row.n === 0) {
      bad(`\`${plan.code}\` has no entitlements — a workspace on it has no ceilings at all.`);
    } else {
      ok(`${plan.code}: ${row.n} entitlements (${row.limits} limits)`);
    }
  }

  // ── 4 · every tenant has exactly one subscription ────────────────────────
  console.log('\n4. Every workspace has a subscription');
  const orphans = await sql<{ slug: string; name: string; provisioned_at: Date | null }[]>`
    select t.slug, t.name, t.provisioned_at
      from tenants t
      left join subscriptions s on s.tenant_id = t.id
     where t.deleted_at is null and s.id is null
     order by t.provisioned_at desc nulls last`;

  const total = await sql<{ n: number }[]>`
    select count(*)::int as n from tenants where deleted_at is null`;

  if (orphans.length === 0) {
    ok(`all ${total[0]?.n ?? 0} workspaces have one`);
  } else {
    bad(`${orphans.length} of ${total[0]?.n ?? 0} workspaces have NO subscription:`);
    for (const o of orphans.slice(0, 10)) {
      console.log(
        `      ${o.slug.padEnd(28)} ${o.provisioned_at ? `provisioned ${o.provisioned_at.toISOString().slice(0, 10)}` : 'no provisioned_at'}`,
      );
    }
    console.log(
      '\n      These were created before `provisionTenant` wrote a subscription row.\n' +
        '      They show "—" in the plan column and have no ceilings. Assign a plan\n' +
        "      from the workspace's billing tab, which is audited and does the same\n" +
        '      write correctly.',
    );
  }

  // ── 5 · a provisioned workspace is complete ──────────────────────────────
  console.log('\n5. Provisioned workspaces are complete');
  const incomplete = await sql<
    { slug: string; has_settings: boolean; owners: number; has_sub: boolean }[]
  >`
    select t.slug,
           (ts.tenant_id is not null) as has_settings,
           (select count(*) from tenant_members m
             where m.tenant_id = t.id and m.role = 'owner' and m.deleted_at is null)::int as owners,
           (s.id is not null) as has_sub
      from tenants t
      left join tenant_settings ts on ts.tenant_id = t.id
      left join subscriptions s on s.tenant_id = t.id
     where t.deleted_at is null
     order by t.slug`;

  const broken = incomplete.filter((r) => !r.has_settings || r.owners !== 1 || !r.has_sub);
  if (broken.length === 0) {
    ok(`all ${incomplete.length} have settings, exactly one owner, and a subscription`);
  } else {
    for (const b of broken.slice(0, 10)) {
      bad(
        `${b.slug}: settings=${b.has_settings ? 'yes' : 'NO'} owners=${b.owners} subscription=${b.has_sub ? 'yes' : 'NO'}`,
      );
    }
  }

  console.log(
    failures === 0
      ? '\nProvisioning chain is intact.\n'
      : `\n${failures} ${failures === 1 ? 'problem' : 'problems'} above.\n`,
  );
}

main()
  .catch((error: unknown) => {
    console.error('\nThe check itself failed:', error);
    failures += 1;
  })
  .finally(async () => {
    await sql.end();
    process.exit(failures === 0 ? 0 : 1);
  });
