import 'server-only';
import { and, asc, count, desc, eq, gt, isNull, sql } from 'drizzle-orm';
import {
  planEntitlements,
  plans,
  platformAuditLog,
  sessions,
  subscriptions,
  tenantMembers,
  tenants,
} from '@/db/schema';
import { currentPlatformSessionOrNull } from '@/lib/auth/resolve';
import { withoutTenantContext } from '@/lib/db';
import { watchlist, type WatchlistEntry } from '@/modules/platform';
import type {
  AuditLine,
  EntitlementRow,
  IsolationStatus,
  OverviewModel,
  PlanHead,
  PlansModel,
  QueueItem,
} from './data';

/**
 * The M3 half of the console read model, against the real database.
 *
 * ⚠ WHY THIS IS A SEPARATE FILE, AND WHY IT FALLS BACK.
 *
 * Same reasoning as `lib/tenant/live.ts`: `data.ts` is a fixture seam, and a
 * file where some functions read a database and some invent their answer is a
 * file with nothing in a call site to say which. A page importing from
 * `./live` is reading the truth; one importing from `./data` is not yet.
 *
 * The fallback keeps the review deployment usable — `/api/demo` hands out a
 * console cookie that names no real session, so these return null and the
 * designed data is shown.
 */

/**
 * 08 §2 · design sheet 05. The plan comparison, from the real catalogue.
 *
 * ⚠ THE FIXTURE THIS REPLACES WAS SHOWING PLANS THAT DO NOT EXIST.
 *
 * It listed Trial, Starter, Growth and Scale with rows for events per month,
 * storage and SSO — the four-tier proposal replaced on 24 Aug 2026, against
 * entitlement keys that were never in the schema. Every number on that screen
 * was defensible when it was drawn and none of it was true by the time the
 * plans were confirmed, which is precisely the cost of a fixture that outlives
 * its decision.
 */
export async function getLivePlans(): Promise<PlansModel | null> {
  const ctx = await currentPlatformSessionOrNull();
  if (!ctx) return null;

  return withoutTenantContext(ctx.requestId, async (tx) => {
    const planRows = await tx
      .select({
        id: plans.id,
        code: plans.code,
        name: plans.name,
        priceAmount: plans.priceAmount,
        currency: plans.currency,
      })
      .from(plans)
      .where(eq(plans.isActive, true))
      .orderBy(asc(plans.sortOrder), asc(plans.priceAmount));

    if (planRows.length === 0) return null;

    const entitlementRows = await tx
      .select({
        planId: planEntitlements.planId,
        key: planEntitlements.key,
        displayName: planEntitlements.displayName,
        limitValue: planEntitlements.limitValue,
        displayOrder: planEntitlements.displayOrder,
      })
      .from(planEntitlements);

    const counts = await tx
      .select({ planId: subscriptions.planId, n: sql<number>`count(*)::int` })
      .from(subscriptions)
      .groupBy(subscriptions.planId);

    const countByPlan = new Map(counts.map((row) => [row.planId, row.n]));

    const heads: PlanHead[] = planRows.map((plan) => {
      const n = countByPlan.get(plan.id) ?? 0;
      return {
        key: plan.code,
        name: plan.name,
        /**
         * 08 §2 · seed constants. Custom is "Tailored", identified by its
         * CODE and never by `priceAmount === 0` — the seed file is explicit
         * that reading zero as free is wrong, and there is no free plan.
         */
        price:
          plan.code === 'custom'
            ? 'Tailored'
            : `${plan.currency} ${plan.priceAmount.toLocaleString('en-GB')}`,
        tenants: `${n} ${n === 1 ? 'workspace' : 'workspaces'}`,
        count: n,
      };
    });

    // One row per entitlement key, one column per plan, in the order the
    // plans are shown — so a cell's position is its plan without a lookup.
    const byKey = new Map<string, { displayName: string; order: number; byPlan: Map<string, number | null> }>();

    for (const row of entitlementRows) {
      const entry = byKey.get(row.key) ?? {
        displayName: row.displayName,
        order: row.displayOrder,
        byPlan: new Map<string, number | null>(),
      };
      entry.byPlan.set(row.planId, row.limitValue);
      byKey.set(row.key, entry);
    }

    const rows: EntitlementRow[] = [...byKey.entries()]
      .sort((a, b) => a[1].order - b[1].order || a[0].localeCompare(b[0]))
      .map(([key, entry]) => ({
        label: entry.displayName,
        icon: iconFor(key),
        values: planRows.map((plan) => {
          const value = entry.byPlan.get(plan.id);
          if (value === undefined) return '—';
          // 03 §10 · 08 §2. Unlimited is the glyph, never a full bar and
          // never a large number standing in for one.
          if (value === null) return '∞';
          if (key === 'audit_retention_days') return `${value} days`;
          if (key === 'support_sla_hours') return `${value} hours`;
          return value.toLocaleString('en-GB');
        }),
      }));

    const overrideCount = await tx.execute(
      sql`select count(*)::int as n from subscription_overrides
          where expires_at is null or expires_at > now()`,
    );
    const unassigned = await tx.execute(
      sql`select count(*)::int as n from tenants t
          where t.deleted_at is null
            and not exists (select 1 from subscriptions s where s.tenant_id = t.id)`,
    );

    return {
      plans: heads,
      rows,
      overrides: firstCount(overrideCount),
      unassigned: firstCount(unassigned),
      /**
       * ⚠ EMPTY, AND NOT FABRICATED.
       *
       * The design's blast-radius dialog is driven by a PENDING edit — a
       * limit the operator has changed but not committed. Nothing is pending
       * on a freshly loaded screen, so inventing one here would put a
       * confirmation in front of a decision nobody has made. The real
       * computation is `previewPlanChange`, which runs when an edit is
       * actually proposed; editing plan limits from the console is M4's
       * screen, and this field stays inert until it exists.
       */
      pendingChange: {
        plan: '',
        field: '',
        from: '',
        to: '',
        affected: 0,
        breaching: [],
      },
    };
  });
}

