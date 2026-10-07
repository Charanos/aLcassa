# 03 · Design System · aLcassa

**Consumer:** Design and Code. This document is the authority on every visual decision. If code disagrees with this file, one of the two is wrong and the disagreement gets resolved rather than tolerated.
**Machine-readable twin:** `src/app/tokens.css`. Every value in §2 lives there; this document explains why it has that value. A token added here and not there does not exist.
**Aesthetic:** technical, warm, dense. Restraint carried by a saturated brand used in small doses.

**Rewritten 12 Sep 2026, extended 13 Sep.** §1 to §4, §20, §22 and the new §23 to §26 were rewritten against the shipped identity. The previous version specified the copper-on-vellum drafting-document system that `tokens.css` supersedes in full, and forbade in §20 several treatments the console now ships deliberately. Sections §5 to §19 and §21 were reviewed and kept. See `15 C44` for the delta.

---

## 1. The idea

This product is infrastructure. It is the layer beneath the thing the customer actually sees, and its entire job is to hold boundaries: between one tenant and another, between a role and a permission, between what a credential may read and what it may not.

Infrastructure that holds does not need to shout, and the identity is built on that. **Three laws, from the brand:**

1. **Blue is primary, in small saturated doses, never as a large fill.** `#043AE1` is the loudest value in the system. It identifies, it acts, and it never becomes a background.
2. **Navy ink on cream is the largest surface in the product.** Obsidian text on `#FBFDF4` is what a person spends their day reading. Everything else is an exception to it.
3. **Orange is the accent, and the accent has a budget of ONE per screen.** `#FA5505` marks the single thing on a surface that most deserves the eye. A second orange element on the same screen spends a budget that has already gone.

The fourth law is unstated in the brand and enforced everywhere in the code: **the chrome inverts against the page rather than against a theme.** The console's header and rail are a near-black slab because the console is an operator environment standing on a cream document — not because anything is in dark mode. See §23.

Three principles follow from the laws:

1. **Tinted surfaces carry most of the depth.** The surface ramp — base, raised, sunken, inset — does the work that elevation would do elsewhere. Shadow exists, and it is small: `--shadow-sm` on a panel, `--shadow-lg` on an overlay. Glass exists, and it is budgeted (§2, glass).
2. **Colour is functional and systematic.** A person reading a table of forty workspaces needs to distinguish six states at a glance, so colour carries state. Every colour has exactly one meaning and appears nowhere else.
3. **Weight is restrained.** Hierarchy comes from size, family switch, colour, case, space and rules. The current UI tokens use 400 and 500; 500 is the ceiling. See §5 and the later applied type tokens in §21.

### What happened to copper on vellum

The previous system — warm vellum ground, copper accent, verdigris patina, drawn as a technical drawing — was designed before the client identity arrived, explicitly so that swapping the accent would be a two-token change. The identity arrived and the swap happened. `--copper-*`, `--graphite-*` and `--sheet-*` are defined nowhere in the codebase and resolve to nothing.

Two survivals are deliberate and are not drift:

- **The tenant accent keys.** A workspace picks its own accent from ten named options, and `verdigris`, `slate`, `graphite`, `rust`, `brass`, `clay`, `moss` and `ember` are among them. They are tenant choices expressed in the current palette, not the old ramp.
- **The presentation tier.** The project tracker and the document viewer at `/project-tracker` and `/docs` still speak in `copper | ochre | verdigris | slate | oxide | graphite` tones. That surface is the client-facing delivery record rather than the product, its audience is different, and the drafting-document voice is correct for it. The tone names are labels mapped onto current tokens inside `Sheet.tsx`; no old token is resolved.

---

## 2. Colour tokens

`src/app/tokens.css` is the source of truth. It is organised in tiers, and the tier a token sits in tells you who may read it.

| Tier | Name | Holds | Who reads it |
| --- | --- | --- | --- |
| 1 | Primitives | Raw scales — `--ink-*`, `--blue-*`, `--orange-*`, status steps | Nothing. Tier 2 only |
| 2 | Semantic | Meaning — surfaces, text, borders, status, glass, accent | Components |
| 3 | Component | Per-component divergence — buttons, inputs, tables, sidebar | The component it names |
| 4 | Chrome | The inverted slab and the tenant's white chrome | Chrome components only |
| 0 | Compat | Old names mapped to new values | Migration only. Do not add to it |

**A raw hex in a component file is a defect. A Tier 1 token in a component file is a code smell. Components read Tier 2 and Tier 3, and chrome components read Tier 4.**

The one legitimate exception is a **third-party brand mark**: WhatsApp's `#25D366` and Instagram's `#E1306C` are those companies' property and are not ours to tokenise. Anything else raw is a defect.

### One theme

**There is no dark mode, and `:root` always matches.** The Tier 2 block carries no `[data-theme]` selector. The previous version of this document specified a full dark inversion; it was never built, and the "dark by design" surfaces that do exist — the console chrome, the workspace schematic node, the inverted feature slab — are constant regardless of any preference. They are listed in §23.

`color-scheme: light` is declared once, in Tier 2.

### Brand anchors

```css
--brand-blue: #043ae1;      /* PRIMARY. The dominant identifier */
--brand-orange: #fa5505;    /* ACCENT. Smallest role in the system */
--brand-navy: #17225d;      /* Deep tone */
--brand-cream: #fbfdf4;     /* Warm off-white. The page */
--brand-ink: #172a99;       /* The seventh colour: brand blue with the shout taken out */
```

The seventh is worth a sentence. It is not in the identity's swatch row, but the moodboard sets every word of its own text in it and nothing in `#043AE1`. It is the reason this system reads as restrained rather than loud.

### The semantic layer, abridged

The full list is in `tokens.css`; these are the ones a component reaches for most and the ones most often reached for wrongly.

```css
/* Surfaces — the ramp that replaces elevation */
--surface-base:    var(--ink-25);   /* the page. The brand cream */
--surface-raised:  var(--ink-0);    /* cards, panels */
--surface-sunken:  var(--ink-50);   /* table headers, wells */
--surface-inset:   var(--ink-100);  /* inputs, hover fills */

/* Text — obsidian on cream, not navy on cream */
--text-primary:    #09090b;
--text-secondary:  #52525b;
--text-tertiary:   #71717a;
--text-action:     var(--blue-500);

/* Status. Muted on purpose: these are inks for a light page */
--danger-fg:  var(--red-500);    --danger-bg:  var(--red-100);
--warning-fg: var(--amber-500);  --warning-bg: var(--amber-100);
--success-fg: var(--green-500);  --success-bg: var(--green-100);

/* The accent, with the one-per-screen budget attached to a token */
--accent-mark:      var(--orange-400);  /* fills, marks, meters. NO text on it */
--accent-mark-text: var(--orange-500);  /* when the accent carries a label */
```

`--accent-mark` and `--accent-mark-text` are two tokens rather than one because the brand orange at 400 fails contrast under text and the text-safe step at 500 is too dark to read as the accent when used as a fill. Picking the wrong one is the most common accent mistake in this codebase.

### Glass, and its budget

```css
--glass-bg:        color-mix(in oklab, var(--surface-raised) 74%, transparent);
--glass-blur:      blur(14px) saturate(1.35);
--glass-highlight: inset 0 1px 0 color-mix(in oklab, var(--ink-0) 70%, transparent);
```

Glass is permitted on **layered surfaces only**: sticky headers, the command palette, modals, popovers and cards. Never on a table row. **At most three glass surfaces composited at once** — past that the blur cost is visible on mid-range hardware and the effect stops reading as depth and starts reading as fog.

### Neumorphism, and its budget

`--neu-raised` and `--neu-inset` exist for **small interactive controls that need affordance**: segmented thumbs, switches, meter tracks, active navigation pills. **Never a full button.** A fully neumorphic button fails contrast every time, without exception.

---

## 3. The colour discipline

Colour is functional here, which makes discipline harder rather than easier. Each hue has exactly one meaning.

