import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/auth/supabase/server';
import { cookieNameFor, createSession, sessionCookieOptions } from '@/lib/auth/session';
import { AppError, ERROR_CODES } from '@/lib/errors';
import { readRequestBody, wantsJson } from '@/lib/http/body';
import { jsonError, jsonOk } from '@/lib/http/response';
import { logger } from '@/lib/logger';
import { acceptInvitationByToken, readInvitationByToken } from '@/modules/membership';

/**
 * 07 §5 · `GET` and `POST /v1/invitations/accept/:token`. Both public.
 *
 * ⚠ PUBLIC, AND THEREFORE THE MOST CAREFULLY SCOPED ROUTE IN THE APPLICATION.
 *
 * There is no session here — the point is that the recipient may not have an
 * account yet — and therefore no tenant context, so every policy on
 * `invitations` and `tenant_members` matches nothing. Both operations below
 * go through the narrow SECURITY DEFINER functions in `02_identity.sql`,
 * keyed by the token hash. See `modules/membership/invitationAccess.ts` for
 * why that is the only correct option of the three available.
 *
 * The token never appears in a log line. It is a bearer credential for the
 * seven days it lives, so a log that records it is a log that grants access.
 */

/** The create branch's body. There is deliberately NO `email` field — the
 *  address comes from the invitation row, and accepting one from the caller
 *  would be the vulnerability. */
const signUpSchema = z.object({
  fullName: z.string().trim().min(1, 'Enter your name.').max(120),
  // 02 §9. Length over composition rules, matching the reset flow.
  password: z.string().min(12, 'Use at least 12 characters.'),
});

/** The four non-pending states, mapped onto the catalogue in one place so the
 *  preview and the acceptance refuse identically. */
function refuseIfNotPending(state: string): void {
  if (state === 'revoked') throw new AppError(ERROR_CODES.INVITATION_REVOKED);
  if (state === 'accepted') throw new AppError(ERROR_CODES.INVITATION_ALREADY_ACCEPTED);
  if (state === 'expired') throw new AppError(ERROR_CODES.INVITATION_EXPIRED);
}

/**
 * `GET` — "returns tenant name and role for the accept screen."
 *
 * It answers before any account exists, so the recipient can see WHAT they
 * are being asked to join before deciding to sign up for it. An accept screen
 * saying only "you have been invited" asks a person to act on no information.
 */
export async function GET(
  request: NextRequest,
  segment: { params: Promise<{ token: string }> },
): Promise<NextResponse> {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();

  try {
    const { token } = await segment.params;
    const invitation = await readInvitationByToken(token, requestId);

    if (!invitation) {
      throw new AppError(ERROR_CODES.NOT_FOUND, {
        message: 'This invitation link is not valid. Ask whoever invited you for a new one.',
      });
    }
    refuseIfNotPending(invitation.state);

    return jsonOk(
      {
        // Echoed so the form can prefill it and the recipient can see which
        // of their addresses was invited. Not a disclosure: they are holding
        // the token that was sent to it.
        email: invitation.invitedEmail,
        role: invitation.invitedRole,
        tenant: { name: invitation.tenantName },
        invitedBy: invitation.invitedByName,
        expiresAt: invitation.expiresAt.toISOString(),
      },
      { requestId },
    );
  } catch (error) {
    return jsonError(error, requestId);
  }
}

/**
 * `POST` — "creates or attaches the user." BOTH, and the branch is decided by
 * whether the caller already has a session.
 *
 *   Already signed in  → attach that account to the workspace.
 *   Not signed in      → create the account from the name and password on the
 *                        form, AT THE INVITED ADDRESS, then attach it.
 *
 * ⚠ WHY CREATING AN ACCOUNT ON A PUBLIC URL IS SAFE HERE, AND ONLY HERE.
 *
 * The account is created at `invitation.invitedEmail` — the address the token
 * was issued to — and never at one the caller supplies. So the worst a
 * stranger holding a stolen token can do is create the account they could
 * already have created by accepting the invitation any other way. No input
 * redirects the membership elsewhere, because the tenant and the address both
 * come from the row rather than the request.
 *
 * The alternative — bouncing the recipient to a generic sign-up and back —
 * loses the invitation across two redirects and an email confirmation, which
 * is exactly where invited users are lost in practice.
 *
 * ⚠ THE ADDRESS IS NOT REQUIRED TO MATCH ON THE SIGNED-IN BRANCH. Someone
 * invited at work@example.com who signs in with an account they already had
 * is the same person; refusing them is a support ticket with no security
 * benefit, because the token is the credential and they hold it.
 */
