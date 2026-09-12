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

**Resolution. Closed 24 Aug 2026.** The client's answer, read plainly, combines
both halves of this conflict rather than picking a side: "Layered. Master rules
always override tenant rules." `01 D-08` records the fuller reasoning for
reading this as layered composition with master winning on conflict, which
happens to mean design sheet 14's "master wins on conflict" phrasing and `01
D-08`'s layered recommendation were never actually in tension once the client's
own words are read as intending both. The `lockedFields` column ships with its
default semantics inverted, per `05 §7`: locked unless a field is explicitly
marked overridable, rather than open unless locked.

The schema shipped with `lockedFields` on the master version row, which is the
layered model's requirement, so no migration was needed regardless of which way
this closed.

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

This encodes the answer to `01 §9` question 4, **confirmed by the client on 24
Aug 2026 as read-only**, which is what this helper already implemented. No code
change followed: the recommendation and the shipped behaviour matched from the
start.

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

### A13 · The plan catalogue replaced, not amended

The four-tier proposal in `08 §2` (Free, Starter, Growth, Scale) is not in
either founding document; it was this project's own placeholder, explicitly
marked as one, pending the client's week-four confirmation. On 24 Aug 2026 the
client confirmed a different shape entirely, Pro / Business / Custom with two
new entitlement keys (`conversations_monthly`, `support_sla_hours`), three weeks
early. This is not a delta between the two founding sets, since neither
specified plan tiers; it is recorded here because the seed data, the entitlement
key list and the design sheets now need to agree on names that did not exist
when those sheets were drawn.

**The sheets are not corrected in this pass.** `03 Controls`, `05 Platform
Console`, `06 Tenant Detail`, `07 Support Mode`, `13 Motion and Access` and `14
Handover` all still show `Starter` or `Growth` as example plan names. Those are
illustrative rather than contractual, and they are stale as of this entry. A
future design pass should reconcile them.

`src/db/seed/constants.ts`, `08 §2`, `01 §8`.

### A14 · Support mode's read-only default did not survive contact with the client

Both founding documents, and the boundary-frame and switcher treatments drawn in
`07 Support Mode`, describe support mode as read-only. `01 D-13`, confirmed 24
Aug 2026, makes it read and write with three permanent carve-outs: the
credential secret stays unreadable by anyone, a support session cannot extend
its own timeout, and support never acts as the member's own identity row.

This is the largest behavioural change in the M0 pass and it touches copy
(`10 §6`, `§10`, `§11`), the role matrix (`06 §5`, `09 §4`), the RLS policies
that implement it (`00_context.sql`'s `can_write_settings()`, which now admits
the `support` role), and the isolation suite's generated case 9.

**`07 Support Mode.dc.html` is not edited in this pass.** Its captions asserting
a read-only support role are now stale illustrative copy rather than a live
contract, and should be corrected in the next design pass.

One item inside this decision is deliberately still open: whether the new write
access extends to `customer_records`. `09 §4` argues it should not, and both the
`select` and `modify` policies on that table keep an explicit
`not app.is_support_session()` block, independent of `can_write_settings()`, so
the table does not silently open when the general gate does.

`01 D-13`, `06 §5`, `06 §6`, `09 §4`, `src/db/policies/06_seams.sql`.

### A15 · FastAPI moves from a consumer to the service door's implementation

`04 §1`'s container view and `02 §7`'s namespace table both placed FastAPI
outside the system, as a caller of a service door that Next.js implements.
`01 D-14` and `04` ADR-012, both dated 24 Aug 2026, make FastAPI the implementer
of that door instead, resolving the client's objection that his original
specification was FastAPI as the full backend.

No design sheet in this set mentions FastAPI at all, so unlike A13 and A14 there
is nothing illustrative to reconcile here. The request and response shapes,
authentication scheme and ETag semantics in `07 §8` are unchanged by the move;
only the runtime answering the call is different, which is the point of
ADR-012 rather than an accident of it.

The dashboard doors (`/api/v1/*`, `/api/platform/v1/*`) stay on Next.js for
Phase 1. Moving those behind FastAPI as well is scoped as a separately priced
change note rather than absorbed.

`01 D-14`, `04` ADR-012, `07 §1`, `07 §8`.

### A16 · The console's demo data still prices the retired plan catalogue

The plan catalogue confirmed on 24 Aug 2026 is Pro at KES 3,400 a month,
Business at KES 17,000, and Custom priced per deal. `src/db/seed/constants.ts`
carries that catalogue and is correct.

**The console's fixture data does not, and is deliberately left alone in this
pass.** `src/lib/console/data.ts`, `src/lib/tenant/data.ts`,
`src/components/console/ProvisionWorkspaceDialog.tsx`,
`src/components/console/WorkspaceTable.tsx`,
`src/components/tenant/InviteForm.tsx` and the console layout's workspace
switcher all still model Trial / Starter / Growth / Scale at KES 46,000 to
184,000.

Renaming them is not the whole job, which is why this is an open item rather
than an oversight. The fixtures are an interlocking financial model: plan prices
feed LTV figures, a twelve-month MRR series running from KES 3.91M to 6.04M, a
net-revenue-churn percentage, and named dunning invoices at 46,000 and 184,000.
Substituting the confirmed prices without rebuilding that model would drop
modelled MRR by roughly twenty times and leave a revenue page whose totals no
longer follow from its own rows. Substituting them _with_ a rebuilt model means
inventing a new set of financial figures, which is a decision about what the
console should demonstrate rather than a porting task.

**There is also a question underneath it worth putting to the client.** The
confirmed prices describe a product at KES 3,400 to 17,000 a month. The console
fixtures were drawn for a platform billing KES 46,000 to 184,000 with roughly
six million in monthly recurring revenue. Those are different businesses, and
the gap is large enough that it is worth confirming which one the console is
meant to portray before anyone rebuilds the numbers.

Until that is settled the fixtures stay as drawn, and this entry is the record
that they are known to be stale rather than believed to be current.

---

## 3b. The aLcassa identity landing (August 2026)

The client supplied a full identity on 3 August 2026: the name **aLcassa**, a
bear-C logo, a six-colour palette anchored on blue `#043AE1`, and DM Sans as
the interface face. It arrived with its own `tokens.css`, `BRAND.md` and a
rewritten `03-design-system.md`, and it supersedes the previous "aLcassa"
system (copper/verdigris/ochre/oxide/slate/graphite on vellum, Libertinus
throughout) in full. These entries record where the port diverged from a
literal reading of those documents.

**Approved 24 Aug 2026.** The client confirmed the brand palette alongside the
five M0 decisions. That approval attaches to the identity described in this
section, which is the live one, rather than to the superseded system in `§1`.
No token value changed as a result: this confirms the palette already shipped in
`src/app/tokens.css` rather than altering it.

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

**Superseded by C31.** The product ships one theme now; the section, the
header toggle and the cookie this entry describes are gone. Left standing
for the reasoning that shaped the settings model while it existed.

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

**Superseded by C28.** The joint review this entry held for happened; the two
flows were reconciled by keeping the modal and absorbing the page's content
into it, not the reverse. Left standing rather than deleted so the reasoning
that led there is still legible.

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

### C24 · Sheet 13's `motion.instant` is superseded for console chrome — GSAP stays, reduced motion becomes mandatory instead of absent

Sheet 13 sets `motion.instant = 0ms` for nav selection specifically: "state
that is already known does not need easing in." The front-end pass on this
codebase built the opposite bet for the console chrome — the sliding nav
indicator, the icon bounce, the hover x-slide, the command palette entrance —
all real GSAP motion, and it reads as considerably more finished than an
instant snap would. Ripping it out to match the sheet literally would be a
regression dressed as compliance.

The decision, made explicitly rather than by default: keep all of it, and
record the amendment here instead of silently diverging from the sheet.
What does not move is non-negotiable regardless: sheet 13's own conformance
section requires `prefers-reduced-motion` to lose nothing, and GSAP is
JS-driven — the CSS media query alone does nothing to a `gsap.to()` call.

**`src/lib/motion.ts`** is the amendment's actual mechanism. `gsapSafe.to` /
`gsapSafe.fromTo` check `prefersReducedMotion()` and, when it's on, call
`gsap.set()` to the tween's end state directly (firing `onComplete`
synchronously) instead of animating — so a reduced-motion reader lands
exactly where sheet 13 says they should, and everyone else keeps the motion.
Every GSAP call site in `ConsoleShell.tsx` and `WorkspaceDetailDrawer.tsx`
routes through it. The nav indicator's tweens are additionally scoped to a
`gsap.context()` bound to the nav container, reverted on unmount, so a tween
started right before a route change cannot animate a detached node.

### C25 · The component library gets wired in, and three dead-end mutations get named rather than faked

`ConfirmDialog` / `DestructiveConfirm` (Radix-backed, real focus trap) and
`@radix-ui/react-switch` existed in the codebase with zero consumers; the
console hand-rolled six dialogs and three switches instead. All nine are now
built on the primitives. Two dialogs — `StartSessionDialog` and the command
palette — needed Radix `Dialog` directly rather than `ConfirmDialog`, since
neither fits a plain title-and-consequence shape (a required reason field; a
search input and a results list).

`ConfirmDialog` and `DestructiveConfirm` gained two additions neither had:
an `error` prop, rendered inline per sheet 12's "failure is inline, never a
toast," and (`DestructiveConfirm` only) a `details` slot for content richer
than the one-sentence `consequence` — the suspend dialog's per-person impact
counts are the reason; flattening them into the sentence would have lost the
thing the original hand-rolled dialog's own comment called "the best idea in
the whole design set."

**Three buttons had no handler behind them at all.** `WorkspaceActions`'
suspend confirm, `WorkspaceDetailDrawer`'s independent copy of the same
dialog, `BlastRadiusDialog`'s three actions, and `SettingsPanel`'s
break-glass toggle all called `setOpen(false)` and nothing else —
`disabled={!armed}` with no `onClick` at all in the suspend case. Each now
calls a real server action (`suspendWorkspace`, `applyPlanChange`,
`toggleBreakGlass` in `actions.ts`) that validates everything it can and
refuses with the specific, named reason it cannot write yet — the tenants
table, the entitlements table, and `app.support_lock` all wait on migrations
this pass did not add. This is the same "safe direction to be incomplete
in" `startSupportSession` already used; the alternative — flip local state
and call it done — would have made a UI say something happened that did not.

Toasts are wired only into the one mutation with a real success path today:
support-session start, across all four places it can be triggered.
Settings/Profile save and Rules publish were deliberately left alone —
each already shows its own inline "Saved" confirmation, and `Toast.tsx`'s
own doc comment says why that is correct: a toast is for an outcome that
finishes after the reader stopped looking, and a save button's result is the
direct, visible consequence of the click that belongs in the control itself.

### C26 · Loading, error and empty-state infrastructure — and a pre-existing error catalogue this pass almost duplicated

`(console)/error.tsx` and a `loading.tsx` per route did not exist anywhere
under `/platform`; both do now, the loading states built from the existing
(previously unused) Skeleton family, shaped to each real page rather than a
generic spinner.

`EmptyStateSeam` and `EmptyStateWithheld` were added alongside the existing
`EmptyState` for sheet 12's other two empty tokens — a hatch marks a region
that is deliberately unfilled or refused, distinct from a plain surface
that's simply new. `--hatch-slate` / `--hatch-oxide` existed in `globals.css`
with no consumer. Neither variant has a call site yet: no current screen has
a genuine "arrives with a later milestone" stub or a withheld-data region
that isn't already handled by `EmptyState`'s existing first-run/filtered
treatment or `AuditStream`'s inline per-field redaction. Recorded as built
and available rather than force-fit onto content that doesn't need it.

**`src/lib/errors/contract.ts` was written, then deleted.** Sheet 12's error
shape — `{code, message, request_id, details?}` — already existed almost
verbatim as `src/lib/errors/index.ts`'s `AppError` / `ApiErrorBody`, wired
into `src/lib/http/pipeline.ts` and the entitlements service, from a much
earlier "Phase 1" that predates the console entirely. What sheet 12 actually
adds on top — the ochre/oxide/slate hue per code — did not exist, so
`src/lib/errors/hue.ts` supplies just that, keyed to the real `ErrorCode`
type rather than a second, parallel one.

### C27 · Roving tabindex, one hook, four grids

`src/hooks/useRovingGrid.ts` is sheet 13's grid-is-one-tab-stop pattern as a
single reusable hook rather than four bespoke implementations: `tabIndex={0}`
on the active row, `-1` on the rest, arrow keys move the roving index, `↵`
activates, `→` steps into a row's `data-row-actions` zone. Applied to
`WorkspaceTable`, `AuditStream`, the workspace-detail `BillingTab`'s invoice
table, and a new `CollectionQueueTable` — pulled out of `revenue/page.tsx`
into its own client component, since that page is a server component and the
hook needs client state, and converting the whole page for one table wasn't
worth it.

`ConsoleShell` gained a skip link, invisible until focused, jumping straight
to `#main-content` — there was none anywhere in the console before. Sheet 13
also names the workspace switcher as stop 02, immediately after the skip
link; that was not enforced by reordering the header's DOM, since doing so
would have made the logo link keyboard-unreachable, which is a worse
regression than the ordering nuance it would fix.

### C28 · Provision consolidated into the modal, absorbing the page — supersedes C23

C23 recorded two competing provisioning flows and held the decision for a
joint review. The review's outcome: the modal wins, and absorbs the page's
content rather than the other way round, because the modal is reachable from
anywhere in the console (a header button, ⌘K) while the page needed its own
navigation to reach.

`ProvisionWorkspaceDialog` is now the full five-field form — legal name, a
slug with live uniqueness against real workspace slugs, owner email, the real
plan set, the trial toggle, the five-step manifest — rebuilt on Radix
`Dialog`, fetching its data via a new `fetchProvisionOptions` server action
rather than props, since it has no single server-component parent anymore.
Along the way this fixed what C23 flagged: the retired-domain slug preview,
the hardcoded `plan: 'pro'` (not a plan this product has), and the US
East / EU West region picker that contradicted Workspace Detail's fixed
`eu-central-1` — resolved by dropping the picker entirely rather than
correcting its options, since residency isn't actually a per-workspace choice
anywhere else in the console.

`/platform/tenants/new` now redirects to `/platform?provision=1`, which
`ConsoleShell` reads via `useSearchParams()` and opens the modal on — the
flow keeps a real, deep-linkable URL without owning a route. `ProvisionForm.tsx`
is deleted; nothing else referenced it.

### C29 · Health gets sheet 11's leading diagnosis, per-metric budgets, and an isolation panel — and a table-count correction

Health had the 30-day strips and the amber-not-red convention for degraded
services already right; missing were the four things sheet 11 states as the
point of the page. Added: a leading diagnosis sentence above the service
grid (severity stated before the reader has to derive it from the grid);
a budget beside every service's metric ("a number without a target is
trivia"); a refusals count next to the throughput panel, explicitly excluded
from the error rate ("a rejected scope is the guard working, not an error");
and a cross-tenant isolation suite panel — tables policed, cross-tenant
attempts and refusals over 30 days, last run.

⚠ **The isolation panel's table count was corrected from the design mockup's
illustrative "11" to 18**, matching `project-docs/06-tenancy-and-isolation.md`'s
own figure ("roughly eighteen tenant-scoped tables") for the real,
schema-introspected suite in `tests/isolation/generated.test.ts`. Sheet 11's
own text is a placeholder; this console reads its numbers from `data.ts`,
which is a seam over the real product, not over the design file — carrying
the design's illustrative number forward would have been a small, specific
factual error sitting beside the one guarantee (RLS isolation) this whole
project is about.

### C30 · The rest of the sheet set applied — four defects, one of them semantic

C29 covered sheet 11 only. Reading 03, 04, 05, 06 and 10 against what was
built found five things, four of which were wrong rather than merely absent.

**A ceiling was rendering as a failure.** Both meter scales returned
`--danger-fg` at 100%. Sheet 04: _"A tenant at 15 of 15 has not failed. It
has arrived at the limit its plan describes, and the console's job there is
to offer the tier above it."_ A red row put a workspace that is working
exactly as sold in front of an operator whose actual next move is a sales
conversation. Sheet 06 gives the corrected scale — verdigris within the
limit, ochre at the ceiling — and no entitlement meter in this console
renders red now; red is kept for a failure of correctness. The
blue-to-state gradient went with it, since a meter reading as two states at
once was the other half of the same confusion.

**"One shadow, one surface" was not being observed.** Sheet 04: _"Only the
dialog and the command palette carry elevation. Panels are separated from
the page by a tint step and a hairline, never by a shadow."_ Thirty-odd
`boxShadow` declarations sat on panels, table containers, status dots,
meters, filter chips and pagination — including coloured glows in
`rgba(14, 165, 233, …)`, a sky-blue that is not this product's blue at all.
All removed; `--invert-card-shadow` is now `none` in both themes so the
inverted ribbons lose their glow everywhere at once. What stays: the
sanctioned neumorphic INSET on meter tracks, search fields and segmented
thumbs (tokens.css names those three by name), and elevation on dialogs.

**The standfirst was missing and the shortlist was unbuilt.** Sheet 05:
_"the count that implies work is in the sentence, not only in a card, and
the phrase that names it is ochre"_ plus _"attention is pre-filtered, so the
grid below is already the shortlist rather than a thing to construct."_
Workspaces now opens with "47 businesses. 3 need attention." — the second
clause ochre, matching the meters and the filter chip that name the same
condition — and lands with that filter applied. It starts off when nothing
needs attention, because an applied-and-empty filter reads as a broken list
rather than a quiet morning.

The predicate moved to `src/lib/console/attention.ts` to make that possible:
`data.ts` is `server-only`, so a server page and a client table cannot share
a runtime helper from it, and a console whose opening sentence and whose
filter disagree about which workspaces need work is worse than one that says
nothing.

**Isolation was something to go and check.** Sheet 05 puts it under the
navigation permanently — _"the severe risk in the brief is a policy gap"_.
It now sits above the sidebar footer on every console route, reading the
same `getIsolationStatus()` the Health panel does, so the two cannot
disagree. Collapsed, it degrades to the coloured dot with the full sentence
in `title`.

**Smaller, same source:** suspended workspaces drop their NAME to secondary
ink, not just their chip (sheet 05, "a tenant that is inert should not
compete with one that is live"); Suspend moved to the opposite end of the
workspace drawer's action strip from Support session (sheet 06, _"the
destructive action is never under the cursor"_ — they were 8px apart); the
AI-rules button says "Publish v16" rather than "Save and propagate" (sheet
10, _"the action states the artefact it creates, matching the audit entry it
will write"_) and the page carries a singleton lock chip; every meter names
the table that answers it (sheet 06, _"a figure on screen can be traced to a
row in the schema without asking anyone"_).

⚠ **Adding that last field surfaced a latent bug.** `WorkspaceDetailDrawer`
hand-redeclared `Meter`, `Invoice` and the whole detail shape locally,
structurally matching what `fetchWorkspaceDetail` returns. That compiles —
until the server type gains a field, at which point the copy keeps compiling
while rendering a workspace without it, which is exactly what happened. The
local copies are gone; the component uses `WorkspaceDetail` itself.

**`.target-44`** (globals.css) gives a 44px hit area to controls that draw
smaller, via a centred pseudo-element rather than by growing the box —
sheet 03 states the target as `max(control height, 44)`, and the console's
chrome controls draw at 32px by design. Applied to the icon-only chrome
buttons; deliberately not applied inside grid rows, where overlapping
targets would steal each other's clicks.

### C31 · Dark mode removed — one theme, light — but nothing "dark by design" moved

Product direction: one theme. Everything built for a light/dark toggle is
gone — `src/lib/theme.ts`, `src/lib/theme-shared.ts`, `ThemeToggle`, the
Settings appearance picker (C20), the header toggle, the command palette's
"toggle the theme" action, `THEME_COOKIE`, the `Sec-CH-Prefers-Color-Scheme`
client hint and its `Accept-CH`/`Critical-CH` headers, Tier 2's entire dark
token block, and 112 `dark:` Tailwind variants across 12 files.

⚠ **What did NOT move: anything dark by design rather than by theme.** The
console chrome (`--chrome-*`, TIER 4), the inverted command ribbons
(`--invert-card-*`), and the workspace schematic node (`--workspace-card-*`)
are all dark navy against the cream page in the one theme this product has
— that was already true in light mode before this pass, and it is still
true now. These tokens were never redefined by the dark-mode block; deleting
that block changed nothing about them. The three doc comments that used to
read "X in light mode, Y in dark mode" were corrected to say what is now
actually true — a constant, not a flip.

Three things worth naming because they were not simply deletions:

- **`@custom-variant dark` is redefined to a selector that matches nothing,
  not removed.** Tailwind v4's `dark:` variant falls back to
  `@media (prefers-color-scheme: dark)` on its own — deleting the override
  would have handed every OS-dark reader a half-styled page assembled from
  whatever `dark:` class survived an incomplete sweep, which is the opposite
  of removing dark mode. All 112 instances were removed from source anyway;
  the neutralised variant is a guard against the next one written from
  muscle memory, so it compiles inert instead of silently reactivating.
- **The theme-crossfade CSS was deleted, not just its trigger.** A universal
  `transition` on six colour properties across body/header/nav/main/button/
  a/input/… existed only to smooth a flip that no longer happens; left in
  place it would have been a transition the compositor still pays for on
  every ordinary hover and focus state.
- **Two Recharts token readers lost their `MutationObserver`, not their
  read.** `useTokens()`/`useToneColors()` in both `Charts.tsx` files still
  read CSS custom properties into real colour values once on mount — that
  part is unrelated to theming, it is what makes an SVG presentation
  attribute resolve `var()` reliably across engines. Only the re-read-on
  \-`data-theme`-flip half of each was removed.

`viewport.colorScheme` is `'light'`, not `'light dark'` — declaring the pair
on a permanently-light page would tell the browser to paint its own form
controls and scrollbars dark for an OS-dark reader, the exact mismatch this
token set exists to prevent.

---

## 4. Open items carried forward

| #   | Item                                                           | Due                                       | Blocks                                            | Status                                                   |
| --- | -------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------- | -------------------------------------------------------- |
| 1   | AI rules precedence, master versus layered                     | Week 1                                    | M4a and the schema. See D7                        | **Closed 24 Aug 2026.** Layered, master wins on conflict |
| 2   | Support role matrix, signed                                    | Design lock                               | M4, and the isolation suite's support cases       | **Closed 24 Aug 2026.** Read-write. See A14              |
| 3   | Embedding model Phase 2 will use                               | Week 1                                    | The knowledge base seam                           | **Closed 24 Aug 2026.** `text-embedding-3-small`         |
| 4   | What suspension means                                          | Before M1                                 | Every modify policy. See A1                       | **Closed 24 Aug 2026.** Read-only, as already built      |
| 5   | Plan tiers with limits                                         | Week 4                                    | M3                                                | **Closed 24 Aug 2026**, three weeks early. See A13       |
| 6   | Product name and brand assets                                  | Design lock                               | Nothing. The placeholder mark ships               | **Closed 3 Aug 2026.** Identity landed. See `§3b`        |
| 7   | Owner email unique across the platform?                        | Design lock                               | The membership model and `user_profiles` policy   | Open                                                     |
| 8   | Credentials per-tenant or per-integration                      | Design lock                               | A column now, a migration later                   | Open                                                     |
| 9   | FastAPI service-door staffing and effort                       | Before M4a                                | M4a, the service-door demonstration               | **Open, added 24 Aug 2026.** See `01 D-14`               |
| 10  | Does full support access extend to `customer_records`?         | Before M4a                                | That table's RLS policies and its isolation cases | **Open, added 24 Aug 2026.** Proposed no. See `09 §4`    |
| 11  | Confirm the reading applied to "layered, master always wins"   | Not blocking                              | Nothing; the schema supports either reading       | **Open, added 24 Aug 2026.** See `01 D-08`               |
| 12  | Console demo data still models the retired four-tier catalogue | Before the console is shown to the client | Nothing in the build; it is fixture data          | **Open, added 24 Aug 2026.** See A16                     |

---

## C30 · Policies must resolve the actor through `app.current_actor_id()`, never `auth.uid()`

**27 Aug 2026. Defect, found while starting M2.**

Fifteen policy predicates across six files called `auth.uid()` directly.
`00_context.sql` has always stated that "every RLS policy in this database
reads from these four functions and from nowhere else"; those fifteen call
sites were a violation of that rule, and the rule was right.

There are two connections into this database and only one carries a JWT:

| Path | Identifies the actor by | `auth.uid()` |
|---|---|---|
| Drizzle (`lib/db/client.ts`) — **every application query** | `app.actor_id`, set transaction-locally by `withTenantContext` | **NULL** |
| Supabase client (PostgREST) | the user's JWT | resolves |

So `user_id = auth.uid()` evaluated `user_id = null`, which matches nothing.
Six tables returned **zero rows to every caller**: `user_profiles` (including
the signed-in user's own row), `plans`, `plan_entitlements`,
`master_ai_rules`, `master_ai_rule_versions`, `platform_admins`.

**Why the isolation suite did not catch it.** Two reasons, and the second is
the more important one:

1. `tenantScopedTables()` selects tables that have a `tenant_id` column. Five
   of the six do not, so the suite never named them.
2. Every case in the suite asked whether tenant A could see tenant B's rows.
   None asked whether tenant A could see **their own**. A table that is empty
   for everyone passes every cross-tenant assertion ever written.

**Resolution.** `app.current_actor_id()` reads `app.actor_id` first and falls
back to `auth.uid()`, so both doors resolve an actor. `SECURITY DEFINER`
because the application role has no `USAGE` on the `auth` schema; the
exception block because a JWT that will not resolve must degrade to "no
actor" rather than raise. The fifteen call sites now go through it.

`tests/isolation/shared-tables.test.ts` covers the eight policed tables with
no tenant column and asserts **visibility as well as restriction**. Every such
table must declare who may read it, so a new one cannot ship uncovered. The
fix was verified by reintroducing the defect on `plans_select` and confirming
the new test fails and names the cause.

**Also corrected in the same pass:** tenants A and B had lost their
`tenant_members` rows, so the two tenants the entire suite acts as had no
memberships and several assertions were weaker than they appeared. Reseeded.

**Reported to the client** in the tracker update feed dated 27 Aug 2026,
including an explicit correction of the "152 of 152" figure quoted on
25 August. Isolation was never breached; the evidence offered for it was
thinner than it was presented as being.

---

## C31 · Invitation acceptance runs through security-definer functions

**27 Aug 2026. Defect, found by the M2 lifecycle probe.**

`acceptInvitation` wrote to `invitations` and `tenant_members` through Drizzle
under `withActorContext` — a context with no tenant, which is the only context
available before the membership it creates exists. Every policy on both tables
compares against `app.current_tenant_id()`, which was null, so **both writes
matched zero rows and were silently discarded**. The route returned 200, set a
session cookie, and redirected the new member into a workspace they had not
joined.

Nothing static could catch it: the query was valid, the types were right, and
zero rows updated is not an error in Postgres.

`02_identity.sql` had described the correct design all along — "a
security-definer function that looks the invitation up by token hash, which is
why there is no public select policy here". That is now built:
`app.invitation_by_token(text)` and `app.accept_invitation(text, uuid, text,
text)`, both `SECURITY DEFINER` with `search_path` pinned. Acceptance is one
statement, so marking the token used and creating the membership cannot come
apart.

The service role was considered and rejected: `serviceClient.ts` lists four
permitted operations and states that it may **never** read a tenant's members.

---

## C32 · `sessions_modify` gains a tenant constraint in its with-check

**27 Aug 2026. Security defect, exposed by fixing C30.**

The clause read:

```sql
with check (user_id = app.current_actor_id() or kind = 'support')
```

No constraint on `tenant_id`. A signed-in user could `UPDATE` their own session
row and set `tenant_id` to **any workspace on the platform**, including one
they hold no membership in.

**Why it went unnoticed.** Isolation case 6 — "moving one of tenant A's own
rows into tenant B is rejected" — exists to catch precisely this. It had been
passing for the wrong reason: while the policies called `auth.uid()` (C30),
nothing on this table was writable by anyone, so the case could not fail.
Repairing C30 made the gap visible on the next run, and left one migrated row
— user A's session pinned to tenant B — as physical evidence.

**Blast radius: limited, not nil.** `resolveSessionCore` reads the tenant from
the session and then requires a membership in it, so a moved session resolved
to `auth.no_membership` rather than to another tenant's data. Defence in depth
held. That is not a reason to leave it: the point of a with-check clause is
that it holds whether or not the application above it is careful.

**Resolution.** A session may now be pinned only to a workspace its owner
belongs to, verified by an `exists` against `tenant_members`. The
`tenant_id is null` branch is what keeps platform sessions, which are scoped to
no tenant, legal.

---

## C33 · Test teardown must bypass RLS

**27 Aug 2026. Process defect.**

`account-lifecycle.test.ts` cleaned up through the RLS-bound connection with no
context set. Every `delete` matched zero rows and reported success, so its
fixtures accumulated across runs and began breaking eight cases in the
generated suite, which counts rows in `sessions` and `user_profiles`.

The harness now exposes `cleanup`, which goes through the admin connection and
says why in its own comment. This is the same failure shape as the original
harness defect where ground-truth reads shared the RLS-bound connection: an
operation that silently does nothing is worse than one that fails.

---

## C34 · Transactional email: provider chosen, seam built

**27 Aug 2026. Decision, closing the last M2 item.**

`10 §14` names five templates and gives each a subject and opening line. It
does not name a provider, and `04` lists none among the external services.

**Decision.** Resend, reached over `fetch` with no SDK — the entire surface
used is one POST with a bearer token, and an SDK for that is a dependency to
audit and carry into every cold start. It sits behind `EmailAdapter`, so
changing provider is one new file in `src/modules/email/adapters/` and nothing
above the interface knows which service is in use.

**Two of the five are not ours.** Verify-email and password-reset are sent by
Supabase Auth. Reimplementing them would mean minting our own verification and
recovery tokens alongside Supabase's — a second credential path to maintain and
get wrong. They are listed in `types.ts` so the set stays complete and nobody
adds them twice.

**Unconfigured environments report the truth.** The obvious shape is a
development adapter that logs and returns success. That is wrong: every caller
then treats an unconfigured production environment as a working one, an owner
is told their colleague was emailed, and nobody finds out until the colleague
never arrives. The logging adapter therefore returns `delivered: false`, and
`/v1/invitations` returns the accept link **only** in that case — a token in a
response body is a live bearer credential in whatever logs it, so it is
withheld when the recipient already has it by email.

**Sending happens after the transaction commits.** Inside it, a slow provider
holds a database transaction open for its whole timeout, and a rollback after a
successful send mails a link to an invitation that no longer exists. After it,
a failed send leaves a real invitation whose link the owner can still pass on.
The second is a nuisance the interface explains; the first is an invitation
that can be neither accepted nor withdrawn.

**Invitation URLs come from `NEXT_PUBLIC_APP_URL`, never from the request
`Host` header.** Host-header injection targets exactly this: the recipient
receives a genuine invitation pointing at an attacker's copy of the accept
screen and types a new password into it.

---

## C35 · Resend reissues the token rather than repeating the link

**27 Aug 2026. Design note on `POST /v1/invitations/:id/resend`.**

Re-sending the existing link is wrong in both directions. A token that has sat
in an inbox for six days expires tomorrow, so resending it delivers a link that
dies almost immediately — precisely the situation the owner is trying to fix.
And a token mailed twice now exists in two inboxes, two mail servers and two
sets of logs, for twice as long.

So the row keeps its identity, address and role — it is the same invitation and
the seat it reserved is not counted again — while the credential inside it is
replaced and the clock restarts. The previous link stops working immediately.

`07 §5` asks for rate limiting per invitation. A Redis counter would be a fifth
cache use and `04` ADR-006 scopes that to four, so the control is expressed as
the remaining life of the existing link: resending is refused while more than
six of the seven days remain. That catches the common case, which is an owner
clicking twice, rather than an attack.

---

## C36 · Subscription administration lives under `modules/platform`, not `modules/subscriptions`

**27 Aug 2026. Structural, decided by the lint rule.**

`assignPlan`, `changeSubscriptionStatus`, `grantOverride` and `previewPlanChange`
were written in `src/modules/subscriptions/service.ts`. The build refused them:
the service-role client may be imported only inside `src/modules/platform`, and
that exemption list has exactly one entry on purpose.

The rule was right rather than inconvenient. Every one of those operations is a
platform action — `03_subscriptions.sql` deliberately gives `subscriptions` and
`subscription_overrides` no tenant-facing modify policy, because "a tenant
cannot upgrade themselves: there is no payment gateway behind the button". So
there is no tenant context under which the writes are legal, and widening the
guard to reach them would have inverted the reason it exists.

They now live in `modules/platform/internal/subscriptions.ts` and
`internal/watchlist.ts`. What stays in `modules/subscriptions` is the part
carrying no privilege: the state machine, which both doors read, neither can
bypass, and which needs no database access — so it is unit-tested without one.

---

## C37 · The subscription lifecycle is a table, and all 36 pairs are tested

**27 Aug 2026. Design note.**

Six states permit thirty-six ordered pairs and only nine are legal. Expressed
as conditionals at each call site, the illegal twenty-seven are enforced by
whoever remembers.

`transitions.ts` holds the whole machine on one screen, checkable against the
diagram in `08 §7` without reading a handler. `tests/subscriptions/` enumerates
every pair rather than spot-checking the nine, because a test that asserts the
legal moves proves the machine permits what it should and says nothing about
what it forbids — and the expensive mistake is in the second set:
`cancelled → active` silently restores a customer who stopped paying.
`cancelled` is terminal; reviving requires a new subscription, which also keeps
the cancellation in the record instead of overwriting it.

---

## C38 · The console plan screen was showing a catalogue that no longer exists

**27 Aug 2026. Defect, found while wiring M3.**

`getPlans()` in the console fixture listed **Trial, Starter, Growth and Scale**
— the four-tier proposal replaced on 24 Aug 2026 (`15 §3` A13) — with rows for
*events per month*, *storage* and *SSO and SCIM*, none of which are entitlement
keys in the schema. Every figure was defensible when it was drawn and none was
true once the plans were confirmed.

The tenant-facing `getSubscription()` fixture had the same problem, naming a
"Growth" plan, as did the invite form's seat warning.

All three now read the live catalogue, with the designed fixtures kept behind
the review bypass. This is the cost of a fixture outliving the decision it was
drawn against, and it is the second time this pass (the first was the invite
form) — worth watching for in the remaining seam functions, which still serve
designed data for M4a and M5 surfaces.

**Also corrected:** `getLiveSubscription` reads the same
`getEntitlementSnapshot` the guard reads. A separate display query would be a
second source of truth, and its failure mode is the worst kind — a customer
reading "6 of 10 seats" while the API refuses their seventh invitation, both
numbers defensible, neither identifiable as the wrong one.

---

## C39 · Usage reconciliation reports; repairing is a separate, attributed act

**27 Aug 2026. Implementation of `08 §3` · `05 I-13`.**

> "A reconciliation job runs nightly, rebuilds each counter from its source
> rows, and alerts on divergence rather than silently correcting it. Silent
> correction hides the bug that caused the drift."

`scripts/reconcile-usage.ts` implements exactly that. Default behaviour is
report-and-exit-non-zero. `--repair` corrects, and requires **both**
`--reason "…"` and `--actor <platform-admin-uuid>`.

**Why the actor is required.** The first version passed `null` and the insert
refused it: `platform_audit_log.actor_user_id` is NOT NULL. The two shortcuts
available at that point were making the column nullable, or attributing the
write to whichever platform admin the script could find. Both are worse than
asking — an audit row reading "corrected by nobody" cannot be followed up, and
one naming an admin who was asleep is actively misleading. The id is verified
against `platform_admins` before anything is written, so a typo fails loudly
rather than recording a correction against a stranger.

**Counter definitions are the specification.** `seats` counts active members
**plus pending invitations**, per `08 §2`. A reconciliation that counted only
members would "correct" every tenant with an outstanding invitation down to a
wrong number, nightly, and look like it was working.

The three Phase 2 seams (`channels`, `kb_documents`, `conversations_monthly`)
are listed with a `null` truth function rather than omitted, so adding the
feature means writing the query here rather than remembering this file exists.

**It found real drift on its first run** — two invitations left behind by a
test whose teardown hook had timed out before `hookTimeout` was raised. Not a
product defect, and a fair demonstration that the job works.

**Also corrected:** the seed set `usage_counters.peak_value` to its column
default of 0 alongside a `current_value` of 1. A high-water mark below the
present value is incoherent; the seed now seeds it and takes `greatest()` on
conflict.

---

## C40 · Console subscription controls live in their own actions file

**27 Aug 2026. Structural.**

Every action that changes a plan, moves a subscription between states or grants
an override reaches an operation that bypasses Row Level Security.
`(console)/actions.ts` is a mix of interface preferences (`setDensity`,
`setNavState`) and honest refusals, and a reviewer asking "what in the console
can act on another tenant's record" should not have to read past a density
toggle to find out.

`subscription-actions.ts` holds one privilege level, so the answer to that
question is a file listing.

Each action resolves the platform session **itself**, via
`currentPlatformSession`. A Server Action is a public endpoint with a generated
name — it is not protected by the page that imports it, and anybody who can
reach the application can post to it. The actor is therefore resolved from the
platform cookie on every call, and the check is the same one the console pages
make: a live platform session **and** a `platform_admins` row.

---

## C41 · `sessions_modify` had the support carve-out on the wrong branch

**27 Aug 2026. SECURITY DEFECT, found by writing the M4 tests.**

`01 D-13` lists three permanent carve-outs on support mode. The second is that
a support session cannot extend its own timeout. `02_identity.sql` carried a
comment saying exactly that — on the wrong half of the condition:

```sql
using (
  user_id = app.current_actor_id()
  or (
    kind = 'support' and tenant_id = app.current_tenant_id()
    and app.current_role() = 'owner'
    and not app.is_support_session()   -- a support session cannot extend itself
  )
)
```

The guarded branch is the one letting an **owner** revoke a support session in
their workspace. The first branch was unguarded — and a support session's
`user_id` **is** the platform admin who opened it, who is `current_actor_id()`
while inside. So `user_id = app.current_actor_id()` matched the session's own
row, and a support session could run:

```sql
update sessions set expires_at = now() + interval '8 hours' where id = <itself>
```

turning the thirty-minute ceiling in `09 §3` into whatever it liked, silently,
with nothing in the tenant's log to show for it.

**Resolution.** The exclusion now applies to the holder as much as to anyone
else: while `app.support_mode` is on, no support row is writable by anybody.
The console's own extend and exit still work — they run through `asService`,
outside any support context, and are audited into the tenant's log, so a
renewed ceiling is visible to the customer rather than invisible. A platform
admin's own `kind = 'platform'` session is untouched, because the exclusion is
scoped to support rows.

**Exposure: none.** The only support sessions that have ever existed are the
ones these tests created. The defect predates any support session being
mintable at all — `startSupportSession` wrote a cookie and no row until this
milestone.

**Why it was not caught earlier.** The generated isolation suite covers
`sessions` under case 7 ("an agent cannot modify a table restricted to owner
and admin"), which acts as an *agent*. Nothing acted as a support session
against its own row until `support-mode.test.ts` existed. Cases 9 in the
generated suite tests support WRITES, but against a row belonging to the
tenant — not against the session row itself.

---

## C42 · `JSON.stringify(...)::jsonb` stores a jsonb string, not an object

**27 Aug 2026. Defect in `scripts/reconcile-usage.ts`.**

postgres.js serialises an object to `jsonb` itself. Stringifying first and
casting stores a jsonb **string** — `'"{\"key\":\"seats\"}"'` — which renders
as the right data in a table view and is unqueryable with any jsonb operator.
An audit trail that looks correct and cannot be searched is worse than one that
looks wrong.

Found because the support-mode tests hit the identical mistake and failed
loudly on it. Both now pass the object; the script uses `sql.json()`, which is
the typed way to say it. Verified: `before->>'currentValue'` returns `9`.

The Drizzle call sites were never affected — Drizzle handles `jsonb` columns
correctly — so this was confined to the two raw postgres.js writers.

---

## C43 · The isolation panel reported a figure nobody had checked

**28 Aug 2026. Defect, on the console's most load-bearing claim.**

`getIsolationStatus()` returned a hardcoded literal:

```ts
const ISOLATION: IsolationStatus = {
  tablesTotal: 18, tablesPoliced: 18,
  crossTenantAttempts30d: 0, crossTenantRefused30d: 0,
  lastRun: '12 Aug, 03:00',
};
```

The real count is **15**. The eighteen came from `06 §4`'s prose ("roughly
eighteen tenant-scoped tables") rather than from the schema, and the file's own
comment said as much while presenting it as fact. The timestamp was a literal.

This sits under the console navigation and on the health page, and it is the
one number in the product that speaks to the guarantee the engagement is sold
on. It is the worst possible place for an unverified figure.

**Resolution.** `getLiveIsolationStatus()` runs the same catalogue
introspection `scripts/check-policies.ts` runs in CI, so the console and the
build cannot disagree about what is policed. Verified: both report 15/15.

**"Last run" is now, and that is better rather than a compromise.** A CI
timestamp answers "did the suite pass when it last ran", which decays from the
moment it is written — a policy dropped by hand at noon leaves a green 03:00
badge until the next nightly. Sheet 11 wants isolation state "beside uptime,
not buried in CI"; a check that runs when you look at it is more nearly that.

**Two figures are deliberately still zero, and labelled.**
`crossTenantAttempts30d` and `crossTenantRefused30d` require instrumenting the
application to notice when a scoped query returned fewer rows than an unscoped
one would have — RLS filters silently, by design (`06 §4`: "RLS FILTERS RATHER
THAN ERRORS"). That is real work and not this milestone's. Sheet 11 asks for
refusals to be counted separately from failures, and that distinction is
honoured by inventing neither.

**The same discipline applied to the overview.** The fixture carried revenue,
conversation volumes and uptime percentages no table produces. `getLiveOverview`
reports the four counts this database can answer — workspaces, memberships,
attention, open support sessions — and leaves vitals empty rather than deriving
a plausible uptime from the wrong rows. A number without a source is trivia;
on an operations screen it is a number somebody will act on.


---

## C44 · CI had never run a single job

**28 Aug 2026. The most consequential finding of the fidelity audit.**

`.github/workflows/ci.yml` ran `pnpm install --frozen-lockfile`. `package.json`
declared `packageManager: pnpm@9.15.4`. The repository contained only
`package-lock.json` — no `pnpm-lock.yaml` existed. pnpm exits immediately when
asked for a frozen install with no lockfile, so **every job failed at the
install step, and always had.**

Consequences, stated plainly:

- The isolation suite that `04 §11` and `11 §5` call "blocking with no override
  path" had **never executed in CI**.
- The policy check that `06 §2` says "fails the build" had never run either.
- `pnpm lint` had never run, and reported 13 errors when it finally did — all
  from the `conduit-appshell-boilerplate/` directory, excluded from tsconfig
  but not from eslint.
- `pnpm format:check` had never run, and reported 229 files.

Everything still passed, because it was all run by hand throughout. But the
enforcement everybody was relying on was theatre. Several other findings in
this pass are the same shape — a control that is described, believed, and
absent: rate limiting (C45), Sentry (C46), the health endpoint (C47).

**Resolution.** `pnpm-lock.yaml` committed, `package-lock.json` removed, the
boilerplate deleted, the codebase formatted. The workflow gained a **build**
job — a type error is a failed build per `11 §6` rule 19, which is only true if
the build runs — plus reconciliation in report mode and a dependency audit. Its
header no longer promises contract tests, Playwright and an axe scan, none of
which existed as jobs; those are recorded as outstanding in `04 §9` instead.

**The dependency audit found 7 advisories, 2 of them high, and 6 of the 7
arrive through `@sentry/nextjs`** — the dependency that was installed and never
used. Rather than weaken the threshold or drop a dependency the architecture
calls for, four transitives are pinned in `pnpm-workspace.yaml`. They are
declared in **both** `package.json` and `pnpm-workspace.yaml` on purpose: pnpm
10 stopped reading the former and says so only as a warning, so a project
pinned to 9 that is later built with 10 would silently lose its pins.

---

## C45 · Rate limiting was defined and never applied

**28 Aug 2026.** `CACHE_USES.rateLimit` and `CACHE_TTL.rateLimit` had been in
the cache module since it was written, listed as one of the four scoped uses
ADR-006 permits. **Nothing ever called them.** `04 §1` places rate limiting at
the edge, before session resolve; there was nothing there.

The exposure was every endpoint reachable without a session. Supabase applies
its own limits to sign-in and password reset, which is why this was not
catastrophic — but invitation acceptance was unprotected, and an attacker could
burn a real user's Supabase budget at whatever rate they liked.

Now applied to five entry points, with the tightest budgets on the two that
send email or create an account. `cacheIncrement` is new: get-then-set is a
read-modify-write, and two requests arriving together both read the same count
and both write the same number back, so a limit of five admits ten under
exactly the load that makes a limiter worth having.

**It fails open, and a test enforces that.** `CACHE_DISABLED` is a supported
mode with a CI job proving the product works in it. A limiter that failed
closed would take sign-in down whenever Upstash blinked. Verified by making it
fail closed and watching that one case go red.

---

## C46 · Sentry was a dependency and was never initialised

**28 Aug 2026.** `04 §12` named Sentry as the error tracking service and the
tracker listed error tracking as wired. Nothing imported it: no
`instrumentation.ts`, no configuration, no DSN. Every production exception
would have gone nowhere.

Now initialised for all three runtimes, with `redact()` — the same function
that guards the logger — applied to event payloads. Headers are **dropped**
rather than redacted, because `redact` works on known key names and the header
carrying something is the one nobody thought of. Query strings are replaced
entirely: recovery and invitation tokens travel in them. The user object is
reduced to an opaque id.

**Session replay is deliberately off.** It would record a customer's workspace
and ship it to a third party, and `01 D-09` makes Brian a processor for his
tenants' data.

---

## C47 · There was no health endpoint

**28 Aug 2026.** `04 §12` names an uptime service and `12` makes a status page
an M6 deliverable, but nothing existed to poll. A monitor pointed at `/` would
report the marketing page rendering — true, and useless, because it renders
perfectly well while the database is unreachable.

`GET /api/health` reports database reachability and cache status, and
distinguishes them: the database is required and returns 503, the cache is
optional by design (`08 §6`) and its absence is reported without failing.

**It does not read `drizzle.__drizzle_migrations`, though that was the first
attempt.** The application connects as `alcassa_app`, which has no USAGE on the
`drizzle` schema — deliberately, as a least-privilege role that owns nothing.
The check returned "permission denied" and would have reported a healthy
database as unreachable, paging somebody. Granting the app role access to make
a probe work would be widening a privilege boundary for convenience;
`to_regclass` needs no privilege at all.

---

## C48 · Screens still showing designed data after their milestone closed

**28 Aug 2026.** M4 was marked complete while its primary management surface —
the workspace list and detail — still rendered fixtures, with real tables
behind them. So did the support-session register and both audit logs.

Same class as the isolation panel (C43), and worse: the numbers are
per-customer, so an operator comparing them against what a customer reported
would have found them plausible and wrong.

All now live. **The fields with no source are stated rather than filled** —
`monthlyValue`, `invoices`, `billingStats`, `events` and `eventsLimit` have
nothing behind them, because `08 §1` puts billing out of scope and there is no
events table. A plan carries a price, but a price is not revenue.

---

## C49 · `member.joined` was defined and never emitted

**28 Aug 2026.** Definition of done condition 3: every write produces an audit
entry. Inviting, removing and role changes were audited; **accepting was not.**
The write moved into `app.accept_invitation` when the acceptance flow was
repaired (C31) and the audit row did not move with it, so a workspace's
activity log showed an invitation going out and then nothing.

Written inside the same function as the membership, so they cannot come apart.

**Also split `SUPPORT_ENTERED`.** It was emitted for entering, extending and
merely reading a session, so the tenant's "show me every time you looked"
filter over-counted — reporting one visit as three or four because every
console page load that resolved the session logged another entry. A
transparency feature that inflates its number is less trustworthy, not more.
`SUPPORT_EXTENDED` and `SUPPORT_SESSION_READ` are now distinct.

---

## C50 · The token layer was bypassed in 110 places

**28 Aug 2026.** `03 §2` makes the token system mandatory. 110 raw Tailwind
colour classes — `text-emerald-600`, `bg-amber-500`, `text-rose-400` —
bypassed it, concentrated in the marketing and access components.

Mapped **by meaning rather than by hue**: `text-emerald-600` is not "green", it
is "this succeeded", and `--success-fg` was already exposed as `text-success`.
Replacing colour-for-colour would have kept the violation and changed only its
spelling. Shades were dropped deliberately — 600 and 700 both mean success, and
the palette has one success colour with measured contrast (`03 §17`).

One subtlety worth recording: `bg-emerald-500/15` maps to `bg-success/15`, not
`bg-success-bg/15`. `--success-bg` is already the light end of the scale, so
applying 15% opacity to it produces something close to the page background and
the chip loses its fill entirely.

**Also wired `PasswordQualityMeter`**, which had been built and imported
nowhere. It now shows the *same* rules `POST /v1/auth/password/reset` enforces,
before submission rather than after — a meter encouraging a symbol the server
does not require is theatre, and one omitting a rule it does require is a trap.

---

## C51 · Dead code and dead tooling removed

**28 Aug 2026.** Housekeeping, recorded because each one was a small lie about
what the project contains.

- `conduit-appshell-boilerplate/` and its zip — 2.1MB of a starter kit this
  project outgrew, the source of all 13 lint errors.
- `src/lib/result/` — 38 lines, zero imports anywhere.
- `pino` — a dependency; the logger is hand-rolled and imports nothing.
- `@playwright/test` and the `test:e2e` script — installed with no config and
  no `tests/e2e` directory. Removed rather than left as a script that fails.
- The `storybook` script — storybook was never installed.

**Kept, with reasons:** `CredentialReveal` (built for M5 and documented as
such), the six `console/tenant/*Tab.tsx` components (now reachable through the
wired detail drawer), `StatusDot` and `Spinner` (small primitives with obvious
future use, and removing them would be churn).

**A finding that turned out to be wrong:** the audit flagged "`error.tsx` at
only 3 segment roots". That is correct and fine — `(marketing)` and `(access)`
inherit the root boundary, which is how Next.js route groups work. Recorded so
the next audit does not re-raise it.

---

## C52 · Phantom dependencies, and the deploy they broke

**28 Aug 2026. Found by Vercel, minutes after the pnpm migration shipped.**

The production build failed:

```
./drizzle.config.ts:1:35
Type error: Cannot find module 'dotenv' or its corresponding type declarations.
```

`dotenv` was imported by six of our own files — `drizzle.config.ts`,
`vitest.config.ts`, the three `scripts/`, and the seed — and had **never been
declared in `package.json`**.

It worked under npm because npm's flat `node_modules` hoists every transitive
dependency to the top level: `drizzle-kit` depends on dotenv, so dotenv
appeared at the root and anything could import it. That is a *phantom
dependency*, and pnpm's linked layout refuses them by design — which is the
main reason to use pnpm at all.

So the migration did not cause this. It **revealed** a latent fault that had
been in the repository for months, at the first moment a clean install ran.

**A scan for others found a second:** `server-only`, imported by 34 files under
`src/lib` and `src/modules`, also undeclared. It survived only because Next's
bundler aliases it internally — and it is why `vitest.config.ts` needed an
alias stub to run those files at all. Both are now declared: `server-only` as a
dependency (runtime modules import it), `dotenv` as a devDependency (config,
scripts and tests only).

**`scripts/check-phantom-deps.ts` and `pnpm check:deps` now run in CI**, in the
`static` job, so the next one fails in ten seconds rather than after a push to
production. Verified by removing `dotenv` from `package.json` and confirming
the check reproduces the exact failure Vercel reported.

The first version of that scan matched `from '…'` inside comments and string
literals, and reported `not signed in` and `99.82% because it wobbles every
third day` as missing packages. It is anchored to line-initial import
statements now: a checker that cries wolf is a checker somebody switches off.

---

## C44 · Document 03 specified a design system that no longer exists

**12 Sep 2026. The document was wrong; it has been rewritten.**

`03-design-system.md` opens with *"this document is the authority on every
visual decision. If code disagrees with this file, the code is wrong."* It then
specified, in §2, a palette that is defined nowhere in the codebase:
`--copper-*`, `--graphite-*`, `--sheet-*` and a full `[data-theme='dark']`
inversion. None of them resolve. `tokens.css` states in its own header that the
client identity handoff *"supersedes the previous token system in full"*, and it
does — the shipped system is `--brand-blue #043AE1` on `--brand-cream #FBFDF4`
with `--brand-orange #FA5505` as a budgeted accent, one theme, no inversion.

Four further contradictions, all of them cases where the document forbade
something the product ships deliberately:

| §20 forbade | The product ships | Resolution |
| --- | --- | --- |
| Gradients | The chrome tier's navy-into-obsidian sweep | Permitted on the chrome tier only |
| Glassmorphism | `--glass-*`, on layered surfaces | Permitted, budget of three composited |
| Shadows on cards | `--shadow-sm` on panels | Permitted; `--shadow-lg` reserved for overlays |
| Radius above 6px | The floating rail at 20px | Permitted for objects, not for ruled panels |

§22 stated *"there is no brand"* and specified a placeholder mark in
`--copper-600`. The identity exists and `docs/BRAND.md` is its authority.

Four passages also carried a find-replace artefact from the Conduit → aLcassa
rename — "the copper aLcassa", "a aLcassa passing through a boundary" — in `03`
and in `13`.

**What was kept.** §5 to §19 and §21 were reviewed and retained; their token
names were swept onto the shipped semantic tokens. The typography system, the
one-weight rule, the space and radius scales, motion, the component tiers,
forms, the data grid, accessibility and print were all still accurate.

**What was added.** §4a (the accent budget) and §4b (the tenant accent's four
surfaces) exist because `globals.css` already cited both by those numbers and
neither section existed. §23 (the chrome tier), §24 (the chart contract) and
§25 (scroll surfaces) document behaviour that was built and undocumented.

**What is NOT drift.** The copper-on-vellum vocabulary survives in the
presentation tier — the delivery tracker and the document viewer — because that
surface addresses the client rather than an operator, and the drafting-document
voice is correct for it. The tone names there are labels mapped onto current
tokens; no superseded token is resolved. The document now says so rather than
leaving it to look like a leftover.

---

## C45 · `--spacing-0: 2px` redefined the zero step across 293 usages

**11 Sep 2026. The line is removed.**

In Tailwind v4 an `@theme` key is a slot in a namespace the framework owns, not
a variable being declared. `--spacing-0: 2px` therefore redefined the **zero
step** of the spacing scale and every utility built from it: 45 `inset-0`, 148
`p-0`/`m-0`, 85 `top/left/right/bottom-0`, 13 `gap-0`. All 293 were written to
mean nothing and rendered 2px.

It presented as a 2px unblurred strip on every side of every modal backdrop,
which reads as a scroll-lock or containing-block problem and is neither. Two
fixes built on that theory — a `fixed inset-0` shell root, and an `html`
background — were wrong and were reverted. The cause was found in one look at
the computed box model the user supplied.

Verified in the **built** CSS (`.inset-0{inset:0}`, no `-0` utility emitting
2px), not by reading the source. The trap and its four rules are now `03 §19`.

`--s-0: 2px` in the Tier 0 compat block is NOT the same defect and stays: it is
a plain custom property aliased by nothing. The defect was mapping a compat
name into a Tailwind namespace.

---

## C46 · Two components named `Badge`, on two grounds

**12 Sep 2026. Both kept, both documented.**

`components/feedback/Badge.tsx` carries the closed `tone` set from `03 §14` and
renders on the cream page. `components/primitives/Badge.tsx`, added during the
interface pass, takes an open `intent` and renders on the chrome tier.

They are not duplicates: the chrome tier needs lightened status steps for the
same reason `--chrome-action` is white rather than `--blue-500` — the page's
muted status inks are unreadable on obsidian. The new one arrived carrying six
hardcoded hex values, which is the defect `tokens.css` names in its own header.
Those are now `--chrome-{success,warning,danger,info,brand}` plus badge and
pill surface tokens, and the component reads them through `color-mix` so the
rim and glow tints are tokens too.

The naming collision is real and is the residual risk: two components named
`Badge` distinguished only by import path. Renaming one is a coordination
decision rather than a technical one, and is carried forward rather than taken
unilaterally while a second agent is editing the same tree.

---

## C47 · The console's AI rules screen was drawn against a model the schema does not implement

**12 Sep 2026. The schema wins; the screen changes shape in `17 §7`.**

`RulesModel` in `lib/console/data.ts` describes three groups of boolean
toggles, each with a `locked` flag, an `on` state and a per-group `authority`
of enforced / floor / default.

`master_ai_rule_versions.content` is a `RulesDocument`: six fields, five of
them prose and one a list — `tone`, `responseGuidelines`, `businessInformation`,
`escalationInstructions`, `prohibitedTopics`, `customInstructions`. There are no
toggles and no groups. The **tenant-side** editor already speaks this
vocabulary, with per-field lock and provenance.

So the console and the tenant application were describing the same rule set in
two incompatible shapes, and only one of them matches the table.

**Resolution.** `getLiveMasterRules()` returns the document, its version number
and status, and up to twenty historical versions. The console page is rewritten
in Stage 3 to render fields rather than toggles, which also brings it into line
with the tenant editor — the same rules described the same way on both sides of
the inheritance boundary, which was the point of the feature.

**What is genuinely lost.** The toggle model carried an idea the document does
not: that `locked` and `on` are different properties, so a safety floor renders
on a neutral track rather than as an enabled switch somebody could believe they
turned on. That distinction is kept — it becomes a locked FIELD rather than a
locked toggle, and `MasterRuleField.locked` carries it.

**What was already wrong and is now visible.** The fixture reported version 24
propagating to 47 workspaces, and `foundation.ts` claimed
"locked-versus-enabled toggles, real-time propagation to 47 workspaces" as a
built item. Publishing moves a pointer on an append-only table; it is not
propagation, and the toggles were never built. Both are corrected.

---

## C48 · `platform_admins` has no role column, and no owner flag

**12 Sep 2026. The roster reports what the table holds.**

The admins screen was drawn against `AdminRole = 'owner' | 'platform_admin' |
'support'`. The table carries no role: it has `display_name` and three
capability booleans — `can_suspend_tenants`, `can_edit_master_rules`,
`can_enter_support_mode` — and `resolvePlatformCore` gives every platform admin
`role: 'owner'` in the RLS context regardless.

`getLiveAdmins()` therefore **derives** a label from the capabilities and says
so: full capability is `platform_admin`, anything narrower is `support`.

**`owner` is never derived.** The available shortcut is to call the earliest row
the owner. The earliest row is the earliest row. Treating creation order as
authority is the same shape of defect that put "18 of 18 tables protected" on
the isolation panel when the real figure was fifteen, on a screen read for the
same reason this one is.

Three further fields have no source and are reported as absent rather than
filled:

| Field | Why | Rendered as |
| --- | --- | --- |
| `mfa` | Lives in `auth.users`, behind the admin client, which is lint-guarded because it bypasses RLS | `null` → "MFA unknown", in tertiary ink, never amber |
| `grantedBy` | Not stored | `—` |
| Pending invitations | `invitations` is tenant-scoped and cannot express platform access | An empty panel that states why |

`mfa` changed from `boolean` to `boolean | null` for this. Rendering unknown as
"off" would put an amber warning against a colleague who may well have it on,
and an amber chip on a security screen is a figure somebody acts on.

---

## C49 · The dead-control census, and what it actually found

**12 Sep 2026. 29 reported, 25 real, 0 remaining.**

Four of the twenty-nine were false positives: Radix `Trigger asChild` and
`Close asChild` wrappers, where the handler sits on the parent rather than on
the button. The census script now looks up one line before reporting.

**`17 §6.2` was optimistic and is corrected here.** The plan estimated twelve
controls that could simply call an existing audited operation, on the strength
of `setTenantStatus`, `assignPlan`, `grantOverride` and the rest being built.
They are built, and they are already wired — through `WorkspaceActions` and
`subscription-actions.ts`. The dead controls on the tenant tabs are different
operations, and most of them are ones the console **should not** perform:

| Control | Why it is not wired |
| --- | --- |
| Invite Member, Member actions | Membership changes happen inside the workspace, through a logged support session. `09 §4` |
| Configure channel, Reset override | Same ceiling: a change inside a customer's workspace |
| Export a workspace's activity | Same ceiling, and more sharply — this is their log |
| Add/Edit AI rule override | A workspace's own rules are theirs. The platform sets the floor, on `/platform/ai-rules` |
| Connect channel, Ping channel | The channel runtime is Phase 2. The adapter contract exists; nothing sits above it |
| Retry Charge, Update payment, Tax statement | No payment gateway in Phase 1. Revenue already states this |
| Invite admin, Revoke invitation | `invitations` is tenant-scoped. Platform access is granted directly |
| New plan | Catalogue and entitlement changes are migrations in Phase 1 |
| Create/Revoke platform API key | Platform-level credentials are not a table |

Each of these is now `disabled` with the reason on the control. **The stated
reason is the part that makes it acceptable**: a greyed-out button with no
explanation is a dead control that has also stopped admitting it.

**What was wired:**

- **Four export buttons → one route.** `/api/platform/export/[resource]`, a
  closed catalogue, admin-gated, audited with `usedServiceRole: false` because
  it reads through RLS like anything else. `recordPlatformAction` is new and is
  the only other function permitted to write `platform_audit_log`.
- **Profile.** Renaming yourself, ending one session, ending every session but
  this one. Three real writes on a screen that had none.
- **Audit stream.** "Load older entries" now reveals more of the set it already
  holds, and says how many remain. The label no longer implies a fetch.

**One control was REMOVED rather than disabled.** The per-admin kebab menu: a
menu with nothing in it is the case a disabled state cannot rescue, because the
affordance itself is the promise. The row now shows the date access was
granted, which is the fact a reader of an access register wants.

### Two fake saves, both corrected

Neither was in the census, because both had handlers. They were worse than the
dead buttons.

`ProfilePanel.save()` set "Saved." on a timer and wrote nothing. It now calls a
server action and reports what happened.

`SettingsPanel.save()` did the same, on a page whose own lede warns that a typo
there reaches every workspace's customers. Platform settings have no store
(`17 §10.3`, deferred), so the control is now disabled and the footer says
"Not yet saved anywhere" instead of turning green. **Being told a change landed
and finding the old value later is worse than a button that does nothing**, and
on this page it is worse by a wide margin.

### C47 addendum · the toggle model is deleted, not left unreferenced

**12 Sep 2026.** `RulesEditor.tsx` (517 lines), and `Rule`, `RuleGroup`,
`RulesModel` and `getMasterRules()` in `lib/console/data.ts` (167 lines), are
removed.

Leaving them in place was the tempting option: the editor is careful work, it
renders well, and deleting it costs something. It was the wrong option. A read
model for a shape the database does not have is not dead code, it is a **trap**
— the next person who needs master rules finds a complete-looking model with a
matching component and builds against it, and discovers the mismatch after the
work rather than before it. Git history keeps both.

The distinction worth preserving from the toggle model survived the change:
`locked` and "has a value" are different properties. A locked field is a floor
a workspace may tighten and never loosen; an empty field means the platform
says nothing and the workspace decides alone. Rendering an empty field as
"off" would claim the platform had made a choice it has not made.
`rules/RuleFields.tsx` carries both states and the reasoning.

Two figures on the inheritance panel also went, and their absence is the
point. "Workspace overrides: 12 active" and "conflicts blocked: 4 this month"
were drawn numbers with no source. Overrides become countable once tenant rule
rows exist; blocked conflicts are **not counted anywhere at all** — the
rejection happens at save time in the tenant's own console and nothing records
it. The screen that explains the platform's authority over a customer's
assistant is the worst place in the product to invent a figure, so it now says
they are not counted.

---

## C50 · The overview's queue and rail, refined · 12 Sep 2026

The first section taken through `18`, the refinement playbook — which was written
by doing this and records what the work actually needed.

### `StatusBadge` held colour; it now reads tokens

Forty-five raw Tailwind palette classes and twenty-one `rgba()` literals, one
set per tone per ground. The cost was not tidiness: it put a **second green in
the product**. A badge reading "healthy" in Tailwind's emerald, beside a meter
reading healthy in `--success-fg`, is two greens for one meaning.

Six tones now resolve through Tier-3 `--badge-*`, themselves derived from the
semantic scale. **The appearance changed and the direction is the point** —
Tailwind's emerald, rose and amber are more saturated than this product's muted
status scale, so the badges sit down slightly against the cream ground, which is
the identity rather than a regression. A hotter register is now `--badge-tint`
and `--badge-edge`, two numbers, rather than a rewrite.

The icon stroke went from 2.2 to 1.75. At the system's weight ceiling of 500, a
2.2 glyph was the loudest thing in a 20px chip.

### `PlatformTelemetry` invented its own data

A `METRIC_SPECS` map held every service's title, SLA target, gauge ratio and four
detail rows — "p50 latency 44ms", "Edge cluster NBO-1", "Twilio SMS Gateway
99.1%". None had a source. Three defects travelled with it:

| Defect | Consequence |
| --- | --- |
| Keyed by the vital's `label` | Renaming a service silently dropped its whole spec |
| Live reader returns `vitals: []` | A signed-in operator saw an **empty rail with no empty state**, while the review bypass saw four detailed services |
| `rgba(73,128,252,.1)`, `#c084fc`, `text-emerald-500` | Raw colour, including a second green in the footer |

`Vital` went from three fields to eleven, shaped as a probe would return it. The
fixture holds the designed values; `lib/observability` fills the same shape at M6
and the component does not change.

**The footer is derived rather than declared.** It read "9 consecutive days
incident-free · 99.98% composite SLA" — neither figure had a source. It now
counts the vitals it was handed, which is a smaller claim, a true one, and one
that cannot drift from the rows above it.

Two accessibility defects went with the rewrite. Collapsed details used
`max-h-0 opacity-0`, leaving four services' rows in the accessibility tree and
the tab order — `hidden` now, which also removes the 120px clip. And the value
was `v.value.split(' ')[0]`, which mangles any value containing a space; the
figure and its unit are two fields, set at two sizes.

### `LastActions` was ninety inline lines in `page.tsx`

Extracted to its own server component, tokenised, and given the empty state it
never had. A platform on its first day has done nothing; an empty panel with no
words on the one surface whose claim is "an action missing from this log did not
happen" reads as a failure to load.

### The disabled reason truncated, twice

Shipped inline beside the button to keep card heights equal. At the real column
width it cut mid-sentence — "No payment gateway in Phase 1 — this reports, it
does …" — and a `title` does not rescue it: a reader without a pointer gets
nothing.

**Uniform row height was the wrong thing to protect.** The cards already vary
with how their prose wraps. The reason moved onto its own line with the card's
full width, and the fixture's sentences were restored to their full length.

### Typography, recorded late

Both non-display faces changed during the front-end pass and `03 §5` still named
the old ones. **UI: Libertinus Sans → DM Sans** — a book companion is not drawn
for a 12px interface label, and the interface wants two weights where Libertinus
Sans has one. **Data: Fira Code → Lilex** — both have tabular figures, but Fira
Code's terminal drawing reads as "code editor" beside a book serif, and mono
carries every timestamp, audit action, count, slug and meta line on the screen.
The weight ceiling of 500 is unchanged and is why either swap was safe.
