import 'server-only';
import { NEAR_LIMIT } from './attention';

/**
 * Console read models.
 *
 * ⚠ THIS FILE IS A SEAM, NOT A MOCK LAYER.
 *
 * Every export is shaped exactly as the query that will replace it returns,
 * and each one names the query in its comment. Keeping the fixtures at this
 * boundary — rather than sprinkled through the pages — means the screens have
 * never seen anything but their real prop shape, so they cannot quietly grow a
 * dependency on a field the database will not have.
 *
 * Everything here is a PLATFORM record read: counts of tenants, subscription
 * states, queue depths. None of it is tenant business data, which is the line
 * 11 §6 rule 3 draws around `dbAsService`. A console that listed customer
 * conversations would need a support session and an entirely different path.
 */

export type QueueSeverity = 'danger' | 'warning' | 'info' | 'inert';

/**
 * What the primary control on a queue card does.
 *
 * ⚠ IT IS A DISCRIMINATED UNION, AND THAT IS THE FUNCTIONAL POINT.
 *
 * The queue used to carry `primaryLabel` and `primaryHref`: a string and a
 * link. Every card's button navigated, including the ones labelled "Retry
 * charge" and "Write off" — verbs that promise an action and delivered a page
 * change. A reader who presses "Write off" and lands on Revenue has been told
 * something happened.
 *
 * Shaping it as a union makes two rules into compile-time facts rather than
 * conventions somebody has to remember:
 *
 *   AN ACTION THAT ACTS MUST NAME ITS TARGET. `assign_plan` cannot be
 *   constructed without a plan code, so a card can never offer to move a
 *   workspace somewhere unspecified.
 *
 *   AN ACTION THAT CANNOT ACT MUST SAY WHY. `retry_charge` and `write_off`
 *   cannot be constructed without a reason, so the Phase 1 gaps are stated on
 *   the control rather than discovered by pressing it. 17 §6.4.
 */
export type QueueAction =
  /**
   * Move the workspace onto a named plan. Real, audited, confirmed first —
   * it changes what a customer is charged.
   */
  | { kind: 'assign_plan'; label: string; planCode: string; planName: string }
  /**
   * The right plan is a judgement rather than an obvious upgrade, so this
   * opens the record instead of guessing. A trial ending with six staff on
   * seats is a phone call, not a button.
   */
  | { kind: 'choose_plan'; label: string; href: string }
  /** Open the record. Always available, never confirmed. */
  | { kind: 'open'; label: string; href: string }
  /** No payment gateway in Phase 1, and no write-off operation. 17 §6.4. */
  | { kind: 'retry_charge' | 'write_off'; label: string; unavailable: string };

export type QueueItem = {
  id: string;
  slug: string;
  name: string;
  severity: QueueSeverity;
  tag: string;
  detail: string;
  /** The one control. See `QueueAction`. */
  action: QueueAction;
  meta: string;
};

export type Signal = {
  id: string;
  label: string;
  value: string;
  note: string;
  href: string;
  /* A closed set, so a typo cannot produce a signal with no glyph. `users`
     was added for the seats signal that replaced the invented request rate. */
  icon: 'coin' | 'pulse' | 'building' | 'bolt' | 'users';
};

/** The four services the console watches. A closed set, so a label typo
 *  cannot silently produce a vital with no icon. */
export type VitalIcon = 'api' | 'ai' | 'channel' | 'job';

/** One line in a vital's expanded detail. Label and value, both formatted. */
export type VitalDetail = { label: string; value: string };

/**
 * One platform vital.
 *
 * ⚠ EVERY FIELD HERE USED TO LIVE IN THE COMPONENT, and that was the defect.
 *
 * `PlatformTelemetry` carried a `METRIC_SPECS` map keyed by this type's old
 * three-field `label`: titles, sublabels, SLA targets, gauge ratios, and four
 * detail rows per service — "p50 latency 44ms", "Edge cluster NBO-1",
 * "Twilio SMS Gateway 99.1%". None of it had a source, none of it was reachable
 * by the live reader, and all of it was invented inside a presentation file.
 *
 * Two things were wrong with that beyond the seam rule. The map was keyed by
 * the vital's LABEL, so renaming a service silently dropped its whole spec. And
 * because the live reader returns no vitals at all, a signed-in operator saw an
 * empty rail while the review bypass saw four richly detailed services — the
 * opposite of the arrangement everywhere else in this console.
 *
 * The shape now says what a probe would have to supply. When
 * `lib/observability` lands, it fills this and the component does not change.
 */
export type Vital = {
  /** Stable across renames. The map that broke was keyed by `label`. */
  key: string;
  /** "Core API Gateway". */
  label: string;
  /** What it does, in five words. */
  sublabel: string;
  /** The headline figure, formatted. "142ms". */
  value: string;
  /** What the figure IS. "p95", "mean", "queued". Never part of `value`,
   *  because the two are set at different sizes. */
  unit: string;
  state: 'ok' | 'warn' | 'bad';
  icon: VitalIcon;
  /** The budget this is measured against, as prose. "< 250ms p95". */
  target: string;
  /** Position against that budget, 0 to 1, for the gauge. Clamped on render. */
  ratio: number;
  /** One word for the current state. "Nominal", "Elevated backlog". */
  statusText: string;
  details: VitalDetail[];
};

export type AuditLine = {
  time: string;
  action: string;
  target: string;
};

export type OverviewModel = {
  operatorFirstName: string;
  /** Formatted server-side. See the note in the Overview page on why. */
  stamp: string;
  headline: { lead: string; figure: string; tail: string };
  signals: Signal[];
  queue: QueueItem[];
  restingCount: number;
  vitals: Vital[];
  recent: AuditLine[];
};

/**
 * The console overview.
 *
 * Replaced by, roughly:
 *   · signals      → aggregate over `subscriptions` + `usage_counters`
 *   · queue        → tenants failing an entitlement or a payment, ranked
 *   · vitals       → the health probes in `lib/observability`
 *   · recent       → `audit_entries` where actor = the platform, limit 5
 *
 * eslint-disable-next-line @typescript-eslint/require-await -- deliberately
 * async with nothing to await yet. Every caller already treats this as a
 * promise, so when the body becomes a `withTenantContext` read the signature
 * does not change and no page needs touching. Making it sync now would mean
 * changing thirteen call sites later to undo it.
 */
/**
 * ⚠ THE PORTFOLIO HEADCOUNT, DECLARED ONCE.
 *
 * The overview's "Workspaces" signal and the status donut in its Portfolio
 * band are the same fact rendered twice, a screen apart, and they were two
 * separate literals — the signal read "47 · 41 active · 4 trial · 2 suspended"
 * while the band counted `getWorkspaces()` and got twelve. Nothing kept them
 * equal, and the page contradicted itself in two places a reader sees at once.
 *
 * Both now read this. It becomes `count(*) … group by status` at M4 and the
 * two stay equal for free.
 */
/**
 * ⚠ THE SPLIT THIS COMMENT DESCRIBES WAS ONLY HALF CLOSED, AND THE OTHER HALF
 * WAS THE EXPENSIVE ONE.
 *
 * Declaring the headcount once did stop the overview contradicting itself. It
 * did nothing about the fact that the number was 47 while the DATABASE held
 * three — so the moment the console was wired to live readers, the fixtures and
 * the tables described businesses of different sizes. The revenue screen
 * averaged KES 6.04M "across 47 workspaces"; the tenants table listed three.
 *
 * Both now derive from `lib/console/portfolio.ts`, which is also what
 * `db/seed/workspaces.ts` writes. The designed path and the live path read one
 * list of twelve, so seeding a thirteenth moves the donut, the plan mix and the
 * revenue headline together.
 */
import {
  PLAN_PRICE,
  PORTFOLIO,
  SEAT_LIMIT,
  type PortfolioWorkspace,
  revenueSeries,
  ARR,
  AVERAGE_PER_PAYING,
  MRR,
  PAYING_COUNT,
  PORTFOLIO_COUNT,
  PORTFOLIO_NOTE,
  PORTFOLIO_TOTALS,
  REVENUE_BY_PLAN,
  NEEDING_ATTENTION,
  UNCOLLECTED,
  IN_ARREARS,
  AGEING_BUCKETS,
  SEATS_CAPACITY,
  SEATS_IN_USE,
  SEATS_UNDER_PRESSURE,
  arrearsInvoice,
} from './portfolio';
import { invoiceReference } from './references';

/* Re-exported so every existing importer of `console/data` keeps working — the
   values simply stopped being literals. */
export {
  ARR,
  AVERAGE_PER_PAYING,
  MRR,
  PAYING_COUNT,
  PORTFOLIO_COUNT,
  PORTFOLIO_NOTE,
  PORTFOLIO_TOTALS,
  REVENUE_BY_PLAN,
};

/**
 * Small counts as words, because the hero's headline is a SENTENCE.
 *
 * ⚠ "4 workspaces need you today" is a dashboard caption; "Four workspaces
 * need you today" is a sentence somebody wrote. The distinction is the whole
 * design of this screen — 03 §9 asks the lede to read as prose, and a numeral
 * mid-sentence is the fastest way to make prose look generated. Past ten the
 * word is longer than the figure and the convention reverses.
 */
const WORDS = [
  'No',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
] as const;

function spell(n: number): string {
  return WORDS[n] ?? String(n);
}

/**
 * THE QUEUE, BUILT FROM THE TWELVE WORKSPACES THAT EXIST.
 *
 * ⚠ SEVERITY IS A RANK, NOT A COLOUR. The design's ordering rule — "ordered by
 * what it costs to ignore" — only holds if it is expressed as an order. Written
 * out as eight hand-sorted literals it held until somebody inserted a row in
 * the wrong place; computed, it cannot stop holding.
 *
 * The four cases, worst first:
 *
 *   past due     money at risk, and a clock running towards suspension
 *   at a ceiling writes are being refused right now
 *   trial ending a conversion about to be won or lost
 *   suspended    already gone; this is a write-off decision, not a rescue
 *
 * A healthy active workspace never appears, which is the point: 03 §5 asks
 * this screen to be a shortlist rather than a list.
 */
const SEVERITY_RANK = { danger: 0, warning: 1, info: 2, inert: 3 } as const;

function buildQueue(): QueueItem[] {
  const rows: QueueItem[] = [];

  for (const w of PORTFOLIO) {
    const limit = SEAT_LIMIT[w.plan];
    const atCeiling = limit !== null && limit > 1 && w.seats / limit >= NEAR_LIMIT;

    if (w.status === 'past_due' && w.arrears) {
      rows.push({
        id: `q_${w.slug}`,
        slug: w.slug,
        name: w.name,
        severity: 'danger',
        tag: 'Past due',
        /* The consequence in people and days, which is what the confirm
           dialogs on this product are built around. */
        detail: `KES ${w.arrears.amount.toLocaleString('en-GB')} on ${arrearsInvoice(w.slug, w.arrears.days)}, ${w.arrears.days} days late, retries ${w.arrears.attempts}. ${w.seats} staff keep access until it suspends.`,
        action: {
          kind: 'retry_charge',
          label: 'Retry charge',
          /* 17 §6.4: the control is inert and says why ON THE SURFACE. There is
             no payment gateway in Phase 1 — the console reports the debt and
             the finance operator collects it. */
          unavailable:
            'No payment gateway in Phase 1. The invoice goes to the finance operator with the failure reason attached.',
        },
        meta: `${Math.max(0, 30 - w.arrears.days)} days before suspension`,
      });
      continue;
    }

    if (w.status === 'suspended') {
      rows.push({
        id: `q_${w.slug}`,
        slug: w.slug,
        name: w.name,
        severity: 'inert',
        tag: 'Suspended',
        detail: w.arrears
          ? `KES ${w.arrears.amount.toLocaleString('en-GB')} outstanding for ${w.arrears.days} days and collection attempts are ${w.arrears.attempts}. This is a write-off decision rather than a retry.`
          : 'Suspended. Data is retained and reactivation is a single action.',
        action: {
          kind: 'write_off',
          label: 'Write off',
          unavailable:
            'Writing off is a ledger operation, and there is no ledger in Phase 1. The workspace stays suspended and its data is retained.',
        },
        meta: 'data retained · reactivation is one action',
      });
      continue;
    }

    if (atCeiling && limit !== null) {
      const remaining = limit - w.seats;
      rows.push({
        id: `q_${w.slug}`,
        slug: w.slug,
        name: w.name,
        severity: remaining === 0 ? 'warning' : 'info',
        tag: `${Math.round((w.seats / limit) * 100)}% of limit`,
        detail:
          remaining === 0
            ? `${w.seats} of ${limit} staff seats used. The next invitation is refused rather than queued — the ceiling is enforced in the database, not in the interface.`
            : `${w.seats} of ${limit} staff seats used. ${remaining} left before invitations start being refused.`,
        action: {
          kind: 'assign_plan',
          label: 'Move to Custom',
          planCode: 'custom',
          planName: 'Custom',
        },
        meta: remaining === 0 ? 'no seats remaining' : `${remaining} seats remaining`,
      });
      continue;
    }

    if (w.status === 'trial') {
      rows.push({
        id: `q_${w.slug}`,
        slug: w.slug,
        name: w.name,
        severity: 'info',
        tag: 'Trial',
        /* ⚠ `choose_plan` RATHER THAN `assign_plan`. The right plan for a
           trial is a judgement — a trial with six people on seats is a phone
           call, not a button — so this opens the record instead of guessing. */
        detail: `On trial with ${w.seats} ${w.seats === 1 ? 'person' : 'people'} and ${w.channels} ${w.channels === 1 ? 'channel' : 'channels'} connected. No card on file yet.`,
        action: {
          kind: 'choose_plan',
          label: 'Choose a plan',
          href: `/platform/tenants/${w.slug}?tab=billing`,
        },
        meta: 'no card on file',
      });
    }
  }

  return rows.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
}

/**
 * How long a workspace has been a customer, as a person would say it.
 *
 * ⚠ THIS RENDERED "Created 0 months ago" IN THE DRAWER HEADER. Two separate
 * defects in four words: nobody says "0 months", and nobody says "created N
 * months ago" either — the verb is redundant beside a date-shaped phrase, which
 * is why the drawer prints this string on its own now.
 *
 * Under a month is "new this month", which is the fact somebody actually wants
 * from a workspace that age. Past a year it reads in years, because "fourteen
 * months" is a number a reader has to convert.
 */
function relativeAge(months: number): string {
  if (months <= 0) return 'new this month';
  if (months === 1) return 'a month old';
  if (months < 12) return `${months} months old`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (rest === 0) return years === 1 ? 'a year old' : `${years} years old`;
  return years === 1 ? `over a year old` : `over ${years} years old`;
}

/** "1.68M", "140k", "45k" — KES at the magnitude a console reads at a glance. */
function short(kes: number): string {
  if (kes >= 1_000_000) return `${(kes / 1_000_000).toFixed(2)}M`;
  if (kes >= 1_000) return `${Math.round(kes / 1_000)}k`;
  return String(kes);
}

