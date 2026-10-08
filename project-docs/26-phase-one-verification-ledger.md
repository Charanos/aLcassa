# 26 · Phase One verification matrix and evidence ledger

**Created:** 6 October 2026, Africa/Nairobi

**Governing plan:** [25 · Phase One completion](25-phase-one-completion-plan.md)

**Baseline:** `f82f5df` plus the inspected working tree

This is the execution record for the plan. Source inspection is not a test pass. All verification cells start **Pending**, except the baseline typecheck failure recorded below. The case IDs are specifications for tests to implement/run, not names of an existing automated suite.

**Latest review, 8 October:** [Published verification record](/project-tracker/verification)
contains downloadable results, fingerprints and reviewed browser images. Matrix
rows below distinguish partial recorded coverage from pending acceptance checks.

## 1. Recording rules

States: **Pending**, **Partial**, **In progress**, **Passed**, **Failed**, **Blocked**, or **Not applicable**. A Passed cell requires a linked artifact, candidate SHA and environment/schema identity. Partial means named checks have evidence while the full row manifest remains open. A Blocked cell requires its exact dependency; Not applicable requires a reason. Do not merge implementation progress and test results into one green status.

For each page row, expand an action/state manifest before implementation: every visible tab, button, link, menu, dialog, drawer, chart, export, preference and route variant gets an ID. Mark read-only helpers as reads; a page view should not manufacture mutation/audit events. Derive API/action roles and audit expectations from docs 06/07/09 and actual service contracts.

Every page receives the common checks in doc 25 section 3. **D** means data/read/query evidence; **F** functional, permission, mutation and audit evidence; **V** visual, states, accessibility and responsive evidence. Runtime/performance evidence accompanies each record.

## 2. Console route matrix

Fourteen existing console page routes, in the requested execution order. Each row also includes its loading/error states and nested interactions.

| ID | Route | Required actions/data | Case families | D | F | V |
| --- | --- | --- | --- | --- | --- | --- |
| P01 | `/platform` | Counts, queue actions, insights, portfolio, capacity, recent activity and links | J01, J03, J04, J05, J06, X01 | Partial (§12) | Partial (§12) | Partial (§12) |
| P02 | `/platform/tenants` | Search, filters, sort, pagination, row menus, detail drawer, support entry, roster CSV | J01, J02, J03, J04, J08, X01, X05 | Partial (§17–18) | Partial (§17–18) | Partial (§17–18) |
| P03 | `/platform/tenants/[id]` | Deep-linked tabs, drawer parity, plan/subscription/override/suspend/reactivate, contract, support | J03, J04, J05, J06, J08, X02 | Partial (§12,16) | Partial (§12,16) | Partial (§12,16) |
| P04 | `/platform/tenants/new` | Field validation, unique slug, owner/delivery state, provisioning/recovery, list invalidation | J01, J02, X02 | Partial (§19–21) | Partial (§19–21) | Partial (§19–21) |
| P05 | `/platform/plans` | Limit preview/change, headroom, unlimited/over-limit, chart alternative, impact counts | J03, J05, X01, X02 | Partial (§21) | Partial (§21) | Partial (§21) |
| P06 | `/platform/revenue` | Live contracted value, pricing basis, pipeline, history, queue, source labels and CSV | J06, X01, X05 | Partial (§12,16) | Partial (§12,16) | Partial (§12,16) |
| P07 | `/platform/ai-rules` | Diff, publish, history, rollback, concurrent version, inheritance and locks | J07, J22, J23, X02 | Partial (§24) | Partial (§24) | Partial (§24) |
| O01 | `/platform/health` | Live dependency/isolation proof, source/freshness, no invented historic metrics | J25, J27, X01 | Partial (§17–18) | Partial (§17–18) | Partial (§17–18) |
| O02 | `/platform/audit` | Filters/date/pagination, readable action detail, before-after, workspace link and CSV | J08–J13, J19–J23, X04, X05 | Partial (§15–16) | Partial (§15–16) | Partial (§15–16) |
| O03 | `/platform/support-sessions` | Open, reason, register, visit drawer/timeline, extend/end/expiry and actor variants | J08–J13, X02, X04 | Pending | Pending | Pending |
| O04 | `/platform/inside` | Scope/frame, allowed reads/actions, invite resend/revoke, clock, exit and refusal | J08–J13, J19, X03 | Pending | Pending | Pending |
| O05 | `/platform/admins` | Two operators, capabilities, readable activity, profile/session privacy, real affordances | J14, X03 | Pending | Pending | Pending |
| O06 | `/platform/settings` | Save, field errors, conflict/last change, export links, break-glass engage/release | J12, J15, X02 | Partial (§15) | Partial (§15) | Partial (§15) |
| C01 | `/platform/profile` | Name/avatar/remove/password, current/other devices, activity pager, capabilities | J16, J17, J18, X03 | Partial (§15) | Partial (§15) | Partial (§15) |

Shared shell has its own row: **C02**, rail/header/mobile dock, badges, density/theme/collapse, workspace switcher, command palette, notifications, account menu and sign-out. Required cases: J08, J14, J16–J18, J24, X01, X03, X06. All evidence: **Pending**.

## 3. Customer, access and peripheral route matrix

| ID | Route(s) | Phase One coverage | Cases | Status |
| --- | --- | --- | --- | --- |
| T01 | `/app/settings/audit` | Complete customer Activity pass: vocabulary, visits, drilldown, filters/paging, time/retention, permissions and audit reconciliation | J03, J04, J08–J13, J19–J23, X04 | Partial (§16,23–24) |
| T02 | `/app/settings/company` | Audited persistence, validation, conflicts, role controls and shell readback | J20, X02, X03 | Partial (§12) |
| T03 | `/app/settings/team`, `/app/settings/team/invite` | Membership/invitation lifecycle, seat limits, roles and owner transfer | J01, J02, J05, J19 | Pending |
| T04 | `/app/settings/credentials`, `/app/settings/credentials/new` | Mint/reveal once, metadata, scopes/limits, revoke/rotation and redaction | J21, X03 | Partial (§22–23) |
| T05 | `/app/settings/ai-rules` | Tenant edit payload, version/diff/history/publish, effective rules and audit | J22, J23, X02 | Partial (§24) |
| T06 | `/app/settings/subscription` | Plan/limits/state visibility and correct downstream changes | J03, J05, J06 | Pending |
| T07 | `/app/settings/appearance` | Existing appearance persistence, theme/accent boundaries and regression | J24, X06 | Pending |
| T08 | `/app/account`, `/app/account/sessions` | Identity persistence, own sessions and revocation, support termination where offered | J09, J16, J17, J18 | Pending |
| T09 | `/app/settings` | Correct redirect, permissions and back/deep-link behavior | X03, X06 | Pending |
| T10 | `/app`, `/app/billing`, `/app/inbox` | Phase One landing/boundary/data-truth regression; contractual load on required dashboard routes; honest Phase Two seam. Wider redesign deferred. | J03, J04, J08, J26, X01 | Pending |
| A01 | `/sign-in` | Wrong/valid credentials, role landing, safe next, revoked session, mobile/keyboard | J17, J18, X03, X06 | Partial (§20–23) |
| A02 | `/sign-up` | Fields, duplicates, throttling, verification state and safe continuation | J01, J02, X03 | Pending |
| A03 | `/sign-up/verify` | Resend, delivery status, expiry and repeated action behavior | J01, J02 | Pending |
| A04 | `/sign-up/finish` | Verified continuation, provisioning/default plan/audit and replay safety | J01, J02, X02 | Pending |
| A05 | `/forgot-password` | Non-enumerating response, throttling, provider failure and delivery | J17 | Partial (§20–23) |
| A06 | `/reset-password` | Invalid/expired/reused token, validation, session handling and login | J17, J18 | Partial (§20–23) |
| A07 | `/invite/[token]` | Valid/expired/revoked/used token; correct identity/workspace/role; replay | J01, J02, J19 | Partial (§20–23) |
| E01 | Root, console and tenant error/404/loading boundaries | Correct shell, safe retry/navigation, nested/global failure and skeleton shape | X06 | Partial (§18,21) |
| E02 | `/project-tracker`, `/docs/[slug]` | Accurate current gate statements, links and document navigation | J28, X06 | Partial (§25) |
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

