'use server';

import { revalidatePath } from 'next/cache';
import { currentSession } from '@/lib/auth/resolve';
import { revokeSession as revokeSessionService } from '@/lib/auth/session';
import { isAppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import {
  inviteMember,
  removeMember as removeMemberService,
  revokeInvitation as revokeInvitationService,
} from '@/modules/membership';
import { endSupportVisit as endSupportVisitService, updateOwnProfile } from '@/modules/identity';
import { saveCompanySettings } from '@/modules/settings';
import {
  createCredential as createCredentialService,
  revokeCredential as revokeCredentialService,
} from '@/modules/credentials';

/** Resolve and validate tenant context on every action; unavailable operations return an explicit refusal. */

type ActionResult =
  | {
      ok: true;
      /** A committed invitation may still require the owner to share its link when email delivery fails. */
      notice?: string;
    }
  | { ok: false; error: string };

/** Expose expected AppError messages; log unexpected failures and return a generic response. */
async function attempt(operation: () => Promise<string | void>): Promise<ActionResult> {
  try {
    const notice = await operation();
    return notice ? { ok: true, notice } : { ok: true };
  } catch (error) {
    return actionFailure(error);
  }
}

function actionFailure(error: unknown): { ok: false; error: string } {
  if (isAppError(error)) return { ok: false, error: error.message };
  logger.error('server action failed', { error });
  return {
    ok: false,
    error: 'Your changes could not be saved. Try again. If the problem continues, contact support.',
  };
}

export async function updateCompany(input: {
  name: string;
  contactEmail: string;
  timezone: string;
  locale: string;
  version: number;
}): Promise<{ ok: true; version: number } | { ok: false; error: string }> {
  try {
    const ctx = await currentSession();
    const saved = await saveCompanySettings(ctx, input);
    revalidatePath('/app/settings/company');
    revalidatePath('/app/settings/audit');
    revalidatePath('/platform/inside');
    return { ok: true, version: saved.version };
  } catch (error) {
    return actionFailure(error);
  }
}

export async function sendInvitation(input: {
  email: string;
  role: string;
}): Promise<ActionResult> {
  if (!/.+@.+\..+/.test(input.email)) return { ok: false, error: 'Enter a valid email address.' };
  // 06 §5. `owner` is absent deliberately: a workspace has exactly one, and
  // handing it over is a transfer rather than an invitation.
  if (!['admin', 'agent'].includes(input.role)) return { ok: false, error: 'Select a role.' };

  return attempt(async () => {
    const ctx = await currentSession();
    const invitation = await inviteMember(ctx, {
      email: input.email,
      role: input.role as 'admin' | 'agent',
    });
    revalidatePath('/app/settings/team');

    if (invitation.delivery.sent) return;

    /** Return a shareable invitation link when mail delivery is unavailable. */
    return `The invitation is ready, but we could not email it. Send them this link yourself: ${appUrl()}/invite/${invitation.token}`;
  });
}

/** The public origin, from configuration rather than from the request — see
 *  `acceptUrlFor` in the membership service for why that distinction matters. */
function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, '') ?? 'http://localhost:3000';
}

export async function revokeInvitation(id: string): Promise<ActionResult> {
  if (!id) return { ok: false, error: 'Select an invitation to revoke.' };

  return attempt(async () => {
    const ctx = await currentSession();
    await revokeInvitationService(ctx, id);
    revalidatePath('/app/settings/team');
  });
}

export async function removeMember(id: string): Promise<ActionResult> {
  if (!id) return { ok: false, error: 'Select a member to remove.' };

  return attempt(async () => {
    const ctx = await currentSession();
    // The owner check and the "an admin may only remove agents" rule both
    // live in the service, next to each other, rather than being restated
    // here where they could drift from the route's copy.
    await removeMemberService(ctx, id);
    revalidatePath('/app/settings/team');
  });
}

export async function createCredential(input: {
  name: string;
  scopes: string[];
  requestKey: string;
  environment?: 'live' | 'test';
  rotateFromId?: string;
}): Promise<
  { ok: true; id: string; secret?: string; replayed: boolean } | { ok: false; error: string }
> {
  try {
    const result = await createCredentialService(await currentSession(), input);
    revalidatePath('/app/settings/credentials');
    revalidatePath('/app/settings/audit');
    return { ok: true, id: result.credential.id, secret: result.secret, replayed: result.replayed };
  } catch (error) {
    return actionFailure(error);
  }
}

export async function revokeCredential(id: string): Promise<ActionResult> {
  return attempt(async () => {
    await revokeCredentialService(await currentSession(), id);
    revalidatePath('/app/settings/credentials');
    revalidatePath('/app/settings/audit');
  });
}

// eslint-disable-next-line @typescript-eslint/require-await -- see the file-level note above
export async function publishAiRules(input: { changeNote: string }): Promise<ActionResult> {
  if (!input.changeNote.trim()) {
    return {
      ok: false,
      error: 'Add a change note to explain this version.',
    };
  }

  return {
    ok: false,
    error: 'Rules cannot be published yet. The current rules have not been changed.',
  };
}

export async function updateProfile(input: { name: string }): Promise<ActionResult> {
  if (!input.name.trim()) return { ok: false, error: 'Name cannot be empty.' };

  return attempt(async () => {
    const ctx = await currentSession();
    await updateOwnProfile(ctx, input.name.trim());
    revalidatePath('/app/account');
  });
}

export async function revokeSession(id: string): Promise<ActionResult> {
  if (!id) return { ok: false, error: 'Select a session to revoke.' };

  return attempt(async () => {
    const ctx = await currentSession();
    // Through the service rather than by id alone: it scopes the update to
    // this actor, so a crafted id belonging to someone else updates nothing
    // instead of ending their session.
    await revokeSessionService(id, ctx.actorId, ctx.requestId, 'revoked by the account holder');
    revalidatePath('/app/account/sessions');
  });
}

/** Owners and administrators can end a support visit; the service records the revocation. */
export async function endSupportVisit(sessionId: string): Promise<ActionResult> {
  if (!sessionId) return { ok: false, error: 'There is no support visit to end.' };

  return attempt(async () => {
    const ctx = await currentSession();
    const ended = await endSupportVisitService(ctx, sessionId);
    revalidatePath('/app', 'layout');
    return ended
      ? 'The visit is over. It is recorded in your activity log under your name.'
      : 'That visit had already ended.';
  });
}
