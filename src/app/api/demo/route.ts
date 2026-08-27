import { NextResponse, type NextRequest } from 'next/server';
import { demoAccessEnabled } from '@/lib/auth/demoAccess';

const TENANT_COOKIE = process.env.SESSION_COOKIE_TENANT ?? 'aLcassa_tenant_session';
const PLATFORM_COOKIE = process.env.SESSION_COOKIE_PLATFORM ?? 'aLcassa_platform_session';

export function GET(request: NextRequest) {
  /**
   * ⚠ THIS ROUTE HANDS OUT A SESSION COOKIE WITHOUT AUTHENTICATING ANYONE.
   *
   * See `lib/auth/demoAccess.ts`. It answers 404 rather than 403 where it is
   * not enabled, because a 403 confirms the bypass exists and is merely
   * switched off, which is an invitation to come back and look for a way in.
   */
  if (!demoAccessEnabled()) {
    return new NextResponse(null, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const target = searchParams.get('role') ?? 'platform';

  if (target === 'platform') {
    const response = NextResponse.redirect(new URL('/platform', request.url));
    response.cookies.set(PLATFORM_COOKIE, 'demo_platform_session_active', {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
    });
    return response;
  }

  // Tenant / Workspace mode
  const response = NextResponse.redirect(new URL('/app', request.url));
  response.cookies.set(TENANT_COOKIE, 'demo_tenant_session_active', {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24,
  });
  return response;
}
