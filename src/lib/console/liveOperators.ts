import 'server-only';
import { and, desc, eq, gte, isNull, sql } from 'drizzle-orm';
import { platformAdmins, platformAuditLog, sessions, tenants, userProfiles } from '@/db/schema';
import { currentPlatformSessionOrNull } from '@/lib/auth/resolve';
import { withoutTenantContext } from '@/lib/db';
import type { Admin, AdminRole, AdminsModel, DeviceSession, ProfileModel } from './data';

/**
 * The PEOPLE half of the console read model, against the real database.
 *
 * ⚠ WHY THIS IS A THIRD LIVE FILE.
 *
 * `live.ts` holds the M3 surfaces (plans, entitlements, isolation);
 * `liveWorkspaces.ts` holds the tenant and audit surfaces. Both are already
 * long, and neither is about operators. The split is by subject rather than by
 * size, so a reader looking for "where does the admin roster come from" has
 * one file to open.
 *
 * Same contract as its siblings: live first, `null` on no session, and the
 * designed fixture behind the review bypass.
 *
 * ⚠ WHAT THIS FILE REFUSES TO INVENT, and why each refusal is deliberate.
 *
 * The roster screen was drawn against a richer model than `platform_admins`
 * actually holds. Three fields have no source, and each one is reported as
 * absent rather than filled with something plausible:
 *
 *   1. ROLE. There is no role column. The table carries three capability
 *      booleans — suspend tenants, edit master rules, enter support mode — and
 *      every platform admin resolves to `role: 'owner'` in the RLS context
 *      regardless. The label below is DERIVED from the capabilities and says
 *      so; it is not read from a field that does not exist.
 *
 *   2. `owner` IS NEVER DERIVED. The obvious shortcut is to call the earliest
 *      row the owner. The earliest row is the earliest row. Treating creation
 *      order as authority is exactly the shape of defect that put "18 of 18
 *      tables protected" on the isolation panel when the real figure was
 *      fifteen, and this screen is read for the same reason that one was.
 *
 *   3. MFA. Enrolment lives in `auth.users`, behind the admin client, which is
 *      lint-guarded to `modules/platform` because it bypasses Row Level
 *      Security. `null` means not counted, and the chip must not render it as
 *      "off" — those are opposite claims about a colleague's account.
 *
 * `grantedBy` is not stored either. `grantedOn` is, and is real.
 */

/** 30 days, in milliseconds. The window every "recent" figure here uses. */
const WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * The role label, derived from what the table actually stores.
 *
 * Full capability is `platform_admin`. Anything narrower is `support`,
 * because the one capability that distinguishes a support operator is that
 * they can enter a workspace and cannot change the platform.
 */
function deriveRole(row: {
  canSuspendTenants: boolean;
  canEditMasterRules: boolean;
  canEnterSupportMode: boolean;
}): AdminRole {
  return row.canSuspendTenants && row.canEditMasterRules ? 'platform_admin' : 'support';
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0];
  const last = parts[parts.length - 1];
  if (!first || !last) return '??';
  if (parts.length === 1) return first.slice(0, 2).toUpperCase();
  return ((first[0] ?? '') + (last[0] ?? '')).toUpperCase();
}

/**
 * "Active now", "4h ago", "12 Aug".
 *
 * Relative inside a day, absolute past it. A relative label on something three
 * weeks old ("21 days ago") is arithmetic the reader has to undo to answer the
 * question they actually had, which is when.
 */
