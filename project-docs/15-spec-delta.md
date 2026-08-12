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

|                 | `03-design-system.md`                    | The design sheets               |
| --------------- | ---------------------------------------- | ------------------------------- |
| Issued          | 3 August 2026                            | 4 August 2026, revision 3.1     |
| Contrast ratios | asserted                                 | measured, per pair, both themes |
| Declares itself | "the authority on every visual decision" | "for review"                    |

**Decision, taken at foundation: the sheets win on VALUES, document 03 wins on
RULES and semantics.** The sheets are later, they carry measured ratios against
the specific surface each pair sits on, and they were produced as the handoff
artefact. Document 03 remains the authority on what a hue means, what may carry
hierarchy, and what may not ship.

`src/app/tokens.css` therefore carries the sheets' values under document 03's
semantic alias names, so both documents remain usable against one file.

### The value differences

| Token                     | Doc 03                | Sheets, and what shipped | Note                                                                                                              |
| ------------------------- | --------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| Page ground               | `#FBFAF7`             | `#FBF9F5`                |                                                                                                                   |
| Panel                     | `#FFFFFF`             | `#F4F0E8`                | The sheets raise the panel with a tint rather than dropping it to white, which is the "depth is a tint" law       |
| Copper, primary fill      | `#A54B17`             | `#A6572A`                |                                                                                                                   |
| Copper, text on light     | `#8A3E12`             | `#8A4A1E`, 5.62:1        |                                                                                                                   |
| Radius, chips and buttons | 2px                   | 4px                      |                                                                                                                   |
| Radius, panels            | 3px                   | 6px                      |                                                                                                                   |
| Radius, overlays          | 6px                   | 8px                      |                                                                                                                   |
| Space, smallest step      | 4px                   | 2px                      | The sheets add a hairline step below the 4px base                                                                 |
| Row height, comfortable   | 40px                  | 56px                     |                                                                                                                   |
| Row height, compact       | 32px                  | 44px                     | The sheets' compact row equals doc 03's touch-target floor, which resolves a conflict doc 03 had with its own §17 |
| Control heights           | not specified         | 32 / 36 / 44px           |                                                                                                                   |
| Motion, longest           | 280ms                 | 200ms                    | Excluding the 1200ms skeleton pulse                                                                               |
| Type scale                | 14 tokens, rem, fluid | 14 tokens, px, fixed     | Same count, different names. A console needs predictability more than it needs fluidity                           |

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

### A8 · Delivery vocabulary is removed from public surfaces

"Phase 1" and "Phase 2" are DELIVERY vocabulary. They mean something precise
to Andishi and to the client reading the tracker, and nothing at all to a
business owner deciding whether to sign up, to whom "Phase 1" simply reads as
unfinished. The marketing page and the access screens now say what a customer
would say: channels are "Coming soon", the eyebrow is "Customer support
platform", the status band is "Where this is today".

**The honesty is unchanged, which is the point.** `01 D-05` and `10 §2`
require these surfaces never to imply a working inbox, and they still do not:
"Currently in development" remains in the lede, the status panel remains, and
every channel is still marked as not yet available. Only the jargon moved.

The project tracker keeps phase and milestone language throughout. It is a
delivery document for the client, and there the vocabulary is correct.

### A9 · The access aside cannot influence the form's layout

Two columns sharing a grid row means the taller one sets the height. The
aside animates: its audit stream grew from two rows to five on a 2.2 second
loop, and its credential caption swapped between a one-line and a two-line
sentence. Each change resized the row, stretched the form column, and moved
the form vertically while somebody was typing into it.

Two independent mechanisms now prevent it, because one would be a coincidence
rather than a guarantee. The aside is `sticky` at exactly `100dvh` with
`align-self: start`, so it contributes a fixed height regardless of content
and scrolls internally if it ever overflows. Separately, every panel inside it
is height-locked: fixed slot counts rather than sliced arrays, and reserved
caption heights rather than conditional text.

`src/components/access/AuthShell.tsx`, `AuthAside.tsx`.

### A10 · The access shell is a server component again

A `'use client'` directive had been added to the top of `AuthShell` so the
aside's panels could hold state. That directive is contagious downward through
a module, so it turned the FORM column into a client component too: every
access form lost server rendering as a side effect of a decorative panel
beside it. The boundary now sits in `AuthAside.tsx`, where the interactivity
actually is.

