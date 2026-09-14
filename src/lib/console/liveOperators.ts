import 'server-only';
import { and, desc, eq, gte, isNull, sql } from 'drizzle-orm';
import { platformAdmins, platformAuditLog, sessions, tenants, userProfiles } from '@/db/schema';
import { currentPlatformSessionOrNull } from '@/lib/auth/resolve';
import { withActorContext } from '@/lib/db';
import { PLATFORM_CAPABILITIES, SECURITY_POLICY } from './data';
import { avatarUrlFor } from '@/lib/storage/avatar';
import { describeAgent } from './userAgent';
import type { Admin, AdminRole, AdminsModel, DeviceSession, ProfileModel } from './data';

/**
 * How many device sessions the profile screen reads at once.
 *
 * Twelve was the old inline `.limit(12)`, chosen so a pathological account
 * cannot make the page slow. It is raised to a number a real person can
 * actually reach — someone who signs in from a phone, two laptops and a
 * borrowed machine, over a fortnight of eight-hour sessions — because the cap
 * is a safety valve, not a page size. The LIST pages at eight; this is the
 * query's ceiling, and whatever it excludes is counted and stated.
 */
const SESSION_CAP = 40;

/**
 * How many of the operator's own audit rows the profile reads.
 *
 * Eighteen, against a panel that pages at six: three pages of genuine history,
 * which is enough to recognise a week's work and far short of a log viewer. The
 * audit screen is the log viewer, and the panel links to it. The FIGURE beside
 * the panel counts the whole window, so this cap never understates the total.
 */
const ACTIVITY_CAP = 18;

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

  return withActorContext(ctx.actorId, ctx.requestId, async (tx) => {
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

  /* ⚠ NO FIXTURE IMPORT HERE ANY MORE. This reader used to pull the whole
     designed profile in to borrow one field — `fixture.security` — and that
     borrowed field was the invented account history described in `data.ts`.
     The checklist it needed is now a named export, `SECURITY_POLICY`, shared
     by both paths rather than smuggled from one into the other. */
  const now = new Date();

  return withActorContext(ctx.actorId, ctx.requestId, async (tx) => {
    const [me] = await tx
      .select({
        fullName: userProfiles.fullName,
        avatarPath: userProfiles.avatarPath,
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

    /**
     * ⚠ `expires_at > now()` IS NOT DECORATION, AND ITS ABSENCE WAS A DEFECT.
     *
     * This read filtered only on `revoked_at is null`, so a session that had
     * simply timed out — never revoked, no longer usable — was listed beside
     * the live ones under the heading "Devices currently signed into this
     * account". On the one screen an operator opens to answer "is something
     * else signed in as me", that is the worst available error: it manufactures
     * an intruder out of last Tuesday's laptop.
     *
     * `listActiveSessions` in `lib/auth/session.ts` has always had this
     * predicate. The two readers now agree.
     */
    const isLive = and(
      eq(sessions.userId, ctx.actorId),
      isNull(sessions.revokedAt),
      sql`${sessions.expiresAt} > now()`,
    );

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
      .where(isLive)
      .orderBy(desc(sessions.lastActivityAt))
      .limit(SESSION_CAP);

    /* The cap exists so one pathological account cannot make this page slow.
       It is counted rather than hidden: 18 §12 — a list that truncates must
       say so, and a reader hunting an unrecognised device is exactly the
       reader who must not be shown a silently shortened list. */
    const [sessionTotal] = await tx
      .select({ n: sql<number>`count(*)::int` })
      .from(sessions)
      .where(isLive);

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
      support: s.kind === 'support',
    }));

    /* Current device first, then most recent. The ordering above is recency
       alone, which puts the reader's own row wherever it happens to fall —
       and the first question this list answers is "which of these is me". */
    deviceSessions.sort((a, b) => Number(b.current ?? false) - Number(a.current ?? false));

    const actions30d = await tx
      .select({ n: sql<number>`count(*)::int` })
      .from(platformAuditLog)
      .where(
        and(
          eq(platformAuditLog.actorUserId, ctx.actorId),
          gte(platformAuditLog.occurredAt, new Date(now.getTime() - WINDOW_MS)),
        ),
      );

    /**
     * The operator's own trail, newest first.
     *
     * ⚠ IT READS THE SAME TABLE THE COUNT ABOVE COUNTS, over the same window, so
     * the panel and the figure beside it can never disagree — which is the
     * failure the count alone invited: "412 by you" with no way to see them, and
     * nothing to check it against.
     *
     * ⚠ `leftJoin` ON THE TENANT, NOT A SECOND QUERY. Most platform actions are
     * workspace-targeted, and an action row naming a uuid rather than a customer
     * is unreadable on the one screen an operator opens to recognise their own
     * work. `target_tenant_id` is null for platform-wide actions and the join
     * yields null with it, which the row renders as the absence it is.
     */
    const recent = await tx
      .select({
        id: platformAuditLog.id,
        action: platformAuditLog.action,
        reason: platformAuditLog.reason,
        usedServiceRole: platformAuditLog.usedServiceRole,
        occurredAt: platformAuditLog.occurredAt,
        tenantName: tenants.name,
      })
      .from(platformAuditLog)
      .leftJoin(tenants, eq(tenants.id, platformAuditLog.targetTenantId))
      .where(
        and(
          eq(platformAuditLog.actorUserId, ctx.actorId),
          gte(platformAuditLog.occurredAt, new Date(now.getTime() - WINDOW_MS)),
        ),
      )
      .orderBy(desc(platformAuditLog.occurredAt))
      .limit(ACTIVITY_CAP);

    const total = sessionTotal?.n ?? deviceSessions.length;

    return {
      name,
      email: me.email ?? '—',
      /* ⚠ NULL, NOT FALSE. Verification state lives in `auth.users`, same
         guard as MFA. This reader used to answer `false`, which renders
         exactly like an address that was genuinely never confirmed — so the
         screen was making a claim about the operator's identity on the
         strength of not having looked. `null` says "not read from here", and
         the badge says it too. */
      emailVerified: null,
      initials: initialsOf(name),
      avatarUrl: avatarUrlFor(me.avatarPath),
      role: deriveRole(me),
      /* The grants, from the three columns this reader already selected and
         previously discarded into a role label. */
      capabilities: PLATFORM_CAPABILITIES.map((c) => ({
        ...c,
        granted:
          c.key === 'suspend'
            ? me.canSuspendTenants
            : c.key === 'rules'
              ? me.canEditMasterRules
              : me.canEnterSupportMode,
      })),
      /* The security checklist is POLICY rather than measurement; it is the
         same list whether this screen is live or drawn, and every item on it
         carries `measured: false` so the screen says which. */
      security: SECURITY_POLICY,
      sessions: deviceSessions,
      sessionsHidden: Math.max(0, total - deviceSessions.length),
      activity: recent.map((row) => ({
        id: row.id,
        action: row.action,
        target: row.tenantName,
        reason: row.reason,
        usedServiceRole: row.usedServiceRole,
        when: agoLabel(row.occurredAt ? new Date(row.occurredAt) : null, now),
      })),
      activityTotal: actions30d[0]?.n ?? recent.length,
      facts: [
        {
          label: 'Platform access granted',
          value: dateLabel(me.grantedOn ? new Date(me.grantedOn) : null),
        },
        { label: 'Active sessions', value: String(total) },
        { label: 'Platform actions, 30 days', value: String(actions30d[0]?.n ?? 0) },
      ],
    } satisfies ProfileModel;
  });
}
