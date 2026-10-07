/**
 * CONTRACTED VALUE. Doc 25 · R1.
 *
 * ⚠ THIS IS WHAT THE SUBSCRIPTIONS SAY THE BUSINESS IS OWED, NOT WHAT IT HAS
 *   BEEN PAID. There is no payment gateway in Phase 1 (08 §1): nothing in this
 *   system records money arriving. What it does record, exactly, is which plan
 *   every workspace is on, at what price, in which state, since when. That is
 *   contracted value, and the revenue screen says so in its title rather than
 *   letting a reader assume "MRR" means cash.
 *
 * ⚠ ONE CALCULATION, TWO SOURCES. The live reader (`liveRevenue.ts`) feeds it
 *   rows from the database; the designed fallback feeds it the seeded
 *   portfolio. Both go through `computeRevenue`, so the screen a reviewer sees
 *   without a session and the one an operator sees with one cannot do
 *   different arithmetic.
 *
 * No directive and no `server-only`: it is pure, and the tests import it.
 */

export const NAIROBI_OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export type ContractRow = {
  tenantId: string;
  slug: string;
  name: string;
  tenantStatus: 'provisioning' | 'trial' | 'active' | 'past_due' | 'suspended' | 'closed';
  provisionedAt: Date;
  /** When the workspace was suspended or closed, when it is. */
  suspendedAt: Date | null;
  /** Null when the workspace has no subscription row at all. */
  subscription: {
    status: 'trialing' | 'active' | 'past_due' | 'paused' | 'cancelled' | 'expired';
    planCode: string;
    planName: string;
    /** The plan's list price per interval, whole KES. 0 for Custom. */
    listPrice: number;
    intervalUnit: 'month' | 'year';
    intervalCount: number;
    /** Negotiated monthly price. Null means the list price. */
    contractAmount: number | null;
    trialEndsAt: Date | null;
    pastDueSince: Date | null;
    /** When billing stopped for a cancelled, expired or paused subscription. */
    stoppedAt: Date | null;
    currentPeriodStart: Date | null;
    currentPeriodEnd: Date | null;
    cancelAtPeriodEnd: boolean;
  } | null;
};

/** A dated change to a workspace's contracted monthly value. From the audit log. */
export type ContractChange = { tenantId: string; at: Date; from: number; to: number };

export type Standing =
  /** Contracted and current. Counts in MRR. */
  | 'billing'
  /** Contracted and late. Counts in MRR and in the collection queue. */
  | 'past_due'
  /** On trial and inside it. Pipeline, not MRR. */
  | 'trial'
  /** Trial ended and nobody has converted or expired it. 08 §7: no automation. */
  | 'trial_ended'
  /** Suspended, closed, paused, cancelled or expired. Not billed. */
  | 'stopped'
  /** No subscription row. A data fault, and reported as one. */
  | 'none';

export type Contract = ContractRow & {
  standing: Standing;
  /** Contracted monthly value in whole KES. Null for Custom with no price recorded. */
  monthly: number | null;
  /** When paying began, as best the rows say: the end of the trial, or provisioning. */
  billingFrom: Date;
  /** When billing stopped, if it has. */
  billingUntil: Date | null;
  arrears: { days: number; periods: number; amount: number } | null;
};

/** The monthly value a subscription contracts for. */
export function monthlyValue(sub: NonNullable<ContractRow['subscription']>): number | null {
  if (sub.contractAmount !== null) return sub.contractAmount;
  /* Custom is priced per contract. A zero list price there is "not recorded",
     never "free" — there is no free plan (01 D-13). */
  if (sub.planCode === 'custom' || sub.listPrice === 0) return null;
  const months = sub.intervalUnit === 'year' ? 12 * sub.intervalCount : sub.intervalCount;
  return Math.round(sub.listPrice / Math.max(1, months));
}

/** Plans store text intervals; reject unsupported values at the read boundary. */
export function readSubscriptionInterval(value: string | null): 'month' | 'year' {
  if (value === null) return 'month';
  if (value === 'month' || value === 'year') return value;
  throw new Error('Unsupported subscription interval in the value report.');
}

/**
 * The monthly period containing `now`, renewing on the anniversary of `anchor`.
 * What the seed writes, and what a renewal job would roll forward to.
 */
export function currentPeriod(anchor: Date, now: Date): { start: Date; end: Date } {
  let k = 0;
  while (addMonths(anchor, k + 1) <= now && k < 1200) k += 1;
  return { start: addMonths(anchor, k), end: addMonths(anchor, k + 1) };
}

/** Adds whole calendar months, the way a monthly renewal does. */
export function addMonths(at: Date, months: number): Date {
  const d = new Date(at);
  const originalDay = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(originalDay, lastDay));
  return d;
}