### A11 · The hero schematic's motion states the diagram's claim

The connector paths carried `animate-pulse` and the convergence point carried
`animate-ping`. Both are ambient throbs: they draw the eye without telling it
anything, and a reader watching a line fade in and out learns nothing.

The paths now carry a directional dash travelling left to right, from the
channels toward the workspace core, each offset in time so the four read as
independent streams. That is the single true statement the diagram makes, and
the motion is now the sentence rather than decoration on top of it. Under
`prefers-reduced-motion` the dash is removed and the still hairline underneath
carries the diagram, which is the resting state it was drawn to work in.

`src/components/marketing/HeroDiagram.tsx`, `@keyframes hero-flow`.

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

### A12 · Monospace font changed from Libertinus Mono to Fira Code at weight 500

The original three-family system shipped with Libertinus Serif, Libertinus Sans, and Libertinus Mono, all at weight 400. Fira Code weight 500 was substituted for the data typeface (all `--t-data`, `--t-code`, `--t-chip`, `--t-eyebrow` uses) for improved clarity and character distinction in a console context.

The weight constraint remains: only one weight per family is imported. Libertinus Serif and Sans continue at 400; Fira Code is locked to 500. Although Fira Code offers weights 300–700, only 500 is in the bundle. Fallback chain: Fira Code → Libertinus Mono → system monospace.

`src/app/tokens.css`, `globals.css`, `03 §4`.

---

## 3b. The aLcassa identity landing (August 2026)

The client supplied a full identity on 3 August 2026: the name **aLcassa**, a
bear-C logo, a six-colour palette anchored on blue `#043AE1`, and DM Sans as
the interface face. It arrived with its own `tokens.css`, `BRAND.md` and a
rewritten `03-design-system.md`, and it supersedes the previous "aLcassa"
system (copper/verdigris/ochre/oxide/slate/graphite on vellum, Libertinus
throughout) in full. These entries record where the port diverged from a
literal reading of those documents.

### B1 · The old token names survive as a compatibility layer

The retired palette is referenced roughly 370 times across 48 component files.
Deleting those names in one commit would take every surface in the product
down simultaneously, which maximises blast radius and makes a rebrand
regression indistinguishable from a refactor regression.

`tokens.css` therefore carries a Tier 0 block mapping every old name onto the
nearest aLcassa value **by semantic role rather than by hue**: copper (the old
interaction colour) resolves to blue, verdigris to green, ochre to amber,
oxide to red, slate and graphite to steps of the ink scale. The whole product
picked up the new palette in one commit without a single component being
touched, and surfaces are being rewritten against the real tokens one at a
time.

Ochre maps to **amber and not to the brand orange** deliberately. Routing every
retired ochre chip through `#FA5505` would have blown the one-per-screen accent
budget on every screen in the product at once.

The supplied identity file does the same thing for its own `--gray-*` names,
so this is the migration pattern the handoff already assumes.

### B2 · The Mark is redrawn as vector rather than shipped as the supplied PNG

The client icon is a 2560px square PNG, which is correct for print and wrong
for a 20px nav mark: 280KB to render 400 pixels, no `currentColor`, no dark
variant. It is redrawn on a 24-unit grid so one file serves as favicon, nav
mark and OG asset and recolours by prop.

**Open question carried from BRAND.md §5:** the supplied icon is `#0059D4`,
the moodboard palette is `#043AE1`, and they are visibly different. The
implementation follows the moodboard, because it presents itself as the
palette specification and measures better (7.58:1 on cream against 6.05:1).
The component reads `--blue-500`, so if the client confirms the icon file is
authoritative instead, the correction is one token rather than one asset.
Tracked upstream as TD-23.

### B3 · `em` no longer switches to the serif

The previous system used a family switch as its only emphasis mechanism,
because it had one weight and nothing else to reach for. 03 §6 restricts the
serif to titles, no italic cut is bundled, and the ceiling is now 500 — so
inline emphasis is a weight step and an ink step instead.

### B4 · A marketing-only display size exists above the documented ramp

03 §6 tops out at `--display-lg` (35px) because it is drawn for a console,
where a page title sits above a data table. A marketing hero is a different
reading task — seen once, from further away, with nothing competing — and 35px
there reads as a section heading rather than as the first thing the page says.

