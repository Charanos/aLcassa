# 15 · Specification delta

**Purpose:** every place the code deliberately differs from a document in this
set, with the reason and the decision that resolved it.

`11 §10` says a specification that drifts from the codebase is worse than none,
because it produces confident wrong decisions, and that on this engagement the
documentation is a contracted deliverable with an acceptance test. This file is
how that rule is kept: a delta is recorded the day it is found, not at handover.

**Status of this document:** open. Add to it rather than editing history.

---

## 1. The two sets, and which wins

Two authorities were produced for the visual system and they disagree on values:

| | `03-design-system.md` | The design sheets |
|---|---|---|
| Issued | 3 August 2026 | 4 August 2026, revision 3.1 |
| Contrast ratios | asserted | measured, per pair, both themes |
| Declares itself | "the authority on every visual decision" | "for review" |

**Decision, taken at foundation: the sheets win on VALUES, document 03 wins on
RULES and semantics.** The sheets are later, they carry measured ratios against
the specific surface each pair sits on, and they were produced as the handoff
artefact. Document 03 remains the authority on what a hue means, what may carry
hierarchy, and what may not ship.

`src/app/tokens.css` therefore carries the sheets' values under document 03's
semantic alias names, so both documents remain usable against one file.

### The value differences

| Token | Doc 03 | Sheets, and what shipped | Note |
|---|---|---|---|
| Page ground | `#FBFAF7` | `#FBF9F5` | |
| Panel | `#FFFFFF` | `#F4F0E8` | The sheets raise the panel with a tint rather than dropping it to white, which is the "depth is a tint" law |
| Copper, primary fill | `#A54B17` | `#A6572A` | |
| Copper, text on light | `#8A3E12` | `#8A4A1E`, 5.62:1 | |
| Radius, chips and buttons | 2px | 4px | |
| Radius, panels | 3px | 6px | |
| Radius, overlays | 6px | 8px | |
| Space, smallest step | 4px | 2px | The sheets add a hairline step below the 4px base |
| Row height, comfortable | 40px | 56px | |
| Row height, compact | 32px | 44px | The sheets' compact row equals doc 03's touch-target floor, which resolves a conflict doc 03 had with its own §17 |
| Control heights | not specified | 32 / 36 / 44px | |
| Motion, longest | 280ms | 200ms | Excluding the 1200ms skeleton pulse |
| Type scale | 14 tokens, rem, fluid | 14 tokens, px, fixed | Same count, different names. A console needs predictability more than it needs fluidity |

Nothing in the six-hue semantic mapping changed. That is document 03 §3 and it
is intact.

---

## 2. Deltas resolved against the documents

### D1 · Support mode is drawn twice

**Conflict.** Document `03 §8` and `06 §6` specify a boundary frame: a 3px
copper inset around the entire viewport, layout insetting to accommodate it, the
tenant name in a title block set into a break in the top edge, a live countdown,
and an exit control in the bottom edge. Document `03 §20` lists "dismissible
support-mode banner" as an anti-pattern.

Design sheets 04 and 07 instead draw a full-width, non-dismissible banner above
the tenant header, plus a session receipt panel naming the resolved `tenant_id`
and role.

**Resolution.** The frame is built, per documents 03 and 06, **and** the sheets'
session receipt is kept inside it. The frame is the stronger control: a banner
occupies the one strip of screen people learn to ignore, and the brief's own
requirement is that the active context is never ambiguous. The receipt is the
best thing the sheets added, because it makes the isolation claim legible on
screen rather than only in the policy reference.

**Where:** `src/components/domain/BoundaryFrame.tsx`.

### D2 · The sheets permit an italic; the documents forbid one

**Conflict.** Design sheet 02 states "400, italic in serif only" and reserves
italic for defined terms. Documents `03 §5` and `11 §6` rule 13 forbid italics
outright and require `font-synthesis: none`.

**Resolution.** The documents win. `font-synthesis: none` is set globally and no
italic face is imported, so the constraint is enforced by what is loaded rather
than by discipline. Emphasis is a family switch: `<em>` renders in the serif at
`font-style: normal`.

**Where:** `src/app/globals.css`.

### D3 · The theme could not be resolved the usual way

**Conflict.** `03 §19` requires the theme resolved server side so there is no
flash. The standard implementation is an inline script in `<head>` reading a
cookie. `04 §7` forbids `dangerouslySetInnerHTML` anywhere in Phase 1, and in
the App Router that is the only way to emit an inline script.

**Resolution.** The `Sec-CH-Prefers-Color-Scheme` client hint. The browser sends
the OS preference with the request, the server resolves it, and there is no
client-side correction to flash and no inline script to exempt from the CSP.

