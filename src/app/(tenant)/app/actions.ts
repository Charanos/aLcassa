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
import { updateOwnProfile } from '@/modules/identity';

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
 * The remaining four still refuse by name: company settings, both credential
 * actions and rule publishing wait on M4a and M5. The prediction above held —
 * their validation, shape and call sites did not change when the write
 * arrived, only the last line of each function did.
 */

type ActionResult = { ok: true } | { ok: false; error: string };

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
async function attempt(operation: () => Promise<void>): Promise<ActionResult> {
  try {
    await operation();
    return { ok: true };
  } catch (error) {
    if (isAppError(error)) return { ok: false, error: error.message };
    logger.error('server action failed', { error });
    return {
      ok: false,
      error: 'That did not go through. Try again, and get in touch if it keeps happening.',
    };
  }
}

// eslint-disable-next-line @typescript-eslint/require-await -- see the file-level note above
export async function updateCompany(input: {
  name: string;
  contactEmail: string;
  timezone: string;
  locale: string;
}): Promise<ActionResult> {
  if (!input.name.trim()) return { ok: false, error: 'Company name is required.' };
  if (!/.+@.+\..+/.test(input.contactEmail)) return { ok: false, error: 'Enter a valid contact email.' };

  return {
    ok: false,
    error: 'Company settings write to tenant_settings, which is not wired until the tenant mutation module lands. The request itself is valid — nothing else is blocking it.',
  };
}

export async function sendInvitation(input: { email: string; role: string }): Promise<ActionResult> {
  if (!/.+@.+\..+/.test(input.email)) return { ok: false, error: 'Enter a valid email address.' };
  // 06 §5. `owner` is absent deliberately: a workspace has exactly one, and
  // handing it over is a transfer rather than an invitation.
  if (!['admin', 'agent'].includes(input.role)) return { ok: false, error: 'Select a role.' };

  return attempt(async () => {
    const ctx = await currentSession();
    await inviteMember(ctx, { email: input.email, role: input.role as 'admin' | 'agent' });
    revalidatePath('/app/settings/team');
  });
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
export async function createCredential(input: { name: string; scopes: string[] }): Promise<ActionResult> {
  if (!input.name.trim()) return { ok: false, error: 'Name the credential so it is recognisable in the list later.' };
  if (input.scopes.length === 0) return { ok: false, error: 'Select at least one scope.' };

  return {
    ok: false,
    error: 'A credential cannot be minted without the api_credentials table — this is the one screen that should never fabricate a secret, so it refuses rather than showing one that is not real.',
  };
}

// eslint-disable-next-line @typescript-eslint/require-await -- see the file-level note above
export async function revokeCredential(id: string): Promise<ActionResult> {
  if (!id) return { ok: false, error: 'Select a credential to revoke.' };
  return { ok: false, error: 'Revoking a credential is not wired until the api_credentials table lands.' };
}

// eslint-disable-next-line @typescript-eslint/require-await -- see the file-level note above
export async function publishAiRules(input: { changeNote: string }): Promise<ActionResult> {
  if (!input.changeNote.trim()) {
    return { ok: false, error: 'A change note is required — it is what makes the version history readable six months later.' };
  }

  return {
    ok: false,
    error: 'Publishing writes an append-only version row to tenant_ai_rules, which is not wired until M4a. The change note and the edited fields are valid — nothing else is blocking it.',
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
