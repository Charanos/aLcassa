# 17 · Console Density and Function Pass

**Opened:** 12 Sep 2026 · **Owner:** platform/devops · **Runs alongside:** the front-end agent's polish work
**Scope:** the twelve `/platform` console surfaces, the token system, the documentation set, and the project tracker.

---

## 0. Why this document exists

The overview was rebuilt on 11 Sep into a banded, chart-led surface that reads real
figures and ends every band in a link to the page that owns it. Ten other console
surfaces did not move. They are not broken and they are not unstyled — most carry a
considered lede, a real read model and a stated design argument in their header
comment. What they are is **thin against their own page's job**: a header, one
component, and a row of controls that mostly do nothing.

That gap is now the largest quality seam in the product, and it is visible: an
operator who lands on the overview and then clicks through to Revenue drops from a
surface that argues with them to one that reports at them.

This pass closes it. It is a **strengthening pass, not a redesign**. Nothing here
throws away a drawn decision; every surface keeps its stated law — Revenue ends in a
queue, the Plans matrix does not collapse into cards, the health strip sits beside the
percentage rather than replacing it. The work is to make each surface as dense, as
truthful and as functional as that law already implies it is.

---

## 1. The console as it actually stands

Measured 12 Sep 2026 against the working tree.

| Surface | Page | Data | Dead controls | Density verdict |
| --- | --- | --- | --- | --- |
| `/platform` Overview | 447 ln | **live** + insights | 0 | **Reference standard.** Banded, charted, linked |
| `/platform/tenants` | 102 ln | **live** | 1 (Export) | Header + table. No portfolio read before the rows |
| `/platform/revenue` | 268 ln | fixture | 1 (Export CSV) | 3 charts + queue. No movement decomposition |
| `/platform/health` | 444 ln | fixture + **live** isolation | 0 | Strongest of the ten. Missing distribution + queue depth |
| `/platform/plans` | 337 ln | **live** | 1 (New plan) | Matrix + bar. No headroom view — the useful one |
| `/platform/admins` | 368 ln | fixture | 3 | Roster only. The table exists live and is unread |
| `/platform/audit` | 60 ln | **live** | 1 (Export range) | Stream with no facets and no volume over time |
| `/platform/ai-rules` | 176 ln | fixture | 0 | Version table exists in schema and is unsurfaced |
| `/platform/support-sessions` | 278 ln | **live** | 0 | Good. No distribution of what sessions cost |
| `/platform/settings` | 45 ln | fixture | 3 | Five tabs that persist nothing |
| `/platform/profile` | 22 ln | **live** | **0** | ~~Device list that cannot revoke~~ — closed 13 Sep 2026, see **19**. Avatar upload added in the same pass. |
| `/platform/tenants/[id]` | 220 ln | **live** | 12 | Six tabs, most controls inert |

**Totals: 29 controls with no handler. 6 of 12 surfaces still on fixtures. 24
hardcoded `47`s across 12 files.**

---

## 2. The four gaps, named separately

They need separating because they have different failure modes and different fixes.

**2.1 · Function.** Twenty-nine buttons render, hover, and do nothing. This is the
worst of the four because it is the one an operator discovers by pressing. A dead
Export is worse than an absent one: the absent one costs nothing, the dead one costs a
support call and a unit of trust. Every one of the twenty-nine gets **wired, disabled
with a stated reason, or removed** — there is no fourth option.

**2.2 · Truth.** Six surfaces show designed figures where the database holds real
ones. `platform_admins`, `master_ai_rules`, `master_ai_rule_versions` and
`tenant_settings` are all built, isolated, and unread by their own screens. The
established pattern — `getLiveX() ?? getX()`, live first and the fixture behind the
review bypass — already exists and is simply not applied here. Where no real source
exists (revenue, uptime, latency) the figure **stays designed and the screen keeps
saying so**. That is the rule set on 28 Aug and it does not change.

**2.3 · Density.** Each surface answers one question and then stops. The overview
established the pattern that fixes this: a **band** is a question, a visualisation
that answers it, and a link to the page that owns the follow-up. The remaining
surfaces need one to three bands each — chosen from what the page's own data can
actually support, never added to fill space.

**2.4 · Record.** The tracker's last update is 28 Aug. Fifteen days of delivery — the
auth pass, the onboarding pass, the console shell, the mobile navigation, the toast
and flash layer, the self-serve sign-up path, the overview rebuild — exist in the
repository and nowhere in the client-facing record. `FOUNDATION` has no entry for any
of it. Meanwhile `03-design-system.md` documents none of the chrome tier's
maturation, the chart contract, the scroll surfaces, or the spacing trap that cost a
day this week.

---

## 3. Operating rules for this pass

Non-negotiable, because a second agent is editing the same tree.

1. **`pnpm tsc` on every step. Lint and build at stage boundaries only.** Standing
   instruction — a full lint mid-stage collides with the front-end agent's in-flight
   edits.
2. **I own logic, seams, read models and wiring. They own polish.** Where I touch
   presentation it is to establish structure, not final finish. Every band is written
   to be restyled without rewiring.
3. **Placeholder imagery stays.** Unsplash placeholders remain until upload and
   replacement exist in the database. Standing instruction, reaffirmed 11 Sep.
4. **Fixtures keep the exact shape of the query that replaces them.** A fixture that
   is not shaped like its query is a rewrite disguised as a seam.
5. **No invented figures.** A number with no source is shown as a dash or labelled as
   not yet counted. This is the rule the isolation panel was corrected under and it
   applies to every band added here.
6. **One commit per stage**, on the existing branch
   `feat/landing-page-and-design-revamp`. Never main.

---

## 4. Stage 0 · Foundation truth

Everything downstream reads from these, so they land first. No page work in this stage.

**0.1 · Token system.** The identity law is written into `tokens.css`: *a raw hex in a
component file is a defect.* Twenty-five component files currently carry one. Not all
are defects — `#25D366` is WhatsApp's mark and `#E1306C` is Instagram's, and a brand
mark is legitimately raw. The two new primitives are: `Badge.tsx` carries six
hardcoded intent colours and `IconPill.tsx` carries four raw `rgba()` surfaces. Both
are new this week, both are the right components to have, and both need Tier-3 tokens
to read from instead:

- add `--badge-{intent}-{fg,border,glow}` for the six intents, resolved per theme
- add `--pill-{surface,rim,ring}` for the icon pill's glass treatment
- audit the remaining 23 files, classify each hex as brand mark or defect, and fix the
  defects (`#ffffff` on a blue button is a defect; it is `--on-accent`)

**0.2 · `03-design-system.md`.** Four sections are missing and one is out of date:

- **new §23 Chrome tier** — the inverted surface the header, rail and mobile nav share,
  its gradient stops, and the rule that it inverts against the page ground rather than
  being "dark mode"
- **new §24 Chart contract** — Recharts as the chosen library, the one-hue ramp and why
  six hues failed a colour-blindness check, the documented exception for status mix
  (safe only because the legend names every slice), and the rule that tokens are
  resolved to real values before reaching Recharts because SVG presentation attributes
  do not reliably resolve `var()`
- **new §25 Scroll surfaces** — `.scrollbar-slim`, the chrome variant, and why
  `::-webkit-scrollbar-button` is suppressed
- **§20 Anti-patterns** gains the spacing-namespace trap in full: Tailwind v4 treats
  spacing as a theme namespace, so `--spacing-0` redefined the zero step and 293
  utilities written to mean nothing rendered 2px. It cost a day. It belongs in the
  document that would have prevented it.
- **§14 Badge taxonomy** now points at the `Badge` primitive as its implementation

**0.3 · `09-platform-console-and-support-mode.md`.** The shell it describes is not the
shell that exists. Add `ConsoleShell`'s three rail states (collapsed, peeking, locked)
and the Gmail-model reasoning, the floating rail geometry, the mobile bottom
navigation, the command palette's actual keyboard contract, and a refreshed §2 surface
inventory matching the table in §1 above.

**0.4 · `foundation.ts`.** Add `built` entries with evidence paths for the console
shell, the mobile navigation, the onboarding flow, the flash and toast layer, the
self-serve sign-up path, the chart layer, and the provisioning dialog's real server
action. `FOUNDATION_SUMMARY` derives itself, so the tracker's counts follow.

**0.5 · `engagement.ts` — the tracker.** Write the missing fifteen days as `UPDATES`
entries in the established voice: plain language, the decision named, the thing that
went wrong stated rather than smoothed. At minimum the auth and onboarding pass, the
console shell and navigation, the toast layer, the overview rebuild, and the spacing
defect — which belongs in the record precisely because it was ours. Revisit the `M4`
and `M5` notes and their progress figures.

**0.6 · `15-spec-delta.md`.** Record every place this pass makes the code and a
document disagree, and which one won.

**Gate:** `pnpm tsc` clean, tracker renders, no page files touched.

---

## 5. Stage 1 · The seam layer

Read models before pixels. Each is `getLiveX(): Promise<X | null>`, live first and
fixture behind the review bypass, shaped exactly as the fixture it replaces.

| New reader | Source | Unblocks |
| --- | --- | --- |
| `getLiveAdmins()` | `platform_admins` + `platform_audit_log` | Admins roster, last-active, activity sparkline |
| `getLiveMasterRules()` | `master_ai_rules` + `master_ai_rule_versions` | AI rules, version rail, diff |
| `getLiveSettings()` | platform settings row | Settings persistence |
| `getLiveProfile()` | `user_profiles` + `sessions` | Profile, device revocation |
| `getPlanHeadroom()` | `usage_counters` + `plan_entitlements` | Plans headroom band |
| `getAuditVolume()` | `platform_audit_log` grouped by day | Audit histogram |

**Also in this stage:** retire the hardcoded `47`. `PORTFOLIO_COUNT` already exists and
is derived; the remaining 24 literals across 12 files read from it or from their own
row count. A count stated as prose in four places and computed in one is four places to
be wrong.

**Gate:** `pnpm tsc` clean, every new reader has a fixture of identical shape.

---

## 6. Stage 2 · The control layer

All twenty-nine. Each resolves to **wired**, **disabled with a stated reason**, or
**removed**. Grouped by what wiring them actually requires:

**6.1 · Exports (4: tenants, revenue, audit, settings).** One shared
`/platform/export/[resource]` route handler, admin-gated, streaming CSV, audited as a
read. Range-scoped where the surface has a range.

**6.2 · Already-audited operations (12, mostly `tenants/[id]`).** The cheapest wins in
the pass: `setTenantStatus`, `assignPlan`, `grantOverride`, `changeSubscriptionStatus`,
`previewSuspension` and `previewPlanChange` are all built, tested and audited in
`modules/platform`. The tabs simply do not call them.

**6.3 · New audited operations (6).** Invite admin, revoke admin, change admin role,
save platform settings, revoke device session, publish AI rule version. Each follows
the existing pattern: server action → service function → audit row in the same
transaction.

**6.4 · Honestly disabled (the remainder).** Anything whose backing does not exist in
Phase 1 — a channel ping with no channel runtime, a payment retry with no gateway —
becomes a disabled control **with the reason on the surface**, matching how Revenue
already states that it reports rather than charges.

**Gate:** zero handler-less `<button>` under `/platform`, verified by the same script
that produced the count in §1. `pnpm tsc` clean.

---

## 7. Stage 3 · Density, surface by surface

Each band is a question, an answer, and a link. Sized to what the data supports.

**Tenants.** A **segment strip** above the table: status distribution as five clickable
chips that drive the table's filter, so the summary and the rows are the same control
rather than two facts to reconcile. Plus a pressure column — each row's worst
entitlement as an inline meter, sortable. The page's existing law (the standfirst does
the work) is preserved; the strip sits under it, not over it.

**Revenue.** One band, and it is the one this page is missing: an **MRR movement
waterfall** — new, expansion, contraction, churn — because "MRR rose 4%" and "MRR rose
4% while churn doubled" are the same line on the current chart and opposite businesses.
Plus ARPU and net revenue retention as inline figures on the existing KPI row. The
ageing chart becomes a control: clicking a bucket filters the queue beneath it. The
page still ends in the queue.