| Hue | Means | Never used for |
| --- | --- | --- |
| **Blue** | Interactive, brand, primary action, links | State. Blue never means "good" or "bad" |
| **Orange** | The single most important thing on this screen. Attention, at a ceiling, the accent | Failure. Orange is emphasis, not alarm |
| **Green** | Active, healthy, verified, connected, succeeded | Anything a person must act on |
| **Amber** | Pending, approaching a limit, past due, degraded | Errors |
| **Red** | Suspended, failed, over limit, revoked, destructive | Warnings that are not failures |
| **Ink** | Everything else | Any state |

Rules that keep it from decaying:

1. **One accent per surface, and the accent is orange.** A card does not carry an orange chip and an orange meter and an orange button. If it does, the surface is doing too much.
2. **State colour appears at the badge and the rule, never as a background fill on a large area.** A full-width red panel is an alarm; a row with a red left rule and a red badge is information.
3. **Every coloured element carries a glyph and a text label.** Colour is never the only carrier — for colour-blind readers, and for printed audit exports.
4. **Ordered series use one hue's ramp, never a rainbow.** See §24; a six-hue chart was built, failed a colour-blindness check and was replaced.
5. **The 100-level washes are for row selection and inline message backgrounds only.** Nothing else gets a tint.

---

## 4. Distinguishing the two applications

Brian will have both open at once. Confusing them is a real operational risk, since an action taken in the wrong context could be a support-mode write on a live tenant.

The distinction is structural, not decorative:

| | Tenant application | Platform console |
| --- | --- | --- |
| Header ground | `--tenant-chrome-bg`, white | `--chrome-bg`, navy into obsidian |
| Header text | `--text-primary` | `--chrome-fg` |
| Rail | White, pinned | The slab, floating, three states (§23) |
| Density default | Comfortable | Compact |
| Title block | Workspace name | `PLATFORM`, plus the environment name |

The inverted console chrome is the single strongest signal, it is present on every platform page at all times, it costs nothing, and it is unmissable in peripheral vision. The tenant application's chrome is white **deliberately** — not by default — for exactly the same reason.

### §4a · The accent budget

**One orange element per screen.** Not per panel, not per band — per screen.

The accent marks the single thing on a surface that most deserves the eye: the count that implies work, the meter that has reached a ceiling, the one action a person came here to take. A second orange element does not add emphasis, it removes it, because emphasis is a ratio rather than a colour.

The budget has two tokens attached to it so the rule has something to point at:

- `--accent-mark` — fills, meters, marks, rules. **Never text on it.** It is the raw brand orange at 400 and it fails contrast under type.
- `--accent-mark-text` — when the accent itself carries a label. The text-safe step at 500.

Picking the wrong one of these two is the most common accent defect in this codebase, which is why they are two names rather than one token and a note.

### §4b · The tenant accent

A workspace chooses an accent from ten named keys in `tenant_settings.accent_key`. That choice reaches **four surfaces and no others**:

1. The active navigation item's tint and its mark
2. The workspace avatar and its initials chip
3. Chart series in that workspace's own dashboards
4. The selected-row wash in that workspace's tables

It never reaches the primary action. **A tenant's colour choice must not restyle the product's primary action** — `--button-primary-bg` is `--blue-500` regardless — because a button that changes colour per workspace is a button an operator has to re-learn in every workspace. It never reaches a status colour either: a tenant cannot make "suspended" look friendly.

It never reaches the support boundary frame. See §8.

---

## 5. Typography

Three families, three roles. **Revised 12 Sep 2026** — the UI and data faces both changed, and the reasoning for each is below. The display face is unchanged.

| Role | Family | Token | Weights used |
| --- | --- | --- | --- |
| Display and headings | **Libertinus Serif Display** | `--font-display` | **400**, 500 |
| Body and UI | **DM Sans** | `--font-ui` | **400**, 500 |
| Data | **Lilex** | `--font-mono` | **400**, 500 |

### What changed, and why

**The UI face moved from Libertinus Sans to DM Sans.** Libertinus Sans is a book companion — it is drawn to sit under Libertinus Serif on a page of prose, and it does that well. It is not drawn for a 12px interface label at 90% opacity beside a 10px mono timestamp. Its x-height is low, its counters close at small sizes, and it has one usable weight where the interface wants two (400 for body, 500 for the label that starts a row). DM Sans is a UI face: open counters, a taller x-height, and a 500 that reads as emphasis without reading as bold. The weight ceiling below is unchanged — 500 is still the top.

**The data face moved from Fira Code to Lilex.** Both are competent monospaces with tabular figures; the choice came down to how they sit beside the serif. Fira Code's terminal-forward drawing — the tall ascenders, the wide letterforms, the ligature set it is known for — reads as "code editor" on a screen whose display face is a book serif. Lilex is drawn narrower and quieter, its figures hold a column, and at 10 to 12px it recedes into the role the system actually wants from mono: **a data face, not a code face**. Ligatures stay off; nothing in this product renders `!==`.

Lilex also matters more than it looks, because mono does more work here than in most products. It carries every timestamp, every audit action name, every entitlement count, every workspace slug, the pager's range readout and the meta line on every queue card. A face that is 5% too loud in that role is 5% too loud roughly two hundred times per screen.

### Two constraints, both still real

**Constraint one: the weight ceiling is 500, and there is no bold.** `--weight-light: 300`, `--weight-normal: 400`, `--weight-medium: 500`, and deliberately no `--weight-bold`. A family switch is the emphasis mechanism, not a weight jump. This survived both face changes and is the reason either was safe.

**Constraint two: Libertinus Math is not a monospace font, so it is not the data face.** The original request named it for the mono role. It is an OpenType _math_ typeface — fraktur alphabets, scaled integrals, redesigned operators — with non-uniform advance widths and non-tabular figures. In a console whose primary reading task is scanning columns, that is a functional defect rather than a taste one.

It keeps one legitimate use: **the entitlement expression display** in `§9`, where a plan limit is genuinely an inequality (`seats ≤ 15`). Its `≤`, `≥`, `∈` and `∞` are drawn properly and the browser fallback for those characters is ugly. One component, `MathExpr`, loads it. Nothing else does.

The faces are three lines in `tokens.css` and their `@import`s in `globals.css`. Nothing above the token layer knows which face is loaded, which is what made both of these changes a two-line edit rather than a migration.

### What carries hierarchy instead of weight

In descending order of strength:

1. **Size.** The scale spans 0.6875rem to 3.5rem, a 5× range doing most of the work.
2. **Family switch.** Serif against sans against mono is a stronger signal than 400 against 700 inside one family. This is the emphasis mechanism.
3. **Colour.** `--text-primary`, `--text-secondary`, `--text-tertiary` are three legible steps of prominence at identical weight.
4. **Case and tracking.** Uppercase at `0.1em` reads as a label with no weight change.
5. **Rules.** A hairline above a line promotes it. An `--accent-mark` left rule promotes it further.
6. **Space.** Isolation is emphasis.

**Emphasis inside a paragraph is a family switch or `--text-primary`, never a weight change.** Emphasis inside mono is uppercase, never a weight change.

### Type scale

Fluid where it needs to be, fixed where a console needs predictability.

