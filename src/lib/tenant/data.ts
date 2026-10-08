import 'server-only';
import type { RulesFields, RulesRevision } from '@/modules/aiRules';

/**
 * Tenant application read models.
 *
 * ⚠ THIS FILE IS A SEAM, NOT A MOCK LAYER — the exact discipline
 * `src/lib/console/data.ts` documents for the platform side, restated here
 * because it matters just as much on this one: every export is shaped
 * exactly as the query that will replace it returns, and the comment above
 * each function names that query. A tenant page has never seen anything but
 * its real prop shape, so it cannot quietly grow a dependency on a field the
 * database will not have.
 *
 * Everything here reads as "Acme Industrial", a Growth-tier tenant, until
 * `/v1/me` and its siblings land at M2. The fixture is deliberately not at
 * 0% or 100% of anything — a seats meter at 12 of 15 and a credential unused
 * for 94 days are what make the ochre states and the ochre badges visible in
 * the pages that read this file, rather than every screen shipping in its
 * quietest, least-informative state.
 */

/* ── Overview ─────────────────────────────────────────────────────────── */

export type ChecklistStep = {
  key: string;
  label: string;
  doneLabel: string;
  done: boolean;
  href: string;
  /** One line under the label saying what the step BUYS the reader. Setup
   *  lists fail when every row reads as a chore the product wants doing; the
   *  hint is where the reason lives. */
  hint: string;
  /** The call to action on the next unfinished step. Only the first
   *  incomplete step renders a button — see `SetupChecklist`. */
  cta: string;
};

export type ActivityLine = { time: string; actor: string; action: string };

/**
 * A headline number on the overview, with the eight-reading series its
 * sparkline draws.
 *
 * ⚠ `dir` IS THE MOVEMENT, `tone` IS WHETHER THAT MOVEMENT IS GOOD. They are
 * two fields because they genuinely come apart: a median reply time that
 * falls is an arrow DOWN and a GOOD reading, while a satisfaction score that
 * falls is also down and a bad one. Deriving the colour from the arrow would
 * paint every improvement in reply time ochre.
 */
export type OverviewStat = {
  key: string;
  label: string;
  value: string;
  delta: string;
  dir: 'up' | 'down';
  tone: 'good' | 'warn';
  note: string;
  /** Oldest reading first. Unitless — the sparkline scales to its own range. */
  series: number[];
};

/** One day on the conversation-volume chart. */
export type VolumePoint = { date: string; handled: number; escalated: number };

/** A conversation the agent could not close, waiting on a person. */
export type QueueItem = {
  id: string;
  initials: string;
  name: string;
  channel: string;
  snippet: string;
  wait: string;
  reason: string;
  /** Past the escalation threshold — the wait time is rendered in ochre. */
  hot: boolean;
};

/** A connected channel and whether it is currently carrying traffic. */
export type ChannelStatus = {
  key: string;
  label: string;
  detail: string;
  kind: 'whatsapp' | 'email' | 'web' | 'sms';
  state: string;
  tone: 'good' | 'warn' | 'danger';
};

/** A consumption meter for the current billing period. */
export type UsageMeter = {
  key: string;
  label: string;
  text: string;
  pct: number;
  tone: 'good' | 'warn' | 'danger';
};

export type OverviewModel = {
  operatorFirstName: string;
  tenantName: string;
  planName: string;
  planStatus: 'active' | 'trialing' | 'past_due';
  seats: { used: number; limit: number | null };
  channels: { used: number; limit: number | null };
  /** Rendered as the eyebrow above the greeting, pre-formatted by the server
   *  so the tenant's own timezone decides the date rather than the browser's. */
  today: string;
  /** One sentence under the greeting. Prose, not a template — see 10 §4. */
  summary: string;
  stats: OverviewStat[];
  volume: VolumePoint[];
  queue: QueueItem[];
  queueTotal: number;
  channelStatus: ChannelStatus[];
  meters: UsageMeter[];
  checklist: ChecklistStep[];
  recentActivity: ActivityLine[];
};

