import 'server-only';
import { and, eq } from 'drizzle-orm';
import {
  planEntitlements,
  plans,
  subscriptionOverrides,
  subscriptions,
  usageCounters,
} from '@/db/schema';
import { AUDIT_ACTIONS } from '@/lib/audit';
import { asService } from '@/lib/db/serviceClient';
import { AppError, ERROR_CODES } from '@/lib/errors';
import { invalidateEntitlements, type EntitlementKey } from '@/modules/entitlements';
import { canTransition, type SubscriptionStatus } from '@/modules/subscriptions';

/**
 * 08 §1 · 08 §7 · 08 §9. SUBSCRIPTION ADMINISTRATION.
 *
 * ⚠ EVERY FUNCTION HERE IS A PLATFORM ACTION, AND THAT IS WHY THEY USE
 *   `asService` RATHER THAN `withTenantContext`.
 *
 * `serviceClient.ts` lists four permitted service-role operations and two of
 * them are these: "assign / override plan" and "suspend / reactivate". The
 * reason is structural rather than convenient — `03_subscriptions.sql`
 * deliberately gives `subscriptions` and `subscription_overrides` NO
 * tenant-facing modify policy, because "a tenant cannot upgrade themselves:
 * there is no payment gateway behind the button". So there is no tenant
 * context under which these writes are legal, and there should not be.
 *
 * `check-policies.ts` knows: both tables are in its `PLATFORM_WRITE_ONLY`
 * set, which waives the has-a-modify-policy assertion and NOTHING else. They
 * are still verified to have RLS enabled, forced, and a select policy — a
 * tenant reads its own subscription and simply cannot write it.
 *
 * `asService` writes the platform audit row BEFORE the operation, in the same
 * transaction, so a crash mid-change still leaves a record that it was
 * attempted. 05 I-06.
 *
 * ⚠ WHY THIS FILE IS UNDER `modules/platform` AND NOT `modules/subscriptions`.
 *
 * It was written there first, and the lint rule refused it — correctly. The
 * service-role client may be imported only inside `src/modules/platform`, and
 * that exemption list has exactly one entry on purpose: a second one is how it
 * becomes three. Since every operation here IS a platform action, the file
 * belongs on this side of the boundary rather than the boundary being widened
 * to reach it.
 *
 * What stayed in `modules/subscriptions` is the part with no privilege
 * attached: the state machine, which both doors read and neither can bypass.
 */

export type PlatformActor = {
  userId: string;
  label: string;
  requestId: string;
  ipAddress?: string | null;
};

/**
 * 08 §9. Assign a plan.
 *
 * ⚠ THE CALLER SEES THE AFFECTED ENTITLEMENTS BEFORE COMMITTING, WHICH IS
 *   WHAT `previewPlanChange` IS FOR.
 *
 * Design sheet 05 asks the console to show "the affected entitlements before
 * commit" — because moving a tenant from Business to Pro takes their seats
 * from 10 to 1, and doing that to a workspace with six members is a decision
 * somebody should make deliberately rather than discover afterwards. This
 * function does not refuse that case: it is sometimes correct, and a platform
 * owner who has read the preview is entitled to proceed. What it will not do
 * is hide it.
 */
