/** Persist display preferences through a route handler to avoid a Server Action shell refresh. */

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
