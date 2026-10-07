import 'server-only';
import { createHash } from 'node:crypto';
import { and, eq, inArray, isNull, or, gt } from 'drizzle-orm';
import {
  auditLog,
  planEntitlements,
  plans,
  subscriptionOverrides,
  subscriptions,
  tenants,
  usageCounters,
} from '@/db/schema';
import { AUDIT_ACTIONS } from '@/lib/audit';
import { withActorContext } from '@/lib/db';
import { asService, type ServiceTransaction } from '@/lib/db/serviceClient';
import { AppError, ERROR_CODES } from '@/lib/errors';
import { invalidateEntitlements } from '@/modules/entitlements';
import type { PlatformActor } from './subscriptions';
import { requireCapability } from './capabilities';

export type PlanLimitImpact = {
  planName: string;
  entitlementName: string;
  from: number | null;
  to: number | null;
  affected: number;
  stranded: number;
  /** Finite allowances whose usage has no recorded counter. */
  unmeasured: number;
  overridden: number;
  fingerprint: string;
};

function validateLimit(to: number | null): void {
  if (to !== null && (!Number.isSafeInteger(to) || to < 0)) {
    throw new AppError(ERROR_CODES.VALIDATION_FAILED, {
      message: 'Use a whole number of zero or more, or select unlimited.',
    });
  }
}

/** Lock existing usage and override rows while calculating the reviewed impact. */
async function readImpact(
  tx: ServiceTransaction,
  input: { entitlementId: string; to: number | null },
  lock: 'share' | 'update',
) {
  const [row] = await tx
    .select()
    .from(planEntitlements)
    .where(eq(planEntitlements.id, input.entitlementId))
    .limit(1)
    .for(lock);
  if (!row)
    throw new AppError(ERROR_CODES.NOT_FOUND, { message: 'That allowance does not exist.' });
  if (row.kind !== 'limit')
    throw new AppError(ERROR_CODES.VALIDATION_FAILED, {
      message: 'This setting is a feature, not a numeric allowance.',
    });
  const [plan] = await tx
    .select({ name: plans.name, code: plans.code })
    .from(plans)
    .where(eq(plans.id, row.planId))
    .limit(1);
  if (!plan) throw new AppError(ERROR_CODES.NOT_FOUND);
  const workspaces = await tx
    .select({ tenantId: subscriptions.tenantId, version: subscriptions.version })
    .from(subscriptions)
    .innerJoin(tenants, eq(tenants.id, subscriptions.tenantId))
    .where(and(eq(subscriptions.planId, row.planId), isNull(tenants.deletedAt)))
    .orderBy(subscriptions.tenantId);
  const ids = workspaces.map((workspace) => workspace.tenantId);
  const overrides = ids.length
    ? await tx
        .select()
        .from(subscriptionOverrides)
        .where(
          and(
            inArray(subscriptionOverrides.tenantId, ids),
            eq(subscriptionOverrides.key, row.key),
            or(
              isNull(subscriptionOverrides.expiresAt),
              gt(subscriptionOverrides.expiresAt, new Date()),
            ),
          ),
        )
        .orderBy(subscriptionOverrides.tenantId)
        .for('share')
    : [];
  const usage = ids.length
    ? await tx
        .select()
        .from(usageCounters)
        .where(and(inArray(usageCounters.tenantId, ids), eq(usageCounters.key, row.key)))
        .orderBy(usageCounters.tenantId)
        .for('share')
    : [];
  const effective = workspaces.map((workspace) => {
    const override = overrides.find((entry) => entry.tenantId === workspace.tenantId);
    const counter = usage.find((entry) => entry.tenantId === workspace.tenantId);
    return {
      ...workspace,
      from: override ? override.limitValue : row.limitValue,
      to: override ? override.limitValue : input.to,
      current: counter?.currentValue ?? null,
      overridden: Boolean(override),
    };
  });
  const impact: PlanLimitImpact = {
    planName: plan.name,
    entitlementName: row.displayName,
    from: row.limitValue,
    to: input.to,
    affected: workspaces.length,
    stranded: effective.filter(
      (entry) => entry.to !== null && entry.current !== null && entry.current > entry.to,
    ).length,
    unmeasured: effective.filter((entry) => entry.to !== null && entry.current === null).length,
    overridden: overrides.length,
    fingerprint: createHash('sha256')
      .update(JSON.stringify({ row, to: input.to, workspaces, overrides, usage, effective }))
      .digest('hex'),
  };
  return { row, plan, effective, impact };
}

