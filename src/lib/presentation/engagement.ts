/**
 * The engagement, as data.
 *
 * Every figure, date, milestone, gate and tranche below is taken verbatim from
 * Andishi_Project_Brief_Customer_Support_SaaS_Phase1_Rev3.1.pdf, 29 July 2026,
 * and cross-checked against project-docs/11 (build plan) and design sheet 14
 * (handover). Nothing here is inferred. Where the brief and a project document
 * disagreed, the brief wins and the difference is recorded in 15-spec-delta.md.
 *
 * This file exists so the client-facing presentation surface cannot drift from
 * the signed document: change a milestone here and it changes everywhere it is
 * rendered, or it changes nowhere.
 */

export const ENGAGEMENT = {
  client: 'Brian',
  studio: 'Andishi',
  studioLocation: 'Northern Bypass, Nairobi',
  projectLead: 'Dennis Munge',
  commercialContact: 'Ian, Chief Executive Officer',
  briefVersion: 'Rev 3.1',
  briefDate: '29 July 2026',
  phase: 'Phase 1, platform foundation',
  team: '2 senior full stack developers',
  duration: '9 working weeks, plus a 30-day support window',
  designSystem: 'Conduit',
} as const;

/** Section 02 of the brief, mapped one to one against the ten requirements. */
export const REQUIREMENTS = [
  {
    n: 1,
    requirement: 'Multi-tenant architecture, isolated per tenant',
    delivery:
      'Shared Postgres with isolation enforced by Row Level Security on every tenant-scoped table, plus an automated isolation suite that runs in CI and blocks merge.',
    milestone: 'M1',
  },
  {
    n: 2,
    requirement: 'Auth: login, password reset, sessions, scalable to roles later',
    delivery:
      'Email and password auth, reset flow, session management and revocation, invitations, and a role model of owner, admin and agent built for multi-user teams from day one.',
    milestone: 'M2',
  },
  {
    n: 3,
    requirement: 'Subscription structure, no billing automation',
    delivery:
      'Plans, tiers, entitlements and limits stored as data, subscription lifecycle states, enforcement at the API boundary, payment hooks stubbed for later.',
    milestone: 'M3',
  },
  {
    n: 4,
    requirement: 'Master dashboard, separate owner login',
    delivery:
      'A separate platform console: create, suspend and inspect tenants, assign and override plans, view platform metrics, and an organization switcher that steps into any tenant through a scoped support session with a full audit trail.',
    milestone: 'M4',
  },
  {
    n: 5,
    requirement: 'Tenant settings: company profile, secure API credentials',
    delivery:
      'Company profile and branding, team management, encrypted credential store with masked display, rotation and last-used tracking, plus designed placeholder surfaces for Messaging Inbox and Billing.',
    milestone: 'M5',
  },
  {
    n: 6,
    requirement: 'System: logging, errors, audit trail, secrets',
    delivery:
      'Structured logs with request correlation IDs, one typed error contract across the API, an append-only audit log, and secrets in Supabase Vault rather than in application code.',
    milestone: 'Throughout',
  },
  {
    n: 8,
    requirement: 'Master and tenant AI rules, readable via API',
    delivery:
      'A platform-level singleton and a per-tenant setting, both versioned and audited, both readable through the service door with scoped credentials. ETag support so Phase 2 can poll on every generation at negligible cost.',
    milestone: 'M3, M4a',
  },
  {
    n: 9,
    requirement: 'Knowledge base and customer record seams',
    delivery:
      'Two tenant-scoped tables with full isolation, the first pgvector-enabled. Structure only; Phase 2 owns all embedding, retrieval and population logic.',
    milestone: 'M4a',
  },
  {
    n: 10,
    requirement: 'Platform health monitoring',
    delivery:
      'An owner-only page showing service status, database and cache metrics, error rates, and tenants approaching a limit or falling past due. Backed by error tracking, log aggregation, uptime checks and a public status page.',
    milestone: 'M6',
  },
  {
    n: 7,
    requirement: 'Documentation for every part',
    delivery:
      'Architecture document, ERD, RLS policy reference, OpenAPI specification, architecture decision records, runbook, and a channel adapter guide for whoever builds Phase 2.',
    milestone: 'Throughout, gated at M6',
  },
] as const;

