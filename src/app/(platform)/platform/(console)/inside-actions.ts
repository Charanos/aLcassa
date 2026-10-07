'use server';

import { revalidatePath } from 'next/cache';
import { resolveSupportContext } from '@/lib/auth/resolve';
import { resolveSupportSessionId } from '@/lib/console/session';
import { isAppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { resendInvitation, revokeInvitation } from '@/modules/membership';

/** Resolve the operator's live support context on every write and reuse tenant services and policies. */

export type InsideResult = { ok: true; message: string } | { ok: false; error: string };

async function supportContext() {
  const sessionId = await resolveSupportSessionId();
  return sessionId ? resolveSupportContext(sessionId) : null;
}

const GONE = 'Your support visit has ended. Open a new session to continue.';

export async function resendInvitationInside(invitationId: string): Promise<InsideResult> {
  try {
    const ctx = await supportContext();
    if (!ctx) return { ok: false, error: GONE };
    const result = await resendInvitation(ctx, invitationId);
    revalidatePath('/platform/inside');
    return {
      ok: true,
      message: result.delivery.sent
        ? 'A new invitation link was emailed. The old one no longer works.'
        : 'A new link was made, but the email did not go. The customer’s owner can resend it.',
    };
  } catch (error) {
    if (isAppError(error)) return { ok: false, error: error.message };
    logger.error('support resend invitation failed', { error });
    return { ok: false, error: 'The invitation was not resent. Nothing changed.' };
  }
}

export async function revokeInvitationInside(invitationId: string): Promise<InsideResult> {
  try {
    const ctx = await supportContext();
    if (!ctx) return { ok: false, error: GONE };
    await revokeInvitation(ctx, invitationId);
    revalidatePath('/platform/inside');
    return { ok: true, message: 'Invitation revoked. Its link no longer works.' };
  } catch (error) {
    if (isAppError(error)) return { ok: false, error: error.message };
    logger.error('support revoke invitation failed', { error });
    return { ok: false, error: 'The invitation was not revoked. Nothing changed.' };
  }
}