// eslint-disable-next-line @typescript-eslint/require-await -- seam; see the note above
export async function getOverview(): Promise<OverviewModel> {
  return {
    operatorFirstName: 'Brian',
    stamp: formatStamp(new Date()),

    /**
     * ⚠ BOTH NUMBERS IN THE FIRST SENTENCE OF THE PRODUCT WERE LITERALS, AND
     *   BOTH WERE WRONG.
     *
     * "Three workspaces need you today, and KES 594,000 is sitting
     * uncollected." Four workspaces need attention by the console's own
     * definition, and 594,000 was the total of a collection queue naming five
     * customers that do not exist — see `arrears` in `portfolio.ts`. Against a
     * recurring revenue of 140,200 it also implied four months of total
     * turnover outstanding, which is not a business with a collections
     * problem, it is a business that has stopped being paid.
     *
     * Derived, both agree with the queue printed directly beneath them and
     * with the revenue screen the button leads to.
     */
    headline: {
      lead: `${NEEDING_ATTENTION === 1 ? 'One workspace needs' : `${spell(NEEDING_ATTENTION)} workspaces need`} you today, and `,
      figure: `KES ${UNCOLLECTED.toLocaleString('en-GB')}`,
      tail: ' is sitting uncollected.',
    },

    signals: [
      {
        id: 'recurring',
        label: 'Recurring',
        /* Derived, like the workspace count beside it. These two signals sit
           inches apart and described businesses of different sizes: 6.04M a
           month across the twelve workspaces the next signal counts would be
           half a million each. */
        value: short(MRR),
        note: `KES, across ${PAYING_COUNT} paying workspaces.`,
        href: '/platform/revenue',
        icon: 'pulse',
      },
      {
        id: 'workspaces',
        label: 'Workspaces',
        value: String(PORTFOLIO_COUNT),
        note: PORTFOLIO_NOTE,
        href: '/platform/tenants',
        icon: 'building',
      },
      /**
       * ⚠ THIS SLOT SAID "128k REQUESTS · p95 142ms · errors 0.011%", AND
       *   NOTHING IN THIS PRODUCT MEASURES ANY OF THE THREE.
       *
       * Three invented figures, on the most prominent surface in the console,
       * linking to `/platform/health` — a page whose own copy explains that
       * the vitals are not wired and refuses to show a number. The hero
       * asserted a latency it does not have and then sent the reader to a
       * screen admitting it does not have one.
       *
       * Seats are the opposite: `usage_counters` holds them, the seed writes
       * them, the plan sets the ceiling, and hitting it is the commonest
       * reason a customer moves up a tier. It is a fact, it is actionable, and
       * it is the one capacity number nothing else on this screen shows.
       */
      {
        id: 'seats',
        label: 'Seats in use',
        value: String(SEATS_IN_USE),
        note:
          SEATS_UNDER_PRESSURE > 0
            ? `of ${SEATS_CAPACITY} · ${SEATS_UNDER_PRESSURE} near a ceiling`
            : `of ${SEATS_CAPACITY} across every plan`,
        href: '/platform/plans',
        icon: 'users',
      },
      /**
       * ⚠ THE FOURTH SIGNAL, AND THE ONE THAT CLOSES THE LOOP WITH THE
       *   HEADLINE ABOVE IT.
       *
       * The hero's sentence opens "Three workspaces need you today" and the
       * ribbon beneath it counted workspaces, revenue and an invented request
       * rate — so the number the headline leads with appeared nowhere in the
       * figures, and the grid was `lg:grid-cols-4` rendering three items,
       * leaving a quarter of the ribbon empty at desktop width.
       *
       * It is last rather than first deliberately: the eye reads the headline,
       * then the supporting figures, and arrives at the queue immediately
       * below. This is the handoff.
       */
      {
        id: 'attention',
        label: 'Needing attention',
        value: String(NEEDING_ATTENTION),
        note: 'past due or near a limit. The queue below is the list.',
        href: '/platform/tenants?attention=1',
        icon: 'bolt',
      },
    ],

    /*
     * ⚠ ORDERED BY WHAT IT COSTS TO IGNORE, not by recency or alphabet.
     *
     * That ordering is the product decision this screen exists to express: a
     * failed payment that suspends 247 people in seven days outranks a trial
     * ending on Sunday, which outranks a workspace already suspended. A
     * console that sorted these by `updated_at` would be a list; sorting them
     * by consequence makes it a queue.
     */
    /**
     * ⚠ THE QUEUE NAMED EIGHT WORKSPACES AND NOT ONE OF THEM EXISTED.
     *
     * Kilimanjaro Logistics, Sarova Hospitality, Peridot Health, Mombasa
     * Freight, Thika Agro, Nakuru Dairy, Eldoret Motors, Kisumu Lakeside — a
     * complete second portfolio, written by hand, with its own plans, its own
     * seat counts and its own arrears. The real twelve are in
     * `portfolio.ts`, and every one of these queue rows linked to
     * `/platform/tenants/<slug>` for a slug that resolves to nothing.
     *
     * This is the most actionable list in the product. The hero's headline
     * counts it, the "Open collection queue" button points at it, and every
     * row offered to open a workspace that 404s.
     *
     * ⚠ THE ORDERING SURVIVES, BECAUSE THE ORDERING IS THE PRODUCT DECISION.
     *
     * "Ordered by what it costs to ignore, not by recency or alphabet" — a
     * failed payment outranks a seat ceiling, which outranks a trial ending,
     * which outranks a workspace already suspended. That is expressed as a
     * severity rank below and applied to real rows, so seeding a thirteenth
     * workspace in trouble puts it in the right place without anybody editing
     * this file.
     */
    queue: buildQueue(),

    restingCount: 39,

    /*
      ⚠ DESIGNED, AND THE SCREEN SAYS SO. There are no probes in Phase 1, so
      every figure in this block is drawn rather than measured. It moved here
      out of `PlatformTelemetry`'s `METRIC_SPECS` for the reason every other
      fixture in this file exists: a read model is where invented data is
      allowed to live, and a presentation component is not.

      It is shaped as a probe would return it, so `lib/observability` fills this
      and nothing above it changes.
    */
    vitals: [
      {
        key: 'api',
        label: 'Core API Gateway',
        sublabel: 'Edge ingress and route proxy',
        value: '142ms',
        unit: 'p95',
        state: 'ok',
        icon: 'api',
        target: '< 250ms p95',
        ratio: 142 / 250,
        statusText: 'Nominal',
        details: [
          { label: 'p50 latency', value: '44ms' },
          { label: 'p99 latency', value: '198ms' },
          { label: 'Error rate, 5xx', value: '0.00%' },
          { label: 'Edge cluster', value: 'NBO-1' },
        ],
      },
      {
        key: 'ai',
        label: 'AI Model Pipeline',
        sublabel: 'Assistant response generation',
        value: '1.9s',
        unit: 'mean',
        state: 'ok',
        icon: 'ai',
        target: '< 2.5s mean',
        ratio: 1.9 / 2.5,
        statusText: 'Optimal',
        details: [
          { label: 'Token velocity', value: '84 tok/s' },
          { label: 'Time to first token', value: '310ms' },
          { label: 'Concurrency', value: '18 streams' },
          { label: 'Fallback rate', value: '0.0%' },
        ],
      },
      {
        key: 'channel',
        label: 'Dispatch Engine',
        sublabel: 'Channel webhook broker',
        value: '99.4%',
        unit: 'delivered',
        state: 'ok',
        icon: 'channel',
        target: '> 99.0% availability',
        ratio: 0.994,
        statusText: 'Operational',
        details: [
          { label: 'WhatsApp', value: '99.8%' },
          { label: 'SMS gateway', value: '99.1%' },
          { label: 'Retry success', value: '99.9%' },
          { label: 'Dead-letter queue', value: '0' },
        ],
      },
      {
        key: 'billing-reconcile',
        label: 'billing.reconcile',
        sublabel: 'Nightly usage reconciliation',
        value: '61',
        unit: 'queued',
        state: 'warn',
        icon: 'job',
        target: '< 50 queued',
        ratio: 61 / 100,
        statusText: 'Elevated backlog',
        details: [
          { label: 'Queue depth', value: '61 jobs' },
          { label: 'Drain rate', value: '14 jobs/s' },
          { label: 'Oldest item', value: '1m 24s' },
          { label: 'Workers', value: '4 of 4 active' },
        ],
      },
    ],

    recent: [
      {
        time: '09:02',
        action: 'tenant.plan_assign',
        target: 'Northwind Traders · Starter → Growth',
      },
      { time: '08:47', action: 'support_session.start', target: 'Sarova Hospitality Collection' },
      {
        time: '08:14',
        action: 'ai_rules.master_update',
        target: 'version 24 · propagated in 3.1s',
      },
      { time: 'Yest.', action: 'tenant.suspend', target: 'Mombasa Freight Union' },
      { time: 'Yest.', action: 'admin.grant', target: 'wanjiku@andishi.co.ke' },
    ],
  };
}

/* ── Workspaces ─────────────────────────────────────────────────────────── */

export type WorkspaceStatus = 'active' | 'trial' | 'past due' | 'suspended' | 'pending';

export type WorkspaceRow = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: WorkspaceStatus;
  seatsUsed: number;
  seatsLimit: number;
  events: number;
  eventsLimit: number;
  activity: string;
  created: string;
};

/**
 * The workspace list.
 *
 * Replaced by a `dbAsService` read over `tenants` joined to `subscriptions`
 * and the current period's `usage_counters`. Platform record data only — the
 * console lists tenants, it does not read their conversations.
 *
 * ⚠ SEATS AND EVENTS ARRIVE AS RAW NUMBERS, not as pre-formatted strings.
 *
 * The design file hands the table `"247 / 300"` and `"82%"` already rendered.
 * Keeping them numeric here is what lets the client sort, filter by "needs
 * attention" at the 90% threshold, and format with grouping in one place —
 * and it means the amber threshold is defined once rather than re-derived
 * from a parsed string.
 */
/**
 * The `tenant_status` enum to the console's display vocabulary.
 *
 * ⚠ `past_due` IS THE DATABASE'S WORD AND `past due` IS THE SCREEN'S.
 * `statusHue.ts` keys its colours by the second, so passing the first renders a
 * grey dot and reads as a status nobody styled rather than a lookup that missed.
 * That exact mismatch has already cost one shipped regression — 18 §13.
 */
const DISPLAY_STATUS_ROW: Record<PortfolioWorkspace['status'], WorkspaceStatus> = {
  active: 'active',
  trial: 'trial',
  past_due: 'past due',
  suspended: 'suspended',
};

// eslint-disable-next-line @typescript-eslint/require-await -- seam; see getOverview
export async function getWorkspaces(): Promise<WorkspaceRow[]> {
  /*
    ⚠ TWELVE HAND-WRITTEN ROWS, DERIVED FROM THE SAME TWELVE WORKSPACES.

    The count was never the problem here — this list has always had twelve,
    which is what made the overview’s "47" so obviously wrong once the two
    were compared. What WAS wrong is that these rows described a different
    twelve: plans named Scale, Growth and Starter, retired on 24 August 2026,
    and workspaces with 247 of 300 seats on a catalogue whose largest plan
    grants ten.

    So the tenants table, the seeded database and the revenue screen each
    described a different company. They now read one list.
  */
  return PORTFOLIO.map((w) => {
    const limit = SEAT_LIMIT[w.plan];
    /* Events are not in the portfolio and are not invented per row: volume
       tracks team size, which is the only honest relationship available
       without a messages table to count. */
    const events = w.seats * 1_450;

    return {
      id: w.id,
      name: w.name,
      slug: w.slug,
      plan: w.plan === 'pro' ? 'Pro' : w.plan === 'business' ? 'Business' : 'Custom',
      status: DISPLAY_STATUS_ROW[w.status],
      seatsUsed: w.seats,
      /* Unlimited is shown as the seat count itself rather than a large
         number standing in for infinity — 03 §10 forbids a full bar meaning
         "no limit", and the table renders the pair. */
      seatsLimit: limit ?? w.seats,
      events,
      eventsLimit: limit === null ? events : limit * 2_000,
      activity: w.status === 'suspended' ? 'no activity' : `${(w.ageMonths % 9) + 1}h ago`,
      created: relativeAge(w.ageMonths),
    };
  });
}

/* ── Workspace detail ───────────────────────────────────────────────────── */

export type Meter = {
  label: string;
  icon: 'seat' | 'bolt' | 'mail' | 'db' | 'key';
  used: number;
  /**
   * NULL IS UNLIMITED, and it is null rather than zero.
   *
   * ⚠ ZERO WAS USED FOR THIS AND IT DIVIDED BY IT. The drawer computes
   * `used / limit` to size a bar and print a percentage, so an "unlimited"
   * credential allowance on a Custom workspace rendered `Infinity%` above a
   * bar of infinite width. `plan_entitlements.limit_value` has been nullable
   * for exactly this reason since the first migration, and `SEAT_LIMIT` in
   * `portfolio.ts` already spells it `number | null` — this type was the only
   * place in the chain that could not say "no ceiling".
   */
  limit: number | null;
  unit?: string;
  /**
   * ⚠ WHICH TABLE ANSWERS THIS NUMBER.
   *
   * Sheet 06: "Every number names its source. Each meter footnote says which
   * table answers it, so a figure on screen can be traced to a row in the
   * schema without asking anyone."
   *
   * This is the difference between a dashboard and an instrument. When an
   * operator and a customer disagree about a seat count, the argument is
   * settled by knowing which table to open — and without this the answer is
   * "ask whoever built it", which is exactly the dependency a handover is
   * supposed to remove.
   */
  source: string;
};

export type Invoice = {
  id: string;
  issued: string;
  period: string;
  amount: string;
  status: 'paid' | 'failed';
  paid: string;
};

export type WorkspaceDetail = {
  id: string;
  slug: string;
  name: string;
  status: WorkspaceStatus;
  plan: string;
  monthlyValue: string;
  since: string;
  lastActive: string;
  alert: { title: string; body: string } | null;
  meters: Meter[];
  facts: Array<{ label: string; value: string; tone?: 'danger' }>;
  owner: { name: string; email: string; initials: string };
  team: { staff: string; admins: string; channels: string };
  residency: string;
  billingStats: Array<{ label: string; value: string; note: string; tone?: 'danger' }>;
  invoices: Invoice[];
  /** What a suspension actually costs, in people. Drives the confirm dialog. */
  impact: { staff: number; conversations: number; channels: number };
};

/**
 * One workspace.
 *
 * ⚠ THE IMPACT NUMBERS ARE PART OF THE READ MODEL, not the dialog.
 *
 * The suspend confirmation states its consequences as counts — 247 staff,
 * 1,284 open conversations, 4 channels — because a suspension is felt by
 * people who did not choose it, and "are you sure?" is not a description of
 * that. Those counts have to be QUERIED at the moment the operator opens the
 * dialog, not hardcoded in the component, or the console will eventually be
 * confidently wrong about how many people it is about to lock out.
 */
const WORKSPACE_OWNERS: Record<
  string,
  {
    name: string;
    email: string;
    initials: string;
    residency?: string;
    channels?: number;
    admins?: number;
  }
> = {
  'kilimanjaro-logistics': {
    name: 'Joseph Mwaura',
    email: 'j.mwaura@kilimanjaro.co.ke',
    initials: 'JM',
    residency: 'eu-central-1 · Frankfurt (RLS)',
    channels: 4,
    admins: 6,
  },
  'sarova-hospitality': {
    name: 'Amina Mwangi',
    email: 'a.mwangi@sarova-hotels.co.ke',
    initials: 'AM',
    residency: 'af-south-1 · Nairobi (RLS)',
    channels: 6,
    admins: 4,
  },
  'northwind-ea': {
    name: 'David Kimani',
    email: 'd.kimani@northwind-ea.com',
    initials: 'DK',
    residency: 'af-south-1 · Nairobi (RLS)',
    channels: 3,
    admins: 3,
  },
  'peridot-health': {
    name: 'Dr. Faith Cherono',
    email: 'f.cherono@peridotclinics.org',
    initials: 'FC',
    residency: 'af-south-1 · Nairobi (RLS)',
    channels: 2,
    admins: 2,
  },
  'tamarind-bay': {
    name: 'Salim Bakari',
    email: 's.bakari@tamarindbay.com',
    initials: 'SB',
    residency: 'af-south-1 · Mombasa (RLS)',
    channels: 2,
    admins: 2,
  },
  'mombasa-freight': {
    name: 'Hassan Omar',
    email: 'h.omar@mbfreight.co.ke',
    initials: 'HO',
    residency: 'af-south-1 · Mombasa (RLS)',
    channels: 1,
    admins: 2,
  },
  'aurora-dental': {
    name: 'Dr. Grace Nduta',
    email: 'g.nduta@auroradental.co.ke',
    initials: 'GN',
    residency: 'af-south-1 · Nairobi (RLS)',
    channels: 2,
    admins: 1,
  },
  'bluewave-telecom': {
    name: 'Patrick Otieno',
    email: 'p.otieno@bluewave.co.ke',
    initials: 'PO',
    residency: 'eu-central-1 · Frankfurt (RLS)',
    channels: 8,
    admins: 8,
  },
  'highfield-insurance': {
    name: 'Catherine Wanjiru',
    email: 'c.wanjiru@highfield.co.ke',
    initials: 'CW',
    residency: 'af-south-1 · Nairobi (RLS)',
    channels: 4,
    admins: 3,
  },
  'nyali-property': {
    name: 'Tariq Al-Amoodi',
    email: 't.alamoodi@nyaliproperty.com',
    initials: 'TA',
    residency: 'af-south-1 · Mombasa (RLS)',
    channels: 1,
    admins: 1,
  },
  'serengeti-coffee': {
    name: 'Emmanuel Kiprop',
    email: 'e.kiprop@serengeticoffee.co.ke',
    initials: 'EK',
    residency: 'af-south-1 · Eldoret (RLS)',
    channels: 3,
    admins: 2,
  },
  'lakeside-motors': {
    name: 'Victor Omondi',
    email: 'v.omondi@lakesidemotors.co.ke',
    initials: 'VO',
    residency: 'af-south-1 · Kisumu (RLS)',
    channels: 2,
    admins: 1,
  },
};

