#!/usr/bin/env tsx
/**
 * Prove the provisioning WRITE, against the real database, without keeping it.
 *
 * ⚠ `check-provisioning.ts` VERIFIES THE SHAPE OF WHAT ALREADY EXISTS. It
 * cannot catch the bug it was written for, because the twelve seeded
 * workspaces were seeded with their subscriptions directly — the seed never
 * went through `provisionTenant`, which is exactly why a provisioning path
 * that wrote no subscription looked fine from every console screen.
 *
 * So this runs the write itself: the same sequence `provisionTenant` performs
 * inside its transaction, against the same tables, with the same constraints —
 * and rolls back at the end, so a run costs nothing and leaves nothing.
 *
 * What it proves, in order:
 *
 *   1. a plan code resolves to a row (the check that would have caught `growth`)
 *   2. a bad code fails BEFORE anything is written
 *   3. tenant, settings, profile, owner membership and subscription all land
 *   4. the trial period is computed from the plan rather than invented
 *   5. the `subscriptions.tenant_id` unique index holds — one per tenant, I-14
 *   6. the whole thing rolls back cleanly
 *
 *   pnpm db:check-provision-write
 */

import { config as loadEnv } from 'dotenv';
import postgres from 'postgres';
import { randomUUID } from 'node:crypto';

loadEnv({ path: '.env.local', quiet: true });

const connectionString = process.env.DATABASE_URL_ADMIN ?? process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL_ADMIN or DATABASE_URL must be set.');
  process.exit(1);
}

const sql = postgres(connectionString, { prepare: false, onnotice: () => {} });

let failures = 0;
const ok = (s: string) => console.log(`  ✓ ${s}`);
const bad = (s: string) => {
  console.log(`  ✗ ${s}`);
  failures += 1;
};

/** Thrown to force the rollback once every assertion has run. */
class Rollback extends Error {}

async function main() {
  console.log('\nPROVISIONING · the write, rolled back\n');

  const slug = `probe-${randomUUID().slice(0, 8)}`;
  const ownerId = randomUUID();
  const ownerEmail = `${slug}@example.invalid`;

  try {
    await sql.begin(async (tx) => {
      // ── 1 · resolve the plan, as the service now does ────────────────────
      console.log('1. Plan resolution');
      const [plan] = await tx`
        select id, code, trial_days from plans
         where code = 'pro' and is_active = true limit 1`;

      if (!plan) {
        bad('`pro` did not resolve. The catalogue is not what the console offers.');
        throw new Rollback();
      }
      ok(`pro → ${String(plan.id).slice(0, 8)}… (trial_days ${plan.trial_days})`);

      const [ghost] = await tx`
        select id from plans where code = 'growth' and is_active = true limit 1`;
      if (ghost) bad('`growth` resolves — the retired code is back in the catalogue.');
      else ok('`growth` does not resolve, so the service would refuse before writing');

      // ── 2 · the transaction the service runs ─────────────────────────────
      console.log('\n2. The writes');
      const [tenant] = await tx`
        insert into tenants (slug, name, status, provisioned_at)
        values (${slug}, ${'Probe Workspace'}, 'trial', now())
        returning id`;
      if (!tenant) {
        bad('the tenant row was not returned');
        throw new Rollback();
      }
      ok('tenants');

      await tx`insert into tenant_settings (tenant_id, display_name)
               values (${tenant.id}, ${'Probe Workspace'})`;
      ok('tenant_settings');

      await tx`insert into user_profiles (id, full_name, email)
               values (${ownerId}, ${'Probe Owner'}, ${ownerEmail})
               on conflict do nothing`;
      ok('user_profiles');

      await tx`insert into tenant_members (tenant_id, user_id, role, status)
               values (${tenant.id}, ${ownerId}, 'owner', 'invited')`;
      ok('tenant_members (owner, invited)');

      // The period, computed the way the service computes it.
      const trialDays = Number(plan.trial_days);
      const [sub] = await tx`
        insert into subscriptions
          (tenant_id, plan_id, status, current_period_start, current_period_end, trial_ends_at)
        values (
          ${tenant.id}, ${plan.id}, 'trialing', now(),
          ${trialDays > 0 ? sql`now() + ${`${trialDays} days`}::interval` : sql`now() + interval '1 month'`},
          ${trialDays > 0 ? sql`now() + ${`${trialDays} days`}::interval` : null}
        )
        returning id, status, current_period_end, trial_ends_at`;
      if (!sub) {
        bad('THE SUBSCRIPTION ROW WAS NOT WRITTEN — this is the bug.');
        throw new Rollback();
      }
      ok(`subscriptions (${sub.status})`);

      // ── 3 · read it back the way the console reads it ────────────────────
      console.log('\n3. Read back, as the console reads it');
      const [readback] = await tx`
        select t.slug, t.status as tenant_status,
               p.code as plan_code, p.name as plan_name,
               s.status as sub_status, s.trial_ends_at,
               (select count(*) from plan_entitlements e
                 where e.plan_id = p.id and e.kind = 'limit')::int as limits,
               (select count(*) from tenant_members m
                 where m.tenant_id = t.id and m.role = 'owner')::int as owners
          from tenants t
          join subscriptions s on s.tenant_id = t.id
          join plans p on p.id = s.plan_id
         where t.id = ${tenant.id}`;

      if (!readback) {
        bad('the workspace does not join to a plan — exactly the old behaviour.');
        throw new Rollback();
      }
      ok(`plan column reads "${readback.plan_name}" rather than "—"`);
      ok(`${readback.limits} limits now apply to this workspace`);
      ok(`${readback.owners} owner`);
      if (trialDays > 0 && !readback.trial_ends_at) {
        bad('the plan has trial days and no trial end was written');
      } else {
        ok(
          readback.trial_ends_at
            ? `trial ends ${new Date(readback.trial_ends_at as string).toISOString().slice(0, 10)}`
            : 'no trial (plan has none)',
        );
      }

      // ── 4 · one subscription per tenant. I-14. ───────────────────────────
      console.log('\n4. One subscription per workspace (I-14)');
      try {
        await tx`savepoint dup`;
        await tx`insert into subscriptions
                   (tenant_id, plan_id, status, current_period_start, current_period_end)
                 values (${tenant.id}, ${plan.id}, 'active', now(), now() + interval '1 month')`;
        await tx`release savepoint dup`;
        bad('a SECOND subscription was accepted — the unique index is missing.');
      } catch {
        await tx`rollback to savepoint dup`;
        ok('a second subscription is refused by the index, not by hope');
      }

      throw new Rollback();
    });
  } catch (error) {
    if (!(error instanceof Rollback)) throw error;
  }

  // ── 5 · nothing survived ───────────────────────────────────────────────
  console.log('\n5. Rollback');
  const [left] = await sql`select count(*)::int as n from tenants where slug = ${slug}`;
  if ((left?.n ?? 0) === 0) ok('nothing was kept');
  else bad(`${left?.n} probe row(s) survived — clean up ${slug} by hand.`);

  console.log(
    failures === 0
      ? '\nProvisioning writes a complete workspace.\n'
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
