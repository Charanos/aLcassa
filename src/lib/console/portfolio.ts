/**
 * THE TWELVE WORKSPACES. One definition, read by the seed AND by the fixtures.
 *
 * ⚠ THIS FILE EXISTS BECAUSE THE PRODUCT WAS TELLING TWO DIFFERENT STORIES.
 *
 * The designed fixtures described a portfolio of **47 workspaces turning over
 * KES 6.04M a month**, on a four-tier catalogue — Trial, Starter, Growth, Scale
 * — that was replaced by Pro / Business / Custom on 24 August 2026. The database
 * held **three** tenants. So:
 *
 *   · the revenue screen averaged 6.04M "across 47 workspaces"
 *   · the plan mix charted 19 workspaces on a plan that no longer exists
 *   · the tenants table, being live, listed three
 *   · the overview's portfolio donut, being a fixture, drew forty-seven
 *
 * Every one of those numbers was defensible when it was written. None of them
 * was true, and two screens sitting side by side disagreed about how large the
 * business is — which is the single most damaging thing a console can do to the
 * person reading it.
 *
 * ⚠ WHY A SHARED MODULE RATHER THAN "FIX THE FIXTURES".
 *
 * Correcting the literals would have bought agreement for exactly as long as it
 * took somebody to seed a thirteenth tenant. The figures now DERIVE from this
 * list: seeding a workspace changes the donut, the plan mix and the revenue
 * headline, because they are all computed from the same twelve rows. The two
 * paths cannot drift apart again without somebody deleting this file.
 *
 * ⚠ NO DIRECTIVE, DELIBERATELY. `db/seed/**` is a standalone tsx script and
 * `lib/console/data.ts` is `server-only`; a shared value has to sit in a module
 * that is neither. Same reasoning as `statusHue.ts` and `profileName.ts`, and
 * the same trap avoided — 18 §13.
 *
 * ⚠ THE FIRST THREE ARE LOAD-BEARING AND MUST KEEP THEIR IDS AND SHAPE.
 * `tests/isolation/*` asserts against `SEED_TENANT_A` (Pro, at its 1-seat
 * limit), `B` (Business, the ordinary case) and `C` (suspended, which proves the
 * status predicate in the modify policies actually fires). Their plan, status
 * and seat usage are part of what the suite tests, not decoration.
 */

import { invoiceReference } from './references';
import {
  addMonths,
  computeRevenue,
  currentPeriod,
  type ContractRow,
  type RevenueFigures,
  type RevenuePoint,
} from './revenue';

/** Fixed ids for the three the isolation suite names. See `db/seed/constants`. */
export const TENANT_A = '00000000-0000-4000-8000-00000000000a';
export const TENANT_B = '00000000-0000-4000-8000-00000000000b';
export const TENANT_C = '00000000-0000-4000-8000-00000000000c';

/**
 * The three owner ids the isolation suite also pins.
 *
 * ⚠ `tests/isolation/account-lifecycle` and `entitlements` name these by value
 * as the actors they run as. `db/seed/constants.ts` re-exports them so the
 * tests keep importing from where they always have, and there is one definition.
 */
export const USER_A = '00000000-0000-4000-8000-0000000000a1';
export const USER_B = '00000000-0000-4000-8000-0000000000b1';
export const USER_C = '00000000-0000-4000-8000-0000000000c1';

export type PortfolioPlan = 'pro' | 'business' | 'custom';

/** The five the console's status vocabulary actually renders. `statusHue.ts`. */
export type PortfolioStatus = 'active' | 'trial' | 'past_due' | 'suspended';

