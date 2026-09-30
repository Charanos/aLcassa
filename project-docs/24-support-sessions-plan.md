# 24 · Support sessions — the plan

The feature the product is sold on. 09 §3, §4 and §7 promise that when the
platform team enters a customer's workspace:

1. the operator states a reason, and the customer reads it;
2. access is capped at thirty minutes and runs under the workspace's own
   row-level security, as role `support`;
3. the customer sees it happening, sees it afterwards in their own log, and can
   end it.

This plan reviews the current implementation against those promises, fixes
what is wrong, and rebuilds the register page. Every finding below was traced
to its line. The screenshots of the page as it stands (30 Sep 2026) show the
register reading `0 · 0 · 0` over an empty table.

---

## What is there today

| Part | Where | State |
| --- | --- | --- |
| Session row, `kind = 'support'`, role `support` | `modules/platform/internal/support.ts` | Built. Minted with the reason, the break-glass check and the capability check in one transaction. Writes both audit logs. |
| Start dialog (reference plus reason) | `StartSessionDialog`, workspace detail | Built. |
| Console banner and active card, with a countdown and Extend/Exit | `SupportSessionBanner`, `ActiveSessionCard` | Built. The countdown is derived from `expiresAt`. |
| Row-level-security carve-outs for support | `02_identity.sql`, `04_credentials.sql` | Built and tested in the isolation suite. |
| Customer's boundary frame | `BoundaryFrame`, `modules/identity/me.ts` | Renders while a session is open. |
| Register page | `support-sessions/page.tsx`, `getLiveSupportSessions` | Renders, but reads nothing (S0.1). |
| Customer email on entry | `supportSessionEmail` in `modules/email/templates.ts` | Written, never sent. |

The design is sound where it exists. A session is an ordinary row, so the
limits on what support may do are the same machinery that scopes every tenant
user. What is missing is mostly what connects the pieces.

---

## Stage 0 · What is wrong

### S0.1 · The register is blind — **P0**

`getLiveSupportSessions` (`lib/console/liveWorkspaces.ts:370`) reads `sessions`
joined to `tenants` through `withoutTenantContext`, which sets no actor and no
tenant.

- `sessions_select` admits a row only to its own user, or to an owner or admin
  of the session's tenant.
- `tenants_select` admits a row only to a member of that tenant.
- An operator is neither. Every support session is invisible.

Unlike the workspace list, this reader has no guard for an empty result. It
returns a confident `0 open · 0 recorded · 0 ended by the customer` and an
empty history.

In the development database this happens to be true: it holds no support
sessions. The first real one would still be invisible.

### S0.2 · The session opens no door — **P0, the functional core**

No code reads a customer's workspace under a support context. Nothing builds a
context with `role: 'support', supportMode: true` outside the tests.

- The tenant door (`resolveTenantCore`) needs a tenant session cookie and a
  membership. An operator has neither.
- The console's support cookie is read only to draw the banner.

So "entering a workspace" today writes a record, shows a banner and runs a
countdown, and the operator can see nothing inside. All the row-level-security
work built for support mode (role `support`, the three permanent exceptions,
`can_write_settings()` admitting support) is exercised only by the isolation
suite.

### S0.3 · The customer cannot end it

`BoundaryFrame` has a button labelled `EXIT` / `RECONNECT`, which is the
operator's wording. It calls `onSupportModeExit`, which no caller passes, so
`AppShell` falls back to `() => {}`. The promise in 09 §7 that the owner can
end a visit exists only in the policy (`sessions_modify` lets an owner revoke).
No control in the interface uses it.

### S0.4 · The customer sees a UUID as "Acting as"

`me.ts` sets `platformAdminName` to `supportContext.platformAdminId`. The
customer cannot read `platform_admins`, and should not be able to. The name has
to be written into the session at mint.

### S0.5 · The customer is not told

`supportSessionEmail` was written for 10 §14 and has no caller. The only way a
customer learns of a visit is to be looking at the screen while it happens, or
to open their activity log later.

### S0.6 · The customer's log tells half the story

