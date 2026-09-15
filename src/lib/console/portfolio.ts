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

export type PortfolioWorkspace = {
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
  /**
   * What this workspace actually pays each month, in whole KES.
   *
   * ⚠ IT IS NOT ALWAYS THE PLAN'S PRICE, WHICH IS WHY IT IS STORED. Custom is
   * negotiated per customer — `plans.price_amount` is 0 for it, and the seed
   * comment in `constants.ts` is explicit that reading that zero as "free" is
   * wrong. A trial pays nothing yet; a suspended workspace pays nothing now.
   * The figure here is what the business would put on an invoice this month.
   */
  monthlyFee: number;
  /** Whole months since the workspace was provisioned. Drives cohort ordering. */
  ageMonths: number;
  /**
   * When billing STOPPED, in whole months ago. Undefined means it never has.
   *
   * ⚠ IT IS SEPARATE FROM `monthlyFee: 0` BECAUSE HISTORY IS NOT THE PRESENT. A
   * suspended workspace pays nothing this month and DID pay for the eight
   * before it — and the revenue chart's churn bar is precisely the difference
   * between those two facts. Reading today's zero backwards would draw a
   * business that never had the customer at all.
   */
  churnedMonthsAgo?: number;
  /**
   * What this workspace owes, when it owes anything.
   *
   * ⚠ ADDED BECAUSE THE COLLECTION QUEUE WAS A SECOND, PARALLEL PORTFOLIO.
   *
   * `getRevenue()` shipped a hand-written queue of five debtors —
   * `kilimanjaro-logistics`, `mombasa-freight`, `highfield-insurance`,
   * `aurora-dental`, `nyali-property` — and not one of them exists in this
   * file, the seed, or the database. Its ageing buckets and its "594k
   * outstanding" were totals of that fiction, and the overview's headline
   * sentence quoted the same 594k as the first number a reader sees in the
   * product.
   *
   * So the most prominent figure in the console described customers who do not
   * exist, and the "Open collection queue" button beside it led to a list of
   * them. This is the same drift that put three retired plans in the
   * provisioning modal, and it gets the same fix: the debt belongs to the
   * workspace that owes it, in the one file both the seed and the fixtures
   * read.
   */
  arrears?: {
    /** Invoice reference, as it appears on the customer's statement. */
    invoice: string;
    /** Whole days since the invoice fell due. Drives the ageing buckets. */
    days: number;
    /** Amount owed in whole KES. May exceed one month for a long debt. */
    amount: number;
    /** Retry state, as prose. "2 of 3", "exhausted". */
    attempts: string;
  };
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
export const PORTFOLIO: readonly PortfolioWorkspace[] = [
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
    monthlyFee: 3_400,
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
    monthlyFee: 17_000,
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
    /* Suspended: billing has stopped. The arrears live in the debt card. */
    monthlyFee: 0,
    ageMonths: 9,
    /* Paid for eight months, then stopped. This is the churn bar. */
    churnedMonthsAgo: 1,
    /* Three months of a Pro subscription, unpaid, retries gone. This is the
       write-off decision the debt card is built to put in front of somebody. */
    arrears: { invoice: 'INV-2026-0688', days: 94, amount: 10_200, attempts: 'exhausted' },
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
    monthlyFee: 17_000,
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
    monthlyFee: 17_000,
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
    monthlyFee: 3_400,
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
       as free — 08 §2 and the seed constants both say so. */
    monthlyFee: 45_000,
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
    /* Still billed. Being past due is what makes it money at risk rather than
       money lost — the distinction the debt card exists to draw. */
    monthlyFee: 17_000,
    ageMonths: 8,
    /* One month, six days late, two retries spent. Still recoverable, which is
       what separates it from the row above. */
    arrears: { invoice: 'INV-2026-0841', days: 6, amount: 17_000, attempts: '2 of 3' },
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
    monthlyFee: 0,
    ageMonths: 0,
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
    monthlyFee: 0,
    ageMonths: 0,
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
    monthlyFee: 17_000,
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
    monthlyFee: 3_400,
    ageMonths: 2,
  },
];

/* ── Everything below is DERIVED. Nothing here is a typed-in number. ─────── */

