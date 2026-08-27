import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { adminQuery, asActor, cleanup, closeHarness, type Actor } from './harness';
import { SEED_TENANT_A, SEED_TENANT_B, SEED_USER_A } from '../../src/db/seed/constants';

/**
 * 08 §2 · 08 §3. LIMIT ENFORCEMENT, AGAINST THE REAL DATABASE.
 *
 * M3's gate is "Demo: limit enforcement", so these are the cases that make it
 * demonstrable rather than asserted. They exercise the DATA the guard reads —
 * plan entitlements, overrides and usage counters — because that is where the
 * decision actually comes from; the guard itself is a pure function over this
 * snapshot and is tested separately without a database.
 *
 * ⚠ THE RESOLUTION ORDER IS THE THING WORTH PROVING.
 *
 * 08 §3 states it as: a live override first, then the plan's entitlement,
 * then DENY. There is no implicit default, "because an implicit default is
 * how an unlimited resource ships by accident" — and the case for that below
 * is the one that would catch it.
 *
 * ⚠ OVERRIDES ARE ARRANGED THROUGH `adminQuery`, AND THE FIRST DRAFT OF THIS
 *   FILE GOT THAT WRONG.
 *
 * It inserted them through `asActor` and three cases failed with "new row
 * violates row-level security policy" — which was the product working.
 * `03_subscriptions.sql` gives this table no tenant-facing modify policy at
 * all, because "a tenant cannot upgrade themselves: there is no payment
 * gateway behind the button". Granting an override is a PLATFORM action.
 *
 * So the fixtures are arranged as the platform, and every assertion still
 * OBSERVES as the tenant. That split is the whole discipline: arranging with
 * elevated rights is setup, asserting with them proves nothing.
 */

const asOwnerA: Actor = {
  tenantId: SEED_TENANT_A,
  role: 'owner',
  actorId: SEED_USER_A,
  supportMode: false,
};

const created = { overrides: [] as string[] };

/** Seed A is Pro: 1 seat, 2 API keys, 1 channel. 08 §2. */
let proSeats: number | null = null;

beforeAll(async () => {
  const [row] = await asActor(
    asOwnerA,
    (tx) => tx`
      select pe.limit_value
      from subscriptions s
      join plan_entitlements pe on pe.plan_id = s.plan_id
      where s.tenant_id = ${SEED_TENANT_A} and pe.key = 'seats'
    `,
  );
  proSeats = (row?.limit_value as number | null) ?? null;
});

afterAll(async () => {
  if (created.overrides.length > 0) {
    await cleanup`delete from subscription_overrides where id = any(${created.overrides})`;
  }
  await closeHarness();
});

describe('entitlements · the plan is the source', () => {
  it('tenant A is on Pro with the limits 08 §2 specifies', async () => {
    const rows = await asActor(
      asOwnerA,
      (tx) => tx`
        select p.code, pe.key, pe.limit_value
        from subscriptions s
        join plans p on p.id = s.plan_id
        join plan_entitlements pe on pe.plan_id = p.id
        where s.tenant_id = ${SEED_TENANT_A}
        order by pe.key
      `,
    );

    expect(rows.length, 'no entitlements resolved for a subscribed tenant').toBeGreaterThan(0);
    expect(rows[0]?.code).toBe('pro');

    const byKey = new Map(rows.map((r) => [r.key as string, r.limit_value as number | null]));
    // Straight from the pricing page, confirmed 24 Aug 2026.
    expect(byKey.get('seats')).toBe(1);
    expect(byKey.get('api_keys')).toBe(2);
    expect(byKey.get('channels')).toBe(1);
  });

  /**
   * ⚠ THE CASE 08 §3 IS WRITTEN AGAINST.
   *
   * "Deny. There is no implicit default, because an implicit default is how
   * an unlimited resource ships by accident." A key with no plan row must
   * resolve to nothing at all — not to null, which the snapshot reads as
   * unlimited.
   */
  it('a key with no plan row resolves to nothing rather than to unlimited', async () => {
    const rows = await asActor(
      asOwnerA,
      (tx) => tx`
        select pe.limit_value
        from subscriptions s
        join plan_entitlements pe on pe.plan_id = s.plan_id
        where s.tenant_id = ${SEED_TENANT_A} and pe.key = 'a_key_that_does_not_exist'
      `,
    );
    expect(rows.length, 'an unknown key returned a row, which the guard would read').toBe(0);
  });

  it('unlimited is null, never a large number standing in for it', async () => {
    const rows = await asActor(
      asOwnerA,
      (tx) => tx`
        select pe.key, pe.limit_value
        from plans p
        join plan_entitlements pe on pe.plan_id = p.id
        where p.code = 'custom' and pe.key = 'seats'
      `,
    );
    // 03 §10 renders null as ∞. A sentinel like 999999 would render as a
    // nearly-full bar, which is the lie that comment exists to prevent.
    expect(rows[0]?.limit_value).toBeNull();
  });
});

