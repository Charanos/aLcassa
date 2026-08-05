/**
 * 06 §3. The resolved request context.
 *
 * A ResolvedContext can only be produced by the middleware resolver in this
 * file. It carries a private brand, so `{ tenantId, role, actorId }` does not
 * satisfy the type no matter how correct it looks, and a handler cannot
 * construct one from a request body however hard it tries.
 *
 * That is a small thing that makes an entire category of mistake impossible to
 * write, and the category in question is the one that ends this business.
 */

declare const brand: unique symbol;

export type TenantRole = 'owner' | 'admin' | 'agent' | 'support';

export type ResolvedContext = {
  readonly [brand]: 'ResolvedContext';
  readonly tenantId: string;
  readonly role: TenantRole;
  readonly actorId: string;
  readonly actorLabel: string;
  readonly actorType: 'user' | 'platform_admin' | 'service';
  readonly supportMode: boolean;
  readonly requestId: string;
  /** Present on the service door only. Checked before the handler runs. */
  readonly scopes: readonly string[];
  readonly ipAddress: string | null;
  readonly sessionId: string | null;
};

/**
 * The ONLY constructor. It is not exported from `@/lib/db`; it is imported by
 * the two resolvers in `src/lib/auth` and by the test harness, and by nothing
 * else. If you find yourself importing this file from a route handler or a
 * service, the tenant context you want has already been resolved and is being
 * passed to you.
 *
 * Note what is absent from the parameters: there is no way to pass a tenantId
 * that did not come from a session row or a credential row. 06 §1.
 */
export function createResolvedContext(input: {
  tenantId: string;
  role: TenantRole;
  actorId: string;
  actorLabel: string;
  actorType: 'user' | 'platform_admin' | 'service';
  supportMode: boolean;
  requestId: string;
  scopes?: readonly string[];
  ipAddress?: string | null;
  sessionId?: string | null;
}): ResolvedContext {
  return {
    tenantId: input.tenantId,
    role: input.role,
    actorId: input.actorId,
    actorLabel: input.actorLabel,
    actorType: input.actorType,
    supportMode: input.supportMode,
    requestId: input.requestId,
    scopes: input.scopes ?? [],
    ipAddress: input.ipAddress ?? null,
    sessionId: input.sessionId ?? null,
  } as ResolvedContext;
}

/**
 * 06 §5. Roles are checked in one guard, so adding a role later touches the
 * guard and the policies rather than every handler.
 *
 * This is the application-side mirror of the role predicates in the policies.
 * It is a convenience for producing a good error message; it is NOT the
 * enforcement. The enforcement is in the database, and if this guard and a
 * policy ever disagree, the policy wins and the isolation suite says so.
 */
export function hasRole(ctx: ResolvedContext, ...allowed: TenantRole[]): boolean {
  return allowed.includes(ctx.role);
}

export function isSupport(ctx: ResolvedContext): boolean {
  return ctx.supportMode || ctx.role === 'support';
}