The one cost: on a browser's first ever request the hint has not been asked for
yet, so a `system` preference renders light for that one navigation. Light is
the ground the drafting sheet is drawn on, so it is the less jarring of the two.

**Where:** `src/lib/theme.ts`, `next.config.ts`.

### D4 · The credential prefix differs between the sets

**Conflict.** `02 §9` specifies `csk_live_` and `csk_test_`. Design sheet 03
draws `sk_live_`.

**Resolution.** `csk_` as documented. A two-character prefix that identifies the
platform is worth more than a saved character, and the sheets' value looks like
a well-known payment provider's.

**Where:** `src/db/schema/credentials.ts`, and the redaction pattern in
`src/lib/logger/redact.ts` matches both forms so neither can reach a log.

### D5 · The badge taxonomy is longer than the chip set

**Conflict.** `03 §14` maps roughly thirty domain states to badges. Design sheet
03 declares a closed set of six chips and says a seventh requires one to be
retired.

**Resolution.** Both, and they are not actually in conflict. The six chips are
the visual vocabulary; `03 §14` is the mapping from domain state onto it. The
mapping lives beside the component rather than at each call site, so a
"provisioning" badge cannot appear in slate on one screen and graphite on
another.

**Where:** `src/components/feedback/Badge.tsx`.

### D6 · Copy in the design sheets uses em dashes

**Conflict.** Sheet 04 draws the banner text "Viewing Acme Industrial — support
mode". `10 §1` rule 7 and `11 §6` rule 16 forbid em dashes in any copy.

**Resolution.** The copy deck wins. The frame's strings are those in `10 §11`.

### D8 · The 3px left rule on panels is removed

`03` uses a coloured left rule to mark a panel that carries state, and sheet 04
draws the same. In practice it did three jobs badly at once: it made every panel
read as a callout, so a page of them looked like a stack of warnings; it broke
the card's geometry, since the left padding no longer matched the other three
sides; and it put state at the extreme left edge, which is where the eye scans
last.

State now lives in the chip on the title line, which already carries a glyph and
a word and therefore survives colour blindness and a printed page. A panel with
a state gets a one-pixel accent along its TOP edge instead, directly above the
heading it qualifies. Most panels get no accent at all.

### D9 · The light surface ramp is inverted, and the tertiary ink is lifted

Sheet 01 raises a panel by going DARKER than the page, `#F4F0E8` on `#FBF9F5`.
Internally consistent, and on a page of cards it read as a page of holes. A
panel now goes LIGHTER than the page, `#FFFEFB`, which is what a card on a
drafting sheet does under a light. `sunken` stays below the page, so the result
is a genuine three-step ramp rather than two steps in one direction. The dark
theme already worked this way and is unchanged.

The tertiary and faint ink steps are lifted in both themes: tertiary now clears
6:1 rather than sitting on the measured 4.58:1 floor. On a reading surface that
step carries information (a source line, a milestone week, a file path), and
4.5:1 is a floor for a body of text rather than a target for 13px metadata.

A whisper of elevation is added for cards on the tracker, `--shadow-card`. On a
warm near-white ground a lighter fill can only ever be a 1.04:1 step, so the
hairline plus a soft contact shadow does the rest. This went through three
revisions before landing, and the sequence is worth keeping because each one
was rejected by review for a specific, nameable reason:

1. A hairline top rule in a state's hue. Read as a stray line touching
   nothing, an applied mark rather than a property of the card.
2. A radial wash bleeding from the top corner plus a short blurred segment.
   Same complaint restated in a softer material: still a decoration drawn ON
   the card.
3. **Coloured neumorphism, the version that shipped.** No mark of any kind.
   A toned panel's ambient shadow pair, the soft light on its near lip and the
   soft shade falling away from it, is mixed from `--{tone}-ink` at 8 percent
   rather than from neutral graphite, using `color-mix()` so nothing extra is
   drawn and the shadow simply glows the colour of the state it names. State
   is still named exactly, on the chip on the title line; the colour on the
   card is atmosphere confirming what the chip already said, per `03 §3` rule
   3, never the only carrier of it.

**Extremely soft is a deliberate constraint, not a first pass to be turned
up.** The tone mix sits at 8 percent specifically so a reader could not name
the hue if asked, and six of these in a row still read as belonging to the
same page rather than as six different colours competing for attention. A
neumorphic shadow that is legible as "coloured" on inspection but invisible as
a decision on a normal read is the target register; anything louder starts
reading as a highlight rather than as light.

`src/components/presentation/Sheet.tsx`, the `toneShadow` function.

### D11 · Nested content blocks go lighter, never darker

