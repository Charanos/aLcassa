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

export { provisionTenantSchema, slugSchema, RESERVED_SLUGS } from './types';

export type { ProvisionTenantInput, ProvisionTenantResult } from './types';
