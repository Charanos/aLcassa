import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/auth/supabase/server';
import { isPlatformAdmin, membershipsFor } from '@/lib/auth/resolve';
import { activateProvisionedOwner } from '@/lib/auth/provisionedOwner';
import { cookieNameFor, createSession, sessionCookieOptions } from '@/lib/auth/session';
import { AppError, ERROR_CODES } from '@/lib/errors';
import { FLASH_COOKIE, FLASH_COOKIE_OPTIONS } from '@/lib/flash';
import { readRequestBody, wantsJson } from '@/lib/http/body';
import { RATE_LIMITS, enforceRateLimit } from '@/lib/http/rateLimit';
import { jsonError, jsonOk } from '@/lib/http/response';
import { logger } from '@/lib/logger';
import { safeReturnPath } from '@/lib/auth/returnPath';

/** Public sign-in cannot use the session-required route pipeline; handle form redirects and JSON responses explicitly. */

const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
  next: z.string().optional(),
});

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

    /** Apply sign-in limits using the parsed address and IP before calling the identity provider. */
    await enforceRateLimit(request, RATE_LIMITS.signIn, email);

    const supabase = await createSupabaseServerClient();

    // ─ 1 · Supabase validates the credentials and sets its own cookies ──────
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.user) {
      /** Use the same refusal for unknown accounts and incorrect passwords. */
      /** Distinguish identity-provider outages from rejected credentials. */
      const unreachable =
        error?.name === 'AuthRetryableFetchError' || (error != null && !error.status);

      if (unreachable) {
        log.error('sign-in could not reach the identity provider', {
          reason: error?.message,
          name: error?.name,
        });
        throw new AppError(ERROR_CODES.UPSTREAM_UNAVAILABLE, {
          internal: { stage: 'supabase.signInWithPassword', reason: error?.message },
        });
      }

      /** Keep credential refusals indistinguishable to prevent account enumeration. */
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
      const destination = safeReturnPath(next, '/platform');
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
    // A saved password can recover a provisioned owner whose activation previously failed.
    if (
      active.length === 0 &&
      memberships.some((m) => m.role === 'owner' && m.status === 'invited')
    ) {
      const joined = await activateProvisionedOwner(
        requestId,
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
      );
      const membership = memberships.find((m) => m.tenantId === joined.tenantId)!;
      active.push({ ...membership, status: 'active' });
    }

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

    const destination = safeReturnPath(next, '/app');
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

    /** Form failures redirect with a catalogue error code; raw provider messages are not exposed. */
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

  /* Issue the greeting notice only for browser form navigation. */
  if (!input.asJson) {
    response.cookies.set(FLASH_COOKIE, 'signed_in', FLASH_COOKIE_OPTIONS);
  }

  return response;
}