/**
 * Section 04 of the brief. A gate is a demonstrated behaviour, not a report.
 *
 * ⚠ `status` and `progress` ARE THE TRACKER. They are the only fields in this
 * file that are not from the signed brief, and they are the two a person edits.
 * Everything else is contract and does not move.
 *
 *   complete   the gate has been demonstrated and accepted
 *   active     work is in flight
 *   blocked    something in OPEN_DECISIONS is holding it
 *   upcoming   not started
 *
 * `progress` is 0 to 100 and is a judgement rather than a computed figure.
 * Saying so is better than deriving a false precision from a task count.
 */
export type MilestoneStatus = 'complete' | 'active' | 'blocked' | 'upcoming';

export const MILESTONES = [
  {
    id: 'M0',
    name: 'Design lock',
    week: '1',
    lands:
      'ERD, Row Level Security policy map, API contract, role matrix, architecture decision records.',
    gate: 'Approve before code',
    tranche: null,
    status: 'active' as MilestoneStatus,
    progress: 80,
    note: 'Documentation set, design set and the architectural foundation are drawn and built. All five of the decisions that were blocking are answered as of 24 Aug 2026, most ahead of schedule. The channel adapter contract and written approval of the brief remain outstanding for this gate to close.',
  },
  {
    id: 'M1',
    name: 'Tenancy core',
    week: '2 – 3',
    lands:
      'Schema and migrations, Row Level Security on all tables, provisioning, isolation test suite, CI, staging.',
    gate: 'Demo: tenant isolation verified',
    tranche: 2,
    status: 'active' as MilestoneStatus,
    progress: 55,
    note: 'Schema, policies, the policy check script, the generated isolation suite and CI are in the repository. Provisioning and the staging environment are not.',
  },
  {
    id: 'M2',
    name: 'Auth and access',
    week: '4',
    lands: 'Login, password reset, sessions, invitations, role enforcement.',
    gate: 'Demo: full account lifecycle',
    tranche: null,
    status: 'upcoming' as MilestoneStatus,
    progress: 10,
    note: 'The session table, the role model and the branded request context exist. No flows are built.',
  },
  {
    id: 'M3',
    name: 'Subscriptions',
    week: '5',
    lands:
      'Plans, tiers, entitlements, subscription states, limit enforcement. Caching layer and scoped credentials land alongside.',
    gate: 'Demo: limit enforcement',
    tranche: null,
    status: 'upcoming' as MilestoneStatus,
    progress: 35,
    note: 'The shared entitlement guard, the cache layer and the plan schema are built. The surfaces above them are not, and the tiers need confirming in week four.',
  },
  {
    id: 'M4',
    name: 'Platform console',
    week: '6',
    lands: 'Owner login, tenant management, plan assignment, platform metrics.',
    gate: 'Demo: console operations',
    tranche: 3,
    status: 'upcoming' as MilestoneStatus,
    progress: 15,
    note: 'The console shell and the boundary frame are built. The support role matrix needs signing before the session work starts.',
  },
  {
    id: 'M5',
    name: 'Tenant settings',
    week: '7',
    lands: 'Company profile, team management, encrypted credential store.',
    gate: 'Demo: secrets auditing',
    tranche: null,
    status: 'upcoming' as MilestoneStatus,
    progress: 10,
    note: 'The credential schema and the projection type that makes returning a hash a compile error are in place.',
  },
  {
    id: 'M4a',
    name: 'AI rules and seams',
    week: '7',
    lands:
      'Master and tenant AI rules, service-door read access with scopes, knowledge base and customer record tables with isolation.',
    gate: 'Demo: a rules edit live through the API in 5 seconds',
    tranche: null,
    status: 'blocked' as MilestoneStatus,
    progress: 20,
    note: 'Both seam tables and the versioned rules schema are built and isolated. The precedence model and the embedding model, both previously outstanding, were confirmed 24 Aug 2026. This milestone now carries the FastAPI service door build (01 D-14), whose staffing and effort still need an answer before work here can proceed as scoped.',
  },
  {
    id: 'M6',
    name: 'Handover',
    week: '8 – 9',
    lands:
      'Load and security pass, health page, uptime and status page, logs review, documentation set, walkthrough.',
    gate: 'Sign-off',
    tranche: 4,
    status: 'upcoming' as MilestoneStatus,
    progress: 25,
    note: 'The documentation set is written alongside the code rather than at the end, which is most of this milestone.',
  },
] as const;

