import 'server-only';
import { and, desc, eq, isNull, ne, sql } from 'drizzle-orm';
import { cookies, headers } from 'next/headers';
import { sessions, type Session } from '@/db/schema';
import { withActorContext, type Transaction } from '@/lib/db';

/**
 * 04 §6. SESSIONS ARE ROWS.
 *
 * A JWT with a two-hour expiry cannot be withdrawn: revoking it means waiting
 * for it. Requirement 3 asks for session revocation that takes effect, and a
 * row is the only shape that delivers it — `revoked_at = now()` and the next
 * request through the door is refused, whatever token the caller is holding.
 *
 * ⚠ TWO COOKIES CARRY TWO DIFFERENT THINGS AND CONFLATING THEM IS THE WHOLE
 *   SECURITY MODEL.
 *
 *   Supabase's own cookies  the AUTHENTICATED IDENTITY. Signed by Supabase,
 *                           validated by `getUser()` against their API on
 *                           every request. We never mint or trust these
 *                           ourselves.
 *   Our session cookie      a session ROW ID. Opaque, and deliberately NOT
 *                           signed by us.
 *
 * The row id is not signed because it does not need to be: it is only ever
 * honoured when the row it names belongs to the user Supabase just
 * authenticated. Editing the cookie to another session's id yields a row
 * whose `user_id` is somebody else, the check in `resolveSession` fails, and
 * the request is refused. That cross-check is worth more than a signature,
 * because a signature only proves we issued the value — it does not prove the
 * bearer is the person it was issued to.
 *
 * 02 §3. Two doors, two cookie names, and no navigational path between them.
 */

export const TENANT_COOKIE = process.env.SESSION_COOKIE_TENANT ?? 'aLcassa_tenant_session';
export const PLATFORM_COOKIE = process.env.SESSION_COOKIE_PLATFORM ?? 'aLcassa_platform_session';

export type SessionKind = 'tenant' | 'platform' | 'support';

/** 04 §6. Absolute, not sliding. A session that renews itself never ends. */
const SESSION_LIFETIME_HOURS = 12;

export function cookieNameFor(kind: SessionKind): string {
  return kind === 'platform' ? PLATFORM_COOKIE : TENANT_COOKIE;
}

/**
 * The cookie options every session cookie is set with.
 *
 * `httpOnly` so script cannot read it, `sameSite: 'lax'` so it survives a
 * top-level navigation back from an email link but not a cross-site POST, and
 * `secure` everywhere except local development, where there is no HTTPS to
 * be secure over.
 */
export function sessionCookieOptions(expiresAt: Date) {
  return {
    path: '/',
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
  };
}

export type CreateSessionInput = {
  userId: string;
  kind: SessionKind;
  tenantId?: string | null;
  effectiveRole?: string | null;
  requestId: string;
};

/**
 * Opens a session row and returns it. The caller sets the cookie, because
 * only the caller knows which response it belongs on.
 *
 * The user agent and IP are read here rather than passed in, so that every
 * session row records them and no call site can forget. They are what makes
 * the sessions list in the dashboard legible: "Chrome on Windows, Nairobi,
 * two hours ago" is recognisable to the person deciding whether to revoke it,
 * and a row of identifiers is not.
 */
export async function createSession(input: CreateSessionInput): Promise<Session> {
  const headerList = await headers();
  const expiresAt = new Date(Date.now() + SESSION_LIFETIME_HOURS * 60 * 60 * 1000);

  return withActorContext(input.userId, input.requestId, async (tx) => {
    const [row] = await tx
      .insert(sessions)
      .values({
        userId: input.userId,
        kind: input.kind,
        tenantId: input.tenantId ?? null,
        effectiveRole: input.effectiveRole ?? null,
        userAgent: headerList.get('user-agent'),
        // 07 §1. Behind Vercel the client address is the first entry in
        // x-forwarded-for; the remaining entries are proxies and recording
        // them would make the sessions list unreadable.
        ipAddress: headerList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
        lastActivityAt: new Date(),
        expiresAt,
      })
      .returning();

    if (!row) throw new Error('The session row could not be created.');
    return row;
  });
}

/**
 * ⚠ THE CHECK THAT MAKES AN UNSIGNED COOKIE SAFE.
 *
 * `authenticatedUserId` must come from `supabase.auth.getUser()` — which
 * revalidates the token against Supabase — and never from the cookie being
 * resolved. The session is honoured only if the row belongs to that user, so
 * swapping the cookie for another session's id refuses rather than
 * impersonates.
 *
 * Returns null for every failure rather than throwing, because the four
 * reasons a session is not usable — absent, revoked, expired, someone
 * else's — all mean the same thing to the caller: sign in again. Naming which
 * one to the client would tell an attacker whether a guessed id exists.
 */
