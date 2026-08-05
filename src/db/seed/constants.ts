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

/** Free tier, at its seat limit. Exercises the limit-reached path. */
export const SEED_TENANT_A = '00000000-0000-4000-8000-00000000000a';
/** Growth, mid-usage. The ordinary case. */
export const SEED_TENANT_B = '00000000-0000-4000-8000-00000000000b';
/** Suspended. Proves `app.tenant_is_writable()` denies writes and permits reads. */
export const SEED_TENANT_C = '00000000-0000-4000-8000-00000000000c';

export const SEED_USER_A = '00000000-0000-4000-8000-0000000000a1';
export const SEED_USER_B = '00000000-0000-4000-8000-0000000000b1';
export const SEED_USER_C = '00000000-0000-4000-8000-0000000000c1';

/** Brian. */
export const SEED_PLATFORM_ADMIN = '00000000-0000-4000-8000-00000000ad01';

/**
 * 08 §2. A STARTING PROPOSAL, marked clearly as one. Brian confirms the tiers
 * and their limits in week four, and because entitlements are rows rather than
 * code, changing any of these before M3 costs an insert and no deployment.
 */
export const SEED_PLANS = [
  {
    code: 'free',
    name: 'Free',
    price: 0,
    entitlements: {
      seats: 2,
      channels: 1,
      api_keys: 1,
      kb_documents: 10,
      ai_rules_versions: 3,
      audit_retention_days: 7,
    },
  },
  {
    code: 'starter',
    name: 'Starter',
    price: 0,
    entitlements: {
      seats: 5,
      channels: 2,
      api_keys: 3,
      kb_documents: 100,
      ai_rules_versions: 10,
      audit_retention_days: 30,
    },
  },
  {
    code: 'growth',
    name: 'Growth',
    price: 0,
    entitlements: {
      seats: 15,
      channels: 5,
      api_keys: 10,
      kb_documents: 1000,
      ai_rules_versions: 50,
      audit_retention_days: 90,
    },
  },
  {
    code: 'scale',
    name: 'Scale',
    price: 0,
    entitlements: {
      // null is unlimited, rendered as ∞ through MathExpr and never as a full
      // progress bar, because a full bar for an unlimited plan is a lie.
      seats: null,
      channels: null,
      api_keys: null,
      kb_documents: null,
      ai_rules_versions: null,
      audit_retention_days: 365,
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
};
