# 18 · Surface Refinement Playbook

**Opened:** 12 Sep 2026 · **Derived from:** the console overview's queue and right rail, taken to production quality first
**Applies to:** every section built in the `17` density pass, and every surface after it

---

## 0. What this document is for

Document `17` got each console surface to the point where it reads real data, has no dead controls, and answers its own question with a band. That is a **floor**, not a finish.

This is the pass that comes after: taking one section at a time from correct to **finished** — every state designed, every interaction resolved, every colour a token, every invented figure either sourced or removed.

It was written by doing it. The overview's queue and right rail were taken through it end to end, and the checklist below is what that work actually turned out to need, in the order it turned out to matter. Nothing here is speculative.

**The method is not a rewrite.** Every section this applies to was designed deliberately and refined by hand. The job is to keep the design and give it the structure, states and honesty it has not been given yet. Where something is torn out, this document says why — and "it was built before we knew better" is a reason, while "I would have done it differently" is not.

---

## 1. The order, and why it is this order

Each step makes the next one cheaper. Doing them out of order means doing some of them twice.

| # | Step | Why here |
| --- | --- | --- |
| 1 | **Componentise** | Everything downstream edits files. Do it while the section is still one file and the moves are obvious |
| 2 | **Truth** | Find invented data before designing states around it. A state for a figure that should not exist is wasted work |
| 3 | **Tokens** | Before states, because empty and loading states introduce new surfaces that will otherwise be coloured by hand |
| 4 | **States** | Empty, short, long, loading, error. The shape of the section is settled by now |
| 5 | **Interaction** | Confirm, pending, success, failure. Needs the states to exist to slot into |
| 6 | **Accessibility and motion** | A sweep, once the markup has stopped moving |
| 7 | **Verify and record** | The census scripts, then the delta |

---

## 2. Step 1 · Componentise

**One file per section of the screen**, under `src/components/console/<surface>/`.

- A band, a card, a rail panel: each is its own file.
- **Server component by default.** A file becomes a client component only when it owns state, and then only the smallest part of it does.
- It takes a **typed slice of the read model** as a prop. Never the whole model.
- Skeletons live **beside the component they mirror**, exported from the same file.

### The test that matters

> Could this file be restyled by someone who has never read the data layer?

If not, presentation and data are still tangled.

### Worked example: the queue

`YourQueue.tsx` is a server component. `QueueAction.tsx` is a client component containing **only the button, its dialog and its toast**. The card's icon, name, prose, badge and meta are server-rendered HTML.

The alternative — one client component per card — would have pushed every workspace's prose through the serialisation boundary to gain a button.

### Worked example: the rail

`LastActions` was ninety inline lines in `page.tsx`. Extracted, it is a server component that ships no JavaScript at all: the timeline axis, the node and the connecting line are CSS. **Check that before moving something into a folder full of client components** — it is easy to lose a server component by relocating it.

---

## 3. Step 2 · Truth

Hunt for figures that exist only in a component. This is the step that finds the most, and the findings are always worse than expected.

```bash
# Data-shaped literals sitting in presentation files
grep -rn "details: \[\|value: '[0-9]" src/components/console/<surface>/
```

### What it found in the overview

`PlatformTelemetry` carried a `METRIC_SPECS` map with every service's title, SLA target, gauge ratio and four detail rows — "p50 latency 44ms", "Edge cluster NBO-1", "Twilio SMS Gateway 99.1%". None of it had a source. Three defects travelled with it:

- **The map was keyed by the vital's `label`**, so renaming a service silently dropped its entire spec to a generic fallback.
- **The live reader returns no vitals at all**, so a signed-in operator saw an empty rail while the review bypass saw four richly detailed services — the opposite of every other surface's arrangement.
- The footer declared "9 consecutive days incident-free · 99.98% composite SLA". Neither figure had a source.

### The three resolutions

1. **Move it into the read model**, shaped as the query that will replace it. `Vital` went from three fields to eleven; the fixture holds the designed values and the live reader will fill the same shape.
2. **Derive it.** The footer now counts the vitals it was handed — "3 of 4 within budget". A smaller claim, a true one, and it cannot drift from the rows above it.
3. **Remove it and say so.** Where neither works, the surface states the absence.

### The rule

> A number with no source is shown as a dash or labelled as not yet counted.

