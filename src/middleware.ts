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

/**
 * 04 §7. Strict CSP with nonces.
 *
 * ⚠ TWO THINGS HERE ARE EASY TO GET WRONG AND BOTH WERE, INITIALLY.
 *
 * 1. THE NONCE MUST BE ON THE REQUEST HEADERS, NOT ONLY THE RESPONSE.
 *    Next.js generates its own script tags, and it discovers the nonce to stamp
 *    on them by reading the `Content-Security-Policy` header off the REQUEST.
 *    Setting the policy only on the response produces a page whose CSP demands
 *    a nonce and whose scripts have none, so under `strict-dynamic` the browser
 *    blocks every bundle. The page renders, the markup is right, and nothing is
 *    interactive: no hydration, no theme toggle, no palette, and any content
 *    revealed by script stays invisible forever.
 *
 * 2. DEVELOPMENT NEEDS `unsafe-eval`.
 *    The dev bundler evaluates modules as strings for hot reloading. Production
 *    does not, so the exemption is scoped to development rather than shipped.
 *
 * Both failures look identical from the server: 200, correct HTML, dead page.
 * Only the browser console names them.
 */
const isDev = process.env.NODE_ENV === 'development';

const CSP_DIRECTIVES = (nonce: string) =>
  [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    // Tailwind emits a stylesheet, and the design system sets token values
    // through inline `style` attributes on server-rendered elements.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src 'self'${isDev ? ' ws: wss:' : ''}`,
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    ...(isDev ? [] : ['upgrade-insecure-requests']),
  ].join('; ');

/** 02 §3. Two doors, two cookie names, no navigational path between them. */
const TENANT_COOKIE = process.env.SESSION_COOKIE_TENANT ?? 'aLcassa_tenant_session';
const PLATFORM_COOKIE = process.env.SESSION_COOKIE_PLATFORM ?? 'aLcassa_platform_session';

export function middleware(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;

  const nonce = crypto.randomUUID().replace(/-/g, '');
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();

  const csp = CSP_DIRECTIVES(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('x-request-id', requestId);
  requestHeaders.set('x-pathname', pathname);
  // This line is what lets Next stamp the nonce onto its own script tags.
  // Without it the policy blocks the bundles it is supposed to permit.
  requestHeaders.set('content-security-policy', csp);

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

  response.headers.set('Content-Security-Policy', csp);
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