describe('entitlements · overrides take precedence', () => {
  it('a live override supersedes the plan limit', async () => {
    // Granted as the platform would grant it.
    const granted = await adminQuery<{ id: string }[]>`
      insert into subscription_overrides
        (tenant_id, key, limit_value, reason, granted_by, expires_at)
      values (${SEED_TENANT_A}, 'seats', 25,
              'Test: extra headcount', ${SEED_USER_A}, now() + interval '30 days')
      on conflict (tenant_id, key) do update
        set limit_value = 25, expires_at = now() + interval '30 days'
      returning id
    `;
    created.overrides.push(granted[0]!.id);

    const [resolved] = await asActor(
      asOwnerA,
      (tx) => tx`
        select coalesce(o.limit_value, pe.limit_value) as effective
        from subscriptions s
        join plan_entitlements pe on pe.plan_id = s.plan_id
        left join subscription_overrides o
          on o.tenant_id = s.tenant_id and o.key = pe.key
         and (o.expires_at is null or o.expires_at > now())
        where s.tenant_id = ${SEED_TENANT_A} and pe.key = 'seats'
      `,
    );

    expect(resolved?.effective).toBe(25);
    expect(resolved?.effective).not.toBe(proSeats);
  });

  /**
   * An expiry that has passed must stop applying on its own. The alternative
   * — a job that sweeps expired overrides — is a second thing to run and a
   * window in which a lapsed grant is still honoured.
   */
  it('an expired override stops applying without anything sweeping it', async () => {
    const granted = await adminQuery<{ id: string }[]>`
      insert into subscription_overrides
        (tenant_id, key, limit_value, reason, granted_by, expires_at)
      values (${SEED_TENANT_A}, 'api_keys', 99,
              'Test: lapsed grant', ${SEED_USER_A}, now() - interval '1 day')
      on conflict (tenant_id, key) do update
        set limit_value = 99, expires_at = now() - interval '1 day'
      returning id
    `;
    created.overrides.push(granted[0]!.id);

    const [resolved] = await asActor(
      asOwnerA,
      (tx) => tx`
        select coalesce(o.limit_value, pe.limit_value) as effective
        from subscriptions s
        join plan_entitlements pe on pe.plan_id = s.plan_id
        left join subscription_overrides o
          on o.tenant_id = s.tenant_id and o.key = pe.key
         and (o.expires_at is null or o.expires_at > now())
        where s.tenant_id = ${SEED_TENANT_A} and pe.key = 'api_keys'
      `,
    );

    // Back to Pro's 2, not the lapsed 99.
    expect(resolved?.effective).toBe(2);
  });

  it('permits exactly one override per tenant and key', async () => {
    // `sub_overrides_unique` is what makes the resolution order deterministic:
    // two live rows for one key would leave `coalesce` picking arbitrarily.
    // Attempted as the PLATFORM, so the refusal can only come from the unique
    // index — as the tenant it would fail on the missing modify policy and
    // pass for entirely the wrong reason.
    let message = '';
    try {
      await adminQuery`
        insert into subscription_overrides (tenant_id, key, limit_value, reason, granted_by)
        values (${SEED_TENANT_A}, 'seats', 50, 'Test: duplicate', ${SEED_USER_A})
      `;
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message, 'a second override for the same key was accepted').toContain('duplicate key');
  });
});