/**
 * The database's value, and the word a person reads.
 *
 * ⚠ THEY DIFFER BY AN UNDERSCORE AND THAT IS NOT AN ACCIDENT. `past_due` is the
 * `tenant_status` enum — it is what gets written, queried and asserted against.
 * `past due` is `WorkspaceStatus`, the console's display vocabulary, and it is
 * what `statusHue.ts` keys its colours by.
 *
 * Conflating them breaks in the direction that is hardest to see: a donut
 * segment keyed `past_due` finds no hue, renders grey, and looks like a status
 * nobody styled rather than a lookup that missed. That exact failure — a colour
 * map keyed by the wrong string — has already cost this codebase one shipped
 * regression (18 §13).
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

/**
 * The donut, in the order the console reads statuses.
 *
 * ⚠ A STATUS WITH ZERO WORKSPACES IS OMITTED, not drawn as an empty segment —
 * a ring with a label and no arc is read as a rendering fault.
 */
export const PORTFOLIO_TOTALS = (['active', 'trial', 'past_due', 'suspended'] as const)
  .map((status) => ({ status: DISPLAY_STATUS[status], count: countByStatus(status) }))
  .filter((s) => s.count > 0);

/** "8 active · 2 trial · 1 past due · 1 suspended". */
export const PORTFOLIO_NOTE = PORTFOLIO_TOTALS.map((s) => `${s.count} ${s.status}`).join(' · ');

/**
 * Monthly recurring revenue, in whole KES.
 *
 * ⚠ PAST DUE IS COUNTED AND SUSPENDED IS NOT. A past-due workspace is still
 * contracted and still using the product — the invoice is late, not cancelled —
 * so excluding it would understate the business and hide the thing the debt card
 * exists to chase. A suspended one has stopped being served, so counting it
 * would book revenue for a service nobody is receiving.
 */
export const MRR = PORTFOLIO.reduce((sum, w) => sum + w.monthlyFee, 0);

export const ARR = MRR * 12;

/** Workspaces that actually pay something this month. */
export const PAYING_COUNT = PORTFOLIO.filter((w) => w.monthlyFee > 0).length;

export const AVERAGE_PER_PAYING = Math.round(MRR / Math.max(1, PAYING_COUNT));

/** Revenue by plan, for the mix chart. Custom is negotiated, so it sums fees. */
export const REVENUE_BY_PLAN = (['business', 'custom', 'pro'] as const)
  .map((plan) => {
    const rows = PORTFOLIO.filter((w) => w.plan === plan);
    const value = rows.reduce((sum, w) => sum + w.monthlyFee, 0);
    return {
      plan,
      name: plan === 'pro' ? 'Pro' : plan === 'business' ? 'Business' : 'Custom',
      value,
      count: rows.length,
      tenants: `${rows.length} ${rows.length === 1 ? 'workspace' : 'workspaces'}`,
    };
  })
  .filter((r) => r.count > 0);

/** Seat limits, matching `SEED_PLANS`. Null is unlimited. */
export const SEAT_LIMIT: Record<PortfolioPlan, number | null> = {
  pro: 1,
  business: 10,
  custom: null,
};

/**
 * Workspaces at or near their seat ceiling — what the queue and the headroom
 * band are for. Unlimited plans can never appear.
 *
 * ⚠ A ONE-SEAT PLAN IS NOT UNDER PRESSURE FOR HAVING ITS ONE SEAT, AND THIS
 *   USED TO REPORT FIVE WORKSPACES IN DISTRESS THAT WERE SIMPLY SOLO.
 *
 * Pro is a single-seat plan — KES 3,400 for one person, which is the right
 * shape for the sole traders it is sold to, and it is what `plan_entitlements`
 * holds. So every Pro workspace sits at exactly 1 of 1, permanently, from the
 * day it is created. A percentage test called that 100% and filed five of
 * twelve workspaces as needing attention, which made the overview's headline
 * ("N workspaces need you today") disagree with the queue printed beneath it
 * and buried the ONE workspace that was genuinely about to run out.
 *
 * Pressure means "there is room here and it is running out". A ceiling of one
 * has no room to run out of: the event that matters for a solo plan is the
 * customer trying to add a second person, which arrives as a REFUSED seat
 * rather than as a percentage, and belongs in the queue as an upgrade
 * conversation rather than here as a warning.
 *
 * So a ceiling must be greater than one to be capable of pressure at all.
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

/**
 * Seats in use across the portfolio, and the ceiling they sit under.
 *
 * ⚠ ADDED BECAUSE THE OVERVIEW HERO WAS CLAIMING "128k REQUESTS · p95 142ms ·
 *   errors 0.011%" AND NOTHING IN THIS PRODUCT MEASURES ANY OF THE THREE.
 *
 * That signal linked to `/platform/health`, which says in its own copy that
 * the vitals are not wired — so the hero asserted a latency figure and then
 * sent a reader to a page admitting there is no latency figure. Seats are the
 * opposite kind of number: `usage_counters` holds them, the seed writes them,
 * the plan sets the ceiling, and running out of them is the single most common
 * reason a customer moves up a plan. It is the capacity fact the business
 * actually runs on.
 *
 * `custom` has no ceiling, so it contributes seats to the numerator and
 * nothing to the denominator — the honest arithmetic, and the reason this is
 * a function here rather than a sum at the call site.
 */
