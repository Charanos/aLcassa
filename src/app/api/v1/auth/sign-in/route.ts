import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/auth/supabase/server';
import { isPlatformAdmin, membershipsFor } from '@/lib/auth/resolve';
import { cookieNameFor, createSession, sessionCookieOptions } from '@/lib/auth/session';
import { AppError, ERROR_CODES } from '@/lib/errors';
import { readRequestBody, wantsJson } from '@/lib/http/body';
import { RATE_LIMITS, enforceRateLimit } from '@/lib/http/rateLimit';
import { jsonError, jsonOk } from '@/lib/http/response';
import { logger } from '@/lib/logger';

/**
 * 07 §3 · `POST /v1/auth/sign-in`.
 *
 * ⚠ THIS ROUTE CANNOT USE `defineRoute`, AND THE REASON IS NOT AN OVERSIGHT.
 *
 * The pipeline's stage 1 resolves a session before the handler runs. There is
 * no session here — creating one is the entire job — so a route defined that
 * way would refuse every sign-in with `auth.session_expired`. The four public
 * auth routes are the deliberate exception, and each one does by hand only
 * what it must: validate, call Supabase, and set a cookie.
 *
 * ⚠ IT ANSWERS A FORM POST AND A JSON POST, AND THAT IS ON PURPOSE.
 *
 * `(access)/sign-in/page.tsx` is a server-rendered `<form method="post">`
 * with no JavaScript behind it, because a sign-in screen that needs a bundle
 * to work is a sign-in screen that breaks in exactly the conditions where
 * someone most needs to get in. So a form post gets a 303 and a redirect; an
 * `application/json` post gets the envelope from `07 §1`.
 */

const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
  next: z.string().optional(),
});

/**
 * ⚠ ONLY A PATH ON THIS SITE. `?next=` arrives from the middleware redirect
 * and is therefore attacker-supplied: `next=https://evil.example` would turn
 * our own sign-in form into an open redirect, which is a phishing primitive.
 * A value must start with a single `/` and not `//`, which would be
 * protocol-relative and leave the site.
 */
