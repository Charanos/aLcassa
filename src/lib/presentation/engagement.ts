/** Shared engagement data: signed scope and commercial terms, with recorded delivery assessments. */

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
  /**
   * The product name, supplied by the client on 3 August 2026. "aLcassa" was
   * the CODENAME for the design system and this document set, never a proposed
   * product name — so this field changed rather than being retired.
   *
   * Mixed case, capital L. `Alcassa` is prohibited by the brand guidance.
   */
  designSystem: 'aLcassa',
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
      'Company profile and branding, team management, a credential store that hashes with argon2id and shows a value once, with masked display, rotation and last-used tracking, plus designed placeholder surfaces for Messaging Inbox and Billing.',
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

/** Qualified local checkpoint; milestone acceptance is recorded separately. */
export const PHASE_ONE_VERIFICATION = {
  date: '10 October 2026',
  applicationTests: 694,
  applicationFiles: 61,
  serviceTests: 34,
  bridgeChecks: 5,
  propagationChecks: 12,
} as const;

export const MILESTONES = [
  {
    id: 'M0',
    name: 'Design lock',
    week: '1',
    lands:
      'ERD, Row Level Security policy map, API contract, role matrix, architecture decision records.',
    gate: 'Approve before code',
    tranche: null,
    status: 'complete' as MilestoneStatus,
    progress: 100,
    note: 'Complete. The architecture, the data model, the security rules and the design system were agreed and documented before any product code was written, and every decision that was blocking has been answered. The channel adapter contract is written and awaits only a signature.',
  },
  {
    id: 'M1',
    name: 'Tenancy core',
    week: '2 – 3',
    lands:
      'Schema and migrations, Row Level Security on all tables, provisioning, isolation test suite, CI, staging.',
    gate: 'Demo: tenant isolation verified',
    tranche: 2,
    status: 'complete' as MilestoneStatus,
    progress: 100,
    note: `The database foundation and isolation gate are established. The complete local suite passed ${PHASE_ONE_VERIFICATION.applicationTests} tests without skips; policy coverage is 15 of 15 workspace tables. Provisioning, captured invitations and owner activation have real provider coverage. Session and credential rows are private to the server connection. Browser acceptance and release recovery remain part of final Phase One qualification.`,
  },
  {
    id: 'M2',
    name: 'Auth and access',
    week: '4',
    lands: 'Login, password reset, sessions, invitations, role enforcement.',
    gate: 'Demo: full account lifecycle',
    tranche: null,
    status: 'active' as MilestoneStatus,
    progress: 98,
    note: 'Actual Google consent, first-time workspace creation and returning sign-in now pass in the hosted sandbox. Database readback confirms one trial workspace, one owner, one seat and one creation audit. Recovery, ownership, sessions, password change and colleague invitations retain their separate browser evidence. Google identity continuity for an existing email account, invitation continuation, confirmation-required colleague signup and external email delivery qualification remain open. The Google acceptance workspace is retained for the remaining identity checks; other workflow fixtures were removed.',
  },
  {
    id: 'M3',
    name: 'Subscriptions',
    week: '5',
    lands:
      'Plans, tiers, entitlements, subscription states, limit enforcement. Caching layer and scoped credentials land alongside.',
    gate: 'Demo: limit enforcement',
    tranche: null,
    status: 'active' as MilestoneStatus,
    progress: 100,
    note: 'Subscription engineering checks are complete in the agreed local service-hosting scope. Reviewed plan changes, overrides, concurrent limits and refusal paths pass. Real provider-backed session HTTP and service workers share the same Redis budget. Scheduled and command-line reconciliation now agree on all Phase One counters; repairs recount under writer locks and record actor, reason and peaks. Owner activation and signup record their seat atomically. Demonstration and final release acceptance remain separate from technical readiness.',
  },
  {
    id: 'M4',
    name: 'Platform console',
    week: '6',
    lands: 'Owner login, tenant management, plan assignment, platform metrics.',
    gate: 'Demo: console operations',
    tranche: 3,
    status: 'active' as MilestoneStatus,
    progress: 88,
    note: 'The console has actual rendered-browser coverage at desktop, phone and 320px widths, including all six workspace detail tabs. Shared settings, health charts, directory views and loading states are implemented. The operational release passed every application and service CI job. Actual database failures now produce bounded outage and recovery notifications with durable retries. Complete action-state, keyboard and accessibility acceptance remain open.',
  },
  {
    id: 'M5',
    name: 'Tenant settings',
    week: '7',
    // Stored hashes cannot recover a key; only its creation response contains the secret.
    lands: 'Company profile, team management, a credential store that hashes and never reveals.',
    gate: 'Demo: secrets auditing',
    tranche: null,
    status: 'active' as MilestoneStatus,
    progress: 94,
    note: 'Company saves have UI, reload, database and audit readback. Customer Activity verifies plan availability, retention and workspace separation; timestamps remain clear at three widths and Reference works by keyboard. New and existing colleague invitations, wrong identity, renewal and withdrawal pass actual browser/provider checks, reconciling to three seats. Credentials, team changes, ownership and durable last-use have database and native evidence. Confirmation-required signup, remaining clipboard/error journeys and final secrets/accessibility review stay open. Phase One retained counters are reconciled; request billing belongs to later scope.',
  },
  {
    id: 'M4a',
    name: 'AI rules and seams',
    week: '7',
    lands:
      'Master and tenant AI rules, service-door read access with scopes, knowledge base and customer record tables with isolation.',
    gate: 'Demo: a rules edit live through the API in 5 seconds',
    tranche: null,
    status: 'active' as MilestoneStatus,
    progress: 82,
    note: `Workspace publication and restoration use immutable history, retention and transactional audit records. Platform safeguards and stale-edit checks pass real database cases. FastAPI passes ${PHASE_ONE_VERIFICATION.serviceTests} local cases; ${PHASE_ONE_VERIFICATION.bridgeChecks} Node-to-HTTP checks pass integration CI. ${PHASE_ONE_VERIFICATION.propagationChecks} actual publish/restore samples reached the local service within five seconds. Native publication, comparison, restoration, stale-draft and desktop/phone checks pass. Real Redis tenant budgets now pass eight scenarios across both runtimes. Provider-backed Node HTTP contention now passes. Broader browser failure states, load and complete merged API conformance remain open in the agreed local service-hosting scope.`,
  },
  {
    id: 'M6',
    name: 'Handover',
    week: '8 – 9',
    lands:
      'Load and security pass, health page, uptime and status page, logs review, documentation set, walkthrough.',
    gate: 'Sign-off',
    tranche: 4,
    status: 'active' as MilestoneStatus,
    progress: 64,
    note: 'All 694 application cases pass. Separate-target recovery reconciles 61 tables, 52 policies and 17 context functions. Monitoring delivers four correlated outage/recovery notifications with durable retry. Isolated Chrome covers 32 surfaces at three widths, seven complete account/invitation workflows and focused Activity keyboard/layout checks. The dependency gate passes with no unresolved findings. The 50-session load baseline preserves integrity but fails latency acceptance. Independent Auth/object recovery, two database advisor warnings, complete accessibility, timed clean setup and final handover remain open.',
  },
] as const;