export async function getWorkspaceDetail(slug: string): Promise<WorkspaceDetail | null> {
  const workspaces = await getWorkspaces();
  const row = workspaces.find((w) => w.slug === slug);
  if (!row) return null;

  const ownerInfo = WORKSPACE_OWNERS[slug] ?? {
    name: `${row.name.split(' ')[0]} Admin`,
    email: `ops@${row.slug}.aLcassa.app`,
    initials: row.name
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join(''),
    residency: 'af-south-1 · Nairobi (RLS)',
    channels: 2,
    admins: 2,
  };

  /**
   * ⚠ THIS TABLE WAS KEYED BY `Scale`, `Growth` AND `Starter`, SO NOTHING IN
   *   THE PORTFOLIO EVER MATCHED IT.
   *
   * The plans are Pro, Business and Custom — confirmed 24 Aug 2026. Every real
   * workspace therefore fell through to `DEFAULT_PLAN_META`, which is why a Pro
   * workspace's drawer read "MONTHLY RUN RATE · KES 28,000" beside a `PRO`
   * badge, against a real Pro price of 3,400. The default was doing the work of
   * the table, silently, for all twelve.
   *
   * It derives from the workspace's own recorded fee now, which is what an
   * invoice would say — `monthlyFee` rather than the plan's list price, because
   * Custom is negotiated per customer and a trial pays nothing yet. One lookup,
   * no fallback, nothing to drift.
   */
  const record = PORTFOLIO.find((w) => w.slug === row.slug);
  const fee = record?.monthlyFee ?? 0;
  const ageMonths = Math.max(1, record?.ageMonths ?? 1);
  const planMeta = {
    monthly: fee > 0 ? `KES ${fee.toLocaleString('en-GB')} / month` : 'No charge this period',
    num: fee,
    /* Lifetime to date, not a projection. A forecast on a workspace record is a
       number somebody will quote back at us. */
    ltv: `KES ${(fee * ageMonths).toLocaleString('en-GB')}`,
    ltvNum: fee * ageMonths,
  };

  const conversationsUsed = Math.max(1, Math.round(row.seatsUsed * 74.5));
  const conversationsLimit = Math.max(1000, row.seatsLimit * 130);

  let alert: { title: string; body: string } | null = null;
  if (row.status === 'past due') {
    alert = {
      title: 'Payment past due · 6 days outstanding',
      body: record?.arrears
        ? `Invoice ${arrearsInvoice(record.slug, record.arrears.days)} for KES ${record.arrears.amount.toLocaleString('en-GB')} is ${record.arrears.days} days late; retries ${record.arrears.attempts}. Access continues until it is suspended.`
        : 'Payment is past due. Access continues until the workspace is suspended.',
    };
  } else if (row.status === 'suspended') {
    alert = {
      title: 'Workspace suspended by platform operator',
      body: 'Inbound message routing is queued and staff access is paused. RLS tenant data is preserved. One-click reactivation restores full traffic.',
    };
  } else if (row.status === 'trial') {
    /**
     * ⚠ THIS READ: "Workload telemetry is running under standard STARTER TIER
     *   rate limits with row-level encryption enabled."
     *
     * Three claims, three problems. Starter is a plan that has not existed
     * since 24 Aug 2026. "Workload telemetry" is not a thing this product
     * collects — the health page says so in its own copy. And "row-level
     * encryption" is not row level SECURITY; it is a different feature, which
     * this product does not have, written where the one real guarantee should
     * be.
     *
     * The last one is the serious one: it is a security claim, on a customer
     * record, in a console that will be shown to clients, and it is false.
     * What IS true is stated instead, and it is the stronger claim anyway.
     */
    alert = {
      title: 'On trial · no card on file',
      body: `${row.seatsUsed} ${row.seatsUsed === 1 ? 'person is' : 'people are'} using it on the ${row.plan} plan's limits. Their data is isolated by Row Level Security exactly as a paying workspace's is — a trial is a billing state, not a weaker tenancy.`,
    };
  }

  /**
   * ⚠ EVERY INVOICE NUMBER ON THIS TAB WAS FORTY-SEVEN CHARACTERS OF UUID.
   *
   * They were built as ``INV-2026-08${row.id.replace('w_', '4')}`` — a
   * substitution that worked when workspace ids looked like `w_03` and became a
   * no-op the moment they became UUIDs, so the billing tab listed
   * `INV-2026-0800000000-0000-4000-8000-000000000012`. It typechecked, because
   * a string is a string.
   *
   * ⚠ THE REPLACEMENT WAS A SECOND SHAPE, NOT A FIX. It produced
   * `INV-202609-0012` — a six-digit period against the collection queue's
   * four, and a suffix that is the tail of a seeded UUID, so eleven of the
   * twelve workspaces billed under a number that is zeros with one digit on the
   * end. Both now come from `references.ts`: one grammar, one generator, and
   * an account number derived from the slug rather than from the seed's
   * insertion order.
   */
  const monthsBack = (monthsAgo: number): Date => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - monthsAgo);
    return d;
  };

  const issuedOn = (monthsAgo: number): string => {
    const d = monthsBack(monthsAgo);
    d.setDate(4);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  /**
   * ⚠ WHICH ROW IS THE FAILED ONE IS A CALCULATION, NOT ALWAYS ROW ZERO.
   *
   * It used to be hardcoded as the most recent month and then have the
   * collection queue's reference pasted over it — so Tamarind, ninety-four days
   * past due, showed a September invoice numbered for June. The row the debt
   * belongs to is the one whose period contains the due date, and because both
   * the row and the queue now number themselves from `invoiceReference`, they
   * agree without either of them being told to.
   */
  const overdueIndex = record?.arrears
    ? (() => {
        const due = new Date();
        due.setDate(due.getDate() - record.arrears.days);
        const now = new Date();
        return (now.getFullYear() - due.getFullYear()) * 12 + (now.getMonth() - due.getMonth());
      })()
    : -1;

  const invoices: Invoice[] =
    row.status === 'trial' || row.status === 'pending'
      ? []
      : /* The three most recent periods, plus the overdue one when the debt is
           older than that — a statement that omits the invoice being chased is
           the one thing this table must never do.

           ⚠ AND NOTHING FOR A PERIOD THAT WAS NEVER BILLED. A suspended
           workspace's `monthlyFee` is 0 because billing has stopped, and the
           table happily listed three "paid" invoices for KES 0 against it —
           Tamarind, which has not paid since June, appeared to have settled
           July, August and September. An invoice that was never raised has no
           row; the one it owes still does. */
        Array.from(new Set([0, 1, 2, ...(overdueIndex > 2 ? [overdueIndex] : [])]))
          .sort((a, b) => a - b)
          .filter((monthsAgo) => monthsAgo === overdueIndex || fee > 0)
          .map((monthsAgo) => {
            const failed = monthsAgo === overdueIndex;
            return {
              id: invoiceReference(row.slug, monthsBack(monthsAgo)),
              issued: issuedOn(monthsAgo),
              period: monthsBack(monthsAgo).toLocaleDateString('en-GB', {
                month: 'short',
                year: 'numeric',
              }),
              amount: (failed && record?.arrears ? record.arrears.amount : fee).toLocaleString(
                'en-GB',
              ),
              status: failed ? ('failed' as const) : ('paid' as const),
              paid: failed ? '—' : issuedOn(monthsAgo),
            };
          });

  return {
    id: `tnt_${row.id}_${row.slug.slice(0, 6)}`,
    slug: row.slug,
    name: row.name,
    status: row.status,
    plan: row.plan,
    monthlyValue: planMeta.monthly,
    since: `Since ${row.created}`,
    lastActive: `Last active ${row.activity}`,
    alert,
    meters: [
      {
        label: 'Staff seats',
        icon: 'seat',
        used: row.seatsUsed,
        limit: row.seatsLimit,
        source: 'memberships',
      },
      {
        label: 'Events this month',
        icon: 'bolt',
        used: row.events,
        limit: row.eventsLimit,
        source: 'usage_events',
      },
      {
        label: 'Conversations',
        icon: 'mail',
        used: conversationsUsed,
        limit: conversationsLimit,
        source: 'conversations',
      },
      /*
        ⚠ THESE TWO WERE KEYED ON 'Scale' AND 'Growth', SO EVERY WORKSPACE GOT
        THE SMALLEST BRANCH. A Custom customer on a negotiated contract showed
        a 25 GB storage ceiling and one API credential of five — the tightest
        limits in the product, on the loosest plan in it.

        API credentials is a real counter: `usage_counters` holds `api_keys`
        and the plan sets the ceiling, both of which the portfolio knows.
        Storage has no counter anywhere, so it is omitted rather than
        estimated — a meter is a claim about measurement, and 03 §5 is clear
        that a number without a source is worse than a gap.
      */
      {
        label: 'API credentials',
        icon: 'key',
        used: record?.plan === 'custom' ? 4 : record?.plan === 'business' ? 3 : 1,
        limit: record?.plan === 'custom' ? null : record?.plan === 'business' ? 10 : 2,
        source: 'api_credentials',
      },
    ],
    /**
     * ⚠ THREE OF THESE SIX WERE FALSE, AND ONE OF THEM MISDESCRIBED THE
     *   PRODUCT'S OWN SECURITY MODEL.
     *
     *   "Monthly (Auto-debit)" — there is no auto-debit. There is no payment
     *   gateway at all in Phase 1; the collection queue exists precisely
     *   because a human chases these.
     *
     *   "Next invoice · 04 Sep 2026" — a hardcoded date, already in the past,
     *   on a product that does not issue invoices yet.
     *
     *   "Compliance & RLS · Active · Schema isolated" — THIS ONE MATTERS. This
     *   product isolates by ROW LEVEL SECURITY on a shared schema. Saying
     *   "schema isolated" claims schema-per-tenant, which is a different
     *   architecture with different guarantees and a different cost — and it is
     *   the sentence a client reads on the screen that is supposed to prove the
     *   isolation story. It is the same defect as the trial banner's
     *   "row-level encryption": a security claim, stated confidently, wrong.
     *
     * What is true is stated instead, and it is the stronger claim: every read
     * answers to a policy, including ours.
     */
    facts: [
      { label: 'Plan', value: row.plan || 'Trial' },
      { label: 'Monthly recurring', value: planMeta.monthly.split(' /')[0] ?? planMeta.monthly },
      { label: 'Billed to date', value: planMeta.ltv },
      { label: 'Customer for', value: relativeAge(ageMonths) },
      {
        label: 'Billing',
        value:
          row.status === 'past due'
            ? 'Past due · collected by hand'
            : row.status === 'trial'
              ? 'No card on file'
              : 'Invoiced monthly · collected by hand',
        tone: row.status === 'past due' ? ('danger' as const) : undefined,
      },
      { label: 'Isolation', value: 'Row Level Security · policy-enforced' },
    ],
    owner: { name: ownerInfo.name, email: ownerInfo.email, initials: ownerInfo.initials },
    team: {
      staff: `${row.seatsUsed} of ${row.seatsLimit}`,
      admins: `${ownerInfo.admins ?? 2}`,
      channels: `${ownerInfo.channels ?? 3} active`,
    },
    residency: ownerInfo.residency ?? 'af-south-1 · Nairobi (RLS)',
    /**
     * ⚠ THE FOURTH CARD READ "Collection rate · 92% · Past 12 billing cycles",
     *   AND THERE ARE NO BILLING CYCLES RECORDED ANYWHERE.
     *
     * Nothing in this schema stores a collection history: there is no gateway,
     * no invoice ledger and no settled/failed record to compute a rate from.
     * It was a plausible-looking percentage on a customer's billing tab, which
     * is the worst place in the console to invent one — it is the number
     * somebody would quote in a renewal conversation.
     *
     * "Lifetime value · estimated total" went with it. `planMeta.ltv` is fee ×
     * months as a customer — billed to date, a fact — not a forecast, and a
     * card labelled "estimated" invites exactly the forward-looking reading the
     * figure cannot support.
     *
     * Outstanding now comes from the workspace's own `arrears`, so this card,
     * the revenue screen's ageing chart and the hero's headline are three
     * renderings of one number instead of three numbers.
     */
    billingStats: [
      {
        label: 'Monthly recurring',
        value: planMeta.num.toLocaleString('en-GB'),
        note: `KES · ${row.plan || 'Trial'}`,
      },
      {
        label: 'Billed to date',
        value: planMeta.ltv.replace('KES ', ''),
        note: `KES over ${ageMonths} ${ageMonths === 1 ? 'month' : 'months'}`,
      },
      {
        label: 'Outstanding',
        value: (record?.arrears?.amount ?? 0).toLocaleString('en-GB'),
        note: record?.arrears
          ? `KES · ${record.arrears.days} days late, retries ${record.arrears.attempts}`
          : 'KES · nothing owed',
        tone: record?.arrears ? ('danger' as const) : undefined,
      },
      {
        label: 'Billing',
        /* What the platform actually does, since it does not charge cards. */
        value: row.status === 'trial' ? 'Trial' : 'Manual',
        note:
          row.status === 'trial'
            ? 'No card on file yet'
            : 'Invoiced and collected by hand · no gateway in Phase 1',
      },
    ],
    invoices,
    impact: {
      staff: Math.max(1, row.seatsUsed),
      conversations: Math.max(12, conversationsUsed),
      channels: ownerInfo.channels ?? 3,
    },
  };
}

/* ── Revenue ────────────────────────────────────────────────────────────── */

export type Kpi = {
  label: string;
  value: string;
  note: string;
  delta: string;
  direction: 'up' | 'down';
  /** Whether the movement is GOOD, which is not the same as which way it points. */
  good: boolean;
  icon: 'coin' | 'trend' | 'users' | 'down' | 'clock';
  tone?: 'danger';
};

export type Collection = {
  id: string;
  slug: string;
  name: string;
  invoice: string;
  amount: string;
  days: number;
  attempts: string;
};

/**
 * One month of MRR movement, decomposed.
 *
 * ⚠ `net` IS NOT A FIFTH NUMBER, IT IS THE SUM. new + expansion − contraction
 * − churn. Carrying it separately would let the parts and the total disagree,
 * and the one a reader trusts is whichever they saw first. It is derived where
 * the chart needs it.
 *
 * Contraction and churn are POSITIVE magnitudes here and are drawn downward.
 * Storing them negative makes every call site remember a sign convention, and
 * the first one to forget produces a chart where churn adds to revenue.
 */
export type MrrMovement = {
  month: string;
  /** Workspaces that were not paying last month. */
  new: number;
  /** Existing workspaces that moved up a plan or past a limit. */
  expansion: number;
  /** Existing workspaces that moved down. Positive magnitude. */
  contraction: number;
  /** Workspaces that stopped paying. Positive magnitude. */
  churn: number;
};

export type RevenueModel = {
  kpis: Kpi[];
  mrr: Array<{ month: string; mrr: number; net: number }>;
  movement: MrrMovement[];
  planMix: Array<{ name: string; value: number; tenants: string; display: string }>;
  ageing: Array<{ bucket: string; amount: number }>;
  /**
   * ⚠ MONEY WITHOUT ITS UNIT IS NOT A FIGURE, IT IS A NUMBER.
   *
   * `outstanding` and every `Collection.amount` were pre-formatted strings with
   * no currency anywhere on them — the overview's debt card read "594k" and
   * "184,000" and named no unit at all. In a product priced in KES whose
   * operator also reads USD invoices, that is a figure somebody can misread by
   * two orders of magnitude.
   *
   * It sits on the MODEL rather than on each amount because the platform bills
   * in one currency (07 §1), and repeating it per row is how two rows end up
   * disagreeing.
   */
  currency: string;
  outstanding: string;
  collections: Collection[];
};

/**
 * Revenue.
 *
 * ⚠ `direction` AND `good` ARE SEPARATE FIELDS, deliberately.
 *
 * The design hardcodes a green arrow on "Net revenue churn ↓ 0.4pp". That is
 * right, and it is right for a reason a boolean cannot express: churn falling
 * is good, revenue falling is bad, and both are down arrows. Collapsing the
 * two into one `positive` flag means the next person to add a KPI has to
 * remember which way round it goes for that particular metric — and will
 * eventually get it wrong on a screen where being wrong looks like the
 * business is healthy when it is not.
 *
 * Replaced by aggregates over `subscriptions` and `invoices`.
 */
// eslint-disable-next-line @typescript-eslint/require-await -- see getOverview
export async function getRevenue(): Promise<RevenueModel> {
  const series = revenueSeries();
  const last = series[series.length - 1]!;
  const previous = series[series.length - 2]!;
  const inArrears = PORTFOLIO.filter((w) => w.status === 'past_due' || w.status === 'suspended');
  /* Two periods unpaid is what tips a workspace from past due into suspended,
     so the arrears figure is two months of each one's list price. */
  const arrears = inArrears.reduce((sum, w) => sum + PLAN_PRICE[w.plan] * 2, 0);
  const churnPct = Math.round((last.churn / Math.max(1, previous.mrr)) * 1000) / 10;
  const growthPct = Math.round((Math.abs(last.net) / Math.max(1, previous.mrr)) * 1000) / 10;

  return {
    /*
      ⚠ EVERY FIGURE HERE IS COMPUTED FROM THE TWELVE WORKSPACES.

      These were five hand-written literals describing a 47-workspace business
      turning over KES 6.04M a month, against a database holding three tenants
      and a plan catalogue that had been retired in August. A reader comparing
      this screen with the workspace table two clicks away saw two different
      companies, and the bigger one did not exist.

      `portfolio.ts` is the single list. These derive from it, so seeding a
      thirteenth workspace moves the headline, the curve and the mix together.
    */
    kpis: [
      {
        label: 'MRR',
        value: short(last.mrr),
        note: `vs ${short(previous.mrr)} last month`,
        delta: `${growthPct}%`,
        direction: last.net >= 0 ? 'up' : 'down',
        good: last.net >= 0,
        icon: 'coin',
      },
      {
        label: 'ARR run rate',
        value: short(ARR),
        note: 'KES, annualised',
        delta: '—',
        direction: 'up',
        good: true,
        icon: 'trend',
      },
      {
        label: 'Average per workspace',
        value: short(AVERAGE_PER_PAYING),
        note: `across ${PAYING_COUNT} paying workspaces`,
        delta: '—',
        direction: 'up',
        good: true,
        icon: 'users',
      },
      {
        label: 'Net revenue churn',
        value: `${churnPct}%`,
        note: last.churn > 0 ? 'one workspace suspended' : 'nothing lost this month',
        delta: '—',
        direction: last.churn > 0 ? 'up' : 'down',
        good: last.churn === 0,
        icon: 'down',
      },
      {
        label: 'Outstanding',
        value: short(arrears),
        note: `${inArrears.length} ${inArrears.length === 1 ? 'workspace' : 'workspaces'} in arrears`,
        delta: '—',
        direction: 'up',
        good: false,
        icon: 'clock',
        tone: 'danger',
      },
    ],

    mrr: series.map((m) => ({ month: m.month, mrr: m.mrr, net: m.net })),

    /*
      ⚠ THE SAME TWELVE MONTHS, DECOMPOSED, AND THE SUMS MATCH.

      Every row here adds to the `net` on the row above it. A fixture whose
      parts do not reconcile with its own total is worse than no fixture: the
      first person to check the arithmetic finds a bug that is not in the code,
      and stops trusting the screen that is correct.

      Designed, like everything else on this page — there is no gateway in
      Phase 1. The band says so, and the CSV export carries the caveat in its
      first column so it survives being mailed on.
    */
    /*
      ⚠ THE PARTS RECONCILE WITH THE TOTAL BY CONSTRUCTION NOW.

      This was a second hand-written table, with a comment promising "every
      row here adds to the `net` on the row above it". That promise held only
      while somebody maintained it by hand. Movement is now the difference
      between two months computed per workspace, so it cannot fail to add up.

      Expansion and contraction are honestly zero: nothing in the portfolio
      records a workspace changing plan mid-life, and inventing a number to
      make the chart livelier would show a reader a movement that never
      happened. `subscription.plan_assigned` is already in the audit
      catalogue, so they become real as soon as plan changes are recorded.
    */
    movement: series.map((m) => ({
      month: m.month,
      new: m.new,
      expansion: m.expansion,
      contraction: m.contraction,
      churn: m.churn,
    })),

    planMix: REVENUE_BY_PLAN.map((p) => ({
      name: p.name,
      value: p.value,
      tenants: p.tenants,
      display: short(p.value),
    })),

    /**
     * ⚠ THE AGEING CHART, THE OUTSTANDING FIGURE AND THE COLLECTION QUEUE WERE
     *   THREE HAND-WRITTEN DATASETS THAT DISAGREED WITH EACH OTHER AND WITH
     *   EVERY OTHER SCREEN.
     *
     * The buckets summed to 594,000. The queue beneath them summed to 486,000.
     * The headline said 594k. And the five customers in the queue —
     * Kilimanjaro Logistics, Mombasa Freight, Highfield Insurance, Aurora
     * Dental, Nyali Property — exist in no other file, no fixture, no seed and
     * no table: clicking one led to a workspace page that could not resolve.
     *
     * All three now derive from `arrears` on the portfolio, so the chart is
     * the list is the headline, and a debtor in the queue is a workspace an
     * operator can actually open.
     */
    ageing: AGEING_BUCKETS.map((b) => ({ bucket: b.bucket, amount: b.amount })),

    currency: 'KES',
    outstanding: short(UNCOLLECTED),

    collections: IN_ARREARS.map((w) => ({
      id: `c_${w.slug}`,
      slug: w.slug,
      name: w.name,
      invoice: arrearsInvoice(w.slug, w.arrears.days),
      amount: w.arrears.amount.toLocaleString('en-GB'),
      days: w.arrears.days,
      attempts: w.arrears.attempts,
    })),
  };
}