**Health.** Two bands: a **latency percentile band** (p50/p95/p99, because a mean hides
the tail that actually pages someone) and **queue depth small multiples** across the
four services. Both labelled as designed figures until probes land, in the voice the
page already uses for uptime.

**Plans.** One band, and it is the reason this page exists: **headroom by plan** — for
each entitlement, where that plan's tenants actually sit against the limit, as a range
plot. It answers "is this limit doing anything?" and "who breaks if I lower it?" in one
read, and it is derivable today from `usage_counters` and the watchlist. It also gives
the blast-radius dialog something to argue from.

**Admins.** Live roster, plus **per-admin activity** from the platform audit log as a
30-day sparkline. This is the security question the page exists to answer — not who has
access, but who is using it — and the log already holds it.

**Audit.** A **volume histogram** by day, brushable to scope the stream beneath, plus
actor and kind facet chips. A log you cannot ask a question of is an archive.

**AI rules.** A **version rail** with a diff against the live set, from the versions
table that already exists. Plus the inheritance impact count on save: how many
workspaces this floor change reaches.

**Support sessions.** A **duration and reason distribution** — what support access
actually costs, and what it is used for. The transparency claim on this page is
stronger with the shape of the sessions than with a list of them.

**Settings.** Persistence, and a **change preview** naming how many workspaces each
edit reaches before it commits — the same blast-radius discipline the Plans page
applies, on a page whose lede already makes the same claim.

**Profile.** Working device revocation. The tenant application already has this surface
built; the console's is a list that cannot act.

**Tenant detail.** No new bands — twelve wired controls is this page's whole job.

**Gate:** `pnpm tsc`, then full `eslint --max-warnings=0` and `next build`.

---

## 8. Stage 4 · Verification and handoff

- Full suite: `tsc`, `eslint src --max-warnings=0`, `next build`, `vitest` non-DB.
- The isolation suite remains environment-blocked (it needs a live Postgres) and is
  reported as **unverified**, never as passing.
- Re-run the dead-control script; the number must be zero.
- Re-run the raw-hex audit; what remains must be brand marks only.
- A **handoff note per surface** for the front-end agent: what is structural (do not
  move), what is placeholder finish (theirs), and which tokens each band reads.

---

## 9. Sequencing

Stage 0 → 1 → 2 → 3 → 4, in order. Stages 0 and 1 are prerequisites for everything;
2 and 3 are per-surface and can interleave once 1 lands. Commit at each stage boundary.

Stage 3 is the only stage that touches presentation heavily, which is where collision
with the front-end agent is likeliest — so it goes last, after the truth and function
layers are banked and committed.

---

## 10. Decisions taken, 12 Sep 2026

1. **`03-design-system.md` is rewritten against the shipped system, in place.** The
   document had drifted past the point a patch could fix: §2 still specifies the
   copper-on-vellum palette that `tokens.css` says it supersedes in full, §20 forbids
   the glassmorphism, gradients and shadows the console ships, §22 says there is no
   brand, and four places carry a find-replace artefact from the Conduit → aLcassa
   rename ("the copper aLcassa", "a aLcassa passing through a boundary"). A document
   that opens *"if code disagrees with this file, the code is wrong"* while being wrong
   about the palette is worse than no document, because a second agent is reading it.
   Sections that are still true — typography, space, motion, the component tiers,
   accessibility, forms, the data grid — are kept as they are.
2. **The Revenue waterfall is built on fixtures**, labelled as designed data in the
   voice the page already uses for its other charts.
3. **Settings persistence is deferred.** No platform-level settings table exists and
   this pass does not add a migration. The tab's controls become honestly disabled with
   the reason on the surface, per §6.4.
4. **Export format is CSV**, streamed, admin-gated, audited as a read.

---

## 11. Stage 3 as built, 12 Sep 2026

§7 was a plan written from an audit. Three of its prescriptions were wrong, and
correcting them is worth more than delivering them.

### The componentisation

Every band is its own file under `src/components/console/<surface>/`, following
the pattern the overview established: a **server component** taking a typed
slice of the read model, with charts as the only client islands.

That split is the point rather than a filing convention. `HeadroomBand`,
`ShapeBand` and the figure columns beside every chart do arithmetic — medians,
ratios, bucket counts — and all of it happens once on the server rather than in
every reader's browser. Two of the four new bands ship **no JavaScript at all**.

`BandLink` moved into `Surface.tsx`. Every band on every surface ends in one, so
it is surface vocabulary rather than something the overview owns;
`overview/shared.tsx` re-exports it so nothing breaks and there is still one
definition.

| Surface | Band | Client JS |
| --- | --- | --- |
| `plans/HeadroomBand` | Median and maximum against each limit | none |
| `audit/VolumeBand` | Thirty days, stacked by consequence | the chart only |
| `revenue/MovementBand` | New, expansion, contraction, churn | the chart only |
| `sessions/ShapeBand` | Duration buckets, how it ended, why | none |
| `rules/RuleFields` · `VersionRail` · `InheritancePanel` | The document, its history, the boundary | none |

### Where §7 was wrong

**Health needed nothing.** §7 prescribed a latency percentile band and queue
depth small multiples. `HealthModel.latency` already carries p50/p95/p99 and
`LatencyChart` already draws all three; queues already render with depth and
rate. Building either would have duplicated what is there. The audit in §1
called this page the strongest of the ten and should have been believed.

**Tenants needed a count, not a strip.** §7 prescribed a status segment strip
above the table. The table already had status chips that filter. A second row of
counts beside them is two controls for one job, with the predictable outcome:
they disagree the first time a status is added. The count went **on** the chip,
which is what §7's own argument — "the summary and the rows are the same
control" — actually implies.

**The admin activity sparkline is deferred.** `getLiveAdmins` already reports
sessions opened in thirty days and last activity per operator, which answers the
page's question: not who has access, but who uses it. A sparkline would add
shape — steady use versus one burst — which is a real distinction and the same
argument the 30-day health strip rests on. It also needs a second query grouped
by operator by day. It is worth doing and it is not worth doing before the
things above it.

