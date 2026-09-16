import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/auth/supabase/server';
import { cookieNameFor, createSession, sessionCookieOptions } from '@/lib/auth/session';
import { AppError, ERROR_CODES } from '@/lib/errors';
import { FLASH_COOKIE, FLASH_COOKIE_OPTIONS } from '@/lib/flash';
import { readRequestBody, wantsJson } from '@/lib/http/body';
import { RATE_LIMITS, enforceRateLimit } from '@/lib/http/rateLimit';
import { jsonError, jsonOk } from '@/lib/http/response';
import { logger } from '@/lib/logger';
import { finishOAuthSignUp, finishOAuthSignUpSchema } from '@/modules/platform';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
  const asJson = wantsJson(request);
  const log = logger.child({ requestId, route: '/api/v1/auth/sign-up/finish' });

  try {
    await enforceRateLimit(request, RATE_LIMITS.signUp);

    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new AppError(ERROR_CODES.AUTH_SESSION_EXPIRED);
    }

    const parsed = finishOAuthSignUpSchema.safeParse(await readRequestBody(request));

    if (!parsed.success) {
      throw new AppError(ERROR_CODES.VALIDATION_FAILED, {
        details: parsed.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          code: ERROR_CODES.VALIDATION_FAILED,
          message: issue.message,
        })),
      });
    }

    const email = user.email!;
    const fullName = String(user.user_metadata?.full_name ?? user.user_metadata?.name ?? email);

    const result = await finishOAuthSignUp(parsed.data, {
      userId: user.id,
      email,
      fullName,
      requestId,
      ipAddress: request.headers.get('x-forwarded-for'),
    });

    if (!result.ok) {
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
      log.error('finish oauth registration failed', { detail: result.message });
      throw new AppError(ERROR_CODES.INTERNAL);
    }

    const session = await createSession({
      userId: user.id,
      kind: 'tenant',
      tenantId: result.tenantId,
      requestId,
    });

    log.info('workspace oauth registered', {
      tenantId: result.tenantId,
      slug: result.slug,
    });

    const destination = '/app';

    const response = asJson
      ? jsonOk(
          {
            userId: user.id,
            destination,
            tenant: { id: result.tenantId, slug: result.slug },
          },
          { requestId },
        )
      : NextResponse.redirect(new URL(destination, request.url), 303);

    response.cookies.set(
      cookieNameFor('tenant'),
      session.id,
      sessionCookieOptions(session.expiresAt),
    );

    if (!asJson) {
      response.cookies.set(FLASH_COOKIE, 'workspace_created', FLASH_COOKIE_OPTIONS);
    }

    return response;
  } catch (error) {
    if (asJson) return jsonError(error, requestId);

    const code = error instanceof AppError ? error.code : ERROR_CODES.INTERNAL;
    log.warn('finish oauth sign-up failed', { code });
    const url = new URL('/sign-up/finish', request.url);
    url.searchParams.set('error', code);
    return NextResponse.redirect(url, 303);
  }
}
