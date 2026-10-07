import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/auth/supabase/server';
import { cookieNameFor, createSession, sessionCookieOptions } from '@/lib/auth/session';
import { AppError, ERROR_CODES } from '@/lib/errors';
import { readRequestBody, wantsJson } from '@/lib/http/body';
import { RATE_LIMITS, enforceRateLimit } from '@/lib/http/rateLimit';
import { jsonError, jsonOk } from '@/lib/http/response';
import { logger } from '@/lib/logger';
import { acceptInvitationByToken, readInvitationByToken } from '@/modules/membership';

/** Public invitation access uses token-hash-scoped database functions; never log the bearer token. */

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

/** Show the invited workspace and role before requesting acceptance. */
export async function GET(
  request: NextRequest,
  segment: { params: Promise<{ token: string }> },
): Promise<NextResponse> {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();

  try {
    // Reading is harmless; guessing at tokens is not. Generous enough that a
    // recipient refreshing the accept screen is unaffected.
    await enforceRateLimit(request, RATE_LIMITS.invitationRead);

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

/** Attach the signed-in account or create an account at the invitation's stored email; never trust a caller-supplied address. */
export async function POST(
  request: NextRequest,
  segment: { params: Promise<{ token: string }> },
): Promise<NextResponse> {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
  const log = logger.child({ requestId, route: '/api/v1/invitations/accept' });
  const asJson = wantsJson(request);

  try {
    // The tightest of the five: this branch can CREATE AN ACCOUNT, on a public
    // URL, for anyone holding a token.
    await enforceRateLimit(request, RATE_LIMITS.invitationAccept);

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

    /** Consume the single-use invitation and create membership atomically. */
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
