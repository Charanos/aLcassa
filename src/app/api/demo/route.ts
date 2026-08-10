import { NextResponse, type NextRequest } from 'next/server';

const TENANT_COOKIE = process.env.SESSION_COOKIE_TENANT ?? 'conduit_tenant_session';
const PLATFORM_COOKIE = process.env.SESSION_COOKIE_PLATFORM ?? 'conduit_platform_session';

export async function GET(request: NextRequest) {
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
