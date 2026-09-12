import 'server-only';

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

export type QueueItem = {
  id: string;
  slug: string;
  name: string;
  severity: QueueSeverity;
  tag: string;
  detail: string;
  primaryLabel: string;
  primaryHref: string;
  meta: string;
};

export type Signal = {
  id: string;
  label: string;
  value: string;
  note: string;
  href: string;
  icon: 'coin' | 'pulse' | 'building' | 'bolt';
};

export type Vital = {
  label: string;
  value: string;
  state: 'ok' | 'warn' | 'bad';
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
export const PORTFOLIO_TOTALS = [
  { status: 'active' as const, count: 41 },
  { status: 'trial' as const, count: 4 },
  { status: 'suspended' as const, count: 2 },
];

export const PORTFOLIO_COUNT = PORTFOLIO_TOTALS.reduce((n, s) => n + s.count, 0);

/** "41 active · 4 trial · 2 suspended", written from the same array the donut
 *  draws, so a change to one cannot leave the other stale. */
export const PORTFOLIO_NOTE = PORTFOLIO_TOTALS.map((s) => `${s.count} ${s.status}`).join(' · ');

// eslint-disable-next-line @typescript-eslint/require-await -- seam; see the note above
export async function getOverview(): Promise<OverviewModel> {
  return {
    operatorFirstName: 'Brian',
    stamp: formatStamp(new Date()),

    headline: {
      lead: 'Three workspaces need you today, and ',
      figure: 'KES 594,000',
      tail: ' is sitting uncollected.',
    },

    signals: [
      {
        id: 'recurring',
        label: 'Recurring',
        value: '6.04M',
        note: 'Up 5.6% on July. KES.',
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
      {
        id: 'requests',
        label: 'Requests',
        value: '128k',
        note: 'p95 142ms · errors 0.011%',
        href: '/platform/health',
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
    queue: [
      {
        id: 'q_kilimanjaro',
        slug: 'kilimanjaro-logistics',
        name: 'Kilimanjaro Logistics Group Ltd',
        severity: 'danger',
        tag: 'Past due',
        detail:
          'KES 184,000 declined on 4 August, two retries failed. Access continues until 18 August, then 247 staff lose it automatically.',
        primaryLabel: 'Retry charge',
        primaryHref: '/platform/revenue',
        meta: 'suspends in 7 days',
      },
      {
        id: 'q_sarova',
        slug: 'sarova-hospitality',
        name: 'Sarova Hospitality Collection',
        severity: 'warning',
        tag: '94% of limit',
        detail:
          '235,104 of 250,000 events used with 19 days left in the period. At the current rate they stop ingesting around the 17th.',
        primaryLabel: 'Raise to Scale',
        primaryHref: '/platform/plans',
        meta: '19 days left in period',
      },
      {
        id: 'q_peridot',
        slug: 'peridot-health',
        name: 'Peridot Health Clinics',
        severity: 'info',
        tag: 'Trial ends',
        detail:
          'Ends Sunday with no plan assigned. The owner signed in twice this week and has six staff on seats, so this one is worth a call.',
        primaryLabel: 'Assign a plan',
        primaryHref: '/platform/plans',
        meta: '3 days left',
      },
      {
        id: 'q_mombasa',
        slug: 'mombasa-freight',
        name: 'Mombasa Freight Union',
        severity: 'inert',
        tag: 'Suspended',
        detail:
          'Suspended 14 days ago. KES 62,000 outstanding for 94 days and collection attempts are exhausted — this is now a write-off decision, not a retry.',
        primaryLabel: 'Write off',
        primaryHref: '/platform/revenue',
        meta: 'data retained · reactivation is one action',
      },
    ],

    restingCount: 43,

    vitals: [
      { label: 'API', value: '142ms p95', state: 'ok' },
      { label: 'AI inference', value: '1.9s mean', state: 'ok' },
      { label: 'Channel delivery', value: '99.4%', state: 'ok' },
      { label: 'billing.reconcile', value: '61 queued', state: 'warn' },
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
// eslint-disable-next-line @typescript-eslint/require-await -- see getOverview
export async function getWorkspaces(): Promise<WorkspaceRow[]> {
  return [
    {
      id: 'w_01',
      name: 'Kilimanjaro Logistics Group Ltd',
      slug: 'kilimanjaro-logistics',
      plan: 'Scale',
      status: 'past due',
      seatsUsed: 247,
      seatsLimit: 300,
      events: 412880,
      eventsLimit: 500000,
      activity: '4 min ago',
      created: '12 Mar 2025',
    },
    {
      id: 'w_02',
      name: 'Sarova Hospitality Collection',
      slug: 'sarova-hospitality',
      plan: 'Growth',
      status: 'active',
      seatsUsed: 88,
      seatsLimit: 100,
      events: 235104,
      eventsLimit: 250000,
      activity: '11 min ago',
      created: '02 Nov 2024',
    },
    {
      id: 'w_03',
      name: 'Northwind Traders East Africa',
      slug: 'northwind-ea',
      plan: 'Growth',
      status: 'active',
      seatsUsed: 42,
      seatsLimit: 100,
      events: 98220,
      eventsLimit: 250000,
      activity: '38 min ago',
      created: '19 Jan 2025',
    },
    {
      id: 'w_04',
      name: 'Peridot Health Clinics',
      slug: 'peridot-health',
      plan: '—',
      status: 'trial',
      seatsUsed: 6,
      seatsLimit: 10,
      events: 4180,
      eventsLimit: 25000,
      activity: '2 hours ago',
      created: '27 Jul 2026',
    },
    {
      id: 'w_05',
      name: 'Tamarind Bay Resorts',
      slug: 'tamarind-bay',
      plan: 'Starter',
      status: 'active',
      seatsUsed: 9,
      seatsLimit: 25,
      events: 21044,
      eventsLimit: 50000,
      activity: '3 hours ago',
      created: '08 Aug 2026',
    },
    {
      id: 'w_06',
      name: 'Mombasa Freight Union',
      slug: 'mombasa-freight',
      plan: 'Growth',
      status: 'suspended',
      seatsUsed: 61,
      seatsLimit: 100,
      events: 0,
      eventsLimit: 250000,
      activity: '14 days ago',
      created: '30 Sep 2024',
    },
    {
      id: 'w_07',
      name: 'Aurora Dental Group',
      slug: 'aurora-dental',
      plan: 'Starter',
      status: 'active',
      seatsUsed: 14,
      seatsLimit: 25,
      events: 33902,
      eventsLimit: 50000,
      activity: '5 hours ago',
      created: '21 Feb 2025',
    },
    {
      id: 'w_08',
      name: 'Bluewave Telecom Kenya',
      slug: 'bluewave-telecom',
      plan: 'Scale',
      status: 'active',
      seatsUsed: 184,
      seatsLimit: 300,
      events: 288416,
      eventsLimit: 500000,
      activity: '26 min ago',
      created: '14 Jun 2024',
    },
    {
      id: 'w_09',
      name: 'Highfield Insurance Brokers',
      slug: 'highfield-insurance',
      plan: 'Growth',
      status: 'active',
      seatsUsed: 55,
      seatsLimit: 100,
      events: 140388,
      eventsLimit: 250000,
      activity: '1 hour ago',
      created: '05 Dec 2024',
    },
    {
      id: 'w_10',
      name: 'Nyali Property Partners',
      slug: 'nyali-property',
      plan: 'Starter',
      status: 'active',
      seatsUsed: 4,
      seatsLimit: 25,
      events: 6720,
      eventsLimit: 50000,
      activity: '9 days ago',
      created: '17 Apr 2025',
    },
    {
      id: 'w_11',
      name: 'Serengeti Coffee Traders',
      slug: 'serengeti-coffee',
      plan: 'Growth',
      status: 'active',
      seatsUsed: 37,
      seatsLimit: 100,
      events: 76540,
      eventsLimit: 250000,
      activity: '2 hours ago',
      created: '11 Oct 2024',
    },
    {
      id: 'w_12',
      name: 'Lakeside Motors Ltd',
      slug: 'lakeside-motors',
      plan: 'Starter',
      status: 'pending',
      seatsUsed: 0,
      seatsLimit: 25,
      events: 0,
      eventsLimit: 50000,
      activity: 'never',
      created: '09 Aug 2026',
    },
  ];
}

/* ── Workspace detail ───────────────────────────────────────────────────── */

export type Meter = {
  label: string;
  icon: 'seat' | 'bolt' | 'mail' | 'db' | 'key';
  used: number;
  limit: number;
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

  const DEFAULT_PLAN_META = {
    monthly: 'KES 28,000 / month',
    num: 28000,
    ltv: 'KES 364,000',
    ltvNum: 364000,
  };
  const planAmounts: Record<string, { monthly: string; num: number; ltv: string; ltvNum: number }> =
    {
      Scale: { monthly: 'KES 184,000 / month', num: 184000, ltv: 'KES 2,806,000', ltvNum: 2806000 },
      Growth: { monthly: 'KES 85,000 / month', num: 85000, ltv: 'KES 1,190,000', ltvNum: 1190000 },
      Starter: DEFAULT_PLAN_META,
      '—': { monthly: 'Trial (14 days)', num: 0, ltv: 'KES 0', ltvNum: 0 },
    };

  const planMeta = planAmounts[row.plan] ?? DEFAULT_PLAN_META;
  const conversationsUsed = Math.max(1, Math.round(row.seatsUsed * 74.5));
  const conversationsLimit = Math.max(1000, row.seatsLimit * 130);
  const storageGb = Number((row.seatsUsed * 0.14 + (row.events / 500000) * 18).toFixed(1));

  let alert: { title: string; body: string } | null = null;
  if (row.status === 'past due') {
    alert = {
      title: 'Payment past due · 6 days outstanding',
      body: `Invoice INV-2026-0841 for KES ${planMeta.num.toLocaleString('en-GB')} was declined. Two automatic retries failed. Access continues until next period threshold.`,
    };
  } else if (row.status === 'suspended') {
    alert = {
      title: 'Workspace suspended by platform operator',
      body: 'Inbound message routing is queued and staff access is paused. RLS tenant data is preserved. One-click reactivation restores full traffic.',
    };
  } else if (row.status === 'trial') {
    alert = {
      title: 'Active 14-day evaluation trial',
      body: 'Trial concludes in 5 days. Workload telemetry is running under standard Starter tier rate limits with row-level encryption enabled.',
    };
  }

  const invoices: Invoice[] =
    row.status === 'trial' || row.status === 'pending'
      ? []
      : [
          {
            id: `INV-2026-08${row.id.replace('w_', '4')}`,
            issued: '04 Aug 2026',
            period: 'Aug 2026',
            amount: planMeta.num.toLocaleString('en-GB'),
            status: row.status === 'past due' ? 'failed' : 'paid',
            paid: row.status === 'past due' ? '—' : '05 Aug',
          },
          {
            id: `INV-2026-07${row.id.replace('w_', '3')}`,
            issued: '04 Jul 2026',
            period: 'Jul 2026',
            amount: planMeta.num.toLocaleString('en-GB'),
            status: 'paid',
            paid: '04 Jul',
          },
          {
            id: `INV-2026-06${row.id.replace('w_', '2')}`,
            issued: '04 Jun 2026',
            period: 'Jun 2026',
            amount: planMeta.num.toLocaleString('en-GB'),
            status: 'paid',
            paid: '04 Jun',
          },
        ];

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
      {
        label: 'Storage',
        icon: 'db',
        used: storageGb,
        limit: row.plan === 'Scale' ? 100 : row.plan === 'Growth' ? 50 : 25,
        unit: ' GB',
        source: 'attachments',
      },
      {
        label: 'API credentials',
        icon: 'key',
        used: row.plan === 'Scale' ? 3 : 1,
        limit: row.plan === 'Scale' ? 10 : 5,
        source: 'api_credentials',
      },
    ],
    facts: [
      { label: 'Plan tier', value: row.plan || 'Trial' },
      { label: 'Billing period', value: 'Monthly (Auto-debit)' },
      { label: 'Monthly recurring', value: planMeta.monthly.split(' /')[0] ?? planMeta.monthly },
      { label: 'Estimated LTV', value: planMeta.ltv },
      {
        label: 'Next invoice',
        value: row.status === 'past due' ? 'Overdue (04 Aug)' : '04 Sep 2026',
        tone: row.status === 'past due' ? 'danger' : undefined,
      },
      { label: 'Compliance & RLS', value: 'Active · Schema isolated' },
    ],
    owner: { name: ownerInfo.name, email: ownerInfo.email, initials: ownerInfo.initials },
    team: {
      staff: `${row.seatsUsed} of ${row.seatsLimit}`,
      admins: `${ownerInfo.admins ?? 2}`,
      channels: `${ownerInfo.channels ?? 3} active`,
    },
    residency: ownerInfo.residency ?? 'af-south-1 · Nairobi (RLS)',
    billingStats: [
      {
        label: 'Monthly recurring',
        value: planMeta.num.toLocaleString('en-GB'),
        note: `KES · ${row.plan || 'Trial'}`,
      },
      {
        label: 'Lifetime value',
        value: planMeta.ltv.replace('KES ', ''),
        note: 'KES estimated total',
      },
      {
        label: 'Outstanding',
        value: row.status === 'past due' ? planMeta.num.toLocaleString('en-GB') : '0',
        note: row.status === 'past due' ? 'One invoice failed' : 'All accounts settled',
        tone: row.status === 'past due' ? 'danger' : undefined,
      },
      {
        label: 'Collection rate',
        value: row.status === 'past due' ? '92%' : '100%',
        note: 'Past 12 billing cycles',
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
  return {
    kpis: [
      {
        label: 'MRR',
        value: '6.04M',
        note: 'vs 5.72M in July',
        delta: '5.6%',
        direction: 'up',
        good: true,
        icon: 'coin',
      },
      {
        label: 'ARR run rate',
        value: '72.5M',
        note: 'KES, annualised',
        delta: '18.4%',
        direction: 'up',
        good: true,
        icon: 'trend',
      },
      {
        label: 'Average per workspace',
        value: '128k',
        note: 'across 47 workspaces',
        delta: '2.1%',
        direction: 'up',
        good: true,
        icon: 'users',
      },
      {
        label: 'Net revenue churn',
        value: '1.8%',
        note: 'one downgrade in July',
        delta: '0.4pp',
        direction: 'down',
        good: true,
        icon: 'down',
      },
      {
        label: 'Outstanding',
        value: '594k',
        note: 'five invoices unpaid',
        delta: '2 new',
        direction: 'up',
        good: false,
        icon: 'clock',
        tone: 'danger',
      },
    ],

    mrr: [
      { month: 'Sep', mrr: 3_910_000, net: 210_000 },
      { month: 'Oct', mrr: 4_180_000, net: 270_000 },
      { month: 'Nov', mrr: 4_402_000, net: 222_000 },
      { month: 'Dec', mrr: 4_530_000, net: 128_000 },
      { month: 'Jan', mrr: 4_820_000, net: 290_000 },
      { month: 'Feb', mrr: 5_044_000, net: 224_000 },
      { month: 'Mar', mrr: 5_190_000, net: 146_000 },
      { month: 'Apr', mrr: 5_366_000, net: 176_000 },
      { month: 'May', mrr: 5_502_000, net: 136_000 },
      { month: 'Jun', mrr: 5_640_000, net: 138_000 },
      { month: 'Jul', mrr: 5_720_000, net: 80_000 },
      { month: 'Aug', mrr: 6_042_000, net: 322_000 },
    ],

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
    movement: [
      { month: 'Sep', new: 264_000, expansion: 41_000, contraction: 19_000, churn: 76_000 },
      { month: 'Oct', new: 318_000, expansion: 52_000, contraction: 24_000, churn: 76_000 },
      { month: 'Nov', new: 251_000, expansion: 63_000, contraction: 31_000, churn: 61_000 },
      { month: 'Dec', new: 164_000, expansion: 38_000, contraction: 22_000, churn: 52_000 },
      { month: 'Jan', new: 341_000, expansion: 71_000, contraction: 27_000, churn: 95_000 },
      { month: 'Feb', new: 268_000, expansion: 59_000, contraction: 18_000, churn: 85_000 },
      { month: 'Mar', new: 197_000, expansion: 44_000, contraction: 26_000, churn: 69_000 },
      { month: 'Apr', new: 229_000, expansion: 51_000, contraction: 21_000, churn: 83_000 },
      { month: 'May', new: 186_000, expansion: 48_000, contraction: 24_000, churn: 74_000 },
      { month: 'Jun', new: 201_000, expansion: 39_000, contraction: 17_000, churn: 85_000 },
      { month: 'Jul', new: 152_000, expansion: 36_000, contraction: 29_000, churn: 79_000 },
      { month: 'Aug', new: 398_000, expansion: 67_000, contraction: 23_000, churn: 120_000 },
    ],

    planMix: [
      { name: 'Scale', value: 3_500_000, tenants: '19 workspaces', display: '3.50M' },
      { name: 'Growth', value: 1_930_000, tenants: '21 workspaces', display: '1.93M' },
      { name: 'Starter', value: 612_000, tenants: '7 workspaces', display: '612k' },
    ],

    ageing: [
      { bucket: '1–30 days', amount: 240_000 },
      { bucket: '31–60 days', amount: 148_000 },
      { bucket: '61–90 days', amount: 144_000 },
      { bucket: '90+ days', amount: 62_000 },
    ],

    outstanding: '594k',

    collections: [
      {
        id: 'c_1',
        slug: 'kilimanjaro-logistics',
        name: 'Kilimanjaro Logistics Group Ltd',
        invoice: 'INV-2026-0841',
        amount: '184,000',
        days: 6,
        attempts: '2 of 3',
      },
      {
        id: 'c_2',
        slug: 'mombasa-freight',
        name: 'Mombasa Freight Union',
        invoice: 'INV-2026-0688',
        amount: '62,000',
        days: 94,
        attempts: 'exhausted',
      },
      {
        id: 'c_3',
        slug: 'highfield-insurance',
        name: 'Highfield Insurance Brokers',
        invoice: 'INV-2026-0836',
        amount: '148,000',
        days: 4,
        attempts: '1 of 3',
      },
      {
        id: 'c_4',
        slug: 'aurora-dental',
        name: 'Aurora Dental Group',
        invoice: 'INV-2026-0839',
        amount: '46,000',
        days: 2,
        attempts: '1 of 3',
      },
      {
        id: 'c_5',
        slug: 'nyali-property',
        name: 'Nyali Property Partners',
        invoice: 'INV-2026-0844',
        amount: '46,000',
        days: 1,
        attempts: '1 of 3',
      },
    ],
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

export type Service = {
  name: string;
  icon: 'api' | 'db' | 'bot' | 'channel';
  metric: string;
  note: string;
  /** Sheet 11: "a number without a target is trivia." What `metric` is being
   *  held to — the same shape as `note`, read together as one sentence. */
  budget: string;
  uptime: string;
  /** 30 days, oldest first. */
  days: DayState[];
};

export type Queue = { name: string; depth: number; rate: string };

export type Incident = {
  id: string;
  sev: 'SEV1' | 'SEV2' | 'SEV3';
  title: string;
  detail: string;
  when: string;
  status: string;
};

export type HealthModel = {
  /** Sheet 11: the leading sentence, stated before any row — severity known
   *  before the reader has to work it out from the grid. */
  diagnosis: { severity: 'ok' | 'degraded' | 'incident'; sentence: string };
  services: Service[];
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
    crossTenantAttempts30d: number;
    crossTenantRefused30d: number;
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
  crossTenantAttempts30d: 0,
  crossTenantRefused30d: 0,
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

/** 30 days of state, with named exceptions. Written as a helper rather than
 *  30 literals so a degraded day is visible in the source as a date. */
function days(exceptions: Record<number, DayState> = {}): DayState[] {
  return Array.from({ length: 30 }, (_, i) => exceptions[i] ?? 'ok');
}

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
 * Replaced by the observability probes; incidents by the status-page feed.
 */
// eslint-disable-next-line @typescript-eslint/require-await -- see getOverview
export async function getHealth(): Promise<HealthModel> {
  return {
    diagnosis: {
      severity: 'degraded',
      sentence:
        'AI inference is the only service that missed its budget in the last 30 days — two short degradations and a 6-minute outage on the 8th. Everything else held its target the entire period.',
    },

    services: [
      {
        name: 'API',
        icon: 'api',
        metric: '142ms',
        note: 'p95 across all routes',
        budget: 'budget 200ms',
        uptime: '99.98%',
        days: days({ 17: 'degraded' }),
      },
      {
        name: 'Database',
        icon: 'db',
        metric: '11ms',
        note: 'mean query time',
        budget: 'budget 25ms',
        uptime: '100%',
        days: days(),
      },
      {
        name: 'AI inference',
        icon: 'bot',
        metric: '1.9s',
        note: 'mean completion',
        budget: 'budget 2.5s',
        uptime: '99.82%',
        days: days({ 8: 'down', 9: 'degraded', 22: 'degraded' }),
      },
      {
        name: 'Channel gateway',
        icon: 'channel',
        metric: '99.4%',
        note: 'delivery success',
        budget: 'budget 99%',
        uptime: '99.91%',
        days: days({ 14: 'degraded' }),
      },
    ],

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
        // The 17:00 spike the header calls out.
        errors: i === 17 ? 0.42 : Number((0.008 + Math.abs(Math.sin(i / 5)) * 0.02).toFixed(3)),
      };
    }),

    refusals: {
      count24h: 214,
      note: 'Entitlement ceilings and rate limits the guard rejected on purpose. Not counted as errors above.',
    },

    queues: [
      { name: 'inbound.ingest', depth: 0, rate: '412/min' },
      { name: 'ai.completion', depth: 3, rate: '88/min' },
      { name: 'outbound.dispatch', depth: 0, rate: '374/min' },
      { name: 'audit.write', depth: 12, rate: '96/min' },
      { name: 'billing.reconcile', depth: 61, rate: '4/min' },
    ],

    incidents: [
      {
        id: 'i_1',
        sev: 'SEV2',
        title: 'Elevated AI completion latency',
        detail: 'Upstream provider degraded for 34 minutes. Escalations queued; no messages lost.',
        when: '02 Aug, 14:12',
        status: 'resolved',
      },
      {
        id: 'i_2',
        sev: 'SEV3',
        title: 'WhatsApp template sync delayed',
        detail:
          'Template approval polling backed off after rate limiting. Two workspaces affected.',
        when: '27 Jul, 09:40',
        status: 'resolved',
      },
      {
        id: 'i_3',
        sev: 'SEV1',
        title: 'Read replica failover',
        detail: 'Primary lost for 6 minutes. Automatic failover held; writes queued and drained.',
        when: '11 Jul, 03:22',
        status: 'resolved',
      },
    ],

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
    plans: [
      { key: 'trial', name: 'Trial', price: 'Free · 14 days', tenants: '4 workspaces', count: 4 },
      { key: 'starter', name: 'Starter', price: 'KES 46,000', tenants: '7 workspaces', count: 7 },
      { key: 'growth', name: 'Growth', price: 'KES 92,000', tenants: '21 workspaces', count: 21 },
      { key: 'scale', name: 'Scale', price: 'KES 184,000', tenants: '19 workspaces', count: 19 },
    ],
    rows: [
      { label: 'Staff seats', icon: 'seat', values: ['10', '25', '100', '300'] },
      {
        label: 'Events per month',
        icon: 'bolt',
        values: ['25,000', '50,000', '250,000', '500,000'],
      },
      { label: 'Conversations', icon: 'mail', values: ['2,000', '8,000', '40,000', 'unlimited'] },
      { label: 'Storage', icon: 'db', values: ['2 GB', '20 GB', '50 GB', '100 GB'] },
      { label: 'API credentials', icon: 'key', values: ['1', '3', '10', '25'] },
      { label: 'AI rule overrides', icon: 'bot', values: ['—', '5', '25', 'unlimited'] },
      {
        label: 'Audit retention',
        icon: 'clock',
        values: ['7 days', '90 days', '1 year', '3 years'],
      },
      { label: 'SSO and SCIM', icon: 'shield', values: ['—', '—', 'SSO', 'SSO + SCIM'] },
    ],
    overrides: 2,
    unassigned: 4,
    pendingChange: {
      plan: 'Growth',
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
  key: string;
  label: string;
  detail: string;
  action: string;
  state: 'good' | 'neutral';
};

export type DeviceSession = {
  id: string;
  device: string;
  meta: string;
  when: string;
  current?: boolean;
};

export type ProfileModel = {
  name: string;
  email: string;
  emailVerified: boolean;
  initials: string;
  role: AdminRole;
  security: SecurityItem[];
  sessions: DeviceSession[];
  facts: Array<{ label: string; value: string }>;
};

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
    role: 'owner',

    security: [
      {
        key: 'mfa',
        label: 'Two-factor authentication',
        detail: 'Authenticator app, added 14 March 2025. Required for every platform admin.',
        action: 'Regenerate codes',
        state: 'good',
      },
      {
        key: 'password',
        label: 'Password',
        detail: 'Changed 62 days ago. There is no rotation requirement; length beats churn.',
        action: 'Change',
        state: 'neutral',
      },
      {
        key: 'recovery',
        label: 'Recovery codes',
        detail: 'Eight of ten remaining. Two were consumed during the July replica failover.',
        action: 'View',
        state: 'neutral',
      },
    ],

    sessions: [
      {
        id: 'sess_1',
        device: 'MacBook Pro · Chrome 141',
        meta: 'Nairobi, KE · 196.201.214.88',
        when: 'This device',
        current: true,
      },
      {
        id: 'sess_2',
        device: 'iPhone 16 · Safari',
        meta: 'Nairobi, KE · 41.90.64.12',
        when: '3 hours ago',
      },
      {
        id: 'sess_3',
        device: 'Windows · Edge 129',
        meta: 'Mombasa, KE · 105.163.2.41',
        when: '6 days ago',
      },
    ],

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
    plans: [
      { key: 'starter', name: 'Starter', price: 'KES 46k', limit: '25 seats · 50k events' },
      { key: 'growth', name: 'Growth', price: 'KES 92k', limit: '100 seats · 250k events' },
      { key: 'scale', name: 'Scale', price: 'KES 184k', limit: '300 seats · 500k events' },
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
    outstanding: string;
    /** The single worst debt, so the band can name it rather than only chart it. */
    worst: Collection | null;
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
  const statusMix: StatusSlice[] = PORTFOLIO_TOTALS.filter((s) => s.count > 0).map(({ status, count }) => ({
    status,
    count,
    label: STATUS_LABEL[status],
  }));

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
      outstanding: revenue.outstanding,
      /* Already ordered by consequence on the revenue page; the overview wants
         only the head of that list. */
      worst: revenue.collections[0] ?? null,
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
        rows: [
          { key: 'seats', label: 'Staff seats', limit: 5, tenants: 24, p50: 3, max: 5, atCeiling: 4 },
          { key: 'channels', label: 'Channels', limit: 2, tenants: 24, p50: 1, max: 2, atCeiling: 2 },
          { key: 'api_keys', label: 'API keys', limit: 2, tenants: 19, p50: 1, max: 2, atCeiling: 1 },
        ],
      },
      {
        key: 'business',
        name: 'Business',
        tenants: 15,
        rows: [
          { key: 'seats', label: 'Staff seats', limit: 25, tenants: 15, p50: 9, max: 24, atCeiling: 1 },
          { key: 'channels', label: 'Channels', limit: 6, tenants: 15, p50: 2, max: 5, atCeiling: 0 },
          { key: 'api_keys', label: 'API keys', limit: 10, tenants: 12, p50: 2, max: 7, atCeiling: 0 },
        ],
      },
      {
        key: 'custom',
        name: 'Custom',
        tenants: 2,
        rows: [
          { key: 'seats', label: 'Staff seats', limit: null, tenants: 2, p50: 41, max: 68, atCeiling: 0 },
          { key: 'channels', label: 'Channels', limit: null, tenants: 2, p50: 7, max: 9, atCeiling: 0 },
          { key: 'api_keys', label: 'API keys', limit: null, tenants: 2, p50: 6, max: 11, atCeiling: 0 },
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
