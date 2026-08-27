/**
 * What is actually built, as of the foundation pass.
 *
 * This list is deliberately conservative. Everything marked `built` exists in
 * this repository and can be opened during the walkthrough; everything marked
 * `scaffolded` is a real file with a real contract and no business logic above
 * it; everything marked `planned` is a milestone commitment and nothing more.
 *
 * A presentation that overstates readiness costs more at M1 than it gains in
 * the meeting, so the honest column is the useful one. Reporting condition 6
 * and condition 8 of the definition of done honestly, whether or not the number
 * flatters us, is already a written commitment in document 12.
 */

export type FoundationState = 'built' | 'scaffolded' | 'planned';

export type FoundationItem = {
  area: string;
  what: string;
  state: FoundationState;
  /** The file a reviewer should open to check the claim. */
  evidence: string;
  milestone: string;
};

export const FOUNDATION: FoundationItem[] = [
  // ── Isolation. The thing the engagement is actually about. ──────────────
  {
    area: 'Isolation',
    what: 'Transaction-local tenant context, set on the connection before any query runs',
    state: 'built',
    evidence: 'src/lib/db/withTenantContext.ts',
    milestone: 'M1',
  },
  {
    area: 'Isolation',
    what: 'Branded ResolvedContext that cannot be constructed from a request body',
    state: 'built',
    evidence: 'src/lib/db/context.ts',
    milestone: 'M1',
  },
  {
    area: 'Isolation',
    what: 'Row Level Security policies on every tenant-scoped table, each with a with-check clause',
    state: 'built',
    evidence: 'src/db/policies/',
    milestone: 'M1',
  },
  {
    area: 'Isolation',
    what: 'Policy check script: a tenant-scoped table without a policy fails the build',
    state: 'built',
    evidence: 'scripts/check-policies.ts',
    milestone: 'M1',
  },
  {
    area: 'Isolation',
    what: 'Generated isolation suite, ten cases per table, blocking merge with no override path',
    state: 'built',
    evidence: 'tests/isolation/generated.test.ts',
    milestone: 'M1',
  },
  {
    area: 'Isolation',
    what: 'Service role client behind an audited wrapper and a lint rule on its import path',
    state: 'built',
    evidence: 'src/lib/db/serviceClient.ts',
    milestone: 'M1',
  },

  // ── Data model ──────────────────────────────────────────────────────────
  {
    area: 'Data model',
    what: 'Full schema across eight modules, including both Phase 2 seam tables',
    state: 'built',
    evidence: 'src/db/schema/',
    milestone: 'M1',
  },
  {
    area: 'Data model',
    what: 'Seed set: three plans (Pro, Business, Custom, confirmed 24 Aug 2026), three tenants including one suspended, one platform admin',
    state: 'built',
    evidence: 'src/db/seed/',
    milestone: 'M1',
  },

  // ── API ─────────────────────────────────────────────────────────────────
  {
    area: 'API',
    what: 'Six-stage request pipeline. Stages 2, 4 and 6 share one specification across the session and service doors, proven identical by a cross-language conformance suite now that the service door is a separate FastAPI service (01 D-14)',
    state: 'built',
    evidence: 'src/lib/http/pipeline.ts',
    milestone: 'M3',
  },
  {
    area: 'API',
    what: 'One typed error contract and the full error code catalogue',
    state: 'built',
    evidence: 'src/lib/errors/',
    milestone: 'M3',
  },
  {
    area: 'API',
    what: 'The shared entitlement guard, called identically from both doors',
    state: 'built',
    evidence: 'src/modules/entitlements/',
    milestone: 'M3',
  },
  {
    area: 'API',
    what: 'The session door: fourteen routes covering the whole account lifecycle, each through the six-stage pipeline',
    state: 'built',
    evidence: 'src/app/api/v1/',
    milestone: 'M2',
  },
  {
    area: 'API',
    what: 'Route handlers for the service and platform doors',
    state: 'planned',
    evidence: 'src/app/api/',
    milestone: 'M3 – M4a',
  },
  {
    area: 'System',
    what: 'Sessions as rows, so revocation takes effect on the next request rather than when a token expires',
    state: 'built',
    evidence: 'src/lib/auth/session.ts',
    milestone: 'M2',
  },
  {
    area: 'System',
    what: 'The two door resolvers: the only place a tenant context is constructed, and never from anything a caller sent',
    state: 'built',
    evidence: 'src/lib/auth/resolve.ts',
    milestone: 'M2',
  },
  {
    area: 'System',
    what: 'Membership, invitations and the exactly-one-owner invariant, with transfer atomic in one transaction',
    state: 'built',
    evidence: 'src/modules/membership/',
    milestone: 'M2',
  },
  {
    area: 'Isolation',
    what: 'The account lifecycle covered by 12 further cases: invitation, acceptance, replay, expiry, roles and session theft',
    state: 'built',
    evidence: 'tests/isolation/account-lifecycle.test.ts',
    milestone: 'M2',
  },
  {
    area: 'Isolation',
    what: 'Invitation acceptance through two narrow security-definer functions, so the table stays closed to everyone without a token',
    state: 'built',
    evidence: 'src/db/policies/02_identity.sql',
    milestone: 'M2',
  },
  {
    area: 'Console',
    what: 'The workspace shell reads the signed-in member: navigation is filtered by the server, not hidden by the client',
    state: 'built',
    evidence: 'src/app/(tenant)/app/layout.tsx',
    milestone: 'M2',
  },
  {
    area: 'Console',
    what: 'Team, account and session screens reading live data, with the designed fixtures still behind the review bypass',
    state: 'built',
    evidence: 'src/lib/tenant/live.ts',
    milestone: 'M2',
  },
  {
    area: 'System',
    what: 'Transactional email behind an adapter seam, with the copy deck\u2019s templates and an honest no-op where no provider is configured',
    state: 'built',
    evidence: 'src/modules/email/',
    milestone: 'M2',
  },
  {
    area: 'System',
    what: 'Email templates proved without a provider, including the escaping cases that stop a tenant-typed name reaching an inbox as markup',
    state: 'built',
    evidence: 'tests/email/templates.test.ts',
    milestone: 'M2',
  },
  {
    area: 'System',
    what: 'The subscription lifecycle as a transition table: nine legal moves, all 36 ordered pairs tested',
    state: 'built',
    evidence: 'src/modules/subscriptions/transitions.ts',
    milestone: 'M3',
  },
  {
    area: 'System',
    what: 'Plan assignment, status changes and entitlement overrides, each audited before it runs',
    state: 'built',
    evidence: 'src/modules/platform/internal/subscriptions.ts',
    milestone: 'M3',
  },
  {
    area: 'Console',
    what: 'The watchlist: every workspace within 20% of a limit or past due, in one query, sorted by urgency',
    state: 'built',
    evidence: 'src/modules/platform/internal/watchlist.ts',
    milestone: 'M3',
  },
  {
    area: 'Console',
    what: 'The plan catalogue and the tenant plan screen reading the real database rather than a fixture of retired tiers',
    state: 'built',
    evidence: 'src/lib/console/live.ts',
    milestone: 'M3',
  },
  {
    area: 'Isolation',
    what: 'Entitlement resolution proved against the database: overrides win, expiry lapses on its own, and a tenant cannot grant itself anything',
    state: 'built',
    evidence: 'tests/isolation/entitlements.test.ts',
    milestone: 'M3',
  },
  {
    area: 'System',
    what: 'Nightly usage reconciliation that reports drift rather than correcting it, with repair gated on a named admin and a stated reason',
    state: 'built',
    evidence: 'scripts/reconcile-usage.ts',
    milestone: 'M3',
  },
  {
    area: 'Console',
    what: 'Plan change, status transition and override controls, in their own file because every one of them bypasses row level security',
    state: 'built',
    evidence: 'src/app/(platform)/platform/(console)/subscription-actions.ts',
    milestone: 'M3',
  },
  {
    area: 'Console',
    what: 'Support sessions as ordinary session rows, so the ceiling is the same machinery that scopes every tenant user',
    state: 'built',
    evidence: 'src/modules/platform/internal/support.ts',
    milestone: 'M4',
  },
  {
    area: 'Console',
    what: 'Suspension and reactivation, with a reason the customer reads and the typed slug checked against the record rather than the caller',
    state: 'built',
    evidence: 'src/modules/platform/internal/tenancy.ts',
    milestone: 'M4',
  },
  {
    area: 'Isolation',
    what: 'Support mode proved both ways: the tenant sees every visit, and the three carve-outs hold — including one that had never worked',
    state: 'built',
    evidence: 'tests/isolation/support-mode.test.ts',
    milestone: 'M4',
  },

  // ── System plumbing ─────────────────────────────────────────────────────
  {
    area: 'System',
    what: 'Append-only audit writer, in the same transaction as the operation it records',
    state: 'built',
    evidence: 'src/lib/audit/',
    milestone: 'Throughout',
  },
  {
    area: 'System',
    what: 'Structured logging with redaction of secrets and customer record fields',
    state: 'built',
    evidence: 'src/lib/logger/',
    milestone: 'Week 2',
  },
  {
    area: 'System',
    what: 'Cache layer scoped to four uses, correct with Redis switched off entirely',
    state: 'built',
    evidence: 'src/lib/cache/',
    milestone: 'M3',
  },
  {
    area: 'System',
    what: 'Error tracking, log aggregation and uptime checks wired to live services',
    state: 'planned',
    evidence: 'Sentry, Axiom, Better Stack',
    milestone: 'Week 2',
  },

  // ── Design system ───────────────────────────────────────────────────────
  {
    area: 'Design system',
    what: 'Token layer, one mode, measured contrast, exposed through Tailwind. The dark theme was withdrawn on 25 Aug 2026 by the client: the inverted surfaces stay, as composition rather than as a setting',
    state: 'built',
    evidence: 'src/app/tokens.css',
    milestone: 'M0',
  },
  {
    area: 'Design system',
    what: 'aLcassa identity adopted: blue primary, navy ink on cream, budgeted orange accent',
    state: 'built',
    evidence: 'src/app/tokens.css',
    milestone: 'M0',
  },
  {
    area: 'Design system',
    what: 'Compatibility layer mapping the retired palette onto the new one by semantic role',
    state: 'built',
    evidence: 'src/app/tokens.css',
    milestone: 'M0',
  },
  {
    area: 'Design system',
    what: 'Type system capped at weight 500, font synthesis disabled, three families bundled at one cut each',
    state: 'built',
    evidence: 'src/app/globals.css',
    milestone: 'M0',
  },
  {
    area: 'Design system',
    what: 'The chrome tier: the console inverts against the page in dark navy, the tenant application in white, and neither depends on a theme',
    state: 'built',
    evidence: 'src/app/tokens.css',
    milestone: 'M4',
  },
  {
    area: 'Design system',
    what: 'The boundary frame and the support session receipt',
    state: 'built',
    evidence: 'src/components/domain/BoundaryFrame.tsx',
    milestone: 'M4',
  },
  {
    area: 'Design system',
    what: 'The remaining component tiers, sixty-four components in total',
    state: 'scaffolded',
    evidence: 'src/components/',
    milestone: 'M1 – M5',
  },

  // ── Platform console. Built from the Claude Design set, August 2026. ─────
  {
    area: 'Console',
    what: 'Console shell: inverted chrome, collapsible nav, command palette, workspace switcher',
    state: 'built',
    evidence: 'src/components/console/ConsoleShell.tsx',
    milestone: 'M4',
  },
  {
    area: 'Console',
    what: 'Support mode as a server-issued grant with an absolute expiry, not client state',
    state: 'built',
    evidence: 'src/lib/console/session.ts',
    milestone: 'M4',
  },
  {
    area: 'Console',
    what: 'Overview: a queue ordered by what each item costs to ignore, not a metric grid',
    state: 'built',
    evidence: 'src/app/(platform)/platform/(console)/page.tsx',
    milestone: 'M4',
  },
  {
    area: 'Console',
    what: 'Workspace list and detail, with entitlement meters and the suspend confirmation',
    state: 'built',
    evidence: 'src/components/console/WorkspaceTable.tsx',
    milestone: 'M4',
  },
  {
    area: 'Console',
    what: 'Revenue, health, plans, audit log and the support-session register',
    state: 'built',
    evidence: 'src/app/(platform)/platform/(console)/',
    milestone: 'M3, M4',
  },
  {
    area: 'Console',
    what: 'Master AI rules: locked-versus-enabled toggles, real-time propagation to 47 workspaces',
    state: 'built',
    evidence: 'src/components/console/RulesEditor.tsx',
    milestone: 'M4a',
  },
  {
    area: 'Console',
    what: 'Admins: roster, invitations, and a three-column capability matrix ending in two rows of crosses',
    state: 'built',
    evidence: 'src/app/(platform)/platform/(console)/admins/page.tsx',
    milestone: 'M4',
  },
  {
    area: 'Console',
    what: 'Settings: platform identity, access policy, break-glass lock, notifications, retention, developer keys',
    state: 'built',
    evidence: 'src/components/console/SettingsPanel.tsx',
    milestone: 'M4, M5',
  },
  {
    area: 'Console',
    what: "Profile: the signed-in operator's own identity, security, sessions, and access ceiling",
    state: 'built',
    evidence: 'src/components/console/ProfilePanel.tsx',
    milestone: 'M4, M2',
  },
  {
    area: 'Console',
    what: 'Provision: five-field workspace creation with a real slug-uniqueness check, as a modal deep-linkable via ?provision=1',
    state: 'built',
    evidence: 'src/components/console/ProvisionWorkspaceDialog.tsx',
    milestone: 'M4',
  },
  {
    area: 'Console',
    what: 'Console read models: shaped as the queries that replace them, seam at one boundary',
    state: 'scaffolded',
    evidence: 'src/lib/console/data.ts',
    milestone: 'M1 – M4',
  },
  {
    area: 'Console',
    what: 'GSAP motion routed through prefers-reduced-motion (gsapSafe); nav indicator scoped to a gsap.context()',
    state: 'built',
    evidence: 'src/lib/motion.ts',
    milestone: 'M4',
  },
  {
    area: 'Console',
    what: 'Every dialog and switch on Radix primitives; real server actions (not silent no-ops) behind suspend, plan-change, and break-glass',
    state: 'built',
    evidence: 'src/components/primitives/ConfirmDialog.tsx',
    milestone: 'M4',
  },
  {
    area: 'Console',
    what: 'loading.tsx per console route (Skeleton family) and a route-group error.tsx per sheet 12',
    state: 'built',
    evidence: 'src/app/(platform)/platform/(console)/error.tsx',
    milestone: 'M4',
  },
  {
    area: 'Console',
    what: "Roving tabindex (useRovingGrid) on every data grid; a skip link as the console's first tab stop",
    state: 'built',
    evidence: 'src/hooks/useRovingGrid.ts',
    milestone: 'M4',
  },
  {
    area: 'Console',
    what: 'Health: leading diagnosis sentence, per-metric budgets, refusals excluded from error rate, cross-tenant isolation panel',
    state: 'built',
    evidence: 'src/app/(platform)/platform/(console)/health/page.tsx',
    milestone: 'M4',
  },
  {
    area: 'Console',
    what: 'Meter hues corrected to verdigris-within/ochre-at-ceiling (no red on an entitlement meter); every meter names its source table',
    state: 'built',
    evidence: 'src/components/console/WorkspaceTable.tsx',
    milestone: 'M4',
  },
  {
    area: 'Console',
    what: '"One shadow, one surface" — panel and status-dot glows removed platform-wide; only dialogs and the command palette carry elevation',
    state: 'built',
    evidence: 'src/components/console/Surface.tsx',
    milestone: 'M4',
  },
  {
    area: 'Console',
    what: 'Workspaces standfirst ("N businesses. M need attention.") with the attention filter pre-applied; shared predicate for the page and the table',
    state: 'built',
    evidence: 'src/lib/console/attention.ts',
    milestone: 'M4',
  },
  {
    area: 'Console',
    what: 'Cross-tenant isolation status permanently under the sidebar nav, reading the same source as the Health panel',
    state: 'built',
    evidence: 'src/lib/console/data.ts',
    milestone: 'M4',
  },

  // ── Delivery ────────────────────────────────────────────────────────────
  {
    area: 'Delivery',
    what: 'CI: typecheck, lint, policy check, isolation suite, and a cache-disabled run',
    state: 'built',
    evidence: '.github/workflows/ci.yml',
    milestone: 'M1',
  },
  {
    area: 'Delivery',
    what: 'Module boundary and service-role import rules enforced by lint',
    state: 'built',
    evidence: 'eslint.config.mjs',
    milestone: 'M1',
  },
  {
    area: 'Delivery',
    what: 'Preview deployment per pull request, paired with a Supabase branch',
    state: 'planned',
    evidence: 'Vercel',
    milestone: 'M1',
  },
  {
    area: 'Delivery',
    what: 'Load pass against the 400ms and 50-session figures',
    state: 'planned',
    evidence: 'k6',
    milestone: 'M6',
  },

  // ── Applied to a real database, 25 Aug 2026. ────────────────────────────
  {
    area: 'Isolation',
    what: 'The isolation suite run against a live database: 152 of 152 across 15 tenant-scoped tables',
    state: 'built',
    evidence: 'tests/isolation/generated.test.ts',
    milestone: 'M1',
  },
  {
    area: 'Isolation',
    what: 'Least-privilege application role that cannot bypass Row Level Security, separate from the migration role',
    state: 'built',
    evidence: 'src/lib/db/client.ts',
    milestone: 'M1',
  },
  {
    area: 'Data model',
    what: 'Migrations generated and applied: 23 tables, 39 policies, seeded',
    state: 'built',
    evidence: 'src/db/migrations/',
    milestone: 'M1',
  },
  {
    area: 'Data model',
    what: 'Policies applied with the tables they protect, as one command, so neither can ship without the other',
    state: 'built',
    evidence: 'scripts/apply-policies.ts',
    milestone: 'M1',
  },
  {
    area: 'System',
    what: 'Tenant provisioning: tenant, settings, owner profile and owner membership in one transaction, audited before it runs',
    state: 'built',
    evidence: 'src/modules/platform/internal/provisioning.ts',
    milestone: 'M1',
  },
  {
    area: 'System',
    what: 'Supabase auth clients: server, browser and middleware session refresh, with the admin client lint-guarded like the service-role database client',
    state: 'built',
    evidence: 'src/lib/auth/supabase/',
    milestone: 'M2',
  },
  {
    area: 'API',
    what: 'Channel adapter contract: the five-method interface, the internal event shape and the retry rules, with no adapter above them',
    state: 'built',
    evidence: 'src/modules/channels/types.ts',
    milestone: 'M0, M4a',
  },
  {
    area: 'API',
    what: 'Webhook route shell answering 501, with the verify-before-parse ordering already in place',
    state: 'scaffolded',
    evidence: 'src/app/api/webhooks/[channel]/route.ts',
    milestone: 'M4a',
  },
  {
    area: 'Console',
    what: 'Tenant application: all fourteen routes, white chrome against the console’s dark slab, boundary frame wired',
    state: 'built',
    evidence: 'src/app/(tenant)/app/',
    milestone: 'M2, M5',
  },
];

