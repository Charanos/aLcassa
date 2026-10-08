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
  resendInvitation as resendInvitationService,
  changeMemberRole as changeMemberRoleService,
} from '@/modules/membership';
import { endSupportVisit as endSupportVisitService, updateOwnProfile } from '@/modules/identity';
import { saveCompanySettings } from '@/modules/settings';
import {
  createCredential as createCredentialService,
  revokeCredential as revokeCredentialService,
} from '@/modules/credentials';
import { publishTenantRules, restoreTenantRules } from '@/modules/aiRules';
import { getLiveTenantAiRules, getLiveTeam } from '@/lib/tenant/live';
import type { TenantRulesModel, TeamModel } from '@/lib/tenant/data';
import type { ResolvedContext } from '@/lib/db/context';

/** Resolve and validate tenant context on every action; unavailable operations return an explicit refusal. */

type ActionResult =
  | {
      ok: true;
      /** A committed invitation may still require the owner to share its link when email delivery fails. */
      notice?: string;
      team?: TeamModel;
      refreshRequired?: boolean;
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

/** A failed readback cannot turn a committed team change into a failed write. */
async function mutateTeam(
  operation: (ctx: ResolvedContext) => Promise<string | void>,
): Promise<ActionResult> {
  let ctx: ResolvedContext;
  let notice: string | void;
  try {
    ctx = await currentSession();
    notice = await operation(ctx);
  } catch (error) {
    return actionFailure(error);
  }
  try {
    revalidatePath('/app/settings/team');
    revalidatePath('/app/settings/audit');
    const team = await getLiveTeam(ctx);
    if (!team) throw new Error('Committed team change has no readback');
    return { ok: true, team, ...(notice ? { notice } : {}) };
  } catch (error) {
    logger.error('team change committed; readback unavailable', {
      requestId: ctx.requestId,
      error,
    });
    return {
      ok: true,
      refreshRequired: true,
      notice: notice
        ? `${notice} The change was saved. Reload this page to confirm the latest team details.`
        : 'The change was saved. Reload this page to confirm the latest team details.',
    };
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

  return mutateTeam(async (ctx) => {
    const invitation = await inviteMember(ctx, {
      email: input.email,
      role: input.role as 'admin' | 'agent',
    });

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

export async function updateMemberRole(id: string, role: 'admin' | 'agent'): Promise<ActionResult> {
  return mutateTeam(async (ctx) => {
    await changeMemberRoleService(ctx, id, role);
  });
}

export async function resendTeamInvitation(id: string): Promise<ActionResult> {
  return mutateTeam(async (ctx) => {
    const invitation = await resendInvitationService(ctx, id);
    if (!invitation.delivery.sent)
      return `The invitation was renewed, but email delivery was unavailable. Share this private link with the intended teammate: ${appUrl()}/invite/${invitation.token}`;
  });
}

export async function revokeInvitation(id: string): Promise<ActionResult> {
  if (!id) return { ok: false, error: 'Select an invitation to revoke.' };

  return mutateTeam(async (ctx) => {
    await revokeInvitationService(ctx, id);
  });
}

export async function removeMember(id: string): Promise<ActionResult> {
  if (!id) return { ok: false, error: 'Select a member to remove.' };

  return mutateTeam(async (ctx) => {
    // The owner check and the "an admin may only remove agents" rule both
    // live in the service, next to each other, rather than being restated
    // here where they could drift from the route's copy.
    await removeMemberService(ctx, id);
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

type RulesActionResult = { ok: true; model: TenantRulesModel } | { ok: false; error: string };

async function changeInstructions(
  operation: (ctx: ResolvedContext) => Promise<unknown>,
): Promise<RulesActionResult> {
  let committed = false;
  try {
    const ctx = await currentSession();
    await operation(ctx);
    committed = true;
    revalidatePath('/app/settings/ai-rules');
    revalidatePath('/app/settings/audit');
    revalidatePath('/app/settings/subscription');
    const model = await getLiveTenantAiRules(ctx);
    if (!model || model.unavailable) throw new Error('Confirmed instruction snapshot unavailable');
    return { ok: true, model };
  } catch (error) {
    if (committed) {
      logger.error('instruction confirmation read failed', { error });
      return {
        ok: false,
        error:
          'The change was saved, but the live instructions could not be reloaded. Reload the version history before making another change.',
      };
    }
    return actionFailure(error);
  }
}

export async function publishAiRules(input: unknown): Promise<RulesActionResult> {
  return changeInstructions((ctx) => publishTenantRules(ctx, input));
}

export async function restoreAiRules(input: unknown): Promise<RulesActionResult> {
  return changeInstructions((ctx) => restoreTenantRules(ctx, input));
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