export const SEATS_IN_USE = PORTFOLIO.reduce((sum, w) => sum + w.seats, 0);

/**
 * ⚠ THE DENOMINATOR COUNTS ONLY THE WORKSPACES IT CAN. The first version of
 * this summed every ceiling and compared it to every seat — including the 24
 * seats on the one `custom` workspace, which has no ceiling to contribute. The
 * hero would have read "68 of 65", a platform apparently 105% full, which is
 * not a number anybody can act on and not one anybody would believe.
 *
 * Both halves now exclude the uncapped plans, and the uncapped seats are
 * reported separately rather than folded in — a ratio is only meaningful over
 * the population it is a ratio of.
 */
const CAPPED = PORTFOLIO.filter((w) => SEAT_LIMIT[w.plan] !== null);

export const SEATS_ON_CAPPED_PLANS = CAPPED.reduce((sum, w) => sum + w.seats, 0);

export const SEATS_CAPACITY = CAPPED.reduce((sum, w) => sum + (SEAT_LIMIT[w.plan] ?? 0), 0);

/** Seats on plans with no ceiling. Stated, never averaged into a percentage. */
export const SEATS_UNCAPPED = SEATS_IN_USE - SEATS_ON_CAPPED_PLANS;

/** Workspaces a plan ceiling is already pressing on. `seatPressure`'s count. */
export const SEATS_UNDER_PRESSURE = seatPressure().length;

/**
 * Workspaces that need somebody today.
 *
 * ⚠ THE SAME DEFINITION `lib/console/attention.ts` APPLIES TO LIVE ROWS, so
 * the designed hero and the live one count the same thing: a workspace is
 * asking for attention when it is past due, already suspended, or pressing on
 * a seat ceiling.
 *
 * It matters that this is derived rather than typed out, because the hero's
 * headline sentence opens by naming this number — "Three workspaces need you
 * today" — and a literal there would drift from the queue printed directly
 * underneath it the first time the portfolio changed.
 */
/**
 * Money billed and not paid: what the past-due and suspended workspaces owe.
 *
 * ⚠ THE HERO'S HEADLINE ASSERTED "KES 594,000 IS SITTING UNCOLLECTED" AS A
 *   LITERAL, and no workspace in the portfolio adds up to it.
 *
 * It is the first sentence on the first screen of the product, it is the
 * number the "Open collection queue" button sends somebody to act on, and the
 * collection queue underneath it was totalling something else entirely. A
 * headline figure that disagrees with the list it introduces is worse than no
 * headline figure: it teaches the reader that the sentence is decoration.
 *
 * Counted as months owed × the monthly fee, so a workspace three months behind
 * contributes three months. `monthsOverdue` is on the record for exactly this.
 */
export const IN_ARREARS = PORTFOLIO.filter(
  (w): w is PortfolioWorkspace & { arrears: NonNullable<PortfolioWorkspace['arrears']> } =>
    w.arrears !== undefined,
).sort((a, b) => b.arrears.days - a.arrears.days);

export const UNCOLLECTED = IN_ARREARS.reduce((sum, w) => sum + w.arrears.amount, 0);

/**
 * The ageing buckets, derived rather than typed out.
 *
 * ⚠ THE FIXTURE'S FOUR BUCKETS SUMMED TO 594,000 AND ITS COLLECTION QUEUE
 *   SUMMED TO 486,000 — two totals for one debt, on one screen, three hundred
 *   pixels apart. Neither matched any workspace that exists. Derived from the
 *   arrears above, the chart and the list cannot disagree, because they are
 *   the same rows counted two ways.
 *
 * A bucket with nothing in it is kept rather than dropped: an ageing chart is
 * read as a SHAPE — debt sliding rightwards over time is the thing it exists
 * to show — and a missing column silently rescales the axis and flatters the
 * picture.
 */