## 16. Concurrency, customer Activity and deployment repair — 7 October 2026

- Subscription assignment now checks the exact reviewed allowance/usage fingerprint under the subscription lock. Missing grants deny access, live overrides retain zero/unlimited values, override-only keys match the tenant guard, and inactive plans are refused. Subscription writes advance their version; stale or competing assignments do not commit mutation audit records. Both the workspace dialog and the Overview shortcut require the preview.
- Shared guidance publication and restoration serialize on the singleton row and compare the displayed published version. Tests cover competing publication, stale restoration, retained immutable version content and draft refusal. This checks the reviewed active version; a separate monotonic root revision and the complete tenant/FastAPI propagation contract are still open.
- Catalogue allowance changes now require a fingerprint of the reviewed grant, subscriptions, usage and live overrides. They serialize the selected grant, distinguish missing measurements from zero, retain override precedence, accept zero/unlimited and reject malformed numeric values. Successful changes record before/after platform metadata and customer-visible activity for the affected workspaces, then invalidate their entitlement snapshots. The focused regression set passed 21 cases; the first catalogue attempt retained two test failures (callback argument expectation and the wrong capability-error constant), both corrected before the passing run.
- The customer Activity reader now projects explicit, human-readable subscription/allowance/settings changes and intended reasons. It excludes arbitrary nested payloads and secret fields. The actual browser initially displayed only “Plan changed”; that evidence exposed the missing details, which this candidate corrects. The new reader case verifies the projection under real tenant policies. The rebuilt customer page displayed Business/Pro changes, KES 17,000/3,400 values and both recorded reasons. Its expanded reference matched the independent mutation readback. Complete action coverage and phone acceptance remain open.
- The isolated subscription browser journey refused a changed-usage preview while retaining the reason, then applied Pro and restored Business. Independent readback correlated two customer/platform mutation pairs and found no mutation audit for the refused stale preview. The initial readback helper used the wrong timestamp column; it was corrected to `occurred_at` and rerun. [Readback](../.test-report/phase-one/completion-20261007/subscription-readback.json).
- Source cleanup refined 198 reviewed comments across access, Platform/Ops, tenant, marketing/presentation, API and affected controls. Each comment-only transformation preserved emitted JavaScript; 25 redundant empty JSX expressions were also removed from six affected pages with the same equivalence check. Behavioral changes are verified separately. Lint directives and useful boundary explanations remain.
- Production investigation found the configured Supabase database had only migrations 0000–0003. Both roles connected and had table access, but `platform_admins.notifications_read_at`, `subscriptions.contract_amount` and `subscriptions.past_due_since` were absent. A direct read reproduced PostgreSQL `42703`. All four applied migration hashes matched the repository. The exact error digest `2193721552` was not correlated to Vercel logs because the connector requires reauthentication.
- After a private before-state backup and impact review, the existing committed migration `0004_contracted_value` was applied atomically. It added the three columns, dated two existing past-due subscriptions and initialized four missing subscription records using the migration's trial policy. The migration journal now has five matching entries, no active workspace lacks a subscription, and the application role remains `NOBYPASSRLS`. No schema downgrade or permission relaxation was used.
- Authenticated smoke on the deployed Vercel site then loaded Overview, directory, plans, subscription value, master guidance, health, audit, support register, admins, settings, Profile and all six Acme workspace sections. Three initial render waits exceeded the browser deadline before the pages completed; retain this as unresolved performance evidence. These are read-only smoke checks, not load qualification or production action acceptance. The user also confirmed the deployment bug was fixed. [Route record](../.test-report/phase-one/completion-20261007/production-route-readback.json).
- `pnpm check:deployment` now compares every application column and migration hash with the release, checks database destination consistency and refuses an application connection that bypasses RLS. It is read-only and runs in the provider/isolation CI job. The disposable upgrade drill proved refusal before 0004 and acceptance after it. CI does not upgrade production; deployment operators must run the check with the destination environment.
- OAuth callback and ordinary sign-in now share local-return-path validation, including backslash/control-character URL parsing cases. Seventeen regressions passed. Console errors no longer promise that other pages are unaffected. The Overview's directory link uses the live portfolio count. The wider tenant Overview remains a preview and explicitly identifies its example figures; it is not counted as Phase One dashboard implementation.
- Latest complete cache-disabled suite: **420/420 passed in 28 files, no skips**; policy coverage remains 15/15 tenant-scoped tables with zero problems. This supersedes the earlier 406-case run without discarding it. The execution report was refreshed from the actual complete JSON. Production build, latest browser replay and publication outcomes are recorded after their completion; do not infer them from older checkpoints.
- Live Resend readiness still reports no configured sending domains. DNS lookup for `alcassa.co.ke` returned no such name; registration/ownership is unconfirmed. Vercel account/domain inspection is waiting on connector reconnection, and a domain/DNS-provider answer is still needed. The readiness script now correctly treats Resend's SPF return-path MX as part of sending verification and avoids duplicating fully qualified DNS names. No real invitation or delivery test was sent.

Phase One remains open. The next required work includes updated action/browser acceptance, complete credential and provisioning/recovery journeys, tenant rules and the authenticated FastAPI door, API contracts/propagation, measured accessibility/load, provider delivery, recovery/backup drills and the agreed handover gates. A repaired deployment and passing local assertions do not close those conditions.

## 17. Health, directory and tracker continuation — 7 October 2026

- The user requested continued tracker updates, a restored Health hero/chart hierarchy, grid as the default directory view and refinement of both grid/list views. This remains part of the existing Phase One surface matrix.
- The local allowance browser journey changed Business seats from 10 to 11, then restored 10. Editing a reviewed value disabled confirmation until a new impact check completed. Independent database readback matched both platform mutations to each of the six affected customer Activity records. The original allowance is restored. [Readback](../.test-report/phase-one/completion-20261007/allowance-readback.json).
- Browser verification found that the customer account menu unmounted the sign-out form before its POST submitted. Preventing the menu's selection dismissal retained native form submission; the rebuilt browser reached `/sign-in` with the signed-out confirmation. Other sign-out forms were reviewed for the same structure. No browser credential change was made.
- The Health restoration uses the existing, actor-scoped audit aggregation and live policy catalogue: a recorded-operation hero chart, dotted KPI summary, isolation panels, activity chart and explicit service-monitoring sections. It does not reintroduce example uptime/latency or interpret absent monitoring as zero failures. The policy-check duration describes this page's check, not API response performance. Request latency, service uptime, queues and incidents still need connected monitoring before M6 acceptance.
- The directory now defaults to grid. Cards have aligned, quieter footers and direct workspace links; support controls name their workspace. List sorting uses focusable buttons and exposes the current direction with `aria-sort`. Allowance edit controls also have distinct accessible names, and the impact explanation no longer promises universal enforcement of every catalogue value.
- Tracker notes were reconciled with the current evidence. Auth and Subscriptions remain active while their end-to-end and service-door gates are open. Company/Activity progress, the 420-case checkpoint, the repaired deployment and the email dependency are explicit. Progress percentages are labeled as engineering estimates; they do not replace milestone acceptance.
- The first requested phone viewport applied to the selected production tab rather than the local verification tab. Its desktop capture was renamed as an unapplied-viewport attempt and is not counted as phone evidence. Final visual/browser and publication results are recorded after they complete.

## 18. Loading feedback and canvas Health charts — 7 October 2026