- **Expiry writes nothing.** Most sessions will end at the cap. They show in
  the customer's log as "entered" and never "left".
- **Replacing a session writes nothing.** Opening a second session on the same
  workspace revokes the first silently.
- **Exit is not idempotent in the log.** `endSupportSession` inserts an
  `exited` row even when the session was already revoked, so ending twice
  records two exits.
- **Who ended it is guessed.** `endedBy` is inferred from `revokedReason`
  containing the word `owner`. No code writes that word, so "ended by the
  customer" (the figure the page puts in the accent colour) can never appear.

### S0.7 · Every console page view inside a session writes a service-role audit row

`resolveSupportSession` calls `readSupportSession`, which runs through
`asService` and so writes a `support.session_read` row. The console layout and
the page each call it, so every navigation while inside writes two rows that
are flagged as bypassing row-level security. This is the same noise problem as
the watchlist's 278 reads in doc 23.

### S0.8 · A refused entry is not recorded, although the code says it is

`startSupportSession` claims that an attempt made while break glass is on "is
itself worth recording, and `asService` has already written that this operator
tried". But `asService` writes its audit row in the same transaction, so the
refusal rolls that row back. Attempts refused by break glass or by a missing
capability leave no trace. For break glass in particular, that trace is the one
an incident review needs.

### S0.9 · False copy on the page

- "30-minute **read-only** session". Support has been read and write since
  01 D-13 (24 Aug).
- "Sessions are read-only and expire at 30 minutes **with no extension**". The
  console has an Extend button, and every extension issues a fresh thirty
  minutes.
- "History · **last 30 days**". The query is the most recent 50 rows, with no
  date bound.
- The module's comment says "thirty minutes **of inactivity**". The cap is
  absolute from start, and `lastActivityAt` is never updated after mint.

### S0.10 · Smaller defects

- The sidebar badge "Support sessions · 1" is designed data.
- Any operator can end any operator's session by id. That is probably right
  (a colleague closing a forgotten session), but it is not deliberate, and the
  log does not say who ended whose.
- Extensions are unlimited: thirty minutes at a time, for ever.
- The history table has no empty state. With no rows it renders the header
  over blank space (second screenshot). The Shape band renders axes with
  nothing on them.
- The page uses the old header (no breadcrumbs, lede under a rule) and
  hand-built stat tiles, not the header, `FactStrip` and `Figure` family the
  other accountability pages now share.

---

## Stage 1 · How operators read across workspaces — **needs your decision**

S0.1 is not only this page's problem. The Workspaces list, the workspace
switcher and the Overview counts all read `tenants` through a context that
cannot see it. Each falls back to designed data when the read comes back empty.
The code refers to "the architectural fix in 21 §2", but doc 21 has no such
section. This is that decision.

**Option A: a row-level-security branch for operators (recommended).** Two
select-only policies, using `app.is_platform_admin()` from doc 23:

- `tenants_select_operators`: operators read the workspace directory (name,
  slug, status, plan).
- `sessions_select_support_operators`: operators read `kind = 'support'` rows.
  They do not read other operators' console sessions or any customer's sign-in
  sessions.

Reads run as the operator, with no service role and no audit row per page
view. **No tenant data table is opened.** Customer records, the knowledge
base, rules, channels and member lists stay closed to operators, except inside
a support session (Stage 3). That is the line the product draws.

**Option B: service-role reads.** Every page view writes a row flagged as
bypassing row-level security. This is the watchlist problem across the whole
console.

Option A also makes the Workspaces list, the switcher and the Overview live,
which is a larger change than this page. The isolation suite gets cases for
all of the following:

- an operator reads every tenant row and every support session;
- an operator reads no tenant-scoped data table;
- a tenant owner still reads only their own tenant;
- a support row stays invisible to other tenants.

---

## Stage 2 · The session record, made complete

Additive migration `0003`:

- `sessions.end_reason`, an enum: `operator`, `colleague`, `customer`,
  `expired`, `superseded`, `break_glass`.
- `sessions.ended_by`, a uuid, null for expiry.
- `supportContext.platformAdminName`, written at mint. This fixes S0.4 without
  giving customers read access to `platform_admins`.

