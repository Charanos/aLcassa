import 'server-only';
import { and, desc, eq, gte, isNull, lt, lte, or, sql } from 'drizzle-orm';
import {
  auditLog,
  invitations,
  plans,
  subscriptions,
  tenantMembers,
  tenantSettings,
  tenants,
  userProfiles,
} from '@/db/schema';
import { currentSessionOrNull } from '@/lib/auth/resolve';
import { listActiveSessions } from '@/lib/auth/session';
import { withTenantContext, type ResolvedContext } from '@/lib/db';
import { getEntitlementSnapshot } from '@/modules/entitlements';
import { AppError, ERROR_CODES } from '@/lib/errors';
import { describeAction, describeTarget } from '@/lib/console/auditVocabulary';
import { activityDate, decodeActivityCursor, encodeActivityCursor } from './activity';
import type {
  AccountModel,
  AccountSessionsModel,
  CompanyModel,
  TenantAuditKind,
  TenantAuditModel,
  EntitlementKey as SeamEntitlementKey,
  SubscriptionModel,
  TeamModel,
} from './data';

/**
 * The M2 half of the tenant read model, against the real database.
 *
 * ⚠ WHY THIS IS A SEPARATE FILE FROM `data.ts` RATHER THAN AN EDIT TO IT.
 *
 * `data.ts` is a fixture seam: every function there returns a designed shape
 * so the interface could be built and reviewed before any table existed. Three
 * of those shapes now have real tables behind them — team, account and
 * sessions — and the other seven do not.
 *
 * Editing `data.ts` in place would leave one file where some functions read a
 * database and some invent their answer, with nothing in a call site to say
 * which. Keeping the live readers here means the boundary is visible in the
 * import: a page reading from `./live` is reading the truth, and a page
 * reading from `./data` is not yet.
 *
 * ⚠ EACH ONE FALLS BACK TO THE FIXTURE WHEN THERE IS NO SESSION.
 *
 * That is not a hedge against failure — it is what keeps the review
 * deployment working. `/api/demo` hands out a cookie that names no real
 * session, so `currentSessionOrNull` answers null and the designed data is
 * shown instead. A signed-in person sees their own workspace; a reviewer
 * clicking the demo button sees the fixtures. Neither ever sees the other's.
 */

/** Two letters for the avatar. "Grace Wanjiku" → GW, "Brian" → BR. */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return (parts[0] ?? '').slice(0, 2).toUpperCase();
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
}

