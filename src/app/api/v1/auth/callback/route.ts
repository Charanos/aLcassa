import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/auth/supabase/server';
import { isPlatformAdmin, membershipsFor } from '@/lib/auth/resolve';
import { cookieNameFor, createSession, sessionCookieOptions } from '@/lib/auth/session';
import { AppError, ERROR_CODES } from '@/lib/errors';
import { FLASH_COOKIE, FLASH_COOKIE_OPTIONS } from '@/lib/flash';
import { logger } from '@/lib/logger';
import { safeReturnPath } from '@/lib/auth/returnPath';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
  const log = logger.child({ requestId, route: '/api/v1/auth/callback' });

  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const next = safeReturnPath(url.searchParams.get('next'), '/app');

    if (!code) {
      log.warn('No code provided in OAuth callback');
      throw new AppError(ERROR_CODES.INTERNAL);
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data.user) {
      log.error('Failed to exchange code for session', { reason: error?.message });
      throw new AppError(ERROR_CODES.AUTH_INVALID_CREDENTIALS);
    }

    const userId = data.user.id;

    // 1. Is it a platform admin?
    const platform = await isPlatformAdmin(userId, requestId);

    if (platform) {
      const session = await createSession({ userId, kind: 'platform', requestId });
      const response = NextResponse.redirect(new URL('/platform', request.url), 303);
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

    // 3. New user from Google Auth without a workspace yet.
    if (active.length === 0) {
      log.info('OAuth user has no memberships, redirecting to finish sign-up', { userId });
      // We don't issue a custom aLcassa session yet because they don't have a workspace.
      // But they *are* authenticated with Supabase. The finish-signup route will create
      // the workspace and issue the session.
      return NextResponse.redirect(new URL('/sign-up/finish', request.url), 303);
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

    const response = NextResponse.redirect(new URL(next, request.url), 303);
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
    const url = new URL('/sign-in', request.url);
    url.searchParams.set('error', code);
    return NextResponse.redirect(url, 303);
  }
}
