import 'server-only';
import { and, count, eq, gt, isNull, sql } from 'drizzle-orm';
import { planEntitlements, plans, subscriptions, tenantMembers, tenants } from '@/db/schema';
import { AUDIT_ACTIONS } from '@/lib/audit';
import { asService } from '@/lib/db/serviceClient';
import { AppError, ERROR_CODES } from '@/lib/errors';
import type { PlatformActor } from './subscriptions';

/**
 * The plan catalogue's CEILINGS. 08 §2.
 *
 * ⚠ CHANGING A LIMIT HERE CHANGES IT FOR EVERY WORKSPACE ON THE PLAN, which is
 * the whole difference between this and `grantOverride`. The console had a
 * "Manage limits" button that was disabled with the correct explanation beside
 * it — *"Limits are a property of the plan, so changing one here would change
 * what every workspace on it is entitled to"* — and then offered no way to do
 * either thing. The explanation was right; treating it as a reason the control
 * could not exist was not. It is a reason the control must SAY SO, which is
 * what `previewPlanLimitChange` below exists to let it do.
 *
 * ⚠ SERVICE-ROLE, LIKE THE REST OF THE CATALOGUE. `03_subscriptions.sql` gives
 * `plans` and `plan_entitlements` a SELECT policy and nothing else — a
 * platform catalogue every tenant reads and none may write. The write is
 * therefore a platform record operation, audited before it is applied.
 */

export type PlanLimitImpact = {
  planName: string;
  entitlementName: string;
  /** NULL is unlimited, rendered as ∞ — see `plan_entitlements.limit_value`. */
  from: number | null;
  to: number | null;
  /** Workspaces on this plan right now. */
  affected: number;
  /**
   * Workspaces already ABOVE the proposed ceiling.
   *
   * ⚠ THE FIGURE THE OPERATOR ACTUALLY NEEDS, and the reason this preview is
   * worth a round trip. Lowering a seat limit from 25 to 10 is harmless if
   * nobody is over 10 and a support incident if four workspaces are — and
   * nothing on the plans screen could have told them which, because the
   * headroom band shows the median and the maximum rather than a count against
   * a proposed value.
   */
  stranded: number;
};

/** Which usage column answers for an entitlement key. */
const USAGE: Record<string, 'seats' | null> = {
  seats: 'seats',
  staff_seats: 'seats',
};

/**
 * What changing this ceiling would do, computed before it is applied.
 *
 * Returns the same shape the write returns, so the dialog states one set of
 * numbers and the confirmation acts on the same ones.
 */
export async function previewPlanLimitChange(
  input: { entitlementId: string; to: number | null },
  actor: PlatformActor,
): Promise<PlanLimitImpact> {
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
      const [row] = await tx
        .select({
          id: planEntitlements.id,
          key: planEntitlements.key,
          kind: planEntitlements.kind,
          limitValue: planEntitlements.limitValue,
          displayName: planEntitlements.displayName,
          planId: planEntitlements.planId,
          planName: plans.name,
        })
        .from(planEntitlements)
        .innerJoin(plans, eq(plans.id, planEntitlements.planId))
        .where(eq(planEntitlements.id, input.entitlementId))
        .limit(1);

      if (!row) {
        throw new AppError(ERROR_CODES.NOT_FOUND, { message: 'That entitlement does not exist.' });
      }
      if (row.kind !== 'limit') {
        /* A feature flag has no ceiling to move. Refusing here rather than
           writing `limit_value` onto a `feature` row, which would produce an
           entitlement that is neither. */
        throw new AppError(ERROR_CODES.VALIDATION_FAILED, {
          message: 'That entitlement is a feature, not a limit.',
        });
      }

      const [onPlan] = await tx
        .select({ n: count() })
        .from(subscriptions)
        .innerJoin(tenants, eq(tenants.id, subscriptions.tenantId))
        .where(and(eq(subscriptions.planId, row.planId), isNull(tenants.deletedAt)));

      /**
       * ⚠ ONLY SEATS CAN BE COUNTED TODAY, AND THE PREVIEW SAYS `0` RATHER
       * THAN GUESSING. Channels and API keys have no usage counter that is
       * written yet — Phase 2 seams — so a "stranded" figure for them would be
       * an invented number on a confirmation dialog, which is the exact failure
       * the suspend dialog's live preview was built to remove.
       */
      let stranded = 0;
      if (input.to !== null && USAGE[row.key] === 'seats') {
        const [over] = await tx
          .select({ n: count() })
          .from(subscriptions)
          .innerJoin(tenants, eq(tenants.id, subscriptions.tenantId))
          .where(
            and(
              eq(subscriptions.planId, row.planId),
              isNull(tenants.deletedAt),
              gt(
                sql<number>`(
                  select count(*) from ${tenantMembers}
                  where ${tenantMembers.tenantId} = ${tenants.id}
                    and ${tenantMembers.status} = 'active'
                    and ${tenantMembers.deletedAt} is null
                )`,
                input.to,
              ),
            ),
          );
        stranded = over?.n ?? 0;
      }

      return {
        planName: row.planName,
        entitlementName: row.displayName,
        from: row.limitValue,
        to: input.to,
        affected: onPlan?.n ?? 0,
        stranded,
      };
    },
  );
}

