import { authRequestOrigin } from '@/lib/auth/requestOrigin';
import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/auth/supabase/server';
import { cookieNameFor, createSession, sessionCookieOptions } from '@/lib/auth/session';
import { emailProofSchema } from '@/lib/auth/emailLink';
import { readRequestBody } from '@/lib/http/body';
import { enforceRateLimit, RATE_LIMITS } from '@/lib/http/rateLimit';
import { logger } from '@/lib/logger';
import { createHash } from 'node:crypto';
import { z } from 'zod';

const verifiedClaimsSchema = z.object({
  sub: z.string().uuid(),
  session_id: z.string().uuid(),
  amr: z.array(z.object({ method: z.string(), timestamp: z.number() })),
});

/** Consume email proofs only after an explicit, same-origin confirmation. */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
  let purpose = 'recovery';
  let stage = 'request';
  try {
    if (request.headers.get('origin') !== authRequestOrigin(request))
      throw new Error('origin_refused');
    await enforceRateLimit(request, RATE_LIMITS.passwordReset);
    const input = emailProofSchema.parse(await readRequestBody(request));
    purpose = input.purpose;
    const supabase = await createSupabaseServerClient();
    stage = 'provider_proof';
    const result =
      input.proof === 'code'
        ? await supabase.auth.exchangeCodeForSession(input.code)
        : input.proof === 'hash'
          ? await supabase.auth.verifyOtp({ token_hash: input.tokenHash, type: input.purpose })
          : await supabase.auth.setSession({
              access_token: input.accessToken,
              refresh_token: input.refreshToken,
            });
    if (result.error || !result.data.session) throw new Error('proof_refused');
    const identity = await supabase.auth.getUser(result.data.session.access_token);
    stage = 'identity';
    if (identity.error || !identity.data.user?.email_confirmed_at)
      throw new Error('identity_refused');
    const verified = await supabase.auth.getClaims(result.data.session.access_token);
    stage = 'claims';
    if (verified.error) throw new Error('claims_refused');
    const claims = verifiedClaimsSchema.parse(verified.data?.claims);
    const now = Date.now() / 1000;
    stage = 'email_method';
    if (
      claims.sub !== identity.data.user.id ||
      !claims.amr.some(
        (method) =>
          [input.purpose, 'otp'].includes(method.method) &&
          method.timestamp <= now + 30 &&
          method.timestamp >= now - 15 * 60,
      )
    )
      throw new Error('email_method_refused');
    const proofId = createHash('sha256')
      .update(`email:${claims.session_id}:${input.purpose}`)
      .digest('hex')
      .slice(0, 32);
    const id = `${proofId.slice(0, 8)}-${proofId.slice(8, 12)}-4${proofId.slice(13, 16)}-8${proofId.slice(17, 20)}-${proofId.slice(20)}`;
    const flow = await createSession({
      id,
      userId: identity.data.user.id,
      kind: 'recovery',
      effectiveRole: input.purpose,
      requestId,
    });
    const destination = purpose === 'invite' ? '/reset-password?purpose=invite' : '/reset-password';
    const response = NextResponse.redirect(new URL(destination, authRequestOrigin(request)), 303);
    response.cookies.set(cookieNameFor('recovery'), flow.id, sessionCookieOptions(flow.expiresAt));
    for (const kind of ['tenant', 'platform'] as const)
      response.cookies.set(cookieNameFor(kind), '', {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 0,
      });
    response.headers.set('Cache-Control', 'no-store');
    response.headers.set('Referrer-Policy', 'strict-origin');
    return response;
  } catch {
    logger.child({ requestId }).warn('email link confirmation refused', { stage });
    const url = new URL('/auth/confirm', authRequestOrigin(request));
    url.searchParams.set('type', purpose);
    url.searchParams.set('error', 'link_unavailable');
    return NextResponse.redirect(url, 303);
  }
}