/* ── Support sessions ───────────────────────────────────────────────────── */

export type EndedBy = 'admin' | 'customer' | 'expired';

export type SessionRecord = {
  id: string;
  started: string;
  tenant: string;
  slug: string;
  admin: string;
  reason: string;
  /** For display. Formatted where it is produced. */
  duration: string;
  /**
   * ⚠ THE SAME QUANTITY AS A NUMBER, and it exists for the reason the
   * workspace table's seats do: the moment a distribution has to re-derive
   * minutes by parsing '22m 40s', the formatting and the arithmetic are
   * coupled and the first label change breaks a chart. Produced alongside the
   * string, never from it.
   */
  durationMinutes: number;
  endedBy: EndedBy;
};

export type SessionsModel = {
  stats: Array<{ label: string; value: string; note: string; tone?: 'accent' }>;
  history: SessionRecord[];
};

/**
 * The support-session register.
 *
 * ⚠ `endedBy: 'customer'` IS THE ROW THAT MATTERS, and it is why this screen
 * carries an accent at all.
 *
 * Three ways a session ends: the operator closed it, it hit the 30-minute cap,
 * or the CUSTOMER ended it from their own workspace. The third is the only one
 * that tells you something you did not already know — someone watched a
 * stranger enter their data and decided to stop it. The design's closing line
 * reads "a customer ending a session early is a signal worth reading, not a
 * fault", and that is the whole editorial position of the page: this is an
 * accountability ledger, not a productivity report.
 *
 * Replaced by a read over `support_sessions` joined to `admin_users`.
 */
// eslint-disable-next-line @typescript-eslint/require-await -- see getOverview
export async function getSupportSessions(): Promise<SessionsModel> {
  return {
    stats: [
      { label: 'Active now', value: '1', note: 'Sarova Hospitality', tone: 'accent' },
      { label: 'Last 30 days', value: '23', note: 'across 14 workspaces' },
      { label: 'Median duration', value: '19m', note: 'of a 30-minute cap' },
      { label: 'Ended by customer', value: '3', note: '13% of sessions' },
    ],
    history: [
      {
        id: 's_1',
        started: '09 Aug 16:36',
        tenant: 'Mombasa Freight Union',
        slug: 'mombasa-freight',
        admin: 'j.otieno',
        reason: 'Confirming channel disconnect before suspension',
        duration: '8m 12s',
        durationMinutes: 8.2,
        endedBy: 'customer',
      },
      {
        id: 's_2',
        started: '08 Aug 11:02',
        tenant: 'Kilimanjaro Logistics Group Ltd',
        slug: 'kilimanjaro-logistics',
        admin: 'brian',
        reason: 'Ticket 4802 · invoice dispute, checking event counts',
        duration: '22m 40s',
        durationMinutes: 22.7,
        endedBy: 'admin',
      },
      {
        id: 's_3',
        started: '06 Aug 09:48',
        tenant: 'Aurora Dental Group',
        slug: 'aurora-dental',
        admin: 'wanjiku',
        reason: 'Ticket 4771 · reviewing AI escalation threshold',
        duration: '30m 00s',
        durationMinutes: 30,
        endedBy: 'expired',
      },
      {
        id: 's_4',
        started: '04 Aug 14:19',
        tenant: 'Northwind Traders East Africa',
        slug: 'northwind-ea',
        admin: 'brian',
        reason: 'Onboarding check before plan upgrade',
        duration: '14m 05s',
        durationMinutes: 14.1,
        endedBy: 'admin',
      },
      {
        id: 's_5',
        started: '02 Aug 10:33',
        tenant: 'Sarova Hospitality Collection',
        slug: 'sarova-hospitality',
        admin: 'j.otieno',
        reason: 'SEV2 follow-up · verifying no messages were lost',
        duration: '30m 00s',
        durationMinutes: 30,
        endedBy: 'expired',
      },
      {
        id: 's_6',
        started: '30 Jul 15:57',
        tenant: 'Peridot Health Clinics',
        slug: 'peridot-health',
        admin: 'wanjiku',
        reason: 'Trial support · walking the owner through channels',
        duration: '19m 31s',
        durationMinutes: 19.5,
        endedBy: 'admin',
      },
      {
        id: 's_7',
        started: '28 Jul 08:14',
        tenant: 'Bluewave Telecom Kenya',
        slug: 'bluewave-telecom',
        admin: 'brian',
        reason: 'Ticket 4688 · duplicate staff invitations',
        duration: '6m 48s',
        durationMinutes: 6.8,
        endedBy: 'admin',
      },
      {
        id: 's_8',
        started: '24 Jul 13:26',
        tenant: 'Highfield Insurance Brokers',
        slug: 'highfield-insurance',
        admin: 'j.otieno',
        reason: 'Ticket 4650 · webhook retries failing',
        duration: '27m 09s',
        durationMinutes: 27.2,
        endedBy: 'customer',
      },
    ],
  };
}

/* ── Audit log ──────────────────────────────────────────────────────────── */

export type AuditKind = 'tenant' | 'plan' | 'session' | 'rules' | 'admin';

export type AuditDiff = {
  field: string;
  before: string;
  after: string;
  /**
   * ⚠ REDACTION IS A PROPERTY OF THE RECORD, NOT A RENDERING CHOICE.
   *
   * "A credential rotation shows that the secret MOVED; it never shows the
   * secret." That guarantee only holds if the value never leaves the database
   * — so a redacted diff carries the literal string `redacted` in both
   * columns, and the real values are never selected into this model at all.
   *
   * If this were a display flag, the secret would be sitting in the page's
   * serialised RSC payload waiting for anyone who opens devtools, and the
   * promise would be a CSS effect rather than a security property.
   */
  redacted?: boolean;
};

export type AuditEntry = {
  id: string;
  kind: AuditKind;
  time: string;
  action: string;
  target: string;
  actor: string;
  initials: string;
  requestId: string;
  ip: string;
  tenantId: string;
  diff?: AuditDiff[];
  reason?: string;
  /**
   * Doc 23. What the stream needs to tell a change from a read, group by day
   * and name a person — optional because the designed fixtures predate them,
   * and every reader treats absence as "a change, on no particular day".
   */
  /** ISO timestamp, for ordering and for `<time dateTime>`. */
  at?: string;
  /** The Nairobi calendar day, `YYYY-MM-DD`, for grouping. */
  day?: string;
  entityType?: string;
  /** `read` for audited service-role reads; see `natureOf`. */
  nature?: 'change' | 'read';
  /** The address from a `Name <email>` label, shown on the expanded row. */
  actorEmail?: string | null;
  /** The workspace's name, when the entry targets one. */
  tenantName?: string;
};

/**
 * The platform audit log.
 *
 * Replaced by a read over `audit_entries`, newest first. The log is
 * append-only and written in the SAME TRANSACTION as the change it describes,
 * which is what lets the page state plainly that an action missing from this
 * log did not happen.
 */
// eslint-disable-next-line @typescript-eslint/require-await -- see getOverview
export async function getAuditEntries(): Promise<AuditEntry[]> {
  return [
    {
      id: 'a_1',
      kind: 'session',
      time: '10 Aug 14:22:07',
      action: 'support_session.start',
      target: 'Sarova Hospitality Collection',
      actor: 'brian',
      initials: 'BM',
      requestId: 'req_7f21a9c04',
      ip: '196.201.214.88',
      tenantId: 'tnt_4c81b03fa9e2',
      reason:
        'Ticket 4829 · verifying a duplicated WhatsApp thread reported by their support lead.',
    },
    {
      id: 'a_2',
      kind: 'plan',
      time: '10 Aug 13:58:44',
      action: 'tenant.plan_assign',
      target: 'Northwind Traders East Africa · Starter → Growth',
      actor: 'brian',
      initials: 'BM',
      requestId: 'req_7f21a88b1',
      ip: '196.201.214.88',
      tenantId: 'tnt_9a2f7c14d8b0',
      diff: [
        { field: 'plan_id', before: 'starter', after: 'growth' },
        { field: 'entitlements.staff_seats', before: '25', after: '100' },
        { field: 'entitlements.events_per_month', before: '50,000', after: '250,000' },
      ],
    },
    {
      id: 'a_3',
      kind: 'rules',
      time: '10 Aug 13:12:19',
      action: 'ai_rules.master_update',
      target: 'Master rules · version 23 → 24',
      actor: 'brian',
      initials: 'BM',
      requestId: 'req_7f21a4402',
      ip: '196.201.214.88',
      tenantId: '—',
      diff: [
        { field: 'escalation.threshold', before: '0.72', after: '0.68' },
        { field: 'tone.directive', before: 'redacted', after: 'redacted', redacted: true },
      ],
    },
    {
      id: 'a_4',
      kind: 'plan',
      time: '10 Aug 11:47:02',
      action: 'plan.entitlement_change',
      target: 'Growth · events_per_month',
      actor: 'brian',
      initials: 'BM',
      requestId: 'req_7f219ff31',
      ip: '196.201.214.88',
      tenantId: '—',
      diff: [{ field: 'entitlements.events_per_month', before: '250,000', after: '300,000' }],
    },
    {
      id: 'a_5',
      kind: 'admin',
      time: '10 Aug 10:31:55',
      action: 'credential.revoke',
      target: 'Peridot Health Clinics · ak_live_9f2',
      actor: 'system',
      initials: 'SY',
      requestId: 'req_7f2198c07',
      ip: 'internal',
      tenantId: 'tnt_2d95e71a06c3',
      diff: [
        { field: 'credential.status', before: 'active', after: 'revoked' },
        { field: 'credential.secret', before: 'redacted', after: 'redacted', redacted: true },
      ],
    },
    {
      id: 'a_6',
      kind: 'tenant',
      time: '10 Aug 09:14:38',
      action: 'tenant.provision',
      target: 'Tamarind Bay Resorts',
      actor: 'brian',
      initials: 'BM',
      requestId: 'req_7f2190a55',
      ip: '196.201.214.88',
      tenantId: 'tnt_6b40c92e17fa',
      diff: [
        { field: 'status', before: '—', after: 'active' },
        { field: 'plan_id', before: '—', after: 'starter' },
      ],
    },
    {
      id: 'a_7',
      kind: 'admin',
      time: '10 Aug 08:02:10',
      action: 'admin.grant',
      target: 'wanjiku@andishi.co.ke · platform_admin',
      actor: 'brian',
      initials: 'BM',
      requestId: 'req_7f218b2d9',
      ip: '196.201.214.88',
      tenantId: '—',
      diff: [{ field: 'role', before: 'none', after: 'platform_admin' }],
    },
    {
      id: 'a_8',
      kind: 'session',
      time: '09 Aug 16:44:21',
      action: 'support_session.end',
      target: 'Mombasa Freight Union · ended by customer',
      actor: 'j.otieno',
      initials: 'JO',
      requestId: 'req_7f2104ba8',
      ip: '41.90.64.12',
      tenantId: 'tnt_11e7f4a03b95',
      reason: 'Ended from the customer side after 8 minutes of a 30-minute window.',
    },
    {
      id: 'a_9',
      kind: 'tenant',
      time: '09 Aug 15:20:03',
      action: 'tenant.suspend',
      target: 'Mombasa Freight Union',
      actor: 'brian',
      initials: 'BM',
      requestId: 'req_7f20f1c44',
      ip: '196.201.214.88',
      tenantId: 'tnt_11e7f4a03b95',
      diff: [{ field: 'status', before: 'active', after: 'suspended' }],
      reason: 'Non-payment after 90 days and three failed collection attempts. Finance approved.',
    },
    {
      id: 'a_10',
      kind: 'rules',
      time: '09 Aug 11:08:37',
      action: 'ai_rules.propagate',
      target: '47 workspaces · completed in 3.2s',
      actor: 'system',
      initials: 'SY',
      requestId: 'req_7f20c8e10',
      ip: 'internal',
      tenantId: '—',
    },
  ];
}

/* ── Health ─────────────────────────────────────────────────────────────── */

export type DayState = 'ok' | 'degraded' | 'down';

export type ServiceKey = 'api' | 'db' | 'bot' | 'channel';

/**
 * One service, held to one budget.
 *
 * ⚠ `bound` IS WHAT MAKES FOUR DIFFERENT METRICS COMPARABLE. Latency must stay
 * UNDER its target; delivery success must stay OVER its floor. A card that
 * showed "142ms" beside "99.4%" asked the reader to know, per service, which
 * direction is good. `consumed` answers it once for all four: the fraction of
 * the budget in use, where 1.0 is the edge. For a ceiling that is
 * value / target; for a floor it is the ERROR budget spent — (100 − value) /
 * (100 − target) — which is how a 99% delivery floor is actually managed.
 */
export type Service = {
  key: ServiceKey;
  name: string;
  icon: ServiceKey;
  /** Formatted headline figure, e.g. `142ms`. */
  metric: string;
  /** What `metric` measures, e.g. `p95 across all routes`. */
  note: string;
  value: number;
  target: number;
  bound: 'ceiling' | 'floor';
  /** Formatted target, e.g. `200ms budget`. Derived. */
  budget: string;
  /** Fraction of the budget in use. Derived; see the note above. */
  consumed: number;
  /** Availability over the window. Derived from outage minutes only. */
  uptime: string;
  /** 30 days, oldest first. Derived from the incidents. */
  days: DayState[];
};

/** Jobs waiting, and how fast they drain. `perMinute` is numeric so the
 *  time-to-drain can be computed rather than asserted. */
export type Queue = { name: string; depth: number; perMinute: number };

export type Incident = {
  id: string;
  sev: 'SEV1' | 'SEV2' | 'SEV3';
  service: ServiceKey;
  /** An outage counts against availability; a degradation does not. */
  impact: 'outage' | 'degraded';
  minutes: number;
  title: string;
  detail: string;
  /** ISO timestamp. */
  at: string;
  /** Formatted for the row, in Nairobi time. */
  when: string;
  /** The Nairobi calendar day, in the same form as `HealthModel.window`, so a
   *  strip bar and the incident that coloured it are joined by one value. */
  day: string;
  status: 'resolved' | 'monitoring' | 'open';
};

export type HealthModel = {
  /** Sheet 11: the leading sentence, stated before any row — severity known
   *  before the reader has to work it out from the grid. DERIVED. */
  diagnosis: { severity: 'ok' | 'degraded' | 'incident'; sentence: string };
  /** The thirty days the strips cover, oldest first, as `8 Sep` labels. */
  window: string[];
  services: Service[];
  /** The API's p95 budget, drawn on the latency chart. */
  latencyBudget: number;
  latency: Array<{ t: string; p50: number; p95: number; p99: number }>;
  throughput: Array<{ t: string; requests: number; errors: number }>;
  /** Sheet 11: "a rejected scope is the guard working, not an error." A
   *  refusal (support-mode boundary, entitlement ceiling, rate limit) is
   *  counted here and held out of `throughput.errors`, which is reserved
   *  for genuine failures. */
  refusals: { count24h: number; note: string };
  queues: Queue[];
  incidents: Incident[];
  /** Sheet 11: "the severe risk in the brief is a policy gap; its status
   *  belongs beside uptime, not buried in CI." The one number on this page
   *  that is not a performance metric. */
  isolation: {
    tablesTotal: number;
    tablesPoliced: number;
    /**
     * ⚠ `null` MEANS NOT COUNTED, AND THE PAGE MUST SAY SO.
     *
     * These were `0`, and the health page rendered "Refused 0 / 0" in the
     * success colour — which reads as "every attempt was refused" when what
     * it means is "nothing counts attempts". `live.ts` said, in a comment,
     * that the page "states that these are not yet instrumented rather than
     * letting a confident 0 imply a clean bill of health". It did not. A
     * nullable type makes the distinction impossible to render by accident.
     */
    crossTenantAttempts30d: number | null;
    crossTenantRefused30d: number | null;
    /** When the policy catalogue was last read. Formatted, Nairobi time. */
    lastRun: string;
  };
};

