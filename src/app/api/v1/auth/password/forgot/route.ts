import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/auth/supabase/server';
import { readRequestBody, wantsJson } from '@/lib/http/body';
import { jsonNoContent } from '@/lib/http/response';
import { logger } from '@/lib/logger';

/**
 * 07 §3 · `POST /v1/auth/password/forgot`.
 * "Always 204, never confirms an account exists."
 *
 * ⚠ EVERY PATH THROUGH THIS FUNCTION RETURNS THE SAME 204, AND THE ONES THAT
 *   LOOK LIKE ERROR HANDLING ARE THE POINT OF THE ROUTE.
 *
 * A password reset form is the easiest account-existence oracle in any
 * product. Return 404 for an unknown address and an attacker can enumerate
 * every customer this platform has, one request at a time, and then go
 * looking for those addresses in breach corpora. So:
 *
 *   unknown address        → 204, and no email is sent
 *   known address          → 204, and an email is sent
 *   Supabase is down       → 204, and it is logged for us
 *   malformed address      → 204, and nothing happens
 *
 * The response body, the status and the timing must not distinguish them.
 * The page that posts here says "if that address has an account, we have sent
 * a link" — which is true in every case above, and is the only honest thing
 * that can be said without leaking.
 *
 * The one thing NOT deferred to silence is a validation failure on our own
 * side: an address that is not an address cannot belong to anyone, so
 * refusing to call Supabase with it saves a request and leaks nothing.
 */

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

    if (parsed.success) {
      const supabase = await createSupabaseServerClient();
      const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
        // Where the link lands. Supabase appends its own recovery token, and
        // `/reset-password` exchanges it for a session before accepting a new
        // password.
        redirectTo: new URL('/reset-password', request.url).toString(),
      });

      if (error) {
        // Logged, never surfaced. A failure here must look identical to
        // success from the outside.
        log.error('reset email could not be sent', { reason: error.message });
      } else {
        // The address is NOT logged. 05 I-16: a log line naming who is trying
        // to recover an account is the same disclosure by another route.
        log.info('password reset requested');
      }
    } else {
      log.info('password reset requested with a malformed address');
    }
  } catch (error) {
    log.error('forgot-password handler failed', { error });
  }

  if (asJson) return jsonNoContent(requestId);

  // The form post lands on a page that says the same thing regardless.
  return NextResponse.redirect(new URL('/forgot-password?sent=1', request.url), 303);
}
