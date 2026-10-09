import { authRequestOrigin } from '@/lib/auth/requestOrigin';
import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/auth/supabase/server';
import { cookieNameFor, createSession, sessionCookieOptions } from '@/lib/auth/session';
import { AppError, ERROR_CODES } from '@/lib/errors';
import { FLASH_COOKIE, FLASH_COOKIE_OPTIONS } from '@/lib/flash';
import { readRequestBody, wantsJson } from '@/lib/http/body';
import { RATE_LIMITS, enforceRateLimit } from '@/lib/http/rateLimit';
import { jsonError, jsonOk } from '@/lib/http/response';
import { logger } from '@/lib/logger';
import { selfServeSignUp, selfServeSignUpSchema } from '@/modules/platform';

/** Signup supports plain form posts and catalogue-based error redirects. */

const SELF_SERVE_DISABLED = process.env.ALLOW_SELF_SERVE_SIGNUP === 'false';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
  const asJson = wantsJson(request);
  const log = logger.child({ requestId, route: '/api/v1/auth/sign-up' });

  try {
    /* ALLOW_SELF_SERVE_SIGNUP=false disables public workspace registration. */
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

    /* Send confirmation after the workspace commits; delivery failure does not undo signup. */
    /* Resend by email so plaintext passwords are not retained to generate a link. */
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
        NextResponse.redirect(new URL(destination, authRequestOrigin(request)), 303);

    response.cookies.set(
      cookieNameFor('tenant'),
      session.id,
      sessionCookieOptions(session.expiresAt),
    );

    /* The verify page is a receipt, not a gate — this is what makes it read
       as an achievement rather than an errand. */
    if (!asJson) {
      response.cookies.set(FLASH_COOKIE, 'workspace_created', FLASH_COOKIE_OPTIONS);
    }

    return response;
  } catch (error) {
    if (asJson) return jsonError(error, requestId);

    const code = error instanceof AppError ? error.code : ERROR_CODES.INTERNAL;
    log.warn('sign-up failed', { code });
    const url = new URL('/sign-up', authRequestOrigin(request));
    url.searchParams.set('error', code);
    return NextResponse.redirect(url, 303);
  }
}