export async function POST(
  request: NextRequest,
  segment: { params: Promise<{ token: string }> },
): Promise<NextResponse> {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
  const log = logger.child({ requestId, route: '/api/v1/invitations/accept' });
  const asJson = wantsJson(request);

  try {
    const { token } = await segment.params;

    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();

    let userId = data.user?.id ?? null;
    let fullName = (data.user?.user_metadata?.full_name as string | undefined) ?? '';
    let email = data.user?.email ?? '';

    if (!userId) {
      // ─ The create branch. Read the invitation FIRST: the address to
      //   register at comes from the row, never from the form. ─────────────
      const invitation = await readInvitationByToken(token, requestId);
      if (!invitation) {
        throw new AppError(ERROR_CODES.NOT_FOUND, {
          message: 'This invitation link is not valid. Ask whoever invited you for a new one.',
        });
      }
      refuseIfNotPending(invitation.state);

      const body = signUpSchema.safeParse(await readRequestBody(request));
      if (!body.success) {
        throw new AppError(ERROR_CODES.VALIDATION_FAILED, {
          details: body.error.issues.map((issue) => ({
            field: issue.path.join('.') || '_',
            code: issue.code,
            message: issue.message,
          })),
        });
      }

      const created = await supabase.auth.signUp({
        email: invitation.invitedEmail,
        password: body.data.password,
        options: { data: { full_name: body.data.fullName } },
      });

      if (created.error || !created.data.user) {
        throw new AppError(ERROR_CODES.VALIDATION_FAILED, {
          message:
            created.error?.message ??
            'That account could not be created. If you already have one, sign in first and open this link again.',
        });
      }

      userId = created.data.user.id;
      fullName = body.data.fullName;
      email = invitation.invitedEmail;
    }

    const acceptingUserId = userId;

    /**
     * ⚠ ONE DATABASE FUNCTION, AND IT HAS TO BE.
     *
     * Marking the invitation used and creating the membership must succeed or
     * fail together. Apart, a failure between them burns a single-use token
     * without granting access — the person is locked out of a workspace they
     * were invited to, holding a link that now reports "already accepted".
     */
    const result = await acceptInvitationByToken(
      token,
      acceptingUserId,
      { fullName, email },
      requestId,
    );

    log.info('invitation accepted', {
      userId: acceptingUserId,
      tenantId: result.tenantId,
      role: result.role,
    });

    // Straight into the workspace. Asking someone to sign in again the
    // instant they accept reads as a failure.
    const session = await createSession({
      userId: acceptingUserId,
      kind: 'tenant',
      tenantId: result.tenantId,
      effectiveRole: result.role,
      requestId,
    });

    const response = asJson
      ? jsonOk({ tenantId: result.tenantId, role: result.role, destination: '/app' }, { requestId })
      : NextResponse.redirect(new URL('/app', request.url), 303);

    response.cookies.set(
      cookieNameFor('tenant'),
      session.id,
      sessionCookieOptions(session.expiresAt),
    );

    return response;
  } catch (error) {
    if (asJson) return jsonError(error, requestId);

    const code = error instanceof AppError ? error.code : ERROR_CODES.INTERNAL;
    log.warn('invitation acceptance failed', { code });

    /**
     * Back to the invitation screen rather than to sign-in, carrying the
     * reason. The three refusal states have designed screens there; sending
     * someone to a sign-in form instead strands them with no explanation of
     * what happened to their invitation.
     */
    const { token } = await segment.params;
    const url = new URL(`/invite/${token}`, request.url);
    url.searchParams.set('error', code);
    return NextResponse.redirect(url, 303);
  }
}