export type IsolationStatus = HealthModel['isolation'];

/**
 * ⚠ ONE ISOLATION FACT, READ IN TWO PLACES.
 *
 * Sheet 05 puts isolation state permanently under the navigation ("the severe
 * risk in the brief is a policy gap, so its state sits under the navigation
 * rather than being something to go and check"); sheet 11 puts the full panel
 * on Health. Those are two different components on two different routes
 * making the same claim about the same guarantee.
 *
 * So it is declared once, here, and both read it. A console whose sidebar
 * says isolation is green while its Health page says otherwise would
 * undermine the one guarantee this product is sold on — and that is exactly
 * the kind of drift two hardcoded literals produce six months apart.
 *
 * 06 §4: "roughly eighteen tenant-scoped tables" — the suite's real count is
 * introspected from the schema at run time by `tenantScopedTables()` in
 * `tests/isolation/harness.ts`, not hardcoded. 18 is
 * `project-docs/06-tenancy-and-isolation.md`'s own figure, kept in step with
 * it here rather than restating the design mockup's illustrative "11".
 */
const ISOLATION: IsolationStatus = {
  tablesTotal: 18,
  tablesPoliced: 18,
  crossTenantAttempts30d: null,
  crossTenantRefused30d: null,
  lastRun: 'Today, 03:00',
};

/** The narrow read the console shell needs. Replaced by the isolation suite's
 *  own last-run record once M1 wires CI results into a table. */
// eslint-disable-next-line @typescript-eslint/require-await -- see getOverview
export async function getIsolationStatus(): Promise<IsolationStatus> {
  return {
    ...ISOLATION,
    lastRun: 'Today, 03:00',
  };
}

const HEALTH_WINDOW = 30;
const MINUTES_IN_WINDOW = HEALTH_WINDOW * 24 * 60;

const EAT_DAY = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Africa/Nairobi',
  day: 'numeric',
  month: 'short',
});
const EAT_WHEN = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Africa/Nairobi',
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

/**
 * The incidents the designed figures are built from.
 *
 * ⚠ THE INCIDENT LIST IS THE SOURCE, AND EVERYTHING ELSE ON THE PAGE IS
 *   DERIVED FROM IT.
 *
 * The previous fixture declared each of these independently, and they did not
 * agree. The diagnosis said AI inference had "a 6-minute outage on the 8th" —
 * but index 8 of an oldest-first strip is twenty-two days ago, not the 8th of
 * anything. It said "everything else held its target the entire period" while
 * the API and channel-gateway strips each showed an amber day. The one SEV1
 * described the DATABASE losing its primary for six minutes, on a Database
 * card reading 100% with thirty green bars. And all three incidents were dated
 * July and August, outside the thirty days the strips cover, so not one mark
 * on any strip had an incident to explain it.
 *
 * An operations screen whose sentence, bars and incident log tell three
 * different stories teaches the reader to trust none of them. Deriving the
 * strips, the availability figures and the diagnosis from this one list makes
 * disagreement impossible rather than merely unlikely: every coloured bar has a
 * row below it that explains it, and every row has a bar above it.
 */
const HEALTH_INCIDENTS: Array<
  Omit<Incident, 'at' | 'when' | 'day'> & { daysAgo: number; hour: string }
> = [
  {
    id: 'inc_05',
    sev: 'SEV3',
    service: 'bot',
    impact: 'degraded',
    minutes: 41,
    daysAgo: 7,
    hour: '12:18',
    title: 'AI completions over budget at the lunchtime peak',
    detail:
      'p95 completion time reached 3.1s against a 2.5s budget. Replies slowed; none were dropped, and the escalation path to a person stayed open throughout.',
    status: 'resolved',
  },
  {
    id: 'inc_04',
    sev: 'SEV3',
    service: 'api',
    impact: 'degraded',
    minutes: 18,
    daysAgo: 12,
    hour: '09:04',
    title: 'Cold routes after a deploy',
    detail:
      'The first requests to three routes after a release paid a cold-start penalty. p95 touched 260ms for eighteen minutes, then settled.',
    status: 'resolved',
  },
  {
    id: 'inc_03',
    sev: 'SEV3',
    service: 'channel',
    impact: 'degraded',
    minutes: 52,
    daysAgo: 15,
    hour: '09:40',
    title: 'WhatsApp template sync delayed',
    detail:
      'Template approval polling backed off after Meta rate-limited it. Two workspaces waited on a template; no inbound message was affected.',
    status: 'resolved',
  },
  {
    id: 'inc_02',
    sev: 'SEV3',
    service: 'bot',
    impact: 'degraded',
    minutes: 34,
    daysAgo: 20,
    hour: '14:52',
    title: 'Slow completions while the provider recovered',
    detail:
      'The day after the outage, the upstream provider ran at reduced capacity. Completions slowed for thirty-four minutes.',
    status: 'resolved',
  },
  {
    id: 'inc_01',
    sev: 'SEV2',
    service: 'bot',
    impact: 'outage',
    minutes: 6,
    daysAgo: 21,
    hour: '14:12',
    title: 'Upstream model provider outage',
    detail:
      'The model provider returned errors for six minutes. Conversations that needed a reply were routed to a person; no message was lost.',
    status: 'resolved',
  },
];

type ServiceSeed = Pick<
  Service,
  'key' | 'name' | 'metric' | 'note' | 'value' | 'target' | 'bound'
> & {
  unit: string;
};

const HEALTH_SERVICES: ServiceSeed[] = [
  {
    key: 'api',
    name: 'API',
    metric: '142ms',
    note: 'p95 across all routes',
    value: 142,
    target: 200,
    bound: 'ceiling',
    unit: 'ms',
  },
  {
    key: 'db',
    name: 'Database',
    metric: '11ms',
    note: 'mean query time',
    value: 11,
    target: 25,
    bound: 'ceiling',
    unit: 'ms',
  },
  {
    key: 'bot',
    name: 'AI inference',
    metric: '1.9s',
    note: 'mean completion',
    value: 1.9,
    target: 2.5,
    bound: 'ceiling',
    unit: 's',
  },
  {
    key: 'channel',
    name: 'Channel gateway',
    metric: '99.4%',
    note: 'delivery success',
    value: 99.4,
    target: 99,
    bound: 'floor',
    unit: '%',
  },
];

/** "API", "API and Database", "API, Database and AI inference". */
function listNames(names: string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

const SPELL = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
const spellCount = (n: number) => SPELL[n] ?? String(n);

/**
 * Platform health.
 *
 * ⚠ QUEUE DEPTH IS JOBS WAITING, NOT JOBS FAILED, and the page says so.
 *
 * It is the single most misread number on an operations screen: a depth of 61
 * looks like 61 broken things when it means 61 things queued and draining. The
 * distinction decides whether someone pages an engineer at 2am, so it is
 * stated on the surface rather than assumed.
 *
 * ⚠ THESE ARE DESIGNED FIGURES and the page labels them so, once per band.
 * Probes arrive at M6 — the overview says the same thing in the same words.
 * Only `isolation` is answerable today, and `live.ts` reads it for real.
 */
// eslint-disable-next-line @typescript-eslint/require-await -- see getOverview
export async function getHealth(): Promise<HealthModel> {
  /*
   * ⚠ ANCHORED TO NAIROBI, NOT TO THE SERVER. `setHours` uses the server's own
   * zone, which on Vercel is UTC — so an incident written as 14:12 rendered as
   * 17:12 to an operator in Nairobi, and a day boundary sat three hours off.
   * EAT has no daylight saving, so a fixed −3h offset from the Nairobi
   * calendar date is exact.
   */
  const today = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Nairobi',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .formatToParts(new Date())
      .map((p) => [p.type, p.value]),
  ) as { year: string; month: string; day: string };
  const dayAt = (daysAgo: number, hour = '00:00') => {
    const [h, m] = hour.split(':').map(Number);
    return new Date(
      Date.UTC(
        Number(today.year),
        Number(today.month) - 1,
        Number(today.day) - daysAgo,
        (h ?? 0) - 3,
        m ?? 0,
      ),
    );
  };

  const window = Array.from({ length: HEALTH_WINDOW }, (_, i) =>
    EAT_DAY.format(dayAt(HEALTH_WINDOW - 1 - i)),
  );

  const incidents: Incident[] = HEALTH_INCIDENTS.map(({ daysAgo, hour, ...rest }) => {
    const at = dayAt(daysAgo, hour);
    return { ...rest, at: at.toISOString(), when: EAT_WHEN.format(at), day: EAT_DAY.format(at) };
  });

  const services: Service[] = HEALTH_SERVICES.map(({ unit, ...seed }) => {
    const own = HEALTH_INCIDENTS.filter((i) => i.service === seed.key);

    /* A day takes the worst thing that happened on it. */
    const days: DayState[] = Array.from({ length: HEALTH_WINDOW }, () => 'ok');
    for (const inc of own) {
      const idx = HEALTH_WINDOW - 1 - inc.daysAgo;
      if (idx < 0 || idx >= HEALTH_WINDOW) continue;
      if (inc.impact === 'outage') days[idx] = 'down';
      else if (days[idx] !== 'down') days[idx] = 'degraded';
    }

    /* ⚠ FLOORED, NOT ROUNDED. Six minutes of outage in thirty days is
       99.986%, which rounds to 99.99% and would round a worse month up to
       "100%". An availability figure must never round an outage away. */
    const outage = own.filter((i) => i.impact === 'outage').reduce((s, i) => s + i.minutes, 0);
    const pct = Math.floor((1 - outage / MINUTES_IN_WINDOW) * 10000) / 100;
    const uptime = outage === 0 ? '100%' : `${pct.toFixed(2)}%`;

    const consumed =
      seed.bound === 'ceiling'
        ? seed.value / seed.target
        : (100 - seed.value) / (100 - seed.target);

    const budget =
      seed.bound === 'ceiling' ? `${seed.target}${unit} budget` : `${seed.target}${unit} floor`;

    return { ...seed, icon: seed.key, budget, consumed, uptime, days };
  });

  /* ── The diagnosis, from the same rows ─────────────────────────────── */
  const hurt = services
    .map((s) => {
      const own = HEALTH_INCIDENTS.filter((i) => i.service === s.key);
      return {
        name: s.name,
        outages: own.filter((i) => i.impact === 'outage'),
        degraded: own.filter((i) => i.impact === 'degraded').length,
      };
    })
    .filter((h) => h.outages.length + h.degraded > 0)
    .sort(
      (a, b) =>
        b.outages.reduce((s, i) => s + i.minutes, 0) -
          a.outages.reduce((s, i) => s + i.minutes, 0) || b.degraded - a.degraded,
    );
  const clean = services.filter((s) => s.days.every((d) => d === 'ok')).map((s) => s.name);

  const parts: string[] = [];
  const lead = hurt[0];
  if (!lead) {
    parts.push(`Every service held its budget for the full ${HEALTH_WINDOW} days.`);
  } else {
    const outage = lead.outages[0];
    if (outage) {
      const only = hurt.filter((h) => h.outages.length > 0).length === 1;
      parts.push(
        `${lead.name} had ${only ? 'the only outage' : 'an outage'} in the last ${HEALTH_WINDOW} days — ${outage.minutes} minutes on ${EAT_DAY.format(dayAt(outage.daysAgo))}` +
          (lead.degraded > 0
            ? `, and ${spellCount(lead.degraded)} slow ${lead.degraded === 1 ? 'spell' : 'spells'} besides.`
            : '.'),
      );
    } else {
      parts.push(
        `${lead.name} had ${spellCount(lead.degraded)} slow ${lead.degraded === 1 ? 'spell' : 'spells'} in the last ${HEALTH_WINDOW} days and no outage.`,
      );
    }
    const rest = hurt.slice(1);
    const single = rest
      .filter((h) => h.outages.length === 0 && h.degraded === 1)
      .map((h) => h.name);
    if (single.length > 0) {
      parts.push(
        `${listNames(single)} ${single.length === 1 ? 'had one' : 'each had one'} degraded day.`,
      );
    }
    if (clean.length > 0) {
      parts.push(
        `${listNames(clean)} held ${clean.length === 1 ? 'its' : 'their'} budget throughout.`,
      );
    }
  }

  const severity: HealthModel['diagnosis']['severity'] = incidents.some(
    (i) => i.status !== 'resolved',
  )
    ? 'incident'
    : services.some((s) => s.days.some((d) => d !== 'ok'))
      ? 'degraded'
      : 'ok';

  return {
    diagnosis: { severity, sentence: parts.join(' ') },
    window,
    services,
    latencyBudget: 200,

    latency: Array.from({ length: 24 }, (_, i) => {
      const hour = `${String(i).padStart(2, '0')}:00`;
      const load = i >= 8 && i <= 18 ? 1 : 0.55;
      return {
        t: hour,
        p50: Math.round((38 + Math.sin(i / 2.4) * 6) * load + 14),
        p95: Math.round((128 + Math.sin(i / 3) * 22) * load + 26),
        p99: Math.round((214 + Math.sin(i / 2) * 48) * load + 42),
      };
    }),

    throughput: Array.from({ length: 24 }, (_, i) => {
      const peak = i >= 9 && i <= 18;
      return {
        t: `${String(i).padStart(2, '0')}:00`,
        requests: Math.round((peak ? 9200 : 3100) + Math.sin(i / 2.2) * 1400),
        errors: i === 17 ? 0.42 : Number((0.008 + Math.abs(Math.sin(i / 5)) * 0.02).toFixed(3)),
      };
    }),

    refusals: {
      count24h: 214,
      note: 'Entitlement ceilings and rate limits the guard rejected on purpose.',
    },

    queues: [
      { name: 'inbound.ingest', depth: 0, perMinute: 412 },
      { name: 'ai.completion', depth: 3, perMinute: 88 },
      { name: 'outbound.dispatch', depth: 0, perMinute: 374 },
      { name: 'audit.write', depth: 12, perMinute: 96 },
      { name: 'billing.reconcile', depth: 61, perMinute: 4 },
    ],

    incidents,
    isolation: ISOLATION,
  };
}

/* ── Plans ──────────────────────────────────────────────────────────────── */

export type PlanHead = { key: string; name: string; price: string; tenants: string; count: number };

export type EntitlementRow = {
  label: string;
  icon: 'seat' | 'bolt' | 'mail' | 'db' | 'key' | 'bot' | 'clock' | 'shield';
  values: string[];
};

export type PlansModel = {
  plans: PlanHead[];
  rows: EntitlementRow[];
  overrides: number;
  unassigned: number;
  /** Pre-computed for the confirm dialog. See the note below. */
  pendingChange: {
    plan: string;
    field: string;
    from: string;
    to: string;
    affected: number;
    breaching: Array<{ name: string; used: string }>;
  };
};

/**
 * Plans and entitlements.
 *
 * ⚠ "BLAST RADIUS" IS THE IDEA THIS SCREEN IS BUILT AROUND.
 *
 * A plan limit is not a setting, it is a value the entitlement guard reads on
 * every request through both doors — so lowering one does not schedule a
 * change, it changes what 21 businesses can do the moment it saves. The design
 * makes every edit state how many workspaces it touches AND name the ones the
 * change would push over a limit, before it commits.
 *
 * That is the same discipline as the suspend dialog: a confirmation that
 * describes consequences rather than asking for confidence. `breaching` is
 * carried in the model rather than computed in the dialog for the same reason
 * the suspend counts are — a console that is confidently wrong about who it is
 * about to break is worse than one that does not ask.
 */
// eslint-disable-next-line @typescript-eslint/require-await -- see getOverview
export async function getPlans(): Promise<PlansModel> {
  return {
    /**
     * ⚠ FOUR PLANS THAT DO NOT EXIST, WITH COUNTS SUMMING TO FIFTY-ONE.
     *
     * Trial, Starter, Growth and Scale — retired 24 Aug 2026 — over a portfolio
     * of twelve. The comparison table on the plans screen was therefore a price
     * list for a product nobody sells, with a column per plan and a row per
     * entitlement, every cell of it invented.
     *
     * Derived from `REVENUE_BY_PLAN`, which counts the real workspaces, so the
     * columns below are the plans that exist and the counts match the donut on
     * the overview.
     */
    plans: REVENUE_BY_PLAN.map((p) => ({
      key: p.plan,
      name: p.name,
      price:
        PLAN_PRICE[p.plan] > 0 ? `KES ${PLAN_PRICE[p.plan].toLocaleString('en-GB')}` : 'Negotiated',
      tenants: p.tenants,
      count: p.count,
    })),
    /*
      ⚠ THE VALUES ARRAY IS POSITIONAL — one entry per column above, in the
      same order. Four entries against three columns silently dropped the last
      one and shifted every row; the entitlements are stated for the three
      plans that exist, in `REVENUE_BY_PLAN`'s order: business, custom, pro.
    */
    rows: [
      { label: 'Staff seats', icon: 'seat', values: ['10', 'unlimited', '1'] },
      { label: 'Channels', icon: 'mail', values: ['5', 'unlimited', '1'] },
      { label: 'API credentials', icon: 'key', values: ['10', 'unlimited', '2'] },
      /*
        Below the line, the entitlements the SCHEMA does not carry. They are
        kept because they are the real commercial differences between the
        tiers and the table would be three rows without them — but they are
        not in `plan_entitlements`, so nothing enforces them yet and the
        screen says so in its own footer.
      */
      { label: 'AI rule overrides', icon: 'bot', values: ['5', 'unlimited', '—'] },
      { label: 'Audit retention', icon: 'clock', values: ['1 year', '3 years', '90 days'] },
      { label: 'SSO and SCIM', icon: 'shield', values: ['SSO', 'SSO + SCIM', '—'] },
    ],
    overrides: 2,
    unassigned: 4,
    pendingChange: {
      plan: 'Business',
      field: 'events per month',
      from: '250,000',
      to: '200,000',
      affected: 21,
      breaching: [
        { name: 'Sarova Hospitality Collection', used: '235,104 used' },
        { name: 'Highfield Insurance Brokers', used: '212,940 used' },
      ],
    },
  };
}