/**
 * Compliance and data protection, tracked rather than asserted.
 *
 * 01 D-09 · 06 §9. Under the Kenyan Data Protection Act 2019 Brian is a
 * PROCESSOR for his tenants and his tenants are CONTROLLERS for their own
 * customers. That relationship needs a data processing agreement in writing
 * before his first paying customer, and it is a legal document rather than a
 * technical one, so it is not our deliverable. Raising it is our
 * responsibility, and this band is how it stays raised rather than mentioned
 * once in a document nobody reopens.
 */
export type ComplianceState = 'met' | 'partial' | 'open' | 'flagged';

export const COMPLIANCE = [
  {
    area: 'Tenant isolation',
    obligation:
      'No request, through any door, in any role, including the platform owner, can read or write a row belonging to another tenant.',
    state: 'partial' as ComplianceState,
    evidence:
      'Policies on every tenant-scoped table with a with-check clause. The policy check script fails the build on a table without one. Ten isolation cases per table run in CI and block merge.',
    outstanding: 'Manual policy review by a person at M1 and again at M6.',
    reference: '06 · Tenancy and isolation',
  },
  {
    area: 'Audit trail',
    obligation:
      'Every write records actor, tenant, action, entity, before and after state, IP address and request ID.',
    state: 'partial' as ComplianceState,
    evidence:
      'Append-only by policy rather than by convention: both audit tables have a select and an insert policy and no update or delete policy, so history cannot be amended by anyone including us. The writer runs in the same transaction as its operation.',
    outstanding: 'Per-module coverage tests once the modules land.',
    reference: '05 §9',
  },
  {
    area: 'Personal data in logs',
    obligation:
      'Customer record fields never reach a log line. Redaction happens before storage, not at query time.',
    state: 'met' as ComplianceState,
    evidence:
      'Redaction covers secrets and every customer record field, keeps the shape and drops the content, and catches a credential inside a free-text message as well as under a named field.',
    outstanding: null,
    reference: '05 I-16 · sheet 13',
  },
  {
    area: 'Credential secrecy',
    obligation:
      'No API credential is readable in plaintext through any route, including as the user who created it.',
    state: 'partial' as ComplianceState,
    evidence:
      'Hashed with argon2id and never recoverable. The projection type omits the hash, so returning it is a compile error rather than a review catch.',
    outstanding:
      'The recursive response scan across every route, which is condition 4 of the definition of done.',
    reference: '01 D-11 · 07 §12',
  },
  {
    area: 'Support access transparency',
    obligation:
      'A tenant can see every time the platform looked into their workspace, and who, and why.',
    state: 'partial' as ComplianceState,
    evidence:
      'Support mode is a scoped session bound by the same policies, not a bypass. Every action writes to both logs. The tenant can see and revoke the session.',
    outstanding:
      'The support role matrix needs signing. It generates the isolation suite cases, so it is a table with teeth rather than a description.',
    reference: '09 §4 · 09 §7',
  },
  {
    area: 'Data processing agreement',
    obligation:
      'A DPA between the platform and each tenant, in place before that tenant’s customer data enters the system.',
    state: 'flagged' as ComplianceState,
    evidence: 'A route exists at /legal/dpa so there is somewhere for it to live.',
    outstanding:
      'The document itself. This is legal rather than technical and it is not an Andishi deliverable. Raising it is.',
    reference: '01 D-09 · 06 §9',
  },
  {
    area: 'Retention and erasure',
    obligation:
      'Customer records can be retained for a stated period and erased on request.',
    state: 'open' as ComplianceState,
    evidence:
      'A soft-delete column is present on the customer records table from the first migration.',
    outstanding:
      'Automation is explicitly out of Phase 1 scope and is FLAGGED RATHER THAN OMITTED. It becomes necessary the first time a tenant operates somewhere with erasure rights, and it is cheaper on a finished foundation than alongside one.',
    reference: '01 §2 · 01 D-09',
  },
  {
    area: 'Accessibility',
    obligation: 'WCAG 2.1 AA across every surface, checked at every milestone gate.',
    state: 'partial' as ComplianceState,
    evidence:
      'Focus rings never removed, 44px targets, every status carrying a glyph and a word as well as a hue, both themes measured, reduced motion honoured throughout.',
    outstanding:
      'An axe pass per route in CI, and a manual keyboard pass per milestone. Sheet 13 proposes raising the target to 2.2 AA, which is not currently a contractual item.',
    reference: '03 §17 · sheet 13',
  },
] as const;

