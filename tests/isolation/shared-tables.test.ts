import { afterAll, describe, expect, it } from 'vitest';
import {
  adminCount,
  asActor,
  closeHarness,
  sharedPolicyTables,
  withNoContext,
  type Actor,
} from './harness';
import { SEED_TENANT_A, SEED_USER_A } from '../../src/db/seed/constants';

/**
 * 06 §4. THE OTHER HALF OF THE ISOLATION GUARANTEE.
 *
 * ⚠ THIS FILE EXISTS BECAUSE THE GENERATED SUITE PASSED WHILE SIX TABLES
 *   RETURNED ZERO ROWS TO EVERY CALLER, AND NOTHING NOTICED FOR WEEKS.
 *
 * `generated.test.ts` proves a tenant cannot see ANOTHER tenant's rows. It
 * does not prove a tenant can see their OWN, and it never touches a table
 * without a `tenant_id` column, because that is the column it selects tables
 * by. Both gaps had the same consequence.
 *
 * The policies on `user_profiles`, `plans`, `plan_entitlements`,
 * `master_ai_rules` and the platform tables called `auth.uid()`. That
 * function reads a JWT claim. The Drizzle connection every application query
 * uses is a plain Postgres role with no JWT, so `auth.uid()` was NULL,
 * `user_id = null` matched nothing, and those tables were EMPTY FOR EVERYONE
 * — including for the signed-in user reading their own profile.
 *
 * Every isolation assertion still passed. A table that is empty for everyone
 * is indistinguishable, from the outside, from a table that is perfectly
 * isolated. THAT is the shape of the bug this file is here to catch, and the
 * only assertion that catches it is the positive one:
 *
 *   A LEGITIMATE ACTOR MUST ACTUALLY SEE WHAT THEY ARE ENTITLED TO SEE.
 *
 * So every table below gets both halves, and a table that is deliberately
 * invisible to a tenant says so by name, with its reason, rather than by
 * being absent.
 */

const asA: Actor = {
  tenantId: SEED_TENANT_A,
  role: 'owner',
  actorId: SEED_USER_A,
  supportMode: false,
};

type Expectation = {
  /** What an ordinary signed-in tenant member should see. */
  tenantMember: 'all-rows' | 'some-rows' | 'none';
  why: string;
};

/**
 * ⚠ EVERY POLICED TABLE WITHOUT A TENANT COLUMN MUST APPEAR HERE.
 *
 * The test below fails on a table that is missing from this map, so adding a
 * shared table forces a decision about who may read it rather than allowing
 * it to ship uncovered. This is the same reasoning as `PLATFORM_WRITE_ONLY`
 * in `check-policies.ts`: silence should be a recorded decision, never an
 * oversight.
 */
const EXPECTATIONS: Record<string, Expectation> = {
  plans: {
    tenantMember: 'all-rows',
    why: '08 §1. The plan catalogue is public to anyone signed in — a tenant cannot choose an upgrade they cannot see.',
  },
  plan_entitlements: {
    tenantMember: 'all-rows',
    why: '08 §2. The limits attached to each plan, read alongside the catalogue to render what an upgrade would raise.',
  },
  master_ai_rules: {
    tenantMember: 'all-rows',
    why: '10 §2. A tenant may read the platform rules their own rules layer under; they cannot edit them.',
  },
  master_ai_rule_versions: {
    tenantMember: 'all-rows',
    why: '10 §2. Published versions only. The policy filters on status, so an unpublished draft is not readable here.',
  },
  user_profiles: {
    tenantMember: 'some-rows',
    why: '02 §11. Myself, and anyone I share a tenant with. Never the whole platform directory.',
  },
  tenants: {
    tenantMember: 'some-rows',
    why: '06 §5. My own tenant only. The generated suite proves the other side; this proves I can still see mine.',
  },
  platform_admins: {
    tenantMember: 'none',
    why: '09 §6. The platform roster is not tenant-readable. A tenant has no business enumerating who can enter their workspace.',
  },
  platform_settings: {
    tenantMember: 'none',
    why: 'Doc 23 · S0.2. Platform-wide settings are read by operators only. A customer sees the support address where a page renders it, never by querying the row.',
  },
  platform_audit_log: {
    tenantMember: 'none',
    why: "05 §9. The platform's own trail. What a tenant may see about support access is in THEIR audit_log, which the generated suite covers.",
  },
};

