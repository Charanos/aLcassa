/**
 * 05 §11. Fixed UUIDs, so the isolation suite can assert against known rows
 * without first querying for them, and so a failing case names a tenant a
 * person can recognise rather than a random identifier.
 *
 * THE THREE DEVELOPMENT TENANTS MATTER MORE THAN THEY LOOK. An isolation suite
 * needs at least two tenants with overlapping-looking data to prove anything,
 * and a suspended one to prove the status predicate in the modify policies
 * actually fires. Seeding one tenant would produce a suite that passes and
 * proves nothing.
 */

/** Pro, at its 1-seat limit. Exercises the limit-reached path. */
export const SEED_TENANT_A = '00000000-0000-4000-8000-00000000000a';
/** Business, mid-usage. The ordinary case. */
export const SEED_TENANT_B = '00000000-0000-4000-8000-00000000000b';
/** Suspended. Proves `app.tenant_is_writable()` denies writes and permits reads. */
export const SEED_TENANT_C = '00000000-0000-4000-8000-00000000000c';

export const SEED_USER_A = '00000000-0000-4000-8000-0000000000a1';
export const SEED_USER_B = '00000000-0000-4000-8000-0000000000b1';
export const SEED_USER_C = '00000000-0000-4000-8000-0000000000c1';

/** Brian. */
export const SEED_PLATFORM_ADMIN = '00000000-0000-4000-8000-00000000ad01';

/**
 * 08 §2. CONFIRMED 24 Aug 2026, three weeks ahead of the original week-4
 * schedule, from Brian's pricing page. Replaces the four-tier proposal
 * (Free, Starter, Growth, Scale) this file previously carried; see
 * `15 §3` A13 for the full record of that replacement.
 *
 * `price` is in whole KES, matching `plans.priceAmount`'s minor-units
 * convention only insofar as KES has no minor unit in ordinary use here;
 * `08 §1` and `07 §1` govern the money shape generally. `priceAmount` is
 * `not null` in the schema (`05 §5`), so Custom cannot ship a genuine
 * null and seeds at 0 instead. There is no `isCustomPricing` column and
 * none is added here: the plans table has exactly one Custom-priced row,
 * identified by `code === 'custom'`, and the dashboard and console check
 * that code to render "Tailored" rather than a price. If a second
 * custom-priced tier is ever needed, that convention stops being enough
 * and a real column is the correct fix then, not before. Do not read
 * `priceAmount === 0` as "free" anywhere in the application: check the
 * plan code. There is no free plan.
 *
 * `support_sla_hours` is `kind: 'limit'` with the hour count in
 * `limitValue`, not `kind: 'feature'`: `plan_entitlements.featureEnabled`
 * is a boolean with nowhere to hold a number. See `08 §2` for the full
 * reasoning. Nothing calls `checkEntitlement` against this key, which is
 * what makes it display-only in practice.
 */
export const SEED_PLANS = [
  {
    code: 'pro',
    name: 'Pro',
    price: 3_400,
    entitlements: {
      seats: 1,
      channels: 1,
      api_keys: 2,
      kb_documents: 100,
      ai_rules_versions: 10,
      audit_retention_days: 30,
      conversations_monthly: 1_000,
      support_sla_hours: 24,
    },
  },
  {
    code: 'business',
    name: 'Business',
    price: 17_000,
    entitlements: {
      seats: 10,
      channels: 5,
      api_keys: 10,
      kb_documents: 1_000,
      ai_rules_versions: 50,
      audit_retention_days: 90,
      conversations_monthly: 6_000,
      support_sla_hours: 8,
    },
  },
  {
    code: 'custom',
    name: 'Custom',
    price: 0, // Tailored. Rendered from the 'custom' code, never from this number.
    entitlements: {
      // null is unlimited, rendered as ∞ through MathExpr and never as a full
      // progress bar, because a full bar for an unlimited plan is a lie.
      // support_sla_hours is a real number even on Custom: it is a service
      // commitment, not a resource that can run out.
      seats: null,
      channels: null,
      api_keys: null,
      kb_documents: null,
      ai_rules_versions: null,
      audit_retention_days: 365,
      conversations_monthly: null,
      support_sla_hours: 2,
    },
  },
] as const;

export const ENTITLEMENT_DISPLAY_NAMES: Record<string, string> = {
  seats: 'Seats',
  channels: 'Channels',
  api_keys: 'API keys',
  kb_documents: 'Knowledge base documents',
  ai_rules_versions: 'Assistant rule versions retained',
  audit_retention_days: 'Activity history',
  conversations_monthly: 'Conversations this month',
  support_sla_hours: 'Support response time',
};
