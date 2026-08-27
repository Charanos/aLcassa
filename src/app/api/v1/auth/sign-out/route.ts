import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/auth/supabase/server';
import {
  cookieNameFor,
  readSessionCookie,
  revokeSession,
  type SessionKind,
} from '@/lib/auth/session';
import { jsonOk } from '@/lib/http/response';
import { logger } from '@/lib/logger';

/**
 * 07 §3 · `POST /v1/auth/sign-out`. "Revokes the session row."
 *
 * ⚠ THE ORDER MATTERS AND IT IS THE OPPOSITE OF THE OBVIOUS ONE.
 *
 * Revoke the row FIRST, then clear the cookies. Clearing the cookie first
 * loses the session id, and with it any way to name the row that must be
 * revoked — leaving a live session row behind that the user believes they
 * have ended. It would still appear in their own sessions list, and anyone
 * holding a copy of the cookie would still be admitted by it.
 *
 * ⚠ IT NEVER FAILS. Every branch clears the cookies and answers 200.
 *
 * A sign-out that can error is a user who cannot leave. If the row cannot be
 * revoked, the cookies still go, the caller is still out on this device, and
 * the failure is logged for us rather than shown to them. The residual risk —
 * a row that outlives its cookie — expires on its own within twelve hours.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
  const log = logger.child({ requestId, route: '/api/v1/auth/sign-out' });

  const wantsJson = (request.headers.get('content-type') ?? '').includes('application/json');

  // Which door is this? Whichever cookie the request is carrying. A request
  // carrying both — one browser, both apps open — ends both, because "sign
  // out" from either surface should not leave the other one live.
  const kinds: SessionKind[] = ['tenant', 'platform'];
  const present: Array<{ kind: SessionKind; sessionId: string }> = [];

  for (const kind of kinds) {
    const sessionId = await readSessionCookie(kind);
    if (sessionId) present.push({ kind, sessionId });
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id ?? null;

  // ─ 1 · the rows, while we still know their ids ────────────────────────────
  if (userId) {
    for (const { sessionId } of present) {
      try {
        await revokeSession(sessionId, userId, requestId, 'signed out');
      } catch (error) {
        // Logged, never surfaced. See the note above.
        log.error('could not revoke session row on sign-out', { sessionId, error });
      }
    }
  }

  // ─ 2 · Supabase's own cookies ─────────────────────────────────────────────
  try {
    await supabase.auth.signOut();
  } catch (error) {
    log.error('supabase signOut failed', { error });
  }

  log.info('signed out', { userId, sessions: present.length });

  // ─ 3 · ours ───────────────────────────────────────────────────────────────
  const response = wantsJson
    ? jsonOk({ signedOut: true }, { requestId })
    : NextResponse.redirect(new URL('/sign-in', request.url), 303);

  for (const kind of kinds) {
    response.cookies.set(cookieNameFor(kind), '', {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 0,
    });
  }

  return response;
}