function formatDate(value: Date | null): string {
  if (!value) return '—';
  return value.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Relative time, and it stops at "days" on purpose. Beyond a week or so a
 * reader wants the date, not "43 days ago" — which they would have to do
 * arithmetic on to act.
 */
function relative(value: Date): string {
  const deltaMs = Date.now() - value.getTime();
  const minutes = Math.round(deltaMs / 60_000);
  if (minutes < 1) return 'Active now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  if (days <= 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  return formatDate(value);
}

/**
 * `/app/settings/team`, live.
 *
 * Seats counts active members PLUS pending invitations, per 08 §2 — the same
 * rule the entitlement guard enforces on the way in, read here from the same
 * counter rather than recomputed, so the number on the screen and the number
 * that refuses an invitation cannot disagree.
 */
export async function getLiveTeam(
  /** A context already resolved — the console's support door. Doc 24 · Stage 3. */
  given?: ResolvedContext,
): Promise<TeamModel | null> {
  const ctx = given ?? (await currentSessionOrNull());
  if (!ctx) return null;

  const snapshot = await getEntitlementSnapshot(ctx);
  const seats = snapshot.byKey.seats;

  return withTenantContext(ctx, async (tx) => {
    const memberRows = await tx
      .select({
        id: tenantMembers.id,
        userId: tenantMembers.userId,
        role: tenantMembers.role,
        status: tenantMembers.status,
        joinedAt: tenantMembers.joinedAt,
        fullName: userProfiles.fullName,
        email: userProfiles.email,
      })
      .from(tenantMembers)
      .leftJoin(userProfiles, eq(userProfiles.id, tenantMembers.userId))
      .where(and(eq(tenantMembers.tenantId, ctx.tenantId), isNull(tenantMembers.deletedAt)))
      .orderBy(tenantMembers.createdAt);

    const invitationRows = await tx
      .select({
        id: invitations.id,
        email: invitations.email,
        role: invitations.role,
        createdAt: invitations.createdAt,
        expiresAt: invitations.expiresAt,
      })
      .from(invitations)
      .where(
        and(
          eq(invitations.tenantId, ctx.tenantId),
          isNull(invitations.acceptedAt),
          isNull(invitations.revokedAt),
        ),
      )
      .orderBy(desc(invitations.createdAt));

    return {
      members: memberRows.map((row) => ({
        id: row.id,
        name: row.fullName ?? 'Pending',
        email: row.email ?? '',
        role: row.role,
        // 03 §14: "Active" carries no badge — absence is the signal — so the
        // three states that DO earn one are the only ones mapped here.
        status: row.status,
        initials: initialsOf(row.fullName ?? '?'),
        joinedAt: formatDate(row.joinedAt),
      })),
      invitations: invitationRows.map((row) => ({
        id: row.id,
        email: row.email,
        role: row.role,
        sentAt: relative(row.createdAt),
        expiresAt: formatDate(row.expiresAt),
        // Sheet 12: an expired invitation is a state with a remedy, not an
        // error. It stays in the list so the owner can send a fresh one.
        status: row.expiresAt.getTime() <= Date.now() ? ('expired' as const) : ('pending' as const),
      })),
      seatsUsed: seats?.current ?? memberRows.length + invitationRows.length,
      seatsLimit: seats?.limit ?? null,
    };
  });
}

/**
 * `/app/settings/subscription`, live. 08 §8.
 *
 * ⚠ IT READS THE SAME SNAPSHOT THE GUARD READS, AND THAT IS THE POINT.
 *
 * The numbers on this screen come from `getEntitlementSnapshot` — the exact
 * function `checkEntitlement` consults before permitting an action. A second
 * query that recomputed usage for display would be a second source of truth,
 * and the failure it produces is the worst kind: a customer looking at "6 of
 * 10 seats" while the API refuses their seventh invitation, with both numbers
 * defensible and no way to tell which is wrong.
 *
 * The override reason is surfaced deliberately. 05 §5: "a customer who has
 * been granted extra seats should know it and should know it may expire."
 */
export async function getLiveSubscription(
  /** A context already resolved — the console's support door. Doc 24 · Stage 3. */
  given?: ResolvedContext,
): Promise<SubscriptionModel | null> {
  const ctx = given ?? (await currentSessionOrNull());
  if (!ctx) return null;

  const snapshot = await getEntitlementSnapshot(ctx);

  const [subscription] = await withTenantContext(ctx, async (tx) =>
    tx
      .select({
        status: subscriptions.status,
        currentPeriodEnd: subscriptions.currentPeriodEnd,
        cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd,
        planName: plans.name,
        planCode: plans.code,
      })
      .from(subscriptions)
      .innerJoin(plans, eq(plans.id, subscriptions.planId))
      .limit(1),
  );

  if (!subscription) return null;

  const entitlements = Object.values(snapshot.byKey).filter((e): e is NonNullable<typeof e> =>
    Boolean(e),
  );

  return {
    planName: subscription.planName,
    // The seam's model predates `paused` and `expired`; both read as
    // cancelled to it. The badge is the only consumer and it has no tone for
    // either, so narrowing here is honest rather than lossy — and 08 §7 puts
    // both on the same side of "this subscription is not currently running".
    status:
      subscription.status === 'active' ||
      subscription.status === 'trialing' ||
      subscription.status === 'past_due'
        ? subscription.status
        : 'cancelled',
    periodEnd: formatDate(subscription.currentPeriodEnd),
    entitlements: entitlements.map((e) => ({
      key: e.key as SeamEntitlementKey,
      label: e.displayName,
      kind: e.kind,
      current: e.current,
      limit: e.limit,
      // 08 §2. Retention is a span rather than a tally, so it reads with its
      // unit; every other key is a count and reads bare.
      ...(e.key === 'audit_retention_days' ? { unit: ' days' } : {}),
    })),
    overrides: entitlements
      .filter((e) => e.override !== null)
      .map((e) => ({
        key: e.key as SeamEntitlementKey,
        reason: e.override?.reason ?? '',
        expiresAt: e.override?.expiresAt ? formatDate(new Date(e.override.expiresAt)) : null,
        // The granting admin's name is a platform identity, and a tenant
        // reading its own plan page has no business enumerating who works
        // here. The relationship is with Andishi, not with an individual.
        grantedBy: 'Andishi support',
      })),
  };
}

/**
 * `/app/settings/company`, live. 02 §4.
 *
 * ⚠ THE NAME COMES FROM `tenants`, THE REST FROM `tenant_settings`.
 *
 * They are two tables on purpose: `tenants.name` is the workspace's identity
 * and appears in the console, in invitations and in every audit row, while
 * `tenant_settings.display_name` is what the customer would like shown to
 * their own people. Falling back from one to the other means a workspace that
 * has never opened this screen still renders a name rather than a blank.
 */
export async function getLiveCompany(
  /** A context already resolved — the console's support door. Doc 24 · Stage 3. */
  given?: ResolvedContext,
): Promise<CompanyModel | null> {
  const ctx = given ?? (await currentSessionOrNull());
  if (!ctx) return null;

  return withTenantContext(ctx, async (tx) => {
    const [tenant] = await tx
      .select({ name: tenants.name })
      .from(tenants)
      .where(eq(tenants.id, ctx.tenantId))
      .limit(1);

    const [settings] = await tx
      .select({
        displayName: tenantSettings.displayName,
        version: tenantSettings.version,
        logoPath: tenantSettings.logoPath,
        supportEmail: tenantSettings.supportEmail,
        timezone: tenantSettings.timezone,
        locale: tenantSettings.locale,
      })
      .from(tenantSettings)
      .where(eq(tenantSettings.tenantId, ctx.tenantId))
      .limit(1);

    return {
      name: settings?.displayName ?? tenant?.name ?? '',
      version: settings?.version ?? 0,
      /**
       * ⚠ THE PATH IS NOT A URL, AND IT IS NOT TURNED INTO ONE HERE.
       *
       * `logo_path` is a tenant-scoped Supabase Storage path. Rendering it
       * needs a signed URL, and signing is a write-adjacent operation that
       * belongs with the upload route landing at M5. Returning the raw path
       * as if it were a `src` would produce a broken image; null produces the
       * designed empty state, which is honest.
       */
      logoUrl: null,
      contactEmail: settings?.supportEmail ?? '',
      timezone: settings?.timezone ?? 'Africa/Nairobi',
      locale: !settings?.locale || settings.locale === 'en' ? 'en-KE' : settings.locale,
    };
  });
}

/**
 * `/app/settings/audit`, live. 09 §7.
 *
 * ⚠ THIS IS THE SCREEN THE TRANSPARENCY CLAIM IS MADE ON.
 *
 * "A tenant can see every time the platform entered their workspace, who it
 * was, why, and anything they changed while they were in there." That is a
 * promise about this list. It reads the tenant's own `audit_log` under their
 * own context, so what they see is exactly what the policies let them see —
 * there is no filtered or curated version.
 *
 * The retention limit comes from the entitlement rather than a constant: 08 §2
 * makes `audit_retention_days` a plan value, so a Custom tenant sees a year
 * and a Pro tenant sees thirty days from the same query.
 */
export async function getLiveTenantAudit(
  /** A context already resolved — the console's support door. Doc 24 · Stage 3. */
  given?: ResolvedContext,
  options: { cursor?: string } = {},
): Promise<TenantAuditModel | null> {
  const ctx = given ?? (await currentSessionOrNull());
  if (!ctx) return null;
  if (!['owner', 'admin', 'support'].includes(ctx.role))
    throw new AppError(ERROR_CODES.ROLE_NOT_PERMITTED);

  const now = new Date();
  let cursor;
  try {
    cursor = decodeActivityCursor(options.cursor, now);
  } catch {
    throw new AppError(ERROR_CODES.VALIDATION_FAILED, {
      message: 'This activity page link is invalid. Open Activity again to see the latest entries.',
    });
  }
  const asOf = cursor?.asOf ?? now;

  const snapshot = await getEntitlementSnapshot(ctx);
  const retention = snapshot.byKey.audit_retention_days;
  if (!retention) throw new AppError(ERROR_CODES.ENTITLEMENT_FEATURE_UNAVAILABLE);
  const retentionDays = retention.limit;
  // A caller may edit the cursor: retention always uses the current time.
  const cutoff = retentionDays === null ? null : new Date(now.getTime() - retentionDays * 86400000);

  return withTenantContext(ctx, async (tx) => {
    const [settings] = await tx
      .select({ timezone: tenantSettings.timezone, locale: tenantSettings.locale })
      .from(tenantSettings)
      .limit(1);
    const timezone = settings?.timezone ?? 'Africa/Nairobi';
    const locale = settings?.locale ?? 'en-KE';
    const rows = await tx
      .select({
        id: auditLog.id,
        occurredAt: auditLog.occurredAt,
        cursorAt: sql<string>`to_char(${auditLog.occurredAt} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`,
        actorLabel: auditLog.actorLabel,
        actorType: auditLog.actorType,
        supportMode: auditLog.supportMode,
        action: auditLog.action,
        entityType: auditLog.entityType,
        requestId: auditLog.requestId,
      })
      .from(auditLog)
      .where(
        and(
          lte(auditLog.occurredAt, asOf),
          cutoff ? gte(auditLog.occurredAt, cutoff) : undefined,
          cursor
            ? or(
                lt(auditLog.occurredAt, sql`${cursor.atWire}::timestamptz`),
                and(
                  eq(auditLog.occurredAt, sql`${cursor.atWire}::timestamptz`),
                  lt(auditLog.id, cursor.id),
                ),
              )
            : undefined,
        ),
      )
      .orderBy(desc(auditLog.occurredAt), desc(auditLog.id))
      .limit(51);

    const page = rows.slice(0, 50);
    const last = page[page.length - 1];

    return {
      source: 'live',
      timezone,
      cutoff: cutoff?.toISOString() ?? null,
      nextCursor:
        rows.length > 50 && last
          ? encodeActivityCursor({ at: last.occurredAt, atWire: last.cursorAt, id: last.id, asOf })
          : null,
      entries: page.map((row) => ({
        id: row.id,
        time: activityDate(row.occurredAt, timezone, locale),
        occurredAt: row.occurredAt.toISOString(),
        requestId: row.requestId,
        // 09 §7. A support visit is labelled as one. The flag is what makes
        // the customer's "show me every time you looked" filter possible, so
        // it decides the label rather than the action string does.
        actor: row.supportMode
          ? `${row.actorLabel ?? 'Platform'} · support`
          : (row.actorLabel ?? 'System'),
        kind: tenantAuditKindOf(row.action, row.supportMode),
        action: row.action,
        actionLabel: describeAction(row.action).label,
        target: describeTarget(row.entityType),
      })),
      retentionDays,
    };
  });
}

/** The five groups the activity screen filters by. Derived from the dotted
 *  action so a new one lands somewhere sensible rather than nowhere. */
function tenantAuditKindOf(action: string, supportMode: boolean): TenantAuditKind {
  if (supportMode) return 'support';
  if (action.startsWith('member.') || action.startsWith('invitation.')) return 'member';
  if (action.startsWith('credential.')) return 'credential';
  if (action.startsWith('rules.')) return 'rules';
  return 'settings';
}

/** `/app/account`, live. */
export async function getLiveAccount(): Promise<AccountModel | null> {
  const ctx = await currentSessionOrNull();
  if (!ctx) return null;

  return withTenantContext(ctx, async (tx) => {
    const [profile] = await tx
      .select({
        fullName: userProfiles.fullName,
        email: userProfiles.email,
        createdAt: userProfiles.createdAt,
      })
      .from(userProfiles)
      .where(eq(userProfiles.id, ctx.actorId))
      .limit(1);

    const [membership] = await tx
      .select({ role: tenantMembers.role, joinedAt: tenantMembers.joinedAt })
      .from(tenantMembers)
      .where(and(eq(tenantMembers.userId, ctx.actorId), eq(tenantMembers.tenantId, ctx.tenantId)))
      .limit(1);

    const name = profile?.fullName ?? ctx.actorLabel;

    return {
      profile: {
        name,
        email: profile?.email ?? '',
        role: membership?.role ?? 'agent',
        initials: initialsOf(name),
        // Tenure in THIS workspace, not account age. "Member since" on a
        // team page answers "how long have they been here", and the two
        // differ for anyone who joined a second workspace later.
        memberSince: formatDate(membership?.joinedAt ?? profile?.createdAt ?? null),
        // The resolver refuses an unverified account before this runs, so
        // reaching this line at all means it is verified.
        emailVerified: true,
      },
    };
  });
}

/**
 * `/app/account/sessions`, live.
 *
 * ⚠ THE CURRENT SESSION IS MARKED, NOT HIDDEN. Design sheet 09. A person
 * knows they are signed in on this device, so its absence from the list
 * reads as a bug rather than as tact.
 */
export async function getLiveAccountSessions(): Promise<AccountSessionsModel | null> {
  const ctx = await currentSessionOrNull();
  if (!ctx) return null;

  const rows = await listActiveSessions(ctx.actorId, ctx.requestId);

  return {
    sessions: rows.map((row) => ({
      id: row.id,
      device: describeAgent(row.userAgent),
      // No geolocation service is wired, and inventing "Nairobi, Kenya" from
      // an address would be a fabrication on a security screen — the one
      // place a wrong detail could talk someone out of revoking a session
      // that is not theirs. The address itself is a fact.
      location: row.ipAddress ?? 'Unknown location',
      lastActive: relative(row.lastActivityAt),
      current: row.id === ctx.sessionId,
    })),
  };
}

/**
 * A user agent string, reduced to the two facts a person needs to recognise
 * their own device: the browser and the platform.
 *
 * Deliberately crude. Full user-agent parsing is a dependency with a data
 * file that goes stale, and the cost of being wrong here is low — "Unknown
 * browser" next to a last-seen time and an address is still enough to decide
 * whether a session is yours.
 */
function describeAgent(userAgent: string | null): string {
  if (!userAgent) return 'Unknown device';

  const browser = /Edg\//.test(userAgent)
    ? 'Edge'
    : /OPR\//.test(userAgent)
      ? 'Opera'
      : /Chrome\//.test(userAgent)
        ? 'Chrome'
        : /Safari\//.test(userAgent)
          ? 'Safari'
          : /Firefox\//.test(userAgent)
            ? 'Firefox'
            : 'Unknown browser';

  const platform = /Windows/.test(userAgent)
    ? 'Windows'
    : /Android/.test(userAgent)
      ? 'Android'
      : /iPhone|iPad/.test(userAgent)
        ? 'iOS'
        : /Mac OS X/.test(userAgent)
          ? 'macOS'
          : /Linux/.test(userAgent)
            ? 'Linux'
            : null;

  return platform ? `${browser} on ${platform}` : browser;
}
