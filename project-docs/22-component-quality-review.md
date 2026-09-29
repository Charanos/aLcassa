# 22 · Component quality review — the plan

Doc 21 closed the **token** layer: one radius scale, one type scale, both
enforced. This is the plan for the layer above it — the components themselves.

It is a plan rather than a pass because the work here is *behavioural*. Doc 21
could codemod 843 occurrences and guarantee nothing moved, because every
mapping preserved the value that shipped. Nothing below has that property. Each
item changes what a component renders, on surfaces that are already reviewed,
so each needs its own before/after rather than a sweep.

Ordered by what it costs to leave undone, not by size.

---

## Why doc 21's "zero arbitrary values" was half true

Worth stating first, because it is the reason this document exists at all.

The lint rules from doc 21 matched **Tailwind class literals** — `text-[13px]`,
`rounded-[8px]`. They did not match the same values written as inline style
properties, and there were 178 of those:

| Form | Count |
| --- | ---: |
| `font: '500 12px/1 …'` shorthand | 127 |
| `fontSize: '13px'` / `fontSize: 13` | 44 |
| `borderRadius: '8px'` / `borderRadius: 8` | 7 |

All 178 are now on the scale and the rules cover all three forms. But the
lesson generalises past this instance: **a rule that matches one spelling of a
value certifies one spelling of a value.** Every check in this plan should be
written against the thing being asserted, not against the syntax it usually
takes.

---

## 1 · `Badge` should delegate to `StatusBadge`

The item that prompted this document.

**Now.** Both live in `primitives/`. `StatusBadge` takes a semantic tone —
success, warning, danger, info, brand, neutral — across three variants and two
sizes, and resolves them through the `--badge-*` tokens. `Badge` takes a domain
state — `active`, `trialing`, `nearLimit`, `pastDue`, `archived`, `support` —
and renders it **independently**: its own `TONES` table of ink, tint, rule and
glyph, its own `h-5 … rounded-chip border px-2`, its own icon at 12px.

**The problem is not duplication, it is divergence.** Two components draw a
chip, and only one of them is reached when somebody adjusts chip geometry.
`StatusBadge` already gained `variant` and `size` props; `Badge` has neither
and cannot, without a second implementation of each. A row of workspace status
chips and a row of semantic badges on the same screen are two components'
opinions about the same shape.

**The fix.** `Badge` keeps its entire public surface — `tone`, the default
word, the four `*_STATUS_TONE` maps — and stops drawing. It maps its domain
state to a `StatusBadge` tone plus an icon, and renders `StatusBadge`. One
presentation primitive, one domain wrapper, and the domain knowledge stays
exactly where it is useful.

**Why it is not a codemod.** The two do not currently render identically —
different heights, different border treatment, different icon size — so this
changes the appearance of every workspace, subscription, credential and member
chip in the product. That is the right change and it needs to be *seen*, on the
tenants table and the workspace drawer, before it lands.

**Also decide during this work:** whether `support` survives the merge intact.
It is the only state rendered in copper and the only chip that appears outside
a table, and `StatusBadge`'s six tones do not include it. Either it becomes a
seventh tone with a stated reason, or `Badge` keeps a documented escape for
exactly one state.

---

## 2 · Three `Figure` components, three different prop sets

`VolumeBand`, `MovementBand` and `ActorBand` each declare a local `Figure` — a
label, a right-aligned numeric, an optional note, on a hairline-separated row.
They are the same component and they have already drifted:

```
ActorBand      { label, value, note }
VolumeBand     { label, value, note, tone }
MovementBand   { label, value, note, tone, strong }
```

**I added the third one**, deliberately matching the other two by hand, which
is precisely the mechanism by which the first two stopped matching each other.
Three files is where this becomes visible; the fourth band would have made it
permanent.

**The fix.** `primitives/Figure.tsx`, with the union of the three prop sets —
`tone` and `strong` both already have real call sites. Then delete the three
locals. Low risk: the markup is nearly identical already, so the diff is a
short list of pixel reconciliations rather than a redesign.

**The same question for `Field` and `Row`**, which are each declared locally in
more than one console file. Check before extracting — a `Field` in a settings
form and a `Field` in a dialog may genuinely be different things, and merging
two components that merely share a name is worse than leaving them apart.

---

## 3 · Dead and near-dead primitives