`--display-hero: clamp(56px, 5.6vw, 62px)` is scoped to the marketing surface
and used by one element on one page.

### B5 · The marketing page spends the accent more than once

03 §4a gives orange a budget of one moment per screen. The landing page
exceeds a literal per-document reading of that rule and holds to a
per-viewport one: the accent appears as ~7px section hairlines, one statistic,
one ticker dot and one ambient wash, and no two are ever in view together at
desktop height.

The reason is that the aLcassa palette contains exactly one warm colour. With
blue carrying every eyebrow, hairline, icon and action — which is what a
literal reading produces — the page renders effectively monotone: on-brand and
visually flat. The moodboard itself does not work that way; it sets its own
body text in the quiet blue, reserves the saturated blue for marks, and lets
the warm accent punctuate.

Colour on that surface is therefore split by job: **blue** only for things that
do something, **navy and the ink scale** for everything that is read, **orange**
as small punctuation, **green** for genuine status. If it is blue on the
marketing page and it cannot be clicked, that is a defect.

### B6 · Categorical hues were removed from three marketing components

The hero schematic gave its four channels four different hues; the capability
list gave its five features five; the role diagram gave owner/admin/agent
three. In each case colour was encoding a distinction that does not exist —
four instances of one category, five capabilities of one product, three points
on one permission gradient.

Under the new palette this stopped being merely redundant and became wrong,
because the hues now resolve by role: "Your credentials, write-only" rendered
in the warning amber, and a web-chat node in the same. Selection state carries
the colour now, and the role diagram uses three depths of one hue.

---

## 3c. The platform console shell (Claude Design import)

`Console-Shell.dc.html` and `console-tokens.css` were imported from the Claude
Design project and implemented as `components/console/`. The design is a
single-document preview; four of its mechanisms do not survive contact with an
App Router application, and one of them is a security boundary.

### C1 · The chrome tier, and why `--chrome-action` is not `--blue-500`