function safeNext(next: string | undefined, fallback: string): string {
  if (!next) return fallback;
  if (!next.startsWith('/') || next.startsWith('//')) return fallback;
  return next;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
  const log = logger.child({ requestId, route: '/api/v1/auth/sign-in' });

  const asJson = wantsJson(request);

  try {
    const raw = await readRequestBody(request);

    const parsed = signInSchema.safeParse(raw);
    if (!parsed.success) {
      throw new AppError(ERROR_CODES.VALIDATION_FAILED, {
        details: parsed.error.issues.map((issue) => ({
          field: issue.path.join('.') || '_',
          code: issue.code,
          message: issue.message,
        })),
      });
    }

    const { email, password, next } = parsed.data;

    /**
     * ⚠ AFTER PARSING, SO THE BUDGET IS KEYED ON THE ADDRESS.
     *
     * Limiting by address as well as by IP means one person's failed attempts
     * do not consume the budget of everybody else behind the same corporate
     * NAT — and a credential-stuffing run spraying many addresses from one
     * host still hits the per-IP half of the key.
     *
     * Supabase applies its own limits underneath. This one exists so an
     * attacker cannot burn a real user's Supabase budget at will, and so the
     * refusal comes from us with a Retry-After the client can act on.
     */
    await enforceRateLimit(request, RATE_LIMITS.signIn, email);

    const supabase = await createSupabaseServerClient();

    // ─ 1 · Supabase validates the credentials and sets its own cookies ──────
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.user) {
      /**
       * ⚠ ONE MESSAGE FOR "NO SUCH ACCOUNT" AND FOR "WRONG PASSWORD".
       *
       * Distinguishing them turns this endpoint into an account-existence
       * oracle: an attacker learns which addresses are registered here and
       * moves on to credential stuffing with a shortlist. The catalogue's
       * `auth.invalid_credentials` message already says "that email and
       * password do not match", which is true of both cases.
       *
       * Supabase applies its own per-address and per-IP rate limiting, so
       * `auth.account_locked` is surfaced from its response rather than
       * counted a second time here — two counters that disagree are worse
       * than one.
       */
      const locked = error?.status === 429;
      log.warn('sign-in refused', { locked, reason: error?.message });
      throw new AppError(
        locked ? ERROR_CODES.AUTH_ACCOUNT_LOCKED : ERROR_CODES.AUTH_INVALID_CREDENTIALS,
      );
    }

    const userId = data.user.id;

    // 07 §3. Credentials were right, so this is a 403 and not a 401.
    if (!data.user.email_confirmed_at) {
      throw new AppError(ERROR_CODES.AUTH_EMAIL_UNVERIFIED);
    }

    // ─ 2 · Which door? The platform console, or a workspace. ────────────────
    //
    // 02 §3: two doors, no navigational path between them. A platform admin
    // who also owns a workspace signs in to the console, because that is the
    // account they authenticated as; reaching their workspace is a separate,
    // audited step rather than an ambiguity resolved here.
    const platform = await isPlatformAdmin(userId, requestId);

    if (platform) {
      const session = await createSession({ userId, kind: 'platform', requestId });
      const destination = safeNext(next, '/platform');
      return respond({
        asJson,
        request,
        requestId,
        destination,
        cookie: {
          name: cookieNameFor('platform'),
          value: session.id,
          expiresAt: session.expiresAt,
        },
        payload: { userId, door: 'platform' as const, destination },
      });
    }

    const memberships = await membershipsFor(userId, requestId);
    const active = memberships.filter((m) => m.status === 'active');

    // 02 §11. A real state with a real screen. Signing them in and letting the
    // shell fail to render would be worse than saying so.
    if (active.length === 0) {
      log.warn('sign-in with no active membership', { userId });
      throw new AppError(ERROR_CODES.AUTH_NO_MEMBERSHIP);
    }

    // The session is PINNED to one tenant. A user in two workspaces gets the
    // first here and switches from inside the app, which mints a new session
    // rather than mutating this one — so the tenant a session resolves to
    // never changes under it.
    const tenant = active[0]!;
    const session = await createSession({
      userId,
      kind: 'tenant',
      tenantId: tenant.tenantId,
      effectiveRole: tenant.role,
      requestId,
    });

    log.info('signed in', { userId, tenantId: tenant.tenantId, role: tenant.role });

    const destination = safeNext(next, '/app');
    return respond({
      asJson,
      request,
      requestId,
      destination,
      cookie: { name: cookieNameFor('tenant'), value: session.id, expiresAt: session.expiresAt },
      payload: {
        userId,
        door: 'tenant' as const,
        destination,
        tenant: { id: tenant.tenantId, slug: tenant.slug, name: tenant.name, role: tenant.role },
      },
    });
  } catch (error) {
    if (asJson) return jsonError(error, requestId);

    /**
     * A form post cannot render an error envelope. It goes back to the form
     * with the code in the query string, where the page turns it into the
     * catalogue's message beside the field. The code is safe to expose — it
     * is the same one the JSON envelope carries — and carrying it in the URL
     * rather than a flash cookie keeps the page fully static.
     */
    const code = error instanceof AppError ? error.code : ERROR_CODES.INTERNAL;
    logger.child({ requestId }).warn('sign-in failed', { code });
    const url = new URL('/sign-in', request.url);
    url.searchParams.set('error', code);
    return NextResponse.redirect(url, 303);
  }
}

/** One place that decides between a redirect and an envelope, so the cookie
 *  is set identically on both and cannot be forgotten on one. */
function respond(input: {
  asJson: boolean;
  request: NextRequest;
  requestId: string;
  destination: string;
  cookie: { name: string; value: string; expiresAt: Date };
  payload: Record<string, unknown>;
}): NextResponse {
  const response = input.asJson
    ? jsonOk(input.payload, { requestId: input.requestId })
    : // 303, not 302: it turns the browser's follow-up into a GET, so a
      // refresh on the destination does not repost the credentials.
      NextResponse.redirect(new URL(input.destination, input.request.url), 303);

  response.cookies.set(
    input.cookie.name,
    input.cookie.value,
    sessionCookieOptions(input.cookie.expiresAt),
  );

  return response;
}