/**
 * How many monthly charges have fallen due since a subscription went past due,
 * counting the one that made it past due, up to `until`.
 *
 * Suspension stops the count: a workspace that is no longer served is no
 * longer charged, so Tamarind owes the three periods before it was suspended,
 * not one for every month since.
 */
export function periodsDue(since: Date, until: Date): number {
  if (until < since) return 0;
  let periods = 0;
  while (addMonths(since, periods) <= until && periods < 120) periods += 1;
  return periods;
}

export function classify(row: ContractRow, now: Date): Contract {
  const sub = row.subscription;
  const tenantStopped = row.tenantStatus === 'suspended' || row.tenantStatus === 'closed';

  let standing: Standing;
  if (!sub) standing = 'none';
  else if (tenantStopped) standing = 'stopped';
  else if (sub.status === 'active') standing = 'billing';
  else if (sub.status === 'past_due') standing = 'past_due';
  else if (sub.status === 'trialing')
    standing = sub.trialEndsAt && sub.trialEndsAt <= now ? 'trial_ended' : 'trial';
  else standing = 'stopped';

  const monthly = sub ? monthlyValue(sub) : null;

  /* A workspace that trialled began paying when the trial ended. One that was
     provisioned straight onto a plan began paying when it was provisioned. */
  const billingFrom =
    sub?.trialEndsAt && sub.trialEndsAt <= now && sub.status !== 'trialing'
      ? sub.trialEndsAt
      : row.provisionedAt;

  const billingUntil = standing === 'stopped' ? (row.suspendedAt ?? sub?.stoppedAt ?? null) : null;

  /* Arrears belong to the subscription, not to the workspace's standing: a
     suspended workspace whose subscription is still past due still owes what
     fell due before it was suspended. */
  let arrears: Contract['arrears'] = null;
  if (sub?.status === 'past_due' && sub.pastDueSince && monthly !== null) {
    const until = row.suspendedAt && row.suspendedAt < now ? row.suspendedAt : now;
    const periods = periodsDue(sub.pastDueSince, until);
    arrears = {
      days: Math.max(0, Math.floor((now.getTime() - sub.pastDueSince.getTime()) / DAY_MS)),
      periods,
      amount: periods * monthly,
    };
  }

  return { ...row, standing, monthly, billingFrom, billingUntil, arrears };
}

/** Month boundaries in Nairobi time, oldest first, the last one being now. */
export function monthPoints(now: Date, count: number): Array<{ label: string; at: Date }> {
  const local = new Date(now.getTime() + NAIROBI_OFFSET_MS);
  const y = local.getUTCFullYear();
  const m = local.getUTCMonth();
  return Array.from({ length: count }, (_, i) => {
    const back = count - 1 - i;
    /* The end of each past month, as an instant; the current month is now. */
    const at = back === 0 ? now : new Date(Date.UTC(y, m - back + 1, 1) - NAIROBI_OFFSET_MS - 1);
    const label = new Date(Date.UTC(y, m - back, 15)).toLocaleDateString('en-GB', {
      month: 'short',
      timeZone: 'UTC',
    });
    return { label, at };
  });
}

/** What a contract was worth at a moment, given the plan changes recorded since. */
function valueAt(c: Contract, at: Date, changes: ContractChange[]): number {
  if (c.monthly === null) return 0;
  if (c.standing === 'trial' || c.standing === 'trial_ended' || c.standing === 'none') return 0;
  if (at < c.billingFrom) return 0;
  if (c.billingUntil && at >= c.billingUntil) return 0;
  /* Walk the dated changes: before the first one, the workspace was on its
     `from`; after the last one at or before `at`, it was on that one's `to`. */
  const own = changes.filter((ch) => ch.tenantId === c.tenantId).sort((a, b) => +a.at - +b.at);
  if (own.length === 0) return c.monthly;
  let value = own[0]!.from;
  for (const ch of own) {
    if (ch.at <= at) value = ch.to;
  }
  return value;
}

export type RevenuePoint = {
  month: string;
  mrr: number;
  net: number;
  new: number;
  expansion: number;
  contraction: number;
  churn: number;
};

export type RevenueFigures = {
  contracts: Contract[];
  mrr: number;
  arr: number;
  paying: number;
  averagePerPaying: number;
  /** Contracted value of the past-due subscriptions. In MRR, and at risk. */
  atRisk: number;
  pastDueCount: number;
  /** What has fallen due and not been marked paid. */
  unpaid: number;
  trials: { count: number; ended: number; value: number };
  /** Custom workspaces with no contract price recorded. Excluded from every sum. */
  unpriced: Contract[];
  /** Workspaces with no subscription row at all. */
  unsubscribed: Contract[];
  series: RevenuePoint[];
  byPlan: Array<{ code: string; name: string; value: number; count: number }>;
  ageing: Array<{ bucket: string; amount: number }>;
  collections: Contract[];
};

