import 'server-only';
import { and, desc, eq, gte, inArray, isNull, or, sql } from 'drizzle-orm';
import {
  platformAdmins,
  platformAuditLog,
  sessions,
  tenants,
  type SupportEndReason,
} from '@/db/schema';
import { currentPlatformSessionOrNull } from '@/lib/auth/resolve';
import { AUDIT_ACTIONS } from '@/lib/audit';
import { withActorContext, type Transaction } from '@/lib/db';
import {
  closeLapsedSupportSessions,
  SUPPORT_MAX_EXTENSIONS,
  SUPPORT_SESSION_DURATION_MS,
} from '@/modules/platform';

/**
 * The support register, read as the operator. Doc 24 · Stage 5.
 *
 * ⚠ IT READ NOTHING. The old reader (`getLiveSupportSessions`) used
 * `withoutTenantContext`: no actor, no tenant, so `sessions_select` and
 * `tenants_select` both returned nothing, and the page rendered "0 open ·
 * 0 recorded" as fact. Operators now read support rows and the workspace
 * directory under their own actor (doc 24 · D1).
 *
 * ⚠ THE RECORD IS MADE ACCURATE BEFORE IT IS READ. Lapsed visits are closed at
 * their own expiry first, so nothing on this page is "open" that is over.
 *
 * ⚠ WHAT EACH VISIT CHANGED comes from `app.support_visit_activity`, which
 * returns only the rows the platform wrote into a customer's log during the
 * visit. Operators never read the customer's log itself.
 */

export const REGISTER_WINDOW_DAYS = 30;
/** Rows read per request. Stated on the page when reached. */
const READ_CAP = 500;
export const REGISTER_PAGE_SIZE = 25;

export type VisitOutcome = SupportEndReason | 'open';

export type SupportVisit = {
  id: string;
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  operatorId: string;
  operatorName: string;
  mine: boolean;
  reason: string;
  startedAt: string;
  /** When it ended, or when it will if still open. */
  endsAt: string;
  outcome: VisitOutcome;
  /** Who ended it, by name. Null while open and for the timer. */
  endedByName: string | null;
  minutes: number;
  extensions: number;
  /** Rows the platform wrote into the customer's log, excluding the visit's own. */
  changes: number;
  /** Nairobi calendar day, `YYYY-MM-DD`, for grouping. */
  day: string;
};

export type RegisterFilters = {
  operator?: string;
  workspace?: string;
  outcome?: VisitOutcome;
  page?: number;
};

export type SupportRegister = {
  open: SupportVisit[];
  visits: SupportVisit[];
  matched: number;
  page: number;
  pages: number;
  capped: boolean;
  everUsed: boolean;
  facts: {
    openNow: number;
    visits: number;
    medianMinutes: number | null;
    endedByCustomer: number;
    extended: number;
  };
  operators: Array<{ id: string; name: string }>;
  workspaces: Array<{ slug: string; name: string }>;
  /** Every closed visit in the window, for the shape band — not just a page. */
  shape: Array<{ minutes: number; outcome: SupportEndReason }>;
  /** Every live workspace, for "Open a session". */
  directory: Array<{ id: string; slug: string; name: string; plan: string; status: string }>;
  me: string;
};

export type VisitEvent = {
  at: string;
  kind: 'entered' | 'change' | 'extended' | 'ended';
  label: string;
  detail: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
};

const DAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Nairobi' });

type Row = {
  id: string;
  tenantId: string | null;
  userId: string;
  createdAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  endReason: SupportEndReason | null;
  endedBy: string | null;
  supportContext: {
    reason?: string;
    platformAdminName?: string;
    extensions?: number;
  } | null;
  tenantName: string;
  tenantSlug: string;
  operatorName: string | null;
};

async function readRows(tx: Transaction, where: ReturnType<typeof and>): Promise<Row[]> {
  return tx
    .select({
      id: sessions.id,
      tenantId: sessions.tenantId,
      userId: sessions.userId,
      createdAt: sessions.createdAt,
      expiresAt: sessions.expiresAt,
      revokedAt: sessions.revokedAt,
      endReason: sessions.endReason,
      endedBy: sessions.endedBy,
      supportContext: sessions.supportContext,
      tenantName: tenants.name,
      tenantSlug: tenants.slug,
      operatorName: platformAdmins.displayName,
    })
    .from(sessions)
    .innerJoin(tenants, eq(tenants.id, sessions.tenantId))
    .leftJoin(platformAdmins, eq(platformAdmins.userId, sessions.userId))
    .where(where)
    .orderBy(desc(sessions.createdAt))
    .limit(READ_CAP);
}