/**
 * The console overview, from the real database. 09 §2 · 08 §9.
 *
 * ⚠ THE QUEUE IS ORDERED BY WHAT EACH ITEM COSTS TO IGNORE.
 *
 * Design sheet 05 is emphatic that this screen is not a metric grid: "the
 * standfirst does the work", and the queue is ranked by consequence rather
 * than by recency. So a past-due workspace outranks one at 96% of its seats,
 * which outranks one at 82% — because the first is money already lost, the
 * second is a customer about to be blocked, and the third is a conversation
 * worth having this week.
 *
 * ⚠ EVERY FIGURE NAMES ITS SOURCE, WHICH IS WHY THERE ARE NO INVENTED ONES.
 *
 * The fixture carried revenue, conversation volumes and uptime percentages
 * that no table produces. Rather than compute something plausible from the
 * wrong rows, the signals here are the four this database can actually
 * answer, and the health vitals come from the probes rather than from this
 * function. A number with no source is trivia, and on an operations screen it
 * is worse than trivia — it is a number somebody will act on.
 */
export async function getLiveOverview(): Promise<OverviewModel | null> {
  const ctx = await currentPlatformSessionOrNull();
  if (!ctx) return null;

  const actor = {
    userId: ctx.actorId,
    label: ctx.actorLabel,
    requestId: ctx.requestId,
    ipAddress: ctx.ipAddress,
  };

  const [pressure, counts, recentRows] = await Promise.all([
    watchlist(actor),
    tenantCounts(ctx.requestId),
    recentPlatformActivity(ctx.requestId),
  ]);

  const firstName = ctx.actorLabel.split(/\s+/)[0] ?? 'there';

  /**
   * The queue. One entry per workspace that needs attention, most costly
   * first — `watchlist` already sorts past-due above usage pressure.
   */
  const queue: QueueItem[] = pressure.map((entry) => {
    const nearest = entry.nearest;
    const atCeiling = nearest ? nearest.current >= nearest.limit : false;

    return {
      id: entry.tenantId,
      slug: entry.slug,
      name: entry.name,
      // Sheet 04: "a ceiling is ochre, not oxide" — a limit reached is a
      // thing the reader can act on, so it never renders as a failure.
      // Sheet 04: "a ceiling is ochre, not oxide". Past due is DANGER because
      // money is already lost; a limit reached is WARNING because the reader
      // can act on it; approaching one is INFO because it is a conversation
      // rather than a problem.
      severity: entry.pastDue ? 'danger' : atCeiling ? 'warning' : 'info',
      tag: entry.pastDue ? 'Past due' : atCeiling ? 'At limit' : 'Approaching limit',
      detail: entry.pastDue
        ? `Subscription is past due on the ${entry.planCode} plan. Access is read-only until it is resolved.`
        : nearest
          ? `${nearest.displayName}: ${nearest.current} of ${nearest.limit} used.`
          : 'Needs attention.',
      primaryLabel: 'Open workspace',
      primaryHref: `/platform/tenants?workspace=${entry.slug}`,
      meta: entry.planCode,
    };
  });

  return {
    operatorFirstName: firstName,
    stamp: new Date().toLocaleString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    }),
    /**
     * The standfirst. It states the one thing worth knowing before anything
     * else on the page, and it changes shape when there is nothing wrong —
     * "3 workspaces, none needing attention" reads as a system in order,
     * whereas "0 items need attention" reads as a broken query.
     */
    headline:
      queue.length === 0
        ? {
            lead: `${counts.total} ${counts.total === 1 ? 'workspace' : 'workspaces'},`,
            figure: 'none',
            tail: 'needing attention right now.',
          }
        : {
            lead: 'Attention needed on',
            figure: String(queue.length),
            tail: queue.length === 1 ? 'workspace.' : 'workspaces.',
          },
    signals: [
      {
        id: 'workspaces',
        label: 'Workspaces',
        value: String(counts.total),
        note: `${counts.active} active · ${counts.suspended} suspended`,
        href: '/platform/tenants',
        icon: 'building',
      },
      {
        id: 'members',
        label: 'People',
        value: String(counts.members),
        note: 'active memberships across every workspace',
        href: '/platform/tenants',
        icon: 'pulse',
      },
      {
        id: 'attention',
        label: 'Needing attention',
        value: String(queue.length),
        note: queue.length === 0 ? 'nothing near a ceiling' : 'past due or near a limit',
        href: '/platform/health',
        icon: 'bolt',
      },
      {
        id: 'support',
        label: 'Open support sessions',
        value: String(counts.openSupportSessions),
        note: counts.openSupportSessions === 0 ? 'nobody is inside a workspace' : 'in progress now',
        href: '/platform/support-sessions',
        icon: 'coin',
      },
    ],
    queue,
    restingCount: Math.max(0, counts.total - queue.length),
    /**
     * ⚠ EMPTY, DELIBERATELY.
     *
     * Vitals are uptime, latency and error-rate probes, and they come from
     * the observability layer rather than from Postgres. Sheet 11 is explicit
     * that "a number without a target is trivia"; computing a plausible
     * uptime from rows we happen to have would be worse than showing none.
     * The health page owns these and says what is not yet wired.
     */
    vitals: [],
    recent: recentRows,
  };
}

