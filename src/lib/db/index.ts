/**
 * The database surface the application is allowed to see.
 *
 * `serviceClient` is deliberately NOT re-exported here. It is reachable only by
 * its own path, which is the path the lint rule watches. 06 §7.
 */

export { db } from './client';
export type { Database, Transaction } from './client';
export { withTenantContext, withoutTenantContext } from './withTenantContext';
export { hasRole, isSupport } from './context';
export type { ResolvedContext, TenantRole } from './context';