### What §7 got right and this pass delivered

Headroom, audit volume, MRR movement and session shape all landed as argued. The
AI rules rewrite was not in §7 at all — it came out of Stage 1, where writing the
reader found that the screen described a model the schema does not have.

### Stated limits

- **The audit histogram does not scope the stream.** Brushing needs both inside
  one client boundary, which would push every entry into the browser. The stream
  already filters by kind and free text.
- **No version diff on AI rules.** It needs two documents in the reader rather
  than one — a second query and a second shape, not a control to switch on.
- **Revenue movement is designed data.** Decision 2. The twelve rows reconcile
  with the level chart's `net` for every month, verified by arithmetic rather
  than asserted; a fixture whose parts do not close is worse than no fixture.

---

## 12. The queue, to production quality · 12 Sep 2026

A depth pass on one section rather than a breadth pass across many. The queue is
the first thing on the first screen, and it is the section the front-end agent
has taken furthest, so it is where the whole state and interaction kit gets
settled before the pattern is repeated.

### What it did before

Every card's primary control was a `<Link>`. "Retry charge", "Raise to Scale"
and "Write off" are verbs that promise an action, and all three navigated. A
reader who presses **Write off** and lands on Revenue has been told something
happened.

### The action model

`QueueItem.primaryLabel` + `primaryHref` — a string and a URL — became
`QueueItem.action`, a **discriminated union**. That turns two rules into
compile-time facts instead of conventions:

- **An action that acts must name its target.** `assign_plan` cannot be
  constructed without a plan code, so no card can offer to move a workspace
  somewhere unspecified.
- **An action that cannot act must say why.** `retry_charge` and `write_off`
  cannot be constructed without a reason, so the Phase 1 gaps sit on the control
  rather than being discovered by pressing it.

| Kind | Behaviour |
| --- | --- |
| `assign_plan` | Real, audited, confirmed first. `assignPlan` through the queue action |
| `choose_plan` | Opens the record. The right plan is a judgement, not an obvious upgrade |
| `open` | Opens the record. What the LIVE queue offers, always |
| `retry_charge` · `write_off` | Disabled, with the reason beside the control |

**The live queue only ever offers `open`.** The watchlist knows a workspace is
past due or near a ceiling; it does not know whether the answer is a plan
change, an override, or a phone call. Offering "Raise to Business" off a
threshold would be the console deciding a commercial question.

### The action is real even where the card is not

The queue renders designed data behind the review bypass. Letting the button
"succeed" against a fixture — a pause, a green toast, nothing written — is the
exact failure this pass has been removing, and worse here than on a settings
form: an operator who believes they moved a customer onto a paying plan stops
chasing it.

So the path is identical either way. The slug resolves against `tenants`, and a
card with no record behind it is **refused with a sentence that explains which
kind of data is on screen**. The interaction is complete; the outcome is true.

### Three outcomes, three surfaces

| Moment | Surface | Why |
| --- | --- | --- |
| While it runs | the button | 03 §20 reserves toasts for asynchronous outcomes. A spinner is where the reader is already looking |
| On failure | inline, dialog stays open | A toast that reports a refusal while the dialog closes takes the explanation away from the form that caused it |
| On success | a toast | By then the dialog has closed and the card has been revalidated away. That is the asynchronous outcome the rule is for |

### What gets audited, stated before it runs

`ConfirmDialog` gained a `details` slot — the same slot and contract its sibling
`DestructiveConfirm` already had, so `consequence` keeps its one-sentence rule.
The queue uses it to name both destinations: this platform's audit log, and the
workspace's own activity log, written in the same transaction as the change.

On a product whose central promise is that the platform cannot touch a customer
silently, the moment to say so is while the operator still has a Cancel button.

### Four states, one code path

- **Empty** — `QueueClear`. The best outcome this screen has, written to read as
  an achievement rather than an absence, and naming the count it checked so it
  cannot be mistaken for a failure to load. `EmptyState` is deliberately not
  used: its centred layout is right for a region awaiting its first record and
  wrong for one reporting a clean check.
- **Short** — no pager. `Pagination` renders nothing for a single page, so the
  call site never guards it.
- **Long** — a pager appears under the cards, moving nothing above them.
- **Loading** — `QueueSkeleton` at the card's real dimensions, replacing the
  generic `SkeletonRow`s in `loading.tsx`. A skeleton of the wrong shape is a
  layout shift with extra steps.

### The `Pagination` primitive

A **rule, not a box**. A pager drawn as a bordered bar reads as a second
component that arrived with the data and breaks the rhythm of the list it
serves. This is a hairline and a row.

- The **range readout** leads, because "6–10 of 23" answers the question a
  reader has (how much is left) rather than the one they can already see.
- The **page run elides** past seven pages, so the control's width is bounded. A
  pager that grows with the dataset reflows the layout when a customer signs up.
- A **disabled step stays in the layout** rather than vanishing at the ends, so
  the numbers do not shift under a pointer about to press again.
- The current page is a **tint**, never a filled blue chip: the surface's one
  accent is already spent on the action the reader came for.

`PagedList` is the part that matters architecturally. It windows **already-
rendered server children**, so cards stay server components and only the pager
hydrates. The trade is stated in the file: it ships every page's markup, which
is right for a bounded list and wrong for an audit log — that one wants a cursor
against the query.

### The fixture now exercises both ends

Four more designed cards, continuing the consequence ordering downward, so the
pager, the second page and the "1–5 of 8" readout are things a reviewer can see
rather than behaviour asserted in a comment. The four original cards stay at the
head of the queue. **Eight plus `restingCount` 39 is the portfolio total of 47**
— checked, not assumed.

### Known and deliberately not changed

`ui/StatusBadge.tsx` carries 36 raw Tailwind palette classes and 16 `rgba()`
literals, which is the same defect class as the one fixed in `Badge.tsx` at
Stage 0 — a component file holding colour instead of reading it. It is left
alone here on purpose: it is the component the front-end agent has just
finished polishing, and tokenising it changes rendered values. The fix is to
add Tier-3 tokens holding those exact values, so the tokenisation lands with no
visual change at all — worth agreeing before it happens rather than after.