Behaviour:

1. **Every end writes both logs, exactly once.** The audit row is written only
   when the `update … where revoked_at is null` changed a row. Replacing a
   session and break glass write `support.exited` with their reason.
2. **Expiry is closed.** The daily `reconcile` cron already exists; it sweeps
   lapsed sessions, sets `end_reason = 'expired'`, and writes `support.expired`
   to both logs, timestamped at `expires_at`, not at the sweep. Until the
   sweep runs, readers show the end derived from `expires_at`.
3. **Refused entries are recorded.** A refusal by break glass or a missing
   capability writes `support.entry_refused` in a separate transaction, with
   the reason for the refusal and the reason the operator gave. It goes to the
   platform log only. The customer's log records what happened to their
   workspace, and a refused entry did not happen to it.
4. **The session read stops writing audit rows.** `readSupportSession` becomes
   a read as the operator, allowed by the Stage 1 policy. `support.session_read`
   is retired, and legacy rows are relabelled as reads, as in doc 23.
5. **Extensions have a ceiling: decision D2.** Proposed:
   - an extension is offered only in the last five minutes;
   - at most two extensions, so ninety minutes in all;
   - beyond that, a new session with a new reason, which the customer reads
     again.
6. **Ending a colleague's session** is allowed, recorded as `colleague`, and
   names both people in both logs (decision D5).

---

## Stage 3 · The door: working inside the workspace

This is what makes the feature a feature (S0.2).

**`withSupportContext(fn)`.** A server helper that:

- reads the support cookie;
- re-reads the row as the operator and checks the owner, that it is not
  revoked, and that it has not expired;
- builds the `ResolvedContext` from the row, never from the client:
  `tenantId`, `role: 'support'`, `supportMode: true`, `actorType:
  'platform_admin'`, and the session id;
- runs `withTenantContext`.

From then on, every query in `fn` is scoped by the same policies as the
customer's own staff, including the three permanent exceptions: no credential
secret, no extending your own session, no acting as the customer's identity.

**`/platform/inside`.** The customer's workspace, read through that context and
rendered in the console. The persistent session bar stays on top: workspace,
reason, time left, Extend, Leave. First cut, reading through the existing
tenant read models (`lib/tenant/live.ts`):

- **Overview:** plan, usage against entitlements, subscription state.
- **People:** members, roles, pending invitations.
- **AI rules:** the workspace's layer over the master rules.
- **Knowledge base:** documents and their indexing state.
- **Channels:** connections and their health.
- **Customer records:** each one opened writes `customer_record.read` to the
  customer's log. This is already in the audit vocabulary.
- **Activity:** the workspace's own log, with this session's entries marked.

**Writes: decision D4.** 01 D-13 allows read and write. The first cut should
enable only the writes that support tickets actually need, through the tenant
modules, which already stamp `supportMode` on every audit row
(`lib/audit` line 215):

- resend or revoke an invitation;
- correct a tenant AI rule;
- re-run indexing on a knowledge-base document.

Everything else stays read-only until asked for.

**Tests.** Isolation cases from this door:

- a support context reads only its tenant;
- the three permanent exceptions are refused;
- a write lands in the customer's log with `support_mode = true`;
- a revoked or expired session opens nothing, including mid-page.

---

## Stage 4 · The customer's side

1. **They can end it (S0.3).** The frame's button is rewritten for the
   customer: "End this visit", with a confirmation. It revokes through
   `sessions_modify` (owner only, as the policy says; decision D6 on whether
   admins may too) and writes `end_reason = 'customer'` to both logs. The
   operator's console reacts on its next request with "The customer ended this
   visit", not a generic expiry.
2. **The frame names the person (S0.4)** and says it plainly:
   *Brian Masira from aLcassa support is in your workspace · "Checking why
   invitations are not arriving" · 24 min left · 2 changes so far · End this
   visit.*
3. **They are told (S0.5).** On entry, the owner receives
   `supportSessionEmail`. It is sent after the transaction commits, and a send
   failure is reported, never raised, which is the email module's existing
   contract. Decision D3.