A block nested inside a card, such as the "in place" and "outstanding" pair on
the compliance register, defaults toward `--surface-sunken`, the way a field is
sunk. That default is wrong here. A field is sunk because it RECEIVES INPUT and
a well is the correct affordance for that; a fact block receives nothing, and
stacking two dark steps, page darker than card darker than sunken block, reads
as the content being buried rather than organised.

In a coloured-neumorphic system depth comes from layers of LIGHT, not layers of
shade, so a block one level further from the page goes one step CLOSER to the
light source instead: `--surface-well`, pure white in light and a touch lighter
than `--surface-raised` in dark, carrying its own small soft lift,
`--shadow-well`, scaled down from the card shadow rather than a border doing
the separating.

`src/components/presentation/Sheet.tsx`, the `Well` component.

### D10 · Tables destructure into cards below `md`

`03 §12` puts the data grid in a horizontally scrolling container. That is right
for the console at 1440 and wrong for a page read on a phone: the row labels
leave the screen, the reader loses which column they are in, and the gesture
fights page scroll. The tracker's tables render as a real `<table>` above `md`
and as one card per row below it, with the column name as the term and the cell
as the definition. Same data, one source, two honest presentations, and neither
scrolls sideways. `src/components/presentation/DataList.tsx`.

### D7 · AI rules precedence is recommended differently by each set

**Conflict.** `01 D-08` recommends the layered model, where master rules carry a
per-field lock. Design sheet 14 records the recommendation as "master wins on
conflict".

**Resolution.** ⚠ **Unresolved, and blocking.** This is the client's decision and
it is due in week one, because the two models produce different tables.

The schema ships with `lockedFields` on the master version row, which is the
layered model's requirement. If the client chooses "master wins", that column is
simply unused and costs nothing. The reverse is not true: choosing layered after
the schema locks is a migration in week seven.

The recommendation put to the client is **layered**, on the grounds in `01 D-08`.

**Where:** `src/db/schema/airules.ts`.

### D12 · A pie chart, deliberately, against the `dataviz` skill's default

The chart guidance this project follows recommends against a pie chart as a
default. The readiness breakdown on the foundation explorer (built,
scaffolded, planned) is one now, drawn as a donut with the total in the hole.
The set is fixed at exactly three items, the reader's actual question is
"what share of the whole is each", which a pie answers more directly than a
bar does, and the guard rails stay on: a direct label, a percentage and a
legend row per segment, plus the system's own hatch fill standing in for
"planned" rather than a fourth colour. `src/components/presentation/Charts.tsx`,
`ProportionDonut`.

### D13 · Milestone progress is a line, not a bar

Areas and milestones are both "categories" in the loose sense, and the
foundation-by-area chart stays a horizontal bar for that reason. Milestones are
different: M0 genuinely precedes M1, which precedes M2, each a dependency of
the next, which is the definition of an ordered axis rather than a set. A line
is the form for change across an ordered axis; a bar is the form for magnitude
across an unordered one. `ProgressLine` in the same file.

### D14 · One width, shared by every reading surface

The marketing page, the tracker and the document viewer each carried their own
hardcoded page width, 1100px, 1240px and 1180px respectively, which is how
three pages meant to read as one product ended up visibly disagreeing about
how wide a page is. `--surface-width: 1240px` in `tokens.css` is now the one
number all three read, so the question cannot recur by a future page picking
its own value again.

### D15 · A schematic on the marketing hero, not a screenshot

03 §20 forbids a mock inbox behind a "coming soon" overlay, but that rule
targets the placeholder surfaces, a designed screen pretending a feature exists
that does not. The marketing hero now carries a technical illustration instead:
four channel nodes, not yet connected, converging through a single line into a
workspace node that is real. It is drawn in the same rule-and-panel vocabulary
as everything else, self-contained SVG and HTML rather than an image asset, and
it says the same thing the copy already says, honestly, rather than implying a
working inbox. `src/components/marketing/HeroDiagram.tsx`.

---

## 3. Additions not in either set

### A1 · `app.tenant_is_writable()` and the suspension predicate

`06 §8` describes suspension as read-only and notes it should be "in a helper
function so it is one place rather than eighteen". That helper is
`app.tenant_is_writable()` in `src/db/policies/00_context.sql`, and every modify
policy calls it through `app.can_write_settings()` or `app.can_write_as_owner()`.

⚠ This encodes the **recommended** answer to `01 §9` question 4. The client
confirms before M1. If the answer is "blocked" rather than "read-only", one
function changes and nothing else does.

### A2 · `force row level security` on every table