/**
 * 02 §4. The overview: plan usage, team size, recent activity, the setup
 * checklist.
 *
 * ⚠ THE CHECKLIST'S `done` FLAGS ARE THE WHOLE FEATURE. Once every step is
 * `done`, the page that reads this stops rendering the checklist section at
 * all, permanently — see the comment on `OverviewPage` for why a checklist
 * that can reappear is a nag rather than a guide. The real version of this
 * reads five different tables (email_verifications, tenant_settings,
 * memberships, api_credentials, tenant_ai_rules) and folds them into one
 * boolean each; this fixture is deliberately mid-way through that list so
 * both states — done and not-done — are visible while the pages are built.
 */
// eslint-disable-next-line @typescript-eslint/require-await -- seam, see the note above getOverview in console/data.ts for the identical pattern
export async function getOverview(): Promise<OverviewModel> {
  return {
    operatorFirstName: 'Amina',
    tenantName: 'Acme Industrial',
    planName: 'Growth',
    planStatus: 'active',
    seats: { used: 12, limit: 15 },
    channels: { used: 3, limit: 5 },
    today: 'Today · Thursday 3 September',
    summary:
      'Three channels are live and the assistant handled 68% of inbound messages overnight. Seven conversations are waiting on a person.',
    /*
     * The four readings the overview leads with. Two `good` and two `warn` on
     * purpose — the tile treatment differs by tone, and a fixture that was
     * uniformly healthy would ship the ochre sparkline untested.
     */
    stats: [
      {
        key: 'open',
        label: 'Open conversations',
        value: '84',
        delta: '+9',
        dir: 'up',
        tone: 'warn',
        note: '7 waiting on a person',
        series: [61, 66, 63, 71, 69, 78, 74, 84],
      },
      {
        key: 'reply',
        label: 'Median first reply',
        value: '1m 42s',
        delta: '−18s',
        dir: 'down',
        tone: 'good',
        note: 'Target is under 3 minutes',
        series: [148, 142, 139, 131, 126, 118, 112, 102],
      },
      {
        key: 'handled',
        label: 'Handled by the assistant',
        value: '68%',
        delta: '+4pt',
        dir: 'up',
        tone: 'good',
        note: '412 of 606 since midnight',
        series: [58, 60, 59, 62, 64, 63, 66, 68],
      },
      {
        key: 'satisfaction',
        label: 'Satisfaction',
        value: '4.6',
        delta: '−0.1',
        dir: 'down',
        tone: 'warn',
        note: '214 ratings this week',
        series: [4.8, 4.8, 4.7, 4.7, 4.75, 4.7, 4.65, 4.6],
      },
    ],
    volume: [
      { date: '12 Jul', handled: 402, escalated: 61 },
      { date: '15 Jul', handled: 448, escalated: 58 },
      { date: '18 Jul', handled: 471, escalated: 66 },
      { date: '21 Jul', handled: 512, escalated: 54 },
      { date: '24 Jul', handled: 498, escalated: 49 },
      { date: '27 Jul', handled: 566, escalated: 52 },
      { date: '30 Jul', handled: 604, escalated: 47 },
      { date: '02 Aug', handled: 588, escalated: 44 },
      { date: '05 Aug', handled: 641, escalated: 41 },
      { date: '08 Aug', handled: 677, escalated: 38 },
    ],
    queue: [
      {
        id: 'c_1',
        initials: 'JM',
        name: 'Joseph Mutiso',
        channel: 'WhatsApp',
        snippet: 'The container arrived but two pallets are missing from the manifest.',
        wait: '18m',
        reason: 'Escalated',
        hot: true,
      },
      {
        id: 'c_2',
        initials: 'RN',
        name: 'Ruth Njeri',
        channel: 'Email',
        snippet: 'Can you re-issue the invoice with our new KRA PIN?',
        wait: '12m',
        reason: 'Unassigned',
        hot: true,
      },
      {
        id: 'c_3',
        initials: 'AO',
        name: 'Alex Ochieng',
        channel: 'Web widget',
        snippet: 'Assistant said 3 days, the tracking page says 8. Which one is right?',
        wait: '7m',
        reason: 'Assistant unsure',
        hot: false,
      },
      {
        id: 'c_4',
        initials: 'FK',
        name: 'Fatuma Kassim',
        channel: 'WhatsApp',
        snippet: 'Need a quote for 40ft Mombasa to Kampala, refrigerated.',
        wait: '5m',
        reason: 'Unassigned',
        hot: false,
      },
      {
        id: 'c_5',
        initials: 'DW',
        name: 'David Waweru',
        channel: 'SMS',
        snippet: 'Stop sending me updates for order 88412.',
        wait: '3m',
        reason: 'Opt-out',
        hot: false,
      },
    ],
    queueTotal: 7,
    channelStatus: [
      {
        key: 'whatsapp',
        label: 'WhatsApp Business',
        detail: '+254 711 0•••  ·  quality: high',
        kind: 'whatsapp',
        state: 'Connected',
        tone: 'good',
      },
      {
        key: 'email',
        label: 'Email',
        detail: 'support@acmeindustrial.co.ke',
        kind: 'email',
        state: 'Connected',
        tone: 'good',
      },
      {
        key: 'web',
        label: 'Web widget',
        detail: 'acmeindustrial.co.ke',
        kind: 'web',
        state: 'Connected',
        tone: 'good',
      },
      {
        key: 'sms',
        label: 'SMS',
        detail: 'Africa’s Talking  ·  14 rejected sends',
        kind: 'sms',
        state: 'Degraded',
        tone: 'warn',
      },
    ],
    /* 08 §2. Seats counts active members plus pending invitations, which is
       why this reads 12 of 15 against a team page showing fewer active rows. */
    meters: [
      { key: 'events', label: 'Events', text: '470,300 / 500,000', pct: 94, tone: 'warn' },
      {
        key: 'conversations',
        label: 'Conversations',
        text: '18,402 / 40,000',
        pct: 46,
        tone: 'good',
      },
      { key: 'seats', label: 'Staff seats', text: '12 / 15', pct: 80, tone: 'good' },
    ],
    /*
     * ⚠ THE ORDER IS BY VALUE TO THE READER, NOT BY SETUP DEPENDENCY, AND IT
     * CHANGED IN THIS PASS.
     *
     * It used to run email → company → team → credential → rules, which is
     * the order the DATABASE would like them done in. Read as a list of
     * reasons to spend the next twenty minutes, that opens with two rows of
     * administration and buries the only step that makes the product do
     * anything.
     *
     * "Set your assistant rules" is the closest thing this build has to an
     * activation event: it is the step after which an inbound message gets
     * handled the way the business wants. It leads now. Company details —
     * genuinely the least consequential, since nothing breaks without them —
     * moves last.
     *
     * ⚠ WHAT IS MISSING FROM THIS LIST IS THE REAL AHA MOMENT. For an
     * omnichannel assistant it is "connect WhatsApp and watch a conversation
     * get handled", not any of these five. There is no channel-connection
     * surface in this build to point at, so the step cannot be added without
     * a link that 404s. It belongs at position one the day that screen ships,
     * and the four below it all drop a place.
     */
    checklist: [
      {
        key: 'rules',
        label: 'Set your assistant rules',
        doneLabel: 'Rules published',
        done: false,
        href: '/app/settings/ai-rules',
        hint: 'Tell the assistant how to answer, and what must always reach a person.',
        cta: 'Write the rules',
      },
      {
        key: 'credential',
        label: 'Create an API credential',
        doneLabel: 'Credential created',
        done: false,
        href: '/app/settings/credentials/new',
        hint: 'Connect your own systems to this workspace.',
        cta: 'Create one',
      },
      {
        key: 'team',
        label: 'Invite your team',
        doneLabel: 'Team invited',
        done: true,
        href: '/app/settings/team',
        hint: 'Conversations the assistant escalates need a person to land on.',
        cta: 'Send an invitation',
      },
      {
        key: 'email',
        label: 'Confirm your email',
        doneLabel: 'Email confirmed',
        done: true,
        href: '/app/account',
        hint: 'So we can reach you about the workspace.',
        cta: 'Resend the link',
      },
      {
        key: 'company',
        label: 'Add your company details',
        doneLabel: 'Company details added',
        done: true,
        href: '/app/settings/company',
        hint: 'Your name and timezone appear on invitations and client replies.',
        cta: 'Add them',
      },
    ],
    recentActivity: [
      { time: '2 hours ago', actor: 'Amina Yusuf', action: 'invited David Kimani to the team' },
      { time: 'Yesterday, 16:40', actor: 'David Kimani', action: 'accepted the invitation' },
      { time: '2 days ago', actor: 'Amina Yusuf', action: 'updated company contact details' },
      { time: '4 days ago', actor: 'System', action: 'monthly usage counters reset' },
    ],
  };
}

