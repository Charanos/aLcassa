/**
 * /api/console/prefs
 *
 * Lightweight preference persistence for the platform console chrome.
 * Called via plain fetch() from the client shell — NOT a Server Action.
 *
 * Why a Route Handler and not a Server Action?
 * Every Server Action call triggers a Next.js RSC tree re-render after it
 * resolves, regardless of whether startTransition wraps it. For purely
 * preference writes (nav state, density) that have no security implications,
 * an API route is strictly better: it sets the cookie and returns 204 with
 * no React involvement whatsoever, eliminating the post-animation shell
 * refresh ("twinge") that Server Actions cause by design.
 */

import { type NextRequest, NextResponse } from 'next/server';
import { CONSOLE_NAV_COOKIE, CONSOLE_DENSITY_COOKIE } from '@/lib/console/session';

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 60 * 60 * 24 * 365, // 1 year
};

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const res = new NextResponse(null, { status: 204 });

  if (body.nav === 'collapsed' || body.nav === 'expanded') {
    res.cookies.set(CONSOLE_NAV_COOKIE, body.nav, COOKIE_OPTS);
  }
  if (body.density === 'comfortable' || body.density === 'dense') {
    res.cookies.set(CONSOLE_DENSITY_COOKIE, body.density, COOKIE_OPTS);
  }

  return res;
}
