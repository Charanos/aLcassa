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
| `/platform/profile` | 22 ln | fixture | 2 | Device list that cannot revoke |
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