/**
 * The update feed. Newest first. This is what makes the surface a tracker
 * rather than a snapshot: a client checking in wants to know what moved since
 * they last looked, not to re-read the scope.
 *
 * Keep entries factual and short. If an entry needs a paragraph, it is a
 * document rather than an update.
 */
export const UPDATES = [
  {
    date: '2026-08-24',
    title: 'M0 closed: five decisions confirmed, one new item raised',
    body: 'AI rules precedence (layered, master wins on conflict), the support role matrix (read and write, not read-only), the embedding model (OpenAI text-embedding-3-small), what suspension means (read-only, as built), and plan tiers (Pro, Business, Custom) are all confirmed, three weeks ahead of their week-four deadline. The support answer opened one narrower question of its own: whether it extends to customer records, proposed as no. Document 15 and the decision log in document 01 carry the full record.',
    milestone: 'M0',
    kind: 'decision' as const,
  },
  {
    date: '2026-08-24',
    title: 'FastAPI and the service door: a boundary confirmed, a change note opened',
    body: 'The client raised a conflict between his original specification, FastAPI as the backend with all data access routed through it, and the signed brief, which places FastAPI as a consumer of this platform, not its implementer. Resolution: FastAPI becomes a real Andishi-built service in Phase 1, implementing the service door exactly where the architecture already placed it. The dashboard stays on Next.js. Moving the dashboard behind FastAPI as well remains available as a separately scoped and priced change note. Full detail in document 04, ADR-012.',
    milestone: 'M3, M4a',
    kind: 'decision' as const,
  },
  {
    date: '2026-08-05',
    title: 'Foundation-phase visual pass complete',
    body: 'Final UI/UX review before the delivery milestones begin. Chart forms revised to fit what each is actually showing: the readiness breakdown is a donut with the total in its centre, milestone progress is a line across the sequence rather than a bar. One page width now shared by the marketing page, the tracker and the document viewer, replacing three pages that had each picked their own. The marketing hero rebuilt with a title-block fact row and a technical schematic in place of a plain two-button block. The access screens carry a properly weighted mark, a trust list and a title-block footer rather than an empty column.',
    milestone: 'M0',
    kind: 'delivery' as const,
  },
  {
    date: '2026-08-05',
    title: 'Architectural foundation established',
    body: 'Schema, policies, the policy check script and the generated isolation suite are in the repository and green. The request pipeline, the shared entitlement guard, the audit writer, the redacting logger and the cache layer are built. The token system, both application shells and the boundary frame are built.',
    milestone: 'M0, M1',
    kind: 'delivery' as const,
  },
  {
    date: '2026-08-05',
    title: 'Design and documentation sets reconciled',
    body: 'The fourteen design sheets and the thirteen project documents disagreed in seven places, including which of two support-mode treatments to build. Each conflict is resolved and recorded in document 15 rather than left for someone to discover mid-build.',
    milestone: 'M0',
    kind: 'decision' as const,
  },
  {
    date: '2026-08-05',
    title: 'Five decisions outstanding, four of them blocking',
    body: 'AI rules precedence, the support role matrix, the embedding model, what suspension means, and the plan tiers. Three are due in week one because they change tables, and a schema locked without them is a schema migrated in week seven.',
    milestone: 'M0',
    kind: 'blocker' as const,
  },
] as const;

