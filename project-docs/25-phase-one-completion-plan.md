# 25 · Phase 1 completion — the console, verified end to end

This plan takes the platform console to production grade, **every surface**,
and closes out the Phase 1 milestones around it. It covers the console's
Platform group first, then Operations, then the pages around them (profile,
the console chrome, the operator's own sign-in), and finally the customer's
activity page, which is where everything the console does to a workspace
becomes visible to that workspace. The tenant dashboard as a whole is Phase 2
and is out of scope, apart from the pieces Phase 1 milestones require (M4a,
M5).

It is built from a survey of the code on 30 Sep 2026, not from memory. Where a
claim below is a defect, it has a file.

---

## 1 · Where Phase 1 stands

| Milestone | Gate | Tracker says | Actually | What is left |
| --- | --- | --- | --- | --- |
| **M0** Design lock | Approve before code | complete | complete | — |
| **M1** Tenancy core | Isolation verified | complete, "280 tests" | complete; **318** tests, 235 of them isolation | Update the figure in the tracker |
| **M2** Auth and access | Full account lifecycle | complete | complete in code; **email not delivering in production** until the Resend domain `alcassa.co.ke` is verified and `RESEND_API_KEY` / `EMAIL_FROM` / `NEXT_PUBLIC_APP_URL` are set in Vercel | Your action, then one live invitation as proof |
| **M3** Subscriptions | Limit enforcement | complete | complete | — |
| **M4** Platform console | Console operations | active: "running on real data: workspaces, **revenue**…" | 7 of 13 console surfaces rebuilt to canon. **Revenue has no data source at all** (billing is out of scope, 08 §1). Health's service figures are designed until probes exist. The notifications bell is a literal list. | This plan |
| **M4a** AI rules and seams | A rules edit live through the API in 5 seconds | active | Master rules publish and roll back for real. The **customer's rules publish refuses** (`app/actions.ts:203`). **There is no rules API route**, so the gate cannot be demonstrated. | §6 |
| **M5** Tenant settings | Secrets auditing | upcoming | Screens exist. **Company settings do not save** (`app/actions.ts:102`). **Credentials cannot be created or revoked** (`:166`, `:182`); the `api_credentials` table exists but has no module. | §6 |
| **M6** Handover | Sign-off | upcoming | No staging environment. No per-route accessibility check in CI (the contract requires WCAG 2.1 AA at every gate). Documentation continuous. | §7 |

**The tracker needs correcting before Brian next reads it.** The M4 note says
revenue is on real data, and that is not true. It is the same kind of false
claim this project has removed from every screen it touched, and it is in the
document the client reads to judge progress.

---

## 2 · The verification standard

Every surface is checked against the same eight dimensions. A surface is
**done** when each has evidence, not when it looks right.

**A · Data truth**
- Every figure traced to its source query.
- Each band marked live or designed (`DataSource`).
- A zero means "none", not "could not read".
- Every time is in Nairobi.
- Every reader of a protected table uses the correct context, enforced by a
  structural guard test.

**B · Actions (CRUD)**
- Every control either works end to end, or states on the surface why it
  cannot yet.
- Working means:
  - a confirmation where the action is destructive or reaches customers;
  - a capability check;
  - an audit row in the platform log, and in the customer's log where the
    action touches their workspace;
  - idempotent (a double click records once);
  - an error message the operator can act on.

**C · States**
- Loading skeleton that matches the page's own shape.
- Two separate empty states (never used, and filtered out).
- An error boundary.
- A signed-out or designed view.
- A permission refusal.

**D · Visual canon**
- Header family (breadcrumbs, eyebrow, title, actions).
- `FactStrip` / `Figure` / `SectionHeading` / `Panel`.
- Tokens only; the lint rules must stay at zero.
- Tone rules: an accent only where a fact *is* a warning.

**E · Responsive**
- 1440, 1024, 768 and 390 wide.
- No horizontal overflow, *including the chrome*. Doc 24's banner overflow
  escaped a probe that only checked `main`.
- Touch targets of at least 40 px on a phone.

**F · Accessibility (WCAG 2.1 AA, contractual)**
- axe reports zero violations.
- A keyboard-only pass.
- Visible focus.
- One `h1`, and an ordered heading outline.
- Charts have text alternatives.
- Reduced motion respected.
- Contrast checked on both the page ground and the chrome.

**G · Performance**
- Console routes answer within the 400 ms budget (09 §8) on a warm server.
- No N+1 queries.
- **No service-role read on a page view.** Every such read writes a
  "bypassed RLS" audit row. That is the noise problem doc 23 found and doc 24
  found again.

**H · Hydration and runtime**
- Zero console errors at every width.
- No time-derived output rendered on the server (doc 24's clock failure).

Each surface ends with a **verification record** in this document:
- screenshots at four widths;
- the axe result;
- the test names that cover its actions;
- the queries it runs, and their count.

---

## 3 · Stage 0 · The tooling that makes this repeatable

Doing this by hand thirteen times is how drift gets back in. Build the
harness first.

1. **`pnpm verify:surfaces`.** A Playwright runner that grows out of
   `scripts/screenshot.ts` and the doc 24 verification script. For each route
   it records:
   - console errors, which must be zero;
   - the overflow probe over the whole document, not only `main`;
   - axe-core (`@axe-core/playwright`);
   - server response time;
   - screenshots at four widths.

   It writes a JSON report and a one-page summary.
2. **Scenario fixtures.** Several surfaces only show their real behaviour with
   state: an open visit, a suspended workspace, an expired invitation, a
   customer at the seat limit. Each scenario gets a setup and a teardown that
   deletes everything it wrote, the pattern the isolation suite already uses.
3. **A disposable database for end-to-end runs. Decision E1.** Every
   verification so far wrote into the same development database the demo
   uses, and cleaned up after itself. A Supabase branch for e2e removes the
   risk entirely and lets CI run the same checks.
4. **A seeded customer account. Decision E2.** No customer in the seed has a
   password, so no customer-side surface can be verified signed in (doc 24
   could not screenshot the customer's frame). Seed the owner of one tenant
   with a development password from `.env.local`, as the operator already is.
5. **Structural guards.**
   - Extend `audit-readers.test.ts` into a readers test covering every console
     reader of `tenants`, `sessions`, `platform_audit_log` and the billing
     tables.
   - Add a page test: any page that can fall back to fixture data must render
     a `DataSource kind="designed"` marker when it does. Six pages currently
     fall back with no marker at all: Overview, Workspaces, Plans, Revenue,
     Master rules and Profile.
6. **CI.** The doc 23 Stage 3 visual job, now running `verify:surfaces`
   against the Vercel preview. This needs a CI operator account and three
   secrets from you. It is merged once it has run green on its branch.

---

## 4 · The surfaces

The order is Platform, then Operations, then the pages around them, then the
customer's activity page. **Status** is what the survey found. **Work** is
what the verification pass must deliver on top of the standard in §2.

### 4.1 Platform

#### Overview · `/platform`
- **Status:** live since D1 (workspace counts, open visits, members, queue,
  recent activity). The insights band reads `getOverviewInsights()`, a
  fixture, with no marker. The page predates the header, `FactStrip` and
  `Figure` family.
- **Work:**
  - rebuild to the canon;
  - make insights live, or mark them designed;
  - check that the queue's acting control ("raise plan") runs end to end and
    lands in the customer's log;
  - confirm the numbers agree with Workspaces (the same counts, from the same
    readers).

#### Workspaces · `/platform/tenants`
- **Status:** live since D1: plan, seats, and last activity through
  `app.workspace_summaries`. The event columns read 0 because no source
  exists (stated in the code, not on the page).
- **Work:**
  - say "not measured yet" on the surface;
  - verify filter, sort and search, and put them in the URL;
  - verify export, and that the export is itself audited;
  - check the empty and filtered states;
  - add phone cards;
  - confirm row actions (enter workspace, suspend) use real ids.

#### Workspace detail · `/platform/tenants/[id]` and the drawer
- **Status:** live since D1 (owner contact, member counts). Billing stats and
  invoices are intentionally empty ("no source").
- **Work:** verify each action end to end, in both logs:
  - suspend (type the slug to confirm) and reactivate;
  - assign a plan (with its preview);
  - grant an override (reason and expiry);
  - start a support session.

  Also: state "no billing source" on the surface; replace any designed
  alerts; match the page and the drawer to one canon.

#### New workspace · `/platform/tenants/new`
- **Status:** wired (`provisionTenant`).
- **Work:**
  - verify slug-taken and owner-exists errors land on their fields;
  - confirm the invitation email is sent, or its link is shown;
  - confirm the new workspace appears in Workspaces, the Overview counts and
    the switcher without a reload;
  - fix the audit gap noted in doc 23: a self-registered workspace's audit
    row has no tenant id.

#### Plans · `/platform/plans`
- **Status:** live plans and headroom; the limit editor is wired
  (`setPlanLimit`, with capability, preview and audit). No live/designed
  markers.
- **Work:**
  - verify the limit-change preview count against the database;
  - check that a limit lowered below current usage behaves as stated ("keeps
    what it has");
  - check chart text alternatives;
  - apply the canon.

#### Revenue · `/platform/revenue` — **decision R1**
- **Status:** entirely designed. There is no billing in Phase 1 (08 §1), and
  the page presents figures no system produces. This is the surface most
  likely to mislead a client.
- **Options:**
  - **(a) Recommended.** Rebuild it as **contracted value**: plan prices ×
    active subscriptions, from real rows. Label it "not collected revenue",
    say that payment is outside the product, and include the trial pipeline.
  - **(b)** Keep the design, and label every band designed.
  - **(c)** Remove it from Phase 1 navigation.
- Whichever is chosen, correct the tracker's M4 note.

#### Master rules · `/platform/ai-rules`
- **Status:** live; publish and rollback are wired, capability-checked and
  audited.
- **Work:**
  - verify the version history;
  - check the diff before publish;
  - verify rollback to a chosen version;
  - check the "every workspace inherits" count;
  - check a concurrent-edit conflict (`RULES_VERSION_CONFLICT`);
  - apply the canon.

  This page is half of the M4a gate (§6).

### 4.2 Operations

These five were rebuilt in docs 23–24. Their pass is **verification and
regression**, not redesign.

- **Health.** Isolation is live; service, queue and incident figures are
  designed until probes exist (M6). Verify the markers stay honest, the
  isolation chip agrees with the policy check, and the charts' text
  alternatives.
- **Audit log.** Verify:
  - paging at 2,000 rows;
  - filters in the URL;
  - the detail drawer's workspace link;
  - that the new doc 24 actions (`support.expired`,
    `support.ended_by_customer`, `support.entry_refused`) read correctly;
  - the CSV export against what is on screen.
- **Support sessions and the inside view.** Run the full lifecycle in a
  browser: open, work inside, resend an invitation, extend twice, have a
  colleague end it, have the customer end it, let one lapse. Check the
  register, the timeline and both logs after each. Every path is tested in
  the database already; this proves the interface agrees.
- **Admins.** Verify with a second operator. Operators can now see each
  other; nobody ever has, because there has only ever been one.
- **Settings.** Verify:
  - save, the conflict refusal and "last changed";
  - break glass engage and release, including that it closes open visits into
    both logs, now that it does;
  - export links.

### 4.3 The pages around them

- **Profile · `/platform/profile`.** Live. Verify:
  - name change reaching the chrome;
  - avatar upload (size, type, storage policy);
  - password change (re-authentication, "sign out other devices" and its
    email);
  - device revocation, including a support session listed as a device;
  - the activity panel's paging;
  - the limits card.

  Apply the canon.
- **Console chrome.**
  - The rail and its live badges.
  - The collapse and density preferences, which persist through
    `/api/console/prefs`.
  - The workspace switcher: live since D1; verify that search finds beyond
    the six shown.
  - The command palette (⌘K): every command must go somewhere real.
  - The **notifications bell: a literal list of made-up notices** (layout
    line 116). **Decision N1:** either derive notices from real events (open
    visits, workspaces past 90% of a limit, failed invitations, a break-glass
    lock — all queryable today), or remove the bell until a store exists.
  - The account menu, sign-out, the isolation chip and the mobile dock.
- **Operator access.** Verify:
  - operator sign-in (a wrong password, a non-operator account, the
    `?next=` handling);
  - forgot and reset password;
  - sign-out revoking the session row;
  - a revoked session being refused on the next request.
- **System pages.**
  - 404 and the error boundary inside the console, not only at the root.
  - `global-error`.
  - Every route's `loading.tsx` checked against its page. Doc 21 found
    several that did not match.
- **Exports** (`/api/platform/export/*`). Each must be audited, stream
  correctly, use Nairobi dates, and escape CSV (formula injection in a
  workspace name).

### 4.4 The customer's activity page · `/app/settings/audit`

The end of every console action is a line here. Today it is the weakest
surface in the chain:

- it shows raw codes ("support.entered support_session");
- times are formatted in the **server's** zone, UTC on Vercel, not Nairobi;
- it silently caps at 100 rows;
- it has no filters, and its only live marker is a hard-coded "Live" tag;
- a support visit is five unrelated lines;
- `audit_retention_days` is read and never enforced or explained.

**Work:**
- **Vocabulary.** Plain sentences from a customer-facing counterpart of
  `auditVocabulary` ("Brian from aLcassa support opened your workspace").
- **Visits as one item.** Entered, what changed with its before and after,
  extended, and how it ended — the same model as the console timeline, from
  the customer's side.
- **Controls.** A "Support visits only" filter, a date range and paging, all
  in the URL.
- **Time and retention.** Nairobi time, and the retention window stated (or
  enforced, if a job is added in M6).
- **Verification.** Signed in as the seeded customer (E2), against every
  scenario in §3.

---

## 5 · Cross-cutting fixes found in the survey

1. Six pages fall back to fixtures with no designed marker (§3.5).
2. The notifications bell is fiction (N1).
3. Revenue is fiction, and the tracker says it is not (R1).
4. Customer-facing times use the server's zone (§4.4). Sweep every
   `toLocaleString` without `timeZone`.
5. Duplicated start-session handlers. `ConsoleShell`, `WorkspaceTable`,
   `WorkspaceActions` and `WorkspaceDetailDrawer` each have their own copy
   (doc 24 had to fix four identical toasts). Consolidate them into one hook.
6. `ConfirmDialog` and `ConsoleDialog` coexist (doc 22). Finish the migration
   to `ConsoleDialog`.
7. Doc 22 remainders: Badge delegating to StatusBadge; dead primitives
   (Spinner, IconPill, ErrorBoundary); tile unification.

---

## 6 · The Phase 1 work outside the console

**M4a · a rules edit live through the API in five seconds.**
- **Customer rules.** Wire the customer's rules publish: an append-only
  `tenant_ai_rules` version with a change note and an audit row. The screen
  exists; the action refuses.
- **The API route.** Add `GET /api/v1/rules`, the effective rules (master
  merged with the workspace's), authenticated by an API credential.
- **Freshness.** A publish invalidates the cached effective rules, so the
  next read reflects it. Test and time that path, which gives the "5 seconds"
  its evidence.
- **Dependency.** This depends on M5 credentials.

**M5 · secrets auditing.**
- **Credentials.** A `credentials` module over `api_credentials`:
  - mint with argon2id, the value shown once;
  - scopes;
  - revoke;
  - last used;
  - every read of a secret refused, including in support mode, which the
    policy already enforces;
  - audited mint and revoke;
  - the plan's credential limit enforced.
- **Company settings.** Save to `tenant_settings`, audited.
- **The gate.** A credential's lifecycle visible in the customer's activity
  page (§4.4) and in the console audit log.

**M2 closing proof.** One real invitation delivered to a real inbox after the
Resend domain is verified.

---

## 7 · M6 · handover readiness

- **Staging.** A Vercel environment on its own Supabase project. Migrations
  run by a deploy step, not by hand: doc 23 and doc 24 each had to warn that
  deploys do not migrate.
- **Accessibility in CI.** axe per route, from `verify:surfaces`. The
  contract requires it, and the tracker already records that it does not
  exist.
- **Operations runbook.** Break glass, key rotation, the reconciliation cron,
  restoring a suspended workspace, and adding an operator (still a database
  action).
- **Security.** Rotate the `alcassa_app` password, which is still
  outstanding from doc 23.
- **The handover package** (doc 12) assembled against what actually shipped.

---

## 8 · Decisions needed

| # | Question | Recommendation |
| --- | --- | --- |
| **R1** | Revenue with no billing source | Contracted value from real subscriptions, labelled as such |
| **N1** | The notifications bell | Derive notices from real events; no new table in Phase 1 |
| **E1** | Where end-to-end verification writes | A Supabase branch database for e2e and CI |
| **E2** | A seeded customer login | Yes: one tenant owner with a development password from `.env.local` |
| **T1** | Correct the tracker now | Yes: revenue, the test count, and M4a/M5 reality |

---

## 9 · Order

1. **Stage 0 tooling (§3), and T1.** Everything after it produces evidence
   instead of opinion.
2. **Platform group (§4.1)**, in page order. Revenue waits on R1.
3. **Operations regression (§4.2).**
4. **The surrounding pages (§4.3)**, with N1.
5. **The customer's activity page (§4.4).** It closes the loop for every
   console action above it.
6. **Cross-cutting fixes (§5)**, folded into whichever surface they touch
   first.
7. **M5, then M4a (§6).** Credentials unblock the rules API.
8. **M6 readiness (§7).**

Each surface ends as the last three stages did: its verification record, the
full gate run, the isolation suite, a production build, and a push.
