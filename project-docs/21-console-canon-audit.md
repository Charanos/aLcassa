# 21 · Console canon audit

**Before the operations pages are revamped, the pages they would be modelled on
need fixing.** This document is the evidence for that sentence and the worklist
that follows from it.

Method: the console's twelve surfaces and their component folders were measured
against the rules the project already writes down — 03 (design system), 17
(density pass), 18 (surface refinement playbook) — rather than against taste.
Every figure below came from a scan of the tree, and the commands are given so
they can be re-run after the work.

---

## The finding that reorders the plan

Drift from the design system, per 100 lines of surface code. "Drift" counts
arbitrary type sizes (`text-[13px]`) and off-system radii together.

| Surface | Lines | `t-*` used | `text-[px]` | off-system radius | **drift / 100** |
| --- | ---: | ---: | ---: | ---: | ---: |
| tenants/[id] | 3,406 | 41 | 59 | 50 | **3.2** |
| plans | 1,205 | 16 | 27 | 8 | **2.9** |
| overview | 3,494 | 29 | 62 | 31 | **2.7** |
| tenants | 1,403 | 10 | 17 | 12 | **2.1** |
| revenue | 565 | 5 | 3 | 2 | 0.9 |
| profile | 2,777 | 25 | 16 | 9 | 0.9 |
| audit | 238 | 4 | 0 | 2 | 0.8 |
| ai-rules | 941 | 21 | 0 | 2 | 0.2 |
| health | 444 | 13 | 0 | 1 | 0.2 |
| admins | 459 | 9 | 0 | 0 | **0.0** |
| support-sessions | 492 | 11 | 0 | 0 | **0.0** |
| settings | 74 | 1 | 0 | 0 | **0.0** |

**The revamped pages are the least system-compliant code in the console, and
the un-revamped operations pages are the most.**

This is not a paradox and it is not an argument against the revamp. The
operations pages score zero because they are *thin* — a header, some panels,
a table. They have never needed a value the system does not already name. The
revamped pages earned their richness by reaching past the system roughly three
times per hundred lines.

The consequence for the plan is direct: replicating the revamped pages onto
`admins`, `health`, `support-sessions` and `audit` as they stand would carry
roughly 3 arbitrary values per 100 lines into about 1,600 lines of currently
clean code — call it fifty new off-system values, added deliberately, as the
*outcome of a quality pass*.

So the order in the request is right, and the data sharpens it: **fix the canon
first, then copy it.** Everything below is that fix.

---

## F1 · The radius scale is shadowed, and it holds by accident

Severity: **high** — silent, wide blast radius.

`tokens.css` defines the radius scale in a plain `:root` block:

```css
--radius-sm: 4px;   /* inputs, small controls */
--radius-md: 7px;   /* buttons, cards */
--radius-lg: 12px;  /* modals, panels */
```

Tailwind v4 defines variables **of the same three names** in `@layer theme`:

```
offset   3940  --radius-sm: 0.25rem      (4px)     @layer theme
offset   3966  --radius-md: 0.375rem     (6px)     @layer theme
offset   3993  --radius-lg: 0.5rem       (8px)     @layer theme
offset 160353  --radius-sm: 4px                    unlayered
offset 160373  --radius-md: 7px                    unlayered
offset 160393  --radius-lg: 12px                   unlayered
```

Both definitions ship in the bundle. The project's win — but only because
unlayered CSS outranks anything inside an `@layer`, which is a cascade rule
nobody wrote down and nothing enforces.

Two things follow.

**The utilities silently merged.** Because Tailwind generates `rounded-md` as
`border-radius: var(--radius-md)`, and that variable now resolves to the
project's value, these are all the same shape:

| Spelling | Resolves to | Usages |
| --- | ---: | ---: |
| `rounded-chip`, `rounded-sm` | 4px | 28 + — |
| `rounded-panel`, `rounded-md` | 7px | 46 + 19 |
| `rounded-overlay`, `rounded-lg`, `rounded-xl` | 12px | 18 + 64 + 31 |
| `rounded-2xl`, `rounded-[16px]` | 16px | 15 + 20 |
| `rounded-3xl`, `rounded-[24px]` | 24px | 2 + 9 |

