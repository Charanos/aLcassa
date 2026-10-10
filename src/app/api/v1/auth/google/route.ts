import { authRequestOrigin } from '@/lib/auth/requestOrigin';
import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/auth/supabase/server';
import { AppError, ERROR_CODES } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { RATE_LIMITS, enforceRateLimit } from '@/lib/http/rateLimit';
import { googleAvailability } from '@/lib/auth/providerAvailability';
import { safeReturnPath } from '@/lib/auth/returnPath';

/**
 * 07 §3 · `POST /v1/auth/google`.
 *
 * Initiates the Google OAuth flow.
 * A plain POST from the sign-in / sign-up forms.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
  const log = logger.child({ requestId, route: '/api/v1/auth/google' });
  let next = '/app';

  try {
    if (request.headers.get('origin') !== authRequestOrigin(request))
      throw new AppError(ERROR_CODES.AUTH_INVALID_CREDENTIALS);
    // Rate limit OAuth initiation requests
    await enforceRateLimit(request, RATE_LIMITS.signIn);

    const form = await request.formData();
    const submitted = form.get('next');
    next = safeReturnPath(typeof submitted === 'string' ? submitted : null, '/app');
    if ((await googleAvailability(true)) !== 'enabled') {
      throw new AppError(ERROR_CODES.UPSTREAM_UNAVAILABLE);
    }

    const supabase = await createSupabaseServerClient();

    // We construct the callback URL to which Google (via Supabase) will redirect.
    const callbackUrl = new URL('/api/v1/auth/callback', authRequestOrigin(request));
    callbackUrl.searchParams.set('next', next);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: callbackUrl.toString(),
      },
    });

    if (error) {
      log.error('Failed to initiate Google OAuth', { reason: error.message });
      throw new AppError(ERROR_CODES.UPSTREAM_UNAVAILABLE, {
        internal: { stage: 'supabase.signInWithOAuth', reason: error.message },
      });
    }

    if (!data.url) {
      throw new AppError(ERROR_CODES.INTERNAL);
    }

    // Redirect the user to the Google Auth URL provided by Supabase
    return NextResponse.redirect(data.url, 303);
  } catch (error) {
    const code = error instanceof AppError ? error.code : ERROR_CODES.INTERNAL;
    log.warn('Google OAuth initiation failed', { code });
    const url = new URL('/sign-in', authRequestOrigin(request));
    url.searchParams.set('error', code);
    url.searchParams.set('next', next);
    return NextResponse.redirect(url, 303);
  }
}
