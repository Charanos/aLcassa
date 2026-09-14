import { NextResponse, type NextRequest } from 'next/server';
import { ONBOARDING_DISMISSED_COOKIE } from '@/lib/tenant/onboarding';

/**
 * `GET /v1/me/onboarding/dismiss`. The setup checklist's "Hide this".
 *
 * ⚠ A GET THAT WRITES, WHICH IS NORMALLY WRONG. It is allowed here on the
 * same grounds the sign-out form is not: what it writes is a per-browser
 * display preference with no security or data consequence, and the reader is
 * one click from undoing it. Making it a POST would mean a form, a client
 * bundle on the overview, and a control that stops working without
 * JavaScript — a poor trade for a cosmetic flag. Anything that revokes,
 * deletes or spends stays a POST.
 *
 * ⚠ IT IS A COOKIE RATHER THAN A COLUMN, AND THAT IS A KNOWN LIMITATION.
 * Dismissal does not follow the reader to another browser, and it is per
 * DEVICE rather than per person. The honest alternative is a
 * `tenant_settings` column, which needs a migration — deliberately out of
 * scope for a pass that is not running them. When that column lands, this
 * handler writes it and the cookie becomes a fallback.
 *
 * Dismissal is NOT completion. `getOverview`'s `done` flags are untouched, so
 * a reader who hides the list and later finishes setting up still passes
 * through the same permanent-disappearance rule as everyone else.
 */

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