/** Names for the people who ended visits: operators, and customers. */
async function enderNames(tx: Transaction, rows: Row[]): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  const operatorIds = [...new Set(rows.flatMap((r) => (r.endedBy ? [r.endedBy] : [])))];
  if (operatorIds.length > 0) {
    const ops = await tx
      .select({ id: platformAdmins.userId, name: platformAdmins.displayName })
      .from(platformAdmins)
      .where(inArray(platformAdmins.userId, operatorIds));
    for (const o of ops) names.set(o.id, o.name);
  }
  /* A customer's name is not in anything an operator may read — except the
     platform log's own record of the ending, which carries their label. */
  const customerEnded = rows.filter((r) => r.endReason === 'customer').map((r) => r.id);
  if (customerEnded.length > 0) {
    const ends = await tx
      .select({ id: platformAuditLog.entityId, label: platformAuditLog.actorLabel })
      .from(platformAuditLog)
      .where(
        and(
          eq(platformAuditLog.action, AUDIT_ACTIONS.SUPPORT_ENDED_BY_CUSTOMER),
          inArray(platformAuditLog.entityId, customerEnded),
        ),
      );
    for (const e of ends) if (e.id) names.set(`customer:${e.id}`, e.label);
  }
  return names;
}

async function changeCounts(tx: Transaction, ids: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (ids.length === 0) return counts;
  const rows = await tx.execute<{ session_id: string; n: number }>(sql`
    select session_id, count(*)::int as n
    from app.support_visit_activity(${uuidArray(ids)})
    where action not like 'support.%'
    group by session_id`);
  for (const r of rows as unknown as Array<{ session_id: string; n: number }>) {
    counts.set(r.session_id, Number(r.n));
  }
  return counts;
}

/** A bound `uuid[]` — every id a parameter, never text spliced into SQL. */
function uuidArray(ids: string[]) {
  return sql`ARRAY[${sql.join(
    ids.map((id) => sql`${id}::uuid`),
    sql`, `,
  )}]::uuid[]`;
}

function toVisit(
  r: Row,
  me: string,
  names: Map<string, string>,
  changes: Map<string, number>,
  now: number,
): SupportVisit {
  const open = !r.revokedAt && r.expiresAt.getTime() > now;
  const end = r.revokedAt ?? r.expiresAt;
  const outcome: VisitOutcome = open ? 'open' : (r.endReason ?? 'expired');
  const minutes = Math.max(
    1,
    Math.round(((open ? now : end.getTime()) - r.createdAt.getTime()) / 60_000),
  );
  return {
    id: r.id,
    tenantId: r.tenantId ?? '',
    tenantName: r.tenantName,
    tenantSlug: r.tenantSlug,
    operatorId: r.userId,
    operatorName: r.operatorName ?? r.supportContext?.platformAdminName ?? 'An operator',
    mine: r.userId === me,
    reason: r.supportContext?.reason ?? '',
    startedAt: r.createdAt.toISOString(),
    endsAt: (open ? r.expiresAt : end).toISOString(),
    outcome,
    endedByName:
      outcome === 'customer'
        ? (names.get(`customer:${r.id}`) ?? 'The customer')
        : r.endedBy
          ? (names.get(r.endedBy) ?? null)
          : null,
    minutes,
    extensions: r.supportContext?.extensions ?? 0,
    changes: changes.get(r.id) ?? 0,
    day: DAY.format(r.createdAt),
  };
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? (s[mid] ?? null) : Math.round(((s[mid - 1] ?? 0) + (s[mid] ?? 0)) / 2);
}