export function computeRevenue(
  rows: ContractRow[],
  now: Date,
  changes: ContractChange[] = [],
): RevenueFigures {
  const contracts = rows.map((row) => classify(row, now));
  const earning = contracts.filter(
    (c) => (c.standing === 'billing' || c.standing === 'past_due') && c.monthly !== null,
  );

  const mrr = earning.reduce((sum, c) => sum + (c.monthly ?? 0), 0);
  const pastDue = earning.filter((c) => c.standing === 'past_due');
  const trials = contracts.filter((c) => c.standing === 'trial' || c.standing === 'trial_ended');

  const series = monthPoints(now, 12).map(({ label, at }, i, all) => {
    const prevAt = i === 0 ? new Date(at.getTime() - 31 * DAY_MS) : all[i - 1]!.at;
    let value = 0;
    let gained = 0;
    let expansion = 0;
    let contraction = 0;
    let lost = 0;
    for (const c of contracts) {
      const after = valueAt(c, at, changes);
      const before = valueAt(c, prevAt, changes);
      value += after;
      if (before === 0 && after > 0) gained += after;
      else if (before > 0 && after === 0) lost += before;
      else if (after > before) expansion += after - before;
      else if (after < before) contraction += before - after;
    }
    return {
      month: label,
      mrr: value,
      net: gained + expansion - contraction - lost,
      new: gained,
      expansion,
      contraction,
      churn: lost,
    };
  });

  const PLAN_ORDER = ['business', 'custom', 'pro'];
  const byPlan = PLAN_ORDER.map((code) => {
    const rowsOnPlan = earning.filter((c) => c.subscription?.planCode === code);
    return {
      code,
      name: rowsOnPlan[0]?.subscription?.planName ?? code[0]!.toUpperCase() + code.slice(1),
      value: rowsOnPlan.reduce((sum, c) => sum + (c.monthly ?? 0), 0),
      count: rowsOnPlan.length,
    };
  }).filter((p) => p.count > 0);

  /* Recoverable first — a workspace still being served is a call somebody can
     make today; a suspended one is a write-off decision. Then by days late. */
  const collections = contracts
    .filter((c) => c.arrears !== null)
    .sort((a, b) => {
      const aStopped = a.standing === 'stopped' ? 1 : 0;
      const bStopped = b.standing === 'stopped' ? 1 : 0;
      return aStopped - bStopped || (b.arrears?.days ?? 0) - (a.arrears?.days ?? 0);
    });

  const BUCKETS = [
    { bucket: '0–30 days', min: 0, max: 30 },
    { bucket: '31–60 days', min: 31, max: 60 },
    { bucket: '61–90 days', min: 61, max: 90 },
    { bucket: '91+ days', min: 91, max: Infinity },
  ];
  const ageing = BUCKETS.map(({ bucket, min, max }) => ({
    bucket,
    amount: collections
      .filter((c) => (c.arrears?.days ?? 0) >= min && (c.arrears?.days ?? 0) <= max)
      .reduce((sum, c) => sum + (c.arrears?.amount ?? 0), 0),
  }));

  return {
    contracts,
    mrr,
    arr: mrr * 12,
    paying: earning.length,
    averagePerPaying: Math.round(mrr / Math.max(1, earning.length)),
    atRisk: pastDue.reduce((sum, c) => sum + (c.monthly ?? 0), 0),
    pastDueCount: collections.length,
    unpaid: collections.reduce((sum, c) => sum + (c.arrears?.amount ?? 0), 0),
    trials: {
      count: trials.length,
      ended: trials.filter((c) => c.standing === 'trial_ended').length,
      value: trials.reduce((sum, c) => sum + (c.monthly ?? 0), 0),
    },
    unpriced: contracts.filter(
      (c) => c.monthly === null && c.subscription !== null && c.standing !== 'stopped',
    ),
    unsubscribed: contracts.filter((c) => c.standing === 'none'),
    series,
    byPlan,
    ageing,
    collections,
  };
}

/** "KES 17,000". Whole shillings, always with the unit. */
export function kes(amount: number): string {
  return `KES ${Math.round(amount).toLocaleString('en-GB')}`;
}

/** "17k", "1.24M" — for figures with their unit stated beside them. */
export function shortKes(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(2)}M`;
  if (amount >= 10_000) return `${Math.round(amount / 1_000)}k`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(Math.round(amount));
}