| Token           | Family             | Size                          | Line height | Tracking   | Use                                                                                     |
| --------------- | ------------------ | ----------------------------- | ----------- | ---------- | --------------------------------------------------------------------------------------- |
| `--t-display`   | Serif 400          | `clamp(2.25rem, 4vw, 3.5rem)` | 1.08        | `-0.01em`  | Marketing page only                                                                     |
| `--t-h1`        | Serif 400          | `1.75rem`                     | 1.15        | `-0.005em` | Page title                                                                              |
| `--t-h2`        | Serif 400          | `1.375rem`                    | 1.25        | `0`        | Section                                                                                 |
| `--t-h3`        | Sans 400           | `1.0625rem`                   | 1.4         | `0`        | Card and panel headings                                                                 |
| `--t-lede`      | Serif 400          | `1.1875rem`                   | 1.55        | `0`        | Standfirst, empty-state explanation                                                     |
| `--t-body`      | Sans 400           | `0.9375rem`                   | 1.6         | `0`        | Default                                                                                 |
| `--t-body-sm`   | Sans 400           | `0.875rem`                    | 1.55        | `0`        | Secondary, dense tables                                                                 |
| `--t-caption`   | Sans 400           | `0.8125rem`                   | 1.45        | `0.005em`  | Helper text, timestamps in prose                                                        |
| `--t-label`     | Sans 400 uppercase | `0.6875rem`                   | 1.2         | `0.1em`    | Field labels, table headers, eyebrows, the title block                                  |
| `--t-data-lg`   | Mono 400           | `1.5rem`                      | 1.25        | `0`        | Metric values on the overview and health pages                                          |
| `--t-data`      | Mono 400           | `0.875rem`                    | 1.5         | `0`        | IDs, counts, timestamps, key prefixes                                                   |
| `--t-data-sm`   | Mono 400           | `0.8125rem`                   | 1.45        | `0`        | Dense table cells, audit rows                                                           |
| `--t-data-caps` | Mono 400 uppercase | `0.75rem`                     | 1.4         | `0.07em`   | **The mono emphasis token.** Tenant names in the frame, status codes, environment names |
| `--t-code`      | Mono 400           | `0.8125rem`                   | 1.6         | `0`        | Code blocks, JSON, curl examples in docs surfaces                                       |

Body measure caps at 70 characters. Legal and documentation prose caps at 78.

`font-variant-numeric: tabular-nums` on every number rendered in DM Sans. Lilex is already even.

### Applied rules

- Sentence case everywhere except `--t-label` and `--t-data-caps`.
- Serif is for titles, ledes and editorial passages. **Never for UI chrome, never inside a control, never below 1rem.**
- Mono is for anything a person might need to read character by character, copy, or compare across rows: identifiers, keys, timestamps, counts, status codes, JSON.
- Sans is everything else.
- **No italics anywhere.** `font-synthesis: none` globally, or the browser will fake an oblique and a bold and break the whole system silently.
- Never centre a paragraph longer than two lines.
- Every timestamp renders in mono, in the tenant's timezone, with a UTC value in the title attribute. In an audit-heavy product, an ambiguous timestamp is a real problem.

---

## 6. Space, grid, radius, elevation

8px base with a 4px half-step for optical correction only.

```css
--s-1: 4px;
--s-2: 8px;
--s-3: 12px;
--s-4: 16px;
--s-5: 24px;
--s-6: 32px;
--s-7: 48px;
--s-8: 64px;
--s-9: 96px;
```

Rhythm: within a component `--s-3`, between components `--s-4`, between panels `--s-5`, between page sections `--s-7`.

**Density is a first-class setting**, not a preference buried in a menu. Compact is the console default at 32px table rows; comfortable is the tenant application default at 40px. The toggle sits in the toolbar and persists per user.

Breakpoints: `sm 480 · md 768 · lg 1024 · xl 1280 · 2xl 1536`. Containers: `--container-prose 680px`, `--container-app 1280px`, `--container-wide 1600px`.

Radius, small throughout, because a technical drawing has square corners:

```css
--r-none: 0; /* table cells, rules, the title block, hatch panels */
--r-sm: 2px; /* inputs, chips, badges */
--r-md: 3px; /* buttons, cards, panels */
--r-lg: 6px; /* modals, sheets */
--r-full: 999px; /* avatars only */
```

Elevation, one shadow, overlays only:

```css
--shadow-sm: 0 1px 2px rgba(14, 16, 19, 0.05);
--shadow-md: 0 2px 8px rgba(14, 16, 19, 0.07);
--shadow-lg: 0 8px 28px rgba(14, 16, 19, 0.11);
```

Panels carry a 1px `--border-subtle` and at most `--shadow-sm`. `--shadow-lg` is for overlays only. Depth comes from the surface ramp: `--surface-base` page, `--surface-raised` panel, `--surface-sunken` field. Hover darkens the rule to `--border-strong`; it never lifts.

### Hatch

The one texture in the system, and it does real work. A 45° line pattern at `--text-disabled`, 1px lines at 5px spacing, rendered as a repeating linear gradient.

Used for: disabled surfaces, suspended tenant rows, unavailable capacity in a limit bar, and the region beyond a plan limit in a usage chart. It says "this space exists and you cannot use it", which no flat grey communicates as clearly.

---

## 7. Motion

The philosophy differs from a consumer product and it is worth stating: **motion confirms, it never entertains.** Brian will see the console header a hundred times a day. Anything that animates on arrival becomes a tax by Wednesday.

```css
--dur-instant: 80ms;
--dur-fast: 140ms;
--dur-base: 200ms;
--dur-slow: 280ms;
--ease-standard: cubic-bezier(0.2, 0, 0, 1);
--ease-out: cubic-bezier(0.16, 1, 0.3, 1);
```

| Moment                                   | Motion                                                                                                                                           |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Button press                             | Scale 0.985, `--dur-instant`                                                                                                                     |
| Hover on a row or card                   | Border and background shift, `--dur-fast`, no movement                                                                                           |
| Sheet, drawer                            | Slide from edge, `--dur-base`, `--ease-out`                                                                                                      |
| Modal                                    | Opacity plus 6px rise, `--dur-fast`                                                                                                              |
| Toast                                    | Rise 10px with opacity, `--dur-base`                                                                                                             |
| Sidebar collapse                         | Width transition, `--dur-base`                                                                                                                   |
| Tab and route change                     | Opacity only, `--dur-fast`                                                                                                                       |
| **Boundary frame entering support mode** | The frame draws from the corners outward, `--dur-slow`. The one deliberate moment in the system, and it is deliberate because it must be noticed |
| Metric value change                      | Cross-fade, `--dur-fast`. No counting animation                                                                                                  |

**No scroll-triggered animation anywhere. No parallax. No GSAP.** This is a console, not a landing page. The marketing page at `/` gets a single fade-in on load and nothing else.

`prefers-reduced-motion: reduce` removes every translate and every scale. The boundary frame appears instantly at full opacity, because its function is safety and it cannot be optional.

---

## 8. The signature element: the boundary frame

Every design system needs one thing it is remembered for. Here it is not decoration, it is the visual form of the product's central guarantee.

**The problem it solves.** When Brian switches into a tenant for support, he is looking at another company's data through a limited role. The brief specifies a persistent banner. A banner is dismissible in a user's attention within about ninety seconds, and it occupies the one strip of screen people learn to ignore.

**The frame.** Entering support mode inlays a 3px orange frame around the entire viewport, inside the browser chrome, present on every screen and every scroll position. It is not an overlay; layout insets to accommodate it, so nothing is ever hidden beneath it.

The top edge of the frame is interrupted by a **title block**, centred, reading:

```
    ┌──────────────[ SUPPORT MODE · ACME LOGISTICS LTD · 24:18 ]──────────────┐
    │                                                                          │
    │                        tenant application view                           │
    │                                                                          │
    └──────────────────────────────[ EXIT ]────────────────────────────────────┘
```

- Tenant name in `--t-data-caps`, in `--support-banner-fg` on the frame itself, set into a break in the frame line the way a drawing's title interrupts its border.
- A countdown to the thirty-minute inactivity timeout in mono, which turns `--warning-fg` below five minutes and `--danger-fg` below one.
- The exit control set into the bottom edge, symmetrically. One click returns to the platform view.
- The frame is `--support-banner-bg` — the brand orange darkened to the text-safe step — and it is deliberately OUTSIDE the tenant accent system. A workspace that has chosen a warm accent must not be able to make the support frame blend into its own chrome. It is a platform-level safety signal and it looks identical in every workspace.

**Why it works.** It reframes the entire screen rather than annotating it. You cannot look at any part of the interface without the frame in peripheral vision. And it borrows a real convention: a drawing sheet's border with its title block is exactly how a technical document declares whose drawing it is and under what revision.

The frame appears in exactly one other context: an environment that is not production. Staging carries the same frame in `--ink-500` reading `STAGING`, which is why the frame component takes the colour as a parameter and the two callers are the only two that exist. Nowhere else, ever. If it starts appearing on other states it stops meaning anything.

---

## 9. Component library