/** Counts the overview's signals are built from. One round trip each, and
 *  all four are facts this database can actually answer. */
async function tenantCounts(requestId: string): Promise<{
  total: number;
  active: number;
  suspended: number;
  members: number;
  openSupportSessions: number;
}> {
  return withoutTenantContext(requestId, async (tx) => {
    const [tenantRows] = await tx
      .select({
        total: count(),
        active: sql<number>`count(*) filter (where ${tenants.status} = 'active')::int`,
        suspended: sql<number>`count(*) filter (where ${tenants.status} = 'suspended')::int`,
      })
      .from(tenants)
      .where(isNull(tenants.deletedAt));

    const [memberRows] = await tx
      .select({ n: count() })
      .from(tenantMembers)
      .where(and(eq(tenantMembers.status, 'active'), isNull(tenantMembers.deletedAt)));

    const [supportRows] = await tx
      .select({ n: count() })
      .from(sessions)
      .where(
        and(
          eq(sessions.kind, 'support'),
          isNull(sessions.revokedAt),
          gt(sessions.expiresAt, new Date()),
        ),
      );

    return {
      total: tenantRows?.total ?? 0,
      active: tenantRows?.active ?? 0,
      suspended: tenantRows?.suspended ?? 0,
      members: memberRows?.n ?? 0,
      openSupportSessions: supportRows?.n ?? 0,
    };
  });
}

/**
 * The last five things the PLATFORM did, from its own log.
 *
 * Deliberately `platform_audit_log` rather than the tenants' own logs: this
 * line is "what have we been doing", and reading tenant activity across
 * tenants to populate a dashboard is exactly the cross-tenant content read
 * `06 §10` says to answer with support mode instead of building.
 */
async function recentPlatformActivity(requestId: string): Promise<AuditLine[]> {
  return withoutTenantContext(requestId, async (tx) => {
    const rows = await tx
      .select({
        occurredAt: platformAuditLog.occurredAt,
        action: platformAuditLog.action,
        actorLabel: platformAuditLog.actorLabel,
        entityType: platformAuditLog.entityType,
      })
      .from(platformAuditLog)
      .orderBy(desc(platformAuditLog.occurredAt))
      .limit(5);

    return rows.map((row) => ({
      time: row.occurredAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      action: row.action,
      target: row.entityType ?? row.actorLabel,
    }));
  });
}