type PortfolioSeed = {
  id: string;
  slug: string;
  name: string;
  plan: PortfolioPlan;
  status: PortfolioStatus;
  /**
   * The owner's fixed id.
   *
   * ⚠ THE FIRST THREE ARE PINNED BY THE ISOLATION SUITE and must not be
   * generated — `account-lifecycle` and `entitlements` run AS them, by value.
   * The rest are arbitrary but fixed, so re-seeding replaces rather than
   * accumulates.
   */
  ownerId: string;
  /** Owner's display name and address. Seeded as a real member. */
  owner: { name: string; email: string };
  /** Seats in use. The limit comes from the plan, not from here. */
  seats: number;
  /** Channels connected. */
  channels: number;
  /** Whole months since the workspace was provisioned. Drives cohort ordering. */
  ageMonths: number;
  /**
   * The negotiated monthly price, for Custom only. Everything else bills the
   * plan's list price, which lives in `SEED_PLANS`, not here. Doc 25 · R1.
   */
  contractAmount?: number;
  /** For a trial: days until it ends. The seed writes `trial_ends_at` from it. */
  trialDaysLeft?: number;
  /**
   * For a suspended workspace: how long ago it was suspended. Billing stops
   * there, so the revenue curve shows the churn in the right month and the
   * arrears stop accruing on the day service did.
   */
  suspendedDaysAgo?: number;
  /**
   * ⚠ ADDED BECAUSE THE COLLECTION QUEUE WAS A SECOND, PARALLEL PORTFOLIO.
   *
   * `getRevenue()` shipped a hand-written queue of five debtors who existed in
   * no file, seed or table. The debt now belongs to the workspace that owes
   * it, in the one file both the seed and the fixtures read.
   *
   * ⚠ ONLY THE DATE IS TYPED. The amount is DERIVED — periods fallen due since
   * the subscription went past due, times the contracted price — by the same
   * `computeRevenue` the live screen runs over the database. A typed amount
   * was how the queue, the ageing chart and the headline came to disagree.
   */
  arrears?: {
    /** Whole days since the subscription went past due. Seeded as `past_due_since`. */
    days: number;
    /** Retry state, as prose. Designed only: Phase 1 has no gateway to retry. */
    attempts: string;
  };
};

/** A workspace with its money derived. What every consumer of this file reads. */
export type PortfolioWorkspace = PortfolioSeed & {
  /** What this workspace is contracted to pay this month. 0 for trials and stopped workspaces. */
  monthlyFee: number;
  arrears?: PortfolioSeed['arrears'] & { amount: number };
};

/**
 * ⚠ TWELVE, AND THE MIX IS THE POINT RATHER THAN THE COUNT.
 *
 * A portfolio that is twelve healthy active workspaces exercises none of the
 * screens that matter. This one carries, deliberately: one workspace at its seat
 * limit and two more within one seat of it (the queue and the headroom band),
 * one past due (the debt card and the outstanding figure), one suspended (the
 * status predicate), two on trial (conversion), and one on a negotiated custom
 * price (the plan mix's awkward case, where price is not the plan's price).
 */