/* ── Master AI rules ────────────────────────────────────────────────────── */

/*
 * ⚠ THE TOGGLE RULE MODEL WAS REMOVED HERE ON 12 SEP 2026. 15 C47.
 *
 * `Rule`, `RuleGroup`, `RulesModel` and `getMasterRules()` described three
 * groups of boolean switches with per-rule locks. No such structure exists in
 * `master_ai_rule_versions.content`, which holds six fields — five prose and
 * one a list — and never held anything else.
 *
 * They are deleted rather than left unreferenced. A read model for a shape the
 * database does not have is not dead code, it is a trap: the next person to
 * need master rules finds a complete-looking model and builds against it. The
 * replacement is `MasterRulesDoc` and `getMasterRulesDoc()` at the end of this
 * file, shaped exactly as `getLiveMasterRules()` returns.
 */

export type AdminRole = 'owner' | 'platform_admin' | 'support';

export type Admin = {
  id: string;
  name: string;
  email: string;
  initials: string;
  role: AdminRole;
  lastSeen: string;
  sessions30d: number;
  /**
   * ⚠ NULL MEANS NOT COUNTED, NOT "OFF".
   *
   * Multi-factor enrolment lives in Supabase's `auth.users`, reachable only
   * through the admin client — which is lint-guarded to `modules/platform`
   * because it bypasses Row Level Security. Reading it on an ordinary page
   * load would mean widening that guard for a status chip.
   *
   * So the live roster reports `null` and the chip says "MFA unknown" rather
   * than "MFA off". Those are opposite claims about a colleague's account, and
   * the amber one is the kind of figure somebody acts on.
   */
  mfa: boolean | null;
  grantedBy: string;
  grantedOn: string;
  /** True for the operator reading the page. Derived from the session. */
  you?: boolean;
  /**
   * The three columns `platform_admins` actually stores, and — since doc 23 —
   * the three the platform module actually enforces. The Admins page draws its
   * matrix from these rather than from a role, because there are no roles in
   * the database: "owner" existed only in this fixture.
   */
  capabilities: { manageWorkspaces: boolean; editMasterRules: boolean; enterSupportMode: boolean };
};

export type Invitation = { email: string; sentAgo: string; expiresIn: string };

export type AdminsModel = {
  admins: Admin[];
  invitations: Invitation[];
  capabilities: Array<{ label: string; owner: boolean; admin: boolean; support: boolean }>;
};

/**
 * Platform operators.
 *
 * ⚠ THE CAPABILITY MATRIX IS THE POINT, not the roster.
 *
 * A list of four names tells an owner nothing they did not know. What they
 * actually need to audit is what each ROLE can reach — and specifically that
 * no role, including their own, can read a customer's message bodies or a
 * credential value. That claim is the product's whole security posture, so the
 * matrix states it as two rows of crosses rather than leaving it implied.
 *
 * ⚠ THE MATRIX CARRIES THREE COLUMNS WHERE THE DESIGN HAS TWO.
 *
 * `Admins.dc.html` compares owner against platform_admin and omits support,
 * but the roster beside it contains a support user — so the matrix as drawn
 * cannot answer the first question an owner asks about the person on row four.
 * A capability table that silently excludes one of the roles it is auditing is
 * worse than no table, because it reads as complete.
 *
 * Replaced by a read over `platform_admins`.
 */
// eslint-disable-next-line @typescript-eslint/require-await -- see getOverview
export async function getAdmins(): Promise<AdminsModel> {
  return {
    admins: [
      {
        id: 'ad_1',
        name: 'Brian Masira',
        email: 'brian@andishi.co.ke',
        initials: 'BM',
        role: 'owner',
        capabilities: { manageWorkspaces: true, editMasterRules: true, enterSupportMode: true },
        lastSeen: 'Active now',
        sessions30d: 11,
        mfa: true,
        grantedBy: '—',
        grantedOn: '12 Mar 2025',
      },
      {
        id: 'ad_2',
        name: 'Wanjiku Kariuki',
        email: 'wanjiku@andishi.co.ke',
        initials: 'WK',
        role: 'platform_admin',
        capabilities: { manageWorkspaces: true, editMasterRules: true, enterSupportMode: true },
        lastSeen: '2 hours ago',
        sessions30d: 6,
        mfa: true,
        grantedBy: 'brian',
        grantedOn: '10 Aug 2026',
      },
      {
        id: 'ad_3',
        name: 'Joseph Otieno',
        email: 'j.otieno@andishi.co.ke',
        initials: 'JO',
        role: 'platform_admin',
        capabilities: { manageWorkspaces: true, editMasterRules: true, enterSupportMode: true },
        lastSeen: 'Yesterday',
        sessions30d: 6,
        mfa: true,
        grantedBy: 'brian',
        grantedOn: '02 Feb 2026',
      },
      {
        id: 'ad_4',
        name: 'Amina Hassan',
        email: 'a.hassan@andishi.co.ke',
        initials: 'AH',
        role: 'support',
        capabilities: { manageWorkspaces: false, editMasterRules: false, enterSupportMode: true },
        lastSeen: '6 days ago',
        sessions30d: 0,
        mfa: false,
        grantedBy: 'wanjiku',
        grantedOn: '21 Jun 2026',
      },
    ],

    invitations: [{ email: 'd.kimani@andishi.co.ke', sentAgo: '2 days ago', expiresIn: '5 days' }],

    capabilities: [
      { label: 'View workspaces and usage', owner: true, admin: true, support: true },
      { label: 'Open a support session', owner: true, admin: true, support: true },
      { label: 'Provision and suspend workspaces', owner: true, admin: true, support: false },
      { label: 'Assign plans and change entitlements', owner: true, admin: true, support: false },
      { label: 'Edit master AI rules', owner: true, admin: true, support: false },
      { label: 'Grant and revoke admin access', owner: true, admin: false, support: false },
      { label: 'Export the audit log', owner: true, admin: true, support: false },
      /* The row that matters. Three crosses, on purpose. */
      { label: 'Read a customer message body', owner: false, admin: false, support: false },
      { label: 'Read a credential value', owner: false, admin: false, support: false },
    ],
  };
}

/* ── Settings ───────────────────────────────────────────────────────────── */

export type Policy = {
  key: string;
  label: string;
  detail: string;
  on: boolean;
  locked?: boolean;
  value?: string;
};

export type NotificationRule = {
  key: string;
  label: string;
  detail: string;
  console: boolean;
  email: boolean;
  locked?: boolean;
};

export type RetentionItem = { label: string; detail: string; value: string };

export type ApiKeyRecord = { id: string; label: string; masked: string; used: string };

export type Webhook = { id: string; url: string; events: string; status: string; healthy: boolean };

export type SettingsModel = {
  platformName: string;
  supportEmail: string;
  currency: string;
  timezone: string;
  policies: Policy[];
  breakGlassActive: boolean;
  notifications: NotificationRule[];
  retention: RetentionItem[];
  /** 17 §6.1. A closed catalogue, so the label and the route cannot drift. */
  exports: Array<{ resource: 'workspaces' | 'revenue' | 'audit'; label: string }>;
  apiKeys: ApiKeyRecord[];
  webhooks: Webhook[];
};

/**
 * Platform-wide settings.
 *
 * `Settings.dc.html` draws a theme picker as a section of this page; the
 * product ships one theme now, so there is no preference left to hold and
 * the section — and the settings section, header toggle and command-palette
 * action that used to write it — were removed rather than kept as a no-op.
 *
 * Replaced by a read over a `platform_settings` singleton row.
 */
// eslint-disable-next-line @typescript-eslint/require-await -- see getOverview
export async function getSettings(): Promise<SettingsModel> {
  return {
    platformName: 'aLcassa',
    supportEmail: 'support@alcassa.app',
    currency: 'KES · Kenyan shilling',
    timezone: 'Africa/Nairobi · EAT',

    policies: [
      {
        key: 'mfa',
        label: 'Require two-factor for all platform admins',
        detail: 'An admin without MFA cannot sign in. Currently one admin would be locked out.',
        on: true,
        locked: true,
      },
      {
        key: 'reason',
        label: 'Require a reason for every support session',
        detail: "The reason is written to the customer's own audit log and shown to them.",
        on: true,
        locked: true,
      },
      {
        key: 'cap',
        label: 'Support session length',
        detail:
          'Hard expiry with no extension. A longer session must be started fresh, and logged again.',
        on: true,
        value: '30 minutes',
      },
      {
        key: 'ip',
        label: 'Restrict console access by IP range',
        detail:
          'Two ranges allowed. Sign-ins from elsewhere are refused before the password is checked.',
        on: false,
        value: '2 ranges',
      },
      {
        key: 'idle',
        label: 'Sign out after inactivity',
        detail:
          'Applies to the console only; an active support session still expires on its own clock.',
        on: true,
        value: '2 hours',
      },
    ],

    breakGlassActive: false,

    notifications: [
      {
        key: 'payment',
        label: 'A payment fails',
        detail: 'First failure, not each retry.',
        console: true,
        email: true,
      },
      {
        key: 'limit',
        label: 'A workspace crosses 90% of a limit',
        detail: 'Once per limit per period.',
        console: true,
        email: false,
      },
      {
        key: 'trial',
        label: 'A trial is three days from ending',
        detail: 'Only for trials with recent sign-in activity.',
        console: true,
        email: true,
      },
      {
        key: 'session',
        label: 'Another admin starts a support session',
        detail: 'Includes the reason they gave.',
        console: true,
        email: false,
      },
      {
        key: 'incident',
        label: 'An incident opens at SEV2 or above',
        detail: 'SEV1 always pages regardless.',
        console: true,
        email: true,
      },
      {
        key: 'admin',
        label: 'A platform admin is granted or revoked',
        detail: 'Cannot be disabled for owners.',
        console: true,
        email: true,
        locked: true,
      },
    ],

    retention: [
      {
        label: 'Platform audit log',
        detail: 'Append-only. Cannot be shortened below the regulatory floor.',
        value: '3 years',
      },
      {
        label: 'Support session records',
        detail: 'Reason, duration, and who ended it.',
        value: '3 years',
      },
      {
        label: 'Health metrics',
        detail: 'Latency, throughput, and queue depth samples.',
        value: '90 days',
      },
      {
        label: 'Suspended workspace data',
        detail: 'Retained so reactivation is a single action.',
        value: '12 months',
      },
    ],

    exports: [
      { resource: 'audit', label: 'Audit log · CSV' },
      { resource: 'revenue', label: 'Revenue · CSV' },
      { resource: 'workspaces', label: 'Workspace roster · CSV' },
    ],

    apiKeys: [
      {
        id: 'k_1',
        label: 'Billing reconciliation worker',
        masked: 'pk_live_4f2a ···· 91c0',
        used: 'used 4 min ago',
      },
      {
        id: 'k_2',
        label: 'Status page publisher',
        masked: 'pk_live_9b17 ···· 3ade',
        used: 'used 2 hours ago',
      },
      {
        id: 'k_3',
        label: 'Internal metrics scraper',
        masked: 'pk_live_02de ···· 77b4',
        used: 'never used',
      },
    ],

    webhooks: [
      {
        id: 'w_1',
        url: 'https://ops.andishi.co.ke/hooks/alcassa',
        events: 'tenant.provision · tenant.suspend · payment.failed',
        status: 'healthy',
        healthy: true,
      },
      {
        id: 'w_2',
        url: 'https://finance.andishi.co.ke/webhook/billing',
        events: 'invoice.paid · invoice.failed',
        status: '3 failures',
        healthy: false,
      },
    ],
  };
}

/* ── Profile ────────────────────────────────────────────────────────────── */

export type SecurityItem = {
  key: SecurityKey;
  label: string;
  /**
   * ⚠ WRITTEN AS ADVICE, NOT AS MEASUREMENT — see `measured`.
   *
   * The fixture's original copy read "Eight of ten remaining. Two were
   * consumed during the July replica failover." On the designed screen that is
   * a fine sentence. On the LIVE screen it was a fabrication: `getLiveProfile`
   * passes the fixture's `security` array straight through, because the three
   * facts it describes live in Supabase's `auth.users` behind the admin client
   * — so a real operator was being told a specific, invented history of their
   * own recovery codes.
   *
   * The details are now claims this codebase can actually stand behind, and
   * anything it cannot measure is flagged rather than asserted.
   */
  detail: string;
  action: string;
  state: 'good' | 'neutral';
  /**
   * False when the state shown is the product's POLICY rather than a reading of
   * this account. `false` renders an explicit "not read from here" line; it
   * does not render a worse-looking badge, because unknown is not bad.
   *
   * Precedent: `Admin.mfa`, where null means "not counted", not "off". Those
   * are opposite claims about somebody's account and the screen must not
   * confuse them.
   */
  measured: boolean;
};

export type SecurityKey = 'mfa' | 'password' | 'recovery';

export type DeviceSession = {
  id: string;
  device: string;
  meta: string;
  when: string;
  current?: boolean;
  /**
   * A support session opened into a customer's workspace, which is a different
   * KIND of thing from a laptop — it has a ceiling, it appears in that
   * customer's own log, and ending it ends a visit rather than a login. The
   * row says so rather than looking like a third browser.
   */
  support?: boolean;
};

/**
 * What this admin is permitted to do, from `platform_admins`' three booleans.
 *
 * ⚠ THESE WERE READ AND THROWN AWAY. `getLiveProfile` already selected all
 * three columns and used them only to collapse into a role label — so the
 * screen whose stated purpose is "the person with the most access is shown
 * their own ceiling" was showing a pill derived from the grants instead of the
 * grants. 05 §4 chose per-capability booleans over a role enum precisely so
 * this could be stated exactly; the rail now states it.
 */
export type ProfileCapability = {
  key: 'suspend' | 'rules' | 'support';
  label: string;
  /** What it lets you do, in the second person. */
  detail: string;
  granted: boolean;
};

/**
 * One line of the operator's own platform audit trail.
 *
 * ⚠ IT IS THE SAME ROW THE AUDIT SCREEN SHOWS, NARROWED. Not a second model of
 * the same table — `action` is the catalogue key verbatim, `usedServiceRole` is
 * the column an auditor filters on, and `reason` is nullable because several
 * actions genuinely do not take one. A profile-shaped summary that rounded any
 * of those off would be a second version of the audit log that quietly disagreed
 * with the first.
 */
export type OperatorAction = {
  id: string;
  action: string;
  /** The workspace it touched, by name. Null for platform-wide actions. */
  target: string | null;
  reason: string | null;
  usedServiceRole: boolean;
  /** Already formatted — "4h ago", "12 Aug". */
  when: string;
};

export type ProfileModel = {
  name: string;
  email: string;
  /**
   * ⚠ NULL MEANS NOT READABLE FROM HERE, NOT "UNVERIFIED".
   *
   * Verification state lives in `auth.users`, same guard as MFA. The live
   * reader used to report a hard `false`, which renders identically to a
   * genuinely unverified address — and "we did not look" and "this address was
   * never confirmed" are opposite claims to put beside somebody's email.
   */
  emailVerified: boolean | null;
  initials: string;
  /**
   * The uploaded photograph, or null.
   *
   * ⚠ NULL IS THE COMMON CASE AND IS A DESIGNED STATE, NOT A MISSING IMAGE.
   * Most accounts have no avatar and render their initials with no network
   * request at all. `user_profiles.avatar_path` has existed since the first
   * migration and `/v1/me` has always accepted it; nothing wrote to it until
   * the console's own picker did.
   *
   * A public storage URL, built rather than signed — `lib/storage/avatar.ts`
   * carries the reasoning for the bucket being public-read.
   */
  avatarUrl: string | null;
  role: AdminRole;
  capabilities: ProfileCapability[];
  security: readonly SecurityItem[];
  sessions: DeviceSession[];
  /**
   * Sessions the reader is NOT being shown, because the query is capped. Zero
   * on every ordinary account. A list that silently truncates is the defect
   * 18 §12 records; this is how this surface avoids it.
   */
  sessionsHidden: number;
  /** The operator's own recent platform actions, newest first. */
  activity: OperatorAction[];
  /** Everything in the 30-day window, not just what `activity` lists. */
  activityTotal: number;
  facts: Array<{ label: string; value: string }>;
};

/**
 * The three grants, with their labels, in the order the rail states them.
 *
 * ⚠ IT IS A LIST OF GRANTS, NOT A LIST OF WHAT IS GRANTED. The fixture marks
 * all three true because the fixture is the owner; the live reader marks each
 * one from its own column, so a support-only admin sees two of them read
 * "not granted" rather than seeing a shorter list. A capability that vanishes
 * when it is withheld cannot be distinguished from one the product does not
 * have, and the whole point of this rail is telling an operator their ceiling.
 */
export const PLATFORM_CAPABILITIES: ReadonlyArray<Omit<ProfileCapability, 'granted'>> = [
  {
    key: 'suspend',
    label: 'Suspend a workspace',
    detail: 'Stop a customer sending or receiving, and lift it again.',
  },
  {
    key: 'rules',
    label: 'Edit the master rules',
    detail: 'Change the defaults every workspace inherits.',
  },
  {
    key: 'support',
    label: 'Enter support mode',
    detail: 'Open a time-boxed, logged session inside a customer workspace.',
  },
];

