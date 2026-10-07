'use server';

import { revalidatePath } from 'next/cache';
import { currentPlatformSession } from '@/lib/auth/resolve';
import { isAppError } from '@/lib/errors';
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

/**
 * 08 §9. THE CONSOLE'S SUBSCRIPTION CONTROLS.
 *
 * ⚠ A SEPARATE FILE FROM `actions.ts`, AND NOT FOR TIDINESS.
 *
 * Every action here reaches an operation that bypasses Row Level Security.
 * `actions.ts` is a mix of interface preferences and honest refusals, and a
 * reviewer scanning it for "what can actually write across tenants" should
 * not have to read past `setDensity` to find out. One file, one privilege
 * level, so the answer to "what in the console can act on another tenant's
 * record" is a directory listing.
 *
 * ⚠ EVERY ONE OF THEM RESOLVES THE PLATFORM SESSION ITSELF.
 *
 * A Server Action is a public endpoint with a generated name — it is not
 * protected by the page that imports it, and anybody who can reach the
 * application can post to it. So the actor is resolved here, from the
 * platform cookie, on every call. `currentPlatformSession` throws unless the
 * caller holds a live platform session AND a `platform_admins` row, which is
 * the same check the console pages make.
 */

type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? { data?: never } : { data: T }))
  | { ok: false; error: string };

/**
 * Turns an AppError into a sentence and anything else into a shrug.
 *
 * Same discipline as the tenant actions: a rejection here is shown to a
 * person, so an unrecognised failure must not put a constraint name in front
 * of them. What differs is the audience — this one is Brian, so the generic
 * message says to check the platform log rather than to get in touch.
 */
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

/**
 * 08 §9 · design sheet 05. What a plan change would do, before it is made.
 *
 * ⚠ THIS IS A READ, AND IT IS STILL AUDITED.
 *
 * It reads one tenant's usage from outside any tenant context, which is a
 * service-role call whatever its verb. An unaudited cross-tenant read is
 * exactly the thing `06 §7` exists to prevent, and "it was only a preview" is
 * not a distinction the audit log should be asked to make.
 */
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
}): Promise<ActionResult<{ planCode: string; status: SubscriptionStatus }>> {
  return attempt(async (actor) => {
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
