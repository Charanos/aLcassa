import { authRequestOrigin } from '@/lib/auth/requestOrigin';
import { NextResponse, type NextRequest } from 'next/server';
import { activateProvisionedOwner } from '@/lib/auth/provisionedOwner';
import {
  cookieNameFor,
  createSession,
  revokeSession,
  sessionCookieOptions,
} from '@/lib/auth/session';
import { requireEmailSession } from '@/lib/auth/emailSession';
import { enforceRateLimit, RATE_LIMITS } from '@/lib/http/rateLimit';
import { logger } from '@/lib/logger';

/** Retry workspace activation after a password was saved but the database operation failed. */
export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
  try {
    if (request.headers.get('origin') !== authRequestOrigin(request))
      throw new Error('origin_refused');
    await enforceRateLimit(request, RATE_LIMITS.passwordReset);
    const { user, session: flow, passwordSaved } = await requireEmailSession('invite', requestId);
    if (!passwordSaved) throw new Error('password_setup_required');
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
    await revokeSession(flow.id, user.id, requestId, 'email setup completed');
    const response = NextResponse.redirect(new URL('/app', authRequestOrigin(request)), 303);
    response.cookies.set(
      cookieNameFor('tenant'),
      session.id,
      sessionCookieOptions(session.expiresAt),
    );
    response.cookies.set(cookieNameFor('recovery'), '', {
      path: '/',
      maxAge: 0,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
    return response;
  } catch {
    logger.child({ requestId }).warn('workspace activation could not complete');
    return NextResponse.redirect(
      new URL('/reset-password?purpose=invite&error=setup_pending', authRequestOrigin(request)),
      303,
    );
  }
}
