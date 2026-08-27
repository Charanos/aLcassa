import 'server-only';
import { and, eq, gt, isNull } from 'drizzle-orm';
import {
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
  supportMode: { active: boolean; expiresAt: string | null; platformAdminName: string | null } | null;
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
      .where(
        and(eq(tenantMembers.userId, ctx.actorId), eq(tenantMembers.tenantId, ctx.tenantId)),
      )
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
            platformAdminName: support.supportContext?.platformAdminId ?? null,
          }
        : null,
      // The console is a different door. A tenant payload never asserts it.
      platformAdmin: ctx.actorType === 'platform_admin',
    };
  });
}