/* ── Company ──────────────────────────────────────────────────────────── */

export type CompanyModel = {
  version: number;
  name: string;
  logoUrl: string | null;
  contactEmail: string;
  timezone: string;
  locale: string;
};

/** `/app/settings/company`. Name, logo, contact, timezone, locale — the
 *  fields the design system's form rules apply to directly: `--t-label`
 *  above each field, a 40px control, one line reserved below for helper or
 *  error, autosave never (03 §13 — tenant-facing forms never autosave; the
 *  owner decides when something is committed). */
// eslint-disable-next-line @typescript-eslint/require-await
export async function getCompany(): Promise<CompanyModel> {
  return {
    version: 0,
    name: 'Acme Industrial',
    logoUrl: null,
    contactEmail: 'hello@acmeindustrial.co.ke',
    timezone: 'Africa/Nairobi',
    locale: 'en-KE',
  };
}

/* ── Team ─────────────────────────────────────────────────────────────── */

export type MemberRole = 'owner' | 'admin' | 'agent';
export type MemberStatus = 'active' | 'invited' | 'invitation_expired' | 'suspended';

export type Member = {
  id: string;
  name: string;
  email: string;
  role: MemberRole;
  status: MemberStatus;
  initials: string;
  joinedAt: string;
};

export type Invitation = {
  id: string;
  email: string;
  role: MemberRole;
  sentAt: string;
  expiresAt: string;
  status: 'pending' | 'expired';
  canResend?: boolean;
};