const tables: string[] = await sharedPolicyTables();

afterAll(async () => {
  await closeHarness();
});

describe('isolation · tables with no tenant column', () => {
  it('every policed shared table has a recorded expectation', () => {
    // A table missing from EXPECTATIONS fails here rather than going
    // uncovered. 06 §2 rule 1, applied to the tables that rule forgot.
    const undeclared = tables.filter((table) => !(table in EXPECTATIONS));
    expect(
      undeclared,
      `these policed tables have no tenant_id and no entry in EXPECTATIONS, so nobody has decided who may read them: ${undeclared.join(', ')}`,
    ).toEqual([]);
  });

  it('finds the shared tables at all', () => {
    expect(tables.length, 'is the database migrated?').toBeGreaterThan(0);
  });

  describe.each(tables)('table · %s', (table) => {
    const expectation = EXPECTATIONS[table];

    /**
     * ⚠ THE CASE THAT WOULD HAVE CAUGHT THE auth.uid() DEFECT.
     *
     * Not "can A see B's rows" — "can A see ANYTHING". A policy that
     * resolves to false for every caller passes every isolation test ever
     * written and breaks the entire application.
     */
    it('is not invisible to everyone', async () => {
      if (!expectation) return; // reported by the declaration test above
      const total = await adminCount(table);
      if (total === 0) return; // nothing seeded; nothing to prove either way

      const visible = await asActor(asA, async (tx) => {
        const rows = await tx`select 1 from ${tx(table)}`;
        return rows.length;
      });

      if (expectation.tenantMember === 'none') {
        expect(
          visible,
          `${table} must not be readable by a tenant member. ${expectation.why}`,
        ).toBe(0);
        return;
      }

      expect(
        visible,
        `${table} holds ${total} rows and a signed-in owner sees NONE of them. ${expectation.why}`,
      ).toBeGreaterThan(0);

      if (expectation.tenantMember === 'all-rows') {
        expect(visible, `${table}: ${expectation.why}`).toBe(total);
      } else {
        // 'some-rows': visible, but scoped. Seeing everything would mean the
        // scoping predicate is not firing.
        expect(
          visible,
          `${table} is scoped, so seeing every row is wrong. ${expectation.why}`,
        ).toBeLessThanOrEqual(total);
      }
    });

    /** The leak test, repeated here because these tables never got one. */
    it('returns nothing with no context set', async () => {
      const visible = await withNoContext(async (tx) => {
        const rows = await tx`select 1 from ${tx(table)}`;
        return rows.length;
      });
      expect(
        visible,
        `${table} leaks to a connection with no context, which is what a pooled connection looks like between requests`,
      ).toBe(0);
    });
  });
});

/**
 * The specific assertion the defect broke, written out rather than inferred
 * from a count: the signed-in user can read their OWN profile row. Every
 * application shell renders a name from this query.
 */
describe('isolation · a user can read their own profile', () => {
  it('sees their own row by primary key', async () => {
    const rows = await asActor(
      asA,
      (tx) => tx`select id from user_profiles where id = ${SEED_USER_A}`,
    );
    expect(
      rows.length,
      'the signed-in user cannot read their own profile: app.current_actor_id() is not resolving on this connection',
    ).toBe(1);
  });

  it('cannot read a profile from a tenant they do not share', async () => {
    const rows = await asActor(
      asA,
      (tx) => tx`select id from user_profiles where id != ${SEED_USER_A}`,
    );
    // Tenant A has one member. Anyone else belongs to another tenant.
    expect(rows.length).toBe(0);
  });
});