Twelve pixels has **three interchangeable spellings and 113 usages**. A reader
cannot tell from the markup whether a 12px corner was a considered choice
(`rounded-overlay`) or a reflex (`rounded-lg`).

**And it is one refactor from breaking.** Move `tokens.css` into `@theme` or
wrap it in a layer — both reasonable, both things a future pass might do for
good reasons — and every `rounded-md` shifts 7px → 6px and every `rounded-lg`
shifts 12px → 8px, across 83 usages, with no error and no test.

**Fix.** Promote the radius scale into `@theme` so there is one definition;
delete the duplicate `:root` declarations; then codemod `rounded-md` →
`rounded-panel`, `rounded-lg`/`rounded-xl` → `rounded-overlay`, `rounded-sm` →
`rounded-chip`. Name `--radius-2xl`/`3xl` if 16px and 24px are real steps, or
retire them. A lint rule banning bare `rounded-[Npx]` in `src/components`
keeps it closed.

Re-run:

```bash
grep -rhoE "rounded-(\[[^]]+\]|[a-z0-9]+)" src/components/console "src/app/(platform)" --include=*.tsx | sort | uniq -c | sort -rn
```

---

## F2 · The type scale is used slightly more than half the time

Severity: **high** — the most visible inconsistency.

Across the console: **281** uses of the semantic scale (`t-body`, `t-caption`,
`t-label`, …) against **254** arbitrary `text-[Npx]` values. Near parity.

Sixteen distinct arbitrary sizes are in play, and nine of them sit inside a 4px
band — 10, 10.5, 11, 11.5, 12, 12.5, 13, 13.5, 14 — differences no reader can
perceive and no reviewer can defend.

Set against the defined steps (`--text-xs: 11px`, `--text-sm: 12.5px`,
`--text-base: 14px`), roughly 93 of the 254 are **exact restatements of a step
that already exists**:

| Arbitrary | Uses | Equals |
| --- | ---: | --- |
| `text-[11px]` | 75 | `--text-xs` → `t-label` / `t-chip` / `t-eyebrow` |
| `text-[14px]` | 18 | `--text-base` → `t-body` |
| `text-[12.5px]` | 10 | `--text-sm` → `t-compact` / `t-caption` |

The remaining ~161 are genuinely off-scale — `text-[13px]` (48 uses) is the
worst offender, sitting between `sm` and `base` and belonging to neither.

**Fix.** Codemod the 93 exact matches to their semantic class — that is pure
win, no judgement needed. Then take the ~161 off-scale values one surface at a
time and round each to the nearest step; anything that genuinely cannot round
is evidence the scale is missing a step, and the scale should gain it rather
than the component keeping its escape hatch.

Re-run:

```bash
grep -rhoE 'text-\[[0-9.]+px\]' src/components/console "src/app/(platform)" --include=*.tsx | sort | uniq -c | sort -rn
```

---

## F3 · Three folders for one layer, two Badges, three dead files

Severity: **medium-high** — this is the "make the component lib robust" ask.

The shared layer is spread across `primitives/`, `feedback/` and `ui/`:

```
primitives/   19 files   the real library
feedback/      4 files   Badge, Stat, StatusBadge, StatusDot
ui/            1 file    StatusBadge
```

- **Two `Badge` components with different APIs, both live.**
  `primitives/Badge` exports `BadgeIntent` (6 values) and has **1** importer.
  `feedback/Badge` exports `BadgeTone` plus four domain tone maps
  (`TENANT_STATUS_TONE`, `SUBSCRIPTION_STATUS_TONE`, `CREDENTIAL_STATUS_TONE`,
  `MEMBER_STATUS_TONE`) and has **8**. A new page has to know which Badge is
  the real one, and nothing in either file says.