/**
 * The security checklist. Shared by the fixture and the live reader, because it
 * is the same list either way — it states the product's policy rather than
 * measuring this account.
 *
 * ⚠ EVERY ITEM IS `measured: false`, AND THAT IS THE CORRECTION. These three
 * facts live in Supabase's `auth.users`, behind the admin client that is
 * lint-guarded to `modules/platform` for bypassing RLS. Nothing here has read
 * them. The previous copy — "added 14 March 2025", "changed 62 days ago",
 * "eight of ten remaining" — was rendered verbatim on the LIVE screen, so a
 * real operator was being told an invented history of their own account.
 */
export const SECURITY_POLICY: readonly SecurityItem[] = [
  {
    key: 'mfa',
    label: 'Two-factor authentication',
    detail: 'Required for every platform admin. Enrolment is held by the identity provider.',
    action: 'Regenerate codes',
    state: 'good',
    measured: false,
  },
  {
    key: 'password',
    label: 'Password',
    detail: 'No rotation requirement — length beats churn. Changes go through the recovery flow.',
    action: 'Change',
    state: 'neutral',
    measured: false,
  },
  {
    key: 'recovery',
    label: 'Recovery codes',
    detail: 'Ten are issued once, at enrolment, and shown only that one time.',
    action: 'View',
    state: 'neutral',
    measured: false,
  },
];

/**
 * The signed-in operator's own profile.
 *
 * ⚠ THIS IS THE SAME PERSON AS `admins[0]` IN `getAdmins()`, on purpose. Both
 * represent Brian Masira, the owner, viewed from two different screens — the
 * roster and his own settings — and they carry the same name, email and role
 * so the two screens never quietly disagree about who is signed in.
 *
 * Replaced by the resolved session once M2 lands.
 */
// eslint-disable-next-line @typescript-eslint/require-await -- see getOverview
export async function getProfile(): Promise<ProfileModel> {
  return {
    name: 'Brian Masira',
    email: 'brian@andishi.co.ke',
    emailVerified: true,
    initials: 'BM',
    /* ⚠ THE DESIGNED PROFILE HAS NO PHOTOGRAPH, AND THAT IS THE HONEST FIXTURE.
       A stock face here would put a stranger's likeness back on the screen the
       avatar picker was built to remove, and it would exercise the rarer of the
       two states — most accounts render initials. The picker is reachable on
       the fixture path; what it cannot do without a session is store anything. */
    avatarUrl: null,
    role: 'owner',

    capabilities: PLATFORM_CAPABILITIES.map((c) => ({ ...c, granted: true })),

    security: SECURITY_POLICY,

    sessions: [
      {
        id: 'sess_1',
        device: 'MacBook Pro · Chrome 141',
        meta: 'Nairobi, KE · 196.201.214.88',
        /* ⚠ NOT "This device". The row already carries a "This device" pill in
           the control column, and repeating it in the recency column cost the
           screen the one fact that column exists for — when this session was
           last used. Two labels saying the same thing is one label short. */
        when: 'Active now',
        current: true,
      },
      {
        id: 'sess_2',
        device: 'iPhone 16 · Safari',
        meta: 'Nairobi, KE · 41.90.64.12',
        when: '3h ago',
      },
      {
        id: 'sess_3',
        device: 'Windows · Edge 129',
        meta: 'Mombasa, KE · 105.163.2.41',
        when: '6 Sep',
      },
    ],

    sessionsHidden: 0,

    /**
     * ⚠ SHAPED AS THE QUERY RETURNS IT, INCLUDING THE AWKWARD PARTS. One row
     * with no reason, both values of `usedServiceRole`, a mix of workspace-
     * targeted and platform-wide actions. A fixture whose every row is tidy is a
     * fixture that never exercises the states the screen has to draw — and the
     * seeded demo data in `db/seed/demoProfile.ts` carries the same mix, so the
     * live path and this one look alike.
     */
    activity: [
      {
        id: 'act_1',
        action: 'subscription.plan_assigned',
        target: 'Northwind Traders',
        reason: 'moved to Business at their request',
        usedServiceRole: true,
        when: '1d ago',
      },
      {
        id: 'act_2',
        action: 'platform.exported',
        target: null,
        reason: 'workspaces',
        usedServiceRole: false,
        when: '2d ago',
      },
      {
        id: 'act_3',
        action: 'support.entered',
        target: 'Acme Industrial',
        reason: 'channel not delivering — ticket 4412',
        usedServiceRole: true,
        when: '3d ago',
      },
      {
        id: 'act_4',
        action: 'profile.updated',
        target: null,
        reason: 'display name',
        usedServiceRole: false,
        when: '5 Sep',
      },
      {
        id: 'act_5',
        action: 'tenant.suspended',
        target: 'Tamarind Hotels',
        reason: 'non-payment, 62 days overdue',
        usedServiceRole: true,
        when: '5 Sep',
      },
      {
        id: 'act_6',
        action: 'rules.published',
        target: null,
        reason: null,
        usedServiceRole: true,
        when: '2 Sep',
      },
    ],

    activityTotal: 412,

    facts: [
      { label: 'Admin since', value: '14 Mar 2025' },
      { label: 'Support sessions', value: '9 this month' },
      { label: 'Last sign-in', value: 'Today 08:41' },
      { label: 'Audit entries', value: '412 by you' },
    ],
  };
}

/* ── Provision ──────────────────────────────────────────────────────────── */

export type ProvisionPlanOption = { key: string; name: string; price: string; limit: string };

export type ProvisionModel = {
  plans: ProvisionPlanOption[];
  steps: Array<{ n: string; text: string }>;
};

/**
 * Provisioning options.
 *
 * ⚠ THESE NUMBERS ARE THE SAME NUMBERS AS `getPlans()`, restated in the
 * shorter form a form field has room for ("46k" rather than "KES 46,000").
 * They are not re-derived from a shared constant, because the two screens
 * read the number at different granularities for different audiences — Plans
 * is the editable source of truth an owner tunes, Provision is a summary a
 * fast-moving form shows in passing. A change to a plan's price is real work
 * either way; the duplication is two literals to update, not a computed
 * value silently drifting. Flagged here so the two are updated together.
 */
// eslint-disable-next-line @typescript-eslint/require-await -- see getOverview
export async function getProvisionOptions(): Promise<ProvisionModel> {
  return {
    /**
     * ⚠ THESE WERE `starter`, `growth` AND `scale`, WHICH HAVE NEVER EXISTED.
     *
     * The product's plans are `pro`, `business` and `custom` — confirmed
     * 24 Aug 2026 and recorded on `plans.code` in the schema. This list was
     * three names and two prices out of date, the provisioning modal's DEFAULT
     * selection was `growth`, and the operator's choice was dropped before it
     * reached the service anyway, so every workspace provisioned through it
     * came out with no subscription at all.
     *
     * The modal now reads the live catalogue (see `fetchProvisionOptions`) and
     * this is the fallback for the review bypass only. It is corrected rather
     * than deleted because a fallback that lies is how the drift survived: a
     * screen that looks plausible is never checked against the database.
     */
    plans: [
      {
        key: 'pro',
        name: 'Pro',
        price: `KES ${(PLAN_PRICE.pro / 1000).toLocaleString('en-GB')}k`,
        limit: '25 seats · 5 channels',
      },
      {
        key: 'business',
        name: 'Business',
        price: `KES ${(PLAN_PRICE.business / 1000).toLocaleString('en-GB')}k`,
        limit: '100 seats · 15 channels',
      },
      { key: 'custom', name: 'Custom', price: 'Negotiated', limit: 'Set overrides after' },
    ],

    steps: [
      { n: '1', text: 'Workspace row created with Row Level Security policies bound to its id.' },
      { n: '2', text: 'Plan entitlements resolved and snapshotted onto the workspace.' },
      { n: '3', text: 'Owner account invited; no password is ever set by you.' },
      { n: '4', text: 'Master AI rules propagated to the new workspace.' },
      { n: '5', text: 'tenant.provision written to the audit log with your name.' },
    ],
  };
}

/**
 * ⚠ THE TIMESTAMP IS FORMATTED ON THE SERVER, IN ONE FIXED ZONE.
 *
 * The design's eyebrow reads "Tuesday 11 August · 09:14 EAT". Formatting that
 * in the browser would hydration-mismatch on every load — the server renders
 * in UTC and the client re-renders in whatever the laptop is set to, and React
 * logs a mismatch for a string nobody is even reading closely.
 *
 * Africa/Nairobi is hardcoded rather than taken from the browser because this
 * console has one operator team in one city, and a support session's clock, an
 * audit entry and this greeting all agreeing on the wall time matters more
 * than the greeting following someone's laptop through an airport.
 */
