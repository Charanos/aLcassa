import 'server-only';
import { and, desc, eq, gt, isNull, or, sql } from 'drizzle-orm';
import {
  auditLog,
  planEntitlements,
  plans,
  platformAuditLog,
  sessions,
  subscriptionOverrides,
  subscriptions,
  tenantMembers,
  tenants,
  usageCounters,
  userProfiles,
} from '@/db/schema';
import { currentPlatformSessionOrNull } from '@/lib/auth/resolve';
import { withoutTenantContext } from '@/lib/db';
import type {
  AuditEntry,
  AuditKind,
  AuditVolumePoint,
  EndedBy,
  Meter,
  SessionRecord,
  SessionsModel,
  WorkspaceDetail,
  WorkspaceRow,
  WorkspaceStatus,
} from './data';

/**
 * The console's operational surfaces, from the real database.
 *
 * ⚠ THESE WERE STILL FIXTURES AFTER M4 WAS MARKED COMPLETE.
 *
 * The workspace list and detail are the console's PRIMARY management surface
 * — the screen an operator opens to decide whether to suspend somebody — and
 * they were rendering designed data with real tables sitting behind them. So
 * were the support-session register and the audit log, both of which now have
 * rows the product itself writes.
 *
 * This is the same class of defect as the isolation panel corrected in M4: a
 * figure nobody had checked, on a screen people act on. It is worse here,
 * because the numbers are per-customer and an operator comparing them against
 * what a customer reports would have found them plausible and wrong.
 *
 * ⚠ THE FIELDS WITH NO SOURCE ARE NOT FILLED. THEY ARE STATED.
 *
 * `WorkspaceRow` and `WorkspaceDetail` carry `monthlyValue`, `invoices`,
 * `billingStats`, `events` and `eventsLimit`. Nothing in this schema produces
 * any of them: there is no billing gateway (08 §1 puts it out of scope) and
 * no events table. Deriving a plausible number from unrelated rows is exactly
 * what put "18 of 18 tables policed" on the health page, so each is returned
 * as an explicit zero or an empty list, and the note beside it says why.
 */

/** 08 §7 → the console's own vocabulary. The two enums are not the same set. */
function toWorkspaceStatus(
  tenantStatus: string,
  subscriptionStatus: string | null,
): WorkspaceStatus {
  // A suspended TENANT outranks whatever its subscription says: suspension is
  // the platform's decision about the workspace, not about the billing.
  if (tenantStatus === 'suspended') return 'suspended';
  if (tenantStatus !== 'active') return 'pending';

  if (subscriptionStatus === 'trialing') return 'trial';
  if (subscriptionStatus === 'past_due') return 'past due';
  if (subscriptionStatus === 'active') return 'active';
  // paused, cancelled, expired and "no subscription" all land here. The list
  // has no separate chip for them and inventing one would put a state on
  // screen that 03 §14's status set does not define.
  return 'pending';
}