- **`feedback/StatusBadge.tsx` is a one-line re-export shim** pointing at
  `ui/StatusBadge.tsx`, with **zero** importers. A migration aid whose
  migration finished.
- **`feedback/Stat.tsx` and `feedback/StatusDot.tsx` have zero importers.**

**Fix.** `feedback/Badge` wins on merit and on usage — move it to
`primitives/Badge`, absorbing the one `BadgeIntent` caller. Move
`ui/StatusBadge` to `primitives/`. Delete the shim, `Stat` and `StatusDot`.
Retire the `feedback/` and `ui/` directories so there is one answer to "where
does a shared component live". The domain tone maps belong beside the badge
that consumes them, which is where they already are — keep that.

---

## F4 · The weight ceiling is broken in five places

Severity: **medium** — small, exact, and on a revamped page.

03 §5 sets the ceiling at 500. Five violations, all in console components:

```
console/overview/QueueAction.tsx:113        fontWeight: 600
console/overview/QueueAction.tsx:254        fontWeight: 600
console/ProvisionWorkspaceButton.tsx:19     fontWeight: 600
console/WorkspaceTable.tsx:536              fontWeight: 700
console/WorkspaceTable.tsx:969              fontWeight: 600
```

`WorkspaceTable` is the Tenants page — inside the revamped set. A 700 there is
two steps past a ceiling the rest of the console holds, which is exactly the
kind of thing that reads as "louder" rather than as "wrong" and therefore
survives review.

**Fix.** Drop all five to 500. If a row genuinely needs more emphasis, it comes
from colour or from the `--text-*` step, not from weight — that is what the
ceiling is for.

---

## F5 · Skeletons that do not resemble their pages

Severity: **medium** — and it is concentrated exactly on the pages next in line.

03 §15 requires skeletons with "identical dimensions to the real thing".
Skeleton lines against page lines:

| Surface | Page | Skeleton | Ratio |
| --- | ---: | ---: | ---: |
| profile | 61 | 28 | 0.46 |
| tenants | 94 | 36 | 0.38 |
| settings | 74 | 24 | 0.32 |
| ai-rules | 128 | 37 | 0.29 |
| tenants/[id] | 233 | 47 | 0.20 |
| revenue | 406 | 57 | 0.14 |
| overview | 461 | 58 | 0.13 |
| audit | 122 | 15 | 0.12 |
| **health** | 444 | 28 | **0.06** |
| **support-sessions** | 281 | 15 | **0.05** |
| **admins** | 459 | 15 | **0.03** |

A 15-line skeleton in front of a 459-line page is not a skeleton, it is a
placeholder — the layout jumps when the content lands, which is the specific
failure 03 §15 exists to prevent.

**Fix.** These three are on the revamp list anyway. Build each skeleton from
the finished page's own panel structure, in the same commit.

---

## F6 · A docblock describing machinery that is not there

Severity: **low** — but it matters in this codebase specifically.

`components/tenant/VolumeChart.tsx:21` states that colours are "re-resolved
behind a `MutationObserver` on `data-theme`". There is no `MutationObserver` in
the file, and nothing anywhere in `src` writes `data-theme` — the product is
deliberately single-theme (`tokens.css:198`). `console/Charts.tsx:30` documents
the same observer being *removed* for that reason, so the two files carry
opposite accounts of the same decision.

In a codebase whose whole discipline is that the comment carries the *why*, a
comment describing absent machinery is the same class of defect as an invented
figure on a dashboard: it is confidently wrong, and the next reader has no
reason to doubt it.

**Fix.** Correct the `VolumeChart` docblock to match `Charts.tsx`.

---

## What is already sound — do not disturb it

Worth stating, because a revamp that "improves" these would be a regression.

- **The page shell is universally adopted.** All twelve surfaces import from
  `console/Surface.tsx` — `ConsolePage`, `ConsoleHeader`, `SectionHeading`,
  `Panel`, `FactRow`, `InertControl`, `ReasonNote`. There is no second way to
  build a console page, and the operations pages already use it correctly. The
  canon's *structure* is done; only its *interior* drifted.