---

## 12. Profile, closed · 13 Sep 2026

The second surface through **18**'s playbook, and the first to close a §6.3 item
by building the capability rather than wiring an existing one.

**§6.3 · new audited operations.** "Revoke device session" is done, and correctly:
the action now reports a zero-row revoke as a refusal rather than a success, and
withholds the audit row when nothing was revoked. Two more audited operations
joined it that were not on the original list — avatar replaced and avatar removed,
both `profile.updated` with the reason column naming what changed.

**§6.4 · honestly disabled.** The three security controls stay disabled, and the
requirement is now actually met. It was not before: the reasons lived only in
`title=`, so a keyboard, touch or screen-reader user got a dead control and no
account of it. `InertControl`'s own documentation had said this was insufficient
— *"this component refuses to be the only carrier"* — and the profile was the
caller that ignored it. The reasons are text in the layout now.

**What this surface added that the plan did not anticipate:** a real profile
photograph. `user_profiles.avatar_path` had existed since the first migration and
nothing wrote to it, while the shell rendered a stock photograph of a stranger as
the operator. That is documented in full in **19**, including the storage policy,
the browser-side EXIF strip, and the two propagation bugs it exposed — a
`revalidatePath` that never touched the layout, and a chrome reader selecting a
different column from the one the rename writes.

**Remaining surfaces**, in order: tenants, health, admins, settings, tenant
detail. Settings is next in line and is now cheap: eight of its hand-rolled
sections are the `SettingsSection` primitive this pass extracted, so that pass is
a deletion rather than a redesign.

## 13. Frank's four surfaces, hardened · 14 Sep 2026

Tenants/workspaces, revenue, plans and AI rules — the four the front-end pass
built — taken to the same standard as overview and profile. Type-check only
throughout; no build, no lint.

**§6.2 · the services that had no caller.** Two were wired this round.
`SubscriptionControls` mounts the plan and status writes on the billing tab, and
runs its preview on plan SELECTION rather than on confirm, so stranded
entitlements are visible before the confirm button is reachable at all.

`previewSuspension` was the second, and it mattered more than its absence
suggested. The suspend dialog is the console's best idea — consequences stated
in people rather than "are you sure?" — and it was reading those people from a
prop that travelled down with the page. A tab left open confirmed against a
number from whenever the tab was opened. Worse, a prop cannot carry the one
figure that changes minute to minute: **whether somebody is inside the workspace
on a support session right now**. Suspending underneath a colleague drops what
they were doing and tells neither party why. Both suspend paths — the header
control and the drawer — now read the impact from the database when the dialog
opens, show the open-session count as a warning ABOVE the consequence list
rather than as a fourth bullet in it, and say plainly which figures are on
screen. A failed preview degrades the dialog; it never blocks it.

The drawer also completed a suspension **in silence** — dialog closed, no toast,
status chip unchanged until revalidation. The most destructive action in the
console, evidenced by its own absence. It confirms now, in the header path's
words.

**§6.4 · honestly disabled, finished.** Ten controls across the five tenant tabs
carried their reason in `title=` only, as the profile's three had. `ReasonNote`
— extracted on the profile for exactly this — moved into `Surface` beside
`InertControl`, which is the component whose own documentation demands a
caller-side carrier; `profile/shared.tsx` re-exports it, the way
`overview/shared.tsx` does for `BandLink`. `Panel` gained a `footer` to hold it,
documented as NOT the standfirst it deliberately refuses: a band that needs a
sentence to be understood has a failed visualisation, while a band with an inert
control has a requirement.

**One note per group, not one per button.** The ten controls carry three reasons
between them. A sentence repeated beside each is noise a reader learns to skip,
which fails the requirement a second way.

Two surfaces outside the four were in the same state and were closed with it:
the admins roster (invite, revoke) and the platform API key list (create,
revoke).

**Bands that went nowhere.** Revenue had four visualisations and not one route
out — every band a dead end, against the rule `BandLink` states in its own
header. They route now, and the ageing band routes with its filter:
`WorkspaceTable` seeds its status chips from `?status=` and `?attention=`, read
once on mount so the operator owns the filter afterwards. A bare link to the
workspace list would have asked them to find the late four by hand, having just
been shown that there are four.