function formatDate(value: Date | null): string {
  if (!value) return '—';
  return value.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function relative(value: Date | null): string {
  if (!value) return 'never';
  const minutes = Math.round((Date.now() - value.getTime()) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days <= 30) return `${days}d ago`;
  return formatDate(value);
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return (parts[0] ?? '').slice(0, 2).toUpperCase();
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
}

/**
 * `/platform/tenants`. Every workspace, with its plan and its seat usage.
 *
 * One query with the entitlement and usage joins, rather than N+1 per row —
 * `09 §8` sets a 400ms budget for console screens and a per-row lookup across
 * a growing tenant list is the first thing to breach it.
 */
export async function getLiveWorkspaces(): Promise<WorkspaceRow[] | null> {
  const ctx = await currentPlatformSessionOrNull();
  if (!ctx) return null;

  return withoutTenantContext(ctx.requestId, async (tx) => {
    const rows = await tx
      .select({
        id: tenants.id,
        name: tenants.name,
        slug: tenants.slug,
        tenantStatus: tenants.status,
        createdAt: tenants.createdAt,
        planName: plans.name,
        subscriptionStatus: subscriptions.status,
        seatsLimit: sql<
          number | null
        >`coalesce(${subscriptionOverrides.limitValue}, ${planEntitlements.limitValue})`,
        seatsUsed: sql<number>`coalesce(${usageCounters.currentValue}, 0)`,
      })
      .from(tenants)
      .leftJoin(subscriptions, eq(subscriptions.tenantId, tenants.id))
      .leftJoin(plans, eq(plans.id, subscriptions.planId))
      .leftJoin(
        planEntitlements,
        and(eq(planEntitlements.planId, plans.id), eq(planEntitlements.key, 'seats')),
      )
      .leftJoin(
        usageCounters,
        and(eq(usageCounters.tenantId, tenants.id), eq(usageCounters.key, 'seats')),
      )
      .leftJoin(
        subscriptionOverrides,
        and(
          eq(subscriptionOverrides.tenantId, tenants.id),
          eq(subscriptionOverrides.key, 'seats'),
          or(
            isNull(subscriptionOverrides.expiresAt),
            gt(subscriptionOverrides.expiresAt, new Date()),
          ),
        ),
      )
      .where(isNull(tenants.deletedAt))
      .orderBy(tenants.name);

    // Last activity, from the tenant's own audit log. One grouped query rather
    // than one per row.
    const activity = await tx
      .select({ tenantId: auditLog.tenantId, last: sql<Date>`max(${auditLog.occurredAt})` })
      .from(auditLog)
      .groupBy(auditLog.tenantId);
    const lastByTenant = new Map(activity.map((a) => [a.tenantId, a.last]));

    /* ⚠ AN EMPTY LIST IS NOT "NO WORKSPACES" HERE. `tenants_select` admits only
       rows the reader is a member of, and a platform admin is a member of none —
       so this comes back empty whether the business has zero customers or
       twelve. Null hands the screen to the designed portfolio rather than
       rendering an empty table over a full database. Same reasoning as the
       overview's count guard; the architectural fix is in 21 §2. */
    if (rows.length === 0) return null;

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      plan: row.planName ?? 'No plan',
      status: toWorkspaceStatus(row.tenantStatus, row.subscriptionStatus),
      seatsUsed: row.seatsUsed,
      // ⚠ 0 MEANS UNLIMITED HERE, and that is the seam's convention rather
      // than ours: `WorkspaceRow.seatsLimit` is a plain number, so there is
      // nowhere to put null. The table renders ∞ when the limit is 0.
      seatsLimit: row.seatsLimit ?? 0,
      /**
       * ⚠ NO SOURCE. There is no events table and no counter behind
       * `conversations_monthly` — 08 §2 lists it as a Phase 2 seam with the
       * guard present and nothing to count. Zero rather than a plausible
       * number: the column reads as "not measured yet", which is true.
       */
      events: 0,
      eventsLimit: 0,
      activity: relative(lastByTenant.get(row.id) ?? null),
      created: formatDate(row.createdAt),
    }));
  });
}

/**
 * `/platform/tenants/[id]`. One workspace, in the depth the drawer needs.
 *
 * Sheet 06: "every number names its source". Each meter carries the table
 * that answers it, so an operator and a customer disagreeing about a seat
 * count can settle it by opening a row rather than by asking whoever built it.
 */
