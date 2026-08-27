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
import {
  ENTITLEMENT_DISPLAY_NAMES,
  SEED_PLANS,
  SEED_PLATFORM_ADMIN,
  SEED_TENANT_A,
  SEED_TENANT_B,
  SEED_TENANT_C,
  SEED_USER_A,
  SEED_USER_B,
  SEED_USER_C,
} from './constants';

const connectionString = process.env.DATABASE_URL_ADMIN ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL_ADMIN or DATABASE_URL must be set.');

const sql = postgres(connectionString, { prepare: false, max: 1 });

// Plan codes updated 24 Aug 2026 to the confirmed Pro / Business / Custom
// catalogue. Tenant A stays deliberately at its 1-seat Pro limit; see the
// SEED_TENANT_A comment in constants.ts.
const TENANTS = [
  { id: SEED_TENANT_A, slug: 'acme-industrial', name: 'Acme Industrial', status: 'active', plan: 'pro' },
  { id: SEED_TENANT_B, slug: 'northwind', name: 'Northwind Traders', status: 'active', plan: 'business' },
  { id: SEED_TENANT_C, slug: 'tamarind', name: 'Tamarind Hotels', status: 'suspended', plan: 'pro' },
] as const;

const USERS = [
  { id: SEED_USER_A, tenant: SEED_TENANT_A, name: 'Grace Wanjiku', email: 'grace@acme-industrial.example', role: 'owner' },
  { id: SEED_USER_B, tenant: SEED_TENANT_B, name: 'Peter Otieno', email: 'peter@northwind.example', role: 'owner' },
  { id: SEED_USER_C, tenant: SEED_TENANT_C, name: 'Fatuma Ali', email: 'fatuma@tamarind.example', role: 'owner' },
] as const;

async function main(): Promise<void> {
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

    // ── Tenants, settings, subscriptions ──────────────────────────────────
    for (const tenant of TENANTS) {
      await tx`
        insert into tenants (id, slug, name, status, provisioned_at)
        values (${tenant.id}, ${tenant.slug}, ${tenant.name}, ${tenant.status}::tenant_status, now())
        on conflict (id) do update set name = excluded.name, status = excluded.status
      `;

      await tx`
        insert into tenant_settings (tenant_id, display_name, timezone, locale)
        values (${tenant.id}, ${tenant.name}, 'Africa/Nairobi', 'en')
        on conflict (tenant_id) do nothing
      `;

      const [plan] = await tx<{ id: string }[]>`select id from plans where code = ${tenant.plan}`;
      if (plan) {
        await tx`
          insert into subscriptions
            (tenant_id, plan_id, status, current_period_start, current_period_end)
          values
            (${tenant.id}, ${plan.id}, 'active', now(), now() + interval '30 days')
          on conflict (tenant_id) do update set plan_id = excluded.plan_id
        `;
      }

      await tx`
        insert into tenant_ai_rules (tenant_id) values (${tenant.id})
        on conflict (tenant_id) do nothing
      `;
    }

    // ── Members. Tenant A is deliberately AT its 1-seat Pro-tier limit, so
    //    the limit-reached path has something to fire against. ──────────────
    for (const user of USERS) {
      await tx`
        insert into user_profiles (id, full_name, email)
        values (${user.id}, ${user.name}, ${user.email})
        on conflict (id) do update
          set full_name = excluded.full_name, email = excluded.email
      `;
      await tx`
        insert into tenant_members (tenant_id, user_id, role, status, joined_at)
        values (${user.tenant}, ${user.id}, ${user.role}::member_role, 'active', now())
        on conflict (tenant_id, user_id) do nothing
      `;
      await tx`
        insert into usage_counters (tenant_id, key, current_value)
        values (${user.tenant}, 'seats', 1)
        on conflict (tenant_id, key) do update set current_value = usage_counters.current_value
      `;
    }

    // ── Platform admin. Brian. ────────────────────────────────────────────
    await tx`
      insert into user_profiles (id, full_name, email)
      values (${SEED_PLATFORM_ADMIN}, 'Brian', 'brian@alcassa.example')
      on conflict (id) do update
        set full_name = excluded.full_name, email = excluded.email
    `;
    await tx`
      insert into platform_admins (user_id, display_name)
      values (${SEED_PLATFORM_ADMIN}, 'Brian')
      on conflict (user_id) do nothing
    `;

    // ── The master rules singleton, so it exists from migration onward. ────
    await tx`
      insert into master_ai_rules (singleton) values (true)
      on conflict (singleton) do nothing
    `;
  });

  console.log('✓ seeded 3 plans, 3 tenants (one suspended), 3 owners, 1 platform admin');
  await sql.end();
}

main().catch(async (error: unknown) => {
  console.error('seed failed:', error);
  await sql.end().catch(() => undefined);
  process.exit(1);
});
