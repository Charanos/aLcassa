'use server';

import { and, eq, isNull } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { tenants } from '@/db/schema';
import { currentPlatformSession } from '@/lib/auth/resolve';
import { withActorContext } from '@/lib/db';
import { isAppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { assignWorkspacePlan, previewWorkspacePlanChange } from './subscription-actions';
import type { PlanChangePreview } from '@/modules/platform';

/** Queue actions use live records even when the overview is displaying demo fixtures. */

export type QueueActionResult = { ok: true; message: string } | { ok: false; error: string };

/** Resolve the workspace slug on the server before assigning a plan. */
export async function raiseWorkspacePlanFromQueue(input: {
  slug: string;
  planCode: string;
  planName: string;
  /** What the queue observed. Ends up in the customer's own audit log. */
  observation: string;
  expectedPreview: string;
}): Promise<QueueActionResult> {
  try {
    const ctx = await currentPlatformSession();

    const [workspace] = await withActorContext(ctx.actorId, ctx.requestId, async (tx) =>
      tx
        .select({ id: tenants.id, name: tenants.name })
        .from(tenants)
        .where(and(eq(tenants.slug, input.slug), isNull(tenants.deletedAt)))
        .limit(1),
    );

    if (!workspace) {
      /* Explain fixture-only targets rather than presenting a missing record as a successful write. */
      return {
        ok: false,
        error: `No workspace is registered as “${input.slug}”. This card is designed data, so there is no record behind it to change.`,
      };
    }

    const result = await assignWorkspacePlan({
      tenantId: workspace.id,
      planCode: input.planCode,
      reason: `Raised from the platform queue. ${input.observation}`,
      expectedPreview: input.expectedPreview,
    });

    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    /* The queue is derived from the pressure this change was meant to relieve,
       so the overview has to re-read rather than keep the card it drew. */
    revalidatePath('/platform');
    revalidatePath('/platform/tenants');

    return {
      ok: true,
      message: `${workspace.name}'s plan has been updated.`,
    };
  } catch (error) {
    logger.error('queue plan change failed', { error, slug: input.slug });
    return {
      ok: false,
      error: isAppError(error)
        ? error.message
        : 'That plan change could not be applied. Nothing was written.',
    };
  }
}

/** Resolve the live queue target and review its effective allowances before confirmation. */
export async function previewQueueWorkspacePlan(input: {
  slug: string;
  planCode: string;
}): Promise<{ ok: true; data: PlanChangePreview } | { ok: false; error: string }> {
  try {
    const ctx = await currentPlatformSession();
    const [workspace] = await withActorContext(ctx.actorId, ctx.requestId, (tx) =>
      tx
        .select({ id: tenants.id })
        .from(tenants)
        .where(and(eq(tenants.slug, input.slug), isNull(tenants.deletedAt)))
        .limit(1),
    );
    if (!workspace)
      return {
        ok: false,
        error: 'This workspace is unavailable. Open the directory to review its current record.',
      };
    return previewWorkspacePlanChange({ tenantId: workspace.id, planCode: input.planCode });
  } catch (error) {
    logger.error('queue plan preview failed', { error });
    return {
      ok: false,
      error: isAppError(error) ? error.message : 'The plan could not be reviewed. Try again.',
    };
  }
}