- **17 §6.4 holds everywhere.** Every console file containing disabled controls
  also carries a stated reason. No exceptions found.
- **Charts resolve tokens before handing them to Recharts**, with a labelled
  fallback — the right fix for `var()` in SVG presentation attributes, properly
  explained.
- **No raw hex survives in console components.** Every apparent hit is inside a
  comment documenting a hex that *was* removed.
- **No purple, violet or indigo.** The `#c084fc` that scanning turns up is in a
  comment recording its own deletion.
- **The `admins` page is a model of restraint** — no pagination, no search, no
  bulk action, on the stated grounds that every affordance making a long list
  bearable also makes a long list acceptable. Its revamp should raise its
  visual investment without touching that argument.

---

## Worklist

**Stage 1 — close the canon (before any operations page is touched)**

1. F1 · radius: promote to `@theme`, delete the duplicate `:root` block,
   codemod the three spellings of 12px and two of 7px, add the lint rule.
2. F2a · type: codemod the ~93 arbitrary values that exactly restate an
   existing step. Mechanical, no judgement.
3. F3 · component library: consolidate to `primitives/`, delete the three dead
   files, retire `feedback/` and `ui/`.
4. F4 · weight: five edits.
5. F6 · one docblock.

**Stage 2 — finish the revamped pages against the closed canon**

6. F2b · the ~161 off-scale type values, surface by surface, heaviest first:
   `tenants/[id]` (59), `overview` (62), `plans` (27), `tenants` (17).
   Where a value cannot round, add the step to the scale.
7. F5 · skeleton parity for `revenue` and `overview`, whose ratios are low for
   their size.

**Stage 3 — the operations pages**

8. `admins`, `health`, `support-sessions`, `audit` — visual investment to match
   the revamped set: a dedicated component folder each where the content earns
   one, band components for the figures, and a skeleton built from the finished
   panel structure rather than a placeholder.

Stages 1 and 2 are why stage 3 will hold. Done in the other order, the drift in
the table at the top of this document doubles.

---

## Outcome · 29 September 2026

Every item on the worklist is done. The measurements below were re-run with the
same commands given above.

### The canon is closed

| | Before | After |
| --- | ---: | ---: |
| Distinct radius spellings | 23 | **8**, all named |
| Arbitrary radii in the console | ~200 | **0** |
| Arbitrary type sizes in the console | 254 | **0** |
| Distinct arbitrary type sizes | 16 | **0** |
| Weight-ceiling violations | 5 | **0** |
| Shared-component directories | 3 | **1** |
| Dead component files | 3 | **0** |

**F1 — the radius collision.** The scale was renamed to `--radius-control`,
`--radius-surface`, `--radius-modal` so it no longer shadows Tailwind's
`--radius-sm/md/lg`, and `globals.css` maps it onto the utilities deliberately
through `@theme`. Two steps that existed in the markup but not in the scale
were named (`--radius-bar` 2px for chart caps, `--radius-slab` 32px for
marketing), and 326 class occurrences were codemodded onto the eight semantic
names. Every mapping preserved the pixel value that shipped, so nothing moved.

**F2 — the type scale.** Same collision, same fix: the size steps are now
`--type-badge` … `--type-hero` and are bridged onto `text-*` intentionally
rather than winning by an unlayered-cascade accident. 517 arbitrary sizes were
mapped — the exact restatements to their step, the off-scale ones rounded to
the nearest (nothing moved more than 1.5px). Three steps the scale genuinely
lacked were added (9px, 10px, 42px), and the landing hero's four-size
breakpoint ladder became one fluid clamp.

**F3 — the component library.** `feedback/` and `ui/` are gone. `StatusBadge`
and `Badge` both live in `primitives/`, and the header of `Badge` now states
the rule for choosing between them: `StatusBadge` takes a semantic tone,
`Badge` takes a domain state and owns the state→tone maps. The third badge —
same six semantic intents, one importer — was retired, along with three files
that had no importers at all.