function formatStamp(now: Date): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Nairobi',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);

  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('weekday')} ${get('day')} ${get('month')} · ${get('hour')}:${get('minute')} EAT`;
}

/** Greeting by hour, in the operator's zone rather than the server's. */
export function greeting(now = new Date()): string {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Nairobi',
      hour: '2-digit',
      hour12: false,
    }).format(now),
  );
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/* ── Workspace Details Sub-tabs Mocks ───────────────────────────────────── */

export type StaffRole = 'admin' | 'staff';
export type StaffStatus = 'active' | 'invited' | 'suspended';

export type WorkspaceStaff = {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  status: StaffStatus;
  lastSignIn: string;
  seats: number;
};

// eslint-disable-next-line @typescript-eslint/require-await
export async function getWorkspaceStaff(slug?: string): Promise<WorkspaceStaff[]> {
  void slug;
  return [
    {
      id: 'usr_1',
      name: 'Joseph Mwaura',
      email: 'j.mwaura@kilimanjaro.co.ke',
      role: 'admin',
      status: 'active',
      lastSignIn: '2 hours ago',
      seats: 1,
    },
    {
      id: 'usr_2',
      name: 'Alice Wambui',
      email: 'a.wambui@kilimanjaro.co.ke',
      role: 'staff',
      status: 'active',
      lastSignIn: '1 day ago',
      seats: 1,
    },
    {
      id: 'usr_3',
      name: 'David Ochieng',
      email: 'd.ochieng@kilimanjaro.co.ke',
      role: 'staff',
      status: 'invited',
      lastSignIn: 'Never',
      seats: 0,
    },
    {
      id: 'usr_4',
      name: 'Sarah Hassan',
      email: 's.hassan@kilimanjaro.co.ke',
      role: 'admin',
      status: 'active',
      lastSignIn: '4 mins ago',
      seats: 1,
    },
    {
      id: 'usr_5',
      name: 'Michael Mutua',
      email: 'm.mutua@kilimanjaro.co.ke',
      role: 'staff',
      status: 'suspended',
      lastSignIn: '14 days ago',
      seats: 1,
    },
  ];
}

export type ChannelType = 'whatsapp' | 'email' | 'web' | 'sms';
export type ChannelStatus = 'healthy' | 'degraded' | 'disconnected';

export type WorkspaceChannel = {
  id: string;
  type: ChannelType;
  name: string;
  status: ChannelStatus;
  lastEvent: string;
  healthPct: number;
  messagesToday: number;
};

// eslint-disable-next-line @typescript-eslint/require-await
export async function getWorkspaceChannels(slug?: string): Promise<WorkspaceChannel[]> {
  void slug;
  return [
    {
      id: 'ch_1',
      type: 'whatsapp',
      name: 'Main Support Line (+254 700 000000)',
      status: 'healthy',
      lastEvent: '2 mins ago',
      healthPct: 100,
      messagesToday: 1240,
    },
    {
      id: 'ch_2',
      type: 'email',
      name: 'support@kilimanjaro.co.ke',
      status: 'healthy',
      lastEvent: '14 mins ago',
      healthPct: 99.8,
      messagesToday: 412,
    },
    {
      id: 'ch_3',
      type: 'web',
      name: 'In-app Chat Widget',
      status: 'degraded',
      lastEvent: '1 hour ago',
      healthPct: 85.5,
      messagesToday: 89,
    },
    {
      id: 'ch_4',
      type: 'sms',
      name: 'Alerts Shortcode (22345)',
      status: 'disconnected',
      lastEvent: '3 days ago',
      healthPct: 0,
      messagesToday: 0,
    },
  ];
}

export type RuleState = 'inherited' | 'overridden' | 'custom';

export type WorkspaceRule = {
  id: string;
  category: string;
  name: string;
  description: string;
  state: RuleState;
  masterValue: string;
  tenantValue: string;
};

// eslint-disable-next-line @typescript-eslint/require-await
export async function getWorkspaceRules(slug?: string): Promise<WorkspaceRule[]> {
  void slug;
  return [
    {
      id: 'r_1',
      category: 'Escalation',
      name: 'Confidence Threshold',
      description: 'Minimum confidence score to avoid human fallback.',
      state: 'overridden',
      masterValue: '0.72',
      tenantValue: '0.68',
    },
    {
      id: 'r_2',
      category: 'Tone',
      name: 'Formality Level',
      description: 'Dial for bot response formality.',
      state: 'inherited',
      masterValue: 'Professional',
      tenantValue: 'Professional',
    },
    {
      id: 'r_3',
      category: 'Routing',
      name: 'Off-hours Auto-reply',
      description: 'Send out of office message outside business hours.',
      state: 'custom',
      masterValue: 'Disabled',
      tenantValue: 'Enabled (EAT)',
    },
    {
      id: 'r_4',
      category: 'Safety',
      name: 'PII Redaction',
      description: 'Redact sensitive info like credit cards before logging.',
      state: 'inherited',
      masterValue: 'Strict',
      tenantValue: 'Strict',
    },
  ];
}

// eslint-disable-next-line @typescript-eslint/require-await
export async function getWorkspaceActivity(slug?: string): Promise<AuditEntry[]> {
  void slug;
  return [
    {
      id: 'a_tnt_1',
      kind: 'session',
      time: '10 Aug 14:22:07',
      action: 'support_session.start',
      target: 'Kilimanjaro Logistics Group Ltd',
      actor: 'brian',
      initials: 'BM',
      requestId: 'req_7f21a9c04',
      ip: '196.201.214.88',
      tenantId: 'tnt_kili_123',
      reason:
        'Ticket 4829 · verifying a duplicated WhatsApp thread reported by their support lead.',
    },
    {
      id: 'a_tnt_2',
      kind: 'plan',
      time: '01 Aug 09:12:00',
      action: 'tenant.plan_assign',
      target: 'Kilimanjaro Logistics Group Ltd · Growth → Scale',
      actor: 'wanjiku',
      initials: 'WM',
      requestId: 'req_8d32b8a12',
      ip: '196.201.214.88',
      tenantId: 'tnt_kili_123',
      diff: [
        { field: 'plan_id', before: 'growth', after: 'scale' },
        { field: 'entitlements.events_per_month', before: '250,000', after: '500,000' },
      ],
    },
    {
      id: 'a_tnt_3',
      kind: 'tenant',
      time: '15 Jul 11:30:22',
      action: 'tenant.settings_update',
      target: 'Kilimanjaro Logistics Group Ltd',
      actor: 'system',
      initials: 'SY',
      requestId: 'req_9a44c9d33',
      ip: 'internal',
      tenantId: 'tnt_kili_123',
      diff: [{ field: 'ai_rules.escalation_threshold', before: '0.72', after: '0.68' }],
      reason: 'Customer updated AI settings via dashboard.',
    },
    {
      id: 'a_tnt_4',
      kind: 'session',
      time: '10 Jun 16:44:21',
      action: 'support_session.end',
      target: 'Kilimanjaro Logistics Group Ltd · ended by customer',
      actor: 'j.otieno',
      initials: 'JO',
      requestId: 'req_7f2104ba8',
      ip: '41.90.64.12',
      tenantId: 'tnt_kili_123',
      reason: 'Ended from the customer side after 12 minutes of a 30-minute window.',
    },
  ];
}

/* ── Overview insights ─────────────────────────────────────────────────── */

export type StatusSlice = { status: WorkspaceStatus; count: number; label: string };

export type PressureRow = {
  slug: string;
  name: string;
  metric: 'seats' | 'events';
  used: number;
  limit: number;
  /** 0–100, rounded. The bar reads this; nothing re-derives it from a string. */
  pct: number;
};

export type GrowthPoint = { month: string; opened: number; closed: number; net: number };

export type OverviewInsights = {
  portfolio: {
    statusMix: StatusSlice[];
    /** Worst first. Everything at or above `PRESSURE_THRESHOLD`. */
    pressure: PressureRow[];
    seats: { used: number; limit: number; pct: number };
    events: { used: number; limit: number; pct: number };
    /** Opened against closed, by month. See the note on the fixture below. */
    growth: GrowthPoint[];
  };
  revenue: {
    mrr: RevenueModel['mrr'];
    planMix: RevenueModel['planMix'];
    ageing: RevenueModel['ageing'];
    currency: string;
    outstanding: string;
    /**
     * The collection queue, head first.
     *
     * ⚠ IT IS ORDERED BY WHAT IS WORTH CHASING, NOT BY AGE — and the overview's
     * card used to call `collections[0]` "Oldest active debt", which was
     * simply false.
     * Mombasa Freight is 94 days late; Kilimanjaro, at the head, is 6. The
     * order is right and the LABEL was wrong: Mombasa is suspended with its
     * collection attempts exhausted, so it is a write-off decision rather than
     * a call to make. The head of this list is the debt somebody can still do
     * something about.
     */
    collections: Collection[];
  };
  operations: {
    latency: HealthModel['latency'];
    queues: Queue[];
    refusals: HealthModel['refusals'];
    services: { ok: number; degraded: number; down: number };
    openIncidents: number;
    sessions: SessionsModel['stats'];
  };
};

/** 08 §2 · 03 §14. Within ten percent of a ceiling is "near limit" — the same
 *  threshold the workspace table's amber state uses, defined once.
 *
 *  Exported so the live headroom query counts "at a ceiling" against the same
 *  number this file does. Two definitions of "near limit" is two answers to
 *  one question, and the one that wins is whichever the reader is not looking
 *  at. */
export const PRESSURE_THRESHOLD = 90;

const STATUS_LABEL: Record<WorkspaceStatus, string> = {
  active: 'Active',
  trial: 'Trial',
  'past due': 'Past due',
  suspended: 'Suspended',
  pending: 'Pending',
};

function pctOf(used: number, limit: number): number {
  if (limit <= 0) return 0;
  return Math.round((used / limit) * 100);
}

/**
 * The overview's second screen of content — the bands beneath the queue.
 *
 * ⚠ IT DERIVES. IT DOES NOT RESTATE.
 *
 * This is the whole point of the function and the reason it is not simply
 * more fixture. `getOverview` already hand-types `6.04M`, `47` and `128k`
 * while `getRevenue`, `getWorkspaces` and `getHealth` hold the same three
 * facts independently — four literals for one business, with nothing keeping
 * them equal. A console whose summary disagrees with the page it links to is
 * worse than one with no summary, because the reader cannot tell which number
 * to act on and will eventually check both.
 *
 * So every band below is computed from the model that owns it. The status mix
 * counts `getWorkspaces()`; the pressure list applies the same 90% threshold
 * the workspace table's amber state uses; the revenue band passes the revenue
 * page's own series straight through to the same chart components that page
 * renders. When those models become queries, this becomes correct for free.
 *
 * ⚠ `growth` IS THE ONE EXCEPTION AND IS MARKED AS SUCH. Nothing in the
 * current models carries opened-versus-closed over time — `WorkspaceRow` has
 * a `created` string, but twelve rows cannot make a twelve-month series, and
 * inventing one by bucketing them would produce a chart that looks derived
 * and is not. It is fixture, shaped exactly as the aggregate will return.
 */
export async function getOverviewInsights(): Promise<OverviewInsights> {
  const [workspaces, revenue, health, sessions] = await Promise.all([
    getWorkspaces(),
    getRevenue(),
    getHealth(),
    getSupportSessions(),
  ]);

  /* ── Portfolio ───────────────────────────────────────────────────────
   *
   * ⚠ THE STATUS MIX IS AN AGGREGATE, NOT A COUNT OF `workspaces`.
   *
   * This is the one place deriving the obvious way is WRONG, and it is worth
   * spelling out because the mistake is invisible until it is on screen.
   * `getWorkspaces()` returns a SAMPLE — twelve rows for a portfolio of
   * forty-seven — so counting it yields "12 workspaces" in a donut sitting
   * directly beneath a hero signal that says 47. The page would contradict
   * itself, in two places a reader can see at once.
   *
   * A total is a `count(*) … group by status`, not a length of whatever the
   * list endpoint happened to page in. So the mix is stated here, matching the
   * signal on the same screen, and becomes that query at M4.
   *
   * The PRESSURE list below is different and IS derived from the rows: it is a
   * worst-offenders list, which is exactly what a sample can honestly produce.
   */
  const statusMix: StatusSlice[] = PORTFOLIO_TOTALS.filter((s) => s.count > 0).map(
    ({ status, count }) => ({
      status,
      count,
      label: STATUS_LABEL[status],
    }),
  );

  /* Both meters, flattened into one list — a workspace can be at the ceiling
     on seats, on events, or on both, and the operator wants the worst
     regardless of which meter it came from. */
  const pressure: PressureRow[] = workspaces
    .flatMap((row): PressureRow[] => [
      {
        slug: row.slug,
        name: row.name,
        metric: 'seats',
        used: row.seatsUsed,
        limit: row.seatsLimit,
        pct: pctOf(row.seatsUsed, row.seatsLimit),
      },
      {
        slug: row.slug,
        name: row.name,
        metric: 'events',
        used: row.events,
        limit: row.eventsLimit,
        pct: pctOf(row.events, row.eventsLimit),
      },
    ])
    .filter((row) => row.pct >= PRESSURE_THRESHOLD)
    .sort((a, b) => b.pct - a.pct);

  /* ⚠ AGGREGATES, FOR THE SAME REASON THE STATUS MIX IS. Summing the twelve
     sampled rows and labelling the result "across the platform" would be a
     figure that is wrong by roughly a factor of four and reads as authoritative
     — the worst combination. These are `sum(used), sum(limit) … over all
     tenants` and are stated until that query exists. */
  const seatsUsed = 3_412;
  const seatsLimit = 4_200;
  const eventsUsed = 3_420_000;
  const eventsLimit = 4_600_000;

  /* ── Operations, summarised from the health model ───────────────────── */
  const today = (s: Service) => s.days[s.days.length - 1] ?? 'ok';
  const services = {
    ok: health.services.filter((s) => today(s) === 'ok').length,
    degraded: health.services.filter((s) => today(s) === 'degraded').length,
    down: health.services.filter((s) => today(s) === 'down').length,
  };

  return {
    portfolio: {
      statusMix,
      pressure,
      seats: { used: seatsUsed, limit: seatsLimit, pct: pctOf(seatsUsed, seatsLimit) },
      events: { used: eventsUsed, limit: eventsLimit, pct: pctOf(eventsUsed, eventsLimit) },

      /* ⚠ FIXTURE, AND THE ONLY ONE IN THIS FUNCTION. Nothing models
         opened-versus-closed over time. `WorkspaceRow` carries a `created`
         string, but twelve rows cannot make a twelve-month series, and
         bucketing them would produce a chart that LOOKS derived and is not —
         which is worse than one that is honestly invented, because nobody
         would think to check it. Shaped as the monthly aggregate over
         `tenants.created_at` and `tenants.deleted_at` will return it. */
      growth: [
        { month: 'Apr', opened: 4, closed: 1, net: 3 },
        { month: 'May', opened: 6, closed: 0, net: 6 },
        { month: 'Jun', opened: 5, closed: 2, net: 3 },
        { month: 'Jul', opened: 7, closed: 1, net: 6 },
        { month: 'Aug', opened: 9, closed: 1, net: 8 },
        { month: 'Sep', opened: 3, closed: 0, net: 3 },
      ],
    },

    revenue: {
      mrr: revenue.mrr,
      planMix: revenue.planMix,
      ageing: revenue.ageing,
      currency: revenue.currency,
      outstanding: revenue.outstanding,
      /* Already ordered by consequence on the revenue page. The overview shows
         the head expanded and the rest stacked beneath it, so it wants the
         list rather than only its first element. */
      collections: revenue.collections,
    },

    operations: {
      latency: health.latency,
      /* Deepest queue first — a queue with depth is the only one worth a row
         on a summary screen. */
      queues: [...health.queues].sort((a, b) => b.depth - a.depth),
      refusals: health.refusals,
      services,
      openIncidents: health.incidents.filter((i) => !/resolved/i.test(i.status)).length,
      sessions: sessions.stats,
    },
  };
}

/* ══════════════════════════════════════════════════════════════════════════
   STAGE 1 SEAMS · 17 §5
   ────────────────────────────────────────────────────────────────────────
   Read models added for the console density pass. Each one is shaped exactly
   as the query that replaces it returns, because a fixture that is not shaped
   like its query is a rewrite disguised as a seam.
   ══════════════════════════════════════════════════════════════════════ */

/**
 * One entitlement, across every workspace on one plan.
 *
 * ⚠ THE QUESTION THIS ANSWERS IS "IS THIS LIMIT DOING ANYTHING?"
 *
 * A plan matrix says a limit is 25. It does not say whether the highest
 * workspace on that plan is at 3 or at 25, and those imply completely
 * different things about whether the number was chosen well. `p50` and `max`
 * together answer it in one read: a limit where the median sits at 8% and the
 * maximum at 96% is a limit doing its job on exactly one customer.
 */
export type HeadroomRow = {
  key: string;
  /**
   * The `plan_entitlements` row this came from, present only on the LIVE
   * model.
   *
   * ⚠ OPTIONAL BECAUSE THE FIXTURE HAS NO ROW TO POINT AT. The designed model
   * is drawn, not read, so there is no id to give — and the limit editor keys
   * off exactly that: no id, no edit control. A fixture that fabricated a uuid
   * would put a live-looking write control on a screen full of invented
   * numbers.
   */
  entitlementId?: string;
  label: string;
  /** NULL is unlimited. A limit that is not a number has no headroom to plot. */
  limit: number | null;
  /** Workspaces on this plan that report this counter at all. */
  tenants: number;
  p50: number;
  max: number;
  /** Workspaces at or above `PRESSURE_THRESHOLD` percent of the limit. */
  atCeiling: number;
};

export type HeadroomPlan = {
  key: string;
  name: string;
  tenants: number;
  workspaces: { name: string; slug: string }[];
  rows: HeadroomRow[];
};

export type HeadroomModel = {
  plans: HeadroomPlan[];
  /** Counters present on no plan's entitlement list. A drift signal. */
  orphanedCounters: string[];
};

/**
 * Designed headroom, for the review bypass.
 *
 * Shaped as `getLiveHeadroom` returns it. The figures are plausible rather
 * than measured, and the page says so wherever it renders them.
 */
// eslint-disable-next-line @typescript-eslint/require-await -- see getOverview
export async function getHeadroom(): Promise<HeadroomModel> {
  return {
    plans: [
      {
        key: 'pro',
        name: 'Pro',
        tenants: 24,
        workspaces: [
          { name: 'Aurora Dental Group', slug: 'aurora-dental' },
          { name: 'Tamarind Bay Resorts', slug: 'tamarind-bay' },
          { name: 'Lake Naivasha Retreat', slug: 'naivasha-retreat' },
        ],
        rows: [
          {
            key: 'seats',
            label: 'Staff seats',
            limit: 5,
            tenants: 24,
            p50: 3,
            max: 5,
            atCeiling: 4,
          },
          {
            key: 'channels',
            label: 'Channels',
            limit: 2,
            tenants: 24,
            p50: 1,
            max: 2,
            atCeiling: 2,
          },
          {
            key: 'api_keys',
            label: 'API keys',
            limit: 2,
            tenants: 19,
            p50: 1,
            max: 2,
            atCeiling: 1,
          },
        ],
      },
      {
        key: 'business',
        name: 'Business',
        tenants: 15,
        workspaces: [
          { name: 'Sarova Hospitality Collection', slug: 'sarova-hospitality' },
          { name: 'Northwind Traders East Africa', slug: 'northwind-ea' },
          { name: 'Mombasa Freight Union', slug: 'mombasa-freight' },
          { name: 'Peridot Health Clinics', slug: 'peridot-health' },
        ],
        rows: [
          {
            key: 'seats',
            label: 'Staff seats',
            limit: 25,
            tenants: 15,
            p50: 9,
            max: 24,
            atCeiling: 1,
          },
          {
            key: 'channels',
            label: 'Channels',
            limit: 6,
            tenants: 15,
            p50: 2,
            max: 5,
            atCeiling: 0,
          },
          {
            key: 'api_keys',
            label: 'API keys',
            limit: 10,
            tenants: 12,
            p50: 2,
            max: 7,
            atCeiling: 0,
          },
        ],
      },
      {
        key: 'custom',
        name: 'Custom',
        tenants: 2,
        workspaces: [
          { name: 'Kilimanjaro Logistics Group Ltd', slug: 'kilimanjaro-logistics' },
          { name: 'Lake Victoria Fisheries', slug: 'victoria-fisheries' },
        ],
        rows: [
          {
            key: 'seats',
            label: 'Staff seats',
            limit: null,
            tenants: 2,
            p50: 41,
            max: 68,
            atCeiling: 0,
          },
          {
            key: 'channels',
            label: 'Channels',
            limit: null,
            tenants: 2,
            p50: 7,
            max: 9,
            atCeiling: 0,
          },
          {
            key: 'api_keys',
            label: 'API keys',
            limit: null,
            tenants: 2,
            p50: 6,
            max: 11,
            atCeiling: 0,
          },
        ],
      },
    ],
    orphanedCounters: [],
  };
}

/**
 * Platform audit volume, one point per day.
 *
 * ⚠ `serviceRole` IS BROKEN OUT BECAUSE IT IS THE QUESTION AN AUDITOR ASKS.
 *
 * Every platform audit row carries `used_service_role`, precisely so that
 * "when did we bypass Row Level Security, and why" is one filter rather than a
 * reconstruction. A volume chart that totals every action hides the only
 * series on it that anybody would investigate.
 */
export type AuditVolumePoint = {
  /** ISO date, `YYYY-MM-DD`. */
  day: string;
  total: number;
  serviceRole: number;
  support: number;
  /** Audited reads — a subset of `total`, and usually of `serviceRole`. */
  reads: number;
};

// eslint-disable-next-line @typescript-eslint/require-await -- see getOverview
export async function getAuditVolume(): Promise<AuditVolumePoint[]> {
  const today = new Date('2026-09-12T00:00:00Z');
  const shape = [
    4, 9, 6, 2, 0, 0, 11, 14, 8, 5, 7, 0, 0, 12, 19, 9, 6, 4, 1, 0, 16, 22, 13, 7, 9, 2, 0, 18, 24,
    15,
  ];
  return shape.map((total, i) => {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - (shape.length - 1 - i));
    return {
      day: d.toISOString().slice(0, 10),
      total,
      serviceRole: Math.round(total * 0.18),
      support: Math.round(total * 0.12),
      reads: Math.round(total * 0.1),
    };
  });
}

/**
 * The master rule set as the DATABASE holds it.
 *
 * ⚠ THIS IS NOT THE SHAPE `RulesModel` DESCRIBES, and the difference is a spec
 * delta rather than a translation problem. See `15 C47`.
 *
 * `RulesModel` — the console's designed model — is three groups of boolean
 * toggles with per-rule locks. `master_ai_rule_versions.content` is a
 * `RulesDocument`: six prose and list fields, versioned, with a per-field lock
 * expressed as which fields a tenant may override. The tenant-side editor
 * already speaks the document vocabulary.
 *
 * Wiring the toggles to the document would mean inventing the toggles, so this
 * reader returns the document and the console page changes shape to meet it.
 */
export type MasterRuleField = {
  key: string;
  label: string;
  /** Empty string where the master set says nothing about this field. */
  value: string;
  /** A field a workspace may not loosen. 01 D-08: locked unless opened. */
  locked: boolean;
};

export type MasterRuleVersion = {
  id: string;
  versionNumber: number;
  status: string;
  savedAt: string;
  current: boolean;
};

export type MasterRulesDoc = {
  versionNumber: number;
  status: string;
  savedAt: string;
  fields: MasterRuleField[];
  versions: MasterRuleVersion[];
  /** Workspaces inheriting this set. The blast radius of a publish. */
  workspaceCount: number;
};

/**
 * The designed master rule set, in the shape the DATABASE holds.
 *
 * ⚠ THIS REPLACES `getMasterRules()` AS THE CONSOLE'S SOURCE, and `15 C47`
 * carries the argument. The short version: `RulesModel` describes three groups
 * of boolean toggles, `master_ai_rule_versions.content` is six prose fields,
 * and the toggles were never in the schema. A fixture shaped unlike its query
 * is a rewrite disguised as a seam.
 *
 * The tenant-side editor has spoken this vocabulary since M2, so the two sides
 * of the inheritance boundary now describe the same rules the same way — which
 * was the point of the feature.
 */
// eslint-disable-next-line @typescript-eslint/require-await -- see getOverview
export async function getMasterRulesDoc(): Promise<MasterRulesDoc> {
  return {
    versionNumber: 24,
    status: 'published',
    savedAt: '11 Sep, 13:12',
    fields: [
      {
        key: 'tone',
        label: 'Tone',
        value:
          'Direct and warm. Use the customer’s name once, at the start. Never apologise more than once in a reply.',
        locked: false,
      },
      {
        key: 'responseGuidelines',
        label: 'Response guidelines',
        value:
          'Answer the question that was asked before offering anything adjacent. If a reply needs more than four sentences, it needs a person.',
        locked: false,
      },
      {
        key: 'businessInformation',
        label: 'Business information',
        value: '',
        locked: false,
      },
      {
        key: 'escalationInstructions',
        label: 'Escalation instructions',
        value:
          'Hand to a person on any mention of a refund, a legal threat, a safety concern, or a third request about the same issue. Say that a person is taking over, and do not promise when.',
        locked: true,
      },
      {
        key: 'prohibitedTopics',
        label: 'Prohibited topics',
        value: [
          'Medical, legal or financial advice',
          'Anything about another customer’s account',
          'Pricing not published on the workspace’s own site',
          'Speculation about an outage’s cause before it is confirmed',
        ].join('\n'),
        locked: true,
      },
      {
        key: 'customInstructions',
        label: 'Custom instructions',
        value: '',
        locked: false,
      },
    ],
    versions: [
      { id: 'v24', versionNumber: 24, status: 'published', savedAt: '11 Sep', current: true },
      { id: 'v23', versionNumber: 23, status: 'superseded', savedAt: '2 Sep', current: false },
      { id: 'v22', versionNumber: 22, status: 'superseded', savedAt: '28 Aug', current: false },
      { id: 'v21', versionNumber: 21, status: 'superseded', savedAt: '27 Aug', current: false },
    ],
    workspaceCount: PORTFOLIO_COUNT,
  };
}