**`--indigo-500` was never defined.** Four ambient glows referenced it — console
overview, workspaces, revenue, the unsaved bar — so all four rendered with no
background at all. A token violation (tokens.css: *"No purple, violet, or
indigo"*) that was also a silent no-op. Likewise `#38bdf8`, Tailwind's sky-400,
serving as the mobile nav's active indicator: a fourth hue on a slab whose point
is that it carries one.

**Token census.** Roughly 130 raw values resolved across the console. The
surviving hexes are `Charts.tsx`'s `FALLBACK` map, which is deliberate — the
charts read the CSS variables at runtime and need literals when
`getComputedStyle` cannot resolve them.

**Left open, deliberately.** `ConsoleShell` and `ConsoleMobileNav` still hold
roughly ninety raw `rgba()` shadow and hairline recipes. They are console chrome
rather than any of the four surfaces, they are shadows rather than colours, and
sweeping them without a build or a visual pass days before a presentation trades
a real risk for a cosmetic gain. It is a bounded, separate pass.

## 14. What Brian is actually allowed to do · 14 Sep 2026

Dennis, on the console: *"what the actual fuck is brian allowed to do if he
cant even change his own password?!"* That is a fair hit, and §13 above is part
of why — a pass that made every dead control explain itself politely also made
the dead controls harder to notice.

The failure mode is worth naming, because it is not laziness. Controls got
grouped by where their data happened to live, the group got one confident
security paragraph, and then nobody looked again. A wrong reason is more
durable than no reason: no reason invites a question, and a well-written wrong
one closes it.

### Three things the owner can now do

**Change his own password.** The screen said password changes must go through
email recovery, *"because a console that could set a password for a signed-in
session would be a way around that proof."* That inverts the argument.
Re-authentication IS the proof, and a stronger one — mailbox control is what an
attacker acquires in order to RUN the recovery flow. The second half of the old
reasoning was a plain error on my part: I wrote that this needed the
RLS-bypassing admin client. `supabase.auth.updateUser` acts on the caller's own
session through the publishable key, and `api/v1/auth/password/reset` had been
calling it for months.

It asks for the current password, verifies it on a throwaway client so the live
session id is not rotated out from under the request, signs out every OTHER
device and spares this one, and records `password.changed` with the count —
never the value.

**Edit and publish the master AI rules.** The screen said publishing is *"an
audited operation with a blast radius, not a form submit"*, which is an argument
about HOW rather than WHETHER. Every clause of it survived: the publish appends
a version and moves a pointer, the change note is required, the audit row lands
before the work, and the radius is on screen before the submit is reachable.
Rollback is wired too — the rail could always SHOW the history and had no
control that used it, which made the append-only design a claim rather than a
capability.

**Change plan limits.** The "Manage limits" button was disabled beside a correct
paragraph: a limit belongs to the plan, and a ceiling for one customer is an
override. Both true; neither a reason the owner cannot change his own price
list. The dialog now counts what the change affects and, crucially, how many
workspaces are ALREADY above a proposed ceiling — a figure the headroom bars
cannot give, since a median and a maximum are not a count against a number
somebody has just typed.

### The modal that rendered half off-screen

Two bugs compounding, and the second is a whole class.

`ProvisionWorkspaceDialog` centred itself with `-translate-x-1/2
-translate-y-1/2` while GSAP animated `y` and `scale` on the same element. An
inline transform REPLACES the classes rather than merging, and the tween's end
state is `translate(0,0)` — so the centring went at first paint and never came
back. The animation was also wired to an inline callback ref, which React
re-invokes on every render, so it replayed on every keystroke in the form.

Then the same collision, twice more, from the other direction: `panel-in` ends
at `transform: none`, and the reduced-motion block forces `transform: none
!important` — which decentres `BlastRadiusDialog` and `HeadroomPlanCard`
visibly during the animation and PERMANENTLY for anyone who has asked for less
motion.

The fix at all three is the same and is not to teach the animation about the
centring: a `fixed inset-0 grid place-items-center` wrapper owns position, the
panel owns transform. The rule is now written into the keyframe's own comment,
so the next dialog cannot rediscover it.

### Skeletons

Overview and profile already had bespoke skeletons; the four surfaces from §13
were standing in for their layouts with generic parts, which 03 §15 rules out
for a reason — a skeleton of the wrong shape is a layout shift with extra
steps, and costs more than none, because the reader has started reading before
the page jumps.

Revenue was the worst: four small tiles and two blocks where the screen has a
~300px dark slab, two section headings at `mt-24 mb-12` each, a movement band
and two different chart grids. The page roughly tripled in height on arrival.

Four new primitives cover what the console is actually made of — `SkeletonRibbon`
(and it is DARK, because a light stand-in for the inverted slab flashes a third
of the viewport), `SkeletonFilterBar`, `SkeletonTable` (a table in one container,
not a stack of free-standing cards), and `SkeletonSectionHeading`.

### What is still honestly disabled

Twelve controls, in four groups, and none of them is a password-shaped mistake:

- **Phase 2 has no channel runtime** (3). The adapter contract exists and
  nothing sits above it.
- **Phase 1 has no payment gateway** (1). The console reports the debt; the
  finance operator collects.
- **Reaching inside a workspace needs a logged support session** (6). This one
  is a deliberate isolation boundary rather than missing work, and it is the
  claim that makes the whole console defensible in a security review.
- **Not a platform-level record** (2). Platform admin invitations and
  platform-level API keys are scoped to a workspace by design.

### Left open, needing a decision rather than an implementation

`toggleBreakGlass` still refuses. The platform-wide support lock has nowhere to
live: `platform_admins.can_enter_support_mode` is per-admin, and using it as the
global switch would destroy each admin's own setting on unlock. The gate itself
belongs in `startSupportSession` rather than in `withTenantContext` — refuse the
grant and no session exists to carry support mode — which makes it a small
change once the storage question is answered. That question is Brian's.

## 15. The hero, and what the console was asserting · 15 Sep 2026

Dennis: *"cant believe you did not notice the outdated plan on the provisioning
tenant modal, are we sure that provisioning actually works"* — and then, on the
hero: *"make sure the chart and thoroughput data is legit."*

Both were right, and the second one is the larger finding. Four surfaces were
stating figures that came from nowhere, and every one of them was defensible in
isolation.

### Provisioning did not work

The modal offered `starter`, `growth`, `scale` and `custom`. Three of those have
never existed in this product — the plans are `pro`, `business`, `custom`,
confirmed 24 Aug 2026 and recorded on `plans.code` — and the DEFAULT selection
was `growth`. The prices beside them were wrong for the two that survived.

That was the visible half. The invisible half: `provisionTenantSchema` had no
plan field at all, so the operator's choice was dropped before it reached the
service, and `provisionTenant` wrote a tenant, its settings, the owner profile
and the membership — **and no subscription row**. A workspace came out of it
with no plan, no entitlements and no ceilings, while step 2 of the modal's own
five-step panel promised "plan entitlements resolved and snapshotted onto the
workspace".

It was invisible from the console because the twelve seeded workspaces were
seeded with their subscriptions directly, never through this path. `pnpm
db:check-provision-write` runs the write against the real database inside a
transaction and rolls it back, which is the only way to catch it: plan resolves,
subscription lands, eight limits apply, the one-per-tenant index holds, nothing
is kept. `growth` is asserted NOT to resolve, so the regression cannot return
quietly.

The modal now reads the live catalogue. The fixture behind it was corrected too,
and its prices derive from `PLAN_PRICE` — a fallback that lies is how this
survived, since a screen that looks plausible is never checked against the
database.

### The hero was asserting things nothing measures

- The chart generated a **`Math.random()` walk**, relabelled every mount, and
  hydration-mismatched — the server's walk and the client's were different
  numbers.
- **`3.42M`** was hardcoded above that random line, so the headline and the line
  it labelled were unrelated.
- **`+12.4% vs last month`** was hardcoded, in success green, with no way to
  ever render a fall.
- The third signal claimed **"128k requests · p95 142ms · errors 0.011%"** and
  linked to `/platform/health` — a page whose own copy explains that the vitals
  are not wired. The hero asserted a latency and then sent the reader to a
  screen admitting there is no latency.

The chart takes its series as a prop now: twelve months of recurring revenue
from `revenueSeries()`, already reconciled per month. Revenue rather than a
request rate because it is the one twelve-month series this database can
actually answer — a chart of a number we have beats a beautiful chart of a
number we do not.

### The collection queue was a second, parallel portfolio

The revenue screen's ageing buckets summed to 594,000. Its collection queue,
printed three hundred pixels below the chart, summed to 486,000. The hero quoted
594k. And the five debtors — Kilimanjaro Logistics, Mombasa Freight, Highfield
Insurance, Aurora Dental, Nyali Property — exist in no fixture, no seed and no
table, so clicking one led to a workspace page that could not resolve.

Debt is now `arrears` on the workspace that owes it, in `portfolio.ts`. The
outstanding figure, the ageing chart and the queue are the same rows counted
three ways. The total falls from an invented 594,000 to a derived **27,200** —
and the old figure was never coherent anyway: against an MRR of 140,200 it
implied four months of total turnover outstanding, which is not a collections
problem but a business that has stopped being paid.

### Two data bugs the derivation exposed

**A one-seat plan is not under pressure for having its one seat.** Pro is a
single-seat plan, so every Pro workspace sits at exactly 1 of 1 forever. A
percentage test read that as 100% and filed five of twelve workspaces as needing
attention — burying the one that genuinely was. Pressure requires a ceiling
greater than one, because pressure means "there is room here and it is running
out". The attention count falls from 8 to 4.

**A ratio must be over the population it is a ratio of.** Total seats counted the
24 on the uncapped `custom` workspace; total capacity could not. The hero would
have read "68 of 65" — a platform 105% full. Both halves now exclude the uncapped
plans and the uncapped seats are stated separately.

### The fourth KPI

The ribbon was `lg:grid-cols-4` rendering three, leaving a quarter of it empty at
desktop width. It now carries Recurring, Workspaces, **Seats in use** (which
replaced the invented request rate — a real capacity fact, and the commonest
reason a customer moves up a tier) and **Needing attention**, which is the number
the headline sentence opens with and which appeared nowhere in the figures
beneath it.

Both numbers in that headline were literals too — "Three workspaces" and "KES
594,000". They derive now, so the sentence agrees with the queue printed
directly underneath it.

`pnpm check:figures` asserts all of this as arithmetic, with no database, in a
second: the buckets sum to the headline, every debtor is a real workspace, the
attention count matches in all three places it appears, capped seats never
exceed capacity, every month of revenue reconciles, and no signal claims a
metric this product does not collect.

### Break glass

Wired, having refused for a phase. The reason it gave described a design nobody
built — a flag at `app.support_lock` checked by `withTenantContext` on every
request, for a control used twice a year.

The lock has no column. The most recent `support.lock_engaged` /
`support.lock_released` row in the platform audit log **is** the state: the state
and its record are the same row, so they cannot drift, the history is intrinsic,
and it needed no migration. Enforcement is at the mint — refuse the session and
there is nothing for `withTenantContext` to widen — and engaging it revokes every
open session rather than letting colleagues run out their thirty minutes inside
customer workspaces during an incident somebody just declared. Verified by `pnpm
db:check-break-glass`.

### One vocabulary for the audit log

Thirty-six action codes were being printed raw — `password.changed`,
`support.lock_engaged` — on three surfaces at once. `auditVocabulary.ts` gives
each a sentence, a glyph and a tone, shared by the overview rail, the audit page
and the tenant activity tab so they cannot drift into calling one event three
things. The overview's colour mapping was substring-matching the raw string, and
two of its four branches (`includes('master')`, `includes('auth')`) could never
fire, while `tenant.provisioned` fell through to the default.

### The queue was a second portfolio too

Found while verifying the hero: the overview's queue named eight workspaces —
Kilimanjaro Logistics, Sarova Hospitality, Peridot Health, Mombasa Freight,
Thika Agro, Nakuru Dairy, Eldoret Motors, Kisumu Lakeside — with their own
plans, seat counts and arrears, and not one of them exists. Every row linked to
`/platform/tenants/<slug>` for a slug that resolves to nothing.

It is the most actionable list in the product, the headline counts it, and the
hero's primary button points at it.

It derives now, and the ordering rule survives as an ordering rather than as
eight hand-sorted literals: past due, then at a ceiling, then trial, then
suspended — "what it costs to ignore". Seeding a thirteenth workspace in trouble
puts it in the right place without anybody editing a fixture. Six real rows
replace eight invented ones.

`pnpm check:figures` now also asserts that every queue row is a real workspace,
that the severity order holds, and that no healthy workspace appears in a list
whose whole job is to be a shortlist.

## 16. One modal, and the plans that would not die · 15 Sep 2026

Dennis, on the support-session dialog: *"very sleek elegant design that i need
replicated to this other modal you created along this pass just look like some
generic make shift modals"* — with two corrections: *"not so much with the
gigantic header"*, and *"i like modals not to be shy with their widths if they
got excessive content then no need to cram em up."*

### `ConsoleDialog`

The support-session dialog had a real vocabulary — mono eyebrow, one sentence of
description, a hairline-separated fact list, one padding rhythm, and a footer on
sunken ground carrying the OPERATION'S OWN NAME beside the actions. Four modals
written after it copied some of that and improvised the rest, which is how the
console ended up with four paddings, three title sizes, three button heights and
two footer grounds.

It is one component now, and all five use it. Three deliberate departures from
the original, all corrections:

**The title is `display-sm`, not `display-md`.** At 38px "Enter Kilimanjaro
Logistics Group Ltd" wrapped to three lines and ate half the panel before a word
of content. A dialog title labels a task; it is not a page heading.

**Width is a prop and it is generous** — 480 / 600 / 760 / 940. The instinct to
keep a modal narrow is right for a confirmation and wrong for a form: the rules
editor has six prose fields, and at 560px they became a column of three-word
lines that read like a receipt. It is `xl` now and two columns wide, because the
operator is editing paragraphs an assistant will speak.

**Centring is on a wrapper, never on a transform** — the fix from §14, now
structural rather than repeated.

Two bugs fixed by the extraction. Every one of these dialogs animated from an
inline callback ref, which React re-invokes whenever the function's identity
changes — every render — so each replayed its entrance on every keystroke in its
own form. And `DialogFact`'s glyph is an `IconTile` now: the raised
gradient-and-hairline treatment the demo doors use, rather than a flat 16px
stroke sitting in the text run with nothing for the eye to anchor on.

### The reference is generated

The reason field's placeholder read `Ticket 4829 · verifying a duplicated
WhatsApp thread` — house style, and then the operator invents a number. So the
references in the audit log were whatever each person typed, and the one column
that should join a session to a support ticket was unjoinable.

`nextSupportReference()` counts `support.entered` in the platform audit log and
returns `TKT-20260915-013`. Derived rather than sequenced for the same reason
break glass has no column: the log is append-only, so counting it IS the
sequence, and a `nextval()` would be a second source that can disagree with the
log about how many sessions there have been. It prefills the field with the
caret after it, so the operator writes the sentence and the reference is already
correct — and the confirm still requires eight characters BEYOND the prefix, so
an untouched field cannot be submitted.

### "What are these zeros supposed to be"

`00000000-0000-4000-8000-000000000012` is the workspace's real primary key. The
seed writes readable, sequential UUIDs so the isolation suite can pin three of
them by value — that part is deliberate and load-bearing.

Rendering all thirty-six characters in the drawer header was not. It is noise in
the one line a reader uses to confirm they opened the right customer, and an id
whose first twenty characters are zeros reads as placeholder data — which is the
exact impression a console being shown to a client must not give. The first
segment shows as a handle, the full value goes to the clipboard, and the title
attribute carries it for anyone who wants to read it without copying.

"Created 0 months ago" went with it. Nobody says "0 months", and nobody says
"created N months ago" either — it reads "new this month" now, which is the fact
somebody actually wants from a workspace that age.

### The retired plans, everywhere

Chasing the drawer's "MONTHLY RUN RATE · KES 28,000" on a `PRO` badge turned up
the same defect in six more places. Trial, Starter, Growth and Scale were
replaced by Pro / Business / Custom on **24 Aug 2026**, and the old names were
still keyed into:

- the workspace drawer's price table — so every real workspace fell through to a
  default of 28,000 against a true Pro price of 3,400
- its storage and API-credential meters, where a Custom customer on a negotiated
  contract showed the tightest limits in the product
- the trial banner's copy — which also claimed "workload telemetry" this product
  does not collect and **"row-level encryption"**, which is not row level
  security, is not a feature we have, and was written exactly where the one real
  guarantee should be
- the plans comparison table, whose four columns and eight entitlement rows were
  a price list for a product nobody sells, with counts summing to fifty-one
- the overview's plan-mix icon map, which gave three identical box glyphs to a
  legend whose whole job is telling three plans apart

Every one failed **silently**. An unmatched key falls to a fallback, and a
fallback that renders is indistinguishable from a value that is right.

`pnpm check:figures` now searches the rendered read models for those four names
and fails if any survives, checks the plans table names Business / Custom / Pro,
and asserts every entitlement row has exactly one value per column — the
positional `values` array had four entries against three columns, which shifts
every row silently.

## 17. The dialog kit, and the initials that were three components · 15 Sep 2026

### `InitialsTile`

The workspace mark — two letters on a round surface — existed three times: the
table's row, the same table's card layout, and the drawer header, at 40px, 48px
and 56px, each computing the initials itself and each positioning the status dot
slightly differently.

All three were also FLAT, while `IconTile` beside them lifts with a
light-to-dark gradient. On a screen carrying both, a glyph tile read as raised
and a workspace mark read as a hole in the surface — the same object at the same
altitude, drawn two ways. And all three were weight 600, which the console does
not have: 03 §5 caps it at 500, so two letters were the heaviest text on the
screen, on the least important word in each row.

The queue cards moved from `IconPill variant="tinted"` to `IconTile` for the
same reason. A flat tinted disc is right for a status chip, which is what
`IconPill` was built for, and wrong as the leading mark on a card an operator
works through four deep.

### The drawer's structure

**The spec panel split its facts at a hardcoded three.** `slice(0, 3)` and
`slice(3)` are even for exactly six facts. A seventh gives the left column three
against the right's four; a fifth gives it three against two. Either way the
divider stops being a centre line. It is `Math.ceil(length / 2)` now, so the
left column is the longer one when the count is odd — the direction a reader
scanning top-left expects.

**Three of the six facts were false**, and the third is the one that matters:

- *"Monthly (Auto-debit)"* — there is no auto-debit, and no gateway at all.
- *"Next invoice · 04 Sep 2026"* — hardcoded, already in the past.
- *"Compliance & RLS · Active · Schema isolated"* — this product isolates by
  **Row Level Security on a shared schema**. "Schema isolated" claims
  schema-per-tenant: a different architecture, different guarantees, different
  cost. It sat on the screen whose job is to prove the isolation story, and the
  stat card beside it said the same thing backwards as *"RLS isolated schema"*.

Same class as the trial banner's *"row-level encryption"* — a confident security
claim, in a console being shown to clients, that is not what the product does.
What is true is stated instead, and it is the stronger claim: every read answers
to a policy, including ours.

### On the test suite

The full run took **70 minutes** and 11 of 280 tests failed, every one of them a
20-second timeout inside `tests/isolation/generated.test.ts` — no assertion
failures. Round-trip latency to Supabase measured at ~200ms, and the isolation
matrix runs many queries per case, so the per-test budget was simply too small
for the connection rather than for the code. Nothing in this round touches a
schema or a policy: `git status src/db/` is empty.