Not stated in `05 §2`. Without `force`, the table **owner** bypasses every
policy, and in a Supabase project the owner is a role migrations run as. It is
the difference between a policy that applies to everyone and one that applies to
everyone except the connection most likely to be misused. `check-policies.ts`
asserts it.

### A3 · The project tracker at `/project-tracker`

A permanent client-facing surface, not in any document because no document
anticipated one. It carries delivery status, the update feed, the milestone
tracker, the compliance register, the documentation set and the design set. `/`
is the marketing page from `02 §2`, unchanged.

The surface deliberately omits document 01, which declares itself an internal
working document, and the commercial terms, which belong in the signed brief
rather than on a shared link. Both are filtered by an explicit flag in
`src/lib/presentation/documents.ts` AND refused at their URL, because a filter
that only hides a link is not a control.

Two fields in `engagement.ts` are the tracker: `status` and `progress` per
milestone. Everything else in that file is contract and does not move.

### A4 · GSAP and scroll-triggered motion, on the tracker only

`03 §7` and `11 §6` rule 20 forbid GSAP, scroll-triggered animation and
counting-up numbers. The tracker uses all three. `/`, `/app` and `/platform`
do not, and that boundary is the whole justification: the product is seen a
hundred times a day and anything that animates on arrival becomes a tax by
Wednesday, whereas the tracker is read a handful of times by someone deciding
whether to sign something.

**The rule that came out of getting this wrong first:** content is never hidden
by CSS and left waiting for script to reveal it. The first implementation put
`opacity: 0` on every revealed element and let ScrollTrigger bring them in; a
CSP mistake killed every bundle and the client saw a page of headings with
nothing underneath. The reveal is now additive, only elements currently below
the fold are hidden, and a watchdog restores anything still hidden after 2.5
seconds. `src/components/presentation/TrackerMotion.tsx` carries the reasoning.

### A5 · The CSP needed the nonce on the request, and dev needs `unsafe-eval`

Next discovers the nonce to stamp on its own script tags by reading the
`Content-Security-Policy` header off the REQUEST. Setting it only on the
response produced a page whose policy demanded a nonce and whose scripts had
none, so `strict-dynamic` blocked every bundle: 200 response, correct markup,
completely dead page. The dev bundler additionally evaluates modules as strings,
so development carries `unsafe-eval` and production does not. `src/middleware.ts`.

### A7 · The access screens' aside carries a trust list, not just prose

`02 §3` specifies the routes and `10 §3` specifies the copy; neither speaks to
the aside's visual density. The first pass put a mark, two paragraphs and an
address in a plain sunken column, which read as a placeholder rather than a
finished screen once the tracker and the marketing hero had already set a
higher bar. The aside now carries a properly sized mark and wordmark, a small
reference to the actual design sheet the screen is drawn from ("Sheet 08 ·
Access"), a short scannable trust list in place of the second paragraph of
prose, a whisper of the system's own hatch texture, and a title-block footer
in place of a bare address line.

Deliberately scoped to the aside only. The form column, the fields themselves,
was reviewed and found already correct, so it is untouched: no card wrapper,
no leading icons, nothing that was not there before. Where a change earns its
place and where it does not are two different questions, and this is a record
of asking both. `src/components/access/AuthShell.tsx`.

### A6 · The palette cannot carry six categorical chart series

Running the six-check validator over the six hues as a chart palette fails, and
not marginally: copper against ochre is ΔE 6.8 to normal vision and 1.5 under
deuteranopia. They are adjacent warm hues chosen so a row of status chips does
not vibrate, and that restraint makes them unusable as neighbouring series.

Rather than invent chart-only hues and give the product a second palette, the
charts use forms that do not need categorical colour: magnitude by category with
the category on the axis and ONE hue, and direct labels on every value. Identity
never rests on colour, which `03 §3` rule 3 already required. The passing
three-hue order, where one is needed, is slate → oxide → verdigris. Never copper
adjacent to ochre.

---

## 4. Open items carried forward

| # | Item | Due | Blocks |
|---|---|---|---|
| 1 | AI rules precedence, master versus layered | Week 1 | M4a and the schema. See D7 |
| 2 | Support role matrix, signed | Design lock | M4, and the isolation suite's support cases |
| 3 | Embedding model Phase 2 will use | Week 1 | The knowledge base seam |
| 4 | What suspension means | Before M1 | Every modify policy. See A1 |
| 5 | Plan tiers with limits | Week 4 | M3 |
| 6 | Product name and brand assets | Design lock | Nothing. The placeholder mark ships |
| 7 | Owner email unique across the platform? | Design lock | The membership model and `user_profiles` policy |
| 8 | Credentials per-tenant or per-integration | Design lock | A column now, a migration later |