Sixty-four components across eight tiers. Build tiers 1 to 3 first; they block everything else.

### Tier 1 · Primitives

| Component                                 | Variants                                     | States                                                              |
| ----------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------- |
| `Button`                                  | primary, secondary, ghost, destructive, link | default, hover, active, focus, disabled, loading                    |
| `IconButton`                              | ghost, bordered                              | as above, 44px hit area minimum                                     |
| `Input`                                   | text, email, password, number                | default, focus, error, disabled, readonly                           |
| `Textarea`                                | autosize                                     | as Input, with counter when limited                                 |
| `Select`                                  | native, combobox                             | as Input                                                            |
| `Checkbox`                                | single, group                                | default, checked, indeterminate, error, disabled                    |
| `Radio`                                   | group, card                                  | as above. Card variant for plan selection                           |
| `Switch`                                  |                                              | default, checked, disabled, loading. Immediate-effect settings only |
| `Label` · `HelperText` · `Rule` · `Hatch` |                                              | Structural                                                          |
| `Spinner`                                 | sm, md                                       | Copper stroke, 900ms                                                |
| `Skeleton`                                | text, block, row, panel, metric              | See `§15`                                                           |

### Tier 2 · Structure

| Component                                                   | Notes                                                                                                               |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `Panel`                                                     | 1px rule, `--r-md`, no shadow. Header, body, footer slots                                                           |
| `TitleBlock`                                                | The drafting-sheet header: label, value, revision. Used on the console header, the audit stamp, the credential card |
| `AppShell` · `Sidebar` · `NavRail` · `NavItem` · `NavGroup` | Chrome for both applications                                                                                        |
| `PageHeader`                                                | Title, description, actions, breadcrumb slot                                                                        |
| `Tabs`                                                      | **Route-based, never state-based.** Bookmarkability is non-negotiable                                               |
| `Table`                                                     | Sticky header, hairline rows, no zebra, mono cells, pinned first column on mobile                                   |
| `DataGrid`                                                  | Console grade. See `§12`                                                                                            |
| `Modal` · `Sheet` · `Drawer`                                | Focus trapped, `Esc` closes, focus returns                                                                          |
| `Accordion` · `Collapsible`                                 | Headings are buttons, height via `grid-template-rows`                                                               |
| `Breadcrumb`                                                | Truncating, final crumb is text                                                                                     |
| `Toolbar`                                                   | Sticky filter and action bar                                                                                        |
| `SplitPane`                                                 | Audit detail, diff views                                                                                            |
| `EmptyState`                                                | Icon, one-line explanation, one action                                                                              |
| `Section`                                                   | Enforces vertical rhythm                                                                                            |

### Tier 3 · Feedback and status

| Component                      | Notes                                                                                                       |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `Badge`                        | The status taxonomy in `§14`. One component, every state                                                    |
| `Chip`                         | Filter chips, removable                                                                                     |
| `InlineMessage`                | info, success, attention, failure. Icon plus text always                                                    |
| `Banner`                       | Page-level, dismissible or persistent                                                                       |
| `Toast`                        | Bottom-right, 5s, pausable, max 3 stacked                                                                   |
| `ConfirmDialog`                | Title, one-sentence consequence, cancel then confirm. Confirm never default-focused                         |
| `DestructiveConfirm`           | Type-to-confirm. Reserved for suspension, hard delete and credential revocation                             |
| `ProgressBar` · `ProgressRing` | Determinate and indeterminate                                                                               |
| `LimitBar`                     | **Usage against an entitlement.** Filled portion, hatched remainder, the accent at 80%, `--danger-fg` at 100%. See `§13` |
| `Stat`                         | Metric with label, value in `--t-data-lg`, optional delta and sparkline                                     |
| `StatusDot`                    | Service health. Success, warning, danger, and `--text-tertiary` for unknown                                               |
| `Timeline`                     | Audit trail, version history                                                                                |
| `DiffView`                     | Before and after for AI rules and settings changes. Line-level, mono                                        |
| `Kbd`                          | Keyboard hints                                                                                              |
| `Avatar` · `AvatarGroup`       | Initials fallback in mono                                                                                   |

### Tier 4 · Overlays, menus, input kit

`Tooltip` · `Popover` · `DropdownMenu` · `ContextMenu` · `CommandPalette` · `ScrollArea` · `Portal` · `VisuallyHidden` · `FocusTrap` · `SearchInput` · `Combobox` · `MultiSelect` · `TagInput` · `DatePicker` · `DateRangePicker` · `SegmentedControl` · `PasswordField` · `CopyButton` · `FormErrorSummary` · `FieldSet` · `FormRow`

### Tier 5 · Loading, navigation, pagination

`Pagination` (numbered, compact, cursor) · `Stepper` · `InlineLoader` · `DescriptionList` · `FileDrop` (logo upload only)

### Tier 6 · Domain

| Component              | Notes                                                                             |
| ---------------------- | --------------------------------------------------------------------------------- |
| `BoundaryFrame`        | `§8`. The signature                                                               |
| `TenantSwitcher`       | Searchable, plan tier and status inline, keyboard first                           |
| `SupportModeIndicator` | Countdown, exit, inside the frame                                                 |
| `RoleBadge`            | owner, admin, agent, platform admin, support                                      |
| `PlanCard`             | Tier, price, entitlements as a list, current-plan marker                          |
| `EntitlementRow`       | Name, limit, current usage, `LimitBar`                                            |
| `MathExpr`             | **The only consumer of Libertinus Math.** Renders an entitlement as an inequality |
| `CredentialCard`       | Masked prefix, scopes, created, last used, rotate, revoke. Never a reveal         |
| `CredentialRevealOnce` | The single screen where a secret appears. Copy, download, confirm-seen, then gone |
| `ScopeSelector`        | Checkbox tree of scopes with plain-language descriptions                          |
| `AiRulesEditor`        | Textarea with version history, locked-field indicators, publish action            |
| `LockedFieldNotice`    | Where master rules are non-overridable, per `01 D-08`                             |
| `InvitationRow`        | Email, role, sent, expires, resend, revoke                                        |
| `AuditRow`             | Actor, action, entity, timestamp, expandable before-and-after                     |
| `IsolationTestResult`  | Pass and fail per table. Used at M1 demo and on the health page                   |
| `ServiceStatusRow`     | Service, status dot, latency, last checked                                        |
| `PlaceholderSurface`   | The Inbox and Billing surfaces from `02 §5`                                       |

### Tier 7 · Charts

`recharts`. Line, area, bar, composed, sparkline, and — as a documented exception — one donut. The full contract, including the one-hue ramp, the token-resolution rule and the conditions under which a donut is permitted, is **§24**. Legends and tooltips remain mandatory.

### Tier 8 · Marketing

`Hero` · `FeatureRow` · `LegalPage`. Three components. The marketing surface is one page and it does not need a kit.

### Component contract

TypeScript props, no `any`. `forwardRef`. `data-slot` attributes on internal elements. Every interactive state. Full keyboard operation. A stated `aria` contract. Both themes. A 360px layout. Empty and error states where data is rendered. Storybook covering default, hover, focus, disabled, loading, error and dark. **A component without its loading and empty stories is not done.**

---

## 10. Two surfaces specified precisely

### The credential reveal

The one screen in the product that shows a secret, and it never shows it again. `01 D-11`.

- Full-width panel on `--surface-sunken`, `--r-md`, `--accent-mark` left rule 3px.
- The key in `--t-code`, selectable, wrapping at a sensible break, with a `CopyButton` that confirms inline for 1.6 seconds rather than firing a toast.
- Below it, a `Download .env` action producing a file with the key and a comment naming the scopes.
- Below that, an `InlineMessage` in attention state: this is the only time this key will be shown.
- A `Confirm I have saved this` button, disabled until either copy or download has fired. On confirm, navigate away. The key is not retrievable from browser history because the reveal is server-rendered once against a single-use nonce.
- No screenshot deterrence, no blur-until-hover, no auto-hide timer. Those are theatre. One clear statement and one deliberate confirmation.

### The limit bar