- The next refinement replaces the live Health hero's hand-authored SVG and its activity plot with Chart.js canvas charts. Both consume the same actor-scoped audit window; 7/14/30-day controls, pointer tooltips and keyboard-readable daily totals/categories are implemented. Period changes destroy the previous chart, resize with their containers and avoid motion-based chart animation. Missing uptime, request latency, queue and incident sources remain explicitly unconnected rather than fabricated chart values.
- A shared navigation link uses Next.js's pending-link state for immediate, indeterminate feedback across 37 Platform/customer shell and page consumers. It retains Next's navigation semantics, including query-only workspace sections, history, modified clicks and external destinations. Completion is not simulated with a timer or percentage. Final successful/error/cancelled browser replay is still required.
- Existing route skeletons were inventoried. The Health loading structure now matches the restored hero, KPI strip and sections; the directory skeleton follows the default grid, and workspace-detail placeholders use the inverted strip and slim section rail. New outer loading boundaries cover the authenticated console/workspace layouts, before account data is resolved. Shared skeleton status has readable announcement text, reduced-motion styling and a title width that fits phone screens.
- The local browser visibly rendered the outer Platform loading state while authentication was resolving. This is initial loading evidence only: the local Auth service was offline. The previous 75-page production build passed before these newest canvas/loading changes and does not qualify this candidate.
- Docker was restarted from its registered installation, but C: free space dropped to about 3 GB. The disposable-stack script refused startup below its 6 GB threshold. Automatic approval review rejected removal of the generated `.next-local-verify` cache with “blocked by policy”; the verification server alone was stopped, and a request to free at least 10 GB remains pending. No rejected deletion was retried through another mechanism. Chart interaction, phone replay, current build and publication are pending; the earlier 420-case result remains the last complete suite.

- Verification resumed after disk space recovered to more than 10 GB. The disposable Auth/database/Storage/mail-capture containers and loopback ports were independently checked healthy. The startup script reported stopped optional services and exited through PowerShell's native-command warning handling; its exit is not recorded as a clean startup pass. The earlier refusal and rejected deletion remain historical attempts.
- The final canvas/loading candidate passed the complete cache-disabled suite: **420/420 tests, 28 files, no skips**. The report was regenerated from that JSON and its proof check passed. Strict types, full-repository ESLint, formatting, declared dependencies and the pinned security gate passed. The current production build generated **75 pages**. This build includes the new charts and loading boundaries; the earlier build is not substituted for it.
- Authenticated browser replay verified the live Health canvases at 1280px, 390px and 320px, with no document overflow. The hero's 7-day selection changed its recorded total; a keyboard-selected day displayed its corresponding totals, and the pointer tooltip matched the daily breakdown. Both chart surfaces expose readable daily categories. The shared dotted strip and smaller background artwork remain visible. [Desktop chart and tooltip](../.test-report/phase-one/loading-health-20261007/health-tooltip-desktop.png).
- The directory opened in grid view. Pagination reached rows 11–12 of 12; a no-match search and Clear filters returned to the register. List sorting worked through Enter and exposed ascending state. Grid fit at 390px and 320px; at 320px the list's 762px table scrolled inside its 260px container while the document stayed within the viewport. Direct navigation opened the correct Acme workspace. Its query-only Subscription link announced “Loading page…” and cleared that status after the Subscription content completed. [Grid phone](../.test-report/phase-one/loading-health-20261007/workspace-grid-phone.png), [list desktop](../.test-report/phase-one/loading-health-20261007/workspace-list-desktop.png).
- Existing disposable customer sign-in reached the outer workspace loading boundary. Customer Activity then showed the recorded allowance and subscription before/after values, reasons and expandable reference at 320px and 390px without document overflow. The browser sign-out returned to Sign-in and the operator session was restored. No credential was changed. [Activity phone and expanded reference](../.test-report/phase-one/loading-health-20261007/customer-activity-reference-phone.png).
- The rendered project tracker retained the 420-case checkpoint and the open invitation, recovery, credentials, rules, monitoring and handover gates. Progress remains an estimate. This is successful-navigation and responsive evidence; complete cancellation/error, action, accessibility and load acceptance are still required.
- The next dependency-ordered work package is provisioning and account recovery. Source review found that owner invitation occurs before operator-capability, slug and plan checks. Move validation before the external invitation, repeat checks at commit and verify compensation before treating that journey as accepted.

Phase One remains open. This verified work package is ready for publication; exact-commit CI and deployed outcomes are recorded after they occur. It does not declare the Platform milestone accepted.

## 19. Published console checkpoint and provisioning qualification — 7 October 2026

