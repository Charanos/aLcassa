'use server';

import { revalidatePath } from 'next/cache';
import { currentPlatformSession } from '@/lib/auth/resolve';
import { AppError, ERROR_CODES, isAppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import {
  assignPlan,
  changeSubscriptionStatus,
  grantOverride,
  previewPlanChange,
  type PlanChangePreview,
  type PlatformActor,
} from '@/modules/platform';
import type { EntitlementKey } from '@/modules/entitlements';
import type { SubscriptionStatus } from '@/modules/subscriptions';

/** Every privileged subscription action resolves a live platform session independently of the importing page. */

type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? { data?: never } : { data: T }))
  | { ok: false; error: string };

/** Return expected domain messages; log unexpected errors and show a generic refusal. */
async function attempt<T>(
  operation: (actor: PlatformActor) => Promise<T>,
): Promise<ActionResult<T>> {
  try {
    const ctx = await currentPlatformSession();
    const data = await operation({
      userId: ctx.actorId,
      label: ctx.actorLabel,
      requestId: ctx.requestId,
      ipAddress: ctx.ipAddress,
    });
    return { ok: true, data } as ActionResult<T>;
  } catch (error) {
    if (isAppError(error)) return { ok: false, error: error.message };
    logger.error('platform subscription action failed', { error });
    return {
      ok: false,
      error: 'That did not go through. The platform log has the detail.',
    };
  }
}

/** Cross-tenant allowance previews are audited reads and must precede assignment. */
export async function previewWorkspacePlanChange(input: {
  tenantId: string;
  planCode: string;
}): Promise<ActionResult<PlanChangePreview>> {
  return attempt((actor) => previewPlanChange(input, actor));
}

/**
 * 08 §9. Move a workspace onto a different plan.
 *
 * The reason is required by the service, not by this wrapper — so the API
 * route and the console cannot disagree about whether one is needed. It ends
 * up in the tenant's own audit log, which is why it is written for them.
 */
export async function assignWorkspacePlan(input: {
  tenantId: string;
  planCode: string;
  reason: string;
  contractAmount?: number | null;
  expectedPreview: string;
}): Promise<ActionResult<{ planCode: string; status: SubscriptionStatus }>> {
  return attempt(async (actor) => {
    if (!/^[a-f0-9]{64}$/.test(input.expectedPreview ?? '')) {
      throw new AppError(ERROR_CODES.VALIDATION_FAILED, {
        message: 'Choose a plan and review its allowances before confirming.',
      });
    }
    const result = await assignPlan(input, actor);
    revalidatePath('/platform/tenants');
    revalidatePath('/platform/plans');
    return result;
  });
}

/** 08 §7. Move a subscription between lifecycle states. */
export async function changeWorkspaceSubscriptionStatus(input: {
  tenantId: string;
  to: SubscriptionStatus;
  reason: string;
}): Promise<ActionResult<{ from: SubscriptionStatus; to: SubscriptionStatus }>> {
  return attempt(async (actor) => {
    const result = await changeSubscriptionStatus(input, actor);
    revalidatePath('/platform/tenants');
    revalidatePath('/platform');
    return result;
  });
}

/**
 * 05 §5 · 08 §9. Grant an entitlement override.
 *
 * `limitValue: null` means unlimited, which is a real and occasionally
 * correct grant — and it is why the expiry matters. An unlimited override
 * with no expiry is a bespoke plan that nobody decided to create.
 */
export async function grantWorkspaceOverride(input: {
  tenantId: string;
  key: EntitlementKey;
  limitValue: number | null;
  reason: string;
  /** ISO date, or null for no expiry. */
  expiresAt: string | null;
}): Promise<ActionResult<{ key: string }>> {
  return attempt(async (actor) => {
    const result = await grantOverride(
      {
        tenantId: input.tenantId,
        key: input.key,
        limitValue: input.limitValue,
        reason: input.reason,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      },
      actor,
    );
    revalidatePath('/platform/tenants');
    return result;
  });
}
