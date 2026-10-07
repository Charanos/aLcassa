import 'server-only';
import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { AUDIT_ACTIONS } from '@/lib/audit';
import { asService, type ServiceTransaction } from '@/lib/db/serviceClient';
import { createSupabaseAdminClient } from '@/lib/auth/supabase/admin';
import { isAppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import {
  plans,
  subscriptions,
  tenantMembers,
  tenantSettings,
  tenants,
  userProfiles,
} from '@/db/schema';
import {
  provisionTenantSchema,
  type ProvisionTenantInput,
  type ProvisionTenantResult,
} from '../types';
import { requireCapability } from './capabilities';

type ProvisionActor = {
  userId: string;
  label: string;
  requestId: string;
  ipAddress?: string | null;
};

/** Validate before sending email; recheck at commit and compensate Auth if the database rolls back. */
export async function provisionTenant(
  input: ProvisionTenantInput,
  actor: ProvisionActor,
): Promise<ProvisionTenantResult> {
  const parsed = provisionTenantSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: 'validation_failed',
      message: 'Check the highlighted workspace details.',
      details: parsed.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    };
  }
  const { name, slug, ownerEmail, ownerName, initialStatus, planCode } = parsed.data;
  const auditIdentity = {
    actorUserId: actor.userId,
    actorLabel: actor.label,
    entityType: 'tenant',
    requestId: actor.requestId,
    ipAddress: actor.ipAddress ?? null,
  };

  try {
    await asService(
      {
        ...auditIdentity,
        action: AUDIT_ACTIONS.TENANT_PROVISIONING_CHECKED,
        reason: `Checked workspace setup for ${slug}`,
      },
      (tx) => checkProvisioning(tx, actor.userId, slug, planCode),
    );
  } catch (error) {
    const refusal = validationRefusal(error);
    if (refusal) return refusal;
    if (isAppError(error)) throw error;
    logger.error('workspace provisioning validation failed', {
      requestId: actor.requestId,
      actorId: actor.userId,
    });
    return {
      ok: false,
      code: 'provisioning_failed',
      message: 'Workspace setup could not be checked. No invitation was sent. Try again.',
    };
  }

  const admin = createSupabaseAdminClient();
  let ownerUserId: string;
  try {
    const invited = await admin.auth.admin.inviteUserByEmail(ownerEmail, {
      data: { full_name: ownerName },
    });
    if (invited.error || !invited.data.user) {
      const alreadyRegistered =
        ['email_exists', 'user_already_exists'].includes(invited.error?.code ?? '') ||
        /already (?:been )?registered/i.test(invited.error?.message ?? '');
      logger.warn('workspace owner invitation was refused', {
        requestId: actor.requestId,
        actorId: actor.userId,
        code: alreadyRegistered ? 'owner_exists' : 'provisioning_failed',
      });
      return {
        ok: false,
        code: alreadyRegistered ? 'owner_exists' : 'provisioning_failed',
        message: alreadyRegistered
          ? 'This email already has an account. Choose a different owner email; adding an existing owner is not supported by this setup flow.'
          : 'The invitation service could not complete workspace setup. No workspace was created. Check the owner account before retrying.',
      };
    }
    ownerUserId = invited.data.user.id;
  } catch {
    logger.error('workspace owner invitation failed', {
      requestId: actor.requestId,
      actorId: actor.userId,
    });
    return {
      ok: false,
      code: 'provisioning_failed',
      message:
        'The invitation service did not confirm the request. No workspace was created. Check the owner account before retrying.',
    };
  }

  const workspaceId = randomUUID();
  try {
    const tenantId = await asService(
      {
        ...auditIdentity,
        action: AUDIT_ACTIONS.TENANT_PROVISIONED,
        targetTenantId: workspaceId,
        entityId: workspaceId,
        reason: `Provisioned ${slug} with owner ${ownerEmail}`,
      },
      async (tx) => {
        // The plan lock prevents deactivation until this provisioning transaction completes.
        const plan = await checkProvisioning(tx, actor.userId, slug, planCode);
        const [tenant] = await tx
          .insert(tenants)
          .values({ id: workspaceId, slug, name, status: initialStatus, provisionedAt: new Date() })
          .returning({ id: tenants.id });
        if (!tenant) throw new Error('Workspace insert returned no row.');
        await tx.insert(tenantSettings).values({ tenantId: tenant.id, displayName: name });
        await tx
          .insert(userProfiles)
          .values({ id: ownerUserId, fullName: ownerName, email: ownerEmail })
          .onConflictDoNothing();
        await tx.insert(tenantMembers).values({
          tenantId: tenant.id,
          userId: ownerUserId,
          role: 'owner',
          status: 'invited',
          invitedBy: actor.userId,
        });
        const now = new Date();
        const periodEnd = new Date(now);
        periodEnd.setMonth(periodEnd.getMonth() + 1);
        const trialEndsAt =
          initialStatus === 'trial' && plan.trialDays > 0
            ? new Date(now.getTime() + plan.trialDays * 24 * 60 * 60 * 1000)
            : null;
        await tx.insert(subscriptions).values({
          tenantId: tenant.id,
          planId: plan.id,
          status: initialStatus === 'trial' ? 'trialing' : 'active',
          currentPeriodStart: now,
          currentPeriodEnd: trialEndsAt ?? periodEnd,
          trialEndsAt,
        });
        return tenant.id;
      },
    );
    return { ok: true, tenantId, slug, ownerUserId };
  } catch (error) {
    let removed = false;
    try {
      const cleanup = await admin.auth.admin.deleteUser(ownerUserId);
      removed = !cleanup.error;
    } catch {
      // Report recovery explicitly when Auth compensation cannot be confirmed.
    }
    if (!removed) {
      logger.error('workspace provisioning requires owner-account recovery', {
        requestId: actor.requestId,
        actorId: actor.userId,
        ownerUserId,
      });
      return {
        ok: false,
        code: 'provisioning_failed',
        message:
          'No workspace was created, but the invited owner account could not be removed. Ask the platform owner to recover that account before retrying. An invitation may already have been sent.',
      };
    }
    const refusal = validationRefusal(error);
    if (refusal)
      return {
        ...refusal,
        message: `${refusal.message} The temporary owner account was removed; an invitation may already have been sent.`,
      };
    if (isAppError(error)) throw error;
    logger.error('workspace provisioning rolled back', {
      requestId: actor.requestId,
      actorId: actor.userId,
    });
    return {
      ok: false,
      code: 'provisioning_failed',
      message:
        'Workspace setup failed. No workspace was created and the temporary owner account was removed. An invitation may already have been sent.',
    };
  }
}