export async function getSupportRegister(
  filters: RegisterFilters = {},
): Promise<SupportRegister | null> {
  const ctx = await currentPlatformSessionOrNull();
  if (!ctx) return null;

  return withActorContext(ctx.actorId, ctx.requestId, async (tx) => {
    await closeLapsedSupportSessions(tx);

    const since = new Date(Date.now() - REGISTER_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const rows = await readRows(
      tx,
      and(
        eq(sessions.kind, 'support'),
        or(gte(sessions.createdAt, since), isNull(sessions.revokedAt)),
      ),
    );
    const [ever] = await tx
      .select({ n: sql<number>`count(*)::int` })
      .from(sessions)
      .where(eq(sessions.kind, 'support'));

    const directory = await tx
      .select({ id: tenants.id, slug: tenants.slug, name: tenants.name, status: tenants.status })
      .from(tenants)
      .where(isNull(tenants.deletedAt))
      .orderBy(tenants.name);

    const [names, changes] = await Promise.all([
      enderNames(tx, rows),
      changeCounts(
        tx,
        rows.map((r) => r.id),
      ),
    ]);
    const now = Date.now();
    const all = rows.map((r) => toVisit(r, ctx.actorId, names, changes, now));

    const open = all.filter((v) => v.outcome === 'open');
    const closed = all.filter((v) => v.outcome !== 'open');

    const matching = all.filter(
      (v) =>
        (!filters.operator || v.operatorId === filters.operator) &&
        (!filters.workspace || v.tenantSlug === filters.workspace) &&
        (!filters.outcome || v.outcome === filters.outcome),
    );
    const pages = Math.max(1, Math.ceil(matching.length / REGISTER_PAGE_SIZE));
    const page = Math.min(Math.max(1, filters.page ?? 1), pages);

    const operators = new Map<string, string>();
    const workspaces = new Map<string, string>();
    for (const v of all) {
      operators.set(v.operatorId, v.operatorName);
      workspaces.set(v.tenantSlug, v.tenantName);
    }

    return {
      open,
      visits: matching.slice((page - 1) * REGISTER_PAGE_SIZE, page * REGISTER_PAGE_SIZE),
      matched: matching.length,
      page,
      pages,
      capped: rows.length >= READ_CAP,
      everUsed: (ever?.n ?? 0) > 0,
      facts: {
        openNow: open.length,
        visits: all.length,
        medianMinutes: median(closed.map((v) => v.minutes)),
        endedByCustomer: all.filter((v) => v.outcome === 'customer').length,
        extended: all.filter((v) => v.extensions > 0).length,
      },
      operators: [...operators].map(([id, name]) => ({ id, name })),
      workspaces: [...workspaces]
        .map(([slug, name]) => ({ slug, name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      shape: closed.map((v) => ({ minutes: v.minutes, outcome: v.outcome as SupportEndReason })),
      directory: directory.map((d) => ({ ...d, plan: '' })),
      me: ctx.actorId,
    };
  });
}

/** Everything a visit did, in order, from both ends of it. */
export async function getSupportVisit(
  sessionId: string,
): Promise<{ visit: SupportVisit; events: VisitEvent[] } | null> {
  const ctx = await currentPlatformSessionOrNull();
  if (!ctx) return null;

  return withActorContext(ctx.actorId, ctx.requestId, async (tx) => {
    const [row] = await readRows(tx, and(eq(sessions.kind, 'support'), eq(sessions.id, sessionId)));
    if (!row) return null;

    const [names, changes] = await Promise.all([enderNames(tx, [row]), changeCounts(tx, [row.id])]);
    const visit = toVisit(row, ctx.actorId, names, changes, Date.now());

    const activity = (await tx.execute(sql`
      select occurred_at, action, entity_type, actor_label, before, after
      from app.support_visit_activity(${uuidArray([row.id])})`)) as unknown as Array<{
      occurred_at: Date | string;
      action: string;
      entity_type: string | null;
      actor_label: string | null;
      before: Record<string, unknown> | null;
      after: Record<string, unknown> | null;
    }>;

    const events: VisitEvent[] = [
      {
        at: visit.startedAt,
        kind: 'entered',
        label: `${visit.operatorName} entered ${visit.tenantName}`,
        detail: visit.reason ? `“${visit.reason}”` : null,
        before: null,
        after: null,
      },
    ];
    for (const a of activity) {
      if (a.action === AUDIT_ACTIONS.SUPPORT_ENTERED) continue;
      const at = new Date(a.occurred_at).toISOString();
      if (a.action === AUDIT_ACTIONS.SUPPORT_EXTENDED) {
        const n = Number((a.after as { extension?: number } | null)?.extension ?? 0);
        events.push({
          at,
          kind: 'extended',
          label: n ? `Extended · ${n} of ${SUPPORT_MAX_EXTENSIONS}` : 'Extended',
          detail: `Thirty more minutes, from ${a.actor_label ?? 'the operator'}.`,
          before: null,
          after: null,
        });
      } else if (a.action.startsWith('support.')) {
        continue; // the ending is added from the row below, once
      } else {
        events.push({
          at,
          kind: 'change',
          label: a.action,
          detail: a.entity_type,
          before: a.before,
          after: a.after,
        });
      }
    }
    if (visit.outcome !== 'open') {
      events.push({
        at: visit.endsAt,
        kind: 'ended',
        label: ENDING_SENTENCE[visit.outcome](visit),
        detail: null,
        before: null,
        after: null,
      });
    }
    return { visit, events };
  });
}

export const ENDING_SENTENCE: Record<SupportEndReason, (v: SupportVisit) => string> = {
  operator: (v) => `${v.operatorName} left`,
  colleague: (v) => `Ended by ${v.endedByName ?? 'another operator'}`,
  customer: (v) => `${v.endedByName ?? 'The customer'} ended the visit`,
  expired: () => `Reached the ${SUPPORT_SESSION_DURATION_MS / 60_000}-minute limit`,
  superseded: () => 'Replaced by a new session on this workspace',
  break_glass: (v) =>
    `Closed when support access was locked${v.endedByName ? ` by ${v.endedByName}` : ''}`,
};
