'use server';

import { and, eq, isNull } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { tenants } from '@/db/schema';
import { currentPlatformSession } from '@/lib/auth/resolve';
import { withoutTenantContext } from '@/lib/db';
import { isAppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { assignWorkspacePlan } from './subscription-actions';

/**
 * The overview queue's one acting control. 17 §7.
 *
 * ⚠ THE ACTION IS REAL EVEN WHERE THE CARD IS NOT, AND THAT IS THE DESIGN.
 *
 * The queue renders designed data behind the review bypass and live watchlist
 * rows for a signed-in operator. It would have been easy to let the button
 * "succeed" against a fixture — a pause, a green toast, nothing written. That
 * is the failure this pass has been removing everywhere else, and it would be
 * worse here than on a settings form: an operator who believes they moved a
 * customer onto a paying plan stops chasing it.
 *
 * So the path is the same either way. The slug is resolved against `tenants`,
 * and a card with no record behind it is REFUSED with a sentence that explains
 * which kind of data they are looking at, rather than with a generic failure.
 * The interaction is complete — confirm, pending, outcome — and the outcome is
 * true.
 *
 * ⚠ THE REASON IS WRITTEN FOR THE CUSTOMER, NOT FOR US. `assignPlan` requires
 * one and it lands in THEIR audit log, so it names the queue as the origin and
 * says what was observed. "Raised from the platform queue: at 94% of the event
 * limit with 19 days left in the period" is a sentence a customer can read; a
 * ticket reference is not.
 */

export type QueueActionResult = { ok: true; message: string } | { ok: false; error: string };

/**
 * Move a workspace onto a named plan, from the queue.
 *
 * ⚠ IT TAKES THE SLUG AND RESOLVES THE ID ITSELF. The card carries a slug
 * because that is what the URL and the operator both use; the subscription
 * service takes an id because that is what the row is keyed by. Doing the
 * lookup here means the client never holds a tenant id it could send back
 * altered, and a queue item for a deleted workspace refuses rather than
 * resolving to whatever now occupies that id.
 */
export async function raiseWorkspacePlanFromQueue(input: {
  slug: string;
  planCode: string;
  planName: string;
  /** What the queue observed. Ends up in the customer's own audit log. */
  observation: string;
}): Promise<QueueActionResult> {
  try {
    const ctx = await currentPlatformSession();

    const [workspace] = await withoutTenantContext(ctx.requestId, async (tx) =>
      tx
        .select({ id: tenants.id, name: tenants.name })
        .from(tenants)
        .where(and(eq(tenants.slug, input.slug), isNull(tenants.deletedAt)))
        .limit(1),
    );

    if (!workspace) {
      /*
        ⚠ THIS IS THE REVIEW BYPASS TALKING, AND IT SAYS SO.

        A bare "not found" here would read as a bug. Naming the cause — the
        queue is showing designed rows — turns a dead end into the one sentence
        that explains the whole screen to whoever is looking at it.
      */
      return {
        ok: false,
        error: `No workspace is registered as “${input.slug}”. This card is designed data, so there is no record behind it to change.`,
      };
    }

    const result = await assignWorkspacePlan({
      tenantId: workspace.id,
      planCode: input.planCode,
      reason: `Raised from the platform queue. ${input.observation}`,
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
      message: `${workspace.name} is now on ${input.planName}.`,
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