export type TeamModel = {
  readAt?: string;
  members: Member[];
  invitations: Invitation[];
  seatsUsed: number;
  seatsLimit: number | null;
};

/** `/app/settings/team`. 03 §14: Member "Active" carries no badge — absence
 *  is the signal — and only invited, expired or suspended states earn one.
 *  Seats counts active members PLUS pending invitations (08 §2): a tenant on
 *  five seats who sends fifty invitations should not be able to exceed the
 *  limit the moment they are all accepted. */
// eslint-disable-next-line @typescript-eslint/require-await
export async function getTeam(): Promise<TeamModel> {
  return {
    members: [
      {
        id: 'm_1',
        name: 'Amina Yusuf',
        email: 'amina@acmeindustrial.co.ke',
        role: 'owner',
        status: 'active',
        initials: 'AY',
        joinedAt: '14 Jul 2026',
      },
      {
        id: 'm_2',
        name: 'David Kimani',
        email: 'david@acmeindustrial.co.ke',
        role: 'admin',
        status: 'active',
        initials: 'DK',
        joinedAt: '02 Aug 2026',
      },
      {
        id: 'm_3',
        name: 'Grace Wanjiru',
        email: 'grace@acmeindustrial.co.ke',
        role: 'agent',
        status: 'active',
        initials: 'GW',
        joinedAt: '05 Aug 2026',
      },
      {
        id: 'm_4',
        name: 'Peter Otieno',
        email: 'peter@acmeindustrial.co.ke',
        role: 'agent',
        status: 'suspended',
        initials: 'PO',
        joinedAt: '20 Jul 2026',
      },
    ],
    invitations: [
      {
        id: 'i_1',
        email: 'sarah@acmeindustrial.co.ke',
        role: 'agent',
        sentAt: '3 days ago',
        expiresAt: '4 days from now',
        status: 'pending',
      },
      {
        id: 'i_2',
        email: 'james@acmeindustrial.co.ke',
        role: 'agent',
        sentAt: '11 days ago',
        expiresAt: '4 days ago',
        status: 'expired',
      },
    ],
    seatsUsed: 6,
    seatsLimit: 15,
  };
}

