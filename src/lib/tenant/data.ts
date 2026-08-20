import 'server-only';

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
};

export type ActivityLine = { time: string; actor: string; action: string };

export type OverviewModel = {
  operatorFirstName: string;
  tenantName: string;
  planName: string;
  planStatus: 'active' | 'trialing' | 'past_due';
  seats: { used: number; limit: number | null };
  channels: { used: number; limit: number | null };
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
    checklist: [
      { key: 'email', label: 'Confirm your email', doneLabel: 'Email confirmed', done: true, href: '/app/account' },
      { key: 'company', label: 'Add your company details', doneLabel: 'Company details added', done: true, href: '/app/settings/company' },
      { key: 'team', label: 'Invite your team', doneLabel: 'Team invited', done: true, href: '/app/settings/team' },
      { key: 'credential', label: 'Create an API credential', doneLabel: 'Credential created', done: false, href: '/app/settings/credentials/new' },
      { key: 'rules', label: 'Set your assistant rules', doneLabel: 'Rules published', done: false, href: '/app/settings/ai-rules' },
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
};

export type TeamModel = {
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
      { id: 'm_1', name: 'Amina Yusuf', email: 'amina@acmeindustrial.co.ke', role: 'owner', status: 'active', initials: 'AY', joinedAt: '14 Jul 2026' },
      { id: 'm_2', name: 'David Kimani', email: 'david@acmeindustrial.co.ke', role: 'admin', status: 'active', initials: 'DK', joinedAt: '02 Aug 2026' },
      { id: 'm_3', name: 'Grace Wanjiru', email: 'grace@acmeindustrial.co.ke', role: 'agent', status: 'active', initials: 'GW', joinedAt: '05 Aug 2026' },
      { id: 'm_4', name: 'Peter Otieno', email: 'peter@acmeindustrial.co.ke', role: 'agent', status: 'suspended', initials: 'PO', joinedAt: '20 Jul 2026' },
    ],
    invitations: [
      { id: 'i_1', email: 'sarah@acmeindustrial.co.ke', role: 'agent', sentAt: '3 days ago', expiresAt: '4 days from now', status: 'pending' },
      { id: 'i_2', email: 'james@acmeindustrial.co.ke', role: 'agent', sentAt: '11 days ago', expiresAt: '4 days ago', status: 'expired' },
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
      { id: 'c_1', name: 'Production — order sync', prefix: 'csk_live_8f21c4', scopes: ['messages:read', 'messages:write'], status: 'active', lastUsed: '4 minutes ago', createdAt: '14 Jul 2026', createdBy: 'Amina Yusuf' },
      { id: 'c_2', name: 'Staging — integration tests', prefix: 'csk_test_2b9e71', scopes: ['messages:read'], status: 'active', lastUsed: '94 days ago', createdAt: '20 Jul 2026', createdBy: 'David Kimani' },
      { id: 'c_3', name: 'Legacy CRM bridge', prefix: 'csk_live_a03d5e', scopes: ['messages:read', 'contacts:read'], status: 'revoked', lastUsed: '210 days ago', createdAt: '02 Mar 2026', createdBy: 'Amina Yusuf' },
    ],
    keysUsed: 2,
    keysLimit: 10,
  };
}

/* ── Tenant AI rules ──────────────────────────────────────────────────── */

export type RuleFieldKey = 'tone' | 'responseGuidelines' | 'prohibitedTopics' | 'escalationRules';

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

export type RulesVersion = { version: number; publishedAt: string; publishedBy: string; changeNote: string };

export type TenantRulesModel = {
  fields: RuleField[];
  currentVersion: number;
  versions: RulesVersion[];
  versionsRetained: number;
  versionsLimit: number | null;
};

/** `/app/settings/ai-rules`. Owner and admin. Field-by-field, never one
 *  textarea (08 §4) — the compiled document has structure, and a blob would
 *  make provenance meaningless. `prohibitedTopics` is always the union case:
 *  a tenant can add a prohibition, never remove a platform one. */