Set when the isolation panel was corrected on 28 Aug, and it has caught something on every surface since.

---

## 4. Step 3 · Tokens

```bash
# Raw colour in a section
grep -c '#[0-9a-fA-F]\{3,8\}' src/components/console/<surface>/*.tsx
grep -c 'rgba(' src/components/console/<surface>/*.tsx
grep -o '\b\(emerald\|amber\|rose\|sky\|zinc\|slate\)-[0-9]\{2,3\}' src/components/console/<surface>/*.tsx | wc -l
```

**A Tailwind palette class is the same defect as a hex.** `bg-emerald-500/[0.08]` is a colour decision in a component file; that it arrived as a utility class rather than a literal changes nothing.

### The real cost, stated once

`StatusBadge` held 45 palette classes and 21 `rgba()` literals. The cost was not tidiness — it was **a second green in the product**. A badge reading "healthy" in Tailwind's emerald, beside a meter reading healthy in `--success-fg`, is two greens for one meaning and nobody can say which is the product's.

### How to tokenise without a visual regression

Two options, and the choice is a design decision rather than a mechanical one:

- **Preserve the values.** Add Tier-3 tokens holding the exact rendered values. Zero visual change, defect closed. Right when the component's look has been signed off.
- **Adopt the system's values.** Point the tokens at the semantic scale. The appearance shifts toward the product's register. Right when the raw values were themselves the drift.

`StatusBadge` took the second, deliberately: Tailwind's emerald, rose and amber are more saturated than this product's muted status scale, so matching the system means the badges sit down slightly against the cream ground — which is the identity, not a regression. **And a hotter register is now two numbers — `--badge-tint`, `--badge-edge` — rather than a rewrite.** That reversibility is the argument for tokenising, so demonstrate it.

### Legitimate exceptions

- **Third-party brand marks.** WhatsApp's `#25D366`, Instagram's `#E1306C`. Not ours to tokenise.
- **Neutral alpha in a shadow** is tolerable but usually means a `--shadow-*` token was not reached for.

---

## 5. Step 4 · States

**Five states, one code path.** They differ in what they SAY, not in how they are built.

### Empty

Not a fallback — a designed surface, and often the most-read one in a product whose main feature is not built yet.

- **Never "nothing here."** `10 §12`. Say what appears and when.
- **Distinguish it from a failure to load.** An empty panel with no words is indistinguishable from a broken one. Name the count that was checked.
- **Pick the right kind.** `03 §16` separates three: `EmptyState` for a region awaiting its first record; `EmptyStateSeam` (hatched, slate) for a boundary that is not built yet; `EmptyStateWithheld` (hatched, oxide) for data this reader may not see.

Three from the overview, all different on purpose:

| Surface | State | Why it reads the way it does |
| --- | --- | --- |
| Queue | `QueueClear` | The **best outcome this screen has**. Written as an achievement, naming the count it checked |
| Telemetry | `TelemetryUnwired` | A **seam**: probes are a real commitment at M6. Hatched, because nothing is broken |
| Last actions | `NoActionsYet` | A platform on day one. Says explicitly that it is not a failure to load |

`EmptyState`'s centred icon-and-sentence was deliberately **not** used for the queue: it is right for a region waiting for its first record and wrong for one reporting that a check came back clean.

### Heavy

Use `Pagination` / `PagedList` from `primitives`.

- **`PagedList` windows already-rendered server children**, so cards stay server components and only the pager hydrates.
- **It ships every page's markup.** Right for a bounded list; wrong for an audit log, which wants a cursor against the query. State the reversal point at the call site.
- **A pager is a rule, not a box.** A bordered bar under a list reads as a second component that arrived with the data.
- **It renders nothing for a single page**, so the call site never guards it — which is what keeps empty, short and long on one code path.

### Loading

- **The section's own shape, never a generic row.** A skeleton of the wrong shape is a layout shift with extra steps. Both the queue and the rail were drawing generic panels for a card and a four-row table.
- Opacity pulse, **no shimmer sweep** — a sweep implies a known duration the system cannot promise. `03 §15`.
- `aria-busy` on the container, once. Static at 0.7 under reduced motion.
- Where a section has its own query, give it a **`Suspense` boundary** — and put the read **inside** the async child. A boundary around an already-awaited value boundaries nothing.

