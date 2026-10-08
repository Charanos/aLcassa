# 25 · Phase One completion and full surface verification

**Revised:** 7 October 2026, Africa/Nairobi. The dated baseline assessments below remain historical.

**Baseline:** commit `f82f5df` plus the working tree inspected on this date

**Execution ledger:** [26 · Verification matrix and evidence ledger](26-phase-one-verification-ledger.md)

**Published checkpoint, 7 October 2026:** application candidate `aa10c83` is on `origin/main` with all six CI jobs passing. The dated assessment below remains the original planning baseline; the execution ledger records subsequent implementation and verification. Publication is not Phase One acceptance.

**Milestone execution instruction, 7 October 2026:** finish the current Health/loading/directory verification work package, then prioritize the earliest open acceptance gates in dependency order. Reaffirm M1 provisioning/upgrade/isolation; complete M2 account and recovery journeys; implement M5 credentials needed by M3's service-door enforcement; complete M4a tenant rules and FastAPI contracts; finish M4's full surface/action/accessibility matrix; and qualify M6 monitoring, performance, recovery and handover. A blocked production email dependency does not prevent independent local or service implementation. Preserve prior acceptance history and label remaining release qualification separately.

**Account checkpoint, 8 October 2026:** the full local suite passes 463 cases in 34 files without skips. Actual-provider owner acceptance and password recovery now verify invitation capture, the correct stored workspace/role, one joining event, recent provider proof, single-use application confirmation, expiry and prior-session revocation. Account-level password claims prevent concurrent writes before calling Auth. Native owner acceptance opened the stored disposable workspace; remaining browser lifecycle, colleague invitation scenarios, OAuth, provider outage recovery and hosted redirect/delivery readiness remain open M2 gates. Continue those browser checks, then implement credentials and the authenticated service contract; do not treat this checkpoint as milestone or handover acceptance.

For each milestone: define its unresolved gates, implement and verify them, update the tracker and ledger with actual results, run the candidate's production build and release checks, then commit/push to the verified `origin/main` and confirm CI for that exact commit. Keep implementation, verification, publication and client acceptance distinct. A completed work package may be published under the user's existing authorization without declaring the whole milestone accepted. Never substitute an older build, test report or CI run for the candidate being released.

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
| OAuth/callback | If enabled, prove state/redirect validation, trusted origin, callback errors and resulting session/role. If disabled, UI and contract clearly describe availability. |
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