// eslint-disable-next-line @typescript-eslint/require-await
export async function getTenantAiRules(): Promise<TenantRulesModel> {
  return {
    fields: [
      {
        key: 'tone',
        label: 'Tone',
        lockedByMaster: false,
        masterValue: 'Professional, concise, never presumes intent.',
        tenantValue: 'Warm and direct. Use the customer’s name once they have given it.',
        provenance: 'tenant',
      },
      {
        key: 'responseGuidelines',
        label: 'Response guidelines',
        lockedByMaster: false,
        masterValue: 'Answer the question asked before offering anything adjacent.',
        tenantValue: 'Always confirm order numbers back to the customer before acting on them.',
        provenance: 'master + tenant (combined)',
      },
      {
        key: 'prohibitedTopics',
        label: 'Prohibited topics',
        lockedByMaster: true,
        masterValue: 'Medical advice, legal advice, financial advice, competitor pricing.',
        tenantValue: 'Internal supplier names.',
        provenance: 'master (locked)',
      },
      {
        key: 'escalationRules',
        label: 'Escalation rules',
        lockedByMaster: false,
        masterValue: 'Escalate on any mention of legal action or repeated unresolved complaints.',
        tenantValue: '',
        provenance: 'master (default)',
      },
    ],
    currentVersion: 14,
    versions: [
      { version: 14, publishedAt: '11 Aug 2026, 09:12', publishedBy: 'Amina Yusuf', changeNote: 'Tightened order-number confirmation wording after a mismatch.' },
      { version: 13, publishedAt: '02 Aug 2026, 14:30', publishedBy: 'David Kimani', changeNote: 'Added warmer tone guidance for repeat customers.' },
      { version: 12, publishedAt: '20 Jul 2026, 11:05', publishedBy: 'Amina Yusuf', changeNote: 'Initial rules published at workspace setup.' },
    ],
    versionsRetained: 3,
    versionsLimit: 50,
  };
}

/* ── Subscription and entitlements ───────────────────────────────────── */

export type EntitlementKey = 'seats' | 'channels' | 'api_keys' | 'kb_documents' | 'ai_rules_versions' | 'audit_retention_days';

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

export type EntitlementOverride = { key: EntitlementKey; reason: string; expiresAt: string | null; grantedBy: string };

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
      { key: 'kb_documents', label: 'Knowledge base documents', kind: 'limit', current: 0, limit: 1000 },
      { key: 'ai_rules_versions', label: 'Assistant rule versions retained', kind: 'limit', current: 3, limit: 50 },
      { key: 'audit_retention_days', label: 'Activity log retention', kind: 'limit', current: 90, limit: null, unit: ' days' },
    ],
    overrides: [
      { key: 'seats', reason: 'Temporary headcount for Q3 product launch', expiresAt: '30 Sep 2026', grantedBy: 'Andishi support' },
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
};

export type TenantAuditModel = { entries: TenantAuditEntry[]; retentionDays: number | null };

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
    entries: [
      { id: 'a_1', time: '2 hours ago', actor: 'Amina Yusuf', kind: 'member', action: 'invited', target: 'sarah@acmeindustrial.co.ke' },
      { id: 'a_2', time: 'Yesterday, 16:40', actor: 'David Kimani', kind: 'member', action: 'accepted invitation', target: 'David Kimani' },
      { id: 'a_3', time: '2 days ago', actor: 'Amina Yusuf', kind: 'settings', action: 'updated contact details', target: 'Company settings' },
      { id: 'a_4', time: '3 days ago', actor: 'Andishi support', kind: 'support', action: 'opened a read-only support session', target: 'Acme Industrial' },
      { id: 'a_5', time: '5 days ago', actor: 'David Kimani', kind: 'rules', action: 'published v13', target: 'Assistant rules' },
      { id: 'a_6', time: '9 days ago', actor: 'Amina Yusuf', kind: 'credential', action: 'created', target: 'Production — order sync' },
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
      { id: 's_1', device: 'Chrome on macOS', location: 'Nairobi, Kenya', lastActive: 'Active now', current: true },
      { id: 's_2', device: 'Safari on iPhone', location: 'Nairobi, Kenya', lastActive: '3 hours ago', current: false },
      { id: 's_3', device: 'Chrome on Windows', location: 'Mombasa, Kenya', lastActive: '6 days ago', current: false },
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
