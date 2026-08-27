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
    progress: 95,
    note: 'Documentation set, design set and the architectural foundation are drawn and built. All five of the decisions that were blocking are answered as of 24 Aug 2026, most ahead of schedule. The channel adapter contract — the last artefact outstanding — is now written as document 16, with the typed interface and the webhook route shell in the repository. What remains is signature rather than work: the contract signed off, and written approval of the brief itself.',
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
    progress: 85,
    note: 'The gate is met: the isolation suite runs against the real database and passes 152 of 152 across 15 tenant-scoped tables, plus 20 further cases added on 27 Aug 2026, with the policy check reporting 0 problems. Schema, migrations, the full policy catalogue and tenant provisioning are applied and working. Reaching a live database found four defects in the suite itself, each of which had been letting it report green while proving less than it claimed — the last and largest being that it only ever asked whether a tenant could see ANOTHER tenant’s rows, never whether they could see their own. Six tables were returning nothing to anyone and it could not tell. All four are fixed and recorded in document 15. Only the staging environment is outstanding.',
  },
  {
    id: 'M2',
    name: 'Auth and access',
    week: '4',
    lands: 'Login, password reset, sessions, invitations, role enforcement.',
    gate: 'Demo: full account lifecycle',
    tranche: null,
    status: 'active' as MilestoneStatus,
    progress: 90,
    note: 'The account lifecycle is built and wired end to end as of 27 Aug 2026: sign-in through both doors, sign-out, password recovery and reset, the session list with per-device and bulk revocation, invitations through to acceptance, role changes and ownership transfer. Fourteen routes and five server actions, all through the same six-stage pipeline and the same services, so the screen and the API cannot drift. The team, account and sessions screens now read the real database; the workspace shell reads the signed-in member, so an agent does not see Credentials because the SERVER did not send it. Twelve new isolation cases cover the whole flow. What remains is the email transport that currently leaves an invitation as a link the owner passes on by hand.',
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
    note: 'The shared entitlement guard, the cache layer and the plan schema are built. The surfaces above them are not. The tiers were confirmed on 24 Aug 2026, three weeks ahead of the week-four date, so this milestone is no longer waiting on them.',
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
    note: 'The console shell and the boundary frame are built. The support role matrix was signed on 24 Aug 2026, as read and write rather than the read-only default it was drawn as, so the session work can start. The isolation suite\'s support cases are regenerated against it.',
  },
  {
    id: 'M5',
    name: 'Tenant settings',
    week: '7',
    lands: 'Company profile, team management, encrypted credential store.',
    gate: 'Demo: secrets auditing',
    tranche: null,
    status: 'upcoming' as MilestoneStatus,
    progress: 25,
    note: 'The credential schema and the projection type that makes returning a hash a compile error are in place. The tenant application built on 20 Aug 2026 scaffolds this milestone’s surfaces ahead of schedule — company profile, team and invitations, and the credential list and creation form — each wired to a real read seam and refusing its write by name until this milestone lands.',
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
      'Focus rings never removed, 44px targets, every status carrying a glyph and a word as well as a hue, contrast measured across the one remaining mode and both chrome tiers, reduced motion honoured in CSS and in the GSAP wrapper alike.',
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
    status: 'A project is connected and M1 is unblocked. Access on the client organisation still to confirm.',
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
