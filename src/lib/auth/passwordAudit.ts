import 'server-only';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { platformAdmins, platformAuditLog, tenantMembers, userProfiles } from '@/db/schema';
import { withActorContext, withTenantContext } from '@/lib/db';
import { createResolvedContext } from '@/lib/db/context';
import { AUDIT_ACTIONS, writeAudit } from '@/lib/audit';
import type { EmailPurpose } from './emailLink';

/** Record the credential event without password, token, email or provider diagnostics. */
export async function recordEmailPasswordChange(
  userId: string,
  purpose: EmailPurpose,
  sessionsRevoked: number,
  requestId: string,
  ipAddress: string | null,
) {
  const action = purpose === 'invite' ? AUDIT_ACTIONS.PASSWORD_SET : AUDIT_ACTIONS.PASSWORD_RESET;
  const after = { passwordChanged: true, sessionsRevoked };
  const memberships = await withActorContext(userId, requestId, async (tx) => {
    const [admin] = await tx
      .select({ name: platformAdmins.displayName })
      .from(platformAdmins)
      .where(and(eq(platformAdmins.userId, userId), isNull(platformAdmins.deletedAt)))
      .limit(1);
    if (admin)
      await tx.insert(platformAuditLog).values({
        actorUserId: userId,
        actorLabel: admin.name,
        action,
        entityType: 'user_profile',
        entityId: userId,
        after,
        reason: 'Account email verification completed',
        requestId,
        ipAddress,
        usedServiceRole: false,
      });
    return tx
      .select({
        tenantId: tenantMembers.tenantId,
        role: tenantMembers.role,
        label: userProfiles.fullName,
      })
      .from(tenantMembers)
      .leftJoin(userProfiles, eq(userProfiles.id, tenantMembers.userId))
      .where(
        and(
          eq(tenantMembers.userId, userId),
          inArray(tenantMembers.status, ['active', 'invited']),
          isNull(tenantMembers.deletedAt),
        ),
      );
  });
  for (const membership of memberships) {
    const ctx = createResolvedContext({
      tenantId: membership.tenantId,
      role: membership.role,
      actorId: userId,
      actorLabel: membership.label || 'Account holder',
      actorType: 'user',
      supportMode: false,
      requestId,
      ipAddress,
    });
    await withTenantContext(ctx, (tx) =>
      writeAudit(tx, ctx, { action, entityType: 'user_profile', entityId: userId, after }),
    );
  }
}