/* ── API credentials ──────────────────────────────────────────────────── */

export type CredentialStatus = 'active' | 'rotating' | 'revoked';

export type Credential = {
  id: string;
  name: string;
  /** `csk_live_` or `csk_test_`, first 8 characters shown, the rest masked.
   *  02 §9. The prefix is searchable; the secret never is, and never leaves
   *  the reveal screen. */
  prefix: string;
  scopes: string[];
  status: CredentialStatus;
  lastUsed: string | null;
  createdAt: string;
  createdBy: string;
  environment?: 'live' | 'test';
  expiresAt?: string | null;
  lastUsedAt?: string | null;
  rotatedFromId?: string | null;
};

export type CredentialsModel = {
  credentials: Credential[];
  keysUsed: number;
  keysLimit: number | null;
};

/** `/app/settings/credentials`. Owner only (02 §4). "Never used" and "unused
 *  90 days" are their own badge states in 03 §14 — a credential nobody has
 *  called in three months is usually the one worth revoking, and the list
 *  says so rather than making the reader compute it from a date. */
// eslint-disable-next-line @typescript-eslint/require-await
export async function getCredentials(): Promise<CredentialsModel> {
  return {
    credentials: [
      {
        id: 'c_1',
        name: 'Production — order sync',
        prefix: 'csk_live_8f21c4',
        scopes: ['messages:read', 'messages:write'],
        status: 'active',
        lastUsed: '4 minutes ago',
        createdAt: '14 Jul 2026',
        createdBy: 'Amina Yusuf',
      },
      {
        id: 'c_2',
        name: 'Staging — integration tests',
        prefix: 'csk_test_2b9e71',
        scopes: ['messages:read'],
        status: 'active',
        lastUsed: '94 days ago',
        createdAt: '20 Jul 2026',
        createdBy: 'David Kimani',
      },
      {
        id: 'c_3',
        name: 'Legacy CRM bridge',
        prefix: 'csk_live_a03d5e',
        scopes: ['messages:read', 'contacts:read'],
        status: 'revoked',
        lastUsed: '210 days ago',
        createdAt: '02 Mar 2026',
        createdBy: 'Amina Yusuf',
      },
    ],
    keysUsed: 2,
    keysLimit: 10,
  };
}

/* ── Tenant AI rules ──────────────────────────────────────────────────── */

export type RuleFieldKey = keyof RulesFields;

export type RuleField = {
  key: RuleFieldKey;
  label: string;
  /** Whether master's `locked` list includes this field. 08 §4: a locked
   *  field renders read-only with the platform value shown, never hidden. */
  lockedByMaster: boolean;
  masterValue: string;
  /** This tenant's own value. Ignored by the compiled document when locked;
   *  still shown, so an admin can see what they wrote before it was locked. */
  tenantValue: string;
  /** How the compiled document actually resolves this field for the
   *  assistant. 08 §4's precedence, stated per field rather than as a
   *  paragraph the reader has to re-derive. */
  provenance: 'master (locked)' | 'tenant' | 'master (default)' | 'master + tenant (combined)';
};

