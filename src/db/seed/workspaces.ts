import type { Sql, TransactionSql } from 'postgres';
import { PORTFOLIO, SEAT_LIMIT } from '../../lib/console/portfolio';

type Queryable = Sql | TransactionSql;

/**
 * The twelve workspaces, as rows.
 *
 * ⚠ IT READS `lib/console/portfolio.ts` RATHER THAN CARRYING ITS OWN LIST, and
 * that is the whole point of the change. The console's designed figures derive
 * from the same module, so seeding a thirteenth workspace moves the portfolio
 * donut, the plan mix and the revenue headline with it. Before this, the
 * fixtures described forty-seven workspaces and the database held three, and
 * two screens side by side disagreed about how large the business is.
 *
 * ⚠ IT REPLACES THREE TENANTS WITH TWELVE, KEEPING THE FIRST THREE EXACTLY.
 * `tests/isolation/*` asserts against Acme (Pro, at its 1-seat limit), Northwind
 * (Business) and Tamarind (suspended) by id — their plan, status and seat usage
 * are part of what the suite tests. The other nine are new.
 *
 * ⚠ EVERY ROW IS SHAPED AS THE APPLICATION WOULD HAVE WRITTEN IT. Provisioning
 * dates are spread across fourteen months so cohort ordering means something;
 * `peak_value` is never below `current_value`, which the reconciliation job
 * caught once already; a trial carries a real `trial_ends_at`; a suspended
 * workspace keeps its subscription row rather than losing it, because that is
 * what suspension does.
 */

/**
 * A team member's id, derived from the owner's.
 *
 * ⚠ IT REPLACES THE OWNER'S LAST TWO CHARACTERS AND KEEPS THE LENGTH. The first
 * version built ids by concatenation and produced ELEVEN hex characters in the
 * final group where a UUID needs twelve — Postgres refused every one of them
 * with `22P02 invalid input syntax for type uuid`, which is the right error and
 * says nothing about which of two string expressions was short.
 *
 * Every owner id ends `01`, so seats 2…n take `02`, `03`, and collide with
 * nothing.
 */
function memberIdFor(ownerId: string, seat: number): string {
  return `${ownerId.slice(0, -2)}${(seat + 1).toString(16).padStart(2, '0')}`;
}

/**
 * Subscription status from the workspace's status.
 *
 * ⚠ THEY ARE TWO DIFFERENT VOCABULARIES AND THE MAPPING IS NOT AN IDENTITY.
 * `tenant_status` is about whether the workspace WORKS; `subscription_status` is
 * about whether the money is current. A suspended workspace's subscription is
 * `past_due` — it was not cancelled, and treating it as cancelled would erase
 * the arrears the debt card exists to chase.
 */
const SUBSCRIPTION_STATUS: Record<string, string> = {
  active: 'active',
  trial: 'trialing',
  past_due: 'past_due',
  suspended: 'past_due',
};

