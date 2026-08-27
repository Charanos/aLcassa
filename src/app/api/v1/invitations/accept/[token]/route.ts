import { NextResponse, type NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { createHash } from 'node:crypto';
import { invitations, tenants } from '@/db/schema';
import { createSupabaseServerClient } from '@/lib/auth/supabase/server';
import { cookieNameFor, createSession, sessionCookieOptions } from '@/lib/auth/session';
import { withActorContext, withoutTenantContext } from '@/lib/db';
import { AppError, ERROR_CODES } from '@/lib/errors';
import { jsonError, jsonOk } from '@/lib/http/response';
import { logger } from '@/lib/logger';
import { acceptInvitation } from '@/modules/membership';

/**
 * 07 §5 · `GET` and `POST /v1/invitations/accept/:token`. Both public.
 *
 * ⚠ PUBLIC, AND THEREFORE THE MOST CAREFULLY SCOPED ROUTE IN THE APPLICATION.
 *
 * There is no session here — the whole point is that the recipient may not
 * have an account yet — so `withoutTenantContext` is used, which sets an
 * EMPTY tenant rather than none at all. Every tenant-scoped policy then
 * compares against a null tenant and matches nothing. The invitation row is
 * reachable only because its own policy admits a lookup by token hash, and
 * the tenant it names is read FROM THAT ROW.
 *
 * The token never appears in a log line. It is a bearer credential for the
 * seven days it lives, so a log that records it is a log that grants access.
 */

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * `GET` — "returns tenant name and role for the accept screen."
 *
 * It answers before any account exists, so the recipient can see WHAT they
 * are being asked to join before deciding to sign up for it. An accept screen
 * that says only "you have been invited" asks a person to take an action on
 * no information.
 */
export async function GET(
  request: NextRequest,
  segment: { params: Promise<{ token: string }> },
): Promise<NextResponse> {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();

  try {
    const { token } = await segment.params;

    const preview = await withoutTenantContext(requestId, async (tx) => {
      const [row] = await tx
        .select({
          email: invitations.email,
          role: invitations.role,
          expiresAt: invitations.expiresAt,
          acceptedAt: invitations.acceptedAt,
          revokedAt: invitations.revokedAt,
          tenantName: tenants.name,
          tenantSlug: tenants.slug,
        })
        .from(invitations)
        .innerJoin(tenants, eq(tenants.id, invitations.tenantId))
        .where(eq(invitations.tokenHash, hashToken(token)))
        .limit(1);
      return row ?? null;
    });

    if (!preview) {
      throw new AppError(ERROR_CODES.NOT_FOUND, {
        message: 'This invitation link is not valid. Ask whoever invited you for a new one.',
      });
    }
    if (preview.revokedAt) throw new AppError(ERROR_CODES.INVITATION_REVOKED);
    if (preview.acceptedAt) throw new AppError(ERROR_CODES.INVITATION_ALREADY_ACCEPTED);
    if (preview.expiresAt.getTime() <= Date.now()) {
      throw new AppError(ERROR_CODES.INVITATION_EXPIRED);
    }

    return jsonOk(
      {
        // The address is echoed so the sign-up form can prefill it and the
        // recipient can see which of their addresses was invited. It is not
        // a disclosure: they are holding the token that was sent to it.
        email: preview.email,
        role: preview.role,
        tenant: { name: preview.tenantName, slug: preview.tenantSlug },
        expiresAt: preview.expiresAt.toISOString(),
      },
      { requestId },
    );
  } catch (error) {
    return jsonError(error, requestId);
  }
}

/**
 * `POST` — "creates or attaches the user."
 *
 * ⚠ THE CALLER MUST ALREADY BE AUTHENTICATED, AND THAT IS A DELIBERATE
 *   NARROWING OF WHAT 07 §5 ALLOWS.
 *
 * "Creates or attaches" could mean this route accepts a password and creates
 * the account itself. It does not, because that would make it a second
 * account-creation path with its own password handling, sitting on a public
 * URL, reachable by anyone holding a token. Instead the accept screen sends
 * the recipient through the ordinary sign-up or sign-in flow first — which is
 * Supabase's, with its own rate limiting and verification — and then posts
 * here. So by this line the caller has proved who they are, and the only
 * thing left to do is attach them.
 *
 * The address is NOT required to match the invited one. A person invited at
 * work@example.com who signs in with an existing account is the same person,
 * and refusing them would be a support ticket with no security benefit: the
 * token is the credential, and they have it.
 */
export async function POST(
  request: NextRequest,
  segment: { params: Promise<{ token: string }> },
): Promise<NextResponse> {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
  const log = logger.child({ requestId, route: '/api/v1/invitations/accept' });
  const wantsJson = (request.headers.get('content-type') ?? '').includes('application/json');

  try {
    const { token } = await segment.params;

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      throw new AppError(ERROR_CODES.AUTH_SESSION_EXPIRED, {
        message: 'Sign in or create an account first, then open the invitation link again.',
      });
    }
    const userId = data.user.id;

    /**
     * ⚠ ONE TRANSACTION, AND IT HAS TO BE.
     *
     * Marking the invitation used and creating the membership must succeed or
     * fail together. Separately, a failure between them burns the token
     * without granting access — and the token is single-use, so there is no
     * second attempt. The person is locked out of a workspace they were
     * invited to, holding a link that now reports "already accepted".
     */
    const result = await withActorContext(userId, requestId, (tx) =>
      acceptInvitation(token, userId, requestId, tx),
    );

    // 05 §9. The membership write is audited from inside the tenant once it
    // exists; the join itself is recorded here against the tenant it created.
    log.info('invitation accepted', { userId, tenantId: result.tenantId, role: result.role });

    // Straight into the workspace. Making someone sign in again immediately
    // after accepting is a needless step that reads as a failure.
    const session = await createSession({
      userId,
      kind: 'tenant',
      tenantId: result.tenantId,
      effectiveRole: result.role,
      requestId,
    });

    const response = wantsJson
      ? jsonOk({ tenantId: result.tenantId, role: result.role, destination: '/app' }, { requestId })
      : NextResponse.redirect(new URL('/app', request.url), 303);

    response.cookies.set(
      cookieNameFor('tenant'),
      session.id,
      sessionCookieOptions(session.expiresAt),
    );

    return response;
  } catch (error) {
    if (wantsJson) return jsonError(error, requestId);
    const code = error instanceof AppError ? error.code : ERROR_CODES.INTERNAL;
    const url = new URL(request.url);
    url.pathname = '/sign-in';
    url.search = `?error=${code}`;
    return NextResponse.redirect(url, 303);
  }
}
