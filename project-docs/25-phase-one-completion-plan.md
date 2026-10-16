# 25 · Phase One completion and full surface verification

> Scope clarification — 10 October 2026: the client requires Google signup,
> first-time workspace onboarding and returning sign-in with the same Gmail
> account. G03 requires an actual configured Google consent journey. A truthful
> unavailable-provider fallback remains necessary failure behavior, but cannot
> close Google acceptance. This supersedes earlier fallback-only or optional
> OAuth allowances in the historical checkpoints below.


**Revised:** 8 October 2026, Africa/Nairobi. The dated baseline assessments below remain historical.

**Current execution authority:** [section 18, remaining gate closure plan](#18-remaining-gate-closure-plan--8-october-2026) supersedes the earlier sequencing and open-work assessments. Sections 1–17 retain the original scope, surveys and checkpoint history; a historical finding is not evidence that the same defect remains today.

**Qualified baseline:** application `3857988424d166518b515c92c425bd11e547a6d1`, [six successful CI jobs](https://github.com/Charanos/aLcassa/actions/runs/37809298145), 564 passing cases in 45 files without skips, and [successful frontend deployment](https://vercel.com/dennis-munges-projects/a-lcassa/4N2A51VeXyDgxzueXd5PnjgseVg9). Deployed verification covers 28 tracker/document routes, 58 anchors and 18 evidence assets. Tracker engineering estimates are 83% overall and 80% Tenant settings; two of eight milestones are accepted. The current service reference remains a separately pinned release, not a new measurement against this application commit.

**Historical survey baseline:** commit `f82f5df` plus its inspected working tree

**Execution ledger:** [26 · Verification matrix and evidence ledger](26-phase-one-verification-ledger.md)

**Published checkpoint, 7 October 2026:** application candidate `aa10c83` is on `origin/main` with all six CI jobs passing. The dated assessment below remains the original planning baseline; the execution ledger records subsequent implementation and verification. Publication is not Phase One acceptance.

**Milestone execution instruction, 7 October 2026:** finish the current Health/loading/directory verification work package, then prioritize the earliest open acceptance gates in dependency order. Reaffirm M1 provisioning/upgrade/isolation; complete M2 account and recovery journeys; implement M5 credentials needed by M3's service-door enforcement; complete M4a tenant rules and FastAPI contracts; finish M4's full surface/action/accessibility matrix; and qualify M6 monitoring, performance, recovery and handover. A blocked production email dependency does not prevent independent local or service implementation. Preserve prior acceptance history and label remaining release qualification separately.

**Account checkpoint, 8 October 2026:** the full local suite passes 463 cases in 34 files without skips. Actual-provider owner acceptance and password recovery now verify invitation capture, the correct stored workspace/role, one joining event, recent provider proof, single-use application confirmation, expiry and prior-session revocation. Account-level password claims prevent concurrent writes before calling Auth. Native owner acceptance opened the stored disposable workspace; remaining browser lifecycle, colleague invitation scenarios, OAuth, provider outage recovery and hosted redirect/delivery readiness remain open M2 gates. Continue those browser checks, then implement credentials and the authenticated service contract; do not treat this checkpoint as milestone or handover acceptance.

For each milestone: define its unresolved gates, implement and verify them, update the tracker and ledger with actual results, run the candidate's production build and release checks, then commit/push to the verified `origin/main` and confirm CI for that exact commit. Keep implementation, verification, publication and client acceptance distinct. A completed work package may be published under the user's existing authorization without declaring the whole milestone accepted. Never substitute an older build, test report or CI run for the candidate being released.

**Credential/service checkpoint, 8 October 2026:** the full cache-disabled application suite passes **479 cases in 35 files**, including 16 real-database credential cases. The private FastAPI service passes **20 local cases**, and the actual Node-minted key passes five HTTP cross-runtime checks. Owner creation/reveal-once, idempotency, concurrent allowances, rotation, revocation, audit rollback, scope refusal, stored tenant resolution and ETags are implemented and locally qualified. Next: finish owner browser credential acceptance and usage persistence, tenant publishing and measured propagation, then hosted service/Redis/load/monitoring/recovery gates. Private cross-repository database CI remains unconfigured; unit/OpenAPI CI is a separate proof. No milestone or handover is closed by these local results.

This is the closure plan for the whole Platform console, Operations, the pages and interactions around them, and the customer's Activity page. It also closes the tenant settings, credentials, rules API, and handover obligations required by Phase One. The wider tenant dashboard and messaging experience remain Phase Two. Existing tenant routes still receive the boundary and regression checks needed to prove Phase One.

This revision replaces the 30 September survey as the current execution plan. It incorporates the contracted-value work now in the working tree and corrects the previous plan's service API proposal. It is a source inspection and planning baseline, not a declaration that the deployed application passes verification.

## 1. Current position and evidence limits

The console is substantially implemented. Its remaining work includes functional gaps, inconsistent presentation, unverified workflows, and release controls. A percentage of completion cannot express those risks accurately. Keep implementation status, test status, and client acceptance as separate fields.

### 1.1 Milestone closure assessment

| Milestone | Current record | Closure assessment on 6 October | Required evidence to close or reaffirm |
| --- | --- | --- | --- |
| M0 · Design lock | Tracker says complete | Design and architecture documents exist. The tracker itself still mentions an adapter signature outstanding. Later documents disagree on some design rules. | Locate acceptance and adapter sign-off; resolve current design authority before extending it. Preserve existing acceptance history. |
| M1 · Tenancy core | Tracker says complete, 280 tests | Policies, isolation tests and CI database jobs exist. Doc 25 previously reported 318 tests, including 235 isolation tests. Neither number was rerun here. Staging is also part of M1's recorded deliverables. | Fresh migration, policy and isolation reports on the release candidate; per-table coverage; staging evidence; no skipped required cases. |
| M2 · Auth and access | Tracker says complete | Auth and membership implementation exists. Prior plan records production email setup outstanding; present delivery and provider configuration were not checked. | Full account lifecycle in a browser, delivered invitation and reset email, expiry/revocation tests, role and redirect checks. |
| M3 · Subscriptions | Tracker says complete | Plan and subscription implementation exists. Scoped credentials and the service-door limit demonstration remain tied to unfinished M5/M4a work. New contracted-value work is unverified. | Limits through both authenticated doors, concurrent writes, subscription transitions, overrides/expiry, reconciliation and cache-disabled proof. |
| M4 · Platform console | Active, 80% in tracker | Fourteen console page routes exist, including New workspace and Inside. Several Ops surfaces were recently rebuilt. Revenue reader/calculation work is present but the page still uses the designed model. | Every console route and nested interaction passes the surface standard; console-to-customer audit proof; support lifecycle; truthful figures and exports. |
| M5 · Tenant settings | Upcoming, 30% in tracker | Company save, credential create and credential revoke still return refusals in tenant actions. The credential table's existence does not mean its lifecycle is implemented. | Company persistence; credential reveal once, scopes, limits, rotation, revocation and redaction; team/account regressions. |
| M4a · Rules and seams | Active, 45% in tracker | Master rule operations exist. Tenant publish returns a refusal. No FastAPI implementation was found in this repository. The agreed service-door owner is FastAPI. | Tenant and master versioning, compilation/precedence, authenticated service API, ETags, propagation within five seconds, seam isolation and contracts. |
| M6 · Handover | Upcoming, 30% in tracker | CI has static, build, policy/isolation, test, cache-disabled and dependency-audit jobs. No browser, axe, OpenAPI contract or load job was found in that workflow. A basic health endpoint exists. | Release environment, load/security/accessibility evidence, real monitoring, recovery drill, complete documentation, timed setup and walkthrough. |

Milestones already accepted are not silently revoked by this document. Record the outstanding release evidence and contradictions alongside that acceptance. Only declare final Phase One closure when every applicable gate has current evidence.

### 1.2 Source-confirmed findings

| ID | Finding | Source | Closure task |
| --- | --- | --- | --- |
| B01 | Baseline `pnpm typecheck` fails with TS2741: the designed workspace detail object lacks required `contract`. | `src/lib/console/data.ts:1112`; `WorkspaceDetail` type | Finish the model migration and restore a green static/build baseline before verifying surfaces. |
| B02 | Contracted-value arithmetic, live reader, export changes and migration 0004 are uncommitted. Revenue page calls `getRevenue()`, which returns a designed portfolio. | `src/lib/console/revenue.ts`, `liveRevenue.ts`, `revenueModel.ts`, `data.ts:1380`, Revenue page | Review the current work, connect live reads, migrate safely, reconcile page/export/detail/overview, then verify. |
| B03 | Revenue copy still describes earnings and money owed; comments in new reader describe labels/markers that the current page has not yet implemented. | Revenue page; `liveRevenue.ts` | Use contracted-value language and disclose the actual basis/history limitations on the surface. |
| B04 | An authenticated revenue read with zero contract rows currently returns null and can become designed data. | `liveRevenue.ts:149` | Separate legitimate empty data, denied access, unavailable schema and explicitly designed review mode. Zero rows alone cannot prove a policy failure. |
| B05 | Company save and credential create/revoke return implementation refusals. | `src/app/(tenant)/app/actions.ts`, named actions | Complete M5 services and UI contracts. Replace technical implementation messages with useful product copy. |
| B06 | Tenant rules publish refuses and accepts only a change note, not the edited rule payload. | Same file, `publishAiRules` | Define/validate the complete publish input, expected version and audit contract before wiring the editor. |
| B07 | Customer Activity reads 100 rows, has no cursor, exposes raw action/entity codes, formats time without explicit timezone and reports retention without applying a cutoff in this reader. | `src/lib/tenant/live.ts:315`; customer Activity page | Implement the customer activity workstream in section 6. Verify actual retention jobs separately. |
| B08 | Console notifications are a literal list. Migration 0004 proposes a read watermark, but no live notices wiring was found in the shell. | Console layout:116; migration 0004 | Derive honest actionable notices and persistence, or omit the unsupported capability. No invented production notices. |
| B09 | Screenshot script covers 11 named pages at only 1440/390 widths. Dynamic detail, provisioning and Inside are absent. | `scripts/screenshot.ts` | Replace the fixed screenshot list with the route/scenario manifest and assertions. |
| B10 | Tracker claims revenue is live and M5's security work is done; it retains a historical test count. | `src/lib/presentation/engagement.ts` | Rewrite status notes from actual gate evidence without inventing a new completion percentage or changing commercial terms. |
| B11 | Previous completion plan proposed `/api/v1/rules` on Next.js; D-14 assigns `/service/v1/*` to FastAPI. API examples also mix `/api/service/v1` and `/service/v1`. | `01` D-14; `07` section 8; `04` ADR-012 | Settle deployment/base-path routing, obtain any separate service repository, and implement the agreed boundary. |
| B12 | Old build-guide design rules conflict with later design documentation and runtime tokens. Examples include weight 400 only versus 500, mono 700 in the type table versus a 500 ceiling, and different radii. | `11` section 6; `03` sections 5–6; `src/app/tokens.css` | Record the approved current canon and reconcile docs/lint before applying it throughout the app. |

**Initial inspection evidence:** source inventory, working-tree inspection, and one baseline typecheck, which failed as B01 describes. This describes the starting point. Subsequent implementation and actual verification results are recorded in [doc 26, execution evidence](26-phase-one-verification-ledger.md#11-execution-evidence-6-october-2026); they do not automatically close a surface or milestone.

The working tree includes existing schema, audit, subscription and console changes. Preserve and review that work; do not overwrite it to recover an old baseline. Any later evidence must identify the precise commit and migration state it tested.

## 2. Scope and sequence

### 2.1 Required surface families

| Family | Required coverage |
| --- | --- |
| Platform | Overview, workspace roster, workspace detail and drawer, provisioning, plans, contracted value, master AI rules. |
| Operations | Health, platform Audit, support register, Inside/support boundary, admins, platform Settings. |
| Peripheral console | Profile, rail, mobile dock, account menu, workspace switcher, command palette, notifications, preference persistence, sign-out, all dialogs/drawers/popovers. |
| Customer Activity | `/app/settings/audit`, support visit drilldown, filters/pagination, both audit trails and customer termination of a visit. |
| Phase One tenant gates | Company, team/invite, credentials/new, AI rules, subscription, appearance, account/sessions and settings redirects. Verify required functions and boundaries; wider tenant dashboard refinement is Phase Two. |
| Access and system | All access page routes, including email confirmation, OAuth callbacks, root/console/tenant errors and 404s, loading states, exports, preferences, health, reconciliation, demo access. |
| Acceptance and handover | Tracker and documentation accuracy, legal links/access flow regressions, migration/deployment, observability, security, load, restore, README and walkthrough. |

Inventory includes actions and states, not just URLs. A page is not verified if its drawer, tab, export or pending/error state was omitted. Route aliases, query-driven views and direct/deep links are included.

### 2.2 Execution order

1. **S0 · Establish the current baseline, design canon and verification harness.** Resolve B01, review the uncommitted contracted-value migration, build the route/action manifest, isolate test data and correct misleading tracker notes.
2. **S1 · Platform**, in order: Overview, Workspaces, Detail/drawer, New workspace, Plans, Contracted value, Master rules.
3. **S2 · Operations**, in order: Health, Audit, Support register/Inside, Admins, Settings. Reuse the established canon and preserve recently finished behavior.
4. **S3 · Peripheral pages and access**, including Profile and every shared shell control.
5. **S4 · Customer Activity**, linking the preceding operations into customer-visible evidence.
6. **S5 · M5 completion**, then **S6 · M4a completion**. Credential verification unblocks the service API. Extend customer activity coverage for both milestones and rerun affected console flows.
7. **S7 · Release qualification and handover**. Full candidate verification, performance, recovery, documentation and sign-off.

Shared component fixes land with the first surface using them, followed immediately by a regression sweep of their other callers. Environment setup, service-repository discovery and delivery configuration begin in S0 so they do not become late surprises. This is implementation sequencing, not authorization to create new user-owned chats or publish a release.

## 3. The common surface completion standard

A surface passes only when its required cells in doc 26 contain evidence against the same release candidate.

| Dimension | Required result | Evidence |
| --- | --- | --- |
| Data correctness | Every figure has a source and definition. Unknown/unmeasured/error differs from zero. Authenticated failures never silently become successful fixture views. List, detail, chart and export agree. | Query/source map, independent fixture expectations, reconciliation report, failure-state screenshots. |
| Identity and isolation | Direct requests enforce capability and tenant context. Tenant identity comes from trusted session/credential context. Support scope/expiry and revocation are checked on the next protected request. | Role matrix, cross-tenant negative cases, malicious-ID tests, live RLS suite. |
| Mutations and audit | Valid writes persist and are audited transactionally. Failure rolls back both state and its success audit. Retries/double submit cannot duplicate the mutation; refused attempts follow the documented security-event policy. | Before/after DB assertions, platform/customer audit IDs, concurrency/idempotency tests. |
| Interaction | Confirm consequential actions; show pending, field errors, success and retry. Preserve valid input on failure. Refresh affected counts, badges, list/detail and activity without a full browser reload. | Browser traces, fresh-session readback, second-operator checks. |
| States | Normal, empty, filtered-empty, loading, large/long data, partial/unavailable data, error, unauthorized, expired and conflict states where applicable. | Scenario fixtures and state screenshots, including nested panels. |
| Visual system | Shared layout, type, spacing, tokens, status semantics, table/form/dialog patterns and density. Consistent in the approved single theme and inside the support boundary. | Component/token inventory, approved baseline comparison and human review. |
| Accessibility | WCAG 2.1 AA review across complete flows; axe plus manual keyboard, focus, labels, announcements, contrast and screen-reader checks. | Automated report plus manual checklist. Axe alone is not conformance proof. |
| Responsive behavior | Whole document, chrome and overlays fit at 1440, 1024, 768, 390 and 360 CSS px. Also test 320px reflow and zoom. Tables needing two-dimensional layout have intentional contained scrolling. | Full-page images, overflow checks, keyboard/touch review. |
| Runtime | No unexpected console errors, hydration warnings, unhandled rejections or failed required requests. Stable timestamp rendering and correct session transitions. | Browser error/network report; error cases distinguish intentional refusals from failures. |
| Performance | No N+1 readers or unbounded list rendering. Request counts, payloads and timings are recorded. Contractual p95 below 400ms at 50 concurrent sessions is measured on required tenant dashboard/settings routes. | Query traces, repeatable production-build load report, error rates and environment details. |
| Production readiness | No demo bypass or fallback secrets in production; deployed schema matches code; service/provider errors are observable and actionable. | Environment/migration proof, deployed smoke test and request-ID/log correlation. |

Protected reads and writes use the approved tenant or actor database context, with no service-role import outside the platform module and no application tenant filter substituting for RLS. Inspect view/function privileges, pooled connection context reset, cache tenant/version keys and audit transactions. Every new tenant-scoped schema change includes its policies and isolation cases in the same delivery. Cross-tenant resource requests receive the documented non-disclosing response.

Visual/UX acceptance checks computed token use, aligned numbers, readable labels, truncation with an accessible full value, one clear primary action, consistent destructive language, predictable filter/reset behavior, and focus/scroll restoration when dialogs close. Verify hover, focus, disabled and pending variants of controls, form error association and live success/error announcements. Mobile controls have adequate touch space even when desktop tables use compact rows. Consolidate duplicated badges, tiles and dialog shells only after confirming their intended variants; remove unused primitives with verified callers.

Required automated accessibility violations and manual accessibility defects must be resolved before closure. Stable state screenshots get an explicit human comparison for hierarchy, density and cross-page consistency, not only a pixel-diff result.

For time, console displays use Africa/Nairobi explicitly. Customer views use the configured workspace timezone, defaulting to Nairobi, consistent with doc 03; make the zone visible and retain UTC timestamps in storage/API and precise tooltip values. UTC host defaults are never the product policy. Nairobi midnight/date-range boundaries receive dedicated cases.

Use safe, stable server-rendered timestamps where possible; the problem is nondeterministic server/client output, not server formatting itself. Relative clocks use one initial reference and update after hydration.

Accessibility reference: [W3C WCAG 2.1](https://www.w3.org/TR/WCAG21/). Aim for 44px touch targets where practical; that is a product usability target, not an AA requirement of WCAG 2.1.

## 4. S0 · Foundation for repeatable verification

### Production language and typography, required on every surface

Added at the user's direction on 6 October. Every route and nested interaction receives a product-language and type review alongside functional refinement. This includes headings, navigation, labels, helpers, tooltips, confirmations, success/error notices, empty/loading/unavailable states, chart legends, audit sentences, exports and email.

- Write for the business owner or operator's task. Say what happened, what it means and the next useful action. Implementation terms such as table names, migrations, modules, fixtures, RLS, hydration and milestone numbers belong in developer documentation/diagnostics unless the operator specifically needs them to make a decision.
- Keep API integration terminology where it is useful, but explain it once: API credentials, permissions/scopes and assistant rules. Use one name per concept; navigation, page title, action label, confirmation and activity record agree.
- Distinguish permissions, unavailable functionality, temporary service failure and validation. Do not offer a retry for a function that has not been implemented, or promise delivery, autosave, retention, recovery or propagation without evidence.
- Prefer verb-and-object controls such as Save changes, Create workspace and End support visit. Destructive confirmations state the target, affected people, consequences, reversibility and where the change is recorded.
- Preserve input on failure, associate errors with fields, announce results, and make the recovery action reachable by keyboard. Do not hide critical explanations in hover-only tooltips.
- Replace ambiguous financial abbreviations with readable labels and explicit basis. Contracted subscription value is different from money received; estimated amounts and incomplete history say so beside the figures and in exports.
- Ordinary account data has no source badge or dot. Label example data and unavailable data explicitly. Explicit preview mode may show examples; a failed authenticated read cannot turn into an example success.
- Review typography at the rendered sizes: serif for the intended headings, UI face for prose/controls, mono for identifiers and values people compare. Avoid tiny uppercase paragraphs, decorative text shadows, clipped helper text and weight changes that exceed the current approved canon. Keep sentence case and consistent label/body/helper hierarchy.
- Verify long names, narrow screens, the approved theme, zoom and text expansion. Numeric alignment, locale, units, precision, dates and timezone are part of the type/readability review.

Doc 10 is the shared terminology and copy source. Update it with changed product strings, while preserving API error codes and developer contracts. Each doc 26 surface record gains a copy/type review result; the additional J29/X07 checks below are release obligations, not optional polish.

**Environment decision:** the user selected a local disposable environment. **Service decision:** a separate private [FastAPI development repository](https://github.com/Charanos/alcassa-service) has been provisioned; its foundation is implemented, while the full agreed service door remains open. See doc 26 for execution evidence.

### 4.1 Baseline and design authority

- Inventory current branch, changed/untracked files and migration journal; identify the intended release candidate without discarding ongoing work.
- Restore typecheck, lint, dependency/policy checks and production build. Record failures by source rather than hiding them with type casts or skipped tests.
- Capture test totals from an actual machine-readable run, including passed/failed/skipped and per-table isolation coverage. Do not substitute source case counts for executions.
- Establish a token/component reference from current `03`, `18`, `21`, `22`, runtime CSS and brand handoff. Reconcile conflicting historical rules in `11` and any stale lint configuration.
- Select existing shared page/header, fact strip, figure, section, panel, data table, status, filter, pager, form, drawer and dialog components. Document intended differences instead of forcing visually similar but behaviorally distinct components together.
- Correct tracker copy only to supported claims. Historical client updates remain historical records; add a current dated assessment instead of rewriting their past.

The unified language is the current aLcassa brand and existing strongest components. This pass refines consistency and usability; it does not invent a new visual identity. Use current type roles, semantic statuses, blue action/focus treatment, restrained accents and the distinctive support boundary. Confirm actual computed colors/weights/radii, including inverted chrome against the approved page theme.

**Current canon clarification:** `03` and its later applied sections, together with `src/app/tokens.css`, govern the product. It has one cream page theme with constant inverted console chrome; adding a dark mode is outside this plan. Current UI tokens allow 400/500 with a 500 ceiling. The stale 400-only instruction in `11` and the conflicting Lilex 700 entry in `03` have been reconciled. Continue checking actual token/type use and reference screenshots per surface; this clarification is not blanket visual acceptance.

### 4.2 Verification harness deliverables

Create planned commands `verify:surfaces`, `test:e2e` and `test:contract`, plus a documented load invocation. These do not exist at this baseline; keep existing `verify`, `test:isolation`, `test:cache-disabled` and `build` gates.

The harness must:

- Use a route/scenario manifest that includes dynamic detail, provisioning, Inside and every Phase One dependency. Fail when an in-scope discovered page/action lacks coverage.
- Run browser journeys with real owner/operator sessions. Designed/demo mode is a separate visual scenario and cannot satisfy functional acceptance.
- Capture console/page errors, unexpected network failures, axe findings, whole-document overflow, screenshots and traces for failure diagnosis.
- Capture the approved single theme at the five baseline widths for default states, including inverted chrome/support framing; run every distinct state on desktop and phone, and more combinations where a breakpoint changes behavior. Include compact/comfortable density and reduced motion.
- Use Chromium for the full suite; cover essential identity, forms, overlays and upload flows in Firefox/WebKit before release, with an actual mobile smoke pass where available.
- Keep browser route response timing separate from load-service timing. Run performance against a production build, not development compilation or screenshot runtime.
- Produce machine-readable results and a human summary. Retain named scenario, role, route, viewport, theme, build SHA, schema version, start/end time and artifacts.
- Disable motion/fix reference clocks for visual baselines only. Run separate real-clock expiry, motion/reduced-motion and midnight-boundary checks.
- Add focused structural checks for privileged readers, unauthorized fixture fallback, audit vocabulary completeness and duplicate/shared component drift. Structural checks supplement behavioral tests.

### 4.3 Environment and fixtures

Use disposable local/CI Postgres for fast policy and integration checks, plus an isolated full-stack environment with Auth, Storage, email testing and the service API for browser acceptance. A database-only fixture cannot prove Supabase Auth or avatar upload.

A Supabase branch is one option; use it only after confirming availability and cost. A separate test project is the alternative. [Supabase branching documentation](https://supabase.com/docs/guides/deployment/branching) describes isolated environments; credentials and provider configuration still require deliberate setup. Do not point destructive scenario runs at the production database.

Fixtures include two tenants with identifiable distinct data; owner/admin/agent roles; two platform operators with different capabilities; missing/suspended/closed tenants; empty and large portfolios; every subscription state; at/over/unlimited entitlement usage; expired/revoked/accepted invitations; scoped/revoked credentials; concurrent rules versions; open/extended/customer-ended/colleague-ended/expired support visits; and more than 2,000 audit rows with timestamp ties.

Use deterministic labels, amounts and timestamps. Test credentials come from environment/CI secrets and belong only to the isolated environment. Setup and teardown are idempotent and run-scoped; cleanup never deletes unrelated rows. Record failed cleanup and the surviving run IDs.

Before testing migration 0004, review its subscription backfill for existing tenants, missing/duplicate Pro plan rows, expired trial dates, rerun safety, audit obligations and transactional rollback. A missing subscription must not be silently converted into a trial without the approved lifecycle rule. Prove both fresh installation and upgrade from the prior schema. Confirm policies and privileges for the new operator read watermark as well as the subscription fields.

### 4.4 CI and evidence gate

Keep the existing static/build, isolation, full test, cache-disabled and dependency-audit jobs. Add browser/accessibility and contract jobs, with an authenticated preview environment and isolated fixtures. Load tests run as controlled candidate qualification, not on every documentation change.

Missing configuration, missing fixtures, skipped required cases and unavailable environments are explicit failures or pending evidence. They cannot result in a green release gate. Confirm actual branch-protection requirements and latest CI results rather than inferring them from YAML.

S0 exits when the baseline is green, the manifest covers scope, the full-stack fixture can log in as operator and tenant owner, evidence artifacts are reproducible, and design authority is documented.

## 5. S1–S3 · Console and peripheral work packages

Every row below also inherits section 3. Exact cases and evidence slots live in doc 26.

### 5.1 Platform

| Surface | Implementation and verification work | Acceptance example |
| --- | --- | --- |
| Overview `/platform` | Trace workspace/member/subscription counts, capacity, collection queue, insights and recent actions. Resolve designed insights. Reconcile all totals with roster/plans/value pages. Align header, bands, section hierarchy and loading composition. | Provision, change plan and suspend a fixture; affected counts and actions update, and independent DB expectations match. |
| Workspaces `/platform/tenants` | URL-backed search/filter/sort/paging, correct badges/counts, contained mobile table or cards, accessible row actions and full export semantics. Replace unsourced event zeros with unavailable/unmeasured states. | Search finds a tenant beyond the initial page; back/refresh preserves controls; displayed IDs/actions/export refer to that tenant. |
| Detail `/platform/tenants/[id]` and drawer | One source of truth and equivalent content/actions across full page and drawer. Verify route tabs/deep links, owner/team data, contract basis, alerts, overrides/reasons/expiry, suspension confirmation, reactivation and support entry. | Two operators edit the same record; stale edits receive a conflict. Every successful tenant-affecting operation has the expected two audit records. |
| New workspace `/platform/tenants/new` | Validate slug/owner fields, uniqueness, provisioning transaction/recovery, delivery status, limits/default subscription, invalidated lists/switcher and correct audit tenant attribution. | Invitation to first successful login takes under two minutes with no manual DB edits; failed email does not claim delivered. |
| Plans `/platform/plans` | Read definitions/headroom from consistent sources. Verify capability, impact preview, limit change, downgrade below current usage, unlimited/zero edge semantics and charts/text alternatives. | Preview affected tenants matches independent fixtures; concurrent seat invitations cannot exceed the enforced limit. |
| Contracted value `/platform/revenue` | Complete existing arithmetic/reader/model work. Wire the page, overview, detail and CSV consistently; label contracted amounts and distinguish inferred arrears from invoices/payment collection. Separate priced/unpriced/trial/cancelled/suspended cases and real empty/error states. | A negotiated monthly amount and an annual plan produce independently specified totals; no trial contributes to billed value; no absent history creates an unlabeled trend. |
| Master rules `/platform/ai-rules` | Publish/diff/history/rollback, expected version, capability enforcement, inheritance count, locked/overridable fields and clear precedence. Tenant cache/ETag effects join M4a proof. | A stale edit is refused; rollback creates the documented version event; an affected tenant receives the new effective version through the service API. |

Contracted-value tests cover month/year/multiple intervals, null versus zero negotiated amounts, Custom without a price, rounding/overflow, missing/retired plans, missing subscriptions, cancelled-at-period-end versus immediately stopped, suspension/reactivation, partial historical audit coverage and Nairobi month boundaries. Compute expected amounts in fixture specifications rather than reusing the production calculator as the test oracle. No payment gateway, retries that imply charging, or invented invoice reconciliation is added to Phase One.

### 5.2 Operations

| Surface | Implementation and verification work | Acceptance example |
| --- | --- | --- |
| Health `/platform/health` | Separate live isolation/dependency probes from designed history/service/incident data. Connect existing `/api/health` where appropriate. Do not infer uptime or incidents from one liveness request. | Required database failure is observable; optional cache loss preserves correctness; freshness/source labels accurately describe each band. |
| Audit `/platform/audit` | Stable pagination with `(occurred_at,id)` ordering, URL filters/date boundaries, readable action vocabulary, before/after redaction, detail/workspace links, export scope and large datasets. | Paging while new events arrive loses/duplicates no records; customer-ended/expired/refused visits have accurate language. |
| Support register `/platform/support-sessions` | Open/reason, scoped access, register/search/filter, extend, end, expiry and all actor variants. Verify status updates and customer notices after transaction commit. | Open, work, extend, customer-end, colleague-end and timeout each update register, timeline, platform log and customer log correctly. |
| Inside `/platform/inside` | Full boundary/frame, visible actor/tenant/reason/remaining access, explicit exit, allowed views/actions, prohibited credential/secret access and next-request expiry/revocation. | Two tabs attempt a write after the owner ends the visit; both are refused, and no state/success audit survives. |
| Admins `/platform/admins` | At least two real operator fixtures, capability visibility, permissions enforced on direct requests, identity/activity links and honest membership-management affordances. | A restricted operator cannot gain capability by crafting an action request or accessing another operator's private session/profile data. |
| Settings `/platform/settings` | Persist, validate, last-changed metadata, concurrent-edit refusal, export links, break-glass entry/release, reason and scope. Preserve warnings until resolved. | Break glass closes applicable open support visits in both logs; stale requests cannot re-open one; release is audited and restores only intended access. |

Use a table-driven support scenario matrix: normal end, extension twice, expiry while idle, expiry during mutation, customer termination, colleague termination, platform break glass, operator revocation and workspace suspension. Assert the documented policy for each instead of assuming every state has the same termination behavior.

### 5.3 Peripheral console, identity and system states

| Surface | Required verification |
| --- | --- |
| Profile `/platform/profile` | Name update reaches chrome and persists after new login; avatar crop/upload/type/size/access policy and failed replacement; password reauthentication, recovery email and other-device revocation; current/other device handling; paginated activity; truthful capability/limits display. No double-revocation confusion between a login device and a support visit. |
| Rail/header/mobile dock | Correct route/group highlighting, keyboard order, long identity/tenant names, badges from consistent readers, drawer focus/scroll, responsive collapse and whole-document fit. |
| Density/theme/collapse preferences | Persist through `/api/console/prefs`, reload and a second tab. Invalid values and another actor's identifiers cannot change preferences. Failure does not silently claim saved. |
| Workspace switcher | Search beyond the initially shown six items; keyboard navigation; correct tenant ID; no arbitrary-tenant context from URL/client payload; support lifecycle and exit remain explicit. |
| Command palette | Every visible command resolves to a real permitted route/action. Cmd/Ctrl-K, Escape, focus restoration, empty search and restricted capability states work. |
| Notifications | Replace literal notices with live facts or remove unsupported notices. If read watermark is retained, persist it per operator, distinguish new from unchanged items, and verify counts/deep links without treating it as delivery history. |
| Access pages | Sign-in, sign-up, email verification/resend, sign-up finish, forgot/reset password and invitation acceptance: valid/invalid/expired/reused tokens, wrong password, rate limiting, role landing, safe `next`, no account enumeration, and session revocation. |
| OAuth/callback | Required Google provider: prove PKCE exchange, safe redirects, trusted origin, cancellation/errors, first workspace creation and returning session/role. Disabled-provider fallback is a separate failure state. |
| Error/loading/404 | Console and tenant boundaries preserve the correct frame, safe retry and sign-out paths. Test nested errors and full root/global error. Skeletons match actual bands and drawers without broken focus or large layout shifts. |
| Exports | Resource allowlist, authorization, live/design source truth, column/row/filter semantics, audit event, redaction, CSV quotes/newlines/Unicode/formula prefixes, correct MIME/filename and large output. Unauthorized export cannot leak data. |
| Demo/health/cron | Demo bypass refused in production; health reports only safe data and correct dependency state; reconciliation requires trusted scheduler authorization, reports drift and follows its stated repair policy. |
| Tracker/docs/legal links | Current status notes correspond to demonstrated gates; links and document navigation work; commercial numbers/accepted decisions are preserved; published product statements do not claim unsupported behavior. |

## 6. S4 · Customer Activity as end-to-end evidence

Customer Activity is a first-class Phase One surface. Its completion requires real customer authentication and tenant-isolated reads, not the console's Inside view alone.

### 6.1 Data and presentation contract

- Define a typed customer activity reader returning stable event ID/time, safe actor display, category, entity reference, permitted before/after fields, support visit correlation and a cursor. Do not expose internal IPs, secrets or platform-only metadata by copying the platform log wholesale.
- Render plain language using a customer-facing vocabulary mapped to the audit action catalogue. Test every action used in Phase One; unknown/new actions receive a safe readable fallback and diagnostics.
- Group support events by the existing visit/session ID where present. Keep underlying chronological events available in drilldown; grouping cannot obscure individual changes, refused actions or who ended access.
- For older events without correlation IDs, show honest standalone items. Do not guess a visit relationship from similar actor names or nearby timestamps.
- Show actor, what changed, the permitted before/after values, reason where safe, and when. Lifecycle views include entry, permitted work, extensions and normal/customer/colleague/expired endings.
- Use explicit live/designed/unavailable state and appropriate failure handling. No fixture activity may appear as real customer history.

### 6.2 Controls and retention

Provide URL-backed category/support-only filter, date range, stable cursor paging and clear counts/ranges where known. Preserve query state on refresh/back and when opening an event. Distinguish never-used activity from no matching activity.

Display workspace timezone explicitly, default Nairobi, and test midnight plus inclusive/exclusive range boundaries. Retention has two separate obligations: which rows the UI exposes under a plan, and what the storage/lifecycle policy retains. Implement/document the approved cutoff and deletion/archive policy. Never imply that rows are deleted because the page stopped showing them. Verify whether any actual retention job already exists before adding one.

Handle plan retention changes consistently, including support visits spanning a cutoff. The list and detail must use the same authorization and retention rules. Secret fields stay redacted in list, detail, export, logs and support mode.

### 6.3 Audit coverage across doors

| Operation | Platform evidence | Customer evidence |
| --- | --- | --- |
| Provision/plan/override/suspend/reactivate | Actor, target tenant, reason, intended before/after and request ID | Relevant workspace change, readable actor and safe before/after. |
| Support lifecycle and supported writes | Visit correlation, actor, scope, expiry and end cause | Linked visit and changes, identity/reason, clear end cause; customer can end an active visit. |
| Company/team/invitation changes | Platform audit only where platform/support performed the operation | Correct customer audit for ordinary tenant operations and support operations. |
| Credential mint/revoke/rotation | Where contract requires platform visibility, metadata only | Name/prefix/scopes/event, never the secret or hash. |
| Tenant/master rule changes | Master/global events in platform audit | Tenant edits, and master effects only according to approved audit semantics; do not fabricate one tenant event per global change without that rule. |

Successful tenant-affecting platform mutations require both contractual audit trails. Customer-originated writes do not automatically require duplicate global audit rows; use the documented model. For email/provider work performed after commit, failure records delivery status without rolling back a successful provisioning or inventing a second domain mutation.

S4 exits when every preceding console-to-customer scenario can be followed from its platform action to the correct customer-visible evidence, with an unrelated tenant demonstrably unable to read it. S5/S6 add their events to the same regression suite.

## 7. S5–S6 · Finish the remaining Phase One functions

### 7.1 M5 · Tenant settings and credentials

Complete audited company persistence with validated company name, contact, timezone and locale; expected-version/concurrency behavior; role restrictions; existing tenant context; and shared reads throughout the shell.

Implement the credential module and route/UI contract around the existing schema:

1. Validate name/scopes and enforce credential limit transactionally, including concurrent mint attempts.
2. Generate a high-entropy secret, store the approved hash/prefix/metadata and reveal the value once only in the successful creation response. Adapt the current action result type; a generic success notice cannot carry the reveal-once contract safely.
3. List metadata only. Test recursive secret/hash scans in all responses, server/client logs, audit payloads and telemetry. A deliberately authorized copy action is explicit; persistence in application storage is forbidden.
4. Verify credential authentication and scope before a service handler. Tenant identity comes from that verified credential, not a caller-supplied tenant ID.
5. Revoke and test immediate next-request refusal with normal cache, cache disabled and a previously warmed scope lookup. Rotation creates a new key and ends the previous key according to documented overlap behavior.
6. Record last-use metadata without leaking the secret and without adding an unbounded write/query burden per request.
7. Prove support mode and unauthorized tenant roles cannot mint, reveal, read or revoke credentials beyond their agreed scope.
8. Verify team/invitation/ownership transfer and account/session dependencies, subscription visibility, settings redirects and appearance persistence needed for Phase One. Do not add Phase Two inbox/dashboard features.

M5's demo creates a credential, reveals it once, confirms every later route returns metadata only, exercises a scoped request, revokes it, and shows the corresponding customer activity. The creation exception and later plaintext prohibition must be stated consistently across docs 07/11/12.

### 7.2 M4a · Rules API, freshness and seams

D-14 and ADR-012 remain the governing boundary: Next.js owns session/dashboard operations and FastAPI owns the machine service door. No separate FastAPI repository was inspected here. Discover/review it if it exists; otherwise estimate and implement the missing service within the recorded Phase One obligation. Resolve the existing staffing/effort decision explicitly instead of claiming the API is complete from a dashboard action.

- Resolve canonical external routes and any proxy prefix in doc 07. Include the agreed service rules, tenant and health endpoints. A second unrelated Next.js rules endpoint does not satisfy this architecture by itself.
- Wire tenant publish with validated edited fields, change note and expected version; use append-only versions and transactional auditing. Preserve master locks/precedence and expose effective rules/provenance correctly.
- Share canonical schema/contracts and deterministic conformance fixtures between TypeScript and Python. If code cannot literally be shared across runtimes, enforce identical policy outcomes by cross-runtime tests.
- Generate actual OpenAPI from implemented schemas on both services; test methods, paths, payload/error envelopes, status codes, auth/scopes, rate limits and reserved seam behavior. Server Actions are exercised as actions rather than falsely claimed to be public REST endpoints.
- Include both tenant and master versions in strong ETags. Assert `200` content, unchanged `304` with no body, locked/provenance fields and correct conditional semantics after tenant publish, master publish and rollback.
- Invalidate/version the compiled cache explicitly. Exercise cache misses, outage, disabled mode, warmed stale values, concurrent publish/read and master-wide invalidation. Reconcile the five-second requirement with older text allowing 300-second worst-case freshness; degraded behavior needs an explicit approved contract, not a hidden exception.
- Measure from committed publish to the first API response containing the expected version/content. Demonstrate both tenant and master edits within five seconds over repeated runs with a real service credential; report all samples, maximum and failures.
- Prove the knowledge-base and customer-record seam tables participate in migration, policy, isolation, redaction and contract checks. Keep channel processing, messaging, AGNO orchestration and the inbox experience in Phase Two.

M3's pending service-door entitlement/scope proofs are rerun here, so the two-door acceptance condition is actually closed.

## 8. S7 · Release qualification and operational readiness

### 8.1 Production candidate

Use an isolated staging environment with the same application/service topology and intended policies, migrations, Auth/Storage integrations and cache behavior. Document permitted differences such as email sinks and test credentials. Verify a fresh deployment and an upgrade against a pre-change database before promotion.

Deploy migration and application changes with an explicit compatibility sequence. Verify least-privilege app access, RLS/grants/views, support restrictions, indexes and migration backfills. Exercise app rollback separately from database recovery; never assume a down migration can safely undo new customer data. For the uncommitted 0004, record affected rows and audit implications before any application.

Check production configuration by presence/validity without emitting secret values. Prior documents flag email delivery, database password rotation, staging and provider setup; their current status requires fresh evidence. Seed/default passwords and demo cookies must not grant production access.

### 8.2 Performance and resilience

Run doc 11's required p95 below 400ms at 50 concurrent sessions on the required tenant dashboard/settings routes, even though wider dashboard refinement is Phase Two. Include list/detail/audit/service workloads relevant to the console; define their agreed budgets and measure console request latency against doc 09's budget separately. Publish environment, topology/region, data volume, warm/cold profile, request mix, duration, throughput, error rate, p50/p95/p99 and slow query findings.

Performance cannot be passed by omitting failed requests or measuring only one fast endpoint. Correctness assertions run during load. Profile indexes, fan-out, pagination, response size and cache misses before proposing infrastructure changes.

Exercise database unavailable, Redis unavailable/disabled, email rejected/delayed, storage denied/unavailable and service unavailable. Define visible user recovery and alert behavior. Test retry safety, transaction rollback, no connection-context leakage and no success audit for rolled-back writes.

### 8.3 Observability, security and recovery

- Prove request IDs connect browser/API failures, Next.js and FastAPI logs, audit rows and error monitoring. Scan seeded secrets/customer values for forbidden log/telemetry exposure.
- Connect real health/uptime probes and status communication. Display historical uptime, queues and incidents only from actual sources with timestamp/freshness, or explain their absence.
- Review direct capability/role enforcement, session cookies/CSRF/origin checks, redirect validation, credential scope checks, rate-limit behavior, export injection, avatar access and dependency advisories.
- Record required security fixes and verify them on the candidate. Real secret rotation follows the operation's runbook and configured ownership; documentation cannot count as rotation.
- Perform a staging backup/restore drill with measured recovery and integrity checks. Prove break-glass entry/release, suspended-tenant recovery, operator addition/removal, credential rotation and reconciliation handling.

### 8.4 Handover

Complete README, environment reference, actual merged API contract, schema/RLS reference, architecture decisions, adapter/seam guide, deployment/migration/recovery/rotation runbooks and an accurate tracker. Link evidence to the shipped version.

Run the under-30-minute setup test with a developer new to the project, README alone, covering Next.js and FastAPI. Record stalls and fixes; repeat failed runs. Deliver the chaptered walkthrough and agreed live handover session. Record Brian's acceptance and the 30-day support arrangement without changing commercial or contractual terms in this plan.

## 9. Original Phase One acceptance conditions

These are the eleven recorded definition-of-done conditions in doc 11, with release proof. Also apply its accessibility and milestone-specific gates.

| Condition | Required release proof |
| --- | --- |
| Every tenant-scoped table has RLS and failed cross-tenant read/write coverage | Migration/policy inventory plus actual per-table isolation results, including seam and credential tables. |
| Provisioning invitation to first login under two minutes | Real browser lifecycle with measured duration and no manual DB work. |
| Every qualifying write has complete audit | Per-module/action map plus transactional audit assertions with actor/tenant/entity/before-after/IP/request ID according to the approved audit schema. |
| Credentials not retrievable in plaintext | Reveal-once creation exception documented; later responses, support paths, logs and audit recursively scanned. |
| p95 below 400ms at 50 concurrent sessions | Candidate load report for required tenant dashboard/settings routes, including errors and correctness assertions. |
| New developer runs locally under 30 minutes | Timed clean setup of both services, README alone, actual reviewer/result. |
| OpenAPI matches implementation | Generated contract and passing endpoint conformance suite on both doors. |
| Rules change visible through API within five seconds | Recorded committed-write-to-read timing for tenant/master publish and rollback with expected versions. |
| Correctness holds with cache disabled | Complete applicable suite with cache disabled, no skipped mandatory cases. |
| Missing scope rejected before handler | Per-scope negative matrix and evidence the protected handler did not execute. |
| Both seam tables pass isolation | Included in the same generated/live isolation suite and report. |

## 10. Execution management and completion rule

### 10.1 Ownership and review

Use the existing two-developer split: backend/isolation owner handles schema, policies, entitlement/audit invariants, credential verification and service integration; UI/identity owner handles console/access/customer activity and browser coverage. Both review shared contracts and critical boundary changes. FastAPI ownership and remaining effort must be resolved at S0. The project lead maintains the evidence ledger and coordinates acceptance; the client accepts milestone demonstrations.

Each work package is a small reviewable change with its implementation, contract/doc updates and necessary tests. A source fix is **implemented**; it becomes **verified** only after its required checks pass. It becomes **accepted** only when the appropriate acceptance evidence exists.

### 10.2 Defect and evidence rules

- **P0:** isolation, secret exposure, unauthorized privileged mutation, corruption or unsafe production access. Blocks all release.
- **P1:** build failure, broken milestone journey, missing required audit, misleading financial/data claims, failed required performance/contract gate or inaccessible core flow. Blocks Phase One closure.
- **P2:** material UI inconsistency, incorrect state, responsive/accessibility defect outside the core journey, confusing customer activity or broken peripheral control. Required in-scope fixes remain open; document any explicitly accepted deferral.
- **P3:** minor cosmetic issue. Track to closure or explicit acceptance; do not silently discard it under a production-grade claim.

For each defect record source, reproduction, expected/actual, affected role/state, severity, owner, fix and retest artifact. For each passed case record build/environment/schema/fixture/test/artifact. Retries are visible; a later pass does not erase flakiness or the first failure. Reviewed visual baselines must not merely approve the current bug.

### 10.3 Estimates and dependencies

Do not carry forward the historical two-week estimate as a commitment. Size work after S0 resolves the source/build baseline and confirms the service repository, email delivery, isolated environment, design authority and migration state. Estimate implementation, fixture/harness work, verification, remediation and handover separately. Publish a range with dependencies and update it after each stage's evidence.

The critical dependency chain is: green candidate and full-stack fixtures → Platform → Ops → peripheral/access → customer Activity → credentials/company → tenant rules + FastAPI service door → full regression/load/recovery → handover. Environment/provider setup and service discovery begin early; customer Activity is rerun after M5/M4a because those add new events.

**Phase One is complete when:** every scoped surface/action has its required evidence; all eleven original conditions and milestone gates pass; unresolved P0/P1 defects are zero; remaining in-scope defects are closed or explicitly accepted; data/visual/audit behavior is consistent; staged upgrade/recovery and deployed smoke checks pass; handover is usable; and acceptance is recorded. Broader tenant dashboard work starts as Phase Two after this closure record is complete.


## 11. Added execution scope — console refinement, 6 October 2026

Apply doc 03 section 28 across Platform, Ops, workspace detail tabs, Profile, settings, support visits and every shared summary component. The user explicitly requested a complete console refinement, including inverted dotted KPI surfaces, quieter background artwork, alternating major-section headings, stronger grouping on workspace details, and production language. This is part of the existing per-surface acceptance gates, not a substitute for CRUD and data verification.

Sequence: establish shared primitives; remove live/fixture ambiguity; restructure workspace overview/subscription/activity; apply to directory, plans, health, audit, administrators, support and profile; verify authenticated pages at desktop and phone widths; exercise their real actions and failure states; record defects and evidence in doc 26. Broader customer dashboard redesign remains Phase Two.

## 12. Confirmed continuation order — 7 October 2026

1. **Restore all CI gates on a reproducible candidate.** Resolve the dependency audit findings with compatible maintained versions or reviewed remediation; preserve the moderate-severity gate. Correct the plain-PostgreSQL CI/provider mismatch so the complete policy catalogue applies and database suites actually execute. Do not suppress Storage policies to obtain a green result.
2. **Close data and concurrency defects.** Refine unlimited/unknown seat limits, missing entitlement behavior, active overrides and plan previews; verify stale previews, concurrent subscription writes and stale rule edits. Correct the remaining misleading suspension consequence and audit-report language.
3. **Complete every Platform, Ops and peripheral surface.** Cover all detail tabs, Profile, shell, settings and access flows. Exercise actual CRUD, pending/error/empty/conflict states, exports, desktop/phone layouts, keyboard/focus and accessibility. Refine typography, copy, spacing and component hierarchy against the agreed visual direction.
4. **Reconcile customer Activity and remaining settings journeys.** Verify each relevant operator/customer write and safe attribution in both interfaces, including provisioning, support visits, company/team/account changes and credential lifecycle. Complete reveal-once, scopes, limits, rotation, revocation and redaction evidence.
5. **Finish rules and the FastAPI service door.** Implement and verify authentication, scope refusal before handlers, effective-rule precedence/versioning, OpenAPI conformance, ETags, seam isolation, cross-runtime limits and propagation within five seconds. Resolve the published service base path consistently.
6. **Qualify release and handover.** Finish provider delivery/readiness, full regression, required load and p95 checks, dependency/security review, failure recovery and backup/restore, deployed smoke checks, the timed clean setup and usable runbooks/walkthrough. Record acceptance only after the eleven original conditions and all scoped milestone gates pass.

Keep this order active through remediation and retesting. Retain failed attempts and dependencies in the ledger. The wider tenant dashboard stays in Phase Two; required Phase One boundary/load regressions still apply.

## 13. Service and operational checkpoint — 8 October 2026

Application `d9450d5` passed all six CI jobs and deployed successfully. Service
`9ac88bd` passed both CI jobs, including its 20-case database suite and five live
Node-to-HTTP checks against pinned application `d9450d5`. Private checkout now
uses a read-only, single-repository deploy key on trusted main pushes. This closes
the private integration CI access gate; it does not close merged API conformance.

The approved disposable owner browser verified real credential creation,
one-time reveal, a downloaded replacement, recorded grace, and final revocation.
Both keys returned 401 after revocation and the allowance counter returned to zero.
Clipboard contents were unavailable through browser automation; that acceptance
case remains open. Successful replacement exposed lost focus when its trigger
disappeared. The corrected candidate passed native replacement/revocation focus
replays, with every disposable test key left revoked.

The operational follow-up passes 21 service cases, including a real connection
outage with safe 503 responses, request correlation and retry guidance. Its
hashed runtime dependency audit reports zero known findings. Wider provider,
Redis and backup recovery, usage persistence, tenant publishing/propagation,
hosted service, complete browser/accessibility acceptance, load and handover remain
open. Current local and Vercel environments are development sandboxes; these
quality checks do not constitute production launch or client acceptance.

## 14. Workspace rule publication checkpoint — 8 October 2026

The next M4a checkpoint replaces the tenant editor's example history with recorded
instructions. Publication validates six structured fields and a required change
note, preserves platform safeguards and rejects stale workspace/platform revisions.
Retention archives older versions; restoration moves the live pointer without
deleting history. Pointer, content, usage and audit changes are transactional.

The complete cache-disabled regression passes **506/506 tests in 39 files**, with
no skips. Twelve real-database lifecycle cases cover concurrency, isolation,
immutability, retention/overrides, restoration, missing safeguards and audit failure.
Six HTTP boundary cases, five bounded line-comparison cases and three confirmed-action cases also pass.
Twelve actual workspace/platform publish/restore operations reached FastAPI within
five seconds; the latest local maximum was **1,053 ms**. These measurements include
the write invocation, commit and effective HTTP response. They are not load p95.

The hosted development sandbox received only two reviewed rule-policy replacements
and the invoker-rights immutability trigger. Table grants and forced RLS were
preserved; no-context reads returned zero rows. No customer instruction rows changed.
Native publication, comparison, restoration, stale-draft preservation, keyboard
focus and desktop/phone layout checks pass in the disposable owner workspace.
Activity records prior/restored versions and change reasons; sidebar navigation
keeps stable targets in collapsed mode. Temporary credentials are revoked and the
original platform pointer is restored. The qualified code checkpoint passed all six
application CI jobs and Vercel deployment; the pinned service passed both CI jobs,
including all twelve propagation samples (maximum 89 ms). Exact release links and
readbacks are recorded in ledger §24.

Shared rate budgets, usage rollup, hosted service, merged OpenAPI conformance,
complete Platform/Ops/accessibility coverage, provider delivery, monitoring, load,
backup recovery and handover remain open. Milestone percentages and acceptance
are unchanged by this implementation checkpoint.

## 15. Milestone closure order and evidence publication — 8 October 2026

The tracker follow-up reassesses Tenant settings to 70%, AI rules and seams to
75%, and Handover preparation to 40%, producing an 81% rounded engineering
estimate. Two of eight milestones are complete. The verification record at
`/project-tracker/verification` now exposes reviewed test catalogues, measured
service checks, revoked-credential readbacks and browser images with fingerprints.
The current local regression passes 519 cases in 41 files; its scope and baseline
are distinct from the qualified 506-case CI reference.

Complete every outstanding Phase One milestone checklist and acceptance gate
before landing-page refinement or wider tenant dashboard/shell polish. Close
shared rate budgets and usage persistence, team/account journeys, the remaining
Platform/Ops/peripheral action and accessibility matrix, then load, monitoring,
recovery and handover qualification. Build, update evidence and push each verified
checkpoint. A checkpoint advances assessed progress; only a complete milestone
demonstration advances completion to 100%.

Service hosting verification remains local at the user's request while Vercel
access is unavailable. Retain hosted topology as a visible open dependency; local
qualification does not demonstrate a deployed service.

## 16. Team gate checkpoint — 8 October 2026

Tenant settings is now assessed at 75%. The current local regression passes 545
cases in 43 files, including 21 real-database membership cases and five team-action
cases. Native role reduction, suspended removal and expired invitation withdrawal
agree with audit and capacity records. Confirmed UI readback, section focus, phone
layout and review blur are verified; owned fixtures are cleaned up.

Next close provider invitation/account journeys and ownership reauthentication,
credential clipboard/error states and final secrets review. Then finish shared
service budgets and usage persistence, the full Platform/Ops/profile/customer
Activity matrix, and operational load, monitoring, restore and setup drills.
Publish evidence, build and push each qualified checkpoint. A completed test
package advances progress; acceptance still requires every milestone gate.

## 17. Account acceptance checkpoint — 8 October 2026

The qualified local regression now passes 564 cases in 45 files. Membership
restoration, typed invitation refusals and sole-owner protection pass 31 database
cases. Eight ownership-route cases and an actual provider/database transfer verify
current-owner identity, temporary-session cleanup and preservation of two existing
sign-in sessions. Tenant settings advances to 80%; Auth stays at 90% until its
complete browser lifecycle, colleague invitation and OAuth gates pass.

The record adds a separate account catalogue and evidence index. Earlier artifacts
remain immutable. Complete provider/browser account journeys and credential
failure/clipboard/usage acceptance next, then shared service budgets, the remaining
Platform/Ops/peripheral matrix and operational drills. Build and push each qualified
checkpoint. Landing-page and broader tenant-shell refinement follow Phase One closure.

## 18. Remaining gate closure plan — 8 October 2026

### 18.1 Objective, authority and environment

Complete the remaining Phase One engineering gates, demonstrate every milestone,
and assemble a handover-ready release. Execute against the disposable local
environment and the existing hosted development sandbox. This is production
readiness verification; it does not designate either environment as actual production.

Preserve the original disposable owner, accepted milestones, unrelated working
changes and immutable evidence. Isolate each new fixture by run ID, workspace,
actor and environment. Clean up only owned records, credentials and temporary
overrides. Never reseed the established browser workspace to make a test pass.

The Next.js application owns the console, customer settings and session door.
FastAPI owns `/service/v1/*`. Use the restricted application database role for
observed behavior; fixture administration must not replace the authorization
path under test. Freeze exact revisions of both repositories for every integrated
release measurement. Run suites that change shared rules pointers sequentially.

Local service hosting is the current user-directed verification scope. Real local
Auth and captured email prove the sandbox workflow; external sender DNS and
internet delivery remain a separately visible launch qualification. Production
project creation, credential rotation and final domain cutover belong to launch.
These do not prevent completing independent sandbox gates. Conversely, local
results cannot be relabelled as hosted service, public email or production uptime
evidence. Any contractual hosted-environment requirement needs its own evidence
or an explicit recorded scope decision before contractual acceptance.

Landing-page refinement and the wider tenant dashboard/shell begin after this
closure sequence. Phase One still includes tenant settings, account boundaries,
customer Activity and the minimal dashboard routes needed for regression/load tests.

### 18.2 Current milestone position and 100% rules

The ownership/recovery package in [ledger section 30](26-phase-one-verification-ledger.md#30-ownership-review-and-recovery-recipients--8-october-2026)
qualifies native owner review, refusal, transfer and fresh-role readback, plus
actual-provider recipient-existence checks. G02's wider native failure cases and
G01/G03's remaining invitation/account/OAuth journeys remain open. These estimates
reflect demonstrated work; no new milestone acceptance is recorded.

| Milestone | Current estimate | Remaining engineering closure | Completion demonstration |
| --- | --- | --- | --- |
| M0 · Design lock | 100%, accepted | Preserve acceptance; reconcile any remaining canon or adapter-signature discrepancy in G18. | Governing design and contract references agree. |
| M1 · Tenancy core | 100%, accepted | Reaffirm current migration/isolation, upgrade, restore and restricted-role guarantees through G16/G17. | Fresh and upgraded environments preserve isolation; recovery reconciles business data. |
| M2 · Auth/access | 92% | G01–G03; relevant account/profile, copy and accessibility checks in G11/G13. | Full sandbox account lifecycle, role landing and session revocation; real provider journeys, including invitation refusal/recovery. |
| M3 · Subscriptions | 90% | G05–G08 and the plans/value/limits scenarios in G09/G13. | Both doors make the same entitlement decisions under contention, expiry and cache loss; usage reconciles. |
| M4 · Platform | 85% | G09–G13; relevant monitoring truth and deployment smoke checks in G14/G19. | Complete Platform → Ops → peripheral → customer Activity matrix with correct CRUD, figures, exports and accessible states. |
| M5 · Tenant settings | 85% | G01/G02, G04/G05, company/appearance/account regressions in G11, Activity in G12 and G13/G17. | Company/team changes persist; secrets are shown once; credential use, replacement, refusal and revocation are auditable and safe. |
| M4a · Rules/seams | 75% | G06–G08; complete rules UI failure-state coverage in G09/G13 and propagation/load qualification in G15. | Actual session publication and restoration reach the actual service within five seconds, with correct scopes, precedence, ETags and isolation. |
| M6 · Handover | 40% | G13–G19 and evidence that every preceding engineering gate is closed. | Load/security/recovery/monitoring qualification, documented setup and walkthrough; final sign-off recorded separately. |

An engineering estimate reaches 100% only when every assigned technical acceptance
item has current proof, all relevant defects are resolved and its demonstration
is ready. Tracker `complete` still means the demonstration has occurred and been
accepted. A technically ready milestone may remain `active` at 100% while awaiting
its demonstration or handover sign-off, with that reason stated plainly. Do not
invent client acceptance, raise percentages for writing this plan, or use test
count growth as a completion formula.

### 18.3 Dependency order and work packages

| Order | Work package | Gates | Required exit before the next dependent package |
| --- | --- | --- | --- |
| 1 | Account and team acceptance | G01–G03 | Real sandbox identities can complete the account/invitation lifecycle; ownership and session boundaries are demonstrated. |
| 2 | Credentials and persisted usage | G04–G05 | Revealed secrets, error recovery, usage/last-use readbacks and revocation are qualified. |
| 3 | Shared service enforcement and contracts | G06–G08 | Shared budgets, durable usage and both API contracts pass against the same pinned schema and revisions. |
| 4 | Full surface/action acceptance | G09–G12 | Platform, Ops, peripheral controls and customer Activity each have a closed scenario matrix. |
| Throughout, then final sweep | Design, copy and accessibility | G13 | Each completed package passes the surface standard; final shared-component changes receive a caller regression sweep. |
| 5 | Operational qualification | G14–G17 | Dependency failures, load, monitoring, recovery and security have measured evidence and usable runbooks. |
| 6 | Handover-ready release | G18–G19 | Clean setup, documentation, exact release checks, evidence publication and milestone demonstrations are complete. |

Prepare monitoring, restoration tooling and documentation while earlier packages
run so they cannot become last-minute discoveries. Independent read-only work can
continue during CI; mutations of shared fixtures remain serialized. Close one
reviewable package at a time and publish its qualified checkpoint before moving
to the next dependent package. If a dependency is genuinely unavailable, record
its precise missing input and continue gates that do not depend on it.

### 18.4 Account, team and credential gate register

All gates below start **open**, with earlier passing evidence retained. Reuse
qualified checks; add cases for unresolved behaviors rather than duplicating tests.

| Gate | Required cases and implementation | Proof required to close |
| --- | --- | --- |
| G01 · Browser account/invitation lifecycle | New owner activation, new colleague signup, existing-account acceptance and removed-member rejoining. Invite, resend, withdraw, expired/used/unknown links, wrong signed-in identity, concurrent acceptance/withdrawal, paused workspace and provider/email failure. Verify the invited address, role and stored workspace; no account may appear successfully joined without membership and session readback. Resolve whether signup confirmation and provider cookies complete correctly under the actual configured Auth policy. | Native positive/refusal journeys with actual local Auth and captured emails; independent memberships, reserved seats, audit rows and session checks; owned-fixture cleanup. Use isolated test identities for repeatable password/setup checks; batch any genuinely user-only provider interactions into one acceptance session. |
| G02 · Ownership review | Review identity of the successor, explicit consequence and cancel path; password refusal, expired/mismatched provider identity, duplicate submit, temporary-session cleanup failure and stale owner authority. Verify exactly one active owner and both parties' fresh permissions after transfer. If no native ownership surface exists, explicitly implement the required surface or demonstrate the agreed API-only contract; do not imply browser coverage. | Real provider/database transfer, existing-session refresh proof, one audit, native review/cancel/failure evidence for the supported surface and safe successor access readback. |
| G03 · Remaining Auth/provider states | Complete signup/resend/recovery, safe `next`, protected deep links, current/other-device revocation and return after sign-out. Exercise required Google first-time signup and onboarding, returning-account continuity, safe redirect/callback/cancellation/session landing and colleague invitation continuation using a real configured sandbox provider. Provider unavailability must be truthful, but cannot close this required journey; mocked callback tests alone do not close live acceptance. Verify ambiguous provider outcomes do not cause unsafe duplicate password writes. | Real provider results plus native account/session journeys; negative direct requests; safe logs and callback/redirect configuration receipt. Explicit distinction between local captured mail and external delivery. |
| G04 · Credential UX and secrets | Clipboard success/refusal/unavailable API, download filename/content, one-time reveal, refresh/back/second-tab behavior, duplicate creation, stale limits, network uncertainty, rotation grace/cancel and revoked state. Apply phone, keyboard and focus checks to create/reveal/review/error surfaces. UI must never encourage retrying a possibly committed mint without resolving its idempotency result. | Actual native clipboard/download verification; metadata-only subsequent responses; database hash/scope/status readback; redaction scan of DOM, exports, logs and public evidence. End test keys revoked. |
| G05 · Last use and credential lifecycle under requests | Trace current last-use behavior in both runtimes. Persist legitimate successful use without an administrative connection; define whether 304 counts as authorized use. Refused auth must not fabricate success; role/workspace/subscription changes must invalidate access. Test replacement grace boundaries, warmed cache, in-flight requests, expiry, parallel reads and service restart. Define the permitted consistency window for display timestamps before implementing a batching policy. | Actual key use through FastAPI and Next.js, durable fresh-page/database readbacks, independent expected usage, revoked/expired 401/403 outcomes before protected reads and a reconciled final state. |

### 18.5 Shared enforcement and rules contract gate register

| Gate | Required cases and implementation | Proof required to close |
| --- | --- | --- |
| G06 · Shared rate budgets | Inventory public-abuse mitigations separately from tenant/service budgets and hard plan allowances. Define one key/window/unit vocabulary for Node and Python; identity comes from verified context, never a caller-selected tenant. Use atomic admission and window expiry. Alternate concurrent requests across two application/service workers, credentials and restarts; test boundary/reset, 429 headers, unrelated tenant separation and configuration changes. Preserve the documented public-auth cache-outage behavior; cache loss must never bypass durable entitlements. Specify each limiter's outage policy rather than applying one blanket rule. | A real disposable Redis-backed cross-runtime contention run, exact admitted/refused counts, no missing TTL or fresh budget from switching runtime/key, Retry-After/readback, and cache-disabled/outage tests. Mocked limiter tests alone are insufficient. |
| G07 · Durable usage and reconciliation | Define each counter's authoritative source, successful/refused request semantics, rolling/monthly versus retained limits and peak behavior. Test atomic reservation/release, idempotent retries, reset/date boundaries, concurrent writes, override expiry, lowering below usage and zero/unlimited limits. Trace service usage writes separately from read-only content queries. Reconciliation reports drift; authorized repair records actor/reason and cannot silently turn CI green. Verify scheduler authentication and repeated-run behavior. | Independently counted source rows/requests equal counters and UI; an intentionally introduced owned-fixture drift is detected, audited repair is demonstrated where supported, and subsequent report is clean. Cross-tenant and wrong-role repair attempts refuse. |
| G08 · Merged API and rules completeness | Inventory actual routes/methods and Server Actions; reconcile documented scopes, statuses, error fields, version schemas, conditional responses and authorization order with both implementations. Verify master/tenant locks, override semantics, empty/missing rules, retention, publish/restore conflicts, unsaved navigation, refused writes and history integrity. Retarget service integration CI to the intended application revision; retain previous pin evidence as history. Verify KB/customer seams for schema and isolation only. | Schema/contract cases plus actual Node-to-HTTP results, wrong tenant/scope/role refusal, 200/304 and changed ETags, publish/master change/restore content readback, pointer cleanup and twelve or more specified propagation operations each within five seconds. No failed sample is hidden by the average. |

Implementation of an atomic Redis budget must address increment/expiry consistency,
not merely port the current TypeScript helper into Python. The vendor's
[INCR rate-limiter patterns](https://redis.io/docs/latest/commands/incr/) are a
reference; the repository's tenant identity, outage and quota contracts remain
the acceptance oracle. Provider session/SSR checks follow the actual Auth policy
and [Supabase's server-side guidance](https://supabase.com/docs/guides/auth/server-side/advanced-guide).

### 18.6 Full surface and customer Activity gate register

| Gate | Required scope | Proof required to close |
| --- | --- | --- |
| G09 · Platform matrix | Overview; workspace grid/list/search/filter/sort/pagination; provisioning; workspace detail page and drawer, every query tab and action; plans, plan editor and Headroom cards/modal; contracted-value page/CSV; master rules. Cover direct/deep links, valid empty data, denied/unavailable states, slow loading, committed readback, stale reviews, double submit and two-tab changes. Reconcile every KPI, label, chart and export with its declared reader and independent fixtures. | Route/action/state rows closed in the ledger; native journeys plus authorization/data/audit checks. Every advertised CRUD control either works as described or has an explicit supported availability state. |
| G10 · Ops/support/security matrix | Health, platform Audit, support register/Inside, Admins and platform Settings. Two operators with different capabilities; start/work/extend/end, customer/colleague termination, idle and in-flight expiry, operator revocation, workspace suspension and break glass. Two stale support tabs must lose unauthorized access on their next protected request. Verify scope banner/frame, linked event histories and allowed versus prohibited writes. | Permission/scenario table with actual protected requests and both applicable logs; one terminal state under races; no success receipt for rolled-back work; correctly scoped readback after revocation. Health chart semantics and historical data provenance remain honest. |
| G11 · Peripheral and tenant settings | Platform Profile and customer account/sessions; company/appearance/subscription/settings redirects; avatar upload/crop/type/size/replacement failure/storage isolation; rail/header/mobile dock; account menu; workspace switcher beyond initial results; palette; preferences and cross-tab persistence; truthful notices/read watermark; sign-out. Include long identities and names, collapsed navigation, deep links, root/nested errors, 404s and loading boundaries. | Native save/reload/fresh-login readbacks, identity/storage isolation, direct permission refusals, keyboard/focus and phone evidence. No exposed control or visible link is left unverified. Preserve the broader tenant-shell work for the later phase. |
| G12 · Customer Activity and exports | Real owner authentication, every Phase One event vocabulary, safe actor/entity/before-after fields and support visit correlation. More than 2,000 owned events, tied timestamps, concurrent inserts, filters/date windows, explicit timezone, retention cutoff and visit drilldown/customer termination. Exports: allowlisted resources, row/filter scope, quotes/newlines/Unicode/formula prefixes, redaction, correct filename/MIME and large datasets. | No cursor skips/duplicates or cross-tenant rows; UI/export/source values reconcile; denied exports leak nothing; customer events accurately identify change actor/cause without exposing platform-only data. Retention claims have actual reader/job proof or are clearly unclaimed. |

Expand G09–G12 into the existing P/O/C/A/T surface families, J01–J29 journeys and
X01–X07 packs in the ledger. Inventory nested tabs, dialogs, menus, drawers and
responsive controls as scenarios. A successful top-level GET does not close a
surface. Check Platform first, Ops second, then peripherals and customer Activity;
use affected-surface regressions during the earlier account/service packages.

### 18.7 Design, copy and accessibility gate

**G13 applies to every package and receives one final complete sweep.** Use the
approved product tokens and overview reference as the design authority. Retain
the single cream page theme and inverted chrome. Review in the actual viewport;
screenshots do not replace interaction or data verification.

- Shared KPI bands: broadly distributed, visibly controlled dots; restrained
  background icon art; clean text contrast; no “Current data” badge or its dot.
- Structure: slim tabs and controls, coherent spacing and type scale, clear page
  hierarchy, restrained sunken grouping and intentional uncarded content. Keep
  page headers left and alternate subsequent section headings where that improves
  composition without reversing meaningful reading order.
- Review workspace detail tabs, Settings, Health, plans/Headroom cards and modal,
  profile/account, auth confirmation and email templates against the same canon.
  Charts must be functional chart components with correct units, empty/unmeasured
  states, useful labels and no text collisions; decorative SVG is not a data chart.
- Modal/drawer states: complete backdrop coverage and visible blur, safe initial
  focus, Escape/cancel policy, trapped focus where appropriate, scroll containment,
  return focus and no keyboard obstruction. Check actual computed styles and behavior.
- Type and language: use available text width, avoiding arbitrary narrow measures;
  retain readable phone reflow. Replace implementation jargon, raw enum labels,
  invented source/payment claims and unsupported “logged/saved” assertions with
  specific outcomes and useful next actions. Trim comments to concise rationale
  while preserving authorization, concurrency and architectural explanations.
- Check 1440/1280 desktop, 1024, 768, 390 and 320px breakpoints; actual browser zoom,
  long/translated-length text, keyboard-only operation, reduced motion, contrast,
  accessible names/errors/live announcements and a manual screen-reader sample
  covering each complete critical process. Tables/charts may use intentional,
  labelled keyboard-accessible scrolling; the entire page must not overflow.

Close G13 with reviewed reference images, automated accessibility findings and
manual journey evidence. Resolve all required visual/copy/accessibility findings;
do not declare compliance from a clean automated scan. Apply the repository's
[WCAG 2.1 AA baseline](https://www.w3.org/TR/WCAG21/) to full pages and complete
processes. Shared-component changes reopen affected callers for regression.

### 18.8 Operational, security and handover gate register

| Gate | Required cases and implementation | Proof required to close |
| --- | --- | --- |
| G14 · Observability and dependency failure | Required database/schema failure, optional cache loss, Auth/email/storage failure, service unavailability, slow responses and committed-write/readback uncertainty. Exercise log/request-ID correlation, error reporting, readiness versus liveness, safe health output and outage/recovery UX. Produce real alert and recovery notifications in a controlled sandbox sink; historical chart/uptime/incident values require a measured source. Document thresholds, recipient ownership and recovery action. | Injected failure → observed safe response → correlated event/alert → recovery receipt. No credentials, bearer links, passwords or sensitive bodies in logs. A status page and monitoring setup accurately describe what is measured; external pager delivery remains separately qualified if unavailable locally. |
| G15 · Load and propagation | Use production builds, 50 distinct authenticated sessions and representative owned tenants/data. Run the required dashboard/settings routes with measured request definitions, warm-up and sustained steady state; report per-route p50/p95/p99, throughput, refusals, server errors, query fan-out, connection/memory usage and cold/warm/cache-disabled conditions separately. Verify fixture/counter integrity afterwards. Repeat rules propagation while reads are loaded. | Contractual dashboard/settings p95 below 400ms and every required propagation operation within five seconds. Document whether timing measures server requests or browser navigation; include route entry/aggregation methodology and runner/runtime/network topology. Assess internal service targets separately: 304 <60ms, warm <120ms, cold <350ms p95. Do not substitute the previous 89ms single CI sample for a load result or claim hosted latency from local measurements. |
| G16 · Recovery, upgrade and rollback | Restore a full owned verification dataset into a separate disposable target, including the supported storage/configuration dependencies. Check policies, grants, definer settings, ownership, audit ordering, quotas, rules history/pointers and revoked credentials after restoration. Run clean install and upgrade from the supported prior release. Demonstrate application rollback compatibility and reviewed forward schema recovery; do not destructively roll back data to repair code. Specify recovery objectives and measure actual restore time/data loss. | Successful restored Auth/application/service journeys and independent before/after reconciliation; documented restore and rollback steps with measured recovery results. Do not invent RTO/RPO or claim production PITR from a local SQL restore. Provider-managed identities/secrets and separately stored objects have explicitly tested or documented recovery boundaries. |
| G17 · Final security and secret lifecycle | Threat-model both doors, support mode, token/cookie/origin/redirect handling, export/storage/cron/webhook seams and all user-selected identifiers. Check live permissions/limits after revocation, hashing/reveal-once, idempotency, race safety, SQL/RLS/definer exposure, dependency remediation and disabled demo bypass in a production-mode sandbox build. Scan both repos, Git/public artifacts, DOM, responses and logs. Review final config templates and service least privilege. | Required negative/security cases pass; no unresolved security/data-integrity findings or private material in published artifacts; accepted remediation records remain reproducible. Document actual-launch secret/db rotation separately rather than resetting the current sandbox during verification. |
| G18 · Documentation and timed clean setup | Reconcile README/env examples, architecture/ERD/RLS/role map, merged API/scopes, adapter/seam contract, failure/monitoring/restore/deploy runbooks, current design/copy canon and user instructions. Remove dead links and stale implementation promises. Run both repositories from fresh checkouts with documented versions and no hidden machine state. | A cold setup rehearsal records downloads, installation, migrations, seed, both runtimes and actual authenticated request. The existing handover standard requires an unfamiliar developer to reach that verified state in under 30 minutes using the README; an executor's own rehearsal is preparation, not a substitute. Record and repair stalls; arrange the external walkthrough and outstanding adapter sign-off. |
| G19 · Final release, evidence and acceptance | Freeze revisions/schema/env identity, reconcile gate assignments and defects, run required suites/static/build/security checks, document/browser smoke, cross-runtime contracts and owned-fixture cleanup. Publish bounded artifacts and demonstrate each milestone. Push explicitly to the verified `origin/main`; validate exact app/service CI pins and frontend deployment. Keep service-hosting launch qualification in its user-agreed local scope. | All technical gates verified, complete evidence manifest/download graph, exact run/deployment receipts, source parity and rollback-ready release. Technical readiness may reach 100% pending handover; client demonstrations and final sign-off determine accepted completion. Landing-page and Phase Two shell work follow this readiness decision. |

### 18.9 Evidence and tracker contract

For every gate maintain: gate ID, assigned milestone(s), scenarios, prerequisite
IDs, status (`open`, `in progress`, `verified`, or `deferred by recorded decision`),
test/native evidence references, application/service revisions, schema/policy
fingerprints, environment and fixture class, timestamps, independent expected and
observed values, defects, cleanup outcome and any untested boundary. A deferred
decision is visible; it is not a passing test.

Publish only bounded catalogues, redacted measurements and reviewed screenshots.
Each public file has a SHA-256 and an actual working download link through
`/project-tracker/verification`. Keep raw reports, fixture IDs and provider secrets
private. Add a distinct checkpoint/manifest rather than overwriting a historical
file. Test the link graph, source hashes and one actual browser download.

Update the tracker after each qualified package: explain what moved, the gate IDs
closed, the evidence and remaining work. Update milestone estimates only after
verification. The latest CI run and deployed source must match the candidate;
older successful references remain explicitly historical. A planning update adds
no completed gate and does not increase the estimate without new verification.

### 18.10 Execution checklist for each package

1. Confirm baseline, fixtures, roles, intended oracles and the exact acceptance
   rows. Recover existing proof before inventing more work.
2. Reproduce unresolved defects. Separate functional/data fixes from appearance
   adjustments and retain concise evidence of the original failure.
3. Implement shared contracts/components first where required; qualify the changed
   behavior with real authorization and data paths. Check failure, stale, retry
   and concurrent states alongside the successful path.
4. Perform native desktop/phone/keyboard checks and G13 copy/design review. For
   every mutation, verify committed state, relevant audits and fresh UI readback.
5. Run focused checks, then the applicable full regression with cache disabled,
   policies, typecheck, lint, format, declared dependencies, templates and security.
   Run service lint/format/unit/database/contracts when the service path changes.
6. Run the production build and sequential post-build typecheck. Use maintained
   local commands; do not run reset/seed preparation over the preserved browser
   fixture. Capture actual timing and cleanup results.
7. Update ledger, tracker and immutable public evidence. Verify staged contents,
   private-value absence, hashes, branch and remote. Commit/push the qualified
   package; confirm exact CI, artifact totals, deployment and affected-route smoke.
8. Close the engineering acceptance rows, reassess assigned milestones and prepare
   the demonstration. Reopen affected rows when subsequent shared changes invalidate
   their proof. Record acceptance separately from publication.

Known maintained starting commands include `scripts/verification-local.ps1 Test`,
`BuildLive` and `Serve`, `scripts/check-document-pages.ts`, `pnpm check:policies`,
`check:deps`, `check:security`, `check:email-templates`, and the service's locked
`uv` workflow. New load, distributed-budget and recovery runners must be implemented
and documented as deliverables; naming them in this plan does not make them exist.

### 18.11 Immediate next package and final readiness review

Start with **G01–G03**: inventory the advertised account/ownership/OAuth journeys;
prepare a new colleague fixture and captured invitation; reproduce wrong-identity,
confirmation and session-landing cases through the actual provider; then qualify
native acceptance/refusal/recovery and ownership review. Complete G04/G05 next,
including actual clipboard and durable last-use proof. Prepare the disposable
Redis contract and recovery tooling while these bounded packages are qualified.

Before calling Phase One engineering complete, review every remaining gate against
the record, not against its narrative summary. Require no unresolved assigned
technical scenarios, all supported surfaces/actions reviewed, data/audit agreement,
measured performance/recovery, truthful monitoring/provider scope, clean setup and
an exact qualified release. Produce a concise handover-ready statement with known
launch-only prerequisites and any explicitly accepted scope decisions. Formal
walkthrough/sign-off remains a distinct recorded event.

### 18.12 Qualified local navigation subset — 9 October 2026

The G03 navigation checkpoint passes 605 cache-disabled cases in 49 files and
native production-build sign-in, wrong-password retry, sign-out and fresh-access
refusal. Missing and stale sessions preserve the page and query; built checks cover
both local addresses, and independently observed session readback and owned-fixture
cleanup agree. Read the [verification record](/project-tracker/verification#auth-navigation-checkpoint)
and [ledger checkpoint](26-phase-one-verification-ledger.md#32-auth-navigation-checkpoint--9-october-2026).
Auth is now 93%; the rounded overall engineering estimate is 84%. These are verified
engineering estimates, with two accepted milestones and no new acceptance event.

Next complete G01–G03's colleague invitation and confirmed-identity journeys,
configured OAuth or an explicitly recorded product scope decision, full native
password-change acceptance and current/other-device session review. Invitation
acceptance must not create workspace authority from an unconfirmed provider identity
or a failed identity read. Existing accounts without an active workspace must be able
to sign in and return safely to their valid invitation. Follow with G04/G05 credential
clipboard/last-use qualification, then the remaining Platform/Ops and operational
register. The 83% values in earlier dated planning snapshots remain historical.

Maintained built acceptance: after `BuildLive` and `Serve`, run
`pnpm exec tsx scripts/check-auth-navigation.ts`, then repeat with
`AUTH_NAVIGATION_BASE_URL=http://localhost:3100`. The same two-address check is part
of the build job in CI. Keep the strict CSP and existing browser workspace intact.

### 18.13 Qualified local device-session subset — 9 October 2026

The G03 device subset passes 617 cases in 52 files, actual-provider local sign-out,
atomic database revocation/audit and native individual/bulk reviews. Current-browser
access, immediate readback, Cancel/return focus, 390px fit, blur and fixture cleanup
agree with independent database reads. See the [device checkpoint](/project-tracker/verification#device-sessions-checkpoint)
and [ledger](26-phase-one-verification-ledger.md#34-device-session-checkpoint--9-october-2026).
Auth is 94%; acceptance still requires complete password change, confirmed-identity
colleague joining and configured OAuth or an explicit product scope decision.
The exact prior navigation release is qualified in ledger section 33.

### 18.14 Combined account safeguards

626 cache-disabled local cases in 54 files now pass. Invitation identity and continuation guards and credential metadata export are verified automatically; device session native evidence remains separately linked. Keep M2 at 94% until the remaining complete password change, native invitation and OAuth acceptance gates pass. Next service batch must persist successful credential last-use through the restricted role and prove refused requests remain unchanged. Native credential feedback still needs acceptance before closing its gate.

### 18.15 Durable last-use subset qualified locally

The credential last-use subset of G05 passes 29 service cases, five cross-runtime HTTP checks and twelve publish/restore samples, alongside all 626 application cases. M5 advances to 86%. Keep shared budgets and durable request rollup open; last-use does not measure billable requests. Complete native credential feedback and final secrets review before closing G04/G05. Pin service integration to the new application policy revision and qualify both exact releases.

### 18.16 Shared-budget engineering checkpoint

Eight real Redis scenarios and the complete 632-case application / 34-case service regression pass. Tenant admission shares one atomic script and key across both runtimes; public limiter increment/expiry is atomic. Eight function search-path warnings are resolved and two extension-placement warnings remain. M3 is 92%, M4a 78%, M6 42%; M2 and M5 remain 94% and 86%.

G06 still needs native Node session-to-HTTP contention to complement authenticated Python HTTP and independent Node admission workers. Keep hosted qualification separate under the user's local-hosting scope. Next batch: qualify the exact pushed revisions, complete that Node HTTP path, then implement and verify durable request rollup (G07) without conflating throttle slots, credential last-use and billable counters. Preserve G01/G04 native acceptance and the load, monitoring, backup/restore and accessibility gates. See verification ledger section 39 for measured scope, failed harness attempts and remaining findings.

### 18.17 Operational batch — 9 October 2026

This checkpoint supersedes the open Node HTTP and resource reconciliation items
in 18.16. G06 passes eight scenarios through actual provider-backed application
HTTP and Python HTTP, including six admissions and four refusals across two
application workers and two credentials. G07 passes independent source counts,
injected drift, locked repair with actor/reason/audit, preserved peaks and repeated
report-only scheduler runs. Owner signup and activation now record their seat
within the membership transaction. All 639 application cases in 57 files pass.

Phase One resource counters are retained counts: active members plus reserved
pending invitations; active credential slots; published rule versions. Expired
invitations remain reserved until withdrawn. Credential predecessors in replacement
grace do not consume a second slot. Archived/draft rule versions do not count.
These are not monthly counters and require no calendar reset. Successful service
reads persist last-use; refused reads do not. Redis admissions and last-use are
not billable request totals. The signed Phase One subscription scope has no
payment automation or request-billing ledger; references to implementing a billable
request rollup in earlier execution notes were overbroad. Conversation metering
belongs to the later inbox implementation; no such metric is represented as measured.

M3 reaches 100% technical readiness in the agreed local service-hosting scope,
pending demonstration and final acceptance. M4a advances 78→82%, M6 42→52%.
M2/M4/M5 remain 94/85/86%. These estimates do not close the outstanding gate register.

G16 has a passing separate-target snapshot/dump/restore: 61 tables, 52 policies,
17 context functions, matching data/grants/owners and actual restored application
and service reads/refusals. Snapshot and restore measured 7,815 ms. Separate Auth
process, stored object bytes, clean upgrade/rollback and recovery runbook rehearsal
remain open; this is not a hosted recovery objective or PITR claim.

G15 remains open. Both production-build 50-session measurements are retained.
The repeat has zero server errors, refusals or source/counter drift, but dashboard
and settings p95 is 13.2–14.4 seconds against 400 ms. A diagnostic direct-provider
batch also degrades under concurrency; single-batch diagnostics are not acceptance
load results. Do not relax authentication or redefine the benchmark to close it.

Next closure batches: diagnose dependency/request fan-out; implement controlled
failure/alert/recovery delivery (G14); complete clean setup, upgrade and recovery
boundaries (G16/G18); finish provider and native surface/accessibility acceptance
(G01–G05/G09–G13); qualify exact pushed revisions and complete handover (G17/G19).
The [operational checkpoint](/project-tracker/verification#operational-gates-checkpoint)
links immutable results, failed load samples and the preceding qualified release.

### 18.18 Monitoring and browser batch — 10 October 2026

The preceding operational release is qualified at application `0b510a1` (all six
CI jobs and Vercel successful) and service `cf2a936` (both CI jobs successful,
pinned to that application). The next candidate passes 645 cases in 58 files.

G14 now has actual application and service database failure/recovery evidence:
safe readiness refusals, liveness independence, bounded retry instructions, three
failed probes to open an incident and two healthy probes to recover it. Four
notifications reached an authenticated local sink. An injected delivery failure
retained the same event ID for retry; outage/recovery correlation and an empty
pending queue were verified. Configure a durable state path, scheduler and actual
destination before claiming continuous external monitoring. The handover package
documents state ownership, locking and consumer deduplication.

An isolated Chrome context performs actual UI sign-in and reviews 32 application
surfaces at 1440, 390 and 320px. It found a missing-plan Activity error, now replaced
by an explicit plan-availability state. The follow-up verifies retained/expired
events and workspace separation, plus company save, reload, database value and
single audit readback. Route checks are not comprehensive CRUD or accessibility
acceptance. Initial failed checks remain in evidence.

M4 advances 85→88%, M5 86→89%, M6 52→60%, reflecting these demonstrated additions.
M2 94%, M3 technical 100%, M4a 82% remain unchanged. No final acceptance is implied.

Continue with the largest remaining engineering risks together: provider account
journeys and complete console/settings action states; request fan-out and the
unchanged 50-session benchmark; merged API contract; independent Auth and stored
object recovery; clean setup/upgrade/rollback; keyboard/accessibility; security
review and final handover. Keep hosted launch configuration separate under the
agreed local verification scope. The [monitoring checkpoint](/project-tracker/verification#monitoring-checkpoint)
links the complete bounded receipts and exact prior-release qualification.

The following combined browser batch completes seven owned account/colleague
workflows and focused Activity timestamp/keyboard checks at three widths. Actual
password refusal/update, provider old/new checks, current/other-device outcomes,
new/existing colleague acceptance, wrong-account/replay refusal, renewal and
withdrawal agree with independent session/membership/seat/audit readback.
Auth advances to 97%, Tenant Settings to 94%, Handover to 64%; Console stays 88%.
Confirmation-required colleague signup is still distinct from this local
auto-confirmed configuration, and external email delivery is not claimed. See the
[account workflow checkpoint](/project-tracker/verification#colleague-workflows-checkpoint).
The evidence index now includes all twelve historical/current checkpoints.

### 18.19 Auth closure and live workspace operations — 13 October 2026

M2 engineering reaches **100% in the agreed sandbox scope** after actual hosted
Google continuity from a seeded verified email-only identity and explicit Google
invitation acceptance. Provider IDs, original owner access, target Administrator
role, two seats and one join audit reconcile. Temporary test state is removed or
restored. Actual captured email confirmation completes public signup and colleague
acceptance; seven password/invitation workflows also pass with confirmation required.
Client demonstration, email-domain delivery and client-owned launch configuration
remain separate. [Read the current acceptance checkpoint](/project-tracker/verification#confirmed-onboarding-checkpoint).

M4 moves 88→90%: created workspaces appear alongside demo records, newest first in
both views; unassigned trials have accurate status; reviewed first plan assignment
creates one subscription with matching audits and concurrent/stale refusal.
M5 moves 94→96% with confirmed colleague continuation, role/seat truth and responsive
confirmation states. These values do not close broader console/settings action
states or keyboard/accessibility acceptance.

Execute the next closure batches by shared risk: (1) remaining console/settings
CRUD and failure/accessibility states; (2) service/API and latency acceptance;
(3) independent Auth/object recovery and clean setup/upgrade/rollback; (4) exact
release qualification and handover. Keep evidence attached to each result and
payment tracking unchanged: only the deposit is paid. The dated verification
ledger and evidence index distinguish historical checkpoints from this candidate.

### 18.20 Console operations and independent Auth recovery — 13 October 2026

The next execution batch implements shared suspend/reactivate controls, atomic competing status writes, truthful preview audit classification and drawer keyboard/focus behavior. Qualify its full native scenario run before closing these action states or changing the Platform milestone assessment. Keep remaining support, profile, rule failure states and complete accessibility acceptance explicit.

Independent Auth-process recovery now passes against a separate restored database target. Its provider session is created only in the restore, and application/service reads, scope refusal and credential revocation remain verified. M6 advances to 68%; object bytes, measured load acceptance, advisor findings, clean setup and handover remain open. Current regression: 720 cases, 63 files, no skips. See ledger section 47 and the evidence-index checkpoint added with this release.

The complete native console run now passes all 16 scenarios with fixture cleanup. M4 advances to 94%. Console and independent Auth recovery receipts are linked in `#console-recovery-checkpoint`; the index contains 17 fingerprinted checkpoints. Next closure batch: remaining support/profile/rule failure states and tenant credential/ownership failures, then object-byte recovery, advisor findings and measured load acceptance. Demonstrations, payment and client acceptance remain separate.


### 18.21 Console action closure and accessibility acceptance

The additional production-browser run passes all **14 scenarios**, including provisioning failure recovery, support revocation/expiry/extension/lock controls, invitation writes, profile and photo recovery, direct Storage API boundaries, first shared-rule publication, competing editors and restoration. Four modal keyboard checks pass. The cache-disabled regression passes **724 cases in 65 files**, without skips.

All **126 axe visits across 18 console surfaces and seven widths** pass without reported violations or page overflow. Actual native Chrome 200% zoom also reflows the profile page. These results close the declared support/profile/rule action failures. **Manual accessibility acceptance remains open**: review incomplete contrast findings and complete actual screen-reader samples before closing M4. Its engineering assessment advances to 98%, not 100%.

The [console acceptance checkpoint](/project-tracker/verification#platform-closure-checkpoint) links the bounded results. The index contains **18 fingerprinted checkpoints**. CI is configured to repeat both native console runners and the accessibility matrix against its disposable provider; qualify the exact pushed revision before claiming these new CI steps have passed. Hosted sandbox avatar limits were reconciled without changing existing objects or bucket visibility.

Automatic approval review blocked running the portable NVDA runtime. A signed download is prepared and the user has been asked to make NVDA available. Continue the independent tenant credential, service/performance, object-byte recovery, advisor and clean-setup gates meanwhile. Demonstration, payment and client acceptance remain separate.

### 18.22 Console engineering gate closed

M4 is 100% engineering-complete pending demonstration. Actual NVDA review and five rendered-contrast surfaces close the console accessibility review. The final provisioning opener-focus defect has its own passing production-browser regression. The verification download includes the original 14 action scenarios, final eight-scenario support follow-up, focused dismissal regression, 126 route/viewport visits, rendered contrast and actual screen-reader observations. Broader tenant accessibility and the remaining M5/M4a/M6 operational gates remain separate and retain their existing scope.

### 18.23 Joint M4a and M5 closure plan — 13 October 2026

This is the current execution order for the remaining settings/rules gates. It
supersedes the older instruction to restart G01–G03. The inspected baseline is
application `cd6fd44` and service `8163e03`; both working trees were clean before
this planning update. M4 engineering is 100%, M5 is 96%, M4a is 82% and M6 is 68%.
Planning does not increase those values or assert new passing results.

The current service integration workflow pins application `6f086a8`, an older
revision. Batch A must qualify the joint candidate against the current contract;
Batch C pins the final accepted application SHA. Retain historical passing pairs
as history rather than presenting them as current cross-repository qualification.

The shared dependency is the actual path from a tenant-created credential to
authorized effective-rule reads through FastAPI. Permissions, revocation, version
freshness, failures and customer Activity must agree across that path. Use three
execution batches, with scenario rows assigned to each milestone and existing
qualified evidence reused where behavior has not changed.

| Batch | Shared scope | Exit evidence | Milestone effect |
| --- | --- | --- | --- |
| A · Credentials, ownership and service contracts | G02/G04/G05/G08: finish credential and ownership failure states; inventory session routes, Server Actions and machine routes; reconcile authorization, schemas, errors and conditional reads. | Actual browser and HTTP outcomes, independent database/session/seat/audit readbacks, generated service schema plus merged route/action manifest, redaction and cleanup receipts. | Closes the remaining M5 security/lifecycle work and M4a contract gaps. |
| B · Tenant rules and settings journeys | G08/G11/G12/G13: unsaved navigation, failed publication/restoration, stale editors, master changes, Activity and shared accessible interaction states. | Native owner/restricted-role journeys, immutable version/audit readbacks, responsive and keyboard checks, rendered-contrast review and a short actual NVDA sample of affected tenant controls. | M5 can reach 100% when its A/B rows are closed. M4a retains its performance/freshness qualification. |
| C · Loaded freshness, latency and release | G15 and affected G08/G13/G19: optimize measured bottlenecks, verify both doors under load and qualify the paired application/service revisions. | Required p95 acceptance, every specified publish/restore sample within five seconds under load, no isolation/integrity failures, pinned cross-repository CI, successful build/deployment and published receipts. | Closes remaining M4a engineering rows and supplies evidence to M6. M6 retains its separate recovery/setup/handover work. |

#### Batch A: finish the credential-to-service path

- Use real credentials created by the tenant UI. Check successful, refused and
  unavailable clipboard outcomes; approved download filename/content; refresh,
  back navigation and second-tab behavior; duplicate submission and stale limits.
  Simulate a response lost after commit as well as a request refused before commit.
  A retry must reuse the request reference and resolve the original result.
- Verify replacement cancel/grace/expiry and revocation through both runtimes,
  including a warmed conditional read, concurrent requests and service restart.
  Revoked or unauthorized access must be refused before serving cached content or
  a 304. Reconcile legitimate last-use and applicable counters independently.
- Preserve the explicit plaintext exceptions: the successful one-time creation
  response/reveal and the user's requested credential download. Subsequent
  responses, history, Activity, logs, exports and public evidence expose metadata
  only. Check browser persistence, cleared reveal state and refused copy feedback.
  End all owned test keys revoked.
- Finish ownership cases already beyond the qualified successful transfer and
  wrong-password checks: stale owner authority, expired/mismatched provider proof,
  duplicate submission, uncertain outcomes and temporary verification-session
  cleanup failure. Require one owner, one transfer event and correct permissions
  through both parties' existing sessions after reload.
- Build an implementation-backed route/action manifest for the session and
  machine doors. Keep Server Action contracts distinct from HTTP endpoints.
  Validate methods, scopes, role/origin checks, request/response schemas, statuses,
  safe error fields, correlation IDs, ETags and retry headers. Document intentional
  differences while enforcing shared policy outcomes with canonical fixtures.
  Verify knowledge-base/customer seams at the promised migration/isolation boundary.

#### Batch B: finish the shared editing and settings experience

- Exercise tenant rules through direct links, browser back/forward, workspace
  switching and fresh tabs. Cover dirty-form stay/discard, clean cancellation,
  offline publication/restoration, lost responses, denied writes and recovery.
  Preserve drafts until the outcome is known and refresh the canonical version
  before permitting a retry that could create a duplicate version.
- Cover competing editors, changed master requirements/locks, empty or missing
  published guidance, retention and restoration. Verify the effective compiled
  values, immutable history and changed/stable ETags through the actual service.
  Each successful domain change has its expected customer Activity record; refused
  or rolled-back work has no success record.
- Sweep company, team/ownership, credentials, tenant rules and Activity as one
  affected surface family. Check owner/restricted-role behavior, loading, useful
  empty/error states, long content, phone/320px layouts, keyboard and modal focus,
  actual zoom and a short tenant-specific NVDA sample. Reuse the established NVDA
  setup and the qualified shared console components.
- Inventory every visible action and close missing pages/dialogs or interaction
  states where implementation evidence requires them. Review concise user copy,
  consistent typography and refined layout while exercising functionality.
  Recheck M4 callers when a shared component changes.

#### Batch C: loaded rules freshness and the separate M6 performance gate

**16 October scope correction:** architecture section 10 explicitly assigns the
400ms p95 dashboard/settings qualification at 50 sessions to **M6**. M4a's
contractual gate is a rules edit reaching the service within five seconds.
The earlier joint plan coupled these separate acceptance gates too broadly.
Keep the latency failure open under M6; M4a requires complete rules/service
contracts and loaded publish/restore freshness, including cache failure and
restart continuity. This correction neither waives nor changes the 400ms target.

Start diagnosis during Batch A, then run acceptance after the functional candidate
is stable. The preserved 50-session baseline failed latency acceptance; it is not
closed by the passing integrity or twelve unloaded propagation samples.

1. Separate Auth-provider verification, application/session resolution, database
   and connection-pool time, query fan-out, compilation and response transfer.
   Reuse `verification-latency-diagnostics.ts` and record a current baseline before
   optimization. Optimize measured bottlenecks while retaining live revocation,
   tenant isolation and durable entitlement decisions.
2. Freeze the candidate and run the maintained 50-session workload against the
   required dashboard/settings routes, plus the relevant rules/service workload.
   Keep the documented p95 below 400ms requirement and the applicable console
   budgets. Record topology, hardware/resources, data volume, request mix,
   duration, errors, refusals, p50/p95/p99 and throughput.
3. Measure publication and restoration during load, including master changes,
   concurrent readers, cold/warm cache, cache-disabled mode, cache failure and
   service restart. Every required operation-to-effective-read sample must meet
   the five-second gate; averages cannot hide failures.
4. Reconcile counters, versions, memberships, credential state and audit records
   after the run. Publish failed baselines alongside the final result. Retain the
   agreed local service-hosting scope and record environment limits explicitly.

#### Execution controls that reduce repeated work

- Create one acceptance scenario register mapping each open row to A/B/C, M5,
  M4a and any M6 dependency. Label prior evidence as qualified, implementation
  gaps as open and new outcomes as verified only after their assertions pass.
- Reuse one disposable provider setup and one built candidate per code revision.
  Give fixtures explicit ownership and run identity. Use isolated browser contexts
  for owner, colleague and restricted accounts; keep mutation fixtures separate
  from the client-facing demo. Confirm no temporary plans/workspaces remain after
  each acceptance batch, including error cleanup.
- Serialize tests that replace shared settings or the master-rule pointer.
  Batch independent static, schema and read-only checks where safe. Keep expensive
  load runs separate from browser/accessibility acceptance so they do not distort
  timing or produce resource-driven false failures.
- Keep targeted tests in the implementation loop. Run the broad regression,
  complete affected browser matrix and production build once the batch is stable;
  repeat them when a subsequent correction invalidates their result.
- Give native action, tenant lifecycle, contract and accessibility runners separate
  named CI steps and bounded receipts. Preserve assertions for actual ready state,
  nested dismissal and returned focus; avoid arbitrary sleeps. Independent suites
  may continue after a failure only when fixture cleanup and prerequisites hold.
- Qualify the intended application SHA with all application CI jobs and deployment;
  pin the service integration workflow to that application SHA and qualify both
  service jobs. Publish sanitized per-batch evidence and fingerprints through the
  existing verification record, then update the assigned milestone rows.

M5 reaches 100% when every remaining M5 row in A/B is verified, including secrets
and accessibility. M4a reaches 100% when its A/B rows, complete rules/service
contracts and Batch C loaded freshness requirements pass. The separate 50-session
latency qualification remains M6 work. Demonstration and payment remain separately
recorded. The wider tenant-dashboard redesign and M6's object recovery, advisor,
clean setup and handover gates retain their existing scope.

### 18.24 Tenant settings engineering closure — 15 October 2026

M4 and M5 are **100% engineering-complete in the agreed sandbox scope, pending
presentation and client demonstration**. The final production-build run passed ten
tenant scenarios and 45 role/layout visits across five settings surfaces, three
roles and three widths. All sixteen console regressions passed, including nested
Escape dismissal, and all 726 cache-disabled application tests passed in 65 files.

Unsaved changes survive cancelled links, Back, Forward and reload. Offline and
lost-response rule changes reconcile against the live version before retry;
restoration, stale editors, changed master safeguards and temporarily missing
guidance agree with independent database audits and actual FastAPI reads. Direct
restricted Activity access now explains permissions rather than showing a generic
error. Credential shortcuts follow the same owner-only policy as the server.

The project owner accepted the existing screen-reader evidence as sufficient and
removed repeat screen-reader testing from the itinerary. This is recorded as
completed prior proof, not a deferred milestone gate or a new compliance claim.

Default conversation guidance is published and independently read back in both
the local and hosted sandboxes. It covers tone, factual responses, workspace
information, escalation, prohibited topics and privacy instructions. Escalation,
prohibited topics and privacy safeguards are platform-locked. Publication uses the
existing audited, immutable-version operation; rerunning does not replace an
already matching version. Phase Two still owns actual conversation generation.

The verification record links the bounded receipts and full regression catalogue.
M4a retains its separate complete-contract and loaded latency/freshness rows; M6
retains recovery, performance and handover. Exact new-revision CI and deployment
are qualified after the release push. Client acceptance and payment are unchanged.

### 18.25 M4a engineering closure — 16 October 2026

Complete: strict shared rules schemas and actual response conformance across
seven HTTP operations; 24 loaded master/workspace changes within five seconds;
cache-disabled/unreachable-cache runs and two service restarts; cleanup; retained
native failure/recovery and isolated knowledge/customer seams. The public
verification record contains downloadable evidence and the merged API contract.
M4a is 100% engineering-complete, pending client demonstration.

The 400ms p95 dashboard/settings requirement at 50 sessions remains an open M6
gate, following architecture section 10. Preserve both current failed local
measurements. No screen-reader repeat, acceptance claim, new payment or hosted
FastAPI requirement is added. Qualify the paired repository revisions in CI and
the frontend deployment after push.