4. **Their log reads as visits.** On the customer's activity page, a support
   visit is one grouped item: entered, what changed (with the before and after
   of each change), and how it ended.

---

## Stage 5 · The register page

The question it answers: *who is inside which customer right now, why, and
what did each visit cost the customer?*

1. **Header family.** Breadcrumbs, title, and an **Open a session** action. It
   uses the existing dialog with a workspace picker, so entering is not hidden
   behind the switcher.
2. **Fact strip.** Four cells, each true when zero:
   - Open now: who and where, or "Nobody is inside a workspace".
   - Visits in 30 days.
   - Median length, against the 30-minute cap.
   - Ended by the customer, in the accent colour, with "None in 30 days" when
     there are none rather than "they revoked it themselves" over a zero.
3. **Open sessions.** Every open session, not only mine. Each shows:
   - operator, workspace and reason;
   - a time-left bar against the cap;
   - extensions used, and changes made so far.

   Actions: *Go inside* (mine), *Extend* (mine, inside the window), *End*
   (mine, or a colleague's, recorded as such).
4. **The visits ledger.**
   - Grouped by Nairobi day, with sticky day headers.
   - Each row: time, workspace, operator, and the reason in full (wrapped, not
     truncated: it is the one field a person wrote and the customer reads).
   - Each row also shows a duration bar against the cap, extensions, changes,
     and how it ended (the six values from Stage 2).
   - Filters in the URL (operator, workspace, outcome), a real 30-day window,
     and paging.
   - A row opens a drawer with the visit's timeline from both logs: entered →
     each change with its diff → extended → ended. That timeline answers the
     question a customer actually asks: *what did you change?*
5. **Shape.** Kept, fed by real data, with an empty state that says "No visits
   yet" instead of drawing empty axes.
6. **Guarantees.** Stated with where each is enforced, from the same statements
   file Settings uses, so the two pages cannot disagree:
   - reason required;
   - 30-minute cap and extension ceiling;
   - customer sees, is emailed, and can end the visit;
   - break glass;
   - capabilities;
   - the three permanent exceptions.
7. **Empty states.** Two separate ones: never used, and none in the window.
   Plus the table body's own empty state (S0.10).
8. **Skeleton, phone layout, reduced motion.** As for Health, Audit and Admins:
   one skeleton per band, the ledger as cards on a phone, and the countdown
   static under reduced motion.

---

## Stage 6 · Coherence across the console

- Sidebar badge, Overview operations band and the switcher: live open-session
  counts, made possible by Stage 1.
- Command palette: "Enter workspace…", which opens the start dialog.
- The console banner and the register's open-session card share one component
  and one clock.

---

## Decisions

| # | Question | Recommendation |
| --- | --- | --- |
| **D1** | How operators read across workspaces | **A**: select-only row-level-security branch through `app.is_platform_admin()`; no data tables opened |
| **D2** | Extension ceiling | Offered in the last 5 min; at most 2; then a new session and reason |
| **D3** | Email the owner on every entry | Yes |
| **D4** | Writes from the inside view, first cut | Invitations, tenant AI rules, knowledge-base re-index; the rest read-only |
| **D5** | May an operator end a colleague's session | Yes, recorded as `colleague` in both logs |
| **D6** | Who on the customer's side may end a visit | Owner (as the policy stands); admins too if Brian wants |

D1 changes isolation policy and D4 changes what the platform can do to
customer data, so both need Brian's explicit agreement. The rest can go ahead
on your yes.

## Order

1. **Stage 1 and the S0.1 fix.** The policies and the isolation cases. The
   register, Workspaces and Overview become live.
2. **Stage 2.** Migration `0003`, complete logs, refused entries recorded,
   read noise removed.
3. **Stage 5.** The register rebuilt. This is what Brian sees.
4. **Stage 4.** The customer can see, be told, and end the visit.
5. **Stage 3.** The inside view. It is the largest stage and depends on 1 and
   2.
6. **Stage 6.**

Each stage ends as the last three did: screenshots at desktop and phone, the
full gate run, the isolation suite, a production build into `.next-verify`,
and a push.

---

## Outcome (30 Sep 2026)

D1–D6 were approved as recommended, with D6 widened to owners **and** admins.
What shipped, and where it departs from the plan.

**Stage 1 · operators read across workspaces.** Select-only policies through
`app.is_platform_admin()`: `tenants_select_operators`,
`subscriptions`/`subscription_overrides`/`usage_counters` `_select_operators`,
and `sessions_select_support_operators` (`kind = 'support'` only). Member rows,
profiles and customers' audit logs stay closed. What the console needs from
them comes through three narrow definer functions that return only the answer:
`app.workspace_summaries` (member counts, owner contact, last activity),
`app.platform_member_count`, and `app.support_visit_activity` (only the rows
the platform itself wrote during a visit). The register, the Workspaces list
and detail, the Overview counts and the rail badges now read live data. The
Workspaces badge showed a designed 12 and the Support badge a hard-coded 1;
both now come from the database.

**Stage 2 · the session record.** Migration `0003`: `sessions.end_reason`
(operator, colleague, customer, expired, superseded, break_glass) and
`ended_by`, with existing rows filled in from their revocation reasons. Every
ending goes through `closeSessions` or a definer function and writes exactly
one row per log. Break glass, which ended sessions with no reason and no
customer entry, now uses the same path. Lapsed visits are closed at their own
expiry by `app.close_lapsed_support_sessions`, which the register, the start
path, the overview and the daily cron all call. Refused entries are recorded
as `support.entry_refused` in a separate transaction. Reading a session no
longer writes a service-role audit row.

**D2** as proposed: extension is offered only in the last five minutes, at
most twice, and a lapsed visit can no longer be extended back to life (it
could before). Extension was never actually reachable: nothing called the
action. It is now in the console banner and on the register.

**Stage 3 · the inside view.** `resolveSupportContext` builds the tenant
context only from a live support session this operator owns, re-checked on
every request. `/platform/inside` renders the customer's own read models
(company, subscription and usage, team, activity) under that context. One
policy branch was needed: inside a support session, `user_profiles` admits the
workspace's own members, and without it the team page had no names. **D4 as
delivered:** resending and revoking invitations. Correcting AI rules and
re-indexing the knowledge base were approved but **do not exist in the
customer's product** (their own "publish rules" refuses, and there is no
knowledge-base module). The inside view says so rather than faking either.

