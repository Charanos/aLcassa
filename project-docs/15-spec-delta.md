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

### A3 · The presentation surface occupies `/`

Temporary. The marketing page specified in `02 §2` and `10 §2` is intact at
`/product`. At launch the two swap back. Recorded here so it is not discovered
later.

The client-facing surface deliberately omits document 01, which declares itself
an internal working document, and the commercial terms, which belong in the
signed brief rather than on a shared link. Both are filtered by an explicit flag
in `src/lib/presentation/documents.ts` rather than by being forgotten.

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
