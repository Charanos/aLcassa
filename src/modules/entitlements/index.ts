/**
 * 04 §3 · 11 §6. The only file another module may import.
 *
 * `entitlements` owns limit definitions, usage counters and the guard. It never
 * owns the business meaning of a limit: what "a seat" is belongs to
 * `membership`, and what "an API key" is belongs to `credentials`.
 */

export {
  checkEntitlement,
  assertEntitlement,
  getEntitlementSnapshot,
  invalidateEntitlements,
  incrementUsage,
} from './service';

export { ENTITLEMENT_KEYS, entitlementKeySchema } from './types';

export type {
  Entitlement,
  EntitlementDecision,
  EntitlementKey,
  EntitlementKind,
  EntitlementSnapshot,
} from './types';