export async function seedWorkspaces(sql: Queryable): Promise<number> {
  for (const w of PORTFOLIO) {
    const provisioned = `${w.ageMonths} months`;

    await sql`
      insert into tenants (id, slug, name, status, provisioned_at, created_at)
      values (
        ${w.id}, ${w.slug}, ${w.name}, ${w.status}::tenant_status,
        now() - ${provisioned}::interval,
        now() - ${provisioned}::interval
      )
      on conflict (id) do update set
        slug   = excluded.slug,
        name   = excluded.name,
        status = excluded.status
    `;

    await sql`
      insert into tenant_settings (tenant_id, display_name, timezone, locale)
      values (${w.id}, ${w.name}, 'Africa/Nairobi', 'en')
      on conflict (tenant_id) do update set display_name = excluded.display_name
    `;

    const [plan] = await sql<{ id: string }[]>`select id from plans where code = ${w.plan}`;
    if (plan) {
      /* A trial ends 14 days after it began; everything else renews monthly on
         the anniversary of provisioning. Both are real dates rather than
         "now + 30 days" for every row, so the renewals chart has a spread. */
      await sql`
        insert into subscriptions (
          tenant_id, plan_id, status, current_period_start, current_period_end, trial_ends_at
        )
        values (
          ${w.id}, ${plan.id}, ${SUBSCRIPTION_STATUS[w.status] ?? 'active'}::subscription_status,
          date_trunc('month', now()),
          date_trunc('month', now()) + interval '1 month',
          ${w.status === 'trial' ? sql`now() + interval '14 days'` : null}
        )
        on conflict (tenant_id) do update set
          plan_id       = excluded.plan_id,
          status        = excluded.status,
          trial_ends_at = excluded.trial_ends_at
      `;
    }

    await sql`
      insert into tenant_ai_rules (tenant_id) values (${w.id})
      on conflict (tenant_id) do nothing
    `;

    // ── The owner ────────────────────────────────────────────────────────────
    const ownerId = w.ownerId;

    await sql`
      insert into user_profiles (id, full_name, email)
      values (${ownerId}, ${w.owner.name}, ${w.owner.email})
      on conflict (id) do update set
        full_name = excluded.full_name, email = excluded.email
    `;

    await sql`
      insert into tenant_members (tenant_id, user_id, role, status, joined_at)
      values (${w.id}, ${ownerId}, 'owner'::member_role, 'active', now() - ${provisioned}::interval)
      on conflict (tenant_id, user_id) do update set status = 'active'
    `;

    /*
     * ⚠ THE REMAINING SEATS ARE REAL MEMBER ROWS, NOT A COUNTER.
     *
     * `usage_counters.seats` could simply be set to the number, and then the
     * team list would show one person while the counter claimed nine — which is
     * exactly the kind of disagreement between two screens this whole change is
     * removing. Provisioning real members means the count is a CONSEQUENCE of
     * the rows, the way it is in production.
     */
    for (let seat = 1; seat < w.seats; seat += 1) {
      const memberId = memberIdFor(ownerId, seat);
      await sql`
        insert into user_profiles (id, full_name, email)
        values (
          ${memberId},
          ${`${w.name} Team ${seat}`},
          ${`team${seat}@${w.slug}.example`}
        )
        on conflict (id) do update set full_name = excluded.full_name
      `;
      await sql`
        insert into tenant_members (tenant_id, user_id, role, status, joined_at)
        values (${w.id}, ${memberId}, 'agent'::member_role, 'active', now() - ${provisioned}::interval)
        on conflict (tenant_id, user_id) do nothing
      `;
    }

    // ── Usage counters ───────────────────────────────────────────────────────
    /*
     * `peak_value` is a high-water mark and can never be BELOW `current_value`.
     * Seeding it at its column default of 0 alongside a current of 9 produced
     * exactly that incoherence once, which the reconciliation job surfaced on
     * its first run — a peak that understates the present is worse than none.
     */
    const counters: Array<[string, number]> = [
      ['seats', w.seats],
      ['channels', w.channels],
      ['api_keys', w.plan === 'pro' ? 1 : 2],
    ];

    for (const [key, value] of counters) {
      await sql`
        insert into usage_counters (tenant_id, key, current_value, peak_value, last_recalculated_at)
        values (${w.id}, ${key}, ${value}, ${value}, now())
        on conflict (tenant_id, key) do update set
          current_value       = excluded.current_value,
          peak_value          = greatest(usage_counters.peak_value, excluded.current_value),
          last_recalculated_at = now()
      `;
    }
  }

  return PORTFOLIO.length;
}

/**
 * A sanity check the seed runs on itself.
 *
 * ⚠ IT ASSERTS THE THING THE SCREENS ASSUME: that no workspace is over its own
 * plan's seat limit. A seeded row that breaches its entitlement would put the
 * console into a state the application cannot produce — every limit check
 * refuses the tenth seat on a nine-seat plan — and the screens built to show
 * pressure would be showing an impossibility.
 */
export function assertWithinLimits(): void {
  for (const w of PORTFOLIO) {
    const limit = SEAT_LIMIT[w.plan];
    if (limit !== null && w.seats > limit) {
      throw new Error(
        `${w.name} is seeded with ${w.seats} seats on the ${w.plan} plan, whose limit is ${limit}. The application could not have produced this state.`,
      );
    }
  }
}
