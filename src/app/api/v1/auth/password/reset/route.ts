import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/auth/supabase/server';
import { cookieNameFor, revokeAllSessions } from '@/lib/auth/session';
import { AppError, ERROR_CODES } from '@/lib/errors';
import { readRequestBody, wantsJson } from '@/lib/http/body';
import { RATE_LIMITS, enforceRateLimit } from '@/lib/http/rateLimit';
import { jsonError, jsonOk } from '@/lib/http/response';
import { logger } from '@/lib/logger';

/** Password reset revokes all application sessions, including the reset session. */

const resetSchema = z
  .object({
    // 02 §9. Length over composition rules: a 12-character passphrase beats
    // `P@ssw0rd!` and is likelier to be remembered than written down.
    password: z.string().min(12, 'Use at least 12 characters.'),
    // The field name matches the built form. Aligning the schema to the page
    // rather than the page to the schema: the name is arbitrary, and a rename
    // in a route nobody is looking at is how a form silently stops validating.
    passwordConfirm: z.string(),
  })
  .refine((value) => value.password === value.passwordConfirm, {
    message: 'Both passwords must match.',
    path: ['passwordConfirm'],
  });

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
  const log = logger.child({ requestId, route: '/api/v1/auth/password/reset' });
  const asJson = wantsJson(request);

  try {
    // Before the body is read: this endpoint changes a credential, and the
    // recovery session it runs under is the only thing standing in front of
    // it. There is no address to key on, so the budget is per IP.
    await enforceRateLimit(request, RATE_LIMITS.passwordReset);

    const raw = await readRequestBody(request);

    const parsed = resetSchema.safeParse(raw);
    if (!parsed.success) {
      throw new AppError(ERROR_CODES.VALIDATION_FAILED, {
        details: parsed.error.issues.map((issue) => ({
          field: issue.path.join('.') || '_',
          code: issue.code,
          message: issue.message,
        })),
      });
    }

    const supabase = await createSupabaseServerClient();

    // The recovery session, established by the page before it posted here.
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw new AppError(ERROR_CODES.AUTH_SESSION_EXPIRED, {
        message: 'This reset link has expired. Ask for a new one.',
        internal: { stage: 'recovery-session' },
      });
    }
    const userId = data.user.id;

    // ─ 1 · the credential ───────────────────────────────────────────────────
    const updated = await supabase.auth.updateUser({ password: parsed.data.password });
    if (updated.error) {
      throw new AppError(ERROR_CODES.VALIDATION_FAILED, {
        message: updated.error.message,
        details: [
          {
            field: 'password',
            code: ERROR_CODES.VALIDATION_FAILED,
            message: updated.error.message,
          },
        ],
      });
    }

    // ─ 2 · everything that was signed in under the old one ──────────────────
    const revoked = await revokeAllSessions(userId, requestId, 'password reset');
    await supabase.auth.signOut();

    log.info('password reset', { userId, sessionsRevoked: revoked });

    const response = asJson
      ? jsonOk({ passwordChanged: true, sessionsRevoked: revoked }, { requestId })
      : NextResponse.redirect(new URL('/sign-in?reset=1', request.url), 303);

    // Ours too — see the note above about being signed out on this device.
    for (const kind of ['tenant', 'platform'] as const) {
      response.cookies.set(cookieNameFor(kind), '', {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 0,
      });
    }

    return response;
  } catch (error) {
    if (asJson) return jsonError(error, requestId);
    const code = error instanceof AppError ? error.code : ERROR_CODES.INTERNAL;
    log.warn('password reset failed', { code });
    const url = new URL('/reset-password', request.url);
    url.searchParams.set('error', code);
    return NextResponse.redirect(url, 303);
  }
}