export async function assignPlan(
  input: { tenantId: string; planCode: string; reason: string },
  actor: PlatformActor,
): Promise<{ planCode: string; status: SubscriptionStatus }> {
  if (!input.reason.trim()) {
    throw new AppError(ERROR_CODES.VALIDATION_FAILED, {
      message: 'A reason is required. It appears in the tenant’s own audit log.',
      details: [
        { field: 'reason', code: ERROR_CODES.VALIDATION_FAILED, message: 'Give a reason.' },
      ],
    });
  }

  const result = await asService(
    {
      actorUserId: actor.userId,
      actorLabel: actor.label,
      action: AUDIT_ACTIONS.SUBSCRIPTION_PLAN_ASSIGNED,
      targetTenantId: input.tenantId,
      entityType: 'subscription',
      reason: input.reason,
      requestId: actor.requestId,
      ipAddress: actor.ipAddress ?? null,
    },
    async (tx) => {
      const [plan] = await tx
        .select({ id: plans.id, code: plans.code, trialDays: plans.trialDays })
        .from(plans)
        .where(and(eq(plans.code, input.planCode), eq(plans.isActive, true)))
        .limit(1);

      if (!plan) {
        throw new AppError(ERROR_CODES.NOT_FOUND, {
          message: `There is no active plan with the code "${input.planCode}".`,
        });
      }

      const [existing] = await tx
        .select({ id: subscriptions.id, status: subscriptions.status, planId: subscriptions.planId })
        .from(subscriptions)
        .where(eq(subscriptions.tenantId, input.tenantId))
        .limit(1);

      if (!existing) {
        throw new AppError(ERROR_CODES.NOT_FOUND, {
          message: 'That workspace has no subscription record.',
          internal: { tenantId: input.tenantId },
        });
      }

      /**
       * Assigning a plan to an expired subscription revives it, which is the
       * one path back from `expired` the state machine allows. Assigning to a
       * cancelled one does not: `canTransition` refuses, and the console is
       * told to start a new subscription instead.
       */
      const nextStatus: SubscriptionStatus =
        existing.status === 'expired' ? 'active' : existing.status;

      if (existing.status === 'expired') {
        const check = canTransition('expired', 'active');
        if (!check.allowed) {
          throw new AppError(ERROR_CODES.VALIDATION_FAILED, { message: check.reason });
        }
      }
      if (existing.status === 'cancelled') {
        throw new AppError(ERROR_CODES.VALIDATION_FAILED, {
          message:
            'A cancelled subscription cannot be given a new plan. Start a new subscription, which keeps the cancellation in the record.',
        });
      }

      await tx
        .update(subscriptions)
        .set({ planId: plan.id, status: nextStatus, updatedAt: new Date() })
        .where(eq(subscriptions.id, existing.id));

      return { planCode: plan.code, status: nextStatus };
    },
  );

  /**
   * ⚠ AFTER THE TRANSACTION, NOT INSIDE IT.
   *
   * The cache is not transactional. Deleting the snapshot inside a
   * transaction that then rolls back would evict a still-correct entry —
   * harmless — but deleting it before the commit lands means a concurrent
   * read can repopulate the cache from the OLD row and then the commit makes
   * that cached copy wrong, with nothing left to invalidate it. Evicting
   * after the commit is the ordering that cannot leave a stale snapshot.
   */
  await invalidateEntitlements(input.tenantId);
  return result;
}

/**
 * 08 §7. Move a subscription between lifecycle states.
 *
 * The legality of the move is `transitions.ts`; this function owns the write,
 * the audit row and the side effects each state carries.
 */
export async function changeSubscriptionStatus(
  input: { tenantId: string; to: SubscriptionStatus; reason: string },
  actor: PlatformActor,
): Promise<{ from: SubscriptionStatus; to: SubscriptionStatus }> {
  if (!input.reason.trim()) {
    throw new AppError(ERROR_CODES.VALIDATION_FAILED, {
      message: 'A reason is required. Every status change names who made it and why.',
      details: [
        { field: 'reason', code: ERROR_CODES.VALIDATION_FAILED, message: 'Give a reason.' },
      ],
    });
  }

  const result = await asService(
    {
      actorUserId: actor.userId,
      actorLabel: actor.label,
      action: AUDIT_ACTIONS.SUBSCRIPTION_STATUS_CHANGED,
      targetTenantId: input.tenantId,
      entityType: 'subscription',
      reason: input.reason,
      requestId: actor.requestId,
      ipAddress: actor.ipAddress ?? null,
    },
    async (tx) => {
      const [existing] = await tx
        .select({ id: subscriptions.id, status: subscriptions.status })
        .from(subscriptions)
        .where(eq(subscriptions.tenantId, input.tenantId))
        .limit(1);

      if (!existing) {
        throw new AppError(ERROR_CODES.NOT_FOUND, {
          message: 'That workspace has no subscription record.',
        });
      }

      const from = existing.status;
      const check = canTransition(from, input.to);
      if (!check.allowed) {
        throw new AppError(ERROR_CODES.VALIDATION_FAILED, { message: check.reason });
      }

      await tx
        .update(subscriptions)
        .set({
          status: input.to,
          // 08 §7. Cancellation is recorded when it happens; access continues
          // to `currentPeriodEnd`, which the interface shows.
          ...(input.to === 'cancelled' ? { cancelledAt: new Date() } : {}),
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.id, existing.id));

      return { from, to: input.to };
    },
  );

  await invalidateEntitlements(input.tenantId);
  return result;
}