async function checkProvisioning(
  tx: ServiceTransaction,
  actorUserId: string,
  slug: string,
  planCode: string,
) {
  await requireCapability(tx, actorUserId, 'manage_workspaces');
  const [existing] = await tx
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.slug, slug))
    .limit(1);
  if (existing) throw new SlugTakenError();
  const [plan] = await tx
    .select({ id: plans.id, trialDays: plans.trialDays })
    .from(plans)
    .where(and(eq(plans.code, planCode), eq(plans.isActive, true)))
    .limit(1)
    .for('share');
  if (!plan) throw new UnknownPlanError();
  return plan;
}

function validationRefusal(error: unknown): Extract<ProvisionTenantResult, { ok: false }> | null {
  if (error instanceof SlugTakenError || slugConstraintViolation(error)) {
    return {
      ok: false,
      code: 'slug_taken',
      message: 'This workspace address is already in use. Choose another address.',
      details: [{ field: 'slug', message: 'Already in use.' }],
    };
  }
  if (error instanceof UnknownPlanError) {
    return {
      ok: false,
      code: 'unknown_plan',
      message:
        'The selected plan is no longer available. Reload the page and choose an active plan.',
      details: [{ field: 'planCode', message: 'Choose an active plan.' }],
    };
  }
  return null;
}

/** Translate only the workspace slug indexes, including errors wrapped by Drizzle. */
function slugConstraintViolation(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const failure = error as { code?: string; constraint_name?: string; cause?: unknown };
  return (
    (failure.code === '23505' &&
      ['tenants_slug_unique', 'tenants_slug_idx'].includes(failure.constraint_name ?? '')) ||
    (failure.cause !== undefined &&
      failure.cause !== error &&
      slugConstraintViolation(failure.cause))
  );
}

class UnknownPlanError extends Error {}
class SlugTakenError extends Error {}