The visual that makes entitlements legible, used on the tenant subscription page, the platform tenant detail, and the health watchlist.

```
SEATS                                                    12 / 15
├───────────────────────────────────────┤▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨▨┤
                                        ↑ 80% threshold
```

- 6px tall, `--r-none`, full width of its container.
- Used portion in `--blue-500`, remaining portion in hatch at `--text-disabled`.
- A 1px `--border-strong` tick at the 80% threshold.
- Above 80%, the used portion turns `--accent-mark` and the numeric label goes `--accent-mark-text`. This is the accent doing semantic work rather than decoration: it is the same hue the console meters, the attention standfirst and the filter chip use for "at a ceiling", so all four name the same condition in the same colour.
- At 100%, `--danger-fg`, and the bar gains a 1px `--danger-fg` outline.
- Unlimited entitlements render the `MathExpr` glyph `∞` rather than a bar. A full bar for an unlimited plan is a lie.
- Label and numerals above the bar in `--t-data`, tabular. The label left, the fraction right.

---

## 11. Iconography

**Tabler Icons**, exclusively, outline, 1.5px stroke, 16 / 20 / 24px tokens. No mixing families, no filled variants at the same hierarchy level, **no emoji anywhere including commit messages**.

Fixed semantic icons, never substituted: healthy `IconCircleCheck` · attention `IconAlertTriangle` · failure `IconAlertOctagon` · suspended `IconBan` · locked `IconLock` · machine or service `IconServer2` · tenant `IconBuilding` · support mode `IconEye` · audit `IconHistory`.

Every icon-only control carries an `aria-label` and a tooltip. Icon-only controls are limited to table row actions, console toolbars and the theme toggle.

---

## 12. The data grid

The most-used component in the console. One implementation, configured per surface.

Density toggle (32px compact, 40px comfortable), persisted. Resizable, reorderable, hideable columns, persisted per user per view. Multi-column sort with a visible order indicator. Toolbar filter chips, each removable, saved as named views. Checkbox selection with shift-range and select-all-matching showing an explicit count. Bulk action bar appearing on selection, always naming the affected count, always confirming destructive operations. Cursor pagination at 50 with a page-size select. **No infinite scroll**, because an operator needs to hold a position in a list. Row click opens a drawer rather than navigating, with a permalink for when the full page is wanted. CSV export of the current view including filters, logged as an audit event. Full keyboard: arrows navigate, `Space` selects, `Enter` opens, `Esc` clears. Every identifier and numeric column in mono with tabular figures.

Skeleton rows matching the column layout while loading, never a spinner over the grid.

---

## 13. Forms

Field anatomy: `--t-label` above, 40px control, one line reserved below for helper or error so validation never shifts layout.

Validation on blur for a field's first check, on change once it has errored, on submit for cross-field rules with `FormErrorSummary` at the top and focus moved to the first invalid field. Server errors map to fields by name; unmapped errors surface in the summary rather than vanishing.

Submission disables the button and shows loading, leaves the form readable, and **preserves every value on failure, always.** A form that clears itself on a server error is a defect.

Console editors autosave on blur with a `Saved 14:22` indicator in the toolbar. Tenant-facing forms never autosave: the owner decides when something is committed.

---

## 14. Badge and status taxonomy

One component, one language, every state mapped. A state not on this table does not get a badge.

### The three badges, and which one to reach for

**Revised 12 Sep 2026.** There are three, and they are not interchangeable. Picking the wrong one is how a product ends up with two greens meaning "healthy".

| Component | Ground | API | Use it for |
| --- | --- | --- | --- |
| `ui/StatusBadge` | the cream page | open `tone` | Any status on a normal surface. The default |
| `feedback/Badge` | the cream page | closed `tone` from the table below | Domain states that must stay on this taxonomy — tenant, subscription, member |
| `primitives/Badge` | the **chrome slab** | open `intent` | The console header, rail, and inverted heroes only |

The split between the first two is deliberate: an open `tone` is right for a status somebody is naming on a specific surface, a closed one is right for a domain whose states are enumerated in this document and must not grow by accident.

The third is a different TIER rather than a different taste. The page's muted status inks are unreadable on obsidian, so the chrome slab has lightened steps of the same five meanings — exactly as `--chrome-action` is white rather than `--blue-500`. See §23.

### The tokens

**A badge holds no colour.** `StatusBadge` carried forty-five raw Tailwind palette classes and twenty-one `rgba()` literals until 12 Sep 2026 — `bg-emerald-500/[0.08] text-emerald-800` and a per-tone shadow. That is the defect in §2, and the cost was a second green in the product beside `--success-fg`.

The six tones resolve through Tier 3:

```css
--badge-tint: 10%;   /* fill strength, every tone */
--badge-edge: 26%;   /* border strength, every tone */

--badge-{success|warning|danger|info|brand|neutral}-fg
--badge-{…}-bg    /* color-mix of the ink against --surface-raised */
--badge-{…}-edge
--badge-rim       /* one inset highlight, all tones */
```

Two consequences worth stating. **The surface is a tint of the ink**, mixed against the page ground, which is what stops a row of badges reading as stickers. And **the tint strengths are tokens**, so a badge row that reads too hot is two numbers here rather than six edits in a component.

`brand` is the accent and carries the one-per-screen budget from §4a. Its ink is `--accent-mark-text`, never `--accent-mark`: the brand orange at 400 fails contrast under type.

### Default treatment

1px rule, tinted fill, `--t-label`, `--r-sm`, 20px tall at `sm` and 24px at `md`, 8px padding, **glyph plus text always** — §3 rule 3, colour is never the only carrier.

### The state table

| Domain       | State                    | Hue                                                 |
| ------------ | ------------------------ | --------------------------------------------------- |
| Tenant       | Active                   | Verdigris                                           |
| Tenant       | Provisioning             | Slate                                               |
| Tenant       | Trial                    | Copper                                              |
| Tenant       | Past due                 | Ochre                                               |
| Tenant       | Suspended                | Oxide, and the row takes a hatch fill               |
| Tenant       | Deleted                  | Graphite, muted                                     |
| Subscription | Active                   | Verdigris                                           |
| Subscription | Trialing                 | Slate                                               |
| Subscription | Past due                 | Ochre                                               |
| Subscription | Cancelled, expired       | Graphite                                            |
| Entitlement  | Within limit             | No badge. Absence is the signal                     |
| Entitlement  | Above 80%                | Ochre                                               |
| Entitlement  | At or over limit         | Oxide                                               |
| Member       | Active                   | No badge                                            |
| Member       | Invited, pending         | Slate                                               |
| Member       | Invitation expired       | Ochre                                               |
| Member       | Suspended                | Oxide                                               |
| Role         | owner, admin, agent      | Graphite. Role is not a state                       |
| Role         | Support mode             | **Copper.** The only role rendered in the brand hue |
| Credential   | Active                   | Verdigris                                           |
| Credential   | Never used               | Slate                                               |
| Credential   | Unused 90 days           | Ochre                                               |
| Credential   | Revoked                  | Oxide                                               |
| AI rules     | Published                | Verdigris                                           |
| AI rules     | Draft                    | Slate                                               |
| AI rules     | Field locked by platform | Copper, with `IconLock`                             |
| Service      | Operational              | Verdigris                                           |
| Service      | Degraded                 | Ochre                                               |
| Service      | Down                     | Oxide                                               |
| Service      | Unknown                  | Graphite                                            |
| Audit        | Platform action          | Slate                                               |
| Audit        | Support-mode action      | **Copper**                                          |
| Audit        | Destructive action       | Oxide                                               |
| Environment  | Staging                  | Slate, in the boundary frame                        |

---

## 15. Loading

| Wait                     | Technique                                                    |
| ------------------------ | ------------------------------------------------------------ |
| Under 200ms              | Nothing                                                      |
| 200ms to 1s, known shape | Skeleton matching the real structure                         |
| 200ms to 1s, no shape    | `InlineLoader` with a label                                  |
| Inside a button          | Button loading state, label stays, spinner replaces the icon |
| Over 1s, measurable      | `ProgressBar`                                                |
| User-initiated mutation  | Optimistic update, visible rollback on failure               |

