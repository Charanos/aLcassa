'use server';

import { revalidatePath } from 'next/cache';
import { currentPlatformSession } from '@/lib/auth/resolve';
import { ERROR_CODES, isAppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { updatePlatformSettings } from '@/modules/platform';

/**
 * Save the platform-wide settings. Doc 23 · S0.2.
 *
 * ⚠ THE FORM USED TO SAY "NOT YET SAVED ANYWHERE", AND IT WAS RIGHT. There
 * was no table. There is now one row, readable by operators, writable only
 * through `updatePlatformSettings`, which records the diff in the platform
 * audit log in the same transaction as the change.
 *
 * The result says which fields changed so the toast can name them, and says
 * when a save lost a race so the form can offer the reload rather than a
 * generic failure.
 */

export type SaveSettingsResult =
  | { ok: true; changed: string[]; updatedAt: string }
  | { ok: false; error: string; conflict?: boolean };

export async function savePlatformSettings(input: {
  platformName: string;
  supportEmail: string;
  expectedUpdatedAt: string;
}): Promise<SaveSettingsResult> {
  try {
    const ctx = await currentPlatformSession();
    const result = await updatePlatformSettings(input, {
      userId: ctx.actorId,
      label: ctx.actorLabel,
      requestId: ctx.requestId,
      ipAddress: ctx.ipAddress,
    });

    /* This page and the audit log are the only readers today; see the
       General tab for what does not read these yet. */
    if (result.changed.length > 0) {
      revalidatePath('/platform/settings');
      revalidatePath('/platform/audit');
    }
    return { ok: true, changed: result.changed, updatedAt: result.updatedAt.toISOString() };
  } catch (error) {
    if (isAppError(error)) {
      return {
        ok: false,
        error: error.message,
        conflict: error.code === ERROR_CODES.PLATFORM_SETTINGS_CONFLICT,
      };
    }
    logger.error('platform settings save failed', { error });
    return { ok: false, error: 'The settings were not saved. Nothing changed.' };
  }
}
