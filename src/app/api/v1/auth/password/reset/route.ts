import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import {
  cookieNameFor,
  createSession,
  revokeAllSessions,
  revokeSession,
  sessionCookieOptions,
} from '@/lib/auth/session';
import {
  claimEmailPasswordChange,
  releaseEmailPasswordChange,
  markEmailPasswordSaved,
  requireEmailSession,
} from '@/lib/auth/emailSession';
import { activateProvisionedOwner } from '@/lib/auth/provisionedOwner';
import { recordEmailPasswordChange } from '@/lib/auth/passwordAudit';
import { AppError, ERROR_CODES } from '@/lib/errors';
import { readRequestBody, wantsJson } from '@/lib/http/body';
import { RATE_LIMITS, enforceRateLimit } from '@/lib/http/rateLimit';
import { jsonError, jsonOk } from '@/lib/http/response';
import { logger } from '@/lib/logger';

/** Password reset revokes all application sessions, including the reset session. */

const resetSchema = z
  .object({
    password: z.string().min(12, 'Use at least 12 characters.'),
    passwordConfirm: z.string(),
    purpose: z.enum(['invite', 'recovery']).default('recovery'),
  })
  .refine((value) => value.password === value.passwordConfirm, {
    message: 'Both passwords must match.',
    path: ['passwordConfirm'],
  });

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
  const log = logger.child({ requestId, route: '/api/v1/auth/password/reset' });
  const asJson = wantsJson(request);
  let purpose = 'recovery';
  let passwordChanged = false;
  let updateUnconfirmed = false;

  try {
    if (request.headers.get('origin') !== new URL(request.url).origin)
      throw new AppError(ERROR_CODES.AUTH_INVALID_CREDENTIALS);
    await enforceRateLimit(request, RATE_LIMITS.passwordReset);

    const raw = await readRequestBody(request);
    // Keep invitation validation failures on their verified setup journey.
    if (typeof raw === 'object' && raw !== null && 'purpose' in raw && raw.purpose === 'invite')
      purpose = 'invite';

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
    purpose = parsed.data.purpose;

    const {
      user,
      session: flow,
      supabase,
    } = await requireEmailSession(parsed.data.purpose, requestId);
    const userId = user.id;

    await claimEmailPasswordChange(flow.id, userId, parsed.data.purpose, requestId);
    updateUnconfirmed = true;
    const updated = await supabase.auth.updateUser({ password: parsed.data.password });
    if (updated.error) {
      if (
        updated.error.name === 'AuthRetryableFetchError' ||
        !updated.error.status ||
        updated.error.status >= 500
      )
        throw new AppError(ERROR_CODES.UPSTREAM_UNAVAILABLE);
      updateUnconfirmed = false;
      await releaseEmailPasswordChange(flow.id, userId, parsed.data.purpose, requestId);
      throw new AppError(ERROR_CODES.VALIDATION_FAILED, {
        message: 'This password could not be saved. Choose a different password and try again.',
        details: [
          {
            field: 'password',
            code: ERROR_CODES.VALIDATION_FAILED,
            message: 'Choose a different password and try again.',
          },
        ],
      });
    }
    passwordChanged = true;
    updateUnconfirmed = false;
    await markEmailPasswordSaved(flow.id, userId, parsed.data.purpose, requestId);

    const revoked = await revokeAllSessions(userId, requestId, 'password reset', flow.id);
    await recordEmailPasswordChange(
      userId,
      parsed.data.purpose,
      revoked,
      requestId,
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
    );
    if (purpose === 'invite') {
      const owner = await activateProvisionedOwner(
        requestId,
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
      );
      const session = await createSession({
        ...owner,
        kind: 'tenant',
        effectiveRole: owner.role,
        requestId,
      });
      await revokeSession(flow.id, userId, requestId, 'email setup completed');
      const response = asJson
        ? jsonOk({ passwordChanged: true, destination: '/app' }, { requestId })
        : NextResponse.redirect(new URL('/app', request.url), 303);
      response.cookies.set(
        cookieNameFor('tenant'),
        session.id,
        sessionCookieOptions(session.expiresAt),
      );
      response.cookies.set(cookieNameFor('platform'), '', {
        path: '/',
        maxAge: 0,
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      });
      response.cookies.set(cookieNameFor('recovery'), '', {
        path: '/',
        maxAge: 0,
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      });
      return response;
    }
    await revokeSession(flow.id, userId, requestId, 'password recovery completed');
    const signedOut = await supabase.auth.signOut();
    if (signedOut.error) throw new AppError(ERROR_CODES.INTERNAL);

    log.info('password reset', { userId, sessionsRevoked: revoked });

    const response = asJson
      ? jsonOk({ passwordChanged: true, sessionsRevoked: revoked }, { requestId })
      : NextResponse.redirect(new URL('/sign-in?reset=1', request.url), 303);

    for (const kind of ['tenant', 'platform', 'recovery'] as const) {
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
    if (asJson)
      return jsonError(
        passwordChanged
          ? new AppError(ERROR_CODES.INTERNAL, {
              message:
                'Your password was saved, but account setup could not finish. Sign in with your new password or retry workspace setup.',
            })
          : updateUnconfirmed
            ? new AppError(ERROR_CODES.UPSTREAM_UNAVAILABLE, {
                message:
                  'The password update could not be confirmed. Request a new email link before trying again.',
              })
            : error,
        requestId,
      );
    const code = error instanceof AppError ? error.code : ERROR_CODES.INTERNAL;
    log.warn('password reset failed', { code });
    const url = new URL('/reset-password', request.url);
    if (purpose === 'invite') url.searchParams.set('purpose', 'invite');
    url.searchParams.set(
      'error',
      passwordChanged
        ? purpose === 'invite'
          ? 'setup_pending'
          : 'reset_incomplete'
        : updateUnconfirmed
          ? 'update_unconfirmed'
          : code,
    );
    return NextResponse.redirect(url, 303);
  }
}