export const FOUNDATION_SUMMARY = {
  built: FOUNDATION.filter((item) => item.state === 'built').length,
  scaffolded: FOUNDATION.filter((item) => item.state === 'scaffolded').length,
  planned: FOUNDATION.filter((item) => item.state === 'planned').length,
  total: FOUNDATION.length,
};

/**
 * The stack, and why each piece is there rather than an alternative. From the
 * architecture decision records in document 04.
 */
export const STACK = [
  {
    layer: 'Application',
    choice: 'Next.js 15, TypeScript strict',
    why: 'Server components by default, one deployment for two applications, and a type error is a failed build rather than a warning.',
  },
  {
    layer: 'Service door',
    choice: 'FastAPI, deployed separately',
    why: 'The machine path reads assistant rules on every generated response, which is message volume rather than dashboard volume, so it gets its own service rather than a route inside the application. Same entitlement decision and the same RLS binding as the session door, proven identical by a conformance suite rather than by sharing a function.',
  },
  {
    layer: 'Database',
    choice: 'Supabase Postgres with Row Level Security',
    why: 'Isolation lives in the database rather than the application. One mechanism, exhaustively tested, instead of two places to forget.',
  },
  {
    layer: 'Schema',
    choice: 'Drizzle ORM',
    why: 'Typed schema and migrations, connected as an RLS-bound role rather than the service role, so every policy applies to its queries.',
  },
  {
    layer: 'Auth',
    choice: 'Supabase Auth',
    why: 'The JWT and the database speak the same language, which is what makes policy enforcement clean. The cost is that organisation modelling is ours to build.',
  },
  {
    layer: 'Cache',
    choice: 'Upstash Redis, four uses',
    why: 'Reading AI rules on every generated response runs at message volume. With the cache off, every correctness property still holds and only speed changes.',
  },
  {
    layer: 'Hosting',
    choice: 'Vercel',
    why: 'A preview deployment and a database branch per pull request, so a migration is tested against production shape before merge.',
  },
  {
    layer: 'Observability',
    choice: 'Sentry, Axiom, Better Stack',
    why: 'Switched on in week two rather than during hardening, because instrumentation is only useful with history behind it.',
  },
] as const;