/**
 * Move a ceiling on the plan catalogue.
 *
 * ⚠ IT DOES NOT TOUCH ANY WORKSPACE'S OWN ENTITLEMENTS. Those are resolved
 * from the plan at read time, plus any per-workspace override, so raising the
 * plan raises everybody on it and an override still wins where one exists.
 * There is nothing to backfill and nothing that can drift.
 *
 * ⚠ LOWERING A CEILING DOES NOT EVICT ANYBODY. A workspace already above the
 * new limit keeps what it has and cannot add more — which is the behaviour
 * `app.tenant_is_writable()` and the entitlement checks already implement, and
 * the only humane answer: removing four people from a workspace because a
 * price list changed is not a thing a billing screen should do.
 */
export async function setPlanLimit(
  input: { entitlementId: string; to: number | null; reason: string },
  actor: PlatformActor,
): Promise<PlanLimitImpact> {
  const reason = input.reason.trim();
  if (reason.length < 8) {
    throw new AppError(ERROR_CODES.VALIDATION_FAILED, {
      message: 'Say why. Every workspace on this plan is affected, and the log is the only record.',
    });
  }
  if (input.to !== null && (!Number.isInteger(input.to) || input.to < 1)) {
    throw new AppError(ERROR_CODES.VALIDATION_FAILED, {
      message: 'A limit is a whole number of at least 1, or unlimited.',
    });
  }

  return asService(
    {
      actorUserId: actor.userId,
      actorLabel: actor.label,
      action: AUDIT_ACTIONS.PLAN_LIMIT_CHANGED,
      entityType: 'plan_entitlement',
      entityId: input.entitlementId,
      reason,
      requestId: actor.requestId,
      ipAddress: actor.ipAddress ?? null,
    },
    async (tx) => {
      const [row] = await tx
        .select({
          id: planEntitlements.id,
          kind: planEntitlements.kind,
          limitValue: planEntitlements.limitValue,
          displayName: planEntitlements.displayName,
          planId: planEntitlements.planId,
          planName: plans.name,
        })
        .from(planEntitlements)
        .innerJoin(plans, eq(plans.id, planEntitlements.planId))
        .where(eq(planEntitlements.id, input.entitlementId))
        .limit(1);

      if (!row) {
        throw new AppError(ERROR_CODES.NOT_FOUND, { message: 'That entitlement does not exist.' });
      }
      if (row.kind !== 'limit') {
        throw new AppError(ERROR_CODES.VALIDATION_FAILED, {
          message: 'That entitlement is a feature, not a limit.',
        });
      }
      if (row.limitValue === input.to) {
        throw new AppError(ERROR_CODES.VALIDATION_FAILED, {
          message: 'That is the limit it already has.',
        });
      }

      await tx
        .update(planEntitlements)
        .set({ limitValue: input.to, updatedAt: new Date() })
        .where(eq(planEntitlements.id, row.id));

      const [onPlan] = await tx
        .select({ n: count() })
        .from(subscriptions)
        .innerJoin(tenants, eq(tenants.id, subscriptions.tenantId))
        .where(and(eq(subscriptions.planId, row.planId), isNull(tenants.deletedAt)));

      return {
        planName: row.planName,
        entitlementName: row.displayName,
        from: row.limitValue,
        to: input.to,
        affected: onPlan?.n ?? 0,
        stranded: 0,
      };
    },
  );
}