### Error

Page-level failures belong to `error.tsx`. Action failures are inline, next to the control. See §6.

---

## 6. Step 5 · Interaction

**Three moments, three surfaces.** Getting this wrong is the most common interaction defect in the codebase.

| Moment | Where it belongs | Why |
| --- | --- | --- |
| **While it runs** | the control itself | `03 §20` reserves toasts for asynchronous outcomes. A spinner is where the reader is already looking |
| **On failure** | inline, dialog stays open | A toast that reports a refusal while the dialog closes takes the explanation away from the form that caused it |
| **On success** | a toast | The dialog has closed and the row has been revalidated away. This is the asynchronous outcome |

### Never fake a save

A handler that sets "Saved." on a timer and writes nothing is **worse than a dead button**: the reader is told the change landed and finds the old value later with no error to explain it. Two shipped in this codebase and both were removed.

Where there is nothing to write to, the control is **disabled with the reason on the surface** — not in a `title`, which gives nothing to a reader without a pointer.

### The reason needs room

The queue's disabled reason shipped twice inline beside the button and **truncated both times** — "No payment gateway in Phase 1 — this reports, it does …". A truncated reason carries the full cost of the explanation and none of its benefit.

It moved onto its own line. **Uniform row height was the wrong thing to protect**: cards already vary with how their prose wraps, and a sentence a reader can finish is worth more than a pixel of rhythm.

### Model the action, do not label it

Replace `label: string` + `href: string` with a **discriminated union**. That turns two rules into compile-time facts:

- An action that **acts** must name its target — `assign_plan` cannot be constructed without a plan code.
- An action that **cannot act** must say why — `retry_charge` cannot be constructed without a reason.

### State what gets audited, before it runs

`ConfirmDialog` takes a `details` slot beneath its one-sentence `consequence`. Use it to name what the action will record and where.

On a product whose central promise is that the platform cannot touch a customer silently, the moment to say so is **while the operator still has a Cancel button**.

### Keep the action real against designed data

The queue renders fixtures behind the review bypass. Letting the button "succeed" against one would have been the fake save again. The path is identical either way: the slug resolves against `tenants`, and a card with no record behind it is **refused with a sentence naming which kind of data is on screen**. The interaction is complete; the outcome is true.

---

## 7. Step 6 · Accessibility and motion

A sweep, once the markup has stopped moving.

- **Every transform-on-hover gets `motion-reduce`.** Guard the transform, not the colour — a reader who asked for less motion still wants to know which row the pointer is on.
- **Collapsed content uses `hidden`, never `max-h-0 opacity-0`.** The latter leaves it in the accessibility tree and the tab order; the telemetry rail was reading four collapsed services' details as though on screen. A fixed max-height also clips anything longer than it was drawn for.
- **A disclosure declares itself**: `aria-expanded` and `aria-controls` on the trigger, an `id` on the panel.
- **Two buttons that swap a view are a `tablist`.** Three attributes.
- **A shape that carries meaning takes `role="img"` and a full label.** A meter built from three divs gives a screen reader nothing.
- **Label a definition list as one.** `dl`/`dt`/`dd` for a detail panel of label-value pairs.

---

## 8. Step 7 · Verify and record

`pnpm tsc` throughout. Lint and build at section boundaries — **and not at all while a dev server is running against the same tree**.

```bash
# Dead controls, whole console
node scratch/deadctl.cjs            # must read 0

# Raw colour, this section
grep -c 'rgba(\|#[0-9a-fA-F]\{6\}' src/components/console/<surface>/*.tsx
```

Then write the delta into `15`. **Every removal needs a reason a stranger can audit**, and "it was built before we knew better" is one.

---

## 9. The checklist

Copy this per section.