export async function resolveSession(
  sessionId: string,
  authenticatedUserId: string,
  requestId: string,
): Promise<Session | null> {
  if (!isUuid(sessionId)) return null;

  return withActorContext(authenticatedUserId, requestId, async (tx) => {
    const [row] = await tx.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);

    if (!row) return null;
    // Belt and braces: `sessions_select` already scopes to the actor, so a
    // row belonging to someone else does not come back at all. This survives
    // that policy being loosened by someone who has not read this file.
    if (row.userId !== authenticatedUserId) return null;
    if (row.revokedAt) return null;
    if (row.expiresAt.getTime() <= Date.now()) return null;

    return row;
  });
}

/**
 * 04 §6. Last activity, updated on the request rather than on a timer.
 *
 * Deliberately fire-and-forget at the call site: a failed write here must
 * never fail the request it was decorating. It is a display value.
 */
export async function touchSession(
  sessionId: string,
  userId: string,
  requestId: string,
): Promise<void> {
  await withActorContext(userId, requestId, async (tx) => {
    await tx.update(sessions).set({ lastActivityAt: new Date() }).where(eq(sessions.id, sessionId));
  });
}

/**
 * End one session.
 *
 * ⚠ IT RETURNS WHETHER IT ACTUALLY ENDED ANYTHING, AND IT USED TO RETURN
 * `void`.
 *
 * The update matches on id alone, so an id belonging to somebody else, an id
 * that does not exist, and an id already revoked all produced the same outcome
 * as a successful revocation: zero rows, no error, and a caller free to report
 * success. The console's device list did exactly that — press "End session",
 * see no error, watch the row stay where it was.
 *
 * That is the same class of defect as a save that writes nothing and says
 * "Saved.", and it is worse here, because the reader pressing it believes they
 * have just locked somebody out.
 *
 * ⚠ THE `user_id` PREDICATE IS BELT AND BRACES, NOT THE GUARD. `sessions_modify`
 * admits only `user_id = app.current_actor_id()` (02_identity.sql), so a
 * foreign id was already matching nothing. The predicate is here so the
 * restriction is legible in the query a reader is looking at, rather than
 * known only to whoever has read the policy file.
 */
export async function revokeSession(
  sessionId: string,
  userId: string,
  requestId: string,
  reason: string,
): Promise<number> {
  return withActorContext(userId, requestId, async (tx) => {
    const rows = await tx
      .update(sessions)
      .set({ revokedAt: new Date(), revokedReason: reason })
      .where(
        and(eq(sessions.id, sessionId), eq(sessions.userId, userId), isNull(sessions.revokedAt)),
      )
      .returning({ id: sessions.id });

    return rows.length;
  });
}

/**
 * 07 §3. A password reset revokes every session for the user, and the sessions
 * screen offers "revoke all except this one".
 *
 * `exceptSessionId` is what separates the two: omit it after a password reset,
 * because the point is that nothing survives; pass the current session when a
 * user is clearing their other devices, because signing them out of the tab
 * they are using to do it is a hostile way to confirm the action worked.
 */
export async function revokeAllSessions(
  userId: string,
  requestId: string,
  reason: string,
  exceptSessionId?: string,
): Promise<number> {
  return withActorContext(userId, requestId, async (tx) => {
    const rows = await tx
      .update(sessions)
      .set({ revokedAt: new Date(), revokedReason: reason })
      .where(
        and(
          eq(sessions.userId, userId),
          isNull(sessions.revokedAt),
          exceptSessionId ? ne(sessions.id, exceptSessionId) : undefined,
        ),
      )
      .returning({ id: sessions.id });

    return rows.length;
  });
}

/** The sessions screen. Newest first, revoked and expired ones excluded. */
export async function listActiveSessions(userId: string, requestId: string): Promise<Session[]> {
  return withActorContext(userId, requestId, async (tx) =>
    tx
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.userId, userId),
          isNull(sessions.revokedAt),
          sql`${sessions.expiresAt} > now()`,
        ),
      )
      .orderBy(desc(sessions.lastActivityAt)),
  );
}

/** Reads the session id this request is carrying, for the given door. */
export async function readSessionCookie(kind: SessionKind): Promise<string | null> {
  const store = await cookies();
  return store.get(cookieNameFor(kind))?.value ?? null;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export type { Transaction };