export type RulesVersion = {
  id: string;
  status: 'published' | 'archived';
  fields: RulesFields;
  version: number;
  publishedAt: string;
  publishedBy: string;
  changeNote: string;
};

export type TenantRulesModel = {
  revision: RulesRevision | null;
  canWrite: boolean;
  unavailable?: boolean;
  fields: RuleField[];
  currentVersion: number;
  versions: RulesVersion[];
  versionsRetained: number;
  versionsLimit: number | null;
};

/** Authenticated rules reads never fall back to invented instructions or versions. */
export async function getTenantAiRules(): Promise<TenantRulesModel> {
  const { getLiveTenantAiRules } = await import('./live');
  return (
    (await getLiveTenantAiRules()) ?? {
      fields: [],
      currentVersion: 0,
      versions: [],
      versionsRetained: 0,
      versionsLimit: 0,
      revision: null,
      canWrite: false,
      unavailable: true,
    }
  );
}
/* ── Subscription and entitlements ───────────────────────────────────── */

export type EntitlementKey =
  'seats' | 'channels' | 'api_keys' | 'kb_documents' | 'ai_rules_versions' | 'audit_retention_days';

export type Entitlement = {
  key: EntitlementKey;
  label: string;
  kind: 'limit' | 'feature';
  current: number;
  /** `null` is unlimited — 08 §2, rendered as the infinity glyph, never a
   *  full bar. A full bar for an unlimited plan is a lie. */
  limit: number | null;
  unit?: string;
};

export type EntitlementOverride = {
  key: EntitlementKey;
  reason: string;
  expiresAt: string | null;
  grantedBy: string;
};

export type SubscriptionModel = {
  planName: string;
  status: 'active' | 'trialing' | 'past_due' | 'cancelled';
  periodEnd: string;
  entitlements: Entitlement[];
  overrides: EntitlementOverride[];
};

/** `/app/settings/subscription`. Owner. 08 §8, verbatim: every entitlement
 *  as a row with a limit bar; any active override shown with its reason,
 *  because a customer granted extra seats should know it and know it might
 *  expire; a read-only statement of how payment works today; no upgrade
 *  button — "a button that opens an email client is worse than a sentence
 *  saying to get in touch." */
// eslint-disable-next-line @typescript-eslint/require-await
export async function getSubscription(): Promise<SubscriptionModel> {
  return {
    planName: 'Growth',
    status: 'active',
    periodEnd: '01 Sep 2026',
    entitlements: [
      { key: 'seats', label: 'Staff seats', kind: 'limit', current: 12, limit: 15 },
      { key: 'channels', label: 'Channel connections', kind: 'limit', current: 3, limit: 5 },
      { key: 'api_keys', label: 'API credentials', kind: 'limit', current: 2, limit: 10 },
      {
        key: 'kb_documents',
        label: 'Knowledge base documents',
        kind: 'limit',
        current: 0,
        limit: 1000,
      },
      {
        key: 'ai_rules_versions',
        label: 'Assistant rule versions retained',
        kind: 'limit',
        current: 3,
        limit: 50,
      },
      {
        key: 'audit_retention_days',
        label: 'Activity log retention',
        kind: 'limit',
        current: 90,
        limit: null,
        unit: ' days',
      },
    ],
    overrides: [
      {
        key: 'seats',
        reason: 'Temporary headcount for Q3 product launch',
        expiresAt: '30 Sep 2026',
        grantedBy: 'Andishi support',
      },
    ],
  };
}

/* ── Audit ────────────────────────────────────────────────────────────── */

export type TenantAuditKind = 'member' | 'credential' | 'rules' | 'settings' | 'support';

export type TenantAuditEntry = {
  id: string;
  time: string;
  actor: string;
  kind: TenantAuditKind;
  action: string;
  target: string;
  actionLabel?: string;
  occurredAt?: string;
  requestId?: string;
  changes?: Array<{ label: string; before: string; after: string }>;
  reason?: string;
};

