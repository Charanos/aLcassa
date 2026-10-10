import { NextResponse, type NextRequest } from 'next/server';
import { refreshSupabaseSession } from '@/lib/auth/supabase/middleware';
import { authRequestOrigin } from '@/lib/auth/requestOrigin';

const isDev = process.env.NODE_ENV === 'development';

const SUPABASE_ORIGIN = (() => {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) return null;
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
})();

const CSP_DIRECTIVES = (nonce: string, googleForm: boolean) =>
  [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    // Tailwind emits a stylesheet, and the design system sets token values
    // through inline `style` attributes on server-rendered elements.
    "style-src 'self' 'unsafe-inline'",

    `img-src 'self' data: blob:${SUPABASE_ORIGIN ? ` ${SUPABASE_ORIGIN}` : ''} https://images.unsplash.com https://*.unsplash.com`,
    "font-src 'self' data:",
    `connect-src 'self'${isDev ? ' ws: wss:' : ''}`,
    "frame-ancestors 'none'",
    // Chrome also checks the OAuth form's redirect chain against this directive.
    `form-action 'self'${googleForm && SUPABASE_ORIGIN ? ` ${SUPABASE_ORIGIN} https://accounts.google.com` : ''}`,
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

  const csp = CSP_DIRECTIVES(nonce, pathname === '/sign-in' || pathname === '/sign-up');

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('x-request-id', requestId);
  requestHeaders.set('x-pathname', pathname);
  requestHeaders.set('x-auth-return-path', pathname + search);
  // This line is what lets Next stamp the nonce onto its own script tags.
  // Without it the policy blocks the bundles it is supposed to permit.
  requestHeaders.set('content-security-policy', csp);

  // ─ Coarse access control. The real authorisation happens in the pipeline;
  //   this only avoids rendering a shell for a request that has no session. ─
  const isTenantTree = pathname.startsWith('/app');
  /** One sign-in form resolves separate platform and tenant sessions after authentication. */
  const isPlatformTree = pathname.startsWith('/platform');

  if (isTenantTree && !request.cookies.has(TENANT_COOKIE)) {
    const url = new URL('/sign-in', authRequestOrigin(request));
    // 02 §3. `?next=` is preserved throughout, so a user who is bounced lands
    // back where they were trying to go rather than on a generic overview.
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  if (isPlatformTree && !request.cookies.has(PLATFORM_COOKIE)) {
    const url = new URL('/sign-in', authRequestOrigin(request));
    /* The one sign-in page. `?next=` survives, and the handler sends a platform
       admin to `/platform` on its own once it knows who they are. */
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  // Refresh cookies on the existing response to retain nonce and correlation headers.
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
