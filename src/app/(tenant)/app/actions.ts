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

/**
 * Tenant application server actions.
 *
 * ⚠ EVERY ONE OF THESE VALIDATES EVERYTHING IT CAN AND WRITES NOTHING, ON
 * PURPOSE — the exact discipline `suspendWorkspace` established on the
 * platform side (`src/app/(platform)/platform/(console)/actions.ts`), and for
 * the same reason. `src/lib/tenant/data.ts` is a read-model seam over
 * fixtures, not a live table, so there is nothing yet for any of these to
 * write to. A button with no handler behind it looks like it might have
 * worked; a handler that checks real input and refuses with the specific,
 * named reason does not. Every action below returns `{ ok: false, error }`
 * with a reason naming exactly which table or module is still pending,
 * rather than silently succeeding against nothing.
 *
 * ⚠ AS OF 27 Aug 2026 THAT IS NO LONGER TRUE OF ALL OF THEM, AND THE SPLIT
 *   IS THE POINT OF THIS NOTE.
 *
 * M2 landed the membership and session modules, so the five actions that
 * belong to the account lifecycle — invite, revoke invitation, remove member,
 * update profile, revoke session — now WRITE. They call the same services the
 * `/api/v1` routes call, through the same `withTenantContext`, under the same
 * policies, audited identically. Nothing about them is a shortcut taken
 * because they are Server Actions rather than routes.
 *
 * Company settings now use the audited settings module with version checks.
 * Credential actions and tenant rule publishing remain pending M4a/M5.
 */

type ActionResult =
  | {
      ok: true;
      /**
       * ⚠ A SUCCESS THAT STILL HAS SOMETHING TO SAY.
       *
       * Inviting someone succeeds whether or not the email left: the
       * invitation is a committed row either way. Without this field the
       * interface has two options and both are wrong — claim the email was
       * sent, or report a failure that did not happen.
       *
       * Sheet 12: an outcome the reader can act on is ochre, not oxide. This
       * is that shape — "it worked, and here is the part you need to do."
       */
      notice?: string;
    }
  | { ok: false; error: string };

/**
 * Every real action below goes through here.
 *
 * ⚠ IT TURNS AN AppError INTO A SENTENCE AND EVERYTHING ELSE INTO A SHRUG.
 *
 * A Server Action's rejection is shown to a person, so an unrecognised
 * failure must not put a stack trace or a Postgres constraint name in front
 * of them. An `AppError` carries a message written for a reader, so that one
 * is shown. Anything else is logged and reported generically: if we did not
 * anticipate it, we cannot describe it honestly.
 */
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

    /**
     * The email did not go, and the owner is now the only route to their
     * colleague — so they get the link rather than a reassurance. The
     * underlying reason is deliberately not repeated at them: "no provider
     * configured" is an operator's problem, and the person reading this can
     * act on the link either way.
     */
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

// eslint-disable-next-line @typescript-eslint/require-await -- see the file-level note above
export async function createCredential(input: {
  name: string;
  scopes: string[];
}): Promise<ActionResult> {
  if (!input.name.trim())
    return { ok: false, error: 'Name the credential so it is recognisable in the list later.' };
  if (input.scopes.length === 0) return { ok: false, error: 'Select at least one scope.' };

  return {
    ok: false,
    error: 'Credential creation is unavailable. No credential has been created.',
  };
}

// eslint-disable-next-line @typescript-eslint/require-await -- see the file-level note above
export async function revokeCredential(id: string): Promise<ActionResult> {
  if (!id) return { ok: false, error: 'Select a credential to revoke.' };
  return {
    ok: false,
    error: 'Credential revocation is unavailable. The credential has not been changed.',
  };
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

/**
 * End a support visit to this workspace. Doc 24 · D6: owners and admins.
 *
 * The frame's button called a no-op until now, so the customer's "you can end
 * it at any time" — in the email and in the frame — was a promise the
 * interface could not keep. The notice tells them it is recorded, because the
 * operator will ask why, and the log is where the answer starts.
 */
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
