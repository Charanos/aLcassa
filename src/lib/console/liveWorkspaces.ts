import 'server-only';
import { classify, readSubscriptionInterval } from './revenue';
import { toWorkspaceContract } from './revenueModel';
import { and, desc, eq, gt, isNull, or, sql } from 'drizzle-orm';
import {
  planEntitlements,
  plans,
  platformAuditLog,
  subscriptionOverrides,
  subscriptions,
  tenants,
  usageCounters,
} from '@/db/schema';
import { currentPlatformSessionOrNull } from '@/lib/auth/resolve';
import {
  LEGACY_READS,
  READ_ACTIONS,
  describeTarget,
  natureOf,
  parseActor,
} from '@/lib/console/auditVocabulary';
import { withActorContext, type Transaction } from '@/lib/db';
import type {
  AuditEntry,
  AuditKind,
  AuditVolumePoint,
  Meter,
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
  if (tenantStatus === 'trial' && subscriptionStatus === null) return 'trial';
  if (tenantStatus !== 'active' && tenantStatus !== 'trial') return 'pending';

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

  /* As the operator: `tenants_select_operators` and the billing-record
     policies admit a platform admin (doc 24 · D1). Through
     `withoutTenantContext` this read nothing and the page showed designed
     workspaces — whose ids opened no support session. */
  return withActorContext(ctx.actorId, ctx.requestId, async (tx) => {
    const rows = await tx
      .select({
        id: tenants.id,
        name: tenants.name,
        slug: tenants.slug,
        tenantStatus: tenants.status,
        createdAt: tenants.createdAt,
        planName: plans.name,
        planId: plans.id,
        seatEntitlementId: planEntitlements.id,
        seatEntitlementKind: planEntitlements.kind,
        seatOverrideId: subscriptionOverrides.id,
        subscriptionStatus: subscriptions.status,
        seatsLimit: sql<
          number | null
        >`case when ${subscriptionOverrides.id} is not null then ${subscriptionOverrides.limitValue}
          else ${planEntitlements.limitValue} end`,
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

    // Last activity, from each tenant's own audit log — which operators do not
    // read — so through the summary function that returns one timestamp each.
    const summaries = await workspaceSummaries(
      tx,
      rows.map((r) => r.id),
    );
    const lastByTenant = new Map(
      [...summaries].map(([id, sum]) => [id, sum.lastActivity] as const),
    );

    // Operator SELECT policies now authorize this reader. Zero rows is a
    // valid empty portfolio; it must never inject the example workspaces.

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      plan: row.planName ?? 'No plan',
      status: toWorkspaceStatus(row.tenantStatus, row.subscriptionStatus),
      seatsUsed: row.seatsUsed,
      // Override presence, not coalesce: an explicit null overrides a finite cap.
      // Missing keys on a known plan deny capacity; no plan is unavailable.
      seatsLimit: row.seatOverrideId
        ? row.seatsLimit
        : !row.planId
          ? undefined
          : !row.seatEntitlementId
            ? 0
            : row.seatEntitlementKind === 'limit'
              ? row.seatsLimit
              : undefined,
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
      createdAt: row.createdAt.getTime(),
    }));
  });
}

export type WorkspaceSummary = {
  activeMembers: number;
  admins: number;
  ownerName: string | null;
  ownerEmail: string | null;
  lastActivity: Date | null;
};

/**
 * Counts, the owner's contact and the last activity for each workspace, from
 * `app.workspace_summaries` — the one door into member and audit data that an
 * operator has outside a support session, and it returns nothing else.
 */