/**
 * 05 §5 · 08 §9. Grant an override.
 *
 * ⚠ THE REASON IS MANDATORY AND IT IS NOT FOR US.
 *
 * The schema comment says it plainly: "a customer who has been granted extra
 * seats should know it and should know it may expire." The reason is rendered
 * on the tenant's own subscription screen, so it is written for them —
 * "agreed with Ian during onboarding", not "per ticket 412".
 *
 * An expiry is optional, and leaving it null is a real decision rather than a
 * default: a permanent override on a shared plan is how a bespoke plan comes
 * to exist without anybody deciding to create one.
 */
export async function grantOverride(
  input: {
    tenantId: string;
    key: EntitlementKey;
    limitValue: number | null;
    featureEnabled?: boolean | null;
    reason: string;
    expiresAt?: Date | null;
  },
  actor: PlatformActor,
): Promise<{ key: string }> {
  if (!input.reason.trim()) {
    throw new AppError(ERROR_CODES.VALIDATION_FAILED, {
      message: 'A reason is required. The tenant sees it on their own plan screen.',
      details: [
        { field: 'reason', code: ERROR_CODES.VALIDATION_FAILED, message: 'Give a reason.' },
      ],
    });
  }

  const result = await asService(
    {
      actorUserId: actor.userId,
      actorLabel: actor.label,
      action: AUDIT_ACTIONS.SUBSCRIPTION_OVERRIDE_GRANTED,
      targetTenantId: input.tenantId,
      entityType: 'subscription_override',
      entityId: input.key,
      reason: input.reason,
      requestId: actor.requestId,
      ipAddress: actor.ipAddress ?? null,
    },
    async (tx) => {
      const [subscription] = await tx
        .select({ id: subscriptions.id })
        .from(subscriptions)
        .where(eq(subscriptions.tenantId, input.tenantId))
        .limit(1);

      if (!subscription) {
        throw new AppError(ERROR_CODES.NOT_FOUND, {
          message: 'That workspace has no subscription record.',
        });
      }

      /**
       * ⚠ AN UPSERT, BECAUSE `sub_overrides_unique` PERMITS EXACTLY ONE ROW
       *   PER TENANT AND KEY.
       *
       * The obvious shape — expire the old row, insert a new one — violates
       * that index, and it should: two rows for `seats` would leave the
       * resolution order in 08 §3 choosing between them arbitrarily, which is
       * the same class of ambiguity the one-owner invariant exists to avoid.
       *
       * So re-granting REPLACES. Nothing is lost by that: the history of who
       * granted what and why lives in the platform audit log, which is
       * append-only by policy (05 §9), and a superseded override row would be
       * a second, weaker copy of a record that already exists.
       */
      await tx
        .insert(subscriptionOverrides)
        .values({
          tenantId: input.tenantId,
          key: input.key,
          limitValue: input.limitValue,
          featureEnabled: input.featureEnabled ?? null,
          reason: input.reason,
          expiresAt: input.expiresAt ?? null,
          grantedBy: actor.userId,
        })
        .onConflictDoUpdate({
          target: [subscriptionOverrides.tenantId, subscriptionOverrides.key],
          set: {
            limitValue: input.limitValue,
            featureEnabled: input.featureEnabled ?? null,
            reason: input.reason,
            expiresAt: input.expiresAt ?? null,
            grantedBy: actor.userId,
            updatedAt: new Date(),
          },
        });

      return { key: input.key };
    },
  );

  await invalidateEntitlements(input.tenantId);
  return result;
}

