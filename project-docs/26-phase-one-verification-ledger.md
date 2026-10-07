# 26 · Phase One verification matrix and evidence ledger

**Created:** 6 October 2026, Africa/Nairobi

**Governing plan:** [25 · Phase One completion](25-phase-one-completion-plan.md)

**Baseline:** `f82f5df` plus the inspected working tree

This is the execution record for the plan. Source inspection is not a test pass. All verification cells start **Pending**, except the baseline typecheck failure recorded below. The case IDs are specifications for tests to implement/run, not names of an existing automated suite.

## 1. Recording rules

States: **Pending**, **In progress**, **Passed**, **Failed**, **Blocked**, or **Not applicable**. A Passed cell requires a linked artifact, candidate SHA and environment/schema identity. A Blocked cell requires its exact dependency; Not applicable requires a reason. Do not merge implementation progress and test results into one green status.

For each page row, expand an action/state manifest before implementation: every visible tab, button, link, menu, dialog, drawer, chart, export, preference and route variant gets an ID. Mark read-only helpers as reads; a page view should not manufacture mutation/audit events. Derive API/action roles and audit expectations from docs 06/07/09 and actual service contracts.

Every page receives the common checks in doc 25 section 3. **D** means data/read/query evidence; **F** functional, permission, mutation and audit evidence; **V** visual, states, accessibility and responsive evidence. Runtime/performance evidence accompanies each record.

## 2. Console route matrix

Fourteen existing console page routes, in the requested execution order. Each row also includes its loading/error states and nested interactions.

| ID | Route | Required actions/data | Case families | D | F | V |
| --- | --- | --- | --- | --- | --- | --- |
| P01 | `/platform` | Counts, queue actions, insights, portfolio, capacity, recent activity and links | J01, J03, J04, J05, J06, X01 | Pending | Pending | Pending |
| P02 | `/platform/tenants` | Search, filters, sort, pagination, row menus, detail drawer, support entry, roster CSV | J01, J02, J03, J04, J08, X01, X05 | Pending | Pending | Pending |
| P03 | `/platform/tenants/[id]` | Deep-linked tabs, drawer parity, plan/subscription/override/suspend/reactivate, contract, support | J03, J04, J05, J06, J08, X02 | Pending | Pending | Pending |
| P04 | `/platform/tenants/new` | Field validation, unique slug, owner/delivery state, provisioning/recovery, list invalidation | J01, J02, X02 | Pending | Pending | Pending |
| P05 | `/platform/plans` | Limit preview/change, headroom, unlimited/over-limit, chart alternative, impact counts | J03, J05, X01, X02 | Pending | Pending | Pending |
| P06 | `/platform/revenue` | Live contracted value, pricing basis, pipeline, history, queue, source labels and CSV | J06, X01, X05 | Pending | Pending | Pending |
| P07 | `/platform/ai-rules` | Diff, publish, history, rollback, concurrent version, inheritance and locks | J07, J22, J23, X02 | Pending | Pending | Pending |
| O01 | `/platform/health` | Live dependency/isolation proof, source/freshness, no invented historic metrics | J25, J27, X01 | Pending | Pending | Pending |
| O02 | `/platform/audit` | Filters/date/pagination, readable action detail, before-after, workspace link and CSV | J08–J13, J19–J23, X04, X05 | Pending | Pending | Pending |
| O03 | `/platform/support-sessions` | Open, reason, register, visit drawer/timeline, extend/end/expiry and actor variants | J08–J13, X02, X04 | Pending | Pending | Pending |
| O04 | `/platform/inside` | Scope/frame, allowed reads/actions, invite resend/revoke, clock, exit and refusal | J08–J13, J19, X03 | Pending | Pending | Pending |
| O05 | `/platform/admins` | Two operators, capabilities, readable activity, profile/session privacy, real affordances | J14, X03 | Pending | Pending | Pending |
| O06 | `/platform/settings` | Save, field errors, conflict/last change, export links, break-glass engage/release | J12, J15, X02 | Pending | Pending | Pending |
| C01 | `/platform/profile` | Name/avatar/remove/password, current/other devices, activity pager, capabilities | J16, J17, J18, X03 | Pending | Pending | Pending |

Shared shell has its own row: **C02**, rail/header/mobile dock, badges, density/theme/collapse, workspace switcher, command palette, notifications, account menu and sign-out. Required cases: J08, J14, J16–J18, J24, X01, X03, X06. All evidence: **Pending**.

## 3. Customer, access and peripheral route matrix