```
COMPONENTISE
  [ ] one file per band/card/panel under components/console/<surface>/
  [ ] server components by default; client only where state lives
  [ ] each takes a typed slice of the read model
  [ ] skeleton exported beside the component it mirrors

TRUTH
  [ ] no data-shaped literals left in presentation files
  [ ] if the surface can write, it knows whether the model is live —
      and every control says so before it is pressed, not after
  [ ] every figure: sourced, derived, or labelled as not counted
  [ ] the live reader and the fixture return the SAME shape
  [ ] maps keyed by id, never by display label

TOKENS
  [ ] 0 hex, 0 rgba, 0 palette classes (brand marks excepted)
  [ ] new surfaces read Tier 2/3; chrome surfaces read Tier 4
  [ ] tint and edge strengths are tokens, not per-tone literals

STATES
  [ ] empty — designed, named, distinguishable from a failure to load
  [ ] heavy — PagedList, with the reversal point stated
  [ ] loading — the section's own shape, pulse not sweep, aria-busy
  [ ] error — inline for actions, error.tsx for the page

INTERACTION
  [ ] pending in the control, failure inline, success in a toast
  [ ] no fake saves anywhere
  [ ] disabled controls state the reason, with room to read it
  [ ] actions modelled as a union, not a label and a URL
  [ ] the confirm dialog names what gets recorded

ACCESS AND MOTION
  [ ] motion-reduce on every hover transform
  [ ] hidden, not max-h-0, for collapsed content
  [ ] aria-expanded/controls, tablist, role="img" on meaningful shapes

VERIFY
  [ ] tsc clean
  [ ] dead-control census 0
  [ ] raw-colour census: brand marks only
  [ ] delta written into 15
```

---

## 10. Applied and outstanding

| Section | Componentised | Truth | Tokens | States | Interaction | A11y |
| --- | --- | --- | --- | --- | --- | --- |
| Overview · queue | done | done | done | done | done | done |
| Overview · telemetry rail | done | done | done | done | n/a | done |
| Overview · last actions | done | done | done | done | n/a | done |
| Overview · revenue band | done | done | done | done | done | done |
| Overview · portfolio band | done | done | done | done | n/a | done |
| Overview · operations band | done | done | done | done | n/a | done |
| Plans · headroom | done | done | done | partial | n/a | done |
| Audit · volume | done | done | done | done | n/a | — |
| Revenue · movement | done | done | done | — | n/a | — |
| Sessions · shape | done | done | done | done | n/a | done |
| AI rules · fields, versions | done | done | done | partial | n/a | — |
| Profile · identity & avatar | done | done | done | done | done | done |
| Profile · security | done | done | done | done | n/a | done |
| Profile · sessions | done | done | done | done | done | done |
| Profile · access rail | done | done | done | done | n/a | done |
| Tenants, health, admins, settings, tenant detail | — | — | — | — | — | — |

**The overview page is complete.** Every section on it has been through all seven steps. It is the reference implementation: when a later surface is ambiguous, open the equivalent piece of the overview and match it.

The remaining console surfaces are next, in the order of `17 §9`.

---

## 11. Two things the first pass got wrong

Recorded because both cost a second attempt and both are easy to repeat.

**Uniformity is not the highest value.** The disabled reason was kept inline, twice, to hold row heights equal. It truncated, twice. Cards already vary with their prose; a legible sentence outranks a pixel of rhythm.

**"Refine, do not rewrite" cuts both ways.** The telemetry rail's visual design was good and was kept almost exactly. What had to go was the invented data behind it — and that is not a style judgement, it is the seam rule. The distinction to hold: **keep the drawing, replace what it is drawn from.**

---

## 12. What the last two bands added to this list

The portfolio and operations bands went through the seven steps with no
front-end pass in front of them. Four patterns came out that were not in §2–§7
and are now part of the method.

### Two blocks that are nearly the same block

The portfolio band held **two forty-line capacity meters** — seats and events —
copied and then diverged. Seats drew in `--blue-400`, events in `--success-fg`,
for no reason either meter could state: both show the same quantity, capacity
consumed, and green does not mean "events".

That is the copy's real cost. It is not the duplicated lines, it is that the
next threshold change, label tweak or accessibility fix lands in one and not the
other — and nobody notices until the two disagree on screen about what "full"
looks like.

> **Look for near-identical siblings before anything else in a band.** Extracting
> them is the step that makes every later step half the work, and the diff
> between the two copies is usually a defect rather than a decision.

The extraction also forced the colour question, which is the pattern worth
naming: **a series coloured by WHICH metric it is, rather than by how it is
doing, spends a meaning on nothing.** One encoding now, shared with the pressure
list in the same band, so all three capacity displays agree.

### A list that truncates must say so