`console-tokens.css` adds a tier the product token file did not have: the
header and sidebar invert against the page ground, navy chrome on cream in
light mode and light chrome on navy in dark. It extends 03 §1's reasoning
(the console is locked to the aLcassa accent so a tenant cannot restyle the
owner's chrome) from hue to value — the chrome is aLcassa's surface, the main
pane shows tenant data, and the boundary should be visible from across the
room.

The consequence that is easy to get backwards: on the navy slab the saturated
brand blue measures **2.52:1**. `--chrome-action` therefore steps to blue-300
in light mode and back to blue-500 in dark — the inverse of `--text-action`.
The two are defined separately rather than aliased, and `Mark` gained a
`chrome` tone for the same reason.

### C2 · Support mode is server state, not component state

The design holds the session in React state and counts down from
`secondsLeft: 1800`. Three things make that unshippable: a refresh resets the
clock, so a 30-minute grant becomes unbounded; `app.support_mode` is an RLS
input read by `app.is_support_session()` in six policies, and a React boolean
must never reach it; and 09 §4 requires the audit entry to land in the
**customer's** log, which only the server can write.

The session is now a server-read cookie carrying an opaque id and an absolute
`expiresAt`, and the banner **derives** its countdown from that instant on
every tick rather than decrementing. A refresh, a throttled background tab and
a laptop resumed from sleep all resolve to the true remaining time.

The reason is validated in the server action, not only in the dialog — a
client-side guard on a field whose entire purpose is to appear in someone
else's audit log is a suggestion. The minimum length is 8 characters, because
an emptiness check passes on `"."` and a reason of `"."` satisfies the
requirement on paper while telling the customer nothing.

**Deliberately incomplete, in the safe direction:** the session row, the audit
write and the platform-admin check wait on M4. The cookie alone grants nothing
— `withTenantContext` reads `ctx.supportMode` off the resolved server context,
never off this cookie — so the banner can render without the database widening
by a single row.

### C3 · Navigation is routes; the chrome paints at its correct size

The design tracks `screen` in state and swaps `<dc-import>` blocks. Every nav
item is now a real URL with the active state derived from `usePathname()`, so
the back button, deep links, middleware auth and per-route metadata all work.

`--nav-w` and the density variables are read from a cookie **server side** and
emitted as an inline style, rather than written by a client effect as the
design does. Server-rendered, the effect version guarantees a visible snap:
the server emits 248px, hydration discovers a collapsed preference, the layout
jumps. This is the same problem the theme has and takes the same solution.

### C4 · `/platform/sign-in` escaped the console layout

Pre-existing, surfaced by this work: `sign-in` sat under `platform/layout.tsx`
and therefore rendered a full `AuthShell` **inside** the console chrome —
nav, workspace switcher and account menu wrapped around a screen for someone
who is not signed in yet. The console pages moved into a `(console)` route
group, which changes no URLs and leaves `sign-in` outside the layout.

### C5 · Dropdowns use page tokens, not chrome tokens

They hang off the inverted chrome but are tinted to the page. A popover is a
floating sheet over the _content_, not an extension of the bar it drops from;
glass tinted to the chrome reads as the header stretching downward, and its
rows would need a third colour scheme for their own hover states. 03 §7b names
the popover as a glass surface, and glass takes the surface beneath it.

Three additions the design file could not carry, because a preview never
loses focus or navigates: outside-click dismissal, closing every transient
surface on route change, and an explicit `prefers-reduced-motion` rule for the
three console keyframes — the global 0.01ms collapse can leave an animation
that starts at `opacity: 0` with its final frame unpainted, which would give a
user who asked for less motion an invisible dialog rather than a still one.

### C6 · The console screens are briefings, not dashboards

`Overview.dc.html` rejects the obvious grid of metric tiles, and the
implementation keeps that. The page opens with a SENTENCE naming the day's
actual problem, its main column is a queue ordered by **what each item costs to
ignore** rather than by recency, and the numbers are demoted into the inverted
band as supporting detail.

Two consequences look like mistakes and are not: the queue outranks the right
rail on width (1.9fr to 1fr), because health and the audit tail are reference
while the queue is work; and there is a closing line for the 43 workspaces that
need nothing, because a queue of four with no denominator reads as a system in
trouble when 91% of it is fine.

### C7 · One threshold, three surfaces

The 90%-of-limit predicate decides the meter colour in the workspace list, the
`Needs attention` filter count, and whether Overview raises a workspace into
the queue. It is defined once (`NEAR_LIMIT`) rather than re-derived per screen.
Three surfaces disagreeing about what "near the limit" means is the kind of
drift that makes an operator stop trusting the console.

Usage renders as a number and a 2px hairline, never a bar chart — the design's
own rule, and the reason the table reads as a document: "forty rows of bar
charts is a texture, not a reading."

### C8 · Destructive confirmations state consequences in people

The suspend dialog does not ask "are you sure?". It answers a different
question — what will happen — in three counts drawn from the read model: 247
staff lose access at their next request, 1,284 open conversations stop
receiving replies, 4 channels go quiet. Type-to-confirm on the slug is the
second gate.

The counts live in `getWorkspaceDetail` rather than in the component
specifically so the console cannot become confidently wrong about how many
people it is about to lock out.

### C9 · Detail tabs are URL state

The design holds the active tab in component state. As search params they give
the back button, a linkable billing dispute, a refresh that stays put, and the
option of per-tab server fetching. Stub tabs carry the design's own sentence
describing what will live there, which is more useful to a reviewer than a
spinner and more honest than an empty panel.

Two ports deliberately did not happen: the `Workspaces` "State" tab row, which
the source labels _"Design review only · not shipped chrome"_, and the design's
whole-row click target, replaced by a link on the workspace name so the row's
other controls stay reachable and a keyboard user has something to tab to.

### C10 · A KPI's direction and whether it is good are separate fields

Revenue's read model carries `direction` and `good` rather than one `positive`
flag. Churn falling and revenue falling are both down arrows and mean opposite
things. Collapsing them means whoever adds the next KPI has to remember which
way round it goes for that metric, and will eventually get it wrong on a screen
where being wrong makes the business look healthy when it is not.

The arrow points where the number moved; the colour says whether that was good.

### C11 · Redaction is a property of the audit record, not a rendering choice

A redacted diff carries the literal string `redacted` in both columns and the
real values are never selected into the read model. Had it been a display flag,
the secret would sit in the page's serialised RSC payload for anyone who opens
devtools, and _"a credential rotation shows that the secret moved, never the
secret"_ would be a CSS effect rather than a security property.

The diff's before/after uses `--danger-fg` and `--success-fg` — the one place
in the console those hues mean **removed and added** rather than failure and
success. That is the convention every developer already reads; overriding it
here would be a purity argument paid for in comprehension.

### C12 · Charts resolve their colours before Recharts sees them

Recharts writes `fill` and `stroke` as SVG **presentation attributes** on some
render paths, and `var(--blue-500)` in a bare presentation attribute is not
reliably resolved — black in Safari, silently absent in some Firefox builds.
Every colour is read from the computed style first and re-read on theme flip
via a `MutationObserver` on `data-theme`.

The chart palette is a single-hue ramp (blue-500 → blue-400 → ink-300) plus the
ordered escalation on invoice ageing, never a categorical set. A6 already
recorded that the old six-hue palette failed a colour-blindness check as chart
series; the aLcassa palette is narrower still, so identity rests on the axis and
a direct legend. Plan mix reads correctly in greyscale, which is the real test.

### C13 · `endedBy: customer` is the row the support register exists for

Three ways a session ends: the operator closed it, the 30-minute cap expired,
or the customer stopped it from their own workspace. Only the third tells an
operator something they did not already know, so it is the one value on the
page drawn in the accent. The design's closing line — _"a customer ending a
session early is a signal worth reading, not a fault"_ — is the editorial
position of the whole screen: an accountability ledger, not a productivity
report.

### C14 · The plan matrix is the one table that does not become cards

Everywhere else in the console a row is a record, so a card per record is a
faithful mobile translation. On the plan matrix the **row is the unit of
comparison** — the point is reading "staff seats" across four plans on one
line — and four cards would destroy the exact relationship the table exists to
show. It scrolls horizontally inside its own container instead.

This is a deliberate exception to the rule established in task #10, not a lapse
from it, and it is the only one in the console.

### C15 · A lowered plan limit defaults to next period, not now

The entitlement guard reads plan values on every request rather than at the
start of a billing cycle, so lowering a limit takes effect the instant it
saves — for the two workspaces already above the new number, that means
ingestion rejecting mid-afternoon for a change nobody told them about.

The confirm dialog therefore makes _Apply next period_ the primary action and
_Apply now_ a quieter secondary. It does not prevent the immediate change;
there are real reasons to need one. It refuses to make it the easy accident.

This is the same discipline as the suspend dialog (C8): the confirmation
describes consequences and names who is affected, rather than asking for
confidence.

### C16 · The 30-day uptime strip earns its space over a percentage

A single uptime figure cannot distinguish "99.82% because of one bad
afternoon" from "99.82% because it wobbles every third day", and those are
different engineering problems. The strip shows the _shape_ of the failures,
which is what an average removes. It sits beside the number rather than
replacing it: the figure goes in a report, the strip tells you whether to
worry.

The status banner is derived from the same data rather than hardcoded. A pill
that always reads "operational" is worse than no pill — it is the first thing
an operator checks and the first thing they stop trusting.

Latency percentiles use three weights of one hue, not three colours: p50/p95/p99
is an ordered series, and three saturated hues would give p50 (almost always
flat) the same visual weight as p99 (the one that wakes someone up).

### C17 · A locked rule is not an enabled rule

Master AI rules gives locked (safety-floor) toggles a neutral track and a
padlock rather than the blue used for a genuinely enabled rule, plus
`aria-disabled` and a `title`. An enabled rule is a choice someone made and can
unmake; a locked rule is a floor nobody chose and nobody can move. Rendering
both the same colour would tell an operator they have a choice on the safety
group that they do not have — the one place that misreading is least
affordable.

### C18 · Propagation counts real workspaces rather than running indeterminate

"Assistant rules live in under 5 seconds" is a requirement in the brief and
sits on the marketing hero. The AI-rules save flow is the surface where an
operator watches that claim happen, so the banner counts workspaces reached
and shows elapsed time rather than an indeterminate spinner — a progress bar
that does not correspond to anything would undermine the number the page
exists to demonstrate.

### C19 · The capability matrix gained a third column the design omitted

`Admins.dc.html` compares owner against platform_admin only, but the roster
beside it contains a support-role user, so the two-column matrix cannot answer
the first question an owner asks about the person on row four. A capability
table that silently excludes one of the roles it is auditing reads as complete
and is not. The third column — support — was added, along with the two rows
that matter most: every role, including owner, shows a cross for reading a
message body or a credential value.

### C20 · Theme is not in the settings model, even though it is in the section

`Settings.dc.html` draws the appearance picker as a section of the platform
settings page, and the platform settings model does not carry it. The design's
own lede for that section says why: "your own preference. It does not affect
what customers see." Every other field on the page is stated to apply to all
47 workspaces on save; folding a personal display preference into that model
would misrepresent which parts of the page are shared state and which are just
this browser's cookie. The picker reads and writes `THEME_COOKIE` directly —
the same cookie the header toggle uses — rather than inventing a second
mechanism.

It is also the first place `system` is actually selectable anywhere in the
product. `ThemeToggle` (the header control everywhere else) only cycles light
and dark, because a one-click toggle has no room for a third state. Picking
`system` here writes the preference the server already knows how to resolve
via the `Sec-CH-Prefers-Color-Scheme` client hint, and uses `matchMedia`
client-side only for the immediate visual feedback the click needs before the
next full request — both paths read the same OS signal by two different
routes, so they cannot disagree.

### C21 · Settings tabs are local state — the opposite call from C9, and for the opposite reason

Workspace Detail's tabs are independent enough to deep-link: a support ticket
says "check the billing tab" and the link should land there. Settings' five
tabs are quadrants of ONE form with ONE sticky save footer — the design saves
every dirty field across every section in a single action. Routing a tab
switch through the URL risks a remount that would discard an edit in a section
the operator isn't currently looking at, in exchange for a deep-link benefit
nobody asks for on a settings page. Local state guarantees the one thing that
matters: switching tabs never loses work.

The `initialTab` is still read from a search param once, on mount, so the
header's "Notification settings" link now lands on the Notifications section
specifically (`/platform/settings?tab=notifications`) rather than on General.

### C22 · Break glass gets a confirmation the design didn't draw

`Settings.dc.html` wires "Lock the platform" directly to its handler, no
dialog. Locking every platform admin out of every workspace — including the
owner, mid-support-session — has no per-workspace scope at all, one tier above
suspend (C8). It gets the same discipline: a dialog that states the
consequence before it lands. It stops at a plain confirmation rather than
suspend's type-to-confirm gate because it is reversible by a second admin,
where a suspension has consequences for a customer that a second click cannot
undo.

### C23 · Provision is a page, matching the design — a duplicate dialog exists and is noted for review

`Provision.dc.html` is a breadcrumb-navigable page at `/platform/tenants/new`
with five fields, a plan picker, and a "what happens on submit" manifest
beside the button. That page is what got built. A second, independent
provisioning flow — a modal opened from Overview's header — was added in
parallel by the front-end pass on this codebase; it collects a name and a
region rather than a slug and an owner email, and its slug preview still reads
the retired `.aLcassa.app` domain rather than `alcassa.app`. The two were not
reconciled here, on explicit instruction to hold that for a joint review
pass; this entry exists so the duplication is written down rather than
discovered cold in a diff.

Two smaller calls on the page that was built:

- **The slug-uniqueness check reads real workspace slugs** via the same
  `getWorkspaces()` call the list and Overview already use, rather than a
  taken-list invented for this one form.
- **On success it redirects to `/platform/tenants`, not to the new
  workspace's own page.** The design's copy says "redirecting to the
  workspace," which is the right instinct against a real backend and the
  wrong promise against this one — `getWorkspaceDetail` only resolves the one
  fixture this console set up, and a link that 404s the instant a workspace
  is "created" would be worse than the honest alternative. The five-step
  manifest, the validation, and the working state are built exactly as
  designed; only the destination changed.

---

## 4. Open items carried forward

| #   | Item                                       | Due         | Blocks                                          |
| --- | ------------------------------------------ | ----------- | ----------------------------------------------- |
| 1   | AI rules precedence, master versus layered | Week 1      | M4a and the schema. See D7                      |
| 2   | Support role matrix, signed                | Design lock | M4, and the isolation suite's support cases     |
| 3   | Embedding model Phase 2 will use           | Week 1      | The knowledge base seam                         |
| 4   | What suspension means                      | Before M1   | Every modify policy. See A1                     |
| 5   | Plan tiers with limits                     | Week 4      | M3                                              |
| 6   | Product name and brand assets              | Design lock | Nothing. The placeholder mark ships             |
| 7   | Owner email unique across the platform?    | Design lock | The membership model and `user_profiles` policy |
| 8   | Credentials per-tenant or per-integration  | Design lock | A column now, a migration later                 |
