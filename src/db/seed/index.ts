#!/usr/bin/env tsx
/**
 * 05 §11. Seeds the three development tenants, the plan catalogue, the master
 * rules singleton and one platform admin.
 *
 * Runs with the ADMIN connection because it writes across tenants, which is
 * exactly the thing application code may never do. `pnpm db:seed`.
 */

import { config as loadEnv } from 'dotenv';
import postgres from 'postgres';

// Standalone script: Next.js is not here to load .env.local for us.
loadEnv({ path: '.env.local', quiet: true });
import { ENTITLEMENT_DISPLAY_NAMES, SEED_PLANS, SEED_PLATFORM_ADMIN } from './constants';
import { authSchemaExists, upsertAuthAccount, verifyAuthAccount } from './authAccounts';
import { seedDemoProfile } from './demoProfile';
import { assertWithinLimits, seedWorkspaces } from './workspaces';

const connectionString = process.env.DATABASE_URL_ADMIN ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL_ADMIN or DATABASE_URL must be set.');

/**
 * ⚠ THIS SEED NOW CREATES A SIGN-IN-ABLE ACCOUNT WITH A KNOWN PASSWORD, SO IT
 * REFUSES TO RUN IN PRODUCTION.
 *
 * Before this change the worst a misdirected `pnpm db:seed` could do was write
 * three demonstration tenants. It can now write credentials, and a documented
 * password against a production database is not a seeding mistake, it is an
 * open door.
 *
 * `SEED_ALLOW_PRODUCTION=1` exists because "never" is unenforceable and a guard
 * with no escape hatch gets commented out by the first person it inconveniences.
 * Making the override explicit and loud is worth more than making it impossible.
 */
if (process.env.NODE_ENV === 'production' && process.env.SEED_ALLOW_PRODUCTION !== '1') {
  throw new Error(
    'Refusing to seed with NODE_ENV=production: this writes a demonstration account with a known password. Set SEED_ALLOW_PRODUCTION=1 if that is genuinely what you want.',
  );
}

/**
 * The demonstration operator.
 *
 * ⚠ THE PASSWORD IS IN THE REPOSITORY ON PURPOSE, AND THAT IS ONLY SAFE BECAUSE
 * OF THE GUARD ABOVE. This is the account a reviewer signs in as to look at the
 * console; its value is that it is written down. `SEED_ADMIN_PASSWORD` overrides
 * it for anyone who wants a local instance that is not.
 *
 * ⚠ THE ADDRESS CHANGED from `brian@alcassa.example`. `.example` is reserved by
 * RFC 2606 precisely so it can never resolve — correct for a fixture nobody
 * signs in as, and wrong the moment the row backs a real account, because a
 * password reset would be posted into a black hole.
 */
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'brian@alcassa.co.ke';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'brian@admin123';
const ADMIN_NAME = 'Brian Masira';

const sql = postgres(connectionString, { prepare: false, max: 1 });

/**
 * ⚠ THE TENANT AND USER TABLES THAT LIVED HERE ARE GONE.
 *
 * Three tenants and three owners were declared inline. The portfolio is now
 * twelve workspaces defined ONCE in `lib/console/portfolio.ts`, which the
 * console’s designed figures read as well — so the database and the screens
 * cannot describe differently sized businesses. `seedWorkspaces` writes them.
 *
 * The first three keep their ids, plans, statuses and seat usage, because
 * `tests/isolation/*` asserts against all four of those.
 */

