import { authRequestOrigin } from '@/lib/auth/requestOrigin';
import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/auth/supabase/server';
import { isPlatformAdmin, membershipsFor } from '@/lib/auth/resolve';
import { cookieNameFor, createSession, sessionCookieOptions } from '@/lib/auth/session';
import { AppError, ERROR_CODES } from '@/lib/errors';
import { FLASH_COOKIE, FLASH_COOKIE_OPTIONS } from '@/lib/flash';
import { logger } from '@/lib/logger';
import { safeReturnPath } from '@/lib/auth/returnPath';
import { readInvitationByToken } from '@/modules/membership';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
  const log = logger.child({ requestId, route: '/api/v1/auth/callback' });
  const next = safeReturnPath(request.nextUrl.searchParams.get('next'), '/app');

  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');

    if (!code) {
      log.warn('No code provided in OAuth callback');
      throw new AppError(ERROR_CODES.INTERNAL);
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data.user) {
      log.error('Failed to exchange code for session', { code: error?.code ?? 'provider_failure' });
      throw new AppError(ERROR_CODES.AUTH_INVALID_CREDENTIALS);
    }

    const userId = data.user.id;
    if (!data.user.email_confirmed_at) throw new AppError(ERROR_CODES.AUTH_EMAIL_UNVERIFIED);

    // 1. Is it a platform admin?
    const platform = await isPlatformAdmin(userId, requestId);

    if (platform) {
      const session = await createSession({ userId, kind: 'platform', requestId });
      const nextPath = new URL(next, authRequestOrigin(request)).pathname;
      const destination =
        nextPath === '/platform' || nextPath.startsWith('/platform/') ? next : '/platform';
      const response = NextResponse.redirect(new URL(destination, authRequestOrigin(request)), 303);
      response.cookies.set(
        cookieNameFor('platform'),
        session.id,
        sessionCookieOptions(session.expiresAt),
      );
      response.cookies.set(FLASH_COOKIE, 'signed_in', FLASH_COOKIE_OPTIONS);
      return response;
    }

    // 2. Do they have active memberships?
    const memberships = await membershipsFor(userId, requestId);
    const active = memberships.filter((m) => m.status === 'active');

    // Review a matching colleague invitation without creating a separate workspace.
    if (active.length === 0) {
      const invitationPath = /^\/invite\/([^/?#]+)$/.exec(next);
      if (invitationPath) {
        const invitation = await readInvitationByToken(invitationPath[1]!, requestId);
        if (
          invitation?.state !== 'pending' ||
          invitation.invitedEmail.toLowerCase() !== data.user.email?.toLowerCase()
        )
          throw new AppError(ERROR_CODES.AUTH_NO_MEMBERSHIP);
        return NextResponse.redirect(new URL(next, authRequestOrigin(request)), 303);
      }
    }

    // Invited owners finish their existing account instead of creating another workspace.
    if (
      active.length === 0 &&
      memberships.some((m) => m.role === 'owner' && m.status === 'invited')
    ) {
      const flow = await createSession({
        userId,
        kind: 'recovery',
        effectiveRole: 'invite',
        requestId,
      });
      const response = NextResponse.redirect(
        new URL('/reset-password?purpose=invite', authRequestOrigin(request)),
        303,
      );
      response.cookies.set(
        cookieNameFor('recovery'),
        flow.id,
        sessionCookieOptions(flow.expiresAt),
      );
      return response;
    }

    // 3. New user from Google Auth without a workspace yet.
    if (active.length === 0) {
      if (memberships.length) throw new AppError(ERROR_CODES.AUTH_NO_MEMBERSHIP);
      log.info('OAuth user has no memberships, redirecting to finish sign-up', { userId });
      // We don't issue a custom aLcassa session yet because they don't have a workspace.
      // But they *are* authenticated with Supabase. The finish-signup route will create
      // the workspace and issue the session.
      return NextResponse.redirect(new URL('/sign-up/finish', authRequestOrigin(request)), 303);
    }

    // 4. Existing user, sign them into their first workspace.
    const tenant = active[0]!;
    const session = await createSession({
      userId,
      kind: 'tenant',
      tenantId: tenant.tenantId,
      effectiveRole: tenant.role,
      requestId,
    });

    log.info('OAuth signed in', { userId, tenantId: tenant.tenantId, role: tenant.role });

    const response = NextResponse.redirect(new URL(next, authRequestOrigin(request)), 303);
    response.cookies.set(
      cookieNameFor('tenant'),
      session.id,
      sessionCookieOptions(session.expiresAt),
    );
    response.cookies.set(FLASH_COOKIE, 'signed_in', FLASH_COOKIE_OPTIONS);

    return response;
  } catch (error) {
    const code = error instanceof AppError ? error.code : ERROR_CODES.INTERNAL;
    log.warn('OAuth callback failed', { code });
    const url = new URL('/sign-in', authRequestOrigin(request));
    url.searchParams.set('error', code);
    url.searchParams.set('next', next);
    return NextResponse.redirect(url, 303);
  }
}
