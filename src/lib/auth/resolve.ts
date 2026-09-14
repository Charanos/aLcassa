import 'server-only';
import { and, eq, isNull } from 'drizzle-orm';
import { headers } from 'next/headers';
import type { NextRequest } from 'next/server';
import { platformAdmins, tenantMembers, tenants, userProfiles } from '@/db/schema';
import { withActorContext } from '@/lib/db';
import { createResolvedContext } from '@/lib/db/context';
import type { ResolvedContext, TenantRole } from '@/lib/db/context';
import { AppError, ERROR_CODES } from '@/lib/errors';
import { createSupabaseServerClient } from './supabase/server';
import { readSessionCookie, resolveSession } from './session';

/**
 * 04 §2, stages 1 and 2. THE ONLY PLACE A ResolvedContext IS BORN.
 *
 * `createResolvedContext` is imported here and in the test harness and
 * nowhere else. Every tenant id in this application originates in one of the
 * functions below, and each one reads it from a membership row or a session
 * row — never from a body, a query string or a header. 06 §1.
 *
 * ⚠ THE ORDER OF THE THREE LOOKUPS IS THE SECURITY PROPERTY.
 *
 *   1. Supabase says WHO. `getUser()` revalidates the token against their
 *      API, so a forged or stale cookie fails here.
 *   2. Our session row says WHETHER THEY MAY STILL BE HERE. This is what
 *      revocation acts on; step 1 alone would honour a token we withdrew.
 *   3. The membership row says WHAT THEY ARE. The role comes from the
 *      database, never from the session cookie, so promoting yourself means
 *      writing to a table RLS will not let you write to.
 *
 * Doing 3 before 2 would let a revoked session still resolve a role. Doing 2
 * before 1 would trust a cookie to name its own owner.
 */

function ipOf(request: NextRequest): string | null {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
}

/**
 * ⚠ TWO ENTRY POINTS, ONE RESOLUTION. THE DUPLICATE WOULD HAVE BEEN THE BUG.
 *
 * A route handler is given a `NextRequest`. A Server Component and a Server
 * Action are not — they read the same cookies through `next/headers`
 * instead. That difference is purely about how the request is reachable, and
 * it must not become two implementations of who the caller is: the moment
 * they can disagree, one of them is a way to be somebody you are not.
 *
 * So `resolveSessionDoor` (routes) and `currentSession` (pages and actions)
 * are both thin wrappers over the same body below. The ONLY thing that
 * differs is where the caller's IP address is read from.
 */
export async function currentSession(requestId?: string): Promise<ResolvedContext> {
  const id = requestId ?? crypto.randomUUID();
  const headerList = await headers();
  return resolveSessionCore(headerList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null, id);
}

/**
 * The same, but answering null instead of throwing.
 *
 * A page that renders differently for a signed-out reader wants a value, not
 * an exception — and catching `AppError` at every call site to decide that
 * is how one of them ends up catching too much.
 */
export async function currentSessionOrNull(): Promise<ResolvedContext | null> {
  try {
    return await currentSession();
  } catch {
    return null;
  }
}

/**
 * The session door. `/api/v1/*`.
 */
export async function resolveSessionDoor(
  request: NextRequest,
  requestId: string,
): Promise<ResolvedContext> {
  return resolveSessionCore(ipOf(request), requestId);
}

