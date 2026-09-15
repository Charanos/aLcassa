import { installPlatformAuditWriter } from './internal/audit';

/**
 * 04 §3 · 11 §6. The only file another module may import.
 *
 * `platform` owns the operations that act on tenants AS RECORDS rather than
 * reading their content: provisioning, suspension, plan assignment and
 * listing. It is the one module permitted to reach the service role, and
 * `eslint.config.mjs` enforces that with an import guard rather than a
 * convention.
 *
 * ⚠ THE SIDE EFFECT ON THIS LINE IS LOAD-BEARING. `asService` refuses to run
 * until an audit writer is registered — a service-role call without an audit
 * row is not permitted (06 §7). Registering it here, at module import, means
 * anything that can reach `asService` has already been through this file.
 * Moving this into a function that a caller must remember to invoke would
 * make the guarantee depend on memory.
 */
installPlatformAuditWriter();

export { provisionTenant } from './internal/provisioning';

/**
 * IA §3 · `/sign-up`. The public registration path. It lives in this module
 * for one reason: it creates a tenant, and creating a tenant is a service-role
 * operation because there is no tenant yet for a context to resolve to. The
 * import guard in `eslint.config.mjs` keeps that reach inside this boundary.
 *
 * See `internal/selfServeSignUp.ts` for why it is NOT `provisionTenant` with
 * an extra argument.
 */
export {
  selfServeSignUp,
  selfServeSignUpSchema,
  type SelfServeSignUpInput,
  type SelfServeSignUpResult,
} from './internal/selfServeSignUp';

/**
 * 08 §7 · 08 §9. Subscription administration. Every one of these is a
 * service-role call, audited before it runs — see the file for why they are
 * on this side of the module boundary rather than in `modules/subscriptions`.
 */
export {
  assignPlan,
  changeSubscriptionStatus,
  grantOverride,
  previewPlanChange,
} from './internal/subscriptions';
export type { PlanChangePreview, PlatformActor } from './internal/subscriptions';

export { watchlist, ATTENTION_THRESHOLD } from './internal/watchlist';
export type { WatchlistEntry } from './internal/watchlist';

/**
 * 09 §3 · 09 §4. Support sessions.
 *
 * A support session is a row in `sessions` with `kind = 'support'` — not a
 * table of its own and not a flag on the admin — so RLS reads its tenant and
 * role exactly as it does for a tenant user. See the file for why that is the
 * whole security argument.
 */
export {
  startSupportSession,
  endSupportSession,
  extendSupportSession,
  readSupportSession,
  SUPPORT_SESSION_DURATION_MS,
} from './internal/support';
export type { SupportSessionRecord } from './internal/support';

/** 06 §8 · 09 §2. Suspension, which is read-only access rather than a lockout. */
export { setTenantStatus, previewSuspension } from './internal/tenancy';
export type { TenantStatus } from './internal/tenancy';

export { provisionTenantSchema, slugSchema, RESERVED_SLUGS } from './types';

export type { ProvisionTenantInput, ProvisionTenantResult } from './types';

/**
 * 05 §9. A platform action that did not bypass Row Level Security — an export,
 * for instance. See the file for why it is separate from the `asService`
 * writer rather than a flag on it.
 */
export { recordPlatformAction } from './internal/audit';
export {
  publishMasterRules,
  rollbackMasterRules,
  type MasterRulesInput,
} from './internal/masterRules';
export {
  previewPlanLimitChange,
  setPlanLimit,
  type PlanLimitImpact,
} from './internal/planCatalogue';
export { breakGlassState, setBreakGlass, type BreakGlassState } from './internal/breakGlass';