const PORTFOLIO_SEED: readonly PortfolioSeed[] = [
  {
    id: TENANT_A,
    slug: 'acme-industrial',
    name: 'Acme Industrial',
    plan: 'pro',
    status: 'active',
    ownerId: USER_A,
    owner: { name: 'Grace Wanjiku', email: 'grace@acme-industrial.example' },
    /* AT the 1-seat Pro limit. The isolation suite depends on this. */
    seats: 1,
    channels: 1,
    ageMonths: 14,
  },
  {
    id: TENANT_B,
    slug: 'northwind',
    name: 'Northwind Traders',
    plan: 'business',
    status: 'active',
    ownerId: USER_B,
    owner: { name: 'Peter Otieno', email: 'peter@northwind.example' },
    seats: 6,
    channels: 3,
    ageMonths: 11,
  },
  {
    id: TENANT_C,
    slug: 'tamarind',
    name: 'Tamarind Hotels',
    plan: 'pro',
    status: 'suspended',
    ownerId: USER_C,
    owner: { name: 'Fatuma Ali', email: 'fatuma@tamarind.example' },
    seats: 1,
    channels: 1,
    ageMonths: 9,
    /* Three months of a Pro subscription, unpaid, retries gone. This is the
       write-off decision the debt card is built to put in front of somebody. */
    arrears: { days: 94, attempts: 'exhausted' },
    /* Suspended a month ago, after three monthly charges went unpaid — so it
       owes three periods of Pro, and nothing for the month it was not served. */
    suspendedDaysAgo: 30,
  },
  {
    id: '00000000-0000-4000-8000-00000000000d',
    slug: 'sokoni-fresh',
    name: 'Sokoni Fresh Markets',
    plan: 'business',
    status: 'active',
    ownerId: '00000000-0000-4000-8000-0000000000d1',
    owner: { name: 'Mercy Njeri', email: 'mercy@sokonifresh.example' },
    /* 9 of 10 — the pressure case the queue is built to surface. */
    seats: 9,
    channels: 4,
    ageMonths: 7,
  },
  {
    id: '00000000-0000-4000-8000-00000000000e',
    slug: 'jasiri-logistics',
    name: 'Jasiri Logistics',
    plan: 'business',
    status: 'active',
    ownerId: '00000000-0000-4000-8000-0000000000e1',
    owner: { name: 'Samuel Kiprop', email: 'samuel@jasiri.example' },
    seats: 4,
    channels: 2,
    ageMonths: 6,
  },
  {
    id: '00000000-0000-4000-8000-00000000000f',
    slug: 'pwani-coffee',
    name: 'Pwani Coffee Roasters',
    plan: 'pro',
    status: 'active',
    ownerId: '00000000-0000-4000-8000-0000000000f1',
    owner: { name: 'Halima Said', email: 'halima@pwanicoffee.example' },
    seats: 1,
    channels: 1,
    ageMonths: 5,
  },
  {
    id: '00000000-0000-4000-8000-000000000010',
    slug: 'bahari-freight',
    name: 'Bahari Freight',
    plan: 'custom',
    status: 'active',
    ownerId: '00000000-0000-4000-8000-000000001001',
    owner: { name: 'Joseph Mwangi', email: 'joseph@baharifreight.example' },
    seats: 24,
    channels: 6,
    /* Negotiated. `plans.price_amount` is 0 for custom and must never be read
       as free — 08 §2 and the seed constants both say so. Seeded into
       `subscriptions.contract_amount`, where the revenue screen reads it. */
    contractAmount: 45_000,
    ageMonths: 4,
  },
  {
    id: '00000000-0000-4000-8000-000000000011',
    slug: 'mlima-insurance',
    name: 'Mlima Insurance',
    plan: 'business',
    status: 'past_due',
    ownerId: '00000000-0000-4000-8000-000000001101',
    owner: { name: 'Caroline Achieng', email: 'caroline@mlima.example' },
    seats: 7,
    channels: 3,
    ageMonths: 8,
    /* One month, six days late, two retries spent. Still recoverable, which is
       what separates it from the row above. */
    arrears: { days: 6, attempts: '2 of 3' },
  },
  {
    id: '00000000-0000-4000-8000-000000000012',
    slug: 'zuri-beauty',
    name: 'Zuri Beauty Collective',
    plan: 'pro',
    status: 'trial',
    ownerId: '00000000-0000-4000-8000-000000001201',
    owner: { name: 'Naomi Wairimu', email: 'naomi@zuribeauty.example' },
    seats: 1,
    channels: 1,
    ageMonths: 0,
    trialDaysLeft: 9,
  },
  {
    id: '00000000-0000-4000-8000-000000000013',
    slug: 'kifaru-security',
    name: 'Kifaru Security',
    plan: 'business',
    status: 'trial',
    ownerId: '00000000-0000-4000-8000-000000001301',
    owner: { name: 'David Ochieng', email: 'david@kifarusecurity.example' },
    seats: 3,
    channels: 2,
    ageMonths: 0,
    /* Two days left: the trial a notification should already be raising. */
    trialDaysLeft: 2,
  },
  {
    id: '00000000-0000-4000-8000-000000000014',
    slug: 'nuru-solar',
    name: 'Nuru Solar',
    plan: 'business',
    status: 'active',
    ownerId: '00000000-0000-4000-8000-000000001401',
    owner: { name: 'Esther Muthoni', email: 'esther@nurusolar.example' },
    /* AT the 10-seat Business limit. The second pressure case, on a bigger
       plan, so the headroom band has two different shapes to draw. */
    seats: 10,
    channels: 5,
    ageMonths: 3,
  },
  {
    id: '00000000-0000-4000-8000-000000000015',
    slug: 'chapati-house',
    name: 'Chapati House',
    plan: 'pro',
    status: 'active',
    ownerId: '00000000-0000-4000-8000-000000001501',
    owner: { name: 'Brian Kimani', email: 'brian@chapatihouse.example' },
    seats: 1,
    channels: 1,
    ageMonths: 2,
  },
];

/* ── Everything below is DERIVED. Nothing here is a typed-in number. ─────── */

/** List price per plan, matching `SEED_PLANS`. Custom is negotiated per row. */
export const PLAN_PRICE: Record<PortfolioPlan, number> = {
  pro: 3_400,
  business: 17_000,
  custom: 0,
};

const PLAN_NAME: Record<PortfolioPlan, string> = {
  pro: 'Pro',
  business: 'Business',
  custom: 'Custom',
};

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Subscription status from the workspace's status.
 *
 * ⚠ THEY ARE TWO DIFFERENT VOCABULARIES AND THE MAPPING IS NOT AN IDENTITY.
 * `tenant_status` is about whether the workspace WORKS; `subscription_status` is
 * about whether the money is current. A suspended workspace's subscription is
 * `past_due` — it was not cancelled, and treating it as cancelled would erase
 * the arrears the debt card exists to chase.
 */
