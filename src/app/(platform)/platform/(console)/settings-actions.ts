'use server';

import { revalidatePath } from 'next/cache';
import { currentPlatformSession } from '@/lib/auth/resolve';
import { ERROR_CODES, isAppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { updatePlatformSettings } from '@/modules/platform';

/** Save platform settings with audited field changes and an expected-version check. */

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
