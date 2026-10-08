import 'server-only';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { tenantMembers, tenants, userProfiles } from '@/db/schema';
import { withActorContext, withTenantContext } from '@/lib/db';
import { createResolvedContext } from '@/lib/db/context';
import { AUDIT_ACTIONS, writeAudit } from '@/lib/audit';
import { AppError, ERROR_CODES } from '@/lib/errors';
import { createSupabaseServerClient } from './supabase/server';

/** Resolve only the confirmed account's stored owner invitation; no caller-supplied workspace. */
export async function activateProvisionedOwner(requestId: string, ipAddress: string | null) {
  const supabase = await createSupabaseServerClient();
  const identity = await supabase.auth.getUser();
  const user = identity.data.user;
  if (identity.error || !user?.email_confirmed_at)
    throw new AppError(ERROR_CODES.AUTH_SESSION_EXPIRED);
  const rows = await withActorContext(user.id, requestId, (tx) =>
    tx
      .select({
        id: tenantMembers.id,
        tenantId: tenantMembers.tenantId,
        status: tenantMembers.status,
        label: userProfiles.fullName,
      })
      .from(tenantMembers)
      .leftJoin(userProfiles, eq(userProfiles.id, tenantMembers.userId))
      .where(
        and(
          eq(tenantMembers.userId, user.id),
          eq(tenantMembers.role, 'owner'),
          inArray(tenantMembers.status, ['invited', 'active']),
          isNull(tenantMembers.deletedAt),
        ),
      )
      .limit(2),
  );
  if (rows.length !== 1) throw new AppError(ERROR_CODES.AUTH_NO_MEMBERSHIP);
  const owner = rows[0]!;
  const ctx = createResolvedContext({
    tenantId: owner.tenantId,
    role: 'owner',
    actorId: user.id,
    actorLabel: owner.label || 'Workspace owner',
    actorType: 'user',
    supportMode: false,
    requestId,
    ipAddress,
  });
  return withTenantContext(ctx, async (tx) => {
    const [workspace] = await tx
      .select({ status: tenants.status })
      .from(tenants)
      .where(and(eq(tenants.id, owner.tenantId), isNull(tenants.deletedAt)));
    if (!workspace || ['closed', 'suspended'].includes(workspace.status))
      throw new AppError(ERROR_CODES.AUTH_NO_MEMBERSHIP);
    const [member] = await tx
      .select()
      .from(tenantMembers)
      .where(
        and(
          eq(tenantMembers.id, owner.id),
          eq(tenantMembers.userId, user.id),
          isNull(tenantMembers.deletedAt),
        ),
      )
      .for('update');
    if (!member || member.role !== 'owner' || !['invited', 'active'].includes(member.status))
      throw new AppError(ERROR_CODES.AUTH_NO_MEMBERSHIP);
    if (member.status === 'invited') {
      await tx
        .update(tenantMembers)
        .set({ status: 'active', joinedAt: new Date(), updatedAt: new Date() })
        .where(eq(tenantMembers.id, member.id));
      await writeAudit(tx, ctx, {
        action: AUDIT_ACTIONS.MEMBER_JOINED,
        entityType: 'tenant_member',
        entityId: member.id,
        before: { status: 'invited', role: 'owner' },
        after: { status: 'active', role: 'owner' },
      });
    }
    return { userId: user.id, tenantId: owner.tenantId, role: 'owner' as const };
  });
}
