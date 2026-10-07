import { NextResponse, type NextRequest } from 'next/server';
import { ONBOARDING_DISMISSED_COOKIE } from '@/lib/tenant/onboarding';

/** Checklist dismissal stores a reversible browser preference; security and domain mutations remain POST operations. */

export function GET(request: NextRequest): NextResponse {
  const response = NextResponse.redirect(new URL('/app', request.url), 303);

  response.cookies.set(ONBOARDING_DISMISSED_COOKIE, '1', {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    // A year. The checklist is for the first week; a reader who dismissed it
    // does not want it back next month because a session expired.
    maxAge: 60 * 60 * 24 * 365,
  });

  return response;
}