Skeleton rules: mirror the real component's structure, vary text widths 60% to 95%, **opacity pulse between 0.55 and 1 over 1400ms with no shimmer sweep**, static at 0.7 under reduced motion, never nested, never more than one screenful, identical dimensions to the real thing, `aria-busy` on the container.

One Suspense boundary per independently loading region. On the console overview, the metrics band, the watchlist and the recent-actions list each load on their own.

---

## 16. Empty, error and placeholder states

In a product whose main surface does not exist yet, these are most of what a user sees. They are designed surfaces.

| Surface                        | Treatment                                                               |
| ------------------------------ | ----------------------------------------------------------------------- |
| New tenant, nothing configured | The setup checklist from `02 §4`, which is the real first screen        |
| No team members yet            | One line, one action, no illustration                                   |
| No API credentials             | Explains what a credential is for in one sentence, then the action      |
| No audit entries               | Explains that entries appear as actions are taken. Never "nothing here" |
| Inbox placeholder              | `PlaceholderSurface`: what it will do, when, one notify action. `10 §7` |
| Billing placeholder            | Current plan read-only, how payment works for now, contact route        |
| Entitlement exceeded           | The limit, the current usage, the upgrade path. Never a generic denial  |
| Suspended tenant               | Reason if provided, contact route. Never a login loop                   |
| No membership                  | Explains the account is not attached to a workspace. Never a bare 403   |
| Search no results              | Echo the query, offer to clear filters                                  |
| Error boundary                 | What failed, a reset action, a reference code mapping to the request ID |

Error copy rules: name what happened, name the fix, never apologise for the system, never blame the user, always preserve their work.

---

## 17. Accessibility floor

Non-negotiable, checked at every milestone gate.

WCAG 2.1 AA minimum. Contrast 4.5:1 for text under 18.66px, 3:1 above and for interface components. Focus ring 2px solid `--focus` at 2px offset on every interactive element, `:focus-visible`, **never removed**. Touch targets 44×44px minimum with hit-area expansion, 8px between adjacent targets. Full keyboard traversal in logical order, skip link to main, `Esc` closes every overlay, focus returns to trigger. Landmarks on every page, one `h1`, no skipped levels, live regions for toasts and for support-mode entry and exit. `aria-busy` during async work. Form errors associated by `aria-describedby` and announced. 200% zoom with no truncation or horizontal scroll. Every state colour paired with glyph and text. `prefers-reduced-motion` honoured throughout.

Console-specific: bulk actions announce their result count; grid keyboard navigation includes column resize; the command palette is the accessible route to any toolbar-buried action; session timeout warns at two minutes and preserves unsaved work through re-authentication.

---

## 18. Print

Lower priority than a consumer product, but two surfaces genuinely get printed or exported to PDF: the audit log and the tenant record.

Ink only, no theme, `color-scheme: light` forced. Navigation and controls hidden. `break-inside: avoid` on every audit row and table row. The title block prints at the top of every page with tenant name, export timestamp and the exporting actor, which is what makes a printed audit extract evidentially useful rather than just a list.

---

## 19. Tailwind and token plumbing

Tailwind v4, CSS-first. Tokens are declared once in `src/app/tokens.css` and exposed to Tailwind through `@theme inline` in `src/app/globals.css`. Utilities are named by **role**, so `bg-page` cannot drift from `background: var(--surface-base)`.

```css
@import 'tailwindcss';

@theme inline {
  /* Surfaces, named by role */
  --color-page: var(--surface-base);
  --color-panel: var(--surface-raised);
  --color-field: var(--surface-sunken);
  --color-inset: var(--surface-inset);

  /* Ink */
  --color-ink: var(--text-primary);
  --color-ink-body: var(--text-secondary);
  --color-ink-muted: var(--text-tertiary);

  --color-rule: var(--border-subtle);
  --color-rule-strong: var(--border-strong);

  /* Action blue — the only colour a link may be */
  --color-action: var(--text-action);

  /* The accent. Two names, because the fill and the text value differ and
     that is the rule most likely to be broken. §4a */
  --color-accent-mark: var(--accent-mark);
  --color-accent-mark-text: var(--accent-mark-text);

  /* Status. Never the sole carrier of meaning */
  --color-success: var(--success-fg);
  --color-warning: var(--warning-fg);
  --color-danger: var(--danger-fg);

  /* Tenant accent. Reaches four surfaces only; §4b */
  --color-accent: var(--accent-500);

  --font-display: var(--font-display);
  --font-sans: var(--font-ui);
  --font-mono: var(--font-mono);

  --radius-chip: var(--radius-sm);
  --radius-panel: var(--radius-md);
  --radius-overlay: var(--radius-lg);
}
```

### ⚠ The namespace trap

**In Tailwind v4 an `@theme` key is not a variable you are declaring. It is a slot in a namespace that Tailwind already owns, and writing to it redefines every utility built from that slot.**

This is not hypothetical. `--spacing-0: 2px` was added to the `@theme inline` block as an ordinary-looking alias. Spacing is a theme namespace, so that one line redefined the **zero step** of the spacing scale, and with it every `-0` utility in the codebase: 45 `inset-0`, 148 `p-0` and `m-0`, 85 `top/left/right/bottom-0`, 13 `gap-0`. **293 usages, every one of them written to mean nothing, all rendering 2px.**

It surfaced as a 2px unblurred hairline down the edge of every modal backdrop — a bug that looked like a scroll-lock or containing-block problem and was neither, and cost a day being theorised about before anyone read the computed styles.

The rules that follow from it:

1. **Never write a `-0` key into a scale namespace.** There is no `--spacing-0` and there must never be one. The comment saying so lives in `globals.css` at the site.
2. **A compat alias belongs outside `@theme`.** `--s-0: 2px` is legitimate — it is a plain custom property in the Tier 0 compat block, aliased by nothing. The defect was mapping a compat name into a Tailwind namespace.
3. **Verify a token change in the BUILT CSS, not by reasoning about it.** `.inset-0{inset:0}` in the output is proof; the source looking right is not.
4. **`text-[var(--x)]` resolves as a COLOUR.** Without a `length:` hint Tailwind cannot tell a size token from a colour token, and it guesses colour. Use `text-[length:var(--x)]` or an inline style.

Class order is enforced by `prettier-plugin-tailwindcss`. Arbitrary values fail lint outside a documented exception list.

---

## 20. Anti-patterns

Do not ship these. They are the tells that make an interface read as generated rather than designed.

| Avoid | Instead |
| --- | --- |
| Purple-to-blue SaaS gradients | The brand blue, in small saturated doses |
| A large flat fill of `--blue-500` | Blue identifies and acts; it is not a background |
| Text set on `--accent-mark` | `--accent-mark-text`, or dark ink on a tint. §4a |
| Two orange elements on one screen | One. The budget is per screen. §4a |
| Bold weights for emphasis | Family switch, colour, size, case |
| Emoji as icons or in copy | Tabler, always |
| A statistics band of large numbers with tiny labels on the marketing page | One honest sentence |
| Counting-up number animations | Cross-fade |
| Skeleton shimmer sweeps | Opacity pulse |
| Toast for every action | Toast for asynchronous outcomes only |
| Infinite scroll in a console | Cursor pagination |
| A greyed-out mock inbox behind a "coming soon" overlay | The designed placeholder in `02 §5` |
| Coloured backgrounds on whole panels to signal state | Badge plus left rule |
| "Powered by AI" badges | Say what it does |
| Dismissible support-mode banner | The boundary frame. §8 |
| A number on screen with no source behind it | A dash, or the figure labelled as not yet counted |
| A control that renders and does nothing | Wire it, disable it with a stated reason, or remove it |

### What this table used to forbid, and no longer does

The previous version of this section banned gradients, glass, shadows on cards and radii above 6px outright. The shipped system uses all four, deliberately and within budgets:

