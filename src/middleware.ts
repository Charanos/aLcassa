import { NextResponse, type NextRequest } from 'next/server';
import { refreshSupabaseSession } from '@/lib/auth/supabase/middleware';

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

/**
 * This deployment's Supabase origin, for `img-src`.
 *
 * ⚠ IT PARSES RATHER THAN INTERPOLATES. `NEXT_PUBLIC_SUPABASE_URL` is a URL
 * and a CSP source is an origin: pasting the variable in whole would put any
 * trailing path or slash into the directive, and a malformed source list is
 * dropped by the browser SILENTLY — the policy stops applying and nothing says
 * so. An unparseable value yields `null` and the directive simply omits the
 * host, which fails closed: avatars stop rendering, which is visible, rather
 * than the policy weakening, which is not.
 *
 * It does not use `supabaseUrl()` from `lib/auth/supabase/env.ts` because that
 * one throws when unset, and middleware runs on every request including the
 * ones that would tell an operator their environment is misconfigured.
 */
const SUPABASE_ORIGIN = (() => {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) return null;
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
})();

const CSP_DIRECTIVES = (nonce: string) =>
  [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    // Tailwind emits a stylesheet, and the design system sets token values
    // through inline `style` attributes on server-rendered elements.
    "style-src 'self' 'unsafe-inline'",
    /**
     * ⚠ THE STORAGE ORIGIN IS DERIVED FROM THE PROJECT URL, NOT WILDCARDED.
     *
     * `Avatar.tsx` recorded the rule when it replaced the stock photograph:
     * "the CSP should be widened only to whatever bucket actually serves them."
     * `SUPABASE_ORIGIN` below is the exact scheme-and-host of this deployment's
     * Supabase project, so production, staging and a local instance each admit
     * their own storage host and nothing else. A `https://*.supabase.co` would
     * admit every Supabase project on the internet.
     *
     * `blob:` is already present and is what the picker's local preview uses,
     * so an image the operator has chosen but not yet uploaded renders without
     * a network request at all.
     */
    `img-src 'self' data: blob:${SUPABASE_ORIGIN ? ` ${SUPABASE_ORIGIN}` : ''} https://images.unsplash.com https://*.unsplash.com`,
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

export async function middleware(request: NextRequest): Promise<NextResponse> {
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
  /**
   * ⚠ THE `/platform/sign-in` CARVE-OUT IS GONE, BECAUSE THE PAGE IS.
   *
   * There were two sign-in pages rendering the same form, and the platform one
   * posted to `/api/platform/v1/auth/sign-in` — **a route that does not exist**.
   * The only sign-in handler is `/api/v1/auth/sign-in`, so submitting that page
   * 404'd. It had presumably never been submitted.
   *
   * One page is also the correct design rather than merely the working one. The
   * handler authenticates FIRST and then asks `isPlatformAdmin(userId)` to
   * decide the door, so which form somebody typed into cannot affect where they
   * land — a second page could only ever disagree with the router about that.
   *
   * ⚠ 02 §3 IS NOT WEAKENED BY THIS. "Two doors, two cookie names, no
   * navigational path between them" is about SESSIONS, and the two cookies are
   * untouched: a platform session and a tenant session remain separate rows with
   * separate names and no path from one to the other. The claim was never that
   * the login FORM had to be duplicated — and duplicating it bought a second
   * thing to keep in step, which is how one of them ended up pointing at a route
   * nobody had written.
   */
  const isPlatformTree = pathname.startsWith('/platform');

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
    /* The one sign-in page. `?next=` survives, and the handler sends a platform
       admin to `/platform` on its own once it knows who they are. */
    url.pathname = '/sign-in';
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  /*
   * Supabase session refresh.
   *
   * ⚠ IT MUTATES THIS RESPONSE RATHER THAN RETURNING ITS OWN, which is the
   * one adaptation this file forces on the published Supabase snippet. That
   * snippet builds and returns a fresh `NextResponse`; doing so here would
   * discard the CSP nonce, the correlation id and the `x-pathname` header
   * set above — and per the note at the top of this file, losing the nonce
   * produces a page that returns 200 with correct markup and no working
   * JavaScript. One response per request, and this adds cookies to it.
   *
   * It refreshes only. The redirects above stay where they are, and the
   * real authorisation still happens in the pipeline, where a transaction
   * can set tenant context on the same connection as the query (06 §3).
   */
  await refreshSupabaseSession(request, response);

  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('X-Request-Id', requestId);
  // Preserve the native form's Origin without disclosing the email-proof URL.
  if (pathname === '/auth/confirm') response.headers.set('Referrer-Policy', 'strict-origin');

  // 02 §10. Nothing under these trees is ever indexed.
  if (isTenantTree || pathname.startsWith('/platform') || pathname.startsWith('/invite')) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|woff2)$).*)'],
};
