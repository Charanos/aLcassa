'use server';

import { revalidatePath } from 'next/cache';
import { resolveSupportContext } from '@/lib/auth/resolve';
import { resolveSupportSessionId } from '@/lib/console/session';
import { isAppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { resendInvitation, revokeInvitation } from '@/modules/membership';

/**
 * Writes made from inside a customer's workspace. Doc 24 · Stage 3 · D4.
 *
 * ⚠ THE SAME SERVICES THE CUSTOMER'S OWN STAFF CALL, UNDER THE SAME POLICIES.
 * The context is the support door's: tenant and role read from a live support
 * session this operator owns, re-checked here on every call. The membership
 * service writes its audit row through `writeAudit`, which stamps
 * `support_mode = true` from the context — so each of these lands in the
 * customer's log as a support action without this file saying so.
 *
 * ⚠ ONLY WHAT D4 APPROVED, AND ONLY WHAT EXISTS. Invitations can be resent or
 * revoked. D4 also named correcting a tenant AI rule and re-indexing a
 * knowledge-base document; neither is built in the workspace itself yet (the
 * customer's own "publish rules" refuses, and there is no knowledge-base
 * module), so there is nothing here to call. The inside view says so.
 */

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