| Primitive | Lines | Importers |
| --- | ---: | ---: |
| `Spinner` | 45 | **0** |
| `IconPill` | 86 | **0** |
| `ErrorBoundary` | 89 | **0** |
| `IconButton` | 47 | 1 |
| `FlashToasts` | 59 | 1 |
| `FilterBar` | 249 | 1 |

The three zero-importer files go, unless `ErrorBoundary` is deliberately held
for a route that has not been written — in which case it needs a line saying
so, because "kept for later" and "forgotten" are indistinguishable from the
outside. This is the same finding doc 21 made about `feedback/Stat` and
`feedback/StatusDot`, and it will keep recurring until removal is part of
finishing a refactor rather than a separate pass.

`FilterBar` at 249 lines for one caller is the interesting one: either it is
over-built for its single use, or it is under-adopted and three surfaces are
hand-rolling filters it already solves. Answer that before touching it.

---

## 4 · `ConfirmDialog` against `ConsoleDialog`

`ConsoleDialog` (366 lines, 5 importers) is the console's modal shell, extracted
because four dialogs had become four approximations of one. `ConfirmDialog`
(217 lines, 7 importers) predates it and still draws its own.

**Check first, then decide.** If `ConfirmDialog` is `ConsoleDialog` with a
fixed action pair and a consequence line, it should be a thin wrapper — the
same relationship proposed for `Badge` and `StatusBadge`. If it carries a
genuinely different interaction (a typed confirmation, a countdown, a
destructive hold), it stays, and both files get a header sentence saying which
to reach for. The failure to avoid is the one doc 21 found with three badges:
two components, no stated rule, and authors picking whichever they saw first.

---

## 5 · Three tile components

`IconTile` (10 importers), `InitialsTile` (3), `Avatar` (2). All three render a
small square-ish mark on a raised surface. `InitialsTile`'s own header says it
uses "the same raised surface `IconTile` uses" — which is either shared code or
a coincidence maintained by hand, and it is currently the second.

**The likely shape:** one `Tile` owning the surface treatment — gradient,
hairline, shadow, the `sm`/`md`/`lg` sizes — with `IconTile`, `InitialsTile`
and `Avatar` as three thin faces over it. Confirm the treatments really are
identical before merging; if they are not, the divergence is either a bug or a
decision, and either way it should be written down.

---

## 6 · Skeletons belong beside their components

Established during doc 21's work and worth making the rule.

Overview's `loading.tsx` scored 0.13 on lines-against-page and looked like the
worst skeleton in the console. It was one of the best: almost every shape is
owned by the component it stands in for — `QueueSkeleton`, `PortfolioBandSkeleton`,
`LastActionsSkeleton` — and imported. **The metric punished the better
architecture.** Reading it by eye instead found the two things actually wrong:
the opening slab was drawn as four small tiles when the page renders a
full-bleed inverse-chrome section, and `RevenueBand` had no skeleton at all, so
the page grew by a band on every load despite a comment explaining that the
lower-band skeletons existed to stop exactly that.

Both are fixed, and `HeadroomBand` gained one too — it was being drawn as three
hardcoded columns where the page uses `auto-fit, minmax(280px, 1fr)`, agreeing
at wide desktop and at no other width.

**The rule:** a component that renders a distinct shape exports its own
skeleton, next to itself. A skeleton written a directory away is one edit from
being wrong and nothing catches it. `loading.tsx` composes; it does not draw.

**Remaining:** `tenants/[id]`, `revenue` and `ai-rules` have not been read this
way. Read them, do not measure them.

---

## 7 · What would make this last

Doc 21's rules hold the token layer because a violation is *syntactically*
detectable. Nothing above is. A second `Figure`, a third dialog, a component
that stops being imported — none of it trips a linter.

Three cheap checks that would:

- **A dead-export check.** `scripts/check-orphans.ts`: every file in
  `primitives/` with zero importers fails, with an allowlist that requires a
  reason string. Would have caught `Spinner`, `IconPill`, `ErrorBoundary`, and
  the three `feedback/` files before they became a finding.
- **A duplicate-name check.** Two files exporting the same component name in
  different directories fails. Would have caught three `Badge`s and two
  `StatusBadge`s on the day the second one appeared.
- **A local-component census**, reported not enforced: the same
  `function <Name>(` declared in three or more files under `src/components` is
  printed at the end of `pnpm verify`. That is how `Figure` would have
  surfaced at two, rather than at three with drifted props.

None of these blocks a merge on a judgement call. Each of them makes a fact
visible that is currently only discoverable by someone going looking — which
is how all of this was found, and is not a plan.
