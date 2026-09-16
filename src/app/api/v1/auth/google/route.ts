import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/auth/supabase/server';
import { AppError, ERROR_CODES } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { RATE_LIMITS, enforceRateLimit } from '@/lib/http/rateLimit';

/**
 * 07 §3 · `POST /v1/auth/google`.
 *
 * Initiates the Google OAuth flow.
 * A plain POST from the sign-in / sign-up forms.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
  const log = logger.child({ requestId, route: '/api/v1/auth/google' });

  try {
    // Rate limit OAuth initiation requests
    await enforceRateLimit(request, RATE_LIMITS.signIn);

    const supabase = await createSupabaseServerClient();
    
    // We construct the callback URL to which Google (via Supabase) will redirect.
    const url = new URL(request.url);
    const callbackUrl = new URL('/api/v1/auth/callback', url.origin).toString();

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: callbackUrl,
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
    const url = new URL('/sign-in', request.url);
    url.searchParams.set('error', code);
    return NextResponse.redirect(url, 303);
  }
}