- **Gradients** exist on the chrome tier only, as the two-stop navy-into-obsidian sweep in §23. Nowhere on the cream page.
- **Glass** is permitted on layered surfaces, at most three composited at once. §2.
- **Shadow** is a three-step ramp, with `--shadow-sm` on panels and `--shadow-lg` reserved for overlays. It supplements the surface ramp rather than replacing it.
- **Cards** are permitted where §26 says they are — which is not everywhere. The uncarded section is still the default; the overview is the exception and §26 states why.
- **Radius** runs to `--radius-overlay` and the console rail is 20px, because a floating rail is an object on the page rather than a panel ruled into it.

A budget is not a licence. Each of these has a stated ceiling, and exceeding the ceiling is the anti-pattern.

---

## 21. Handoff artefacts

Design produces, in order:

1. Token sheet with contrast annotations
2. Type specimen showing all fourteen tokens in context, demonstrating hierarchy without weight
3. Tenant application shell: sidebar, header, overview with setup checklist
4. Platform console shell with the inverted chrome and the rail in all three states
5. **The boundary frame**, entering, active, and the timeout warning states
6. The data grid at both densities with filters, selection and bulk bar
7. Tenant detail in the console, all bands
8. The credential lifecycle: list, create, reveal-once, rotate, revoke
9. The AI rules editor with a locked field and version history diff
10. Subscription page with limit bars at normal, 80% and over-limit
11. Health page with service rows and isolation test results
12. All access screens: sign-in, platform sign-in, sign-up, invite, reset
13. The two placeholder surfaces
14. Component sheet, tiers 1 to 3, every state
15. The console at 375px, including the bottom navigation. §23

---

## 22. Mark and identity

**The identity exists.** It arrived after this document's first draft and it supersedes the placeholder mark that used to be specified here. `docs/BRAND.md` is the authority; this section is the implementation note.

Everything is driven from `src/components/brand/Mark.tsx` and one asset. The brand anchors are in §2. The lockup has a primary form in `--brand-blue` and a secondary in `--brand-black`; the secondary exists for single-colour reproduction and for nothing else.

Clear space equal to the mark's height on all sides. Minimum size 20px. Favicon, app icon and OG image are generated from the same SVG. The mark never sits on a photograph, never gets a container, never animates.

---

## 23. The chrome tier

**The console's header and rail are a near-black slab, and this is not dark mode.**

It is the console's identity: an authoritative, focused operator environment standing against a cream document. It has nothing to do with a theme preference, there is no preference to have (§2), and it would survive one unchanged if there were.

The tier needs its own scale for a concrete reason: **the saturated brand blue is unreadable on this ground at 2.52:1.** Every value here is a lightened step of a page value, never a second palette.

```css
--chrome-bg-base:   #060913;  /* obsidian — the anchor */
--chrome-bg-navy:   #07125f;  /* the deep tone */
--chrome-bg:         linear-gradient(100deg, var(--chrome-bg-navy) 0%, var(--chrome-bg-base) 70%);
--chrome-sidebar-bg: linear-gradient(to top, var(--chrome-bg-base) 30%, var(--chrome-bg-navy) 100%);

--chrome-fg:        #ffffff;
--chrome-fg-muted:  #d4d4d8;
--chrome-fg-faint:  #a1a1aa;
--chrome-action:    #ffffff;  /* NOT --blue-500. See above */

/* Status on chrome — the lightened steps of the same five meanings */
--chrome-success: #4ade80;  --chrome-warning: #fbbf24;  --chrome-danger: #f87171;
--chrome-info:    #60a5fa;  --chrome-brand:   #a5b4fc;
```

**A badge that means "healthy" means it in both tiers, and only the step changes.** The chrome status inks are not a licence to invent a meaning that does not exist on the page.

### The rail

Three states, and the model is Gmail's rather than a checkbox's:

| State | Trigger | Width |
| --- | --- | --- |
| `collapsed` | Default | `--rail-w` 60px |
| `peeking` | Pointer enters the rail | `--rail-w-open` 248px, overlaying content |
| `locked` | The collapse control is clicked | 248px, reflowing content, persisted |

Peek is transient and never reflows the page, because a layout that moves under a pointer that was only passing through is worse than one that stays still. Lock reflows and persists, because a person who asked for it meant it.

The rail floats: `--rail-inset` 12px from the chrome edge, `--rail-radius` 20px. It is an object on the page rather than a panel ruled into it, which is the one place the radius ceiling in §20 is deliberately exceeded.

Escape closes a peek and returns focus to the trigger.

### Mobile

Below `md` the rail is replaced by a bottom bar carrying the six surfaces an operator uses on a phone, with the primary action raised out of it as a ringed circle. The ring is the chrome ground itself, not a border colour, so the button reads as punched through the bar rather than sitting on it.

### Everything else that is dark by design

These are constant surfaces, not theme responses, and they are the complete list:

- The console chrome (this section)
- `--workspace-card-*`, the workspace schematic node
- `--invert-card-*`, the inverted feature slab on marketing
- The support boundary frame, which is orange on any ground. §8

---

## 24. The chart contract

Library: **Recharts**. Line, area, bar, composed, sparkline, and one donut under the exception below.

### Tokens are resolved before they reach a chart

**An SVG presentation attribute does not reliably resolve `var()`.** A series given `fill="var(--blue-500)"` renders black in some engines and correctly in others, which is the worst failure mode available — it works on the machine it was written on.

Every chart component resolves its tokens to real values at the boundary and passes those down. The resolution happens once, in the chart's own module, so a token rename is still one edit.

### One hue per ordered series

**Ordered data uses one hue's ramp. Never a rainbow.**

A six-hue chart was built for the overview, looked well, and failed a colour-blindness check: three of the six series were indistinguishable under deuteranopia, and the legend did not save it because the reader still had to match a swatch to a slice. It was replaced with a single-hue ramp, which survives the same check because lightness ordering is preserved under every common form of colour vision deficiency.

### The documented exception: status mix

The status donut on the overview uses **semantic hues** — green for active, amber for trial, red for suspended — rather than one ramp. This is permitted, and it is permitted for one specific reason: **the legend names every slice, and the hues are the same status hues those words carry everywhere else in the product.** A reader who cannot separate the colours reads the labels and loses nothing; a reader who can gets the meaning twice.

That is the whole test. A chart whose categories are unordered, whose legend names every one of them, and whose colours already carry those meanings elsewhere may use semantic hues. Anything else uses the ramp.

### Composition

Charts sit in **bands**. A band is a question, a visualisation that answers it, and a link to the surface that owns the follow-up. A chart with no question above it and no route out of it is decoration.

Legends and tooltips are mandatory. No dual axes. No gradients inside a plot area. No more than four series without a stated argument for the fifth.

---

## 25. Scroll surfaces

The platform's default scrollbar is 17px of chrome-coloured furniture on Windows, complete with stepper arrows, and it appears inside panels that are otherwise ruled to a hairline.

Two utilities replace it:

- `.scrollbar-slim` — 8px, transparent track, thumb revealed on hover of the scrolling container
- `.scrollbar-slim-chrome` — the same, tuned for the chrome tier's ground

Both suppress `::-webkit-scrollbar-button`, which is what removes the Windows stepper arrows. Without that rule the arrows survive a thumb restyle and are the most visible part of what remains.

**Where they apply:** any scrolling container inside a panel — a table body, the audit stream, a dialog body, the rail's own overflow. **Where they do not:** the document scroller. The page keeps the platform scrollbar, because a person's main scrollbar is a thing they own rather than a thing the product styles.

Prefer not needing one. A surface that fits is better than a surface that scrolls well.

---

## 26. Carded and uncarded sections

**Added 13 Sep 2026, recording a decision the code had already made.**

The console was built **uncarded**: sections separated by a hairline rule and whitespace, content breathing directly on the page ground. `Panel`'s own comment said so — *"the uncarded console section · replaces the traditional nested white card"* — and §20 forbade card shadows outright.

The overview is now **carded** throughout, and has been since the front-end pass. The document was describing the opposite of what ships.

### Why the overview is the exception

The instinct behind uncarding is right and it is still the default. A hairline and generous whitespace read as calmer and denser than a grid of boxes, and on a screen about **one subject** the page *is* the panel — Workspaces is a table, Audit is a stream, Plans is a matrix. Drawing a card around the only thing on the page adds an edge that separates nothing.