async function resolveSessionCore(
  ipAddress: string | null,
  requestId: string,
): Promise<ResolvedContext> {
  const supabase = await createSupabaseServerClient();

  // ─ 1 · who ────────────────────────────────────────────────────────────────
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new AppError(ERROR_CODES.AUTH_SESSION_EXPIRED, {
      internal: { stage: 'supabase.getUser', reason: error?.message, name: error?.name, status: error?.status },
    });
  }
  const userId = data.user.id;

  // 07 §3. `auth.email_unverified` is a 403 rather than a 401: the credentials
  // were right, so telling them to sign in again would be a lie and they would
  // do it forever.
  if (!data.user.email_confirmed_at) {
    throw new AppError(ERROR_CODES.AUTH_EMAIL_UNVERIFIED);
  }

  // ─ 2 · may they still be here ─────────────────────────────────────────────
  const sessionId = await readSessionCookie('tenant');
  if (!sessionId) {
    throw new AppError(ERROR_CODES.AUTH_SESSION_EXPIRED, {
      internal: { stage: 'cookie', reason: 'no session cookie on the request' },
    });
  }

  const session = await resolveSession(sessionId, userId, requestId);
  if (!session) {
    throw new AppError(ERROR_CODES.AUTH_SESSION_EXPIRED, {
      internal: { stage: 'session-row', sessionId },
    });
  }

  // ─ 3 · what are they ──────────────────────────────────────────────────────
  const resolved = await withActorContext(userId, requestId, async (tx) => {
    const [membership] = await tx
      .select({
        tenantId: tenantMembers.tenantId,
        role: tenantMembers.role,
        status: tenantMembers.status,
      })
      .from(tenantMembers)
      .where(
        and(
          eq(tenantMembers.userId, userId),
          // A session pinned to a tenant must resolve THAT tenant. Without
          // this, a user in two workspaces would silently land in whichever
          // membership the planner returned first.
          session.tenantId ? eq(tenantMembers.tenantId, session.tenantId) : undefined,
          isNull(tenantMembers.deletedAt),
        ),
      )
      .limit(1);

    if (!membership) return null;

    const [profile] = await tx
      .select({ fullName: userProfiles.fullName })
      .from(userProfiles)
      .where(eq(userProfiles.id, userId))
      .limit(1);

    return { membership, fullName: profile?.fullName ?? data.user.email ?? 'Unknown' };
  });

  // 02 §11. Authenticated, but attached to nothing. A real state with a real
  // screen, not an error to be swallowed: it is what a member sees after their
  // last membership is removed while they are signed in.
  if (!resolved) {
    throw new AppError(ERROR_CODES.AUTH_NO_MEMBERSHIP, {
      internal: { userId },
    });
  }

  const { membership, fullName } = resolved;

  // 06 §5. A suspended member keeps their row and loses their access. The
  // status lives on the membership rather than on the session, so revoking it
  // takes effect on the next request without hunting down session rows.
  if (membership.status !== 'active') {
    throw new AppError(ERROR_CODES.AUTH_NO_MEMBERSHIP, {
      message: 'Your access to this workspace has been suspended. Its owner can restore it.',
      internal: { userId, status: membership.status },
    });
  }

  return createResolvedContext({
    tenantId: membership.tenantId,
    // The session's effective role wins ONLY for a support session, which is
    // the one case where the actor is deliberately acting as something other
    // than their own membership. 09 §4.
    role: (session.kind === 'support'
      ? (session.effectiveRole ?? 'support')
      : membership.role) as TenantRole,
    actorId: userId,
    actorLabel: fullName,
    actorType: 'user',
    supportMode: session.kind === 'support',
    requestId,
    ipAddress,
    sessionId: session.id,
  });
}

/**
 * The platform door. `/api/platform/v1/*` and the owner console.
 *
 * ⚠ IT RESOLVES NO TENANT, AND THAT IS THE POINT. A platform admin browsing
 * the console is not inside anybody's workspace; entering one is a separate,
 * audited act that mints a SUPPORT SESSION with a real tenant id and an
 * absolute expiry (09 §3). Until then there is nothing for RLS to scope to,
 * so `tenantId` is empty and every tenant-scoped policy matches nothing —
 * which is the correct default for the most privileged actor in the system.
 */
export async function currentPlatformSession(requestId?: string): Promise<ResolvedContext> {
  const id = requestId ?? crypto.randomUUID();
  const headerList = await headers();
  return resolvePlatformCore(headerList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null, id);
}

/** Null rather than throwing, for a console page that renders a sign-in
 *  prompt instead of an error. Same reasoning as `currentSessionOrNull`. */