export const SUBSCRIPTION_STATUS: Record<
  PortfolioStatus,
  NonNullable<ContractRow['subscription']>['status']
> = {
  active: 'active',
  trial: 'trialing',
  past_due: 'past_due',
  suspended: 'past_due',
};

/**
 * The portfolio as contract rows — the shape `computeRevenue` reads, and the
 * shape the seed writes into `tenants` and `subscriptions`.
 *
 * ⚠ EVERY DATE IS RELATIVE TO `now`, AND THE SEED USES THIS SAME FUNCTION. A
 * seed run on 14 September wrote periods ending 1 October and trials ending 30
 * September; by 1 October every trial had silently lapsed and every period had
 * expired. The dates are a consequence of `now`, so the next seed puts them
 * back where the story needs them.
 */
export function portfolioContractRows(now: Date): ContractRow[] {
  return PORTFOLIO_SEED.map((w) => {
    const provisionedAt = addMonths(now, -w.ageMonths);
    const suspendedAt =
      w.suspendedDaysAgo !== undefined
        ? new Date(now.getTime() - w.suspendedDaysAgo * DAY_MS)
        : null;
    const trialEndsAt =
      w.trialDaysLeft !== undefined ? new Date(now.getTime() + w.trialDaysLeft * DAY_MS) : null;
    const pastDueSince = w.arrears ? new Date(now.getTime() - w.arrears.days * DAY_MS) : null;
    /* A trial's period IS the trial; everything else renews monthly on the
       anniversary of provisioning, so renewals spread across the month. */
    const period = trialEndsAt
      ? { start: new Date(trialEndsAt.getTime() - 14 * DAY_MS), end: trialEndsAt }
      : currentPeriod(provisionedAt, now);

    return {
      tenantId: w.id,
      slug: w.slug,
      name: w.name,
      tenantStatus: w.status,
      provisionedAt,
      suspendedAt,
      subscription: {
        status: SUBSCRIPTION_STATUS[w.status],
        planCode: w.plan,
        planName: PLAN_NAME[w.plan],
        listPrice: PLAN_PRICE[w.plan],
        intervalUnit: 'month',
        intervalCount: 1,
        contractAmount: w.contractAmount ?? null,
        trialEndsAt,
        pastDueSince,
        stoppedAt: null,
        currentPeriodStart: period.start,
        currentPeriodEnd: period.end,
        cancelAtPeriodEnd: false,
      },
    };
  });
}

/** The designed portfolio's money, by the same arithmetic as the live screen. */
export const PORTFOLIO_REVENUE: RevenueFigures = computeRevenue(
  portfolioContractRows(new Date()),
  new Date(),
);

const CONTRACTS = new Map(PORTFOLIO_REVENUE.contracts.map((c) => [c.tenantId, c]));

export const PORTFOLIO: readonly PortfolioWorkspace[] = PORTFOLIO_SEED.map(({ arrears, ...w }) => {
  const c = CONTRACTS.get(w.id);
  const earning = c?.standing === 'billing' || c?.standing === 'past_due';
  return {
    ...w,
    monthlyFee: earning ? (c?.monthly ?? 0) : 0,
    ...(arrears ? { arrears: { ...arrears, amount: c?.arrears?.amount ?? 0 } } : {}),
  };
});

/**
 * The database's value, and the word a person reads.
 *
 * ⚠ THEY DIFFER BY AN UNDERSCORE AND THAT IS NOT AN ACCIDENT. `past_due` is the
 * `tenant_status` enum; `past due` is the console's display vocabulary, and it
 * is what `statusHue.ts` keys its colours by. A donut segment keyed `past_due`
 * finds no hue and renders grey (18 §13).
 */
const DISPLAY_STATUS: Record<PortfolioStatus, 'active' | 'trial' | 'past due' | 'suspended'> = {
  active: 'active',
  trial: 'trial',
  past_due: 'past due',
  suspended: 'suspended',
};

export const PORTFOLIO_COUNT = PORTFOLIO.length;

export function countByStatus(status: PortfolioStatus): number {
  return PORTFOLIO.filter((w) => w.status === status).length;
}

/** The donut, in the order the console reads statuses. Empty statuses omitted. */
export const PORTFOLIO_TOTALS = (['active', 'trial', 'past_due', 'suspended'] as const)
  .map((status) => ({ status: DISPLAY_STATUS[status], count: countByStatus(status) }))
  .filter((s) => s.count > 0);

