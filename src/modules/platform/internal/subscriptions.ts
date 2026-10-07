import 'server-only';
import { and, eq, isNull } from 'drizzle-orm';
import {
  auditLog,
  planEntitlements,
  plans,
  subscriptionOverrides,
  subscriptions,
  usageCounters,
} from '@/db/schema';
import { AUDIT_ACTIONS } from '@/lib/audit';
import { withActorContext } from '@/lib/db';
import { asService, type ServiceTransaction } from '@/lib/db/serviceClient';
import { AppError, ERROR_CODES } from '@/lib/errors';
import { invalidateEntitlements, type EntitlementKey } from '@/modules/entitlements';
import { canTransition, type SubscriptionStatus } from '@/modules/subscriptions';
import { requireCapability } from './capabilities';

/** Customer-visible changes share the mutation transaction and platform request reference. */
async function writeSubscriptionActivity(
  tx: ServiceTransaction,
  actor: PlatformActor,
  tenantId: string,
  action: string,
  entityType: string,
  entityId: string,
  reason: string,
  before: Record<string, unknown> | null,
  after: Record<string, unknown>,
): Promise<void> {
  await tx.insert(auditLog).values({
    tenantId,
    actorUserId: actor.userId,
    actorType: 'platform_admin',
    actorLabel: actor.label,
    supportMode: false,
    action,
    entityType,
    entityId,
    before,
    after: { ...after, reason },
    requestId: actor.requestId,
    ipAddress: actor.ipAddress ?? null,
  });
}

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
  input: {
    tenantId: string;
    planCode: string;
    reason: string;
    /**
     * The negotiated monthly price, whole KES. Required for Custom, whose list
     * price is 0 because it is priced per contract; ignored for every other
     * plan, which bills its list price. Doc 25 · R1.
     */
    contractAmount?: number | null;
  },
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

  /*
   * ⚠ THE MONTHLY VALUE BEFORE AND AFTER IS RECORDED, BECAUSE THE REVENUE
   *   CURVE IS RECONSTRUCTED FROM IT. Phase 1 keeps no subscription history
   *   table; the platform log is the history. Read as the operator first so the
   *   audit row — which `asService` writes before the change — can carry both
   *   values, then checked again inside the transaction so a change made in
   *   between is refused rather than recorded against the wrong "before".
   */
  const current = await readContract(actor, input.tenantId);
  const target = await withActorContext(actor.userId, actor.requestId, async (tx) => {
    const [row] = await tx
      .select({ code: plans.code, priceAmount: plans.priceAmount })
      .from(plans)
      .where(and(eq(plans.code, input.planCode), eq(plans.isActive, true)))
      .limit(1);
    return row ?? null;
  });
  const negotiated = target !== null && (target.code === 'custom' || target.priceAmount === 0);
  const contractAmount = negotiated ? validContractAmount(input.contractAmount) : null;
  const afterMonthly = target ? (contractAmount ?? target.priceAmount) : null;

  const result = await asService(
    {
      actorUserId: actor.userId,
      actorLabel: actor.label,
      action: AUDIT_ACTIONS.SUBSCRIPTION_PLAN_ASSIGNED,
      before: current ? { plan: current.planCode, monthly: current.monthly } : null,
      after: { plan: input.planCode, monthly: afterMonthly },
      targetTenantId: input.tenantId,
      entityType: 'subscription',
      reason: input.reason,
      requestId: actor.requestId,
      ipAddress: actor.ipAddress ?? null,
    },
    async (tx) => {
      // Doc 23: the capability column is enforced here, before anything is written.
      await requireCapability(tx, actor.userId, 'manage_workspaces');
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
        .select({
          id: subscriptions.id,
          status: subscriptions.status,
          planId: subscriptions.planId,
          contractAmount: subscriptions.contractAmount,
        })
        .from(subscriptions)
        .where(eq(subscriptions.tenantId, input.tenantId))
        .limit(1);

      if (!existing) {
        throw new AppError(ERROR_CODES.NOT_FOUND, {
          message: 'That workspace has no subscription record.',
          internal: { tenantId: input.tenantId },
        });
      }

      if (
        !current ||
        current.planId !== existing.planId ||
        current.contractAmount !== existing.contractAmount
      ) {
        throw new AppError(ERROR_CODES.SUBSCRIPTION_CHANGED, {
          message:
            'This subscription changed while you were deciding. Reload the workspace and check the plan before changing it.',
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

      const changed = await tx
        .update(subscriptions)
        .set({ planId: plan.id, status: nextStatus, contractAmount, updatedAt: new Date() })
        .where(
          and(
            eq(subscriptions.id, existing.id),
            eq(subscriptions.planId, existing.planId),
            eq(subscriptions.status, existing.status),
            existing.contractAmount === null
              ? isNull(subscriptions.contractAmount)
              : eq(subscriptions.contractAmount, existing.contractAmount),
          ),
        )
        .returning({ id: subscriptions.id });
      if (changed.length === 0)
        throw new AppError(ERROR_CODES.SUBSCRIPTION_CHANGED, {
          message:
            'The subscription changed before this update was saved. Reload and review it again.',
        });
      await writeSubscriptionActivity(
        tx,
        actor,
        input.tenantId,
        AUDIT_ACTIONS.SUBSCRIPTION_PLAN_ASSIGNED,
        'subscription',
        existing.id,
        input.reason,
        { plan: current.planCode, monthly: current.monthly, status: existing.status },
        { plan: plan.code, monthly: afterMonthly, status: nextStatus },
      );

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

/** The highest monthly contract the console accepts: KES 100 million. A typo guard, not policy. */
const CONTRACT_CEILING = 100_000_000;

function validContractAmount(amount: number | null | undefined): number {
  if (
    amount === null ||
    amount === undefined ||
    !Number.isInteger(amount) ||
    amount < 1 ||
    amount > CONTRACT_CEILING
  ) {
    throw new AppError(ERROR_CODES.VALIDATION_FAILED, {
      message:
        'A Custom plan is priced per contract. Enter the agreed monthly price in whole shillings.',
      details: [
        {
          field: 'contractAmount',
          code: ERROR_CODES.VALIDATION_FAILED,
          message: 'Enter the monthly price, in whole KES.',
        },
      ],
    });
  }
  return amount;
}

/** One workspace's plan and contracted monthly value, read as the operator. */
async function readContract(
  actor: PlatformActor,
  tenantId: string,
): Promise<{
  planId: string;
  planCode: string | null;
  contractAmount: number | null;
  monthly: number | null;
} | null> {
  return withActorContext(actor.userId, actor.requestId, async (tx) => {
    const [row] = await tx
      .select({
        planId: subscriptions.planId,
        planCode: plans.code,
        priceAmount: plans.priceAmount,
        contractAmount: subscriptions.contractAmount,
      })
      .from(subscriptions)
      .leftJoin(plans, eq(plans.id, subscriptions.planId))
      .where(eq(subscriptions.tenantId, tenantId))
      .limit(1);
    if (!row) return null;
    const listed = row.priceAmount && row.priceAmount > 0 ? row.priceAmount : null;
    return {
      planId: row.planId,
      planCode: row.planCode,
      contractAmount: row.contractAmount,
      monthly: row.contractAmount ?? listed,
    };
  });
}

/**
 * Set a Custom workspace's negotiated monthly price. Doc 25 · R1.
 *
 * ⚠ CUSTOM ONLY. Every other plan bills its list price, and a per-workspace
 *   discount is a commercial decision this console does not model — letting
 *   the field be set anywhere would make the plan catalogue's prices advisory.
 *
 * Audited with the value before and after, because the revenue curve is
 * reconstructed from exactly those two numbers.
 */
export async function setContractAmount(
  input: { tenantId: string; amount: number; reason: string },
  actor: PlatformActor,
): Promise<{ amount: number }> {
  if (!input.reason.trim()) {
    throw new AppError(ERROR_CODES.VALIDATION_FAILED, {
      message: 'A reason is required. It appears in the tenant’s own audit log.',
      details: [
        { field: 'reason', code: ERROR_CODES.VALIDATION_FAILED, message: 'Give a reason.' },
      ],
    });
  }
  const amount = validContractAmount(input.amount);
  const current = await readContract(actor, input.tenantId);
  if (!current) {
    throw new AppError(ERROR_CODES.NOT_FOUND, {
      message: 'That workspace has no subscription record.',
    });
  }
  if (current.planCode !== 'custom') {
    throw new AppError(ERROR_CODES.VALIDATION_FAILED, {
      message: 'Only a Custom plan has a negotiated price. Every other plan bills its list price.',
    });
  }
  if (current.contractAmount === amount) return { amount };

  return asService(
    {
      actorUserId: actor.userId,
      actorLabel: actor.label,
      action: AUDIT_ACTIONS.SUBSCRIPTION_CONTRACT_SET,
      targetTenantId: input.tenantId,
      entityType: 'subscription',
      reason: input.reason,
      requestId: actor.requestId,
      ipAddress: actor.ipAddress ?? null,
      before: { plan: 'custom', monthly: current.monthly },
      after: { plan: 'custom', monthly: amount },
    },
    async (tx) => {
      await requireCapability(tx, actor.userId, 'manage_workspaces');
      /* Guarded on the value just read, so two operators pricing the same
         contract at once cannot both be recorded as changing it from the same
         "before". */
      const updated = await tx
        .update(subscriptions)
        .set({ contractAmount: amount, updatedAt: new Date() })
        .where(
          and(
            eq(subscriptions.tenantId, input.tenantId),
            eq(subscriptions.planId, current.planId),
            current.contractAmount === null
              ? isNull(subscriptions.contractAmount)
              : eq(subscriptions.contractAmount, current.contractAmount),
          ),
        )
        .returning({ id: subscriptions.id });
      if (updated.length === 0) {
        throw new AppError(ERROR_CODES.SUBSCRIPTION_CHANGED, {
          message:
            'The contract price changed while you were editing it. Reload the workspace and check it first.',
        });
      }
      await writeSubscriptionActivity(
        tx,
        actor,
        input.tenantId,
        AUDIT_ACTIONS.SUBSCRIPTION_CONTRACT_SET,
        'subscription',
        updated[0]!.id,
        input.reason,
        { plan: 'custom', monthly: current.monthly },
        { plan: 'custom', monthly: amount },
      );
      return { amount };
    },
  );
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
      // Doc 23: the capability column is enforced here, before anything is written.
      await requireCapability(tx, actor.userId, 'manage_workspaces');
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

      const changed = await tx
        .update(subscriptions)
        .set({
          status: input.to,
          // 08 §7. Cancellation is recorded when it happens; access continues
          // to `currentPeriodEnd`, which the interface shows.
          ...(input.to === 'cancelled' ? { cancelledAt: new Date() } : {}),
          /* Doc 25 · R1. The collection queue counts days and unpaid periods
             from this date. Settled back to active, it is cleared; moved on to
             expired or cancelled, it stays as the record of when it began. */
          ...(input.to === 'past_due' ? { pastDueSince: new Date() } : {}),
          ...(input.to === 'active' ? { pastDueSince: null } : {}),
          updatedAt: new Date(),
        })
        .where(and(eq(subscriptions.id, existing.id), eq(subscriptions.status, from)))
        .returning({ id: subscriptions.id });
      if (changed.length === 0)
        throw new AppError(ERROR_CODES.SUBSCRIPTION_CHANGED, {
          message:
            'The subscription status changed before this update was saved. Reload and review it again.',
        });
      await writeSubscriptionActivity(
        tx,
        actor,
        input.tenantId,
        AUDIT_ACTIONS.SUBSCRIPTION_STATUS_CHANGED,
        'subscription',
        existing.id,
        input.reason,
        { status: from },
        { status: input.to },
      );

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
      after: {
        key: input.key,
        limitValue: input.limitValue,
        expiresAt: input.expiresAt?.toISOString() ?? null,
      },
      reason: input.reason,
      requestId: actor.requestId,
      ipAddress: actor.ipAddress ?? null,
    },
    async (tx) => {
      // Doc 23: the capability column is enforced here, before anything is written.
      await requireCapability(tx, actor.userId, 'manage_workspaces');
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
      const [previous] = await tx
        .select({
          limitValue: subscriptionOverrides.limitValue,
          featureEnabled: subscriptionOverrides.featureEnabled,
          expiresAt: subscriptionOverrides.expiresAt,
        })
        .from(subscriptionOverrides)
        .where(
          and(
            eq(subscriptionOverrides.tenantId, input.tenantId),
            eq(subscriptionOverrides.key, input.key),
          ),
        )
        .limit(1);
      const granted = await tx
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
        })
        .returning({ id: subscriptionOverrides.id });
      if (!granted[0])
        throw new AppError(ERROR_CODES.INTERNAL, {
          message: 'The allowance override was not saved.',
        });
      await writeSubscriptionActivity(
        tx,
        actor,
        input.tenantId,
        AUDIT_ACTIONS.SUBSCRIPTION_OVERRIDE_GRANTED,
        'subscription_override',
        granted[0].id,
        input.reason,
        previous
          ? { key: input.key, ...previous, expiresAt: previous.expiresAt?.toISOString() ?? null }
          : null,
        {
          key: input.key,
          limitValue: input.limitValue,
          featureEnabled: input.featureEnabled ?? null,
          expiresAt: input.expiresAt?.toISOString() ?? null,
        },
      );
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
      // unaudited read of another tenant's usage is not. It is recorded AS a
      // preview: it was SUBSCRIPTION_PLAN_ASSIGNED, so every opened preview
      // wrote "plan assigned" into the ledger. See PLAN_CHANGE_PREVIEWED.
      action: AUDIT_ACTIONS.PLAN_CHANGE_PREVIEWED,
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