/** Audited preview; no catalogue value or customer activity is changed. */
export async function previewPlanLimitChange(
  input: { entitlementId: string; to: number | null },
  actor: PlatformActor,
): Promise<PlanLimitImpact> {
  validateLimit(input.to);
  return asService(
    {
      actorUserId: actor.userId,
      actorLabel: actor.label,
      action: AUDIT_ACTIONS.PLAN_LIMIT_CHANGED,
      entityType: 'plan_entitlement',
      entityId: input.entitlementId,
      reason: 'limit change preview, no change written',
      requestId: actor.requestId,
      ipAddress: actor.ipAddress ?? null,
    },
    async (tx) => {
      await requireCapability(tx, actor.userId, 'manage_workspaces');
      return (await readImpact(tx, input, 'share')).impact;
    },
  );
}

/** Serialize catalogue writes and refuse changed previews before committing either audit trail. */
export async function setPlanLimit(
  input: { entitlementId: string; to: number | null; reason: string; expectedPreview: string },
  actor: PlatformActor,
): Promise<PlanLimitImpact> {
  validateLimit(input.to);
  const reason = input.reason.trim();
  if (reason.length < 8 || !/^[a-f0-9]{64}$/.test(input.expectedPreview ?? ''))
    throw new AppError(ERROR_CODES.VALIDATION_FAILED, {
      message: 'Review the current impact and enter a reason before confirming.',
    });
  const before = await withActorContext(actor.userId, actor.requestId, async (tx) => {
    const [row] = await tx
      .select({
        limit: planEntitlements.limitValue,
        key: planEntitlements.key,
        planId: planEntitlements.planId,
      })
      .from(planEntitlements)
      .where(eq(planEntitlements.id, input.entitlementId))
      .limit(1);
    if (!row) throw new AppError(ERROR_CODES.NOT_FOUND);
    return row;
  });
  const saved = await asService(
    {
      actorUserId: actor.userId,
      actorLabel: actor.label,
      action: AUDIT_ACTIONS.PLAN_LIMIT_CHANGED,
      entityType: 'plan_entitlement',
      entityId: input.entitlementId,
      reason,
      requestId: actor.requestId,
      ipAddress: actor.ipAddress ?? null,
      before,
      after: { ...before, limit: input.to },
    },
    async (tx) => {
      await requireCapability(tx, actor.userId, 'manage_workspaces');
      const reviewed = await readImpact(tx, input, 'update');
      if (
        reviewed.impact.fingerprint !== input.expectedPreview ||
        reviewed.row.limitValue !== before.limit
      ) {
        throw new AppError(ERROR_CODES.SUBSCRIPTION_CHANGED, {
          message:
            'The allowance or workspace usage changed. Review the current impact before confirming again.',
        });
      }
      if (reviewed.row.limitValue === input.to)
        throw new AppError(ERROR_CODES.VALIDATION_FAILED, {
          message: 'That is the current allowance.',
        });
      await tx
        .update(planEntitlements)
        .set({ limitValue: input.to, updatedAt: new Date() })
        .where(eq(planEntitlements.id, input.entitlementId));
      for (const workspace of reviewed.effective) {
        await tx.insert(auditLog).values({
          tenantId: workspace.tenantId,
          actorUserId: actor.userId,
          actorType: 'platform_admin',
          actorLabel: actor.label,
          action: AUDIT_ACTIONS.PLAN_LIMIT_CHANGED,
          entityType: 'plan_entitlement',
          entityId: input.entitlementId,
          before: {
            key: reviewed.row.key,
            plan: reviewed.plan.code,
            planLimit: reviewed.row.limitValue,
            effectiveLimit: workspace.from,
          },
          after: {
            key: reviewed.row.key,
            plan: reviewed.plan.code,
            planLimit: input.to,
            effectiveLimit: workspace.to,
            reason,
          },
          requestId: actor.requestId,
          ipAddress: actor.ipAddress ?? null,
        });
      }
      return {
        impact: reviewed.impact,
        tenantIds: reviewed.effective.map((workspace) => workspace.tenantId),
      };
    },
  );
  await Promise.all(saved.tenantIds.map((tenantId) => invalidateEntitlements(tenantId)));
  return saved.impact;
}