export type TenantAuditModel = {
  entries: TenantAuditEntry[];
  retentionDays: number | null;
  source?: 'live' | 'designed';
  timezone?: string;
  cutoff?: string | null;
  nextCursor?: string | null;
};

/** `/app/settings/audit`. Owner and admin. The tenant's own log — a strict
 *  subset of what `/platform/audit` can see, filtered to this tenant_id by
 *  the same RLS policy every other read in this file is a stand-in for. A
 *  support-mode action against this tenant appears here too (03 §14: copper,
 *  the one hue a support action ever renders in), because 09 §3's owner
 *  guarantee is that Brian is bound by the same policies as everyone else —
 *  which includes showing up in the log the same way everyone else does. */
// eslint-disable-next-line @typescript-eslint/require-await
export async function getTenantAudit(): Promise<TenantAuditModel> {
  return {
    source: 'designed',
    timezone: 'Africa/Nairobi',
    entries: [
      {
        id: 'a_1',
        time: '2 hours ago',
        actor: 'Amina Yusuf',
        kind: 'member',
        action: 'invited',
        target: 'sarah@acmeindustrial.co.ke',
      },
      {
        id: 'a_2',
        time: 'Yesterday, 16:40',
        actor: 'David Kimani',
        kind: 'member',
        action: 'accepted invitation',
        target: 'David Kimani',
      },
      {
        id: 'a_3',
        time: '2 days ago',
        actor: 'Amina Yusuf',
        kind: 'settings',
        action: 'updated contact details',
        target: 'Company settings',
      },
      {
        id: 'a_4',
        time: '3 days ago',
        actor: 'Andishi support',
        kind: 'support',
        action: 'opened a support session',
        target: 'Acme Industrial',
      },
      {
        id: 'a_5',
        time: '5 days ago',
        actor: 'David Kimani',
        kind: 'rules',
        action: 'published v13',
        target: 'Assistant rules',
      },
      {
        id: 'a_6',
        time: '9 days ago',
        actor: 'Amina Yusuf',
        kind: 'credential',
        action: 'created',
        target: 'Production — order sync',
      },
    ],
    retentionDays: 90,
  };
}

/* ── Account ──────────────────────────────────────────────────────────── */

export type AccountProfile = {
  name: string;
  email: string;
  role: MemberRole;
  initials: string;
  memberSince: string;
  emailVerified: boolean;
};

export type AccountSession = {
  id: string;
  device: string;
  location: string;
  lastActive: string;
  current: boolean;
};

export type AccountModel = { profile: AccountProfile };
export type AccountSessionsModel = { sessions: AccountSession[] };

/** `/app/account`. Every role. Name, email, password, plus the role and
 *  tenant-tenure facts that make "who am I in this workspace" answerable at
 *  a glance. */
// eslint-disable-next-line @typescript-eslint/require-await
export async function getAccount(): Promise<AccountModel> {
  return {
    profile: {
      name: 'Amina Yusuf',
      email: 'amina@acmeindustrial.co.ke',
      role: 'owner',
      initials: 'AY',
      memberSince: '14 Jul 2026',
      emailVerified: true,
    },
  };
}

/** `/app/account/sessions`. Every role. Revoke individually or all — the
 *  same shape as the platform console's own session model, because "what is
 *  signed in as me, right now" is the same question in both applications. */
// eslint-disable-next-line @typescript-eslint/require-await
export async function getAccountSessions(): Promise<AccountSessionsModel> {
  return {
    sessions: [
      {
        id: 's_1',
        device: 'Chrome on macOS',
        location: 'Nairobi, Kenya',
        lastActive: 'Active now',
        current: true,
      },
      {
        id: 's_2',
        device: 'Safari on iPhone',
        location: 'Nairobi, Kenya',
        lastActive: '3 hours ago',
        current: false,
      },
      {
        id: 's_3',
        device: 'Chrome on Windows',
        location: 'Mombasa, Kenya',
        lastActive: '6 days ago',
        current: false,
      },
    ],
  };
}