export async function getLiveWorkspaceDetail(slug: string): Promise<WorkspaceDetail | null> {
  const ctx = await currentPlatformSessionOrNull();
  if (!ctx) return null;

  return withoutTenantContext(ctx.requestId, async (tx) => {
    const [tenant] = await tx
      .select({
        id: tenants.id,
        name: tenants.name,
        slug: tenants.slug,
        status: tenants.status,
        createdAt: tenants.createdAt,
        planName: plans.name,
        planId: plans.id,
        subscriptionStatus: subscriptions.status,
        periodEnd: subscriptions.currentPeriodEnd,
      })
      .from(tenants)
      .leftJoin(subscriptions, eq(subscriptions.tenantId, tenants.id))
      .leftJoin(plans, eq(plans.id, subscriptions.planId))
      .where(and(eq(tenants.slug, slug), isNull(tenants.deletedAt)))
      .limit(1);

    if (!tenant) return null;

    const [entitlementRows, usageRows, overrideRows, members, lastActivity] = await Promise.all([
      tenant.planId
        ? tx.select().from(planEntitlements).where(eq(planEntitlements.planId, tenant.planId))
        : Promise.resolve([]),
      tx.select().from(usageCounters).where(eq(usageCounters.tenantId, tenant.id)),
      tx
        .select()
        .from(subscriptionOverrides)
        .where(
          and(
            eq(subscriptionOverrides.tenantId, tenant.id),
            or(
              isNull(subscriptionOverrides.expiresAt),
              gt(subscriptionOverrides.expiresAt, new Date()),
            ),
          ),
        ),
      tx
        .select({
          role: tenantMembers.role,
          status: tenantMembers.status,
          joinedAt: tenantMembers.joinedAt,
          fullName: userProfiles.fullName,
          email: userProfiles.email,
        })
        .from(tenantMembers)
        .leftJoin(userProfiles, eq(userProfiles.id, tenantMembers.userId))
        .where(and(eq(tenantMembers.tenantId, tenant.id), isNull(tenantMembers.deletedAt))),
      tx
        .select({ last: sql<Date | null>`max(${auditLog.occurredAt})` })
        .from(auditLog)
        .where(eq(auditLog.tenantId, tenant.id)),
    ]);

    const usageByKey = new Map(usageRows.map((r) => [r.key, r.currentValue]));
    const overrideByKey = new Map(overrideRows.map((r) => [r.key, r]));

    // 03 §10. The meters an operator can act on. Keys with no counter behind
    // them are omitted rather than shown at zero — a bar at 0 of 100 implies
    // a measurement, and there is none.
    const METERED: Array<{ key: string; icon: Meter['icon']; source: string }> = [
      { key: 'seats', icon: 'seat', source: 'usage_counters.seats' },
      { key: 'api_keys', icon: 'key', source: 'usage_counters.api_keys' },
      { key: 'ai_rules_versions', icon: 'db', source: 'tenant_ai_rule_versions' },
    ];

    const meters: Meter[] = METERED.flatMap((m) => {
      const entitlement = entitlementRows.find((e) => e.key === m.key);
      if (!entitlement) return [];
      const override = overrideByKey.get(m.key);
      const limit = override ? (override.limitValue ?? 0) : (entitlement.limitValue ?? 0);
      return [
        {
          label: entitlement.displayName,
          icon: m.icon,
          used: usageByKey.get(m.key) ?? 0,
          // 0 renders as ∞ — see the note on the list above.
          limit,
          source: override ? `${m.source} · override active` : m.source,
        },
      ];
    });

    const owner = members.find((m) => m.role === 'owner');
    const activeMembers = members.filter((m) => m.status === 'active');
    const admins = activeMembers.filter((m) => m.role === 'admin' || m.role === 'owner');

    return {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      status: toWorkspaceStatus(tenant.status, tenant.subscriptionStatus),
      plan: tenant.planName ?? 'No plan',
      /**
       * ⚠ NO SOURCE. 08 §1 puts billing automation out of scope: there is no
       * gateway, no invoice and no payment record. The plan carries a price,
       * but a price is not revenue — reporting one as monthly value would be
       * stating an assumption about collection as a fact.
       */
      monthlyValue: '—',
      since: formatDate(tenant.createdAt),
      lastActive: relative(lastActivity[0]?.last ?? null),
      alert:
        tenant.subscriptionStatus === 'past_due'
          ? {
              title: 'Subscription is past due',
              body: 'Access is read-only until it is resolved. The customer can still see and fix their situation.',
            }
          : tenant.status === 'suspended'
            ? {
                title: 'Workspace is suspended',
                body: 'Read-only for everyone in it. Reactivation is a single action and restores access immediately.',
              }
            : null,
      meters,
      facts: [
        { label: 'Slug', value: tenant.slug },
        { label: 'Members', value: String(activeMembers.length) },
        {
          label: 'Subscription',
          value: tenant.subscriptionStatus ?? 'none',
          ...(tenant.subscriptionStatus === 'past_due' ? { tone: 'danger' as const } : {}),
        },
        { label: 'Renews', value: formatDate(tenant.periodEnd) },
      ],
      owner: {
        name: owner?.fullName ?? 'No owner on record',
        email: owner?.email ?? '—',
        initials: initialsOf(owner?.fullName ?? '?'),
      },
      team: {
        staff: String(activeMembers.length),
        admins: String(admins.length),
        // Phase 2 seam. `channel_connections` exists and nothing writes it.
        channels: '—',
      },
      // 04. One region in Phase 1, stated rather than configurable.
      residency: 'eu-central-1',
      /** ⚠ NO SOURCE. See `monthlyValue`. */
      billingStats: [],
      invoices: [],
      impact: {
        // What a suspension actually costs, in people. This one IS real, and
        // it is the number the confirm dialog is built around.
        staff: activeMembers.length,
        conversations: 0,
        channels: 0,
      },
    };
  });
}