function agoLabel(at: Date | null, now: Date): string {
  if (!at) return 'Never';
  const ms = now.getTime() - at.getTime();
  if (ms < 5 * 60 * 1000) return 'Active now';
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return at.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function dateLabel(at: Date | null): string {
  if (!at) return '—';
  return at.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * 09 §6. The platform roster, from `platform_admins`.
 *
 * One query per fact rather than one joined query, deliberately: the roster is
 * four rows and will stay four rows — that is the lede of the page — so the
 * cost of three small queries is nothing against the cost of a join whose
 * grouping is wrong in a way nobody notices.
 */
export async function getLiveAdmins(): Promise<AdminsModel | null> {
  const ctx = await currentPlatformSessionOrNull();
  if (!ctx) return null;

  const fixture = await import('./data').then((m) => m.getAdmins());
  const now = new Date();
  const since = new Date(now.getTime() - WINDOW_MS);

  return withoutTenantContext(ctx.requestId, async (tx) => {
    const rows = await tx
      .select({
        id: platformAdmins.id,
        userId: platformAdmins.userId,
        displayName: platformAdmins.displayName,
        canSuspendTenants: platformAdmins.canSuspendTenants,
        canEditMasterRules: platformAdmins.canEditMasterRules,
        canEnterSupportMode: platformAdmins.canEnterSupportMode,
        grantedOn: platformAdmins.createdAt,
        fullName: userProfiles.fullName,
        email: userProfiles.email,
      })
      .from(platformAdmins)
      .leftJoin(userProfiles, eq(userProfiles.id, platformAdmins.userId))
      .where(isNull(platformAdmins.deletedAt))
      .orderBy(platformAdmins.createdAt);

    if (rows.length === 0) return null;

    /* Sessions opened in the window, and the most recent activity, per
       operator. `kind = 'platform'` excludes the support sessions they open
       INTO a workspace — those are a different question, answered on
       /platform/support-sessions. */
    const activity = await tx
      .select({
        userId: sessions.userId,
        opened: sql<number>`count(*)::int`,
        lastSeen: sql<Date | null>`max(${sessions.lastActivityAt})`,
      })
      .from(sessions)
      .where(and(eq(sessions.kind, 'platform'), gte(sessions.createdAt, since)))
      .groupBy(sessions.userId);

    const byUser = new Map(activity.map((a) => [a.userId, a]));

    const admins: Admin[] = rows.map((r) => {
      const name = r.fullName ?? r.displayName;
      const seen = byUser.get(r.userId);
      return {
        id: r.id,
        name,
        email: r.email ?? '—',
        initials: initialsOf(name),
        role: deriveRole(r),
        lastSeen: agoLabel(seen?.lastSeen ? new Date(seen.lastSeen) : null, now),
        sessions30d: seen?.opened ?? 0,
        mfa: null,
        grantedBy: '—',
        grantedOn: dateLabel(r.grantedOn ? new Date(r.grantedOn) : null),
        you: r.userId === ctx.actorId,
      };
    });

    /*
      ⚠ PLATFORM ADMIN INVITATIONS DO NOT EXIST AS A RECORD.

      `invitations` is tenant-scoped — every row carries a `tenant_id` and a
      member role — so it cannot hold "invite someone to the platform". The
      fixture shows two pending invitations; live shows none, because none can
      exist. Wiring the invite control is 17 §6.3 and it needs a table first.
    */
    return {
      admins,
      invitations: [],
      /* The capability matrix is a statement about the ROLES, not about these
         four rows, so it is the same table whether the roster is live or
         drawn. It changes when the role model changes, which is a code change
         and a document change together. */
      capabilities: fixture.capabilities,
    } satisfies AdminsModel;
  });
}

/**
 * The signed-in operator's own profile.
 *
 * ⚠ THE DEVICE LIST IS THE ONLY PART OF THIS SCREEN THAT CAN ACT, and it is
 * the part that was a list of rows that could not be revoked.
 *
 * A session here is a ROW, so ending one takes effect on the very next
 * request rather than whenever a token happens to expire — the same property
 * the tenant application's session list relies on. The rows are real as of
 * this reader; the revoke control is wired in 17 §6.3.
 */
export async function getLiveProfile(): Promise<ProfileModel | null> {
  const ctx = await currentPlatformSessionOrNull();
  if (!ctx) return null;

  const fixture = await import('./data').then((m) => m.getProfile());
  const now = new Date();

  return withoutTenantContext(ctx.requestId, async (tx) => {
    const [me] = await tx
      .select({
        fullName: userProfiles.fullName,
        email: userProfiles.email,
        displayName: platformAdmins.displayName,
        canSuspendTenants: platformAdmins.canSuspendTenants,
        canEditMasterRules: platformAdmins.canEditMasterRules,
        canEnterSupportMode: platformAdmins.canEnterSupportMode,
        grantedOn: platformAdmins.createdAt,
      })
      .from(platformAdmins)
      .leftJoin(userProfiles, eq(userProfiles.id, platformAdmins.userId))
      .where(and(eq(platformAdmins.userId, ctx.actorId), isNull(platformAdmins.deletedAt)))
      .limit(1);

    if (!me) return null;

    const live = await tx
      .select({
        id: sessions.id,
        kind: sessions.kind,
        userAgent: sessions.userAgent,
        ipAddress: sessions.ipAddress,
        lastActivityAt: sessions.lastActivityAt,
        tenantName: tenants.name,
      })
      .from(sessions)
      .leftJoin(tenants, eq(tenants.id, sessions.tenantId))
      .where(and(eq(sessions.userId, ctx.actorId), isNull(sessions.revokedAt)))
      .orderBy(desc(sessions.lastActivityAt))
      .limit(12);

    const name = me.fullName ?? me.displayName;

    const deviceSessions: DeviceSession[] = live.map((s) => ({
      id: s.id,
      device: describeAgent(s.userAgent),
      /* The IP is shown because a session the operator does not recognise is
         the whole reason this list exists, and a device string alone cannot
         tell two identical laptops apart. A support session names the
         workspace instead: which customer matters more than which browser. */
      meta:
        s.kind === 'support' && s.tenantName
          ? `Support session · ${s.tenantName}`
          : (s.ipAddress ?? 'Address not recorded'),
      when: agoLabel(s.lastActivityAt ? new Date(s.lastActivityAt) : null, now),
      current: s.id === ctx.sessionId,
    }));

    const actions30d = await tx
      .select({ n: sql<number>`count(*)::int` })
      .from(platformAuditLog)
      .where(
        and(
          eq(platformAuditLog.actorUserId, ctx.actorId),
          gte(platformAuditLog.occurredAt, new Date(now.getTime() - WINDOW_MS)),
        ),
      );

    return {
      name,
      email: me.email ?? '—',
      /* Verification state lives in `auth.users`, same guard as MFA. The
         fixture's `true` is a claim this reader cannot make, and an unverified
         address rendered as verified is worse than an unanswered question. */
      emailVerified: false,
      initials: initialsOf(name),
      role: deriveRole(me),
      /* The security checklist is advice rather than measurement; it is the
         same list whether this screen is live or drawn. */
      security: fixture.security,
      sessions: deviceSessions,
      facts: [
        { label: 'Platform access granted', value: dateLabel(me.grantedOn ? new Date(me.grantedOn) : null) },
        { label: 'Active sessions', value: String(deviceSessions.length) },
        { label: 'Platform actions, 30 days', value: String(actions30d[0]?.n ?? 0) },
      ],
    } satisfies ProfileModel;
  });
}

/**
 * A user agent string, reduced to the two facts a person recognises.
 *
 * Deliberately crude. A full parser is a dependency and a maintenance burden
 * for a label whose only job is to let someone say "that is not my machine".
 */
function describeAgent(ua: string | null): string {
  if (!ua) return 'Unknown device';
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /OPR\//.test(ua)
      ? 'Opera'
      : /Firefox\//.test(ua)
        ? 'Firefox'
        : /Chrome\//.test(ua)
          ? 'Chrome'
          : /Safari\//.test(ua)
            ? 'Safari'
            : 'Browser';
  const os = /Windows/.test(ua)
    ? 'Windows'
    : /Mac OS X|Macintosh/.test(ua)
      ? 'macOS'
      : /Android/.test(ua)
        ? 'Android'
        : /iPhone|iPad/.test(ua)
          ? 'iOS'
          : /Linux/.test(ua)
            ? 'Linux'
            : 'Unknown OS';
  return `${browser} on ${os}`;
}