/** "8 active · 2 trial · 1 past due · 1 suspended". */
export const PORTFOLIO_NOTE = PORTFOLIO_TOTALS.map((s) => `${s.count} ${s.status}`).join(' · ');

/**
 * Contracted monthly value, in whole KES. Past due is counted — the invoice is
 * late, not cancelled — and suspended is not, because nobody is being served.
 */
export const MRR = PORTFOLIO_REVENUE.mrr;
export const ARR = PORTFOLIO_REVENUE.arr;
export const PAYING_COUNT = PORTFOLIO_REVENUE.paying;
export const AVERAGE_PER_PAYING = PORTFOLIO_REVENUE.averagePerPaying;

/** Revenue by plan, for the mix chart. */
export const REVENUE_BY_PLAN = PORTFOLIO_REVENUE.byPlan.map((p) => ({
  plan: p.code as PortfolioPlan,
  name: p.name,
  value: p.value,
  count: p.count,
  tenants: `${p.count} ${p.count === 1 ? 'workspace' : 'workspaces'}`,
}));

/** Seat limits, matching `SEED_PLANS`. Null is unlimited. */
export const SEAT_LIMIT: Record<PortfolioPlan, number | null> = {
  pro: 1,
  business: 10,
  custom: null,
};

/**
 * Workspaces at or near their seat ceiling.
 *
 * ⚠ A ONE-SEAT PLAN IS NOT UNDER PRESSURE FOR HAVING ITS ONE SEAT. Pro is a
 * single-seat plan, so every Pro workspace sits at 1 of 1 from the day it is
 * created; a percentage test filed five of twelve as needing attention. A
 * ceiling must be greater than one to be capable of pressure at all.
 */
export function seatPressure(): Array<{ workspace: PortfolioWorkspace; percent: number }> {
  return PORTFOLIO.flatMap((workspace) => {
    const limit = SEAT_LIMIT[workspace.plan];
    if (limit === null || limit <= 1) return [];
    return [{ workspace, percent: Math.round((workspace.seats / limit) * 100) }];
  })
    .filter((row) => row.percent >= 80)
    .sort((a, b) => b.percent - a.percent);
}

export const SEATS_IN_USE = PORTFOLIO.reduce((sum, w) => sum + w.seats, 0);

/** Only plans with a ceiling contribute to the ratio; the uncapped are stated apart. */
const CAPPED = PORTFOLIO.filter((w) => SEAT_LIMIT[w.plan] !== null);
export const SEATS_ON_CAPPED_PLANS = CAPPED.reduce((sum, w) => sum + w.seats, 0);
export const SEATS_CAPACITY = CAPPED.reduce((sum, w) => sum + (SEAT_LIMIT[w.plan] ?? 0), 0);
export const SEATS_UNCAPPED = SEATS_IN_USE - SEATS_ON_CAPPED_PLANS;
export const SEATS_UNDER_PRESSURE = seatPressure().length;

/** Past-due and suspended workspaces with what they owe, longest first. */
export const IN_ARREARS = PORTFOLIO.filter(
  (w): w is PortfolioWorkspace & { arrears: NonNullable<PortfolioWorkspace['arrears']> } =>
    w.arrears !== undefined,
).sort((a, b) => b.arrears.days - a.arrears.days);

/** What has fallen due and not been marked paid. */
export const UNCOLLECTED = PORTFOLIO_REVENUE.unpaid;

/**
 * The reference on an unpaid invoice. Designed only: Phase 1 raises no
 * invoices. Kept so the designed billing tab and debt card quote one string.
 */
export function arrearsInvoice(slug: string, daysLate: number): string {
  const due = new Date();
  due.setDate(due.getDate() - daysLate);
  return invoiceReference(slug, due);
}

export const AGEING_BUCKETS: ReadonlyArray<{ bucket: string; amount: number }> =
  PORTFOLIO_REVENUE.ageing;

/** Workspaces that need somebody today: past due, suspended, or pressing a ceiling. */
export const NEEDING_ATTENTION = new Set([
  ...PORTFOLIO.filter((w) => w.status === 'past_due' || w.status === 'suspended').map(
    (w) => w.slug,
  ),
  ...seatPressure()
    .filter((row) => row.percent >= 90)
    .map((row) => row.workspace.slug),
]).size;

export type RevenueMonth = RevenuePoint;

/** Twelve months of contracted value, derived — the series the live screen draws too. */
export function revenueSeries(): RevenueMonth[] {
  return PORTFOLIO_REVENUE.series;
}
