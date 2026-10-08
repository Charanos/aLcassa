import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/auth/supabase/server';
import { readRequestBody, wantsJson } from '@/lib/http/body';
import { RATE_LIMITS, enforceRateLimit } from '@/lib/http/rateLimit';
import { jsonNoContent } from '@/lib/http/response';
import { logger } from '@/lib/logger';
import { authEmailRedirect } from '@/lib/auth/emailLink';

/** Return the same password-reset response for unknown accounts and provider failures. */

const forgotSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
  const log = logger.child({ requestId, route: '/api/v1/auth/password/forgot' });

  const asJson = wantsJson(request);

  try {
    const raw = await readRequestBody(request);

    const parsed = forgotSchema.safeParse(raw);

    /** Enforce the email-send budget without exposing account state through a different reset response. */
    let limited = false;
    try {
      await enforceRateLimit(request, RATE_LIMITS.passwordForgot, parsed.data?.email);
    } catch {
      limited = true;
      log.warn('password reset rate limited');
    }

    if (parsed.success && !limited) {
      const supabase = await createSupabaseServerClient();
      const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
        redirectTo: authEmailRedirect('recovery'),
      });

      if (error) {
        // Logged, never surfaced. A failure here must look identical to
        // success from the outside.
        log.error('reset email could not be sent', { code: error.code ?? 'provider_failure' });
      } else {
        // The address is NOT logged. 05 I-16: a log line naming who is trying
        // to recover an account is the same disclosure by another route.
        log.info('password reset requested');
      }
    } else {
      log.info('password reset requested with a malformed address');
    }
  } catch {
    log.error('forgot-password handler failed');
  }

  if (asJson) return jsonNoContent(requestId);

  // The form post lands on a page that says the same thing regardless.
  return NextResponse.redirect(new URL('/forgot-password?sent=1', request.url), 303);
}