/**
 * Sheet 11 · 06 §4. THE ISOLATION PANEL, VERIFIED AT READ TIME.
 *
 * ⚠ IT COUNTS THE DATABASE RATHER THAN REPORTING A NUMBER SOMEBODY TYPED.
 *
 * The fixture this replaces claimed "18 of 18 tables policed, last run 12
 * Aug, 03:00". The real count is fifteen, the eighteen came from a sentence
 * in document 06 rather than from the schema, and the timestamp was a
 * literal. On the one panel in this console that speaks to the guarantee the
 * whole engagement is sold on, that is the worst possible place for a figure
 * nobody checked.
 *
 * ⚠ "LAST RUN" IS NOW, AND THAT IS AN IMPROVEMENT RATHER THAN A COMPROMISE.
 *
 * A CI timestamp answers "did the suite pass when it last ran", which decays
 * from the moment it is written — a policy dropped by hand at noon leaves a
 * green 03:00 badge until the next nightly. This query asks the live
 * database, on this request, whether every tenant-scoped table still has row
 * level security forced and a policy attached. Sheet 11 wants isolation state
 * "beside uptime, not buried in CI"; a check that runs when you look at it is
 * more nearly that than a cached verdict about a different moment.
 *
 * It is the same introspection `scripts/check-policies.ts` runs in CI, so the
 * console and the build cannot disagree about what is policed.
 */
export async function getLiveIsolationStatus(): Promise<IsolationStatus | null> {
  const ctx = await currentPlatformSessionOrNull();
  if (!ctx) return null;

  return withoutTenantContext(ctx.requestId, async (tx) => {
    const result = await tx.execute(sql`
      with scoped as (
        select c.oid, c.relname, c.relrowsecurity, c.relforcerowsecurity
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        join pg_attribute a on a.attrelid = c.oid
        where n.nspname = 'public'
          and c.relkind = 'r'
          and a.attname = 'tenant_id'
          and a.attnum > 0
          and not a.attisdropped
      )
      select
        count(*)::int as total,
        count(*) filter (
          where relrowsecurity
            and relforcerowsecurity
            and exists (
              select 1 from pg_policies p
              where p.schemaname = 'public' and p.tablename = scoped.relname
            )
        )::int as policed
      from scoped
    `);

    const row = (result as unknown as { total: number; policed: number }[])[0];

    return {
      tablesTotal: row?.total ?? 0,
      tablesPoliced: row?.policed ?? 0,
      /**
       * ⚠ ZERO BECAUSE NOTHING COUNTS THEM, NOT BECAUSE NONE HAPPENED.
       *
       * A cross-tenant attempt is a query that RLS filtered to nothing, and
       * RLS filters silently — that is the design (06 §4: "RLS FILTERS
       * RATHER THAN ERRORS"). Counting them means instrumenting the
       * application to notice when a scoped query returned fewer rows than
       * an unscoped one would have, which is a real piece of work and not
       * this milestone's.
       *
       * Sheet 11 asks for refusals to be counted SEPARATELY from failures,
       * and that distinction is honoured by not inventing either number. The
       * health page states that these are not yet instrumented rather than
       * letting a confident 0 imply a clean bill of health.
       */
      crossTenantAttempts30d: 0,
      crossTenantRefused30d: 0,
      lastRun: new Date().toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
  });
}

/**
 * 08 §9. The watchlist, for the overview and health screens.
 *
 * Returns an empty list rather than null when nobody needs attention: "no
 * tenant is near a limit" is a real and good answer, and a caller that got
 * null could not tell it apart from "not signed in".
 */
export async function getLiveWatchlist(): Promise<WatchlistEntry[] | null> {
  const ctx = await currentPlatformSessionOrNull();
  if (!ctx) return null;

  return watchlist({
    userId: ctx.actorId,
    label: ctx.actorLabel,
    requestId: ctx.requestId,
    ipAddress: ctx.ipAddress,
  });
}

function firstCount(result: unknown): number {
  const rows = result as { n?: number }[];
  return rows[0]?.n ?? 0;
}

/** The design's icon set, mapped by entitlement key. An unknown key gets the
 *  neutral one rather than no icon, so a new entitlement renders. */
function iconFor(key: string): EntitlementRow['icon'] {
  const icons: Record<string, EntitlementRow['icon']> = {
    seats: 'seat',
    conversations_monthly: 'mail',
    channels: 'bolt',
    api_keys: 'key',
    kb_documents: 'db',
    ai_rules_versions: 'bot',
    audit_retention_days: 'clock',
    support_sla_hours: 'shield',
  };
  return icons[key] ?? 'shield';
}