/** Section 05. Each one verifiable rather than a matter of opinion. */
export const DEFINITION_OF_DONE = [
  'Every tenant-scoped table has a Row Level Security policy, and the isolation suite covers each one with a cross-tenant read and write attempt that fails as expected.',
  'A new tenant is provisioned end to end, from invitation to first login, in under two minutes with no manual database work.',
  'Every write action produces an audit entry recording actor, tenant, action, entity, before and after state, IP address and request ID.',
  'No API credential is readable in plaintext through any application route, including as the user who created it.',
  'p95 response time under 400ms on the tenant dashboard and settings routes at 50 concurrent sessions.',
  'A developer with no prior exposure to the codebase clones the repository and runs it locally, following the README alone, in under 30 minutes.',
  'Every endpoint in the OpenAPI specification matches the implementation, verified by contract tests in CI.',
  'An AI rules change made in the dashboard is visible through the API within 5 seconds, measured rather than asserted.',
  'With the cache switched off entirely, every correctness property still holds; only speed changes.',
  'A credential lacking the required scope is rejected before reaching the handler, tested for each scope.',
  'Both storage seam tables pass the same tenant isolation suite as every other table.',
] as const;

/** Section 07. Three of the four critical-path inputs are the client's, and all
 *  three are due in week one. Status column added 24 Aug 2026: all but the two
 *  access-grant items are answered, most of them ahead of schedule. */
export const CLIENT_INPUTS = [
  {
    item: 'Written approval of this brief',
    when: 'Before kick-off',
    blocking: 'Everything',
    status: 'Pending',
  },
  { item: 'Supabase organisation access', when: 'Week 1', blocking: 'M1', status: 'Pending' },
  { item: 'GitHub organisation access', when: 'Week 1', blocking: 'M1', status: 'Pending' },
  {
    item: 'Embedding model Phase 2 will use',
    when: 'Week 1',
    blocking: 'M4a seam',
    status: 'Answered 24 Aug 2026',
  },
  {
    item: 'Precedence between master and tenant AI rules',
    when: 'Week 1',
    blocking: 'M4a, and the schema',
    status: 'Answered 24 Aug 2026',
  },
  {
    item: 'Confirmed plan tiers with limits',
    when: 'Week 4',
    blocking: 'M3',
    status: 'Answered 24 Aug 2026, ahead of schedule',
  },
] as const;

/** Section 09. Agreed directly between Ian and Brian.
 *  NOT rendered on the client presentation surface: see the note in
 *  src/app/(presentation)/page.tsx about what belongs on a shared link. */
export const COMMERCIAL = {
  totalFee: 'KES 65,000',
  tranches: [
    { n: 1, trigger: 'On signature, before kick-off', share: '30%', amount: 'KES 19,500' },
    {
      n: 2,
      trigger: 'M1 gate: isolation suite green, tenant A provably unable to read tenant B',
      share: '25%',
      amount: 'KES 16,250',
    },
    {
      n: 3,
      trigger: 'M4 gate: platform console, organization switcher, support sessions',
      share: '25%',
      amount: 'KES 16,250',
    },
    { n: 4, trigger: 'M6 sign-off: full definition of done met', share: '20%', amount: 'KES 13,000' },
  ],
} as const;

/** Section 02, explicit exclusions. Deliberate rather than oversights. */
export const OUT_OF_SCOPE = [
  'Channel integrations (WhatsApp Business, Instagram, Messenger, website widget) and their webhook receivers',
  'The agent inbox interface, conversation threading, assignment and routing rules',
  'Payment gateway integration and invoicing. We build the plan and subscription data model; we do not connect Stripe, Paystack or M-Pesa',
  'Analytics dashboards, canned replies, chatbots, AI assist',
  'Native mobile applications',
  'Embedding generation, vector retrieval, and RAG logic',
  'Population or reading of customer records by the AI',
  'Data retention and erasure automation for customer records. Flagged as a known gap, not silently omitted',
] as const;
