import 'server-only';
import { and, eq, gt, gte, isNull, sql } from 'drizzle-orm';
import {
  auditLog,
  plans,
  sessions,
  subscriptions,
  tenantMembers,
  tenants,
  userProfiles,
} from '@/db/schema';
import { withTenantContext } from '@/lib/db';
import type { ResolvedContext } from '@/lib/db/context';
import { getEntitlementSnapshot, type Entitlement } from '@/modules/entitlements';

/**
 * 07 §3. THE SHELL PAYLOAD.
 *
 * "Everything needed to render the shell in one round trip." Every field
 * below is on that screen: the name in the corner, the workspace in the
 * switcher, the plan on the usage panel, the meters, and the boundary frame.
 *
 * ⚠ IT TAKES A ResolvedContext AND READS NOTHING FROM ITS CALLER.
 *
 * There is no `tenantId` parameter, deliberately. The tenant is whatever the
 * session resolved to, so there is no argument a handler could pass wrongly
 * and no shape a request body could influence. 06 §1.
 */

export type Me = {
  user: { id: string; fullName: string; avatarPath: string | null };
  tenant: { id: string; name: string; slug: string; status: string } | null;
  membership: { role: string; status: string } | null;
  subscription: {
    planCode: string;
    planName: string;
    status: string;
    currentPeriodEnd: string | null;
  } | null;
  entitlements: Entitlement[];
  /**
   * Sheet 07 · 07 §8. THE RECEIPT, NOT A FLAG.
   *
   * The boundary frame does not merely say "support is here" — it shows the
   * resolved tenant id, the resolved role and the number of writes made so
   * far, because "every number names its source". A frame that asserted
   * isolation without showing the values it resolved would be asking to be
   * taken on trust, which is the opposite of the point.
   */
  supportMode: {
    active: boolean;
    sessionId: string;
    canEnd: boolean;
    expiresAt: string;
    tenantName: string;
    platformAdminName: string;
    reason?: string | null;
    resolvedTenantId: string;
    resolvedRole: 'support';
    writesSoFar: number;
  } | null;
  platformAdmin: boolean;
};

export async function loadMe(ctx: ResolvedContext): Promise<Me> {
  /**
   * ⚠ OUTSIDE THE TRANSACTION BELOW, DELIBERATELY.
   *
   * `getEntitlementSnapshot` consults the cache and opens its own
   * `withTenantContext` on a miss. Calling it from inside ours would nest a
   * transaction inside a transaction to no purpose — the snapshot is a
   * read, it is cached, and it does not need to be atomic with the profile
   * lookup.
   */
  const snapshot = await getEntitlementSnapshot(ctx);

  return withTenantContext(ctx, async (tx) => {
    const [profile] = await tx
      .select({
        id: userProfiles.id,
        fullName: userProfiles.fullName,
        avatarPath: userProfiles.avatarPath,
      })
      .from(userProfiles)
      .where(eq(userProfiles.id, ctx.actorId))
      .limit(1);

    const [tenant] = await tx
      .select({
        id: tenants.id,
        name: tenants.name,
        slug: tenants.slug,
        status: tenants.status,
      })
      .from(tenants)
      .where(eq(tenants.id, ctx.tenantId))
      .limit(1);

    const [membership] = await tx
      .select({ role: tenantMembers.role, status: tenantMembers.status })
      .from(tenantMembers)
      .where(and(eq(tenantMembers.userId, ctx.actorId), eq(tenantMembers.tenantId, ctx.tenantId)))
      .limit(1);

    const [subscription] = await tx
      .select({
        status: subscriptions.status,
        currentPeriodEnd: subscriptions.currentPeriodEnd,
        planCode: plans.code,
        planName: plans.name,
      })
      .from(subscriptions)
      .innerJoin(plans, eq(plans.id, subscriptions.planId))
      .where(eq(subscriptions.tenantId, ctx.tenantId))
      .limit(1);

    /**
     * 09 §7 · design sheet 07. The support session the TENANT can see.
     *
     * Read from the sessions table rather than from `ctx.supportMode`,
     * because the two answer different questions. `ctx.supportMode` is true
     * when the CALLER is the platform looking in; this is true when someone
     * is looking into this workspace at all, which is what the tenant's own
     * boundary frame is for. An owner must see the frame while a support
     * session is open even though their own session is perfectly ordinary.
     */
    const [support] = await tx
      .select({
        id: sessions.id,
        createdAt: sessions.createdAt,
        expiresAt: sessions.expiresAt,
        supportContext: sessions.supportContext,
      })
      .from(sessions)
      .where(
        and(
          eq(sessions.tenantId, ctx.tenantId),
          eq(sessions.kind, 'support'),
          isNull(sessions.revokedAt),
          gt(sessions.expiresAt, new Date()),
        ),
      )
      .limit(1);

    /**
     * The write count on the receipt.
     *
     * Counted from the tenant's OWN audit log, filtered to entries written
     * under support mode since this session opened. That flag is set by
     * `writeAudit` from the resolved context rather than by any caller, so
     * the number cannot be under-reported by a handler that forgot to
     * declare itself.
     *
     * `occurred_at` bounds it to this session rather than to every support
     * visit ever made, which is what "so far" means on a frame that is
     * describing what is happening right now.
     */
    const writesSoFar = support
      ? ((
          await tx
            .select({ count: sql<number>`count(*)::int` })
            .from(auditLog)
            .where(
              and(
                eq(auditLog.tenantId, ctx.tenantId),
                eq(auditLog.supportMode, true),
                gte(auditLog.occurredAt, support.createdAt),
              ),
            )
        )[0]?.count ?? 0)
      : 0;

    return {
      user: {
        id: ctx.actorId,
        fullName: profile?.fullName ?? ctx.actorLabel,
        avatarPath: profile?.avatarPath ?? null,
      },
      tenant: tenant ?? null,
      membership: membership ?? null,
      subscription: subscription
        ? {
            planCode: subscription.planCode,
            planName: subscription.planName,
            status: subscription.status,
            currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
          }
        : null,
      // Ordered by the key list rather than by object insertion, so the usage
      // panel renders the same sequence on every request.
      entitlements: Object.values(snapshot.byKey).filter(Boolean),
      supportMode: support
        ? {
            active: true,
            expiresAt: support.expiresAt.toISOString(),
            tenantName: tenant?.name ?? 'this workspace',
            /* Doc 24 · S0.4. This was the operator's UUID: the customer cannot
               read platform_admins, so the name is written into the session
               at mint. Older sessions fall back to the team, never an id. */
            sessionId: support.id,
            platformAdminName: support.supportContext?.platformAdminName ?? 'aLcassa support',
            /* Doc 24 · D6. The frame offers the ending only to the people the
               database will let end it. */
            canEnd:
              !ctx.supportMode && (membership?.role === 'owner' || membership?.role === 'admin'),
            reason: support.supportContext?.reason ?? null,
            resolvedTenantId: ctx.tenantId,
            resolvedRole: 'support' as const,
            writesSoFar,
          }
        : null,
      // The console is a different door. A tenant payload never asserts it.
      platformAdmin: ctx.actorType === 'platform_admin',
    };
  });
}