**Stage 4 · the customer's side.** The frame is rewritten for the customer:
it names the operator (the name is written into the session at start; before,
the customer saw a UUID) and says "is in your workspace". Owners and admins
can end the visit through `app.end_support_visit`, which checks the
membership row and writes both logs. Owners are emailed on entry, after the
commit. The frame's old EXIT/RECONNECT button did nothing.

**Stage 5 · the register.** Rebuilt as specified:
- fact strip, every open visit (not only mine), and ending a colleague's visit
  with confirmation;
- a day-grouped ledger with URL filters and paging, where each visit opens a
  timeline of what it did;
- shape, guarantees, and separate empty states.

The false copy ("read-only", "no extension", "last 30 days") is gone from the
page, the start dialog, the banner and four toasts.

**Found during verification, fixed.** The console banner, the register card
and the customer's frame all computed their countdown during render, so the
server and the browser disagreed by a second and React tore the tree down on
hydration. It never surfaced because no session had ever been open when
anyone looked. Clocks now render only after mount.

**Caught by the isolation suite, fixed.** The operator policies reopened support mode: inside a visit the actor is still a platform admin, so a session opened into workspace A could read workspace B's directory row. `app.is_platform_admin()` now answers false while a support session is in effect, which switches off every operator branch and operator-only function at once. Inside a visit, only the workspace's own rules apply.

**Tests.** `tests/isolation/support-sessions.test.ts`, 14 cases covering
operator visibility, every ending, the extension rules, colleague and customer
endings, refused entries, support-mode team visibility and the visit-activity
function. The suite removes every row it writes.

**Not done.**
- The customer's activity page does not yet group a visit into one item.
- A customer-side screenshot needs a seeded customer password; the path is
  covered by the tests instead.