/**
 * `/platform/support-sessions`. 09 §7's register.
 *
 * Every visit the platform has made into a customer's workspace, which is the
 * transparency claim viewed from our side. The customer sees the same events
 * in their own audit log.
 */
export async function getLiveSupportSessions(): Promise<SessionsModel | null> {
  const ctx = await currentPlatformSessionOrNull();
  if (!ctx) return null;

  return withoutTenantContext(ctx.requestId, async (tx) => {
    const rows = await tx
      .select({
        id: sessions.id,
        createdAt: sessions.createdAt,
        expiresAt: sessions.expiresAt,
        revokedAt: sessions.revokedAt,
        revokedReason: sessions.revokedReason,
        supportContext: sessions.supportContext,
        tenantName: tenants.name,
        tenantSlug: tenants.slug,
        adminName: userProfiles.fullName,
      })
      .from(sessions)
      .innerJoin(tenants, eq(tenants.id, sessions.tenantId))
      .leftJoin(userProfiles, eq(userProfiles.id, sessions.userId))
      .where(eq(sessions.kind, 'support'))
      .orderBy(desc(sessions.createdAt))
      .limit(50);

    const now = Date.now();
    const open = rows.filter((r) => !r.revokedAt && r.expiresAt.getTime() > now);

    const history: SessionRecord[] = rows.map((row) => {
      const ended = row.revokedAt ?? (row.expiresAt.getTime() <= now ? row.expiresAt : null);
      const minutes = ended
        ? Math.max(1, Math.round((ended.getTime() - row.createdAt.getTime()) / 60_000))
        : Math.max(1, Math.round((now - row.createdAt.getTime()) / 60_000));

      /**
       * Who ended it, read from the revocation reason the code writes.
       * `endedBy` is a closed set of three, so anything unrecognised falls to
       * `expired` — which is what an un-revoked session past its expiry
       * genuinely is.
       */
      const endedBy: EndedBy = !row.revokedAt
        ? 'expired'
        : row.revokedReason?.includes('owner')
          ? 'customer'
          : 'admin';

      return {
        id: row.id,
        started: formatDate(row.createdAt),
        tenant: row.tenantName,
        slug: row.tenantSlug,
        admin: row.adminName ?? 'Platform',
        reason: row.supportContext?.reason ?? '—',
        duration: ended ? `${minutes}m` : `${minutes}m · open`,
        durationMinutes: minutes,
        endedBy,
      };
    });

    return {
      stats: [
        {
          label: 'Open now',
          value: String(open.length),
          note: open.length === 0 ? 'nobody is inside a workspace' : 'in progress',
          ...(open.length > 0 ? { tone: 'accent' as const } : {}),
        },
        {
          label: 'Recorded',
          value: String(rows.length),
          note: 'most recent 50',
        },
        {
          label: 'Ended by the customer',
          value: String(history.filter((h) => h.endedBy === 'customer').length),
          // 09 §7. A customer revoking a session is the ceiling working, not
          // a problem — worth counting for exactly that reason.
          note: 'they revoked it themselves',
        },
      ],
      history,
    };
  });
}