export const AGEING_BUCKETS: ReadonlyArray<{ bucket: string; amount: number }> = [
  { bucket: '1–30 days', max: 30 },
  { bucket: '31–60 days', max: 60 },
  { bucket: '61–90 days', max: 90 },
  { bucket: '90+ days', max: Infinity },
].map(({ bucket, max }, i, all) => {
  const min = i === 0 ? 0 : (all[i - 1]?.max ?? 0);
  return {
    bucket,
    amount: IN_ARREARS.filter((w) => w.arrears.days > min && w.arrears.days <= max).reduce(
      (sum, w) => sum + w.arrears.amount,
      0,
    ),
  };
});

export const NEEDING_ATTENTION = new Set([
  ...PORTFOLIO.filter((w) => w.status === 'past_due' || w.status === 'suspended').map((w) => w.slug),
  ...seatPressure()
    .filter((row) => row.percent >= 90)
    .map((row) => row.workspace.slug),
]).size;

/** List price per plan, matching `SEED_PLANS`. Custom is negotiated per row. */
export const PLAN_PRICE: Record<PortfolioPlan, number> = {
  pro: 3_400,
  business: 17_000,
  custom: 0,
};

/** What a workspace billed in a given month, counting backwards from now. */
function feeAt(w: PortfolioWorkspace, monthsAgo: number): number {
  // Not yet a customer.
  if (w.ageMonths < monthsAgo) return 0;
  // Already churned by then.
  if (w.churnedMonthsAgo !== undefined && monthsAgo < w.churnedMonthsAgo) return 0;
  // A trial has never billed.
  if (w.status === 'trial') return 0;
  // Custom is negotiated, so its own fee is the only source. Everything else
  // bills list price — and a churned workspace's CURRENT fee is zero, which is
  // exactly why history cannot be read from it.
  return w.plan === 'custom' ? w.monthlyFee : PLAN_PRICE[w.plan];
}

/** "Sep", "Oct", … ending with the current month. */
function monthLabels(count: number): string[] {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (count - 1 - i), 1);
    return d.toLocaleDateString('en-GB', { month: 'short' });
  });
}

export type RevenueMonth = {
  month: string;
  mrr: number;
  net: number;
  new: number;
  expansion: number;
  contraction: number;
  churn: number;
};

/**
 * Twelve months of revenue, DERIVED from when each workspace joined and left.
 *
 * ⚠ IT REPLACES TWENTY-FOUR TYPED-IN NUMBERS, AND THE ARITHMETIC IS THE REASON.
 *
 * The fixture it replaces carried an MRR series and a movement series as two
 * separate hand-written tables, with a comment promising "every row here adds to
 * the `net` on the row above it". That promise held only while somebody
 * maintained it by hand — and the whole table was scaled to a 47-workspace
 * business that does not exist.
 *
 * Here the movement IS the difference between two months, computed per
 * workspace, so the parts cannot fail to reconcile with the total. The last
 * month's `mrr` equals `MRR` above by construction, because both are the same
 * sum over the same twelve rows.
 *
 * ⚠ EXPANSION AND CONTRACTION ARE HONESTLY ZERO. Neither is derivable: nothing
 * in this list records a workspace changing plan mid-life, and inventing a
 * number to make the chart livelier would put a movement in front of a reader
 * that never happened. When plan changes are recorded — `subscription.
 * plan_assigned` is already in the audit catalogue — they become real.
 */
export function revenueSeries(): RevenueMonth[] {
  const labels = monthLabels(12);

  return labels.map((month, index) => {
    const monthsAgo = 11 - index;
    const previousAgo = monthsAgo + 1;

    const mrr = PORTFOLIO.reduce((sum, w) => sum + feeAt(w, monthsAgo), 0);
    const previous = PORTFOLIO.reduce((sum, w) => sum + feeAt(w, previousAgo), 0);

    // Attributed per workspace, so `new` and `churn` name real customers.
    let gained = 0;
    let lost = 0;
    for (const w of PORTFOLIO) {
      const before = feeAt(w, previousAgo);
      const after = feeAt(w, monthsAgo);
      if (after > before) gained += after - before;
      if (after < before) lost += before - after;
    }

    return {
      month,
      mrr,
      net: mrr - previous,
      new: gained,
      expansion: 0,
      contraction: 0,
      churn: lost,
    };
  });
}