| ID | Route(s) | Phase One coverage | Cases | Status |
| --- | --- | --- | --- | --- |
| T01 | `/app/settings/audit` | Complete customer Activity pass: vocabulary, visits, drilldown, filters/paging, time/retention, permissions and audit reconciliation | J03, J04, J08–J13, J19–J23, X04 | Pending |
| T02 | `/app/settings/company` | Audited persistence, validation, conflicts, role controls and shell readback | J20, X02, X03 | Pending |
| T03 | `/app/settings/team`, `/app/settings/team/invite` | Membership/invitation lifecycle, seat limits, roles and owner transfer | J01, J02, J05, J19 | Pending |
| T04 | `/app/settings/credentials`, `/app/settings/credentials/new` | Mint/reveal once, metadata, scopes/limits, revoke/rotation and redaction | J21, X03 | Pending |
| T05 | `/app/settings/ai-rules` | Tenant edit payload, version/diff/history/publish, effective rules and audit | J22, J23, X02 | Pending |
| T06 | `/app/settings/subscription` | Plan/limits/state visibility and correct downstream changes | J03, J05, J06 | Pending |
| T07 | `/app/settings/appearance` | Existing appearance persistence, theme/accent boundaries and regression | J24, X06 | Pending |
| T08 | `/app/account`, `/app/account/sessions` | Identity persistence, own sessions and revocation, support termination where offered | J09, J16, J17, J18 | Pending |
| T09 | `/app/settings` | Correct redirect, permissions and back/deep-link behavior | X03, X06 | Pending |
| T10 | `/app`, `/app/billing`, `/app/inbox` | Phase One landing/boundary/data-truth regression; contractual load on required dashboard routes; honest Phase Two seam. Wider redesign deferred. | J03, J04, J08, J26, X01 | Pending |
| A01 | `/sign-in` | Wrong/valid credentials, role landing, safe next, revoked session, mobile/keyboard | J17, J18, X03, X06 | Pending |
| A02 | `/sign-up` | Fields, duplicates, throttling, verification state and safe continuation | J01, J02, X03 | Pending |
| A03 | `/sign-up/verify` | Resend, delivery status, expiry and repeated action behavior | J01, J02 | Pending |
| A04 | `/sign-up/finish` | Verified continuation, provisioning/default plan/audit and replay safety | J01, J02, X02 | Pending |
| A05 | `/forgot-password` | Non-enumerating response, throttling, provider failure and delivery | J17 | Pending |
| A06 | `/reset-password` | Invalid/expired/reused token, validation, session handling and login | J17, J18 | Pending |
| A07 | `/invite/[token]` | Valid/expired/revoked/used token; correct identity/workspace/role; replay | J01, J02, J19 | Pending |
| E01 | Root, console and tenant error/404/loading boundaries | Correct shell, safe retry/navigation, nested/global failure and skeleton shape | X06 | Pending |
| E02 | `/project-tracker`, `/docs/[slug]` | Accurate current gate statements, links and document navigation | J28, X06 | Pending |
| E03 | `/`, `/legal/[doc]` | Access/legal links and data/brand/runtime smoke; no marketing expansion | X06 | Pending |

## 4. Browser and cross-layer case specifications

These are minimum journeys. Expand each into happy, invalid, unauthorized, stale/expired and provider-failure cases as applicable. Use integration/unit tests for dense business matrices; do not duplicate every pure calculation as a slow browser test.

| ID | Scenario | Required assertions | Main layers |
| --- | --- | --- | --- |
| J01 | Provision to first login | Unique tenant, correct owner/default subscription, transactional audit, invitation delivery, accepted membership/session; measured under two minutes; roster/overview/switcher agree | Integration, E2E, email |
| J02 | Provision/invite failure and retry | Field errors, duplicate slug, wrong/used token, provider rejection, partial failure recovery; no orphan state or duplicate mutation; honest delivery status | Integration, E2E |
| J03 | Assign plan and update value | Capability, expected preview, subscription/readback, caches, limits, values, CSV and both applicable audit trails | Unit, integration, E2E |
| J04 | Suspend/reactivate | Typed confirmation, reason, role/session/support behavior per contract, counts/value changes and accurate customer event | Integration, E2E |
| J05 | Limits and overrides | Below/at/above/zero/unlimited, lowering below usage, override expiry, concurrent invites/mints, identical session/service policy outcomes | Unit, integration, contract, E2E |
| J06 | Contracted-value matrix | Independently expected monthly/annual/negotiated amounts, null/zero, unpriced/missing/retired plans, every subscription state, partial history and date/rounding boundaries | Unit, integration, E2E |
| J07 | Master publish/rollback | Validated diff, append/version/audit contract, stale edit refusal, locked fields and affected inheritance | Unit, integration, E2E |
| J08 | Support open/work/extend/end | Real session/tenant IDs, reason/scope/frame, permitted work, two extensions, termination, linked register/timeline and both logs | Isolation, integration, E2E |
| J09 | Customer terminates support | Authenticated owner action ends only its visit; stale operator tabs refuse next read/write; no rolled-back state/audit; customer event accurate | Isolation, integration, E2E |
| J10 | Colleague terminates support | Second authorized operator, correct end actor/cause, original operator loses access, privacy/scoping and both logs | Integration, E2E |
| J11 | Support expiry/races | Idle expiry, expiry at mutation, concurrent extension/end; correct single final state and permitted event count | Integration, E2E with clock control |
| J12 | Break glass | Reason/confirmation, capability, applicable visit closure in both logs, refused stale support work; deliberate audited release | Isolation, integration, E2E |
| J13 | Operator/workspace state changes during support | Revocation/suspension follows agreed lifecycle; next protected request cannot retain unauthorized scope | Isolation, integration, E2E |
| J14 | Two operators/capabilities | Restricted direct action refuses, own private data only, permitted admin roster visible, no UI-only authorization | Isolation, integration, E2E |
| J15 | Platform settings conflict | Save/reload/second tab, actor/time, stale write refused, valid input survives failure, audit rollback on failure | Integration, E2E |
| J16 | Identity/avatar lifecycle | Name reaches chrome, upload/remove/replacement, malformed/oversized input, storage permission, accessible fallback and fresh login readback | Integration, storage, E2E |
| J17 | Password recovery/change | Reauthentication, policy validation, delivered reset/security message, expired/reused token, other-device option, no enumeration | Integration, email, E2E |
| J18 | Login/session lifecycle | Safe next, signed-out/refused state, current/other device revocation, sign-out row/token behavior, reload and second tab | Integration, E2E |
| J19 | Team/invite/ownership | Invite/resend/revoke/accept, admin-agent-owner boundaries, remove/change role/transfer ownership, seat limits and customer activity | Isolation, integration, E2E |
| J20 | Company persistence | All validated fields reach fresh reads; permissions/conflict/date-zone handling; transactional audit | Integration, E2E |
| J21 | Credential lifecycle | Correct mint/metadata/scopes/limits, exactly one reveal, no subsequent secret/hash output, scope refusal before handler, warmed-cache revoke/rotation and audit | Unit, isolation, integration, contract, E2E |
| J22 | Tenant rules publish | Full edited payload, note/version, master precedence, safe diff/history, concurrent refusal, audited readback | Unit, integration, E2E |
| J23 | Service rules propagation | Real FastAPI door, tenant/master edit and rollback, correct versions/content/provenance/locks, 200/304, scope/rate limits and measured ≤5 seconds | Cross-runtime contract, integration, E2E |
| J24 | Shell/preference/notifications | Keyboard switcher and palette, search beyond six, allowed deep links, persisted theme/density/collapse/read watermark and honest notices | Integration, component, E2E |
| J25 | Migration/deployment | Fresh install and upgrade, 0004 backfill review, policies/grants, compatibility order, safe app rollback and deployed smoke | Migration/integration, deployment |
| J26 | Load/performance | Production build, required routes at 50 sessions, p95 <400ms, error rates, source correctness and query fan-out | Load, integration |
| J27 | Outage/observability/recovery | DB/cache/email/storage/service failures, actionable UX, request-ID/log correlation, secret redaction, backup/restore and operator runbooks | Integration, controlled failure, recovery drill |
| J28 | Handover/acceptance | Current docs/OpenAPI/tracker, both services from README in <30 minutes, walkthrough, milestone evidence and acceptance | Human review, timed setup |
| J29 | Production language and typography | Task-oriented labels/helpers, truthful outcome/error/recovery language, consistent terminology and financial basis, readable type at actual sizes, long names/zoom/narrow screens, approved page/chrome theme and accessible announcements | Copy/type review, component, browser |

