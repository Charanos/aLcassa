'use server';

import { revalidatePath } from 'next/cache';
import { currentPlatformSession } from '@/lib/auth/resolve';
import { isAppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { previewPlanLimitChange, setPlanLimit, type PlanLimitImpact } from '@/modules/platform';

/** Read the affected-workspace preview before confirming a plan-limit change. */

export type PlanActionResult = { ok: true; impact: PlanLimitImpact } | { ok: false; error: string };

function refuse(error: unknown, fallback: string): PlanActionResult {
  if (isAppError(error)) return { ok: false, error: error.message };
  return { ok: false, error: fallback };
}

export async function previewPlanLimit(input: {
  entitlementId: string;
  to: number | null;
}): Promise<PlanActionResult> {
  try {
    const ctx = await currentPlatformSession();
    const impact = await previewPlanLimitChange(input, {
      userId: ctx.actorId,
      label: ctx.actorLabel,
      requestId: ctx.requestId,
      ipAddress: ctx.ipAddress,
    });
    return { ok: true, impact };
  } catch (error) {
    logger.error('plan limit preview failed', { error });
    return refuse(error, 'The impact could not be read.');
  }
}

export async function changePlanLimit(input: {
  entitlementId: string;
  to: number | null;
  reason: string;
  expectedPreview: string;
}): Promise<PlanActionResult> {
  try {
    const ctx = await currentPlatformSession();
    const impact = await setPlanLimit(input, {
      userId: ctx.actorId,
      label: ctx.actorLabel,
      requestId: ctx.requestId,
      ipAddress: ctx.ipAddress,
    });
    revalidatePath('/platform/plans');
    revalidatePath('/platform/tenants');
    revalidatePath('/platform');
    return { ok: true, impact };
  } catch (error) {
    logger.error('plan limit change failed', { error });
    return refuse(error, 'The limit was not changed. Nothing was saved.');
  }
}
