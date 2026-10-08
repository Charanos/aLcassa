import 'server-only';
import { createSupabaseServerClient } from './supabase/server';
import { readSessionCookie, resolveSession } from './session';
import { AppError, ERROR_CODES } from '@/lib/errors';
import type { EmailPurpose } from './emailLink';
import { and, eq, isNull, inArray, sql } from 'drizzle-orm';
import { sessions } from '@/db/schema';
import { withActorContext } from '@/lib/db';

/** Email setup has a short-lived, identity-bound session that cannot open either application door. */
export async function requireEmailSession(purpose: EmailPurpose, requestId: string) {
  const supabase = await createSupabaseServerClient();
  const identity = await supabase.auth.getUser();
  const user = identity.data.user;
  const sessionId = await readSessionCookie('recovery');
  if (identity.error || !user?.email_confirmed_at || !sessionId)
    throw new AppError(ERROR_CODES.AUTH_SESSION_EXPIRED);
  const session = await resolveSession(sessionId, user.id, requestId);
  if (session?.kind === 'recovery' && session.effectiveRole === `${purpose}:updating`)
    throw new AppError(ERROR_CODES.AUTH_FLOW_IN_PROGRESS);
  if (
    !session ||
    session.kind !== 'recovery' ||
    ![purpose, `${purpose}:password_saved`].includes(session.effectiveRole ?? '')
  )
    throw new AppError(ERROR_CODES.AUTH_SESSION_EXPIRED);
  return {
    user,
    session,
    supabase,
    passwordSaved: session.effectiveRole === `${purpose}:password_saved`,
  };
}

/** Serialize password writes for an account before calling the external identity provider. */
export async function claimEmailPasswordChange(
  sessionId: string,
  userId: string,
  purpose: EmailPurpose,
  requestId: string,
) {
  return withActorContext(userId, requestId, async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${userId}, 0))`);
    const pending = await tx
      .select({ id: sessions.id })
      .from(sessions)
      .where(
        and(
          eq(sessions.userId, userId),
          eq(sessions.kind, 'recovery'),
          inArray(sessions.effectiveRole, ['invite:updating', 'recovery:updating']),
          isNull(sessions.revokedAt),
          sql`${sessions.expiresAt} > now()`,
        ),
      )
      .limit(1);
    if (pending.length) throw new AppError(ERROR_CODES.AUTH_FLOW_IN_PROGRESS);
    const rows = await tx
      .update(sessions)
      .set({ effectiveRole: `${purpose}:updating`, updatedAt: new Date() })
      .where(
        and(
          eq(sessions.id, sessionId),
          eq(sessions.userId, userId),
          eq(sessions.kind, 'recovery'),
          eq(sessions.effectiveRole, purpose),
          isNull(sessions.revokedAt),
          sql`${sessions.expiresAt} > now()`,
        ),
      )
      .returning({ id: sessions.id });
    if (rows.length !== 1) throw new AppError(ERROR_CODES.AUTH_SESSION_EXPIRED);
  });
}

/** A definite provider refusal releases the claim; an uncertain network outcome does not. */
export async function releaseEmailPasswordChange(
  sessionId: string,
  userId: string,
  purpose: EmailPurpose,
  requestId: string,
) {
  return withActorContext(userId, requestId, (tx) =>
    tx
      .update(sessions)
      .set({ effectiveRole: purpose, updatedAt: new Date() })
      .where(
        and(
          eq(sessions.id, sessionId),
          eq(sessions.userId, userId),
          eq(sessions.kind, 'recovery'),
          eq(sessions.effectiveRole, `${purpose}:updating`),
          isNull(sessions.revokedAt),
        ),
      ),
  );
}

export async function markEmailPasswordSaved(
  sessionId: string,
  userId: string,
  purpose: EmailPurpose,
  requestId: string,
) {
  return withActorContext(userId, requestId, async (tx) => {
    const rows = await tx
      .update(sessions)
      .set({ effectiveRole: `${purpose}:password_saved`, updatedAt: new Date() })
      .where(
        and(
          eq(sessions.id, sessionId),
          eq(sessions.kind, 'recovery'),
          eq(sessions.userId, userId),
          eq(sessions.effectiveRole, `${purpose}:updating`),
          isNull(sessions.revokedAt),
        ),
      )
      .returning({ id: sessions.id });
    if (rows.length !== 1) throw new AppError(ERROR_CODES.AUTH_SESSION_EXPIRED);
  });
}