/* ── Billing ──────────────────────────────────────────────────────────── */

export type BillingModel = {
  planName: string;
  price: string;
  status: 'active' | 'trialing' | 'past_due';
  periodEnd: string;
  contactEmail: string;
};

/** `/app/billing`. Owner. 02 §5: the designed placeholder for the surface
 *  behind which no payment gateway exists yet — current plan, read-only, how
 *  payment is actually handled right now, and the contact route. This is
 *  honest rather than diminished: the subscription data model is real, the
 *  gateway is not, and the page says exactly that. */
// eslint-disable-next-line @typescript-eslint/require-await
export async function getBilling(): Promise<BillingModel> {
  return {
    planName: 'Growth',
    price: 'KES 92,000 / month',
    status: 'active',
    periodEnd: '01 Sep 2026',
    contactEmail: 'billing@andishi.co.ke',
  };
}

/* ── Shell ────────────────────────────────────────────────────────────── */

export type ShellWorkspace = {
  id: string;
  name: string;
  initials: string;
  role: string;
  current: boolean;
};

export type ShellNotice = {
  id: string;
  title: string;
  body: string;
  time: string;
  tone: 'info' | 'warn' | 'danger';
  href: string;
};

export type ShellPlanMeter = {
  planName: string;
  pct: number;
  detail: string;
  href: string;
};

export type ShellModel = {
  workspaces: ShellWorkspace[];
  notifications: ShellNotice[];
  unread: number;
  planMeter: ShellPlanMeter;
};

/**
 * The chrome's own read model — everything the tenant header and sidebar draw
 * that is not navigation.
 *
 * ⚠ THIS IS SEPARATE FROM `getOverview` ON PURPOSE, BECAUSE IT IS READ ON
 * EVERY TENANT PAGE AND `getOverview` IS READ ON ONE. Folding the two would
 * make Credentials and Team pay for the overview's stat series and queue.
 * The real version is one query against memberships, notifications and the
 * current subscription period — the same round trip `loadMe` already makes,
 * which is where this collapses into once M2's identity module grows the
 * fields.
 *
 * ⚠ `planMeter.pct` IS THE EVENTS METER, NOT AN AVERAGE OF THE THREE. 08 §2
 * refuses over the entitlement rather than billing overage, so the number
 * that matters in the chrome is the one that will actually stop work — and
 * averaging it with two comfortable meters would hide it at exactly the
 * moment it starts to matter. It reads 94 against the overview's `meters`
 * for that reason: same figure, same fixture.
 */
// eslint-disable-next-line @typescript-eslint/require-await -- seam, as above
export async function getShell(): Promise<ShellModel> {
  return {
    workspaces: [
      {
        id: 'w_acme',
        name: 'Acme Industrial',
        initials: 'AI',
        role: 'Owner',
        current: true,
      },
      {
        id: 'w_kilimanjaro',
        name: 'Kilimanjaro Logistics',
        initials: 'KL',
        role: 'Admin',
        current: false,
      },
    ],
    notifications: [
      {
        id: 'n_1',
        title: 'Events at 94% of your plan',
        body: '470,300 of 500,000 used with 19 days left in this period.',
        time: '2h',
        tone: 'warn',
        href: '/app/settings/subscription',
      },
      {
        id: 'n_2',
        title: 'SMS channel degraded',
        body: '14 sends were rejected by the provider in the last hour.',
        time: '4h',
        tone: 'danger',
        href: '/app/settings/credentials',
      },
      {
        id: 'n_3',
        title: 'David Kimani accepted your invitation',
        body: 'He joined as an admin and can now see the team.',
        time: 'Yesterday',
        tone: 'info',
        href: '/app/settings/team',
      },
    ],
    unread: 2,
    planMeter: {
      planName: 'Growth',
      pct: 94,
      detail: '470,300 of 500,000 events. 19 days left in this period.',
      href: '/app/settings/subscription',
    },
  };
}