## 5. Cross-cutting verification packs

| ID | Pack | Required cases |
| --- | --- | --- |
| X01 | Source truth and reconciliation | Every band mapped to a reader/source/definition; independent totals; legitimate zero, unmeasured, unavailable, denied and designed scenarios; page/export consistency. |
| X02 | Mutation safety and audit | Direct capability check; correct context; atomic write/audit; before-after/request IDs; stale version; concurrent/double/retried submit; email side-effect status; affected view invalidation. |
| X03 | Boundary/security | Anonymous, wrong tenant, wrong role, missing capability, bad/missing scope, expired/revoked session/credential, support restrictions, malicious IDs/redirects, production demo disabled, secret scans. |
| X04 | Activity pagination and retention | >2,000 events, timestamp ties and newly inserted rows; no skips/duplicates; URL filter/range; timezone midnight; cutoff transitions; visit grouping without information loss. |
| X05 | Exports | Workspaces/value/audit, auth/resource allowlist, row scope and filters, source/basis, redaction/audit, quotes/newlines/Unicode/formula injection, MIME/filename and large data. |
| X06 | Visual/accessibility/runtime | Approved single page theme and inverted chrome/support frame, baseline widths/densities; 320px reflow/zoom; full-document/overlay fit; all states; keyboard/focus/announcements/manual screen reader; contrast/axe; reduced motion; no unexpected console/hydration/network errors. |
| X07 | Product language and type | Every route and nested interaction: user vocabulary, outcome/action matching, no implementation placeholders, honest unavailability/source/payment claims, sentence case, consistent type hierarchy, readable helper text and locale-aware numbers/dates. Record with J29 for every surface. |