/** Engineering estimates reassessed against verified work; final demonstrations remain separate. */
export const MILESTONE_PROGRESS_REVIEW: Record<
  string,
  { previous: number; evidence: string[]; remaining: string[] }
> = {
  M2: {
    previous: 94,
    evidence: [
      'Hosted Google consent, first-time workspace creation and returning access pass; one owner, one seat and one creation audit reconcile in the database',
      'Actual Auth and application records agree for the recovery recipient',
      'Verified Google callback routing, role preservation and invitation continuation have application contract tests; concurrent setup creates one workspace, one owner seat and one creation audit',
      'Unknown and profile-only addresses receive no reset link or new identity',
      'Native ownership refusal, transfer, fresh permissions and existing sign-in',
      'Production-build sign-in, wrong-password retry and sign-out resume the intended page and query',
      'Native individual and bulk device ending with immediate readback, current-device preservation and matching atomic audits',
      'Actual provider sign-out ends this refresh session while another device remains usable',
      'Browser password change with incorrect-password refusal, real old/new provider checks and other-device denial',
      'Actual new/existing colleague acceptance, wrong identity, single-use replay, renewal and withdrawal with reconciled seats',
      'Built Edge and route origin checks on both local addresses; fresh denial and session readback after sign-out',
    ],
    remaining: [
      'Confirmation-required colleague signup and remaining provider failure states',
      'Google identity continuity for existing email accounts and invitation continuation',
      'External sending-domain and redirect qualification before launch',
    ],
  },
  M3: {
    previous: 92,
    evidence: [
      'Real Redis contention admits six and refuses four requests across both runtimes',
      'Worker restart, tenant separation, expiry, configuration changes and outage checks',
      'Actual provider-backed sign-in and session HTTP across two production application workers',
      'One aggregate definition for all three Phase One resource counters, with detected drift and audited locked repair',
      'Initial owner seats are committed atomically and concurrent activation counts once',
    ],
    remaining: [
      'Milestone demonstration and final release acceptance; technical checks complete in local hosting scope',
    ],
  },
  M5: {
    previous: 86,
    evidence: [
      'Company saves, conflicts and recorded Activity',
      'Actual company-name/contact save, reload, database value and single audit readback',
      'Browser Activity plan availability, retention expiry and workspace isolation at 320px',
      'Actual new/existing colleague journeys and renewal/withdrawal with provider, membership and seat readback',
      'Activity timestamps separated at three widths and keyboard Reference disclosure',
      '16 database credential cases, including concurrent limits and audit rollback',
      'Native creation, one-time reveal, download, replacement, revocation and focus',
      '31 database team cases and five confirmed-action/readback cases',
      'Twelve ownership-route cases and an actual provider/database transfer preserving two existing sessions',
      'Native owner review, password refusal, single audited transfer and fresh roles; phone fit and keyboard focus',
      'Native role reduction, suspended removal and seat release without a reload; phone review and focus',
      'Durable service last-use with successful/conditional reads, concurrency, failure and restricted database write checks',
    ],
    remaining: [
      'Confirmation-required signup and wider ownership failure-state acceptance',
      'Clipboard, phone and failure-state acceptance',
      'Final credential failure-state acceptance and secrets review',
    ],
  },
  M4a: {
    previous: 78,
    evidence: [
      '12 database rule lifecycle cases and six session-route cases',
      'Native publication, comparison, restore, stale-draft and responsive checks',
      '29 service cases, five bridge checks and 12 propagation operations in qualified pinned CI; 34 current local cases',
      'Eight real Redis scenarios across independent Node processes and authenticated Python workers',
    ],
    remaining: [
      'Complete merged API contracts within the agreed local service-hosting scope',
      'Unsaved navigation, wider failure cases and load qualification',
    ],
  },
  M4: {
    previous: 85,
    evidence: [
      'Actual UI sign-in and 18 console routes, including six workspace tabs, at three viewport widths',
      'Qualified operational release: six application and two service CI jobs, plus successful deployment',
      'Real database outage/recovery probes and durable notification retry across both runtimes',
    ],
    remaining: ['Complete CRUD refusal/retry states, keyboard and accessibility acceptance'],
  },
  M6: {
    previous: 52,
    evidence: [
      'Disposable provider, upgrade verification and repeatable builds',
      'Exact application/service CI, dependency audits and database-outage checks',
      'Published test catalogue, measured service samples and reviewed browser evidence',
      'Eight mutable function search paths fixed; scan reduced from ten to two warnings',
      'Separate-target restore with complete row fingerprints, normalized grants, ownership, RLS and definer comparison',
      'Restored application sign-in/settings and service read, missing-scope and revoked-credential outcomes',
      '50 real authenticated sessions across five owned workspaces; measured latency failures retained',
      'Four correlated outage/recovery notifications, actual failed-delivery retry and empty pending queue',
      '96 rendered browser visits across 32 surfaces at desktop, phone and narrow phone widths',
      'Seven complete account/invitation browser workflows and three focused Activity keyboard/layout checks',
    ],
    remaining: [
      'Two extension-placement warnings, 50-session load and complete accessibility review',
      'External monitoring destination, independent Auth/object recovery and launch delivery qualification',
      'Timed clean setup, walkthrough and handover sign-off',
    ],
  },
};

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
      'Demonstrated live rather than asserted: 172 isolation cases run against the real database, with the policy check reporting 0 problems. 152 cover the 15 tenant-scoped tables; 20 more, added 27 Aug 2026, cover the 8 policed tables that carry no tenant column and were therefore outside the generated suite entirely. Policies carry a with-check clause and row level security is FORCED, so the table owner does not bypass it either. The application connects as a role that cannot bypass policies at all, which is separate from the role migrations run as.',
    outstanding:
      'Manual policy review by a person at M1 and again at M6 — brought forward in importance by the 27 Aug finding, which a person reading the policies would have caught faster than the suite did.',
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
      'A tenant can see every time the platform entered their workspace, who it was, why, and anything they changed while they were in there.',
    state: 'partial' as ComplianceState,
    evidence:
      'Support mode is a scoped session bound by the same policies, not a bypass. Every action writes to both logs. The tenant can see and revoke the session.',
    outstanding:
      'The matrix was signed on 24 Aug 2026 as read and write rather than read-only, and the isolation suite cases are regenerated against it. Still open: whether that access reaches customer records, which is the one surface we propose it should not.',
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
    obligation: 'Customer records can be retained for a stated period and erased on request.',
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
      'Focus rings never removed, 44px targets, every status carrying a glyph and a word as well as a hue, contrast measured across the one remaining mode and both chrome tiers, reduced motion honoured in CSS and in the GSAP wrapper alike.',
    outstanding:
      'An axe pass per route in CI, and a manual keyboard pass per milestone \u2014 neither exists, and the CI workflow described both until 28 Aug 2026, when it was corrected to list only the jobs it actually runs. Sheet 13 proposes raising the target to 2.2 AA, which is not currently a contractual item.',
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
    date: '2026-10-12',
    title: 'Google workspace creation and returning access verified',
    body: 'The configured sandbox completes actual Google consent and creates one trial workspace with one owner and one seat. Returning Google sign-in resumes the requested company page without duplicate creation. Auth advances to 98% as an engineering estimate; existing-email identity continuity, Google invitation continuation, confirmation-required signup and external email delivery remain open.',
    milestone: 'M2',
    kind: 'delivery' as const,
  },
  {
    date: '2026-10-10',
    title: 'Password change and colleague invitations pass actual browser journeys',
    body: 'Seven combined workflows pass: incorrect-password refusal, provider password update and other-device denial; wrong invitation identity; new and existing colleague acceptance; single-use replay; renewal and withdrawal. Membership and reserved-seat readback reconcile to three occupied seats. Activity timestamps and keyboard Reference disclosure pass at three widths. Auth advances to 97%, Tenant Settings to 94%, Handover to 64%; Console remains 88%. Confirmation-required signup, OAuth availability, performance, broader CRUD/accessibility, independent recovery and handover remain open. All fixtures were removed; downloadable receipts exclude private links and identities.',
    milestone: 'M2, M5, M6',
    kind: 'delivery' as const,
  },
  {
    date: '2026-10-10',
    title: 'Monitoring delivery and 32 browser surfaces verified',
    body: 'Four actual outage/recovery notifications across application and service pass threshold, correlation and durable retry checks. All 645 application cases pass. Isolated Chrome covers 32 surfaces at 1440, 390 and 320px; a missing Activity entitlement now produces a clear plan message. Retained/expired Activity, workspace isolation and company saves have browser and independent database readback. Platform Console advances to 88%, Tenant Settings to 89%, Handover to 60%. Performance, remaining provider/CRUD/accessibility journeys, independent recovery and handover remain open. Downloadable evidence preserves failed baselines and exact prior-release CI qualification.',
    milestone: 'M4, M5, M6',
    kind: 'delivery' as const,
  },
  {
    date: '2026-10-09',
    title: 'Request limits, reconciliation and separate-target recovery verified',
    body: 'G06 and G07 pass in the agreed local scope: actual signed-in application and service HTTP share one request budget, and all three resource counters use locked, audited reconciliation. Initial owner seats now count atomically. All 639 application cases pass. Subscriptions reaches 100% technical readiness, AI rules and seams 82%, Handover 52%. Recovery restored 61 tables with matching data and access controls. The 50-session load run remains below the required performance standard; both failed samples are downloadable. Demonstration and final acceptance remain pending.',
    milestone: 'M3, M4a, M6',
    kind: 'delivery' as const,
  },
  {
    date: '2026-10-09',
    title: 'Shared request budgets and database safeguards verified',
    body: 'All 632 application and 34 service cases pass. Real Redis contention admits exactly six of ten simultaneous requests across Node processes, Python workers and two credentials. Eight scenarios cover restart, expiry, configuration, separation, public limiter atomicity and outage safeguards. Eight function warnings are resolved; two extension-placement warnings remain. Subscriptions advances to 92%, AI rules and seams to 78%, Handover to 42%. Native Node HTTP contention, request rollup and operational acceptance remain open. Fingerprinted evidence is available in the verification record.',
    milestone: 'M3, M4a, M6',
    kind: 'delivery' as const,
  },
  {
    date: '2026-10-09',
    title: 'Durable service last-use verified',
    body: 'Successful and conditional service reads now persist credential last-use. Refusal, failure, concurrency and database write boundaries pass in 29 service cases; five actual HTTP checks and twelve publish/restore samples also pass. All 626 application cases remain green. Tenant Settings advances from 85% to 86%. Shared budgets, request rollup and remaining native acceptance stay open; the verification record links the measured results and fingerprinted evidence index.',
    milestone: 'M5',
    kind: 'delivery' as const,
  },
  {
    date: '2026-10-09',
    title: 'Device sessions and local sign-out verified',
    body: 'Individual and bulk device ending now share an atomic mutation and audit. Native reviews confirm immediate list updates, current-browser access, Cancel focus, blur and phone fit. Real-provider verification proves sign-out preserves another device. All 617 local cases in 52 files pass. Auth advances from 93% to 94%; complete password change, invitations, OAuth and operational gates remain open. The verification record includes a separate immutable device-session evidence index.',
    milestone: 'M2',
    kind: 'delivery' as const,
  },
  {
    date: '2026-10-09',
    title: 'Auth navigation and sign-in retries verified',
    body: 'Native sign-in, incorrect-password retry and sign-out now complete automatically in a production build without losing the requested page or query. Fresh protected access is refused after sign-out, and database readback confirms the owned sessions ended. All 605 local cases in 49 files pass; the verification record adds immutable browser outcomes, reviewed images and a separate evidence index. Auth advances from 92% to 93%, bringing the rounded engineering estimate to 84%. Invitation, OAuth, device-session and operational acceptance remain open.',
    milestone: 'M2',
    kind: 'delivery' as const,
  },
  {
    date: '2026-10-08',
    title: 'Ownership review and recovery recipients verified',
    body: 'The owner-only Team review now offers an eligible successor, clear consequences and password confirmation. Native refusal and transfer agree with fresh roles and one audit; the former owner stays signed in. Recovery links go to existing Auth identities, with unknown and profile-only addresses receiving no mail or new account. All 578 local cases in 46 files pass. Auth advances from 90% to 92%, Tenant settings from 80% to 85%; invitation, OAuth, wider failure-state and operational acceptance remain open. Read the separate ownership/recovery evidence index in the verification record.',
    milestone: 'M2, M5',
    kind: 'delivery' as const,
  },
  {
    date: '2026-10-08',
    title: 'Invitation acceptance and ownership sessions verified',
    body: 'The local regression passes 564 cases in 45 files. Removed teammates can rejoin on the original membership, invalid links retain their clear error codes, and suspended memberships and the sole owner stay protected. Actual provider testing verifies that ownership password reauthentication preserves two existing sign-in sessions. Tenant settings advances from 75% to 80%; the verification record adds a separate account evidence index. Browser invitation journeys, OAuth and operational acceptance remain open.',
    milestone: 'M2, M5',
    kind: 'delivery' as const,
  },
  {
    date: '2026-10-08',
    title: 'Team capacity, permissions and immediate readback verified',
    body: 'The local regression now passes 545 cases in 43 files. Team writes check current permissions and share transaction locks; concurrent invitations cannot consume the same final seat, and acceptance cannot race withdrawal. Browser role reduction, suspended removal and invitation withdrawal agree with database and audit records, including immediate capacity updates, phone layout, keyboard focus and modal blur. Tenant settings moves from 70% to 75%. The verification record contains the bounded results and reviewed images; remaining provider and operational gates stay open.',
    milestone: 'M5, M6',
    kind: 'delivery' as const,
  },
  {
    date: '2026-09-12',
    title: 'The design document was describing a system we no longer build',
    body: 'Before starting the next block of interface work we checked the design document against the code, and it did not survive the check. The document specifies a colour palette — a warm off-white ground with a copper accent — that was chosen before your identity arrived and was replaced by it months ago. None of those colours exist in the product any more; they resolve to nothing. The document also forbids four things the product now does on purpose, and states that no brand exists. It opens by saying that where the code disagrees with it, the code is wrong. A second person is currently building against that document. It has been rewritten against what actually ships, with the sections that were still accurate — typography, spacing, motion, accessibility — kept as they were, and the reasoning for each of the four reversals written down rather than left as a silent change. The old system is not deleted: the delivery tracker and the document viewer you are reading this on still use it deliberately, because that surface speaks to you rather than to an operator, and the document now says so.',
    milestone: 'M4, M6',
    kind: 'delivery' as const,
  },
  {
    date: '2026-09-11',
    title: 'A two-pixel gap around every dialog, and the single line that caused it',
    body: 'A thin unblurred strip had appeared down the edge of the screen whenever a dialog opened. It looked like a scrolling problem and it was not one, and two attempted fixes built on that theory failed before we asked for the browser’s own measurements instead of reasoning about the stylesheet. The cause was one line: a spacing value had been given the name of the ZERO step. In the styling framework this project uses, that name is not a new value, it is a slot the framework already owns, so redefining it redefined every instruction in the codebase that meant "no space at all" — two hundred and ninety-three of them — to mean two pixels instead. The dialog backdrop was one of those, which is why it stopped two pixels short of each edge. It is removed, the fix is verified in the compiled stylesheet rather than by reading the source, and the trap is written into the design document so the next person to reach for that name finds the warning first.',
    milestone: 'M4',
    kind: 'delivery' as const,
  },
  {
    date: '2026-09-11',
    title: 'The console overview now argues rather than reports',
    body: 'The first screen of the owner console was a header and a queue. It is now three bands — revenue, portfolio, operations — each of which asks a question, answers it with a chart, and ends in a link to the screen that owns the follow-up. Two decisions are worth naming. The charts use one colour’s range rather than a different colour per series: the first version used six colours, looked well, and failed a colour-blindness check, because three of the six were indistinguishable to a reader with the most common form of it. The single exception is the workspace status ring, which keeps its meaningful colours because its legend names every segment in words, so nothing is carried by colour alone. The second is that the headline count and the ring are now the same figure. They were not: one was a stated total and the other counted a twelve-row sample, so the page could have said "forty-seven workspaces" above a chart adding up to twelve. That is the kind of error nobody reports and everybody notices.',
    milestone: 'M4',
    kind: 'delivery' as const,
  },
  {
    date: '2026-09-10',
    title: 'Creating a workspace from the console actually creates one',
    body: 'The provisioning dialog on the console’s front screen looked complete and did nothing: it waited, congratulated you, and navigated to a workspace that did not exist. It now calls the same audited provisioning operation the rest of the system uses, and when it refuses it refuses usefully — a name already taken puts the error on the name field rather than in a banner, and an owner who already has an account says so instead of failing generically. A separate path was added for people signing themselves up, which differs from the admin path in one respect worth stating: an administrator creating a workspace for someone never sees or sets their password, they send an invitation. Self-serve sign-up takes a password because the person choosing it is the person typing it.',
    milestone: 'M4',
    kind: 'delivery' as const,
  },
  {
    date: '2026-09-08',
    title: 'The console frame, on a desktop and on a phone',
    body: 'The console’s navigation was a sidebar that was either open or shut. Open costs a fifth of the working width on every screen; shut costs a click every time you move. It now behaves the way Gmail’s does: narrow by default, widening while the pointer is over it without pushing the page around, and staying wide if you click the control — which is remembered. The distinction matters more than it sounds: a layout that shifts under a pointer that was only passing through is worse than one that holds still. On a phone there was previously no console navigation at all. There is now a bottom bar with the six screens an operator reaches for, and the main action raised out of it. An earlier version of that bar drew its own shape at runtime and measured itself as the window changed; it has been replaced by something a quarter of the size that does the same thing in plain CSS.',
    milestone: 'M4',
    kind: 'delivery' as const,
  },
  {
    date: '2026-09-05',
    title: 'Signing in and out now says so, and several controls that did nothing were found',
    body: 'Signing in and signing out produced no confirmation of any kind, which is a small thing that reads as a broken thing. Both now confirm. The mechanism is worth a sentence because the obvious version is unsafe: the message has to survive a redirect, so it travels in a single-use cookie that carries a KEY from a fixed list rather than the message text. A cookie that carried arbitrary text would let a crafted link put any sentence in front of a user in the product’s own voice. The same review found a set of controls across the console that render, respond to the mouse, and do nothing at all — an export here, a save there, a notification bell. They are being resolved in the current pass: each one is either wired up, or disabled with the reason stated on the screen. A button that does nothing is worse than an absent one, because the absent one costs nothing and the dead one costs a support call.',
    milestone: 'M4',
    kind: 'delivery' as const,
  },
  {
    date: '2026-09-02',
    title: 'Signing up, and the first ten minutes after',
    body: 'The account screens were built for the milestone and not for the person. This pass went through all of them — sign-in, sign-up, verification, password recovery, invitation acceptance — and through what happens immediately after, which had not been designed at all. A new workspace now arrives at a screen that knows it is empty and says what to do about it, dismissible by its owner once they no longer need it. Three things were corrected rather than added. The sign-up form showed a workspace address that was not what would actually be created, so the first thing a new customer saw was a small lie. The password field gave no indication of what was acceptable until it refused. And the trial was not disclosed on the screen where someone agrees to it. All three are fixed.',
    milestone: 'M2, M5',
    kind: 'delivery' as const,
  },
  {
    date: '2026-08-28',
    title: 'A system-wide review, and a correction about how the safety checks were being enforced',
    body: 'Before starting the next milestone we stopped and reviewed the whole system rather than the piece in front of us. The most important thing it found needs stating plainly. The automated checks that run on every change — including the tenant isolation suite, the one this engagement rests on — were configured to install the project with one tool while the project was set up for another. Every run failed at the first step, and had done since the checks were written. They have been run by hand throughout and have passed, so nothing incorrect was shipped; what was missing was the automation that would have caught it if something had. That is fixed, along with four other things of exactly the same shape: a safeguard that was described in the documents, believed to be in place, and not actually connected. Rate limiting on the public sign-in and password pages was defined and never applied. Error reporting was installed and never switched on. There was nothing for an uptime monitor to check. And joining a workspace by invitation left no entry in that workspace\u2019s activity log, though every other membership change did. All four are now working, each with a test that fails if it stops.',
    milestone: 'M1, M2',
    kind: 'delivery' as const,
  },
  {
    date: '2026-08-28',
    title: 'The console now reports what is true on every screen',
    body: 'The same review found several screens still showing the designed placeholder data they were built with, even though the real records existed behind them — including the workspace list and the detail panel, which is where an operator decides whether to suspend a customer. Those are now reading the live database. Where a figure has no real source it says so rather than showing a plausible number: there is no payment gateway in this phase, so a workspace\u2019s monthly value is shown as a dash rather than as a price the customer has not been charged. The design system was also tightened — a hundred and ten places were using colours picked by hand instead of the shared palette, which is how a brand change becomes a hundred edits instead of one.',
    milestone: 'M4',
    kind: 'delivery' as const,
  },
  {
    date: '2026-08-28',
    title: 'M4 complete: the console reports what is true rather than what was drawn',
    body: 'The owner console now reads the real database. The queue on the overview is ordered by what each item costs to ignore — a workspace that has stopped paying above one that is nearly out of seats, above one that is merely approaching a limit — because that is the order somebody would work through them in. The panel that reports tenant isolation deserves its own note: it was showing "18 of 18 tables protected, last checked 12 August at 03:00". The real figure is fifteen, the eighteen came from a sentence in a document rather than from the system, and the timestamp was typed in. On the one screen that speaks to the guarantee this whole engagement rests on, that was the worst possible place for a number nobody had verified. It now counts the database on every page load and reports what it finds, which also means "last checked" is genuinely now rather than whenever a job last ran. Two figures on that panel — attempted and refused cross-tenant reads — are shown as zero and labelled as not yet counted, rather than being invented: the isolation mechanism works by returning nothing rather than by raising an error, so counting attempts is real work that has not been done. Revenue and uptime remain the designed figures for the same reason, and the screens say so.',
    milestone: 'M4',
    kind: 'delivery' as const,
  },
  {
    date: '2026-08-27',
    title: 'Support sessions are real, and writing the tests found a gap in them',
    body: 'Entering a customer\u2019s workspace to help them is now a recorded event rather than a switch in a browser. It opens a row with a thirty-minute ceiling, and it writes to two logs at once — ours and the customer\u2019s — in a single step, so a visit that happened is a visit they can see, with the operator\u2019s name and their stated reason. The reason is required rather than optional: document 09 argued for that and made the argument conditional on support being able to CHANGE things, which was confirmed on 24 August. The customer can see the session in their own account and end it themselves. Writing the tests for all this found a genuine gap. One of the three permanent limits on a support session is that it cannot extend its own time. The rule meant to enforce that was attached to the wrong half of the condition, and had never actually done so — a session could have quietly given itself eight hours instead of thirty minutes, with nothing in the customer\u2019s log to show for it. It is fixed, and the test that found it now runs on every change. Nothing was exploited: the only sessions that have ever existed are the ones these tests created.',
    milestone: 'M4',
    kind: 'delivery' as const,
  },
  {
    date: '2026-08-27',
    title: 'M3 complete: the nightly usage check, and what it found first time out',
    body: 'The last piece of the plans and limits milestone is a job that runs nightly, counts what each workspace is actually using from the underlying records, and compares it with the running totals the system enforces against. The decision worth explaining is that it does NOT fix what it finds. A total that has drifted is evidence of a bug — something counted a seat and never gave it back, or gave it back twice — and quietly writing the right number every night makes that bug invisible and permanent: the symptom disappears at three in the morning and nobody ever sees the pattern. So it reports and stops. Correcting is a separate, deliberate command that refuses to run without a stated reason and the name of the person running it, and it records both against every figure it changes. It found a genuine discrepancy on its first run — left behind by a test whose cleanup had timed out, not by the product — which is a fair demonstration that it works. The console controls for changing a plan, moving a subscription between states and granting an exception to a limit are wired to the same audited operations.',
    milestone: 'M3',
    kind: 'delivery' as const,
  },
  {
    date: '2026-08-27',
    title: 'M3: plans, limits and the states a subscription moves through',
    body: 'A subscription can now be moved between its six states, given a different plan, or granted an exception to a limit — each one a platform action recorded before it happens, with a reason that the customer can read on their own screen. Two decisions are worth naming. The legal moves are written as a table rather than as conditions scattered through the code: six states allow thirty-six ordered pairs and only nine of them are correct, and the expensive one to get wrong is reactivating a cancelled subscription, which quietly restores someone who stopped paying. Every one of the thirty-six is now covered by a test. And the customer’s plan screen reads the SAME figures the system consults when deciding whether to permit an action — a second query for display would eventually show someone "6 of 10 seats" while their seventh invitation was refused, with both numbers defensible and no way to tell which was wrong. The console’s plan comparison also came off its fixture, which had been showing four tiers that no longer exist against limits that were never in the schema.',
    milestone: 'M3',
    kind: 'delivery' as const,
  },
  {
    date: '2026-08-27',
    title: 'M2 complete: the account lifecycle, including email',
    body: 'Everything a person does to get into a workspace and manage who else is in it now works: signing in, signing out, recovering a password, seeing and ending sessions on other devices, inviting a colleague and having them arrive, changing what someone can do, and handing the workspace to a new owner. Invitations are emailed, with the wording taken from the copy deck rather than invented. Three decisions are worth naming. The provider sits behind an adapter, so changing it is one file and nothing above it knows which service is in use. Where no provider is configured — a fresh environment, a review deployment — the system does NOT pretend: it says the email could not be sent and gives the owner the link to pass on, because an owner waiting on a delivery that was never attempted is worse than one who knows they have a job to do. And a resend issues a NEW link rather than repeating the old one, because a link that has sat in an inbox for six days expires tomorrow, which is exactly the problem the owner is trying to solve.',
    milestone: 'M2',
    kind: 'delivery' as const,
  },
  {
    date: '2026-08-27',
    title: 'Two flaws found by running the account flow rather than reading it',
    body: 'Both were invisible to every check that does not touch a database, and both are fixed. First: accepting an invitation wrote nothing. The write ran before the new member had a membership — which is the whole point of accepting — so the rules that scope data to a workspace matched nothing and silently discarded it. The link reported success, signed the person in, and left them outside the workspace they had just joined. It now runs through two narrow database functions keyed by the invitation token, which is the design the policy file described from the start. Second, and more serious: repairing last week’s rules exposed a real gap they had been hiding. A signed-in person could reassign their own session to any workspace on the platform, including ones they had no membership in. A second check further along stopped that from reaching anyone else’s data — nobody was exposed — but the rule that should have refused it outright was not doing so. It does now: a session can only be pinned to a workspace its owner belongs to. Both are covered by twelve new tests that run against the real database on every change.',
    milestone: 'M2',
    kind: 'delivery' as const,
  },
  {
    date: '2026-08-27',
    title: 'M2: the account lifecycle works, end to end',
    body: 'Signing in, signing out, recovering a forgotten password, seeing every device signed into the account and revoking any of them, inviting a colleague and having them join, and handing the workspace to a new owner. Two decisions are worth stating because they are not the obvious ones. First, a session is a ROW IN THE DATABASE rather than a token the browser holds: revoking a token means waiting for it to expire, which is not revocation, so ending a session here takes effect on the very next request. Second, transferring ownership asks for the password again even though the person is already signed in — it is the one action in the product that the person taking it cannot undo, and a typed confirmation only proves someone read the dialog, not that they are the account holder. Invitations reserve their seat when they are sent rather than when they are accepted, so a workspace on five seats cannot issue fifty and exceed the limit the moment people start joining. The interfaces on top of these are next, along with the email transport that currently leaves an invitation as a link the owner passes on by hand.',
    milestone: 'M2',
    kind: 'delivery' as const,
  },
  {
    date: '2026-08-27',
    title: 'The review bypass is now switched on per environment rather than always',
    body: 'The sign-in screens carry buttons that open the console and the workspace without an account, so the work can be reviewed before real accounts exist. Until now those buttons worked everywhere the site was deployed. With real sign-in landing this week that becomes an open door to the owner console rather than a demonstration, so it now requires the environment to say so explicitly. The review deployment keeps it by setting one variable; the environment that eventually holds real customer data must not, and that is recorded as a condition of handover rather than left to memory.',
    milestone: 'M2',
    kind: 'decision' as const,
  },
  {
    date: '2026-08-27',
    title: 'A correction to the M1 gate report, and the test that will not let it recur',
    body: 'The isolation guarantee holds. The way it was being verified did not, and this update corrects a figure quoted here on 25 August. Fifteen policy rules identified the signed-in user by a function that reads a login token — which is correct for one of the two ways this application reaches its database, and empty for the other, which is the one every page actually uses. The effect was that six tables returned nothing to anyone: the plan catalogue a customer needs in order to choose an upgrade, and the profile table a customer needs in order to see their own name. The isolation suite passed throughout, because a table that is empty for everyone looks exactly like a table that is perfectly private, and the suite only ever asked the second question. It also selected tables by a column those six do not have, so five of them were never examined at all. Both halves are fixed: the rules now resolve the user through the single function the design always specified, and 20 new cases assert that a customer CAN see what is theirs, not only that they cannot see anyone else’s. That fix was verified by deliberately reintroducing the fault and confirming the new test fails and names the cause. The honest summary: isolation was never breached, the guarantee was never at risk, and the evidence offered for it on 25 August was thinner than it was presented as being.',
    milestone: 'M1',
    kind: 'delivery' as const,
  },
  {
    date: '2026-08-25',
    title: 'M1 gate met: tenant isolation demonstrated live, 152 of 152',
    body: 'The isolation suite now runs against a real database and passes every case: 152 assertions across 15 tenant-scoped tables, with the policy check reporting zero problems. Schema, migrations, the full policy catalogue and tenant provisioning are applied and working on the Supabase project. Running the suite against a real database for the first time found three defects that had been making it report green while proving nothing — the most serious being that its ground-truth reads went through the same connection as the code under test, so most assertions were comparing zero to zero. All three are fixed and written up in document 15. This is the gate that releases tranche 2, and it is now demonstrable on screen rather than reported.',
    milestone: 'M1',
    kind: 'delivery' as const,
  },
  {
    date: '2026-08-25',
    title: 'Database live, and one setting corrected before it could do harm',
    body: 'The Supabase project is connected and the client layer is built: server, browser and middleware session refresh, plus an admin client restricted by the same lint guard that protects the service-role database client. One correction is worth naming because it was silent: the application connection had been pointed at the administrative role, which in Supabase carries the right to bypass Row Level Security. Every policy in the system would have been inert while appearing to work. A least-privilege application role now holds that connection and is verified to see nothing without a tenant context set.',
    milestone: 'M1, M2',
    kind: 'delivery' as const,
  },
  {
    date: '2026-08-24',
    title: 'The channel adapter contract, the last M0 artefact, is written',
    body: 'Document 16 defines the Phase 2 messaging seam: the connection table, the internal event shape field by field with the personal-data fields marked, the five-method adapter interface, the webhook ordering rules and the retry policy. The typed interface and the webhook route shell are in the repository; the route answers 501 by design. The section that matters most is how a tenant is resolved from an inbound webhook — from the connection record, never from the request body, because a webhook body is attacker-controlled. It carries a sign-off block. Every M0 artefact is now written; what remains for that gate is signature.',
    milestone: 'M0',
    kind: 'delivery' as const,
  },
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
    body: 'The client raised a conflict between his original specification, FastAPI as the backend with all data access routed through it, and the signed brief, which places FastAPI as a consumer of this platform rather than its implementer. Resolution: FastAPI becomes a real Andishi-built service in Phase 1, implementing the service door exactly where the architecture already placed it. The dashboard stays on Next.js. Moving the dashboard behind FastAPI as well remains available as a separately scoped and priced change note. Full detail in document 04, ADR-012.',
    milestone: 'M3, M4a',
    kind: 'decision' as const,
  },
  {
    date: '2026-08-20',
    title: 'One mode, by client decision: the dark theme is withdrawn',
    body: 'The client reviewed the design and asked for a single light mode, with the dark surfaces kept. That is the distinction that made this cheap rather than a repaint: the inverted chrome, the console slab and the dark statement panels were never expressions of a theme, so they stay exactly as they were and are now simply how those surfaces look. What goes is the switch, the stored preference and the second set of token values — roughly a hundred and forty declarations, and a whole class of "which theme was that measured in" question at every future accessibility check. The theme variant is neutralised rather than deleted, because removing it outright would hand control back to the reader’s operating system and reintroduce the dark theme by accident. Recorded in document 15.',
    milestone: 'M0',
    kind: 'decision' as const,
  },
  {
    date: '2026-08-20',
    title: 'Tenant application foundation built',
    body: 'The customer-facing application now has all fourteen of its routes: overview with the setup checklist, company, team and invitations, API credentials, assistant rules, plan and usage, activity, account and sessions, and the two designed placeholder surfaces. Its header and sidebar are white against the console’s dark chrome, so the two applications are unmistakable from each other at a glance — which is a safeguard rather than a style choice, since the owner has both open at once. Every control that would write is present and refuses by name, stating which milestone wires it, so the shape of the finished product is reviewable now without anything pretending to work.',
    milestone: 'M2, M5',
    kind: 'delivery' as const,
  },
  {
    date: '2026-08-12',
    title: 'Console hardened to production grade against the design sheets',
    body: 'A seven-part pass over the owner console, driven by a reading of all fourteen design sheets. Dialogs moved onto the accessible primitives already in the repository, so focus trapping, Escape and focus restoration are inherited rather than reimplemented six times. Every grid is now one tab stop with arrow-key movement, rather than fifty-six. Loading and error states exist per route, and the empty states now distinguish a region that is deliberately unfilled from one that is simply new — confusing the two is how a working system comes to look broken. Motion is routed through a wrapper that honours reduced motion in JavaScript as well as in CSS, where the media query alone does nothing. Four defects surfaced and were fixed on the way, including entitlement meters that turned red at their ceiling: a ceiling reached is ochre, not oxide, because the reader can still act on it.',
    milestone: 'M4',
    kind: 'delivery' as const,
  },
  {
    date: '2026-08-11',
    title: 'Platform console built against the design set',
    body: 'The owner console is implemented from the Claude Design project: shell, overview, workspace list and detail, revenue, support-session register, audit log, health and plans. The chrome inverts against the page, so the boundary between the platform’s own surface and a customer’s data is visible at a glance. Support mode moved from client state to a server-issued grant with an absolute expiry, because a countdown a browser owns resets on refresh and a React boolean must never reach an RLS input. Destructive confirmations state their consequences in people and workspaces rather than asking for confidence.',
    milestone: 'M4',
    kind: 'delivery' as const,
  },
  {
    date: '2026-08-10',
    title: 'aLcassa identity adopted across the product',
    body: 'The client identity supplied on 3 August replaces the aLcassa token system in full: blue #043AE1 as the primary, navy ink on cream as the largest surface, orange as a budgeted accent, and DM Sans with Libertinus Serif Display and JetBrains Mono. The retired palette survives as a compatibility layer mapping every old name onto the nearest value by semantic role, so 48 component files picked up the new palette without being touched. Recorded in document 15, section 3b.',
    milestone: 'M0',
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
  {
    item: 'Supabase organisation access',
    when: 'Week 1',
    blocking: 'M1',
    status:
      'A project is connected and M1 is unblocked. Access on the client organisation still to confirm.',
  },
  { item: 'GitHub organisation access', when: 'Week 1', blocking: 'M1', status: 'Pending' },
  {
    item: 'Channel adapter contract signed',
    when: 'Design lock',
    blocking: 'M0 gate, M4a',
    status: 'Written 24 Aug 2026 as document 16, with a sign-off block. Awaiting signature.',
  },
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

/** Agreed project terms for the delivery tracker; independent of tenant billing. */
export const COMMERCIAL = {
  currency: 'KES',
  totalFeeAmount: 65000,
  totalFee: 'KES 65,000',
  tranches: [
    {
      n: 1,
      trigger: 'On signature, before kick-off',
      share: '30%',
      amount: 'KES 19,500',
      amountValue: 19500,
    },
    {
      n: 2,
      trigger: 'M1 gate: isolation suite green, tenant A provably unable to read tenant B',
      share: '25%',
      amount: 'KES 16,250',
      amountValue: 16250,
    },
    {
      n: 3,
      trigger: 'M4 gate: platform console, organization switcher, support sessions',
      share: '25%',
      amount: 'KES 16,250',
      amountValue: 16250,
    },
    {
      n: 4,
      trigger: 'M6 sign-off: full definition of done met',
      share: '20%',
      amount: 'KES 13,000',
      amountValue: 13000,
    },
  ],
} as const;

/** Manual project receipt confirmed by the project lead; payment date was not supplied. */
export const PROJECT_PAYMENTS: readonly {
  tranche: number;
  amount: number;
  paidOn: string | null;
}[] = [{ tranche: 1, amount: 19500, paidOn: null }];

/** Calendar dates require confirmation; the brief date is not a kickoff date. */
export const PROJECT_TIMING: {
  kickoffDate: string | null;
  targetDate: string | null;
  plannedWeeks: number;
  supportDays: number;
} = { kickoffDate: '2026-08-07', targetDate: null, plannedWeeks: 9, supportDays: 30 };

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