export async function workspaceSummaries(
  tx: Transaction,
  ids: string[],
): Promise<Map<string, WorkspaceSummary>> {
  const out = new Map<string, WorkspaceSummary>();
  if (ids.length === 0) return out;
  const rows = (await tx.execute(sql`
    select tenant_id, active_members, admins, owner_name, owner_email, last_activity
    from app.workspace_summaries(ARRAY[${sql.join(
      ids.map((id) => sql`${id}::uuid`),
      sql`, `,
    )}]::uuid[])`)) as unknown as Array<{
    tenant_id: string;
    active_members: number;
    admins: number;
    owner_name: string | null;
    owner_email: string | null;
    last_activity: Date | string | null;
  }>;
  for (const r of rows) {
    out.set(r.tenant_id, {
      activeMembers: Number(r.active_members),
      admins: Number(r.admins),
      ownerName: r.owner_name,
      ownerEmail: r.owner_email,
      lastActivity: r.last_activity ? new Date(r.last_activity) : null,
    });
  }
  return out;
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

  /* As the operator (doc 24 · D1). Members and activity come through
     `workspaceSummaries`, not by reading the customer's member rows or log. */
  return withActorContext(ctx.actorId, ctx.requestId, async (tx) => {
    const [tenant] = await tx
      .select({
        id: tenants.id,
        name: tenants.name,
        slug: tenants.slug,
        status: tenants.status,
        createdAt: tenants.createdAt,
        planName: plans.name,
        planId: plans.id,
        planCode: plans.code,
        priceAmount: plans.priceAmount,
        intervalUnit: plans.intervalUnit,
        intervalCount: plans.intervalCount,
        provisionedAt: tenants.provisionedAt,
        suspendedAt: tenants.suspendedAt,
        tenantUpdatedAt: tenants.updatedAt,
        subscriptionStatus: subscriptions.status,
        periodStart: subscriptions.currentPeriodStart,
        periodEnd: subscriptions.currentPeriodEnd,
        trialEndsAt: subscriptions.trialEndsAt,
        pastDueSince: subscriptions.pastDueSince,
        contractAmount: subscriptions.contractAmount,
        cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd,
        cancelledAt: subscriptions.cancelledAt,
        subscriptionUpdatedAt: subscriptions.updatedAt,
      })
      .from(tenants)
      .leftJoin(subscriptions, eq(subscriptions.tenantId, tenants.id))
      .leftJoin(plans, eq(plans.id, subscriptions.planId))
      .where(and(eq(tenants.slug, slug), isNull(tenants.deletedAt)))
      .limit(1);

    if (!tenant) return null;

    const [entitlementRows, usageRows, overrideRows, summaries] = await Promise.all([
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
      workspaceSummaries(tx, [tenant.id]),
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
      const limit = override ? override.limitValue : entitlement.limitValue;
      return [
        {
          label: entitlement.displayName,
          icon: m.icon,
          used: usageByKey.get(m.key) ?? 0,
          // Null means unlimited; zero remains a real zero allowance.
          limit,
          source: override ? `${m.source} · override active` : m.source,
        },
      ];
    });

    /* Doc 25 · R1. The same classification the revenue screen runs, so this
       tab and the collection queue cannot disagree about one workspace. */
    const contract = classify(
      {
        tenantId: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
        tenantStatus: tenant.status,
        provisionedAt: tenant.provisionedAt ?? tenant.createdAt,
        suspendedAt:
          tenant.status === 'suspended' || tenant.status === 'closed'
            ? (tenant.suspendedAt ?? tenant.tenantUpdatedAt)
            : null,
        subscription: tenant.subscriptionStatus
          ? {
              status: tenant.subscriptionStatus,
              planCode: tenant.planCode ?? 'retired',
              planName: tenant.planName ?? 'a retired plan',
              listPrice: tenant.priceAmount ?? 0,
              intervalUnit: readSubscriptionInterval(tenant.intervalUnit),
              intervalCount: tenant.intervalCount ?? 1,
              contractAmount: tenant.contractAmount,
              trialEndsAt: tenant.trialEndsAt,
              pastDueSince: tenant.pastDueSince,
              stoppedAt:
                tenant.subscriptionStatus === 'cancelled'
                  ? (tenant.cancelledAt ?? tenant.subscriptionUpdatedAt)
                  : tenant.subscriptionStatus === 'expired' ||
                      tenant.subscriptionStatus === 'paused'
                    ? tenant.subscriptionUpdatedAt
                    : null,
              currentPeriodStart: tenant.periodStart,
              currentPeriodEnd: tenant.periodEnd,
              cancelAtPeriodEnd: tenant.cancelAtPeriodEnd ?? false,
            }
          : null,
      },
      new Date(),
    );
    const contractView = toWorkspaceContract(contract);

    const summary = summaries.get(tenant.id);
    const owner =
      summary?.ownerName || summary?.ownerEmail
        ? { fullName: summary.ownerName, email: summary.ownerEmail }
        : undefined;
    const activeMembers = { length: summary?.activeMembers ?? 0 };
    const admins = { length: summary?.admins ?? 0 };

    return {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      status: toWorkspaceStatus(tenant.status, tenant.subscriptionStatus),
      plan: tenant.planName ?? 'No plan',
      /**
       * CONTRACTED, labelled as such wherever it is drawn. 08 §1 puts billing
       * out of scope, so there is no payment record; what the subscription
       * commits the customer to is a fact, and doc 25 · R1 reports it as one.
       */
      monthlyValue:
        contract.monthly !== null && contract.standing !== 'stopped'
          ? `KES ${contract.monthly.toLocaleString('en-GB')} / month`
          : '—',
      since: formatDate(tenant.createdAt),
      lastActive: relative(summary?.lastActivity ?? null),
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
      residency: 'eu-west-1',
      /** ⚠ NO SOURCE. See `monthlyValue`. */
      billingStats: [],
      invoices: [],
      contract: contractView,
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

/** 05 §9 · sheet 05. The platform's own trail. */
export async function getLiveAuditEntries(tenantId?: string): Promise<AuditEntry[] | null> {
  const ctx = await currentPlatformSessionOrNull();
  if (!ctx) return null;

  /*
   * ⚠ `withActorContext`, NOT `withoutTenantContext` — AND THIS WAS WHY THE
   *   AUDIT LOG WAS EMPTY.
   *
   * `platform_audit_log` admits a row only when `app.current_actor_id()` is a
   * platform admin (07_audit.sql). `withoutTenantContext` sets the actor to
   * empty, so every row was filtered out — silently, because row-level
   * security filters rather than erroring. Signed in against a database
   * holding 297 entries in the window, the page reported none. Doc 23 A0.1;
   * `tests/console/audit-readers.test.ts` keeps it from coming back.
   *
   * ⚠ THE WINDOW, NOT THE LATEST HUNDRED. The volume chart above the stream
   * covers thirty days; this read stopped at a hundred rows, so the operators
   * band reported "97 of 100" beneath a chart counting 297. Both read the same
   * thirty Nairobi days now. The cap is a safety rail, not a page size.
   */
  return withActorContext(ctx.actorId, ctx.requestId, async (tx) => {
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
      .where(
        and(
          sql`${platformAuditLog.occurredAt} >= (date_trunc('day', now() at time zone 'Africa/Nairobi') - interval '29 days') at time zone 'Africa/Nairobi'`,
          tenantId ? eq(platformAuditLog.targetTenantId, tenantId) : undefined,
        ),
      )
      .orderBy(desc(platformAuditLog.occurredAt))
      .limit(AUDIT_WINDOW_CAP);

    return rows.map((row) => {
      const actor = parseActor(row.actorLabel);
      return {
        id: row.id,
        kind: auditKindOf(row.action),
        /* ⚠ NAIROBI, STATED. `toLocaleString` without a zone formats in the
           server's — UTC on Vercel — while Settings promised "rendered in your
           local zone". */
        time: EAT_ROW.format(row.occurredAt),
        at: row.occurredAt.toISOString(),
        day: EAT_DAY_KEY.format(row.occurredAt),
        action: row.action,
        target: row.tenantName ?? describeTarget(row.entityType),
        actor: actor.name,
        actorEmail: actor.email,
        initials: actor.initials,
        requestId: row.requestId,
        ip: row.ipAddress ?? '—',
        tenantId: row.targetTenantId ?? '',
        entityType: row.entityType ?? undefined,
        nature: natureOf(row),
        ...(row.tenantName ? { tenantName: row.tenantName } : {}),
        ...(row.reason ? { reason: row.reason } : {}),
      };
    });
  });
}

/** A safety rail on one read, well above a month of real activity. */
const AUDIT_WINDOW_CAP = 2000;

const EAT_ROW = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Africa/Nairobi',
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});
/** `en-CA` formats as `YYYY-MM-DD`, which is the key the volume query uses. */
const EAT_DAY_KEY = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Africa/Nairobi',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function auditKindOf(action: string): AuditKind {
  if (action.startsWith('support.')) return 'session';
  if (
    action.startsWith('subscription.') ||
    action.startsWith('plan.') ||
    action.startsWith('watchlist.')
  )
    return 'plan';
  if (action.startsWith('rules.')) return 'rules';
  if (action.startsWith('tenant.')) return 'tenant';
  return 'admin';
}

export async function getLiveAuditVolume(): Promise<AuditVolumePoint[] | null> {
  const ctx = await currentPlatformSessionOrNull();
  if (!ctx) return null;

  /*
   * ⚠ NAIROBI DAYS, NOT UTC ONES. Bucketing by `at time zone 'utc'` put every
   * day boundary three hours early for the operator reading it: an action at
   * 01:00 EAT landed on the previous day's bar. Doc 23 A0.4.
   *
   * ⚠ READS ARE COUNTED BY THE SAME RULE THE STREAM USES. `READ_ACTIONS` and
   * `LEGACY_READS` come from `auditVocabulary`, so the chart and the rows below
   * it cannot classify the same entry two different ways.
   */
  const readActions = sql.join(
    READ_ACTIONS.map((a) => sql`${a}`),
    sql`, `,
  );
  const isRead = sql`(
    l.action in (${readActions})
    or (l.action = ${LEGACY_READS.watchlist.action} and l.entity_type = ${LEGACY_READS.watchlist.entityType})
    or (l.action = ${LEGACY_READS.preview.action} and l.reason = ${LEGACY_READS.preview.reason})
    or (l.action = ${LEGACY_READS.suspension.action} and l.reason = ${LEGACY_READS.suspension.reason})
  )`;

  return withActorContext(ctx.actorId, ctx.requestId, async (tx) => {
    const rows = await tx.execute(sql`
      with calendar as (
        select generate_series(
          (now() at time zone 'Africa/Nairobi')::date - interval '29 days',
          (now() at time zone 'Africa/Nairobi')::date,
          interval '1 day'
        )::date as day
      )
      select
        to_char(calendar.day, 'YYYY-MM-DD') as day,
        count(l.id)::int as total,
        count(*) filter (where l.used_service_role)::int as service_role,
        count(*) filter (where l.support_session_id is not null)::int as support,
        count(*) filter (where l.id is not null and ${isRead})::int as reads
      from calendar
      left join ${platformAuditLog} l
        on (l.occurred_at at time zone 'Africa/Nairobi')::date = calendar.day
      group by calendar.day
      order by calendar.day
    `);

    /* `execute` returns driver rows rather than a typed result set, so the
       shape is asserted at exactly one place — here. */
    const points = (
      rows as unknown as Array<{
        day: string;
        total: number;
        service_role: number;
        support: number;
        reads: number;
      }>
    ).map((r) => ({
      day: r.day,
      total: Number(r.total),
      serviceRole: Number(r.service_role),
      support: Number(r.support),
      reads: Number(r.reads),
    }));

    return points.length > 0 ? points : null;
  });
}