/**
 * 08 §9. What a plan change would do, computed before anything is written.
 *
 * ⚠ IT NAMES THE ENTITLEMENTS THAT WOULD FALL BELOW CURRENT USAGE.
 *
 * That is the whole value of the preview. "Seats: 10 → 1" is information;
 * "Seats: 10 → 1, and this workspace has 6 members" is a decision. Downgrades
 * that strand existing usage are not refused — sometimes they are correct,
 * and enforcement is at the point of the next write rather than retroactive —
 * but they are never silent.
 */
export type PlanChangePreview = {
  fromPlan: string;
  toPlan: string;
  rows: Array<{
    key: string;
    displayName: string;
    from: number | null;
    to: number | null;
    current: number;
    /** True when the new limit is below what this tenant already uses. */
    strands: boolean;
  }>;
};

export async function previewPlanChange(
  input: { tenantId: string; planCode: string },
  actor: PlatformActor,
): Promise<PlanChangePreview> {
  return asService(
    {
      actorUserId: actor.userId,
      actorLabel: actor.label,
      // A preview reads across a tenant it is not scoped to, so it is a
      // service-role call and is audited like one. Reading is cheap; an
      // unaudited read of another tenant's usage is not.
      action: AUDIT_ACTIONS.SUBSCRIPTION_PLAN_ASSIGNED,
      targetTenantId: input.tenantId,
      entityType: 'subscription',
      reason: 'preview only, no change written',
      requestId: actor.requestId,
      ipAddress: actor.ipAddress ?? null,
    },
    async (tx) => {
      const [current] = await tx
        .select({ planId: subscriptions.planId, planCode: plans.code })
        .from(subscriptions)
        .innerJoin(plans, eq(plans.id, subscriptions.planId))
        .where(eq(subscriptions.tenantId, input.tenantId))
        .limit(1);

      const [target] = await tx
        .select({ id: plans.id, code: plans.code })
        .from(plans)
        .where(eq(plans.code, input.planCode))
        .limit(1);

      if (!current || !target) {
        throw new AppError(ERROR_CODES.NOT_FOUND, {
          message: 'That workspace or plan could not be found.',
        });
      }

      const [fromRows, toRows, usage] = await Promise.all([
        tx.select().from(planEntitlements).where(eq(planEntitlements.planId, current.planId)),
        tx.select().from(planEntitlements).where(eq(planEntitlements.planId, target.id)),
        // `usage_counters` is tenant-scoped, and this reads one tenant's
        // counters from outside any tenant context — which is exactly what a
        // service-role call is for, and why this one is audited.
        tx
          .select({ key: usageCounters.key, currentValue: usageCounters.currentValue })
          .from(usageCounters)
          .where(eq(usageCounters.tenantId, input.tenantId)),
      ]);

      const usageByKey = new Map(usage.map((row) => [row.key, row.currentValue]));
      const toByKey = new Map(toRows.map((r) => [r.key, r]));

      return {
        fromPlan: current.planCode,
        toPlan: target.code,
        rows: fromRows.map((row) => {
          const next = toByKey.get(row.key);
          const to = next?.limitValue ?? null;
          const currentUse = usageByKey.get(row.key) ?? 0;
          return {
            key: row.key,
            displayName: row.displayName,
            from: row.limitValue ?? null,
            to,
            current: currentUse,
            // null is unlimited, so it can never strand anything.
            strands: to !== null && currentUse > to,
          };
        }),
      };
    },
  );
}