export async function currentPlatformSessionOrNull(): Promise<ResolvedContext | null> {
  try {
    return await currentPlatformSession();
  } catch {
    return null;
  }
}

export async function resolvePlatformDoor(
  request: NextRequest,
  requestId: string,
): Promise<ResolvedContext> {
  return resolvePlatformCore(ipOf(request), requestId);
}

async function resolvePlatformCore(
  ipAddress: string | null,
  requestId: string,
): Promise<ResolvedContext> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new AppError(ERROR_CODES.AUTH_SESSION_EXPIRED, {
      internal: { stage: 'supabase.getUser', door: 'platform', reason: error?.message, name: error?.name, status: error?.status },
    });
  }
  const userId = data.user.id;

  const sessionId = await readSessionCookie('platform');
  if (!sessionId) {
    throw new AppError(ERROR_CODES.AUTH_SESSION_EXPIRED, {
      internal: { stage: 'cookie', door: 'platform' },
    });
  }

  const session = await resolveSession(sessionId, userId, requestId);
  if (!session || session.kind !== 'platform') {
    throw new AppError(ERROR_CODES.AUTH_SESSION_EXPIRED, {
      internal: { stage: 'session-row', door: 'platform', kind: session?.kind },
    });
  }

  const admin = await withActorContext(userId, requestId, async (tx) => {
    const [row] = await tx
      .select({ id: platformAdmins.id, displayName: platformAdmins.displayName })
      .from(platformAdmins)
      .where(and(eq(platformAdmins.userId, userId), isNull(platformAdmins.deletedAt)))
      .limit(1);
    return row ?? null;
  });

  // A tenant user holding a platform cookie is not an error worth explaining.
  // 07 §1: the console is not visible to them, so it is a 404-shaped refusal
  // rather than a 403 that confirms the console exists.
  if (!admin) {
    throw new AppError(ERROR_CODES.SUPPORT_NOT_PERMITTED, {
      message: 'This area is not available to your account.',
      internal: { userId, reason: 'no platform_admins row' },
    });
  }

  return createResolvedContext({
    tenantId: '',
    role: 'owner',
    actorId: userId,
    actorLabel: admin.displayName,
    actorType: 'platform_admin',
    supportMode: false,
    requestId,
    ipAddress,
    sessionId: session.id,
  });
}

/**
 * 02 §11. Which workspaces this person belongs to.
 *
 * Read at sign-in to decide where to send them, and by the workspace switcher.
 * It is the one membership query that deliberately spans tenants, which the
 * `tenant_members_select` own-membership branch permits and nothing wider.
 */
export async function membershipsFor(
  userId: string,
  requestId: string,
): Promise<
  Array<{ tenantId: string; slug: string; name: string; role: TenantRole; status: string }>
> {
  return withActorContext(userId, requestId, async (tx) => {
    const rows = await tx
      .select({
        tenantId: tenantMembers.tenantId,
        role: tenantMembers.role,
        status: tenantMembers.status,
        slug: tenants.slug,
        name: tenants.name,
      })
      .from(tenantMembers)
      .innerJoin(tenants, eq(tenants.id, tenantMembers.tenantId))
      .where(and(eq(tenantMembers.userId, userId), isNull(tenantMembers.deletedAt)));

    return rows.map((row) => ({
      tenantId: row.tenantId,
      slug: row.slug,
      name: row.name,
      role: row.role,
      status: row.status,
    }));
  });
}

/** Is this user a platform admin? Read at sign-in to choose the door. */
export async function isPlatformAdmin(userId: string, requestId: string): Promise<boolean> {
  return withActorContext(userId, requestId, async (tx) => {
    const [row] = await tx
      .select({ id: platformAdmins.id })
      .from(platformAdmins)
      .where(and(eq(platformAdmins.userId, userId), isNull(platformAdmins.deletedAt)))
      .limit(1);
    return Boolean(row);
  });
}
