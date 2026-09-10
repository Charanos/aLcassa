import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/auth/supabase/server';
import { cookieNameFor, createSession, sessionCookieOptions } from '@/lib/auth/session';
import { AppError, ERROR_CODES } from '@/lib/errors';
import { readRequestBody, wantsJson } from '@/lib/http/body';
import { RATE_LIMITS, enforceRateLimit } from '@/lib/http/rateLimit';
import { jsonError, jsonOk } from '@/lib/http/response';
import { logger } from '@/lib/logger';
import { selfServeSignUp, selfServeSignUpSchema } from '@/modules/platform';

/**
 * IA §3 · `POST /v1/auth/sign-up`. "New tenant registration — creates tenant,
 * membership and owner in one transaction."
 *
 * ⚠ THIS ROUTE DID NOT EXIST UNTIL NOW, AND THE FORM HAS BEEN POSTING AT IT
 * THE WHOLE TIME. `/sign-up` has always carried
 * `action="/api/v1/auth/sign-up"`, so every submission since the page was
 * built has 404ed. The page was never the problem; this file was missing.
 *
 * ⚠ IT IS A PLAIN FORM POST, LIKE SIGN-IN. Same reasoning: registration that
 * needs a bundle to work is registration that breaks for the people least
 * able to work around it. Failures come back as `?error=<code>` on `/sign-up`
 * and the page renders the catalogue's message.
 *
 * ⚠ THE READER IS SIGNED IN BEFORE THEY CONFIRM THEIR EMAIL, DELIBERATELY.
 * They own a real workspace the moment the transaction commits, and bouncing
 * them to a "check your email" dead end with no session is where self-serve
 * funnels lose people — they close the tab, the mail lands in spam, and the
 * workspace they just created is never seen again. So a session is issued and
 * `/sign-up/verify` is a SIGNED-IN page they can leave at any time by
 * continuing into the product. Confirmation still gates whatever the
 * entitlement layer decides it gates; it does not gate having an account.
 */

const SELF_SERVE_DISABLED = process.env.ALLOW_SELF_SERVE_SIGNUP === 'false';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
  const asJson = wantsJson(request);
  const log = logger.child({ requestId, route: '/api/v1/auth/sign-up' });

  try {
    /*
     * ⚠ A KILL SWITCH, DEFAULTING TO ON. This endpoint lets an anonymous
     * caller create a tenant row, which is the most consequential thing any
     * public route in this application does. If registration is ever being
     * abused — or the business decides workspaces are sales-led after all —
     * `ALLOW_SELF_SERVE_SIGNUP=false` closes it without a deploy. It is
     * opt-OUT rather than opt-in because the sign-up page is already public
     * and linked from the marketing site; shipping it closed by default would
     * make a live link start refusing.
     */
    if (SELF_SERVE_DISABLED) throw new AppError(ERROR_CODES.SIGNUP_DISABLED);

    /* Tighter than sign-in's five-per-minute. A failed sign-in costs a row
       read; a successful registration creates a tenant, a settings row, a
       profile and a membership, and sends mail. Three per five minutes per
       address is generous for a person and ruinous for a script. */
    await enforceRateLimit(request, RATE_LIMITS.signUp);

    /* Parsed here as well as inside the module. The module re-validates
       because it is exported and cannot trust its callers; the route
       validates so that a bad field comes back as a per-field envelope
       rather than a generic failure. */
    const parsed = selfServeSignUpSchema.safeParse(await readRequestBody(request));

    if (!parsed.success) {
      throw new AppError(ERROR_CODES.VALIDATION_FAILED, {
        details: parsed.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          code: ERROR_CODES.VALIDATION_FAILED,
          message: issue.message,
        })),
      });
    }

    const result = await selfServeSignUp(parsed.data, {
      requestId,
      ipAddress: request.headers.get('x-forwarded-for'),
    });

    if (!result.ok) {
      if (result.code === 'email_taken') {
        throw new AppError(ERROR_CODES.SIGNUP_EMAIL_TAKEN);
      }
      if (result.code === 'validation_failed') {
        throw new AppError(ERROR_CODES.VALIDATION_FAILED, {
          message: result.message,
          details: result.details?.map((d) => ({
            field: d.field,
            code: ERROR_CODES.VALIDATION_FAILED,
            message: d.message,
          })),
        });
      }
      /* `registration_failed` may carry the "could not remove the orphaned
         account" case, which names an address. That belongs in the log for
         whoever has to clean it up, never in a response to the public. */
      log.error('self-serve registration failed', { detail: result.message });
      throw new AppError(ERROR_CODES.INTERNAL);
    }

    /*
     * The confirmation link. Sent AFTER the transaction committed, because a
     * "confirm your workspace" mail for a workspace that failed to be created
     * is worse than no mail at all. A send failure does not fail the request:
     * the account exists and works, and `/sign-up/verify` has a resend button
     * for exactly this.
     */
    /* `resend`, not `generateLink`. `generateLink({ type: 'signup' })` demands
       the password back so it can mint the link, and holding the plaintext
       past the point it is needed to satisfy an API signature is exactly the
       habit the rest of this codebase refuses. `resend` addresses the
       unconfirmed user by email and needs nothing else — and it is the same
       call `verify-email/resend` makes, so the two cannot drift. */
    const supabase = await createSupabaseServerClient();
    const sent = await supabase.auth
      .resend({ type: 'signup', email: result.email })
      .catch((error: unknown) => ({ error }) as const);

    if (sent && 'error' in sent && sent.error) {
      log.warn('registration succeeded but the confirmation mail did not send', {
        tenantId: result.tenantId,
      });
    }

    // `createSession` reads the user agent and IP from the request headers
    // itself, so that no call site can forget to record them.
    const session = await createSession({
      userId: result.ownerUserId,
      kind: 'tenant',
      tenantId: result.tenantId,
      requestId,
    });

    log.info('workspace self-registered', {
      tenantId: result.tenantId,
      slug: result.slug,
    });

    const destination = `/sign-up/verify?email=${encodeURIComponent(result.email)}`;

    const response = asJson
      ? jsonOk(
          {
            userId: result.ownerUserId,
            destination,
            tenant: { id: result.tenantId, slug: result.slug, name: result.slug },
          },
          { requestId },
        )
      : // 303 so a refresh on the destination does not repost the password.
        NextResponse.redirect(new URL(destination, request.url), 303);

    response.cookies.set(
      cookieNameFor('tenant'),
      session.id,
      sessionCookieOptions(session.expiresAt),
    );

    return response;
  } catch (error) {
    if (asJson) return jsonError(error, requestId);

    const code = error instanceof AppError ? error.code : ERROR_CODES.INTERNAL;
    log.warn('sign-up failed', { code });
    const url = new URL('/sign-up', request.url);
    url.searchParams.set('error', code);
    return NextResponse.redirect(url, 303);
  }
}