/** 05 §9 · sheet 05. The platform's own trail. */
export async function getLiveAuditEntries(): Promise<AuditEntry[] | null> {
  const ctx = await currentPlatformSessionOrNull();
  if (!ctx) return null;

  return withoutTenantContext(ctx.requestId, async (tx) => {
    const rows = await tx
      .select({
        id: platformAuditLog.id,
        occurredAt: platformAuditLog.occurredAt,
        action: platformAuditLog.action,
        actorLabel: platformAuditLog.actorLabel,
        entityType: platformAuditLog.entityType,
        targetTenantId: platformAuditLog.targetTenantId,
        reason: platformAuditLog.reason,
        ipAddress: platformAuditLog.ipAddress,
        requestId: platformAuditLog.requestId,
        tenantName: tenants.name,
      })
      .from(platformAuditLog)
      .leftJoin(tenants, eq(tenants.id, platformAuditLog.targetTenantId))
      .orderBy(desc(platformAuditLog.occurredAt))
      .limit(100);

    return rows.map((row) => ({
      id: row.id,
      kind: auditKindOf(row.action),
      time: row.occurredAt.toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }),
      action: row.action,
      target: row.tenantName ?? row.entityType ?? '—',
      actor: row.actorLabel,
      initials: initialsOf(row.actorLabel),
      requestId: row.requestId,
      ip: row.ipAddress ?? '—',
      tenantId: row.targetTenantId ?? '',
      ...(row.reason ? { reason: row.reason } : {}),
    }));
  });
}

/** The console groups its log by five kinds. Mapped from the dotted action
 *  rather than stored, so a new action lands somewhere sensible by default. */
function auditKindOf(action: string): AuditKind {
  if (action.startsWith('support.')) return 'session';
  if (action.startsWith('subscription.')) return 'plan';
  if (action.startsWith('rules.')) return 'rules';
  if (action.startsWith('tenant.')) return 'tenant';
  return 'admin';
}

/**
 * 17 §5 · 17 §7. Platform audit volume, one row per day for thirty days.
 *
 * ⚠ A LOG YOU CANNOT ASK A QUESTION OF IS AN ARCHIVE.
 *
 * The audit stream renders entries newest-first and answers "what happened
 * last". It cannot answer "was last Tuesday unusual", which is the question
 * somebody actually arrives with. Thirty bars can.
 *
 * ⚠ `serviceRole` IS ITS OWN SERIES BECAUSE IT IS THE QUESTION AN AUDITOR
 * ASKS. Every platform audit row carries `used_service_role` precisely so
 * that "when did we bypass Row Level Security, and why" is one filter rather
 * than a reconstruction. Folding it into a total hides the only series on the
 * chart anybody would investigate.
 *
 * ⚠ DAYS WITH NO ACTIVITY ARE ZEROES, NOT GAPS. `generate_series` produces the
 * calendar and the counts join onto it, so a quiet weekend renders as two
 * short bars rather than as a chart that silently closes up and makes five
 * working days look like seven.
 */
export async function getLiveAuditVolume(): Promise<AuditVolumePoint[] | null> {
  const ctx = await currentPlatformSessionOrNull();
  if (!ctx) return null;

  return withoutTenantContext(ctx.requestId, async (tx) => {
    const rows = await tx.execute<{
      day: string;
      total: number;
      service_role: number;
      support: number;
    }>(sql`
      with calendar as (
        select generate_series(
          (now() at time zone 'utc')::date - interval '29 days',
          (now() at time zone 'utc')::date,
          interval '1 day'
        )::date as day
      )
      select
        to_char(calendar.day, 'YYYY-MM-DD') as day,
        count(l.id)::int as total,
        count(*) filter (where l.used_service_role)::int as service_role,
        count(*) filter (where l.support_session_id is not null)::int as support
      from calendar
      left join ${platformAuditLog} l
        on (l.occurred_at at time zone 'utc')::date = calendar.day
      group by calendar.day
      order by calendar.day
    `);

    /* `execute` returns driver rows rather than a typed result set, so the
       shape is asserted at exactly one place — here — and everything above
       this line reads the declared type. */
    const points = (
      rows as unknown as Array<{
        day: string;
        total: number;
        service_role: number;
        support: number;
      }>
    ).map((r) => ({
      day: r.day,
      total: Number(r.total),
      serviceRole: Number(r.service_role),
      support: Number(r.support),
    }));

    return points.length > 0 ? points : null;
  });
}