Three lists in these two bands took a `slice()` and dropped the rest silently:
pressure rows at five, queues at four. A platform with nine workspaces at a
ceiling looked exactly like one with five, on the panel whose entire job is
reporting pressure.

> **Every `slice()` in a presentation component needs a companion count.**
> `{hidden} more at a ceiling`, linked to the surface that shows them all.

### `role="meter"` is the element for a bar

A progress bar built from two divs — a track and a fill — tells a screen reader
nothing whatsoever. It is also the single most common shape in this console:
limit bars, capacity meters, pressure rows, headroom tracks.

> `role="meter"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax` and a
> label naming **what the percentage is a percentage of**. Four attributes.

`aria-hidden` on the track (which is what these had) is worse than nothing: it
actively removes the only figure the reader might have got.

### A `dl` can read in a different order than it displays

The support ledger shows a large value above a small label, which is right
visually and wrong in markup — a definition list must read term-then-value.

`flex-col-reverse` restores the visual order while leaving `dt` before `dd` in
the DOM, so a screen reader hears "sessions this week, four" rather than "four,
sessions this week". Use it wherever a stat block puts its value first.

### And one non-pattern, recorded so it is not repeated

While removing an unused icon import, an `export const QUEUE_ICON = IconStack2`
was briefly added to keep the import "used". That is a fudge that turns a lint
error into a public API. The import was deleted properly instead. **If a symbol
is unused, remove it; do not find it a job.**

---

## 13. The RSC trap that nothing catches

Recorded on its own because it is the only defect found in this whole pass that
**typechecked, linted, built, and rendered wrong** — and because the console has
several more places shaped exactly like it.

### What happened

The portfolio legend's five status colours were factored into a shared map, to
stop the legend and the donut it explains from drifting apart. The map was put
in `Charts.tsx`, beside the chart that also needs it.

`Charts.tsx` is `'use client'`. The legend is a server component.

**Every dot rendered grey.** A server component importing a value from a client
module does not receive the value — React replaces every export of a
`'use client'` module with a client-reference proxy, so each lookup returned
`undefined` and fell through to the neutral default.

### Why it is worse than it sounds

The legend is the *only* reason `03 §24` permits that donut to use semantic
hues instead of a one-hue ramp. A legend whose dots are all grey withdraws the
permission while still looking like it grants it. The chart was in breach and
nothing said so.

### The pairing rule

| Module carries | A component on the other side gets | Caught by |
| --- | --- | --- |
| `server-only` | a build failure | **the build** |
| `'use client'` | client-reference proxies, silently | **nobody** |

The `server-only` direction is the one this project had already been bitten by
(`RulesTab`, `15 C49`) and it is the *safe* one — it stops the build. This
direction does not stop anything.

> **A constant shared between a server component and a client component belongs
> in a module with NEITHER directive.**

`src/components/console/statusHue.ts` is that module, and its header carries
this reasoning so the next person to consolidate a duplicated map finds it.

### How to check for it

```bash
# Server components importing from a 'use client' module.
# A type-only import is fine; a VALUE import is the trap.
grep -rn "from '.*Charts'" src/components/console --include=*.tsx \
  | grep -v "^.*:import type"
```

Then confirm each importing file is a client component, or that only types and
components (not plain values) are being imported. **Components and hooks cross
the boundary correctly; plain objects, arrays and functions do not.**

### And a smaller one found beside it

A row carried `hover:bg-[var(--surface-sunken)]` and did nothing when clicked.
A hover state is a promise of interaction — it is the dead-control defect
(`17 §6.4`) wearing a row instead of a button. The legend's rows are inert and
now look it; the route out is the band's own heading link.

---

## 14. Carded or uncarded — decide it once per band

Recorded because this pass **missed it entirely**. The console was built
uncarded, `Panel`'s own comment said so, and the overview had been carded for
days before anyone wrote down that the decision had changed. Every band was
refined against a document describing the opposite of what shipped.

### The decision

| The screen is | Use |
| --- | --- |
| **one subject** — a table, a stream, a matrix | `default`, uncarded |
| **several unrelated subjects** stacked or side by side | `elevated`, carded |
| a panel inside an already-tinted surface | `flush-glass` |

The reasoning, which is the part worth carrying to the next page: a hairline
**between** two sections looks exactly like a hairline **inside** one. On a
single-subject screen that ambiguity costs nothing, because there is only one
section. On a briefing screen with five bands of unrelated subjects it costs the
reader the ability to tell where one ends.