- The console work package was published to the verified `origin/main` as **`aa10c83943ad300109e49fc3f28f825786072269`**. [Its CI run](https://github.com/Charanos/aLcassa/actions/runs/37663786391) passed all six jobs: static checks, dependency audit, real-provider isolation, normal tests, cache-disabled tests and production build. The staged scan checked 641 files against 14 private values with no findings; unrelated skill changes remained unstaged.
- Authenticated deployed read-only replay loaded Health's two live canvas charts, accepted its Activity period control and opened the directory with Grid selected. Health's layout fit the actual 1480px viewport without document overflow. Initial outer loading and the directory loading status were observed. These deployed reads do not qualify production mutations, load performance or monitoring. [Published Health](../.test-report/phase-one/loading-health-20261007/health-published-desktop.png).
- The next work package moves capability, slug and active-plan validation before the external owner invitation. Those checks repeat inside the creation transaction; its plan row is held against deactivation until commit. Concurrent slug conflicts are translated from the specific unique indexes. The successful creation audit now names the new workspace by both target and entity ID. The privileged preflight has a distinct read verb, so Health does not count it as a change.
- Refusals do not expose provider diagnostics or recommend unsupported existing-owner setup. Rollback messages distinguish a removed temporary account from an account requiring recovery and acknowledge that an invitation may already have been sent. Both returned and thrown compensation failures report recovery. Permission revoked during Auth is rechecked before database creation.
- Deterministic tests keep actual database transactions and replace only Auth responses. The corrected first set passed 16 cases; subsequent coverage adds thrown cleanup and workspace audit correlation. The first focused attempt used a nonexistent audit helper export; it was corrected rather than weakening the assertion. Final aggregate results are recorded below when complete.
- A separate actual-provider test created the invited Auth owner, workspace settings, invited-owner membership and trial subscription. Mailpit captured the invitation inside the disposable environment, and teardown verified removal of the test Auth account. This is local captured-email evidence, not production delivery or owner acceptance. CI now exports only the named loopback provider's keys to its job environment with masking, so this contract runs against the same local provider rather than a hosted account.
- The first 437-case full run passed. A later expanded 438-case run exposed two customer Activity failures: a just-written event was omitted, and failed-case cleanup then affected pagination. The reader used application time to bound database timestamps. It now reads database time within the tenant context, preserves snapshot microseconds through the cursor, validates fine-grained ordering and keeps retention tied to current database time. Fixture cleanup runs even if the safe-projection assertion fails. A lagging-application-clock regression and microsecond cursor checks were added. The focused repair passed 10 cases; its first implementation attempt retained a non-executable query builder and a fixture missing required entity type, both corrected before the passing run.
- The local verification launcher now invokes pnpm through Corepack to honor the repository's pinned package manager. The previous global launcher printed configuration warnings before delegating to pnpm 9; those warnings are retained in the attempt log.

- Final complete cache-disabled run: **440/440 passed, 30 files, no skips**. Policy coverage remains 15/15 tables with zero problems. This supersedes the failed expanded run without discarding its log. Strict types and affected-source lint passed. The tracker now records 440 cases, the published Health/loading/directory checkpoint and the local provisioning evidence; it also removes the unqualified claim of channel-limit enforcement.

- The current candidate production build generated **75 pages**. Full-repository ESLint, strict types, formatting, declared dependencies (545 files) and the pinned security gate passed. The proof check regenerated the report from the complete 440-case JSON. The Git index scan checked 644 files against 14 private values with no findings; unrelated skill changes remained unstaged.
- Authenticated replay of that build rendered the tracker with 440 cases and its open acceptance gates. The customer Activity page retained the recorded before/after values and reasons after the clock correction; sign-out returned to Sign-in and the operator session was restored. Health loaded both canvases without a route error or document overflow. [Tracker](../.test-report/phase-one/loading-health-20261007/tracker-440-desktop.png), [Activity](../.test-report/phase-one/loading-health-20261007/activity-after-clock-fix-desktop.png).

Publication and exact-commit CI remain pending. M1's existing isolation checkpoint is retained; complete owner acceptance and failure recovery still require the M2 journey. Phase One and handover remain open.

## 20. Account confirmation and recovery checkpoint — 8 October 2026

- The provisioning/Activity-clock checkpoint was published as **`ee098c1803f0b88f0ecc9c90ba240a4fccdde6f0`**. [Its exact-commit CI](https://github.com/Charanos/aLcassa/actions/runs/37668189532) completed successfully. This records the outcome that was pending in section 19; it is not evidence for the current account candidate.
- Owner invitation email and recovery now point to a dedicated confirmation page. It supports the actual implicit invitation, PKCE code and token-hash provider formats through a same-origin POST. The page removes held proof values from its URL and initially used no-referrer metadata (corrected after native browser replay in section 21). Malformed, expired, reused and ordinary password-login proofs do not create an email flow. Supabase `getUser` validates the identity and `getClaims` verifies the authentication method and recency. This pinned provider records email verification as `otp`, rather than distinct invite/recovery AMR methods; the implementation accepts that verified recent method and never treats a query parameter or user metadata as a workspace role. [Provider claims verification](https://supabase.com/docs/reference/javascript/auth-getclaims), [authentication method reference](https://supabase.com/docs/guides/auth/jwt-fields).
- The resulting identity-bound database flow expires after 15 minutes and cannot open Platform or the customer app. A deterministic ID binds each application confirmation to the verified provider session and purpose, so that session cannot restart the same setup flow. Password writes claim the account under a transaction-level advisory lock before calling Auth. Definite provider refusals release the claim; unknown network/server outcomes retain it and show uncertainty rather than claiming the password failed. An expired pending claim no longer blocks a fresh flow. This does not make the external Auth update and subsequent database operations one distributed transaction.
- Owner activation resolves the confirmed identity's stored membership, refuses ambiguous/missing/non-owner/removed access and closed or suspended workspaces, rechecks the member under a row lock and writes exactly one joining audit event with the status change. It never accepts a caller-supplied workspace or role. Setup can resume after the password is saved but activation fails. Recovery revokes prior application sessions, writes safe password-change metadata and requires another sign-in. Audit payloads contain no password, proof or email address.
- Access pages now distinguish a real invitation from an unavailable link, stop rendering example names for invalid tokens, show neutral recovery-send confirmation and require verified proof before displaying password fields. Existing account invite acceptance does not ask for a new password. Full colleague invitation/signup/confirmation and OAuth acceptance remain open; the owner-provider contract does not qualify those journeys.
- Attempts are retained: the initial exact-path redirect allowlist silently fell back to Site URL until the query parameters were included; a replay assertion incorrectly matched `error_code` as a new code; an attempted root-workspace `FOR SHARE` read was filtered by the owner's existing policies and was removed without weakening those policies; the new claim fixture initially omitted required `last_activity_at`; and an AMR check expecting distinct purpose methods was corrected against the actual provider's verified OTP claim. The corrected focused set passed **19/19 cases**. No failed run is substituted as passing evidence.
- The complete cache-disabled candidate run passed **459/459 tests in 34 files, no skips**. Policy coverage passed for **15/15 tenant tables with zero problems**. Strict types and full-repository lint passed, and the report was regenerated from the complete JSON with its proof check. [Suite JSON](../.test-report/phase-one/cache-disabled.json), [readable proof](../.test-report/results.md). Tracker statuses and engineering percentages remain unchanged; only the verified capability notes and test checkpoint advance.
- Local Auth redirect URLs include the full `?type=invite` and `?type=recovery` destinations. Both provider restarts retained the disposable database and exited successfully. The local origin is explicit; production Vercel email uses its canonical production domain when supplied rather than a retained localhost origin. Hosted Auth redirect configuration, SMTP/sending-domain readiness and delivered production email still need separate evidence. The local tests use actual Auth, database policies and mail capture with a request-cookie harness, rather than a complete HTTP/browser lifecycle or a measured invitation-to-login duration.

- The first local production build passed and generated **78 pages**. Browser replay rendered the invalid-invitation refusal and refused to display password fields without verified email proof. It also exposed an unsupported “Live in under 5s” promise in the shared access illustration. That claim and its simulated live-status dot are removed; the unavailable credential capability is labeled “Coming next.” Shared access-layout/illustration comments are now concise. Confirmation adds native-form submission feedback and duplicate-click protection, confirmation responses suppress proof-bearing referrer paths, and OAuth failures log only a safe provider code. These refinements require the final rebuilt candidate rather than using the first build as their evidence.

- Security review found that the provider's PUBLIC/browser-facing roles inherited SELECT/INSERT/UPDATE/DELETE rights on `sessions`. Because actor resolution supports a validated JWT fallback, ownership policies alone did not make issuance/revocation a server-only operation. The candidate release checks were stopped, and the maintained policy catalogue now revokes those rights from PUBLIC, anon and authenticated roles. The private application connection retains its existing rights. This is a policy reconciliation, not a new schema migration.
- A real provider JWT now receives **403 / 42501** when attempting to insert a forged recovery flow, revive a revoked application session or read its private records through REST. An additional regression checks effective permissions for both browser-facing roles and the preserved application issuer/revoker. The expanded focused set passed **20/20** cases. The final complete cache-disabled suite passed **460/460 cases in 34 files, no skips**, and the proof report was regenerated from that JSON. The stopped build/suite attempts are retained and are not recorded as successful final checks.
- The same grant gap was independently confirmed in the hosted project. The bounded production restriction committed only after transaction readback proved browser-facing access was removed and all existing private application rights remained intact. No customer rows were changed. Authenticated deployed Health then loaded its actual canvases and policy panels, confirming the private console read path remained available. [Production grant receipt](../.test-report/phase-one/auth-production-session-grants.json), [Health after restriction](../.test-report/phase-one/auth-20261008/production-health-after-session-grants.png). This read does not qualify the unpublished account routes or hosted email delivery.
- Replaying the maintained policy catalogue in the named local environment completed successfully with **46 active policies**. The real-provider/session boundary set then passed **20/20 cases again**, proving the committed catalogue preserves the restriction and the normal private application lifecycle. The earlier permission snapshot is retained separately from the qualification receipt. This closes the discovered session-grant defect; it does not close M2's remaining browser/provider acceptance gates.

Final build, responsive browser replay, publication and exact-commit CI are retained in the release evidence and the next published ledger checkpoint after completion. M2, Phase One and handover remain open. The disposable owner browser journey requires the account holder to enter and submit the new password; that boundary must not be replaced by an API-only success claim.

## 21. Native account acceptance and access presentation — 8 October 2026

- The complete cache-disabled regression run passed **463/463 cases in 34 files, no skips**, including actual-provider owner acceptance and recovery, browser-role session denial, and the branded captured invitation/recovery templates. The earlier template attempt failed a whitespace-sensitive HTML assertion after formatting; the corrected assertion normalizes display whitespace and the failed attempt is retained. These route-handler contracts still do not substitute for the native browser journey.
- Native confirmation exposed a defect invisible to the cookie harness: `no-referrer` caused the browser to send an opaque `Origin: null` on a form POST. Confirmation now uses `strict-origin`, preserving the same-origin request check while withholding the path/query and held proof. An explicit regression continues to refuse opaque origins. The browser successfully used the actual captured invitation and reached verified password setup.
- The account holder entered and submitted the password. The browser subsequently opened the named disposable workspace; readback confirmed an active, joined owner, exactly one joining audit, one active tenant session and no active email flow. An interim pending message was reported before the workspace appeared. Native password forms now display submission progress and prevent repeat clicks; the reset page derives pending state from the stored claim, rather than letting an old error query override a confirmed saved state. The local development workspace route required a lengthy cold compilation, so this acceptance is not a production timing qualification. [Owner readback](../.test-report/phase-one/auth-browser-owner-readback.json).
- Confirmation, password setup and recovery share an inverted-chrome artwork panel with a restrained dotted texture, email/key illustration and clear hierarchy. The initial gradient used a background-colour declaration and rendered pale behind white type; it is corrected to a background declaration. Desktop and small-phone replay confirmed readable contrast and no document overflow. Fixed character-width caps are removed from text throughout the shared console, settings, Health, directory, tenant detail, plans, rules, support, customer and marketing surfaces; structural page, form and dialog widths remain.
- Application emails and Auth invitation/recovery templates share the same restrained navy/white layout, clear primary action, visible fallback link and privacy guidance. The actual local provider loaded the generated HTML, and captured emails rendered in desktop/phone previews. `check:email-templates` detects divergence between the committed provider HTML and shared source and runs in CI. Hosted Auth template installation, SMTP configuration, verified-domain ownership and delivered production email remain open gates; a repository deployment does not install provider templates.
- Restarting the disposable provider exposed a Windows PowerShell false failure on a successful CLI status notice written to stderr. The launcher now scopes nonterminating stderr handling to that status read, separately rejects a nonzero exit and validates the named loopback API before using output. The repeated Start completed successfully without printing secrets or replacing existing local credentials.

- Headroom cards now prioritize measured counters and summarize unavailable measurements without empty tracks. Details distinguish median, highest recorded usage and the configured allowance, show real per-metric coverage, preserve the impact-reviewed limit editor and link to assigned workspaces. Unlimited and zero allowances have explicit text rather than a fabricated percentage scale. The shared dialog bounds and scrolls content, keeps close controls reachable and restores focus to external triggers; its nested allowance editor retains preview, reason, fingerprint and audit requirements. Phone grids allow a track narrower than 280px. Built desktop and 390px phone replay confirmed bounded dialogs, no document overflow, visible 8px background blur and functioning nested allowance preview. Cancelling returned focus first to the allowance editor trigger and then to the Headroom trigger; no allowance was saved. The read exposed missing days/hours alongside retention and response-time values; those units are restored before the final rebuilt candidate. Browser receipts qualify presentation and preview/cancellation, not a new production mutation or load gate.

- Native-form validation review also found that an invalid invitation password defaulted its error redirect to recovery, losing the usable invitation retry path. The route now preserves the validated invitation purpose before password parsing. The actual-provider contract submits a mismatched URL-encoded form, verifies the invitation error destination and unchanged setup flow, then completes acceptance. The final focused Auth set passed **21/21 in four files**. The complete 463-case report remains the earlier aggregate checkpoint; exact-commit CI qualifies these final refinements.

Final candidate build, publication and exact-commit CI are recorded in the release receipt. M2, Phase One and handover remain open: colleague/OAuth/failure-recovery journeys, hosted delivery, credentials/service contracts and the remaining operational acceptance gates still require evidence.

## 22. Credential lifecycle and authenticated service reads · 8 October 2026

The previous account/Headroom package was published as `6fd8579e349f5a56d4137e5f69bee9a83b26401d`.
All six jobs passed in [its exact CI run](https://github.com/Charanos/aLcassa/actions/runs/37712466640),
and its Vercel deployment succeeded. Authenticated production Headroom readback
showed correct hours/days, no document/modal overflow, 8px backdrop blur and
nested cancellation returning focus to both triggers. No production allowance
was changed. Receipt: `.test-report/phase-one/auth-release-20261008.json`.

### Implemented boundary

- The owner module creates random live/test keys, stores Argon2id hashes and
  returns plaintext only from the first successful creation invocation. Metadata
  reads and retries omit the secret/hash/IP. A UUID request reference derives the
  operation identity without retaining recoverable secrets; changed retries fail.
- Tenant locks and the allowance counter serialize concurrent creation. Current
  plan/live overrides are read inside the transaction. Zero, finite and unlimited
  allowances are distinct. A replacement preserves permissions/environment,
  shares its predecessor's slot and gives the old key 24 hours. Nested grace
  chains are refused; successor revocation also closes its predecessor's grace.
- Creation/rotation/revocation, counters and customer audit commit together. A
  deliberately refused audit rolls back the actual database write. Admin, agent
  and support writes are refused, including direct credential INSERT policy
  checks. Browser database grants are removed; private application grants remain.
- The credential INSERT `WITH CHECK` now repeats owner authorization. The former
  tenant-only predicate allowed a direct admin insert. Free-text redaction now
  covers the full underscore/base64url key format rather than masking only its
  prefix. These findings were fixed before qualification.
- Customer settings now read recorded credential metadata and use the shared
  owner module. The create screen offers only the two implemented permissions,
  explains that a test label does not isolate the workspace, and shows the key
  once. Replacement and revocation use accessible shared dialogs. Copy success
  is shown only after clipboard confirmation. No timestamp is claimed when
  usage has not been recorded.
- The private [FastAPI repository](https://github.com/Charanos/alcassa-service)
  resolves an indexed stored prefix through a constrained `service_lookup`
  policy, verifies the complete key, then sets transaction-local tenant context.
  Scope checks precede handlers. Protected reads use a read-only transaction,
  reject administrative/BYPASSRLS connections and require forced RLS on all
  eight queried protected tables. No caller-supplied tenant selects the workspace.
- Rules compile immutable published versions with recorded locks, additive
  unlocked guidance/prohibitions and explicit provenance. ETags include immutable
  identities and content, excluding compilation time. Missing published platform
  instructions return 503. Authentication/revocation run before conditional 304;
  responses use `no-store`. Database readiness is distinct from process liveness.

### Qualified local evidence

| Evidence | Result | Receipt |
| --- | --- | --- |
| Complete cache-disabled application suite | **479/479; 35 files; no skips** | `.verification-credentials-full.log`, `.test-report/phase-one/credentials-cache-disabled.json` |
| Focused real-database credential/fault suite | **16/16** | `.verification-credentials-faults.log` |
| Final service database, HTTP, compiler and OpenAPI suite | **20/20** | `.verification-service-final-qualified.log`, service `.test-report/service-contract.xml` |
| Node-minted key against live FastAPI HTTP | **5/5** | `.verification-service-cross-runtime-final-green.log`, `.test-report/phase-one/service-cross-runtime.json` |
| Maintained local policy catalogue | **47 policies** | `.verification-credentials-service-policies-qualified.log` |
| Bounded hosted policy reconciliation | **Five selected policies; browser grants denied; private role retained; no-context read returns zero** | `.verification-credentials-production-policy-qualified.log`, `.test-report/phase-one/credential-production-policies.json` |

The first service replay exposed a subscription policy that hid rows from the
service role; tenant-scoped SELECT now admits it, without granting writes. The
final replay also exposed reliance on an existing published master fixture; the
test now explicitly publishes and restores its disposable fixture, with a separate
missing-master refusal case. An initial Node fixture used an unsupported harness
JSON helper, then encoded a JSON string instead of an object; explicit typed
fixture literals corrected it. Failed logs remain retained alongside the green
replays. Database/rules suites run sequentially to avoid competing singleton fixtures.

The hosted policy transaction changed only credential grants/the three credential
policies and the two tenant subscription read policies. Project/role identity,
restricted runtime connection and application rights were checked before applying;
lock/statement timeouts bounded the operation. Customer rows were not changed.

### Remaining gates and release boundary

The service package builds a wheel/source distribution. Service CI covers eight
unit/OpenAPI cases plus lint, formatting and packaging. Its 12 real-database cases
and Node-to-HTTP replay remain local: private cross-repository integration CI needs
narrowly scoped read access, not a broad personal token. The maintained local
launcher validates both URLs and passes no administrative URL to the runtime.

Owner browser reveal/replacement/revocation acceptance, persisted usage rollup,
tenant publishing, repeated five-second propagation, merged API conformance,
reserved endpoint stubs, hosted service configuration, real Redis rate budgets,
load, monitoring, outage/recovery and backup restoration remain open. Email domain,
hosted template/SMTP delivery, colleague/OAuth journeys and handover remain open.
No milestone percentages or client acceptance are changed by this package.

Final release checks, bounded production policy reconciliation, publication and
exact-commit CI/deployment readbacks are recorded separately in the release receipt.

## 23. Credential browser and service operational follow-up — 8 October 2026

### Published baseline and integration CI

Application `d9450d56a75e3a8bbb1e5381818df6206112bb90` passed all six jobs in
[its exact CI run](https://github.com/Charanos/aLcassa/actions/runs/37747386894)
and its Vercel check succeeded. Authenticated hosted tracker readback showed the
479-case application checkpoint and the then-current 20-case/five-check service
evidence, with open gates and milestone percentages preserved.

Service `9ac88bd9e9879917ae3cf35a304074c955db0b2e` passed both jobs in
[its exact CI run](https://github.com/Charanos/alcassa-service/actions/runs/37747687080).
The integration job provisioned a disposable provider, applied maintained schema
and policies, passed 20 service cases and five Node-to-HTTP checks. The platform
checkout is pinned to `d9450d5`; its read-only deploy key is limited to that repo.
Private checkout secrets do not execute pull-request code. This supersedes §22's
open private integration CI access gate; full merged API conformance remains open.

### Approved native owner journey

Only the named disposable localhost workspace was changed. The user approved
creation, equivalent replacement and revocation with the two implemented read
permissions and Test environment. Its disposable owner password was reset through
the local provider admin API, prior app session revoked, and native sign-in verified.
This was fixture maintenance, not evidence of an email recovery journey.

- Creation showed a complete random key once; subsequent list reads contained
  metadata only. Database Argon2id verification and a real FastAPI read returned
  the same recorded workspace identity.
- Replacement retained permissions/environment, produced a distinct key and
  downloaded an actual `.env` containing only the replacement. During recorded
  24-hour grace both keys returned 200 while consuming one allowance slot.
- Revoking the successor also ended its predecessor's grace. Both stored rows
  ended revoked, both HTTP requests returned 401, and allowance usage became zero.
  Creation, replacement and both revocations had retained transactional audit rows.
- Dialog cancellation restored the Replace trigger; the modal had 8px backdrop
  blur and no document/dialog overflow. Successful replacement exposed a missing
  focus destination after the trigger disappeared. The follow-up focuses the
  stable credential heading after status refresh. Its native replay verified
  heading focus after successful replacement and revocation, trigger focus on
  revocation cancellation, accurate grace consequences, no overflow and no
  complete key in the final document.
- Copy reported success but the browser clipboard API returned no contents.
  Download contents were verified; clipboard readback remains unqualified.

Private keys/passwords are retained only in ignored local fixture files and were
not printed or committed. Receipt: `.test-report/phase-one/native-credential-readback.json`.
The rebuilt focus replay independently repeated database/hash/HTTP/audit readbacks
and ended both additional keys revoked with zero allowance usage. Receipts:
`.test-report/phase-one/native-focus-readback.json` and
`.test-report/phase-one/native-focus-browser.json`. Final screenshot:
`.test-report/phase-one/auth-20261008/credential-focus-revoked-final.png`.
Customer Activity showed the actual creation, rotation and both revocation records
with the recorded actor and time; no key appeared. Its screenshot and redacted
DOM evidence are retained under the same ignored evidence directory.

One collapsed-sidebar click intended for Activity navigated to Plan and usage
after hover expansion; selecting Activity from the expanded navigation succeeded.
That observation remains an open shell navigation regression to isolate, not a
qualification of every navigation state.

### Operational follow-up

| Evidence | Result | Receipt |
| --- | --- | --- |
| Service database, HTTP, compiler and OpenAPI suite | **21/21** | `.verification-service-operational-qualified.log` |
| Unit/OpenAPI subset | **9/9** | Service `.verification-operational-unit.log` |
| Real loopback database outage | Readiness and authenticated read return safe **503**, `no-store`, correlation and `Retry-After: 5`; secret canaries absent from response/logs | Service `tests/test_foundation.py` and unit XML |
| Hashed locked runtime vulnerability audit | **Zero known findings**, no ignored advisories | Service `.test-report/python-audit-hashed.json` |
| Node-minted key against refreshed FastAPI source | **5/5** | `.verification-service-operational-bridge.log` |

Service follow-up `78a71efcb95c7081151baf34487e35d4ad938dc9` passed both jobs in
[its exact CI run](https://github.com/Charanos/alcassa-service/actions/runs/37750905152):
21 full cases, nine unit cases and five live bridge checks. The downloaded Linux
audit artifact contains 21 runtime dependencies and zero vulnerable dependencies.
Receipts: `.test-report/phase-one/service-operational-ci.log` and
`.test-report/phase-one/service-operational-audit/python-audit.json`.

The maintained service launcher now strips privileged identity-provider secrets as
well as administrative database URLs from the runtime. Local fault checks do not
qualify wider Redis/provider outages, monitoring, backup restoration or hosted
service topology. Usage rollup, tenant publication, repeated five-second propagation,
phone/error/clipboard acceptance, load and handover stay open. Current environments
are development sandboxes. No milestone percentage or acceptance is advanced here.

## 24. Workspace rules and measured propagation — 8 October 2026

### Implemented boundary

The tenant editor now reads a consistent recorded snapshot, including six structured
fields, platform locks, actual authors and published/archived version history.
Publication and restoration require an authorized human role, active workspace and
subscription, a fresh allowance and exact workspace/platform revision. Per-workspace
transaction locks serialize first and subsequent publications. Monotonic pointer
timestamps detect A→B→A changes. Master writes coordinate through an exclusive
advisory lock; tenant writes take its shared counterpart without master write grants.

Published content is immutable in SQL. Retention archives without deleting history;
the live version is always retained. Restoration reuses the recorded version rather
than inventing another. Usage and attributed audit entries commit with the pointer
or all roll back. Current session API reads omit historical authors and notes;
history routes require owner/admin/support. Cross-origin writes are refused.
The editor keeps a stale draft bound to its original revision and provides a bounded
line-level comparison with readable added/removed markers.

### Qualified local evidence

| Check | Result | Receipt |
| --- | --- | --- |
| Cache-disabled regression | **506/506**, 39 files, no skips | `.verification-rules-activity-full.log`; `.test-report/phase-one/cache-disabled.json` |
| Real-database tenant lifecycle | **12/12** | `.verification-tenant-rules-final-focused.log` |
| Session HTTP boundary and line comparison | **11/11** | `.verification-rules-boundary.log` |
| Confirmed server-action readback and failure semantics | **3/3** | `.verification-rules-action-confirmation.log` |
| Actual workspace/platform publish and restore to effective FastAPI read | **12/12**, latest maximum **1,053 ms**, all below five seconds | `.verification-rules-propagation-release.log`; `.test-report/phase-one/rules-propagation.json` |
| Hosted sandbox policy reconciliation | Two bounded policy replacements and one invoker-rights trigger; grants unchanged, forced RLS and zero no-context rows | `.test-report/phase-one/rules-hosted-policies.json` |

The first focused attempt failed because `FOR SHARE` on the SELECT-only master
table does not expose rows under ordinary tenant RLS. It was replaced with the
shared/exclusive advisory coordination above, preserving master read-only access.
A subsequent attempt exposed fixture helper/column mistakes; these were corrected.
Failed logs are retained as `.verification-tenant-rules-focused.log` and
`.verification-tenant-rules-focused-replay.log`; the corrected 12-case replay and
full regression passed. The first propagation run's maximum was 404 ms; the later
qualified replay under concurrent build load measured 2,034 ms. Neither sample set
is a 50-session/p95 measurement.

### Native verification and corrections

The approved disposable owner published three recorded versions, compared changed
support-hour lines, cancelled restoration and restored version 1 without deleting
later history. Independent database and actual FastAPI readbacks matched the live
version and retained counter. The editor and modal fit a 390px viewport without
document overflow; the review backdrop computes to `blur(8px)`. Desktop history
uses two columns at 1440px. Publication/restoration return focus to the stable
heading; cancellation returns it to its trigger. A stale draft was refused with
its text preserved and keyboard focus on the error.

Native replay initially exposed stale version 1 after version 2 committed. Actions
now return a fresh recorded model after commit; the editor adopts its own confirmed
revision without silently advancing a stale draft. A failed confirmation read says
the change was saved and requires reload before another change. Activity review
exposed a missing prior restore version and invisible change note. Restore now
records the prior number, and Activity exposes rule notes through its safe field
allowlist. The 12-case database replay additionally checks the exact correlated
restore event; five Activity projection cases pass.

Browser navigation also exposed hover expansion moving collapsed links under the
pointer and removing their accessible names. The workspace rail now keeps stable
positions on hover and retains named links; expansion uses the explicit toggle.
The final build passes with 82 generated pages. Native collapsed navigation reached
Assistant rules and Activity, and the explicit expansion toggle retained its
destination. Two final restores recorded 1→2 and 2→1 with their visible reasons;
independent readback confirmed version 1, three retained versions and FastAPI content.
All disposable owner credentials ended revoked, with HTTP 401, and the original
platform pointer was restored. Earlier incomplete audit events remain historical.

Receipts: `.test-report/phase-one/native-rules-browser.json`,
`.test-report/phase-one/native-rules-restored.json` and
`.verification-rules-audit-focused.log`,
`.test-report/phase-one/native-rules-activity-browser.json` and
`.test-report/phase-one/native-rules-cleanup.json`. Safe screenshots:
`.test-report/phase-one/auth-20261008/rules-desktop-restored-final.png`,
`rules-activity-final.png`,
`rules-phone-comparison.png`, `rules-phone-restore-review.png` and
`rules-stale-focus-final.png` in the same directory.

The first pushed candidate's static job caught unsafe access to untyped audit JSON
in the added restore assertion. The assertion now matches the JSON shape safely,
and explicit repository typechecking covers test files omitted by Next's build.
The failed run is retained as `37783254432`; it is not qualified release evidence.

### Release readbacks

Application code checkpoint `275a0ad33ab95730ea0cc53467d676c242781520` passed all
six jobs in [its exact CI run](https://github.com/Charanos/aLcassa/actions/runs/37783667886)
and [Vercel deployment](https://vercel.com/dennis-munges-projects/a-lcassa/J1WJGqCA1eTa8z7vd3GN1FEN7BKC).
The deployed tracker reads 506 application cases, 21 service cases, five bridge
checks and twelve measured propagation checks; progress remains 73%, two of eight
milestones complete.

Service `46ddcf3b18e0c6c994c2c07ea8ab1641d00e23f4`, pinned to that application
code commit, passed both jobs in [its exact CI run](https://github.com/Charanos/alcassa-service/actions/runs/37783721097):
nine unit/OpenAPI cases, 21 real-database cases, five actual HTTP bridge checks and
twelve actual publication/restore operations. The downloaded propagation artifact
reports a maximum of 89 ms; the Linux runtime audit contains 21 dependencies and
zero vulnerable dependencies. This qualifies the disposable CI topology, not hosted
service latency. Receipt: `.test-report/phase-one/rules-release-20261008.json`.

This release record is a documentation follow-up to the qualified code checkpoint;
the service pin remains on the unchanged application implementation.

### Remaining qualification

Shared Redis rate budgets, usage/last-used persistence, hosted service,
complete merged API conformance, unsaved-navigation/failure journeys and the wider
surface/operational matrix remain open. Current environments are development
sandboxes; no milestone percentage or handover acceptance advances here.

## 25. Progress reassessment and published evidence — 8 October 2026

The tracker now links to `/project-tracker/verification`, with a downloadable
manifest, the 519-case current local catalogue, the 506-case qualified CI catalogue, 17 cross-runtime measurements,
native credential lifecycle/focus readbacks and five reviewed browser images.
The catalogue is an immutable snapshot of application `275a0ad` / CI `37783667886`;
service samples are from `46ddcf3` / CI `37783721097`, pinned to that application.
Each export has a SHA-256 fingerprint. The publication boundary drops raw errors,
logs, unknown fields and absolute machine paths, and refuses credential-bearing
test titles or unreconciled totals. Images retain their reviewed bytes.

The tracker/evidence follow-up passes **519/519 local cases in 41 files, no skips**,
including five publication-boundary/integrity cases and eight document-navigation cases. Its local catalogue identifies
the `e68b4a4` baseline and the follow-up scope; it is separate from the immutable
506-case CI reference. Older local artifacts not available in this workspace are
not republished as if freshly verified.

Milestone engineering estimates are reassessed: Tenant settings 45→70%, AI rules
and seams 45→75%, Handover preparation 30→40%. Overall rounded estimate moves
73→81%. These are work assessments with visible verified/remaining criteria, not
percentages of test cases or client acceptance. Two of eight milestones remain
complete; no incomplete final demonstration is promoted. Handover is actively in
verification rather than displayed as not started. Other estimates remain unchanged.

The route matrix now distinguishes partial recorded coverage from untouched
pending checks. Partial rows do not imply all actions, roles, failure states or
accessibility checks passed. Historical ledger notes and unavailable older local
artifacts do not substitute for the new downloadable checkpoint. Next execution
gates remain shared credential rate budgets, usage persistence, complete team/
account journeys, hosted topology, the remaining surface/accessibility matrix,
load, monitoring, backup restoration and final walkthrough.

Native verification follows the tracker link to the record, downloads its index,
expands the fingerprint disclosure and loads all five gallery images. The record
has no horizontal overflow at 390px; desktop and phone proof are retained under
`.test-report/phase-one/auth-20261008/tracker-evidence-{desktop,phone}.jpg`.
Explicit typecheck, format and dependency checks pass; the production build
generates the tracker and evidence routes. `test:prove` reconciles the 519-case report. Published JSON
uses LF on every checkout so its byte fingerprints remain portable.

## 26. Auxiliary document routes — 8 October 2026

The completion-plan and ledger links previously returned 404 because their sources
were absent from the static document catalogue. The documentation-set return link
pointed to a missing tracker section. Relative `.md` links resolved to unserved
paths, and historical local artifacts appeared as downloadable links.

The catalogue now includes all 25 client sources, with a tracker index and desktop/
phone reader navigation. The security remediation source has its own maintained
page. Relative source links resolve to registered document routes; section links
resolve to stable, duplicate-safe heading IDs. Private working sources remain
unpublished. Historical local artifacts are labelled as unavailable on the shared
site; no private logs are exposed or relabelled as freshly verified evidence.

Eight regression cases check every client source, private/path refusal, adjacent
navigation, local references, unsafe protocols, formatted/repeated heading IDs and
the complete rendered document link graph. The first render test exposed the test
runner's classic JSX import requirement; the component import was corrected and
all eight cases passed. Publication inputs now use typed, bounded schemas; the
initial propagation-name schema refused `master` samples until corrected to the
actual operation vocabulary. Raw artifacts remained excluded throughout.

The full disposable regression passes 519/519 cases in 41 files. Final built-route,
native responsive and exact release checks follow before this checkpoint qualifies.
Service hosting remains local by user decision. Every incomplete Phase One gate
remains open; landing-page and broader tenant shell work follow milestone closure.

Final local acceptance passes all 28 tracker/document routes, 58 section anchors
and ten public evidence assets. The internal working document returns 404.
Native navigation opens the plan and ledger from the record, switches documents
through the phone index, returns to the tracker index and opens the security
reference. Both document pages fit 390px; wide tables retain 720px or greater
readable content within 282px keyboard-accessible scroll regions. Desktop paragraphs
use the available article width. The final production build generates 94/94 routes.
Full-repository lint, formatting and declared-dependency checks pass, with focused
lint/format checks after the final table/script changes. A parallel typecheck collided
with regenerated Next types; the sequential post-build typecheck passes. Native
proof: `.test-report/phase-one/auth-20261008/tracker-plan-desktop-final.jpg` and
`tracker-ledger-phone-final.jpg`; route receipt: `.test-report/phase-one/document-pages.json`.
The staged scan checks 30 files against 14 private values and verifies every public
fingerprint against Git blob bytes. Exact release CI/deployment readback follows
the push; the published reference checkpoint remains explicitly separate.

## 27. Team integrity and confirmed UI state — 8 October 2026

The first seven real-database membership regression cases reproduced unsafe
concurrent seat reservations, repeated releases/resends, stale owner authority,
administrator role edits and repeated acceptance. A later normalized duplicate
case reproduced a generic 500 caused by the database driver's nested unique-error
wrapper. All now pass with transaction locks, current actor/allowance reads and
bounded duplicate-error inspection.

The full disposable regression passes **545/545 cases in 43 files, no skips**.
Twenty-one membership cases cover single-use acceptance, acceptance versus
withdrawal, final-seat contention, live/expired grants, missing counters versus
existing drift, suspended-member removal, owner preservation, transfer concurrency,
retired links and transactional audit rollback. Five action cases verify confirmed
team readback and distinguish committed writes from later cache/read failures.
The policy check still reports 15/15 workspace tables and zero problems. Module
email delivery is mocked; these results do not demonstrate external delivery.

Native replay reduced a disposable administrator to agent, removed a suspended
teammate and withdrew an expired invitation. Database reads show one audit per
operation and the correct seat count. The first UI replay exposed stale state
after a successful withdrawal. Actions now return a fresh team model and timestamp;
the interface keeps it until a newer server read arrives. The corrected replay
shows zero outstanding invitations and two used seats immediately, without a
reload. A committed operation whose readback fails instead asks for a reload and
disables further writes; it does not invite a duplicate retry.

Desktop and 390px phone layouts, section focus and the withdrawal review were
checked. Cancel receives initial focus; the backdrop uses 8px blur. Reviewed images
and bounded browser/database/cleanup outcomes appear in the verification record's
team checkpoint and separate `membership-manifest.json`. Publication excludes
private fixture IDs, credentials, logs and machine paths. All owned review rows,
their temporary allowance and audits were removed; the original owner and source
capacity remain intact. Historical release artifacts retain their original bytes.

Tenant settings advances **70→75%** based on this verified work. Provider invitation
journeys, ownership reauthentication review, credential clipboard/error journeys,
usage persistence and the final secrets review remain open. No milestone is newly
marked complete. The next closure order is account/team provider gates, shared
service budgets and usage, the complete Platform/Ops/peripheral matrix, then
load, monitoring, restore/setup drills and handover. Service hosting verification
remains local by the user's decision.

The hosted development sandbox's older acceptance helper was updated separately,
using the explicit project guard and only `app.accept_invitation`. Readback matches
the release body; its owner, execute grants, definer rights and pinned search path
remain unchanged. Body SHA-256: `6b62d4a49e165ec06c41be1d388b05f29bb4a18af87c2b59957e99d73d2f35d2`.
No workspace or invitation data changed in that update. The concurrency suite and
native team acceptance remain local measurements, distinct from this hosted
definition/permission check.

The preceding tracker checkpoint `85585cd` passed all six application CI jobs
([run 37793553772](https://github.com/Charanos/aLcassa/actions/runs/37793553772)) and
[Vercel deployment](https://vercel.com/dennis-munges-projects/a-lcassa/9zcvB2KCUTHMqhbNBn5CxkF8KmG7).
Deployed read-only checks covered 28 routes, 58 anchors and ten evidence assets;
the private source returned 404. The new team checkpoint receives separate final
build, static and exact release readbacks before release qualification.

Final local release checks pass: production build 94/94 routes, sequential post-build
typecheck, full-repository lint and formatting, declared dependencies and the
pinned-package security gate. Thirteen focused evidence/navigation checks pass
against the new artifact set. Built verification covers 28 document/tracker routes,
58 anchors and all 16 public assets; the internal source returns 404. The record
fits 390px without horizontal overflow. The staged scan checks 26 files against
14 private values; all six additional team artifact fingerprints match Git bytes.
Exact CI and deployment results are recorded separately after the push.

## 28. Invitation acceptance and ownership sessions — 8 October 2026

Six initial database cases reproduced failed rejoining, generic wrapped database
errors and acceptance into a suspended workspace. Three HTTP cases reproduced
global provider sign-out, mismatched identity acceptance and ignored temporary
session cleanup failure. These failures were fixed before qualification.

Acceptance now restores a removed teammate's original membership with the invited
role, without adding a seat. It retains single-use token ordering, refuses active
or suspended existing memberships, protects provisioned owners and rejects legacy
owner invitations. Workspace status is locked during acceptance. Joining writes
the actual membership ID and, for restored rows, the previous state into its
transactional audit receipt. Named database errors survive the driver's bounded
cause chain and retain their intended user-facing codes.

Ownership reauthentication checks the provider identity against the resolved
owner. Only its temporary refresh session is ended; a cleanup failure prevents
transfer. An actual disposable-provider/database transfer preserves two independent
original sessions, both of which successfully refresh afterwards, and records
one ownership audit. The test removes its owner account and owned database rows.
The session resolver and cookie adapter are replaced by disposable test context;
this is route/provider evidence, not native browser acceptance.

The complete cache-disabled local regression passes **564/564 cases in 45 files,
with no skips**. It includes 31 membership cases, eight ownership-route cases and
one actual-provider ownership case. Policies cover 15/15 workspace tables with
zero issues. Invitation email delivery remains mocked. The verification record
publishes a separate `account-gates-manifest.json` and redacted catalogue; historical
545-case team and earlier CI artifacts retain their original bytes. Focused
publication/navigation checks qualify the new fingerprints and document graph.

Tenant settings advances **75→80%**; the rounded overall engineering estimate is
83%. Auth remains 90%, pending the complete browser account lifecycle, colleague
invitation and OAuth demonstrations. No milestone is newly complete. Next close
those account journeys, credential failure/clipboard and usage persistence, shared
service budgets, the Platform/Ops/peripheral acceptance matrix, and operational
load, monitoring, recovery and clean-setup drills. Service hosting remains local
by the user's decision.

The hosted development sandbox receives only the qualified acceptance helper.
Readback preserves its owner, execution grants, definer rights and pinned search
path; no workspace or invitation data changes. Function body SHA-256:
`830c555a6d2957f9ce167e4029a6e1083bd62e47ab7c9161ed5baaf6017252ad`.

The previous team checkpoint `3674cfe` passes all six application CI jobs
([run 37804171774](https://github.com/Charanos/aLcassa/actions/runs/37804171774))
and [Vercel deployment](https://vercel.com/dennis-munges-projects/a-lcassa/8bAkwUiuLj7ZQkJeUZZ4rwV8UApR).
Its downloaded cache-disabled artifact confirms 545 cases in 43 files with no skips.
Read-only deployed checks cover 28 routes, 58 anchors and 16 assets; the private
source returns 404. Current build, static and exact release checks qualify the
account checkpoint separately.

Final local checks pass: full lint/format/dependency and security gates, 94/94
production routes, sequential post-build typecheck and 13 focused evidence/document
checks. Built read-only verification covers 28 routes, 58 anchors and 18 evidence
assets; the private working source returns 404. Native navigation opens the record
from the tracker, showing 83% overall and 80% Tenant settings. The record fits a
390px viewport with 380px document width. An unknown invitation renders its refusal
screen and returns to sign-in; the built preview endpoint responds 404 / `not_found`.
The browser-downloaded account index matches its published SHA-256. All 16 staged
owned files pass 14 private-value comparisons; both new account fingerprints and
all historical artifact hashes match Git bytes. Exact CI/deployment results follow
the push and remain separate from these local measurements.
