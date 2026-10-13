import { authRequestOrigin } from '@/lib/auth/requestOrigin';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/auth/supabase/server';
import { AppError, ERROR_CODES } from '@/lib/errors';
import { readRequestBody, wantsJson } from '@/lib/http/body';
import { RATE_LIMITS, enforceRateLimit } from '@/lib/http/rateLimit';
import { jsonError, jsonOk } from '@/lib/http/response';
import { logger } from '@/lib/logger';
import { signupConfirmationUrl } from '@/lib/auth/signupConfirmation';
import { readInvitationByToken } from '@/modules/membership';

/** Verification resend responses do not disclose account existence or confirmation status. */

const resendSchema = z
  .object({
    email: z.string().trim().toLowerCase().email('Enter a valid email address.').optional(),
    invitationToken: z
      .string()
      .regex(/^[A-Za-z0-9_-]{20,256}$/)
      .optional(),
  })
  .refine((input) => input.email || input.invitationToken);

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
  const asJson = wantsJson(request);
  const log = logger.child({ requestId, route: '/api/v1/auth/verify-email/resend' });

  try {
    if (request.headers.get('origin') !== authRequestOrigin(request))
      throw new AppError(ERROR_CODES.AUTH_INVALID_CREDENTIALS);
    /* This route makes US send mail on an anonymous caller's say-so, which is
       the same shape of abuse the forgot-password limiter exists to stop. */
    await enforceRateLimit(request, RATE_LIMITS.verifyEmailResend);

    const parsed = resendSchema.safeParse(await readRequestBody(request));
    if (!parsed.success) throw new AppError(ERROR_CODES.VALIDATION_FAILED);

    const { invitationToken } = parsed.data;
    const invitation = invitationToken
      ? await readInvitationByToken(invitationToken, requestId)
      : null;
    if (invitationToken && invitation?.state !== 'pending')
      throw new AppError(ERROR_CODES.NOT_FOUND);
    const email = invitation?.invitedEmail ?? parsed.data.email!;
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: signupConfirmationUrl(
          request,
          invitationToken ? `/invite/${invitationToken}` : '/app',
        ),
      },
    });

    /* Logged, never returned. Whoever is on call needs to know the provider
       is refusing; the caller must not learn anything about the address. */
    if (error) log.warn('confirmation resend was refused by the provider');

    const destination = invitationToken
      ? `/invite/${invitationToken}?confirmation=sent`
      : `/sign-up/verify?email=${encodeURIComponent(email)}&resent=1`;

    return asJson
      ? jsonOk({ sent: true }, { requestId })
      : NextResponse.redirect(new URL(destination, authRequestOrigin(request)), 303);
  } catch (error) {
    if (asJson) return jsonError(error, requestId);

    const code = error instanceof AppError ? error.code : ERROR_CODES.INTERNAL;
    const url = new URL('/sign-up/verify', authRequestOrigin(request));
    url.searchParams.set('error', code);
    return NextResponse.redirect(url, 303);
  }
}