Automated axe results supplement manual WCAG review. Apply the linked [W3C WCAG 2.1](https://www.w3.org/TR/WCAG21/) standard to full pages and complete processes, including modal and error states.

## 6. API and Server Action inventory

This records current route/action families so the browser plan does not hide an untested backend door. Expand every family into its actual methods, schemas, role matrix and test IDs in S0; do not invent public REST routes for existing Server Actions.

### 6.1 Existing HTTP routes

| Family | Current routes | Required packs/cases |
| --- | --- | --- |
| Auth | `/api/v1/auth/sign-in`, `/sign-out`, `/sign-up`, `/sign-up/finish`, `/verify-email/resend`, `/password/forgot`, `/password/reset`, `/google`, `/callback` beneath the auth prefix | J01/J02/J17/J18; validation, origin/redirect, rate limit, error envelope, provider failure and session proofs |
| Own account | `/api/v1/me`, `/api/v1/me/sessions`, `/api/v1/me/sessions/[id]`, `/api/v1/me/onboarding/dismiss` | J16–J18, X03; actor scoping and audited writes where required |
| Team | `/api/v1/members`, `/api/v1/members/[id]`, `/api/v1/members/[id]/role`, `/api/v1/tenant/transfer-ownership` | J05/J19, X02/X03 |
| Invitations | `/api/v1/invitations`, `/api/v1/invitations/[id]`, `/api/v1/invitations/[id]/resend`, `/api/v1/invitations/accept/[token]` | J01/J02/J19, X02/X03 |
| Console preferences | `/api/console/prefs` | J24, X03; values, identity and persistence |
| Exports | `/api/platform/export/[resource]` for current allowlisted workspaces/revenue/audit | X05 |
| Operational | `/api/health`, `/api/cron/reconcile`, `/api/demo` | J25/J27, X03; truthful health, trusted cron and production bypass refusal |
| Channel seam | `/api/webhooks/[channel]` | Contract/signature/unknown-channel/seam behavior; no Phase Two processing assumed |
| Planned credential door | Agreed doc 07 credential endpoints, to be reconciled and implemented at M5 | J21, X02/X03; reveal-once creation and metadata-only later reads |
| FastAPI service door | Agreed rules/tenant/health service endpoints, external base path resolved at S0/S6 | J05/J23/J27; scopes before handlers, OpenAPI and cross-runtime decisions |

### 6.2 Existing console Server Actions

- `actions.ts`: `startSupportSession`, `extendCurrentSupportSession`, `endSupportSession`, `endSupportSessionById`, `fetchWorkspaceDetail`, `fetchProvisionOptions`, `fetchSuspensionImpact`, `suspendWorkspace`, `applyPlanChange`, `toggleBreakGlass`, `fetchBreakGlassState`, `provisionWorkspace`, `nextSupportReference`.
- `inside-actions.ts`: `resendInvitationInside`, `revokeInvitationInside`.
- `plan-actions.ts`: `previewPlanLimit`, `changePlanLimit`.
- `queue-actions.ts`: `raiseWorkspacePlanFromQueue`.
- `rules-actions.ts`: `publishMasterRulesAction`, `rollbackMasterRulesAction`.
- `settings-actions.ts`: `savePlatformSettings`.
- `subscription-actions.ts`: `previewWorkspacePlanChange`, `assignWorkspacePlan`, `changeWorkspaceSubscriptionStatus`, `grantWorkspaceOverride`.
- `support-actions.ts`: `fetchSupportVisit`.
- `profile-actions.ts`: `updateConsoleProfileName`, `revokeConsoleSession`, `revokeOtherConsoleSessions`, `updateConsoleAvatar`, `removeConsoleAvatar`, `changeConsolePassword`.

Check duplicate entry points call the same policy/service and produce consistent decisions. Consolidation of support-entry UI handlers must preserve all four callers and their failure states.

### 6.3 Existing tenant Server Actions

`updateCompany`, `sendInvitation`, `revokeInvitation`, `removeMember`, `createCredential`, `revokeCredential`, `publishAiRules`, `updateProfile`, `revokeSession`, `endSupportVisit`.

Company settings now call the audited, versioned settings module. Credential create/revoke and tenant publish still refuse implementation. Their result/payload contracts and implementations remain necessary before browser cases can pass.

## 7. Test layer and execution gate map

| Layer | Coverage target | Current/proposed invocation | Evidence status |
| --- | --- | --- | --- |
| Static/build | Strict types, lint, format, declared dependencies and production build | Existing `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm check:deps`, `pnpm build` | Initial B01 fixed; current checks Passed as scoped in section 11 |
| Policy/isolation | Every tenant-scoped table and applicable read/write/update/delete/support case, least-privilege connection | Existing `pnpm check:policies`, `pnpm test:isolation` | Current local suite Passed; full contractual coverage remains to be reconciled |
| Unit/integration | All critical rules, amount/limit/scope/version matrices, transactions/concurrency and audit invariants | Existing `pnpm test`, add named cases per work package | Current 342 cases Passed; missing contract/journey obligations remain open |
| Cache disabled | Entire applicable correctness suite, required cases unskipped | Existing `pnpm test:cache-disabled` | Passed, 342/342 on disposable local PostgreSQL |
| API contracts | Every agreed Phase One endpoint/method plus required errors, scopes and service decisions | Proposed `pnpm test:contract` and documented FastAPI equivalent | Pending; harness missing |
| E2E journeys | Every J01–J28 journey applicable to the candidate | Proposed `pnpm test:e2e`; J25–J28 also require operations/human evidence | Pending; harness missing |
| Surface/axe/visual | Every page/shell row and required states at the stated theme/width matrix | Proposed `pnpm verify:surfaces`; existing `pnpm shots` is partial capture only | Pending; harness missing |
| Load | Contractual routes/50-session p95 plus agreed console/service budgets | Documented candidate load command/report to be added | Pending |
| Dependency security | Release dependencies and actionable advisories | Existing CI dependency-audit job, validate actual candidate result | Pending |
| Recovery/handover | Staging restore, runbooks, timed setup, walkthrough and acceptance | Controlled drill and real reviewer | Pending |

Coverage is measured by table/action/route/scenario obligations, not an arbitrary global percentage. Critical pure business branches should be explicitly enumerated; trivial framework behavior needs no duplicated test. One source-only count or screenshot cannot replace a required journey.

## 8. Evidence record template

Copy this per route/scenario or attach the equivalent generated JSON:

```text
Record ID / route / action / case IDs:
Implementation owner / verifier / reviewer:
Candidate commit / dirty patch identifier / dependency lockfile:
Environment / service versions / schema migration journal:
Fixture run ID / authenticated actor role / tenant:
Viewport / theme / density / browser:
Required state and expected result:
Source queries / query count / timing / payload size:
Observed data / independent expected data / readback:
Mutation / platform audit ID / customer audit ID / request ID:
Runtime and unexpected network error count:
Axe result / manual keyboard-focus-contrast-screen-reader result:
Screenshots / trace / DB-contract report / performance report links:
Defects / severity / retest evidence / visible retries:
Status / timestamp in Africa/Nairobi / acceptance reference:
```

Evidence from earlier candidates must be rerun when a relevant shared component, policy, contract, migration or action changes. Record an explicit impact assessment when reusing an unaffected artifact.

## 9. Opening execution queue

| Order | Task | Exit evidence | Status |
| --- | --- | --- | --- |
| 1 | Restore baseline after contracted-value model changes | Green typecheck/static/build; reviewed working tree | Static/build checks passed; review/closure remains in progress |
| 2 | Resolve design authority and current tracker claims | Canon/reference note and supported dated milestone notes | Canon reconciled in doc 25; milestone qualification remains open |
| 3 | Review 0004 and choose isolated full-stack environment | Fresh/upgrade migration proof and operator/customer login | Local migrations/policies and upgrade checks passed; browser login in progress |
| 4 | Confirm FastAPI repository/owner/base path and provider status | Reviewed service boundary; known email/Auth/Storage setup | Pending |
| 5 | Build action/scenario manifest and evidence harness | Route/action coverage check, first genuine cross-door journey, artifacts | Pending |
| 6 | Platform P01–P07 | All common checks and journey records | Pending |
| 7 | Ops O01–O06 | All common checks, support matrix and audit evidence | Pending |
| 8 | Peripheral C01/C02 and access/system | Identity/session/shell/state matrix | Pending |
| 9 | Customer Activity T01 | Every applicable console action linked to safe customer evidence | Pending |
| 10 | M5 T02–T04 and dependencies | Company save, credentials/scopes/limits/revocation and customer activity | Pending |
| 11 | M4a T05 and service door | Both-runtime contracts, ≤5-second propagation, M3 two-door proof | Pending |
| 12 | Candidate qualification/handover | All doc 25 original gates, load/restore/setup and recorded acceptance | Pending |

No row above is Passed at creation. The plan is ready for execution; production verification and milestone acceptance remain separate work.

## 10. Execution decisions, 6 October 2026

- User confirmed no FastAPI development repository exists and authorized provisioning one.
- User selected a local disposable verification environment.
- Product language and typography are required per-surface acceptance checks, J29/X07. They accompany functionality, data truth and visual refinement rather than following them at handover.
- First implementation pass: resolve B01; retain a genuine empty contracted-value portfolio; refine shared breadcrumbs/source labels and actionable errors; connect and clarify the contracted-value surface. Evidence is added after actual verification.

## 11. Execution evidence, 6 October 2026

Candidate: `f82f5df` plus the preserved, uncommitted application working tree. Main-repository changes have not been committed, pushed or deployed. Record a final immutable candidate before release qualification; these results are development evidence.

| Check | Observed result | Evidence and limits |
| --- | --- | --- |
| Strict TypeScript | Passed | `node node_modules/typescript/bin/tsc --noEmit`, repeated after company/action/Activity changes and local verification scripts. B01 and the missing settings-conflict hue mapping were corrected. |
| ESLint | Passed | Full repository run passed after removing three unused imports; the later local-account script also passed targeted lint. No rules were disabled to make these checks pass. |
| Formatting | Passed | Full repository Prettier check. An existing export file was formatted; private machine configuration is excluded from application formatting. |
| Declared dependencies | Passed | `scripts/check-phantom-deps.ts`; every examined import declared. |
| Production build | Passed | Isolated `Build` launcher, `.verification-build.log`: compile, type/lint, 75 generated pages and build traces completed with exit 0. Next reported an ESLint-plugin detection warning; independent ESLint passed. No production runtime/performance or deployment claim follows. |
| Tests without a database | **96/96 passed**, eight files | [JSON report](../.test-report/phase-one/non-database.json), generated by `Unit` with external providers cleared. Financial/date/cursor/settings validation/audit vocabulary, email templates, rate limiting, subscription transitions and telemetry scrubbing. Database suites were explicitly excluded. |
| FastAPI foundation | **4/4 passed** | Private [service repository](https://github.com/Charanos/alcassa-service), candidate `4ba8588608e4bdf3dfcab15d1f09d7046156509d`; [CI passed](https://github.com/Charanos/alcassa-service/actions/runs/37475947310). Local health returned 200, matching correlation ID, `no-store`; generated OpenAPI 3.1 includes health. One Starlette/httpx deprecation warning remains. Authentication/rules/scopes/ETags are not implemented by this foundation. |
| Browser fixture review | Limited review completed previously | Subscription value at desktop and 390px, customer Activity at desktop, using example data. [Desktop artifact](../.screenshots/phase-one/subscription-desktop.jpg), [phone artifact](../.screenshots/phase-one/subscription-phone.jpg). These are not authenticated, mutation, axe or complete process evidence. The approved theme is cream pages with inverted console chrome. |
| Disposable stack | Running, local only | Docker 29.8.2, CLI 2.119.0, PostgreSQL 17.11.0.002; Auth, REST gateway, Storage and local email capture. After the user freed disk space, only the damaged vendor PostgreSQL image was replaced; its startup script and successful database startup were verified. No shared/hosted database was used. |
| Settings database cases | **7/7 passed** | `tests/isolation/company-settings.test.ts`: atomic save/audit/readback, agent refusal, stale version, concurrent save, support attribution, cross-tenant row ID and first-insert role enforcement. Included in the full cache-disabled report. |
| Activity database cases | **4/4 passed** | `tests/isolation/activity-reader.test.ts`: 2,101 records with microseconds/ties/new arrivals, tampered retention cursor, role/missing entitlement refusal and explicit unlimited history without cross-tenant disclosure. Included in the full cache-disabled report. |
| Fresh migrations and RLS | Passed | `Prepare`: real migrations 0000–0004 and nine policy files applied; 46 public policies present. Restricted `alcassa_app` role verified `NOBYPASSRLS`. Policy checker: 15 tenant-scoped tables, zero problems. `.verification-prepare.log` and `.verification-tests.log`. |
| Upgrade and replay | **8/8 assertions passed** | [Upgrade report](../.test-report/upgrade-4c44cd4bf4d742eaab3da0116830a2e1/result.json). Real 0000–0003 install, representative data, 0004 upgrade and replay: missing dates repaired, deleted rows excluded, zero values allowed, negative values refused and replay produced no duplicates. Only the generated disposable database was removed afterward. |
| Full cache-disabled suite | **342/342 passed**, 18 files | [JSON report](../.test-report/phase-one/cache-disabled.json); 246 database cases and 96 non-database cases, using the restricted local role. All applicable existing cases completed without skips. This proves the current suite, not every pending Phase One contract. |

Implemented changes include source-truth labels, financial wording, shared header/breadcrumb/type refinement, meaningful empty states, safe errors, company persistence with optimistic concurrency and audited writes, RLS enforcement on settings insertion, and Activity cursor/timezone/retention handling. Activity now refuses a missing retention entitlement instead of interpreting it as unlimited.

Prepared environment improvements include a free-space preflight, key output suppression, isolated cookies/provider settings, two disposable tenant login accounts, safe unit reporting and an upgrade verification command. Syntax/static checks are separate from actually executing provider setup and migrations.

**Remaining gates:** authenticated Platform/Ops/Profile/shell/access/Activity journeys and all required states; company browser save/conflict/readback; credentials and tenant-rules implementation; both-runtime service contracts and ≤5-second propagation; complete visual/accessibility/width review; load, recovery, deployment and handover acceptance. Every surface row above stays Pending until its complete required evidence exists. Phase One is not complete.


## 12. Console refinement and browser evidence — 7 October 2026

The user added doc 03 section 28 as an explicit design requirement. Implementation covers the shared inverted KPI band, faint dot pattern, quieter artwork, sunken task/record grouping, desktop section-heading alternation, mobile left alignment and production copy. Workspace full pages now use live overview/subscription/operator Activity records. Customer team/rules access remains bounded by a support visit. The directory and signed-in Health page explicitly distinguish unmeasured metrics from zero.

Evidence collected so far:

- Live operator sign-in succeeded. Overview reads the same KES 95,200 monthly contract total as the subscription-value reader; its compact hero shows 95k. Directory count is 12. Support, latency and queue fields no longer substitute fixture totals in this live briefing.
- Desktop workspace detail at 1440px: selected actual Acme Industrial record, right-aligned Usage and subscription followed by left-aligned Workspace ownership; document width stayed within viewport. [Desktop view](../.screenshots/phase-one/workspace-refined-desktop.png). Initial phone review at 390px had no document overflow and exposed excessive KPI height; a two-column phone layout and smaller artwork were implemented for retest.
- Subscription dialog opens, and Cancel returns without a mutation. Team tab navigates and explains the support boundary. Client tab transitions were initially slow during local builds/tests; they did complete. Stream-replacement parentNode errors were captured on the initial overview navigation and remain an open runtime investigation.
- Browser Company save, stale-save refusal with input preservation, reload persistence, and the matching customer Activity event were observed. Six independent database assertions confirmed the saved name, contact address, UTC/en-GB settings and correlated settings event. [Readback report](../.test-report/phase-one/company-browser-readback.json), [saved state](../.screenshots/phase-one/company-saved.png), [conflict state](../.screenshots/phase-one/company-conflict.png), [Activity event](../.screenshots/phase-one/activity-company-change.png).
- The first expanded database run was 344/346: two generated session tests selected live user-owned login sessions, which are correctly self-manageable. Dedicated operator-owned support-session fixtures corrected the intended restricted-role cases; the next run passed 346/346. No policy was relaxed. The following catalogue regression had a test-field mismatch (key versus the reader's display label), repaired before retest. Preserve these retries in the evidence record.
- Browser verification found the plan catalogue/headroom/master readers had cleared the operator identity needed by their RLS policies. They now use the operator context. The catalogue regression checks a real temporary plan, its assignment count and allowances; browser retest of Change plan remains required on the new build.

All complete-surface acceptance cells remain Pending until their remaining action, state, runtime, keyboard, accessibility and responsive evidence is recorded. These are development results on the uncommitted candidate, not Phase One acceptance.

### 12.1 Verified fixes and remaining checks

- Latest cache-disabled run: **356/356 passed, 20 files, no skips**, using the disposable RLS-bound role. Seven new subscription cases include negotiated pricing, lifecycle changes, override references, cross-workspace visibility, refused-change rollback and a deliberately failed customer audit insert that rolls back the subscription and platform audit. The first run of these cases failed during fixture setup because required period dates were omitted; dates were supplied and every case then executed.
- Master reader cases confirm that the selected published version can be older than the twenty-row history rail, its stored field locks are respected, and a missing selected version does not substitute a draft or fixture. The current version is queried directly and remains visible in history after a restore.
- The phone KPI band was observed as four 165 × 150px cells in a two-column grid at 390px; document width was 380px, within the viewport. [Phone artifact](../.screenshots/phase-one/workspace-refined-mobile.png).
- Browser plan change: Pro → Business showed KES 17,000; restoration to Pro showed KES 3,400. Operator Activity displayed both reasons. Independent readback caught missing customer audit records in the previous implementation. This failure is retained as evidence; historical test events were not backfilled or relabelled as successful. Assignment, negotiated-price, status and override mutations now insert customer Activity in the same transaction and share the platform request reference. The rebuilt browser replay restored Pro and independent readback passed **16/16 assertions**, including both correlated customer Activity records. [Readback report](../.test-report/phase-one/subscription-browser-readback.json). Customer-facing rendering is still being checked separately.
- Allowance overrides previously supplied an entitlement key to a UUID audit-reference column. They now record the key as structured change detail and use the real override record UUID in customer Activity.
- Subscription dialogs now disable confirmation until selection, preview, required reason and any negotiated amount are valid. Custom pricing accepts a whole-shilling amount from 1 to 100,000,000 KES and does not collect payment. Browser validation remains required on the rebuilt implementation.
- Section-heading IDs have been added to labelled console sections, including Ops, Support and Inside. This repairs missing accessible names; it is not a substitute for complete keyboard and WCAG review.
- Master rules now use the shared KPI/section/sunken hierarchy, show an honest unpublished state with the shared-guidance editor, and describe version history without database jargon or one-click restoration promises.
- Strict TypeScript, full-repository ESLint and the local production build passed after these service and shared surface changes. The build generated all 75 pages. Formatting passed. The build still reports its existing Next ESLint-plugin detection warning; the independent full ESLint run exited 0.

Open precision items for the next verification pass: workspace-directory seat limits still encode unlimited as zero and need a nullable/unknown model; plan previews must preserve absent-entitlement denial and incorporate active overrides; stale previews and stale master-rule edits need their full concurrent-edit acceptance checks. These are recorded as unresolved, not covered by the passing test count.

### 12.2 KPI texture and modal backdrop verification, 7 October 2026

- User observation was reproduced: the shared KPI dots had 5.5% opacity with an aggressive transparent mask; the plan-change confirmation had a dimming tint with `backdrop-filter: none`.
- The shared band now uses 0.9px dots, a 14px pitch, 20% opacity and a gentler 35%-to-full-strength mask. Desktop and 390px phone screenshots show the dots without enlarging the decorative icons or obscuring values.
- Actual modal backdrops now share `console-modal-backdrop` and the 8px overlay-blur token, including a WebKit declaration. Dialog content retains `filter: none`. The rebuilt desktop plan dialog, desktop suspension preview and phone subscription-status dialog each reported `blur(8px)` on the backdrop. Cancellation closed each preview without applying the proposed action.
- Phone document width was 380px within a 390px viewport; the four summary cells formed two columns and the status dialog was approximately 359px wide. A temporary preview tab was closed after responsive verification. These checks are scoped to the affected surfaces, not complete accessibility or cross-browser acceptance.
- [Measured results](../.test-report/phase-one/kpi-modal-visual-check.json), [desktop dots](../.screenshots/phase-one/kpi-dots-desktop.png), [phone dots](../.screenshots/phase-one/kpi-dots-phone.png), [desktop blur](../.screenshots/phase-one/modal-blur-desktop.png), [phone blur](../.screenshots/phase-one/modal-blur-phone.png).
- Further copy review found that the suspension preview inherits “This cannot be undone” despite offering reactivation. Correct the consequence contract during the remaining production-copy pass; this visual check does not close that issue.

## 13. Git publication and continuation checkpoint — 7 October 2026

The user authorized publication to `main` and confirmed continuation toward full Phase One closure. Application candidate **`7c7b551d1c3806ea5842dcf6379dbd21b46637c6`**, tree `89236c8d270912a45fd207b74da669593e7704c5`, was pushed to `https://github.com/Charanos/aLcassa.git` (`origin`). A direct remote read matched the local SHA. The distinct `conduit-origin` was not used. The feature branch is two commits behind this published application candidate; it was not rewritten.

- The committed checkpoint contains the console refinements, contracted-value migration/readers, atomic customer Activity and settings work, regressions and disposable verification launcher. It is a development checkpoint, not a production-readiness declaration.
- Secret review examined 612 indexed files, including 596 text files. No private environment values or machine configuration were published. One match was reviewed as the deliberately public default credential for the loopback disposable database. Private `.env` files, `.mcp.json`, local settings, generated reports/screenshots and build output are excluded. Unrelated local skill changes were preserved outside the application commit.
- Local evidence: 356/356 cache-disabled cases with no skips, production build, full lint, format and declared-dependency checks passed. The existing test-proof output was refreshed from the latest cache-disabled JSON rather than its historical 280-case report. This does not broaden those cases into full surface acceptance.
- [CI for this application SHA](https://github.com/Charanos/aLcassa/actions/runs/37552373099): remote typecheck/lint/format and Build passed. Dependency audit failed with 25 reported advisory entries across moderate/high/critical severities. Policy/isolation and both database test jobs failed during setup because the plain PostgreSQL service lacks the `storage` schema required by the complete policy catalogue; their application assertions did not execute. The following documentation checkpoint run had the same failures; retain these failed setup attempts.
- Dependency remediation is a release blocker. The current [braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) lists no patched version, so a blanket update is not sufficient. Assess maintained replacement paths or reviewed remediation and verify compatibility; do not lower the audit threshold or silently ignore findings. Other reported findings include the test worker/mocker, URI parsing, source maps, image processing and database instrumentation.

The next execution queue is doc 25 section 12: CI remediation → data/concurrency precision → complete Platform/Ops/peripheral/browser acceptance → customer Activity/settings/credentials → rules/FastAPI contracts → release/load/recovery/handover. All complete-surface acceptance cells and Phase One closure remain open until their required evidence passes.

## 14. Provider and dependency remediation candidate — 7 October 2026

- CI database jobs now provision the pinned real Supabase provider profile used locally. The provider check verifies Storage tables, `auth.uid()` and the authenticated role before application migrations. All application policies remain enabled, and isolation tests continue to use the restricted role. Disposable fixture guards explicitly admit the isolated CI environment while rejecting other database destinations.
- Six new avatar policy cases ran against the actual provider: non-bypass role/RLS, owner-folder insertion, foreign/prefix refusal, public reads, blocked direct deletion and provider-style owner removal. They do not claim browser upload or Storage HTTP acceptance.
- Compatible dependencies were refreshed, including Next 15.5.27, Sentry 11.4.0 and Vitest 4.1.11. The toolchain now requires Node 22.12+ on 22.x or Node 24+. A pnpm 9 frozen install passed.
- Raw registry findings fell from 25 to **one high finding, zero critical and zero moderate**. `braces` still has no published patched version. The local source patch bounds parser nesting and recursive AST depth. The new security gate retains the raw finding and accepts only this exact remediation after installed-copy hash verification and adversarial checks. Other moderate-or-higher findings, patch drift, muted/incomplete reports and registry errors remain blocking. See [security verification](../verification/security/README.md).
- Latest complete cache-disabled run: **368/368 passed, 22 files, no skips**, including the six Storage and six security-gate cases. Policy check: 15 tenant-scoped tables, zero problems. The first post-upgrade run passed 362/362 before the security-gate test file was added; its results are not substituted for this complete run.
- Strict TypeScript, full-repository ESLint, formatting, declared-dependency verification and the security gate passed. The production build generated all 75 pages. The existing Next ESLint-plugin detection warning remains; full ESLint ran independently and passed. A refreshed authenticated browser loaded the live plan catalogue and Overview after the dependency upgrade, with no new console errors in the recorded navigation window and no document overflow at 1028px. [Compatibility record](../.test-report/phase-one/dependency-browser-compatibility.json). These two loads do not replace action/state, phone or full-surface acceptance. The changed workflow's remote gates are still to be verified. CI artifacts now retain separate isolation, normal-suite, cache-disabled-suite and raw security assessments.
- The generated test report now uses “Test execution report” and points to the candidate/environment ledger. It no longer claims cryptographic isolation or labels a local assertion suite as production certification. Its current output was regenerated from the 368-case report.

This candidate addresses CI setup and dependency remediation. It does not close the directory allowance model, stale-write checks, complete surface matrix, service/credential implementation, load/recovery or handover gates. Phase One remains open.

## 15. Verification continuation and console refinement — 7 October 2026

- The first provider-remediation CI attempt retained two failures after provider setup worked: seeded API-key counters claimed credentials that were not stored, and pnpm's shorthand `test` intercepted report arguments. The seed now counts actual active credentials, and CI explicitly uses `pnpm run` to forward test arguments. No reconciliation auto-repair or reduced gate was introduced.
- [CI checkpoint 18e10c2](https://github.com/Charanos/aLcassa/actions/runs/37586549892) passed all six jobs: static checks, dependency audit, real-provider policies/isolation, normal tests, cache-disabled tests and production build. Local reseeding passed; read-only reconciliation checked 36 counters across 12 workspaces with zero drift. Sixty counters have no source implementation and remain explicitly skipped; this is not proof of those features.
- The working directory allowance refinement preserves unlimited (`null`), unavailable and zero capacity. An explicit unlimited override no longer falls back to the finite plan grant. Directory sorting, meters, attention, portfolio aggregation and export copy preserve these states without infinite percentages. Four unit cases and an operator-policy-backed reader case cover finite, unlimited, zero, expired overrides, missing grants and missing subscriptions. The latest complete local suite passed **373/373 tests in 23 files, no skips**, with policy coverage at 15/15 tables. [Execution report](../.test-report/results.md).
- Stored account data now renders without its former source badge or dot. Example account figures retain an explicit preview label. The shared KPI texture uses the hero's 24px pitch, smaller decorative artwork and a more compact band. Settings and workspace details share a slim underline navigator rather than a boxed segmented container. Shared panels, filters, directory cards, plan cards, rules and profile records have quieter borders, corners, padding and shadows. The stronger elevation of real overlays is retained.
- Settings now separates editing, regional defaults, scope, safeguards, planned notification channels, retention, downloads and integration availability. It does not show fake toggles, keys or delivery readiness. Inactive panels are explicitly hidden while staying mounted. Arrow keys, Home and End remain supported. Narrow-phone verification found cramped notification columns; the corrected compact matrix gives event text its own readable column.
- Browser verification of the Settings workflow passed edit retention across sections, validation, review/cancel, discard, audited persistence and restoration. Independent database readback confirmed the restored platform name, both before/after records, matching actor identity and distinct request references. The review backdrop computes to `blur(8px)`. [Readback](../.test-report/phase-one/settings-refinement/database-readback.json).
- Charts now own their height in normal flow, reserve axis spacing and use opaque tooltips. The ageing chart has a truthful empty state when no estimated overdue amounts exist, avoiding multiple rounded zero labels. Historical financial estimates remain labeled as estimates.
- Follow-up inspection found one remaining cryptographic-guarantee sentence inside the report's isolation grouping, despite the earlier header correction. That sentence now describes recorded policy/boundary assertions. The historical paragraph above records the earlier intent; this follow-up closes the missed wording without expanding the suite's acceptance claim.
- The workspace drawer now uses the shared inverted KPI band for recorded seat and subscription values. Event reporting is stated as unmeasured rather than zero, and the hardcoded hosting-region/location claim has been removed. Support copy now distinguishes permitted workspace information from unavailable conversation bodies; it no longer says support reads no customer records. Drawer section controls and Overview telemetry controls use the same quiet underline treatment, with pressed state and 44px targets.
- Final production visual replay passed 38 page/section renders: 13 console/access entry routes plus all six workspace-detail sections at 1028px and 390px. The provisioning route redirects into its dialog; that dialog also measured 920px on desktop and 348px on phone, with the shared 8px blur. All four drawer sections and all five Settings sections were checked; Settings additionally passed at 320px, with its notification event column measuring 116px without text overflow. The observed charts had zero axis-label collisions or heading intersections. No removed badge, document overflow or new browser-console errors appeared in this replay. [Measured visual states](../.test-report/phase-one/settings-refinement/visual-readback.json), [Settings desktop](../.test-report/phase-one/settings-refinement/settings-desktop-final.png), [Settings phone](../.test-report/phase-one/settings-refinement/settings-phone-final.png), [drawer](../.test-report/phase-one/settings-refinement/workspace-drawer-desktop-final.png).
- The final production build generated all 75 pages; strict types, full-repository lint, formatting and declared imports passed, with additional lint/format checks after the final drawer/copy changes. The staged index scan checked 626 files against 14 private local values without findings, excluding only the documented public loopback provider default. The exact published UI commit and its CI outcome are recorded in the local candidate record and GitHub Actions; the older green CI checkpoint is not substituted for this candidate.
- These are visual/read-only state checks, not complete action acceptance. Provisioning submission, invitation delivery, its timing and rule-propagation claims still need lifecycle/contract evidence. Complete keyboard/accessibility, action/error/conflict matrices, stale subscription/rule edits and the other Phase One release gates remain open.

Phase One remains open. This checkpoint does not claim full surface/action acceptance, stale-write completion, the credential/service door, load/recovery, delivered email or handover.
