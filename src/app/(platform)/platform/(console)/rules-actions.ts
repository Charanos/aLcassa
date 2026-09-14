'use server';

import { revalidatePath } from 'next/cache';
import { currentPlatformSession } from '@/lib/auth/resolve';
import { isAppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import {
  publishMasterRules,
  rollbackMasterRules,
  type MasterRulesInput,
} from '@/modules/platform';

/**
 * The master AI rules, as the console writes them. 05 §7 · 08 §4.
 *
 * ⚠ THIS SCREEN WAS READ-ONLY AND SAID IT WOULD STAY THAT WAY.
 *
 * `RuleFields` carried the sentence: *"Read-only here. Publishing a version
 * moves a pointer on an append-only table and changes what every workspace
 * inherits on its next generated reply — an audited operation with a blast
 * radius, not a form submit. It is not built yet."*
 *
 * Every clause of that is true except the last one, and the first clauses are
 * the argument FOR building it properly rather than against building it. The
 * blast radius is why the publish takes a required change note, why it is
 * audited before it is applied, and why the version is appended rather than
 * overwritten. It is not a reason for the platform owner to be unable to
 * change the rules he owns.
 *
 * ⚠ THE WRITE LIVES IN `modules/platform`, NOT HERE. Both master tables are
 * SELECT-only under RLS, so the write is a service-role operation and is
 * lint-guarded into the module that is allowed to make them. This file does
 * what every other action file here does: resolve the session, call the
 * service, turn a thrown `AppError` into a sentence, revalidate.
 */

export type RulesActionResult =
  | { ok: true; versionNumber: number }
  | { ok: false; error: string };

function refuse(error: unknown, fallback: string): RulesActionResult {
  if (isAppError(error)) return { ok: false, error: error.message };
  return { ok: false, error: fallback };
}

/** Everything that reads the master set. The tenant editor shows it too. */
function propagate() {
  revalidatePath('/platform/ai-rules');
  revalidatePath('/platform');
  revalidatePath('/app/settings/ai-rules');
}

export async function publishMasterRulesAction(input: {
  fields: MasterRulesInput;
  changeNote: string;
  lockedFields: string[];
}): Promise<RulesActionResult> {
  try {
    const ctx = await currentPlatformSession();
    const { versionNumber } = await publishMasterRules(input, {
      userId: ctx.actorId,
      label: ctx.actorLabel,
      requestId: ctx.requestId,
      ipAddress: ctx.ipAddress,
    });
    propagate();
    return { ok: true, versionNumber };
  } catch (error) {
    logger.error('master rules publish failed', { error });
    return refuse(error, 'The rules were not published. Nothing changed.');
  }
}

export async function rollbackMasterRulesAction(input: {
  versionId: string;
  reason: string;
}): Promise<RulesActionResult> {
  try {
    const ctx = await currentPlatformSession();
    const { versionNumber } = await rollbackMasterRules(input, {
      userId: ctx.actorId,
      label: ctx.actorLabel,
      requestId: ctx.requestId,
      ipAddress: ctx.ipAddress,
    });
    propagate();
    return { ok: true, versionNumber };
  } catch (error) {
    logger.error('master rules rollback failed', { error });
    return refuse(error, 'The version was not restored. Nothing changed.');
  }
}