describe('entitlements · isolation', () => {
  it("a tenant cannot read another tenant's override", async () => {
    const granted = await adminQuery<{ id: string }[]>`
      insert into subscription_overrides (tenant_id, key, limit_value, reason, granted_by)
      values (${SEED_TENANT_A}, 'channels', 9, 'Test: isolation', ${SEED_USER_A})
      on conflict (tenant_id, key) do update set limit_value = 9
      returning id
    `;
    const overrideId = granted[0]!.id;
    created.overrides.push(overrideId);

    // The owning tenant CAN read it — 08 §8 requires the reason to be shown
    // to them. Asserting only the refusal below would pass on a table that
    // nobody can read at all, which is the shape of defect C30 was.
    const mine = await asActor(
      asOwnerA,
      (tx) => tx`select id from subscription_overrides where id = ${overrideId}`,
    );
    expect(mine.length, 'a tenant cannot see an override granted to them').toBe(1);

    const asOwnerB: Actor = { ...asOwnerA, tenantId: SEED_TENANT_B };
    const rows = await asActor(
      asOwnerB,
      (tx) => tx`select id from subscription_overrides where id = ${overrideId}`,
    );
    expect(rows.length).toBe(0);
  });

  /**
   * 03_subscriptions.sql gives both subscription tables NO tenant-facing
   * modify policy, on the grounds that "a tenant cannot upgrade themselves
   * because there is no payment gateway behind the button".
   */
  it('a tenant cannot grant itself an override', async () => {
    let affected = -1;
    try {
      affected = await asActor(asOwnerA, async (tx) => {
        const rows = await tx`
          insert into subscription_overrides (tenant_id, key, limit_value, reason, granted_by)
          values (${SEED_TENANT_A}, 'kb_documents', 100000, 'Self-granted', ${SEED_USER_A})
          returning id
        `;
        return rows.length;
      });
    } catch {
      affected = 0;
    }
    expect(affected, 'a tenant granted itself an entitlement override').toBe(0);
  });

  it('a tenant cannot move itself onto a different plan', async () => {
    let affected = -1;
    try {
      affected = await asActor(asOwnerA, async (tx) => {
        const rows = await tx`
          update subscriptions
          set plan_id = (select id from plans where code = 'custom')
          where tenant_id = ${SEED_TENANT_A}
          returning id
        `;
        return rows.length;
      });
    } catch {
      affected = 0;
    }
    expect(affected, 'a tenant upgraded itself').toBe(0);
  });

  it('a tenant cannot change its own subscription status', async () => {
    let affected = -1;
    try {
      affected = await asActor(asOwnerA, async (tx) => {
        const rows = await tx`
          update subscriptions set status = 'active'
          where tenant_id = ${SEED_TENANT_A} returning id
        `;
        return rows.length;
      });
    } catch {
      affected = 0;
    }
    expect(affected).toBe(0);
  });
});

describe('entitlements · usage counters', () => {
  it('a counter is scoped to its tenant', async () => {
    const key = `probe_${randomUUID().slice(0, 8)}`;

    await asActor(
      asOwnerA,
      (tx) => tx`
        insert into usage_counters (tenant_id, key, current_value)
        values (${SEED_TENANT_A}, ${key}, 3)
      `,
    );

    const asOwnerB: Actor = { ...asOwnerA, tenantId: SEED_TENANT_B };
    const theirs = await asActor(
      asOwnerB,
      (tx) => tx`select key from usage_counters where key = ${key}`,
    );
    expect(theirs.length).toBe(0);

    await cleanup`delete from usage_counters where key = ${key}`;
  });
});
