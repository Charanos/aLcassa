'use server';

import { revalidatePath } from 'next/cache';
import { currentPlatformSession } from '@/lib/auth/resolve';
import { AppError, ERROR_CODES, isAppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { publishMasterRules, rollbackMasterRules, type MasterRulesInput } from '@/modules/platform';

/** Master publication appends a version and moves the active pointer in the audited transaction. */

export type RulesActionResult = { ok: true; versionNumber: number } | { ok: false; error: string };

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
  expectedVersionNumber: number;
}): Promise<RulesActionResult> {
  try {
    const ctx = await currentPlatformSession();
    validateExpectedVersion(input.expectedVersionNumber);
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
  expectedVersionNumber: number;
}): Promise<RulesActionResult> {
  try {
    const ctx = await currentPlatformSession();
    validateExpectedVersion(input.expectedVersionNumber);
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

function validateExpectedVersion(version: number): void {
  if (!Number.isInteger(version) || version < 0)
    throw new AppError(ERROR_CODES.VALIDATION_FAILED, {
      message: 'Reload the page and review the current shared guidance before continuing.',
    });
}