async function main(): Promise<void> {
  /* Refuse before writing anything if the portfolio describes a state the
     application could not produce — a workspace over its own seat limit. */
  assertWithinLimits();

  let seededWorkspaces = 0;

  await sql.begin(async (tx) => {
    // ── Plans and entitlements ────────────────────────────────────────────
    for (const [index, plan] of SEED_PLANS.entries()) {
      const [row] = await tx<{ id: string }[]>`
        insert into plans (code, name, price_amount, currency, sort_order)
        values (${plan.code}, ${plan.name}, ${plan.price}, 'KES', ${index})
        on conflict (code) do update set name = excluded.name
        returning id
      `;
      if (!row) continue;

      for (const [key, limit] of Object.entries(plan.entitlements)) {
        await tx`
          insert into plan_entitlements (plan_id, key, kind, limit_value, display_name)
          values (${row.id}, ${key}, 'limit', ${limit}, ${ENTITLEMENT_DISPLAY_NAMES[key] ?? key})
          on conflict (plan_id, key) do update set limit_value = excluded.limit_value
        `;
      }
    }

    // ── The twelve workspaces, their owners, teams and usage ────────────
    seededWorkspaces = await seedWorkspaces(tx);

    // ── Platform admin. Brian. ────────────────────────────────────────────
    await tx`
      insert into user_profiles (id, full_name, email)
      values (${SEED_PLATFORM_ADMIN}, ${ADMIN_NAME}, ${ADMIN_EMAIL})
      on conflict (id) do update
        set full_name = excluded.full_name, email = excluded.email
    `;
    /*
     * ⚠ THE THREE CAPABILITIES ARE SET EXPLICITLY RATHER THAN LEFT TO THEIR
     * DEFAULTS. They all default true, so this changes nothing today — and the
     * profile's access rail now RENDERS these three columns individually rather
     * than collapsing them into a role label, which makes them part of what the
     * demonstration shows. A screen that displays a value should be seeded by
     * something that states it.
     */
    await tx`
      insert into platform_admins
        (user_id, display_name, can_suspend_tenants, can_edit_master_rules, can_enter_support_mode)
      values (${SEED_PLATFORM_ADMIN}, ${ADMIN_NAME}, true, true, true)
      on conflict (user_id) do update
        set display_name           = excluded.display_name,
            can_suspend_tenants    = excluded.can_suspend_tenants,
            can_edit_master_rules  = excluded.can_edit_master_rules,
            can_enter_support_mode = excluded.can_enter_support_mode,
            deleted_at             = null
    `;

    // ── The master rules singleton, so it exists from migration onward. ────
    await tx`
      insert into master_ai_rules (singleton) values (true)
      on conflict (singleton) do nothing
    `;

    // ── Brian's own devices and a month of his activity. ──────────────────
    await seedDemoProfile(tx, ADMIN_NAME);
  });

  /**
   * ⚠ THE AUTH ACCOUNT IS WRITTEN OUTSIDE THE TRANSACTION ABOVE, AND AFTER IT.
   *
   * After, because `auth.users` is Supabase's table and the application rows are
   * ours: if the application half fails, nothing should be left behind that can
   * sign in. Outside, because the failure modes are different — a missing `auth`
   * schema is a SKIP, not an error, and rolling back three tenants because a
   * plain Postgres has no GoTrue would be absurd.
   */
  const hasAuth = await authSchemaExists(sql);

  const account = {
    id: SEED_PLATFORM_ADMIN,
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    fullName: ADMIN_NAME,
  };

  /**
   * ⚠ WRITTEN, THEN CHECKED. Three of this step's failure modes are silent from
   * the seed's point of view — a hash the wrong algorithm produced, a missing
   * identity row, an unconfirmed address — and all three end with a seed that
   * prints ✓ and a sign-in page that says the password is wrong.
   *
   * `verifyAuthAccount` re-runs the comparison GoTrue performs. Reporting
   * success without it would be the same defect this codebase keeps finding in
   * its own actions: a write that could affect nothing, reported as done.
   */
  let authProblem: string | null = null;

  if (hasAuth) {
    await upsertAuthAccount(sql, account);
    const verified = await verifyAuthAccount(sql, account);
    if (!verified.ok) authProblem = verified.problem;
  }

  /**
   * ⚠ THE AVATAR BUCKET, HERE AS WELL AS IN `08_storage.sql`.
   *
   * The policy catalogue creates it, and the catalogue runs on `pnpm db:migrate`
   * — so an environment that has only ever been seeded has the profile screen
   * and no bucket behind its upload button. Both paths now end with the bucket
   * present, both are idempotent, and neither depends on the other having run.
   */
  if (hasAuth) {
    await sql`
      insert into storage.buckets (id, name, public)
      values ('avatars', 'avatars', true)
      on conflict (id) do nothing
    `.catch(() => {
      console.warn('  ! storage.buckets not reachable — run `pnpm db:policies` against Supabase.');
    });
  }

  console.log(`✓ seeded 3 plans, ${seededWorkspaces} workspaces with owners, teams and usage, 1 platform admin`);
  console.log('✓ seeded 3 devices and 12 platform actions for the demo operator');

  if (hasAuth && !authProblem) {
    console.log(`✓ sign in at /sign-in as ${ADMIN_EMAIL}`);
    console.log(`  password: ${ADMIN_PASSWORD}`);
  } else if (authProblem) {
    /* Loud, specific, and a non-zero exit: the seed's whole purpose today is
       producing an account somebody can sign in as. Printing a warning and
       exiting 0 would leave the caller believing it worked. */
    console.error(`\n✗ the sign-in account was written but does not work: ${authProblem}\n`);
    await sql.end();
    process.exit(1);
  } else {
    console.log(
      '! no Supabase auth schema here, so no sign-in account was created.\n' +
        '  The application rows are seeded and the isolation suite will run.\n' +
        '  Point DATABASE_URL_ADMIN at the Supabase instance to seed credentials.',
    );
  }

  await sql.end();
}

main().catch(async (error: unknown) => {
  console.error('seed failed:', error);
  await sql.end().catch(() => undefined);
  process.exit(1);
});