### Where it goes wrong

1. **Mixing within a band.** A carded panel beside an uncarded one reads as one
   of them having failed to render. Pick per band, not per panel.
2. **Carding a single panel.** One card on a page is a page with an
   inexplicable box on it.
3. **An untitled card.** If a region does not deserve a name, it does not
   deserve a boundary.
4. **Reaching for elevation once the card exists.** The card is a ground change
   and a radius. `--shadow-sm` at most — the surface ramp separates, not a drop
   shadow.

### The step to add

> **Before Step 4 (states), settle carding for the whole band.** Empty and
> loading states inherit the container's treatment, so deciding afterwards means
> redrawing every state you just built.

`03 §26` is the authority. It was written after the fact, which is the lesson:
**when the product and the design document disagree, the document is a defect
whoever notices it owns** — regardless of who changed the code.

---

## 15. What the profile added to this list

The second surface through the playbook. Four lessons, of which two change the
checklist in §9.

### A client component can hold state ABOVE server children

The profile needed a floating unsaved-changes bar, and a `sticky` bar only works
inside its own container — so a bar rendered in the identity card stops following
the reader exactly when they scroll past that card. The draft state therefore has
to live above every card on the page.

The naive conclusion is that every card must become client code, which would have
undone step 1 completely.

It does not follow. A client component that receives already-rendered **server**
trees as props renders them without inspecting or hydrating them:

```tsx
// ProfilePanel.tsx — a SERVER component
<ProfileForm
  name={model.name}
  main={<><SecurityList … /><SessionList … /></>}   // rendered on the server
  rail={<><AccessRail … /><LimitsCard /></>}        // rendered on the server
/>
```

`ProfileForm` is `'use client'`, holds the draft, and renders `{main}` and
`{rail}` as opaque output. This is the same inversion `PagedList` uses to window
server children, applied to **state** instead of to windowing — and it is the
general answer whenever page-level interaction meets a page of static cards.

**Add to the checklist, under COMPONENTISE:**

```
  [ ] page-level state lifted into a client wrapper that takes server
      children as props — not by making the children client components
```

### Propagation is part of "wired", and revalidatePath has a scope

A write that lands in the database and does not reach the chrome is not finished.
Two things have to be right, and both were wrong here:

1. **`revalidatePath(path)` revalidates the PAGE segment only.** Anything rendered
   by the layout — a sidebar identity card, a top-bar account control — needs
   `revalidatePath(path, 'layout')`. A rename was landing correctly and showing
   the old name on every screen until a hard reload.
2. **The chrome has to read the same column the write wrote.** It read
   `platform_admins.display_name`; the rename writes `user_profiles.full_name`,
   deliberately. Revalidating harder would never have fixed it.

**Add to the checklist, under INTERACTION:**

```
  [ ] every surface that renders the changed value is revalidated —
      'layout' scope where the chrome shows it
  [ ] the readers behind those surfaces select the column the write wrote
```

### An action that writes nothing must not answer `ok`

`revokeSession` returned `void` and matched on id alone, so a stale id, a foreign
id and an already-revoked row were indistinguishable from success. The screen
refreshed, the row stayed, and nothing explained why.

This is the same defect as the fake save in §6 — *"never fake a save"* — arriving
from the other direction. The save was fake because it never called the server;
this one called the server and did not look at what came back.

The rule generalises: **a write that can affect zero rows must return the count,
and zero must not be success.** It also gates the audit row — recording
`session.revoked` for a revocation that revoked nothing puts a false event into
the one log a security review actually reads.

### `title=` is not a stated reason, and the component said so

`InertControl`'s own documentation reads: *"the reason is also rendered as text
beside or beneath the control by the caller. This component refuses to be the only
carrier."*

The profile was the caller that did not. Three security controls shipped greyed
out with their explanation reachable only by hovering a pointer, so a keyboard
reader, a touch reader and a screen-reader user each got a dead control and no
account of it.

§6 already recorded this from the queue's truncated reason. Two independent
instances of the same failure means the checklist item was too weak. It now reads:

```
  [ ] disabled controls state the reason as TEXT in the layout —
      title= is an addition to it, never the carrier
```
