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

/** Section 04 of the brief. A gate is a demonstrated behaviour, not a report. */
export const MILESTONES = [
  {
    id: 'M0',
    name: 'Design lock',
    week: '1',
    lands:
      'ERD, Row Level Security policy map, API contract, role matrix, architecture decision records.',
    gate: 'Approve before code',
    tranche: null,
  },
  {
    id: 'M1',
    name: 'Tenancy core',
    week: '2 – 3',
    lands:
      'Schema and migrations, Row Level Security on all tables, provisioning, isolation test suite, CI, staging.',
    gate: 'Demo: tenant isolation verified',
    tranche: 2,
  },
  {
    id: 'M2',
    name: 'Auth and access',
    week: '4',
    lands: 'Login, password reset, sessions, invitations, role enforcement.',
    gate: 'Demo: full account lifecycle',
    tranche: null,
  },
  {
    id: 'M3',
    name: 'Subscriptions',
    week: '5',
    lands:
      'Plans, tiers, entitlements, subscription states, limit enforcement. Caching layer and scoped credentials land alongside.',
    gate: 'Demo: limit enforcement',
    tranche: null,
  },
  {
    id: 'M4',
    name: 'Platform console',
    week: '6',
    lands: 'Owner login, tenant management, plan assignment, platform metrics.',
    gate: 'Demo: console operations',
    tranche: 3,
  },
  {
    id: 'M5',
    name: 'Tenant settings',
    week: '7',
    lands: 'Company profile, team management, encrypted credential store.',
    gate: 'Demo: secrets auditing',
    tranche: null,
  },
  {
    id: 'M4a',
    name: 'AI rules and seams',
    week: '7',
    lands:
      'Master and tenant AI rules, service-door read access with scopes, knowledge base and customer record tables with isolation.',
    gate: 'Demo: a rules edit live through the API in 5 seconds',
    tranche: null,
  },
  {
    id: 'M6',
    name: 'Handover',
    week: '8 – 9',
    lands:
      'Load and security pass, health page, uptime and status page, logs review, documentation set, walkthrough.',
    gate: 'Sign-off',
    tranche: 4,
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
 *  three are due in week one. */
export const CLIENT_INPUTS = [
  { item: 'Written approval of this brief', when: 'Before kick-off', blocking: 'Everything' },
  { item: 'Supabase organisation access', when: 'Week 1', blocking: 'M1' },
  { item: 'GitHub organisation access', when: 'Week 1', blocking: 'M1' },
  { item: 'Embedding model Phase 2 will use', when: 'Week 1', blocking: 'M4a seam' },
  {
    item: 'Precedence between master and tenant AI rules',
    when: 'Week 1',
    blocking: 'M4a, and the schema',
  },
  { item: 'Confirmed plan tiers with limits', when: 'Week 4', blocking: 'M3' },
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
