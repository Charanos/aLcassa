import { NextResponse, type NextRequest } from 'next/server';

/**
 * 04 §1. Vercel edge: WAF, rate limiting, then session resolve and tenant
 * resolve.
 *
 * WHAT THIS FILE DOES NOT DO, deliberately: it does not resolve the tenant
 * itself. Edge middleware cannot open a database transaction, and the tenant
 * context must be set on the same connection as the query it governs
 * (06 §3). Resolution therefore happens in the request pipeline, and this file
 * handles only what genuinely belongs at the edge: headers, the correlation ID,
 * and the coarse redirect for an unauthenticated request to a private tree.
 */

const CSP_DIRECTIVES = (nonce: string) =>
  [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'", // Tailwind emits a stylesheet; inline styles come from it only
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'", // 04 §7
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    'upgrade-insecure-requests',
  ].join('; ');

/** 02 §3. Two doors, two cookie names, no navigational path between them. */
const TENANT_COOKIE = process.env.SESSION_COOKIE_TENANT ?? 'conduit_tenant_session';
const PLATFORM_COOKIE = process.env.SESSION_COOKIE_PLATFORM ?? 'conduit_platform_session';

export function middleware(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;

  const nonce = crypto.randomUUID().replace(/-/g, '');
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('x-request-id', requestId);
  requestHeaders.set('x-pathname', pathname);

  // ─ Coarse access control. The real authorisation happens in the pipeline;
  //   this only avoids rendering a shell for a request that has no session. ─
  const isTenantTree = pathname.startsWith('/app');
  const isPlatformTree = pathname.startsWith('/platform') && pathname !== '/platform/sign-in';

  if (isTenantTree && !request.cookies.has(TENANT_COOKIE)) {
    const url = request.nextUrl.clone();
    url.pathname = '/sign-in';
    // 02 §3. `?next=` is preserved throughout, so a user who is bounced lands
    // back where they were trying to go rather than on a generic overview.
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  if (isPlatformTree && !request.cookies.has(PLATFORM_COOKIE)) {
    const url = request.nextUrl.clone();
    url.pathname = '/platform/sign-in';
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  response.headers.set('Content-Security-Policy', CSP_DIRECTIVES(nonce));
  response.headers.set('X-Request-Id', requestId);

  // 02 §10. Nothing under these trees is ever indexed.
  if (isTenantTree || pathname.startsWith('/platform') || pathname.startsWith('/invite')) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|woff2)$).*)'],
};