**F4, F6** — five weight violations dropped to 500; the `VolumeChart` docblock
now matches the code and agrees with `Charts.tsx`.

**And the rules that keep it closed.** Three `no-restricted-syntax` rules on
`src/components` and `src/app` fail the build on an arbitrary radius, an
arbitrary type size, or a font weight above 500 — each with a message naming
the replacement and pointing at the token file. The bracket is now the thing
that fails, because reaching for a bracket being faster than opening
`tokens.css` is the whole mechanism by which the scale acquired 23 spellings.

### The operations pages

**Skeleton fidelity**, the measure that separated the two sets:

| Surface | Before | After |
| --- | ---: | ---: |
| audit | 0.12 | **1.17** |
| support-sessions | 0.05 | **0.56** |
| health | 0.06 | **0.32** |
| admins | 0.03 | **0.29** |

Each is now built from its page's real structure rather than from generic
rows — the audit stream's toolbar and its 2.4/1 and 1.6/1 band splits, health's
`auto-fit minmax(190px)` service track and thirty-bar uptime strips, the
admin matrix's fixed 58px role columns, and the support history's
table-above-`md` / cards-below split rendered behind the same breakpoints the
page uses.

**Audit gained a band.** `VolumeBand` answers "how much, and of what kind"; it
cannot answer "by whom", and a thirty-day total reads identically whether four
operators produced it or one operator produced 97% of it. `ActorBand` states
the concentration as a figure rather than leaving it to the eye, alongside the
count of actions carrying a stated reason and the number of distinct requests.
It derives entirely from entries the page has already loaded — no second query,
and nothing that can disagree with the stream beneath it.

**Health moved onto the canon.** Its six service cards carried a flat glyph on
a tinted square, the one place in the console still doing that; they now use
`IconTile`, toned by the service's own worst day. Eight raw pixel sizes in
`font:` shorthands became named steps.

### What was deliberately not done

- **`overview` and `plans` skeletons remain at 0.13 and 0.10.** Both pages are
  dominated by charts whose skeletons are correctly a single sized block, so
  the line ratio understates their fidelity. Worth re-reading by eye rather
  than by number before spending more on them.
- **`primitives/Badge` was not rewritten to delegate to `StatusBadge`.** It is
  the right end state — one presentation primitive, one domain wrapper — but it
  is a behavioural refactor of a component on eight surfaces, and it belongs in
  its own pass with its own review rather than inside a consistency sweep.

---

## Errata · 30 September 2026

Two things this document got wrong, found while rebuilding the health page.

**F6 was a false finding.** The `VolumeChart` docblock that F6 called
"describing machinery that is not there" was describing the *design
reference's* `charts.jsx`, which does re-resolve tokens behind a
`MutationObserver` — and was explaining why this file does not need one. It was
accurate. The "fix" spliced new text into the middle of its sentence and left
it ungrammatical. The original wording is restored.

**The type codemod broke four chart axes.** F2's codemod replaced literal
`fontSize: 11` with `'var(--type-chip)'` everywhere, including inside Recharts
`tick` props — which Recharts writes onto `<text>` as SVG presentation
attributes, where `var()` is not reliably resolved. The header of
`console/Charts.tsx` already documented exactly this for colours. Those axes
fell back to their inherited size. Tick typography now comes through the same
`useTokens()` resolver the colours use, and a lint rule rejects `var()` inside
a `tick` or `label` prop, with a message saying why.

The lint rule that drove the codemod carried part of the blame: its message
said "use `var(--type-*)`", full stop — correct for CSS, wrong for an SVG
attribute. A rule that only says what not to write teaches the nearest
alternative whether or not it works in context. Its message now names both
cases.

One more gap in the same rules: `value.value=/regex/` in an esquery selector
only tests strings, so numeric `fontSize: 11` and `borderRadius: 8` were never
caught. Both forms are covered now; three instances that had slipped through
were fixed.