The overview is not that screen. It is **five bands of unrelated subjects stacked vertically**: a queue, a telemetry rail, revenue, portfolio, operations. Uncarded, a reader scrolling it cannot tell where revenue ends and portfolio begins — because a hairline *between* two sections looks exactly like a hairline *inside* one. The rule that separates panels and the rule that separates rows within a panel are the same rule.

Carding gives each band a boundary that survives scrolling. That is what a briefing screen needs and a working screen does not.

### The three variants

| Variant | Treatment | Use it when |
| --- | --- | --- |
| `default` | Hairline above, content on the page ground | The screen has **one subject** and the page is the panel |
| `elevated` | Rounded 16px, `--surface-sunken` ground, own padding | **Unrelated subjects** sit side by side or stack |
| `flush-glass` | The carded shape, no ground | A panel inside an already-tinted surface |

`flush-glass` exists for one specific failure: nesting a sunken card inside a sunken well produces a second edge that means nothing, and the eye reads the inner one as a mistake.

### The rules

1. **Pick per band, not per panel.** A carded panel beside an uncarded one reads as one of them having failed to render.
2. **Carding is not licence for elevation.** The card is a ground change and a radius. `--shadow-sm` at most; the surface ramp is doing the separating, not a drop shadow. §20 still holds.
3. **A card needs a title.** An untitled card is a box with no reason to exist — if a region does not deserve a name, it does not deserve a boundary.
4. **Do not card a single panel.** One card on a page is a page with an inexplicable box on it.

### What this replaces in §20

§20's "drop shadows on cards → 1px rule" was written for the uncarded system. The current reading: **cards are permitted where §26 says they are, and they carry `--shadow-sm` at most.** The anti-pattern it was protecting against — elevation used to fake hierarchy — is unchanged.

---

## 27. Avatars

**Added 13 Sep 2026 with the profile pass. See 19 for the storage design.**

### The two states, and neither is a failure

| State | Rendering |
| --- | --- |
| No photograph | Two initials, derived from the name, on `--blue-50` with `--blue-500` ink |
| A photograph | The stored image, `object-cover`, circular |

**Initials are the resting state of most accounts, not a loading state.** An
avatar that is absent is not an avatar that failed, and nothing about the initials
rendering should suggest something is still arriving — no pulse, no placeholder
grey, no spinner. They render with no network request at all.

### The scale

`xs` 22 · `sm` 26 · `md` 32 · `lg` 40 · `xl` 72, plus a numeric escape hatch.

Use a **named step** wherever the avatar identifies somebody beside their name —
that is what keeps five call sites agreeing. The numeric form is for the one case
where the avatar is the **subject** rather than an identifier: the profile's
picker is 84px because it is the control you press, and adding an `xxl` rung for a
single site would put a step on the scale that means "the profile picker" rather
than a size.

### `alt` is the name in one place and empty everywhere else

This asymmetry is correct and deliberate. In the chrome the avatar sits beside the
name in text, so alt text makes a screen reader announce the person twice. Where
the avatar stands alone — the picker — it is the only thing identifying them and
carries the name.

The component takes `name` for that case and `label` to override; when neither is
given it is `aria-hidden`.

### The initials stay in the DOM behind the image

A stored object that 404s then degrades to initials rather than to a broken-image
glyph. The image is absolutely positioned over them rather than replacing them.

### Uploads are cropped and re-encoded in the BROWSER

Not as an optimisation. Three of the four reasons are correctness, and the
important one is that **re-encoding strips EXIF, which on a phone photograph
contains the GPS coordinates of where it was taken** — and the avatar bucket is
public-read. Doing it server-side would mean the coordinates still travelled and
still landed in a request log.

Say so on the surface. The picker's helper line reads "resized in your browser,
which also strips location and camera data before anything is uploaded", because
an operator handing over a photograph is entitled to know that before they do it.

### Never a stock photograph

`Avatar.tsx` exists because one hardcoded Unsplash URL of a real person shipped as
the signed-in administrator's face in three places. A placeholder that is a
picture of somebody is not a placeholder; it is a claim about who is signed in,
and it dragged a third-party host into both `remotePatterns` and the CSP's
`img-src` to serve it.

**A placeholder must never require widening a security policy.** If it does, it is
not a placeholder any more.

---

## 28. Icon containers: the tile and the pill

**Added 14 Sep 2026.** Two components, one question, and the answer is never a
matter of taste.

### The rule

| | `IconTile` | `IconPill` |
| --- | --- | --- |
| Shape | rounded square | circle |
| Says | **this is a thing** | **this is a state** |
| Ground | neutral ink gradient, lifted | tone tint at badge strength |
| Colour | a ~12% diagonal wash | the tone itself |
| Use for | a door, a surface, a device, a channel, a capability | healthy, warning, failing, enrolled |

A circle with a green tint means *something is satisfactory*. A rounded square
with a ground gradient is the visual language of an application icon, so the same
glyph in a tile means *the thing itself*.

Put the two side by side and the difference does real work: on the profile, a
device row leads with a **tile** (a laptop is an object) and a security row leads
with a **pill** (green there means enrolled). Using one shape for both would make
"this is your MacBook" and "this is satisfactory" look like the same kind of
claim.

### The wash is not a fill

A tile's ground stays neutral at every tone; the colour arrives as a ~12%
gradient over it. That is what lets a row of four tiles read as a set of objects
rather than a traffic-light panel — and it is why `tone="brand"` on a tile does
**not** spend the accent budget in §4a. At this strength it is a tint on grey.

### Brand marks pass their own colour

`glyphColor` exists for one case: a mark this product does not own. WhatsApp's
green, Instagram's magenta. §2 already exempts brand marks from the no-raw-colour
rule, because rendering someone's logo in `--success-fg` is rendering a different
logo.

**A semantic glyph uses `tone`.** Reaching for `glyphColor` to get "a red icon"
is the misuse the prop is named to prevent.

### Never hand-roll either one

This treatment shipped four times inline before it was a component — two sign-in
pages and two card helpers in one illustration — at four sizes, four radii and
four grounds. None could be reused because none was a component, and the best of
the four was on the page a reviewer never saw first.


## 28. Console refinement direction — 6 October 2026

The user's latest direction governs console refinement: restrained, precise surfaces inspired by Apple's attention to proportion and hierarchy, within aLcassa's cream canvas and inverted chrome identity.

- Summary KPIs use the shared FactStrip: inverted chrome, a visible masked dot texture, 76px decorative background glyphs, compact leading icons, and readable labels. The texture uses 0.9px dots on a 14px grid at 20% opacity, with a 35% minimum mask strength so it remains visible across the band. Artwork is aria-hidden and never competes with the value. Avoid oversized watermark icons, saturated ambient glows, thick borders, and animated decoration.
- Modal backdrops use the shared `console-modal-backdrop` treatment: the overlay tint and an 8px `--overlay-blur`, including the WebKit property. Apply this to the backdrop only; dialog content stays sharp. Confirmation, destructive confirmation, editing, provisioning, drawers, navigation sheets and command palettes share it. Browsers without backdrop-filter retain the dimming tint.
- Keep the page title left. Major sections alternate right, left, right on desktop. A conditional section changes the following alignment accordingly. Phone layouts remain left-aligned for scanning and predictable reading order.
- Use sunken cards to group tasks, records, and related facts. Raised controls and compact inset rows sit inside them. Leave editorial introductions and section headings open; do not wrap every sentence in another card. Workspace details use this same hierarchy.
- Preserve the established typefaces and 400/500 weight ceiling. Use sentence case and ordinary user language. Technical references belong in expandable details or the audit context where they help an operator.
- Unknown, unmeasured, unavailable, empty, and zero are distinct states. A signed-in page must not fill absent measurements with example incidents, invoices, customer records, or counts.
- Acceptance requires desktop and phone evidence, readable text contrast, keyboard/focus review, loading/error/empty/pending states, and verification that the visual change preserves real actions. Implementation alone does not close a surface.
