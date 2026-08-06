# 03 · Design System · "Conduit"

**Consumer:** Design and Code. This document is the authority on every visual decision. If code disagrees with this file, the code is wrong.
**Aesthetic:** technical, warm, dense. A drafting document rather than a dashboard.

---

## 1. The idea

This product is infrastructure. It is the layer beneath the thing the customer actually sees, and its entire job is to hold boundaries: between one tenant and another, between a role and a permission, between what a credential may read and what it may not.

Infrastructure that holds has a look. It is the look of a **technical drawing**: measured rules, annotated dimensions, hatch fills, a title block in the corner, a revision number. Precise, warm, made by a person, meant to be worked from rather than admired.

The material vocabulary is **conduit and patina**. Copper carries current between places without being the current. Left in air, it oxidises to verdigris, which is how you tell it has been doing its job for a while. That gives the palette a source that is not another SaaS blue.

| Artefact           | Becomes                                                 |
| ------------------ | ------------------------------------------------------- |
| The drafting sheet | The page: warm vellum ground, ruled, with a title block |
| The dimension line | Rules with terminators, used for metrics and limits     |
| Hatch fill         | Density and disabled states, never a flat grey          |
| The copper conduit | The interactive accent, and the boundary frame          |
| Verdigris          | Health, verification, the settled state                 |
| The title block    | The console header and the audit stamp                  |

Three principles:

1. **Tinted surfaces replace shadows.** Depth comes from a warm surface ramp, not from elevation. One shadow exists, on overlays.
2. **Colour is functional and systematic.** Unlike a monochrome system, this one uses colour to carry state, because a person reading a table of forty tenants needs to distinguish six states at a glance. Every colour has exactly one meaning and appears nowhere else.
3. **There is no weight axis.** Every family here ships one usable weight. Hierarchy comes from size, family switch, colour, case, space and rules. See `§5`.

---

## 2. Colour tokens

The client has not specified a palette and may supply one later. This one is chosen so that swapping the accent hue is a two-token change: everything structural is neutral, and only `--copper-*` carries brand.

### Light theme

```css
:root {
  /* Ground — warm neutrals, drafting vellum */
  --sheet: #fbfaf7; /* page ground */
  --sheet-raised: #ffffff; /* cards, panels, the layer above the page */
  --sheet-sunk: #f3f1ec; /* inputs, wells, code, table headers */
  --sheet-hatch: #edeae3; /* disabled fill, hatch base */
  --sheet-invert: #16181d; /* inverted blocks */

  /* Graphite — text and structure */
  --graphite-900: #16181d; /* headings, primary text */
  --graphite-700: #33373f; /* body */
  --graphite-500: #5f646e; /* secondary, captions */
  --graphite-400: #8b909a; /* tertiary, placeholder */
  --graphite-300: #b6bac2; /* disabled text, chart grid */

  /* Rules */
  --rule: #e2ded6; /* hairline */
  --rule-strong: #cbc6bb; /* section divider, table header underline */
  --rule-graphite: #16181d; /* emphatic, used sparingly */

  /* Copper — the single brand and interactive hue */
  --copper-700: #8a3e12; /* text on light, 6.8:1 */
  --copper-600: #a54b17; /* primary fill */
  --copper-500: #c25e22; /* hover fill */
  --copper-100: #f7e9df; /* wash, selected row */
  --copper-050: #fdf6f1; /* faintest wash */

  /* Verdigris — healthy, verified, settled */
  --verdigris-700: #145f50;
  --verdigris-500: #1f8570;
  --verdigris-100: #e2f1ed;

  /* Ochre — attention, approaching a limit, pending */
  --ochre-700: #7a5406;
  --ochre-500: #a8760c;
  --ochre-100: #faf0dc;

  /* Oxide — failure, suspended, over limit, destructive */
  --oxide-700: #96241c;
  --oxide-500: #bc3227;
  --oxide-100: #fbe9e7;

  /* Slate — informational, neutral state, machine */
  --slate-700: #2f4a63;
  --slate-500: #446b8c;
  --slate-100: #e7eef4;

  /* Interaction */
  --focus: #a54b17;
  --selection-bg: #f7e9df;
  --selection-fg: #16181d;
  --scrim: rgb(22 24 29 / 0.55);
}
```

### Dark theme

Not an inversion. The ground goes to a cool graphite, copper is lifted for contrast, and the warm ramp becomes a cool one, because a warm dark reads as muddy.

```css
[data-theme='dark'] {
  --sheet: #131519;
  --sheet-raised: #1a1d23;
  --sheet-sunk: #0e1014;
  --sheet-hatch: #22262e;
  --sheet-invert: #fbfaf7;

  --graphite-900: #f2f1ed;
  --graphite-700: #d2d4da;
  --graphite-500: #949aa5;
  --graphite-400: #6c727d;
  --graphite-300: #474d57;

  --rule: #262a32;
  --rule-strong: #383d47;
  --rule-graphite: #f2f1ed;

  --copper-700: #e8926a; /* text on dark, 6.2:1 */
  --copper-600: #d97b4e;
  --copper-500: #c25e22;
  --copper-100: #2e1b10;
  --copper-050: #1f1410;

  --verdigris-700: #4fc0a6;
  --verdigris-500: #2f9c84;
  --verdigris-100: #10251f;

  --ochre-700: #e0b14a;
  --ochre-500: #b8890f;
  --ochre-100: #241d0c;

  --oxide-700: #f08076;
  --oxide-500: #c9483c;
  --oxide-100: #2a1210;

  --slate-700: #7fa8c9;
  --slate-500: #5583a8;
  --slate-100: #131e28;

  --focus: #e8926a;
  --selection-bg: #2e1b10;
  --selection-fg: #f2f1ed;
  --scrim: rgb(0 0 0 / 0.7);
}
```

### Semantic aliases

Components consume these. Never the ramp directly, never a hex.

```css
--text-primary: var(--graphite-900);
--text-body: var(--graphite-700);
--text-muted: var(--graphite-500);
--text-placeholder: var(--graphite-400);
--text-brand: var(--copper-700);

--surface-page: var(--sheet);
--surface-panel: var(--sheet-raised);
--surface-field: var(--sheet-sunk);
--surface-disabled: var(--sheet-hatch);

--border-default: var(--rule);
--border-emphasis: var(--rule-strong);
--border-focus: var(--focus);

--action-primary-bg: var(--copper-600);
--action-primary-fg: #ffffff;
--action-primary-hover: var(--copper-500);
```

**A raw hex in a component file is a defect. A ramp token in a component file is a code smell.**

---

## 3. The colour discipline

Colour is functional here, which makes discipline harder rather than easier. Six hues, each with exactly one meaning.

| Hue           | Means                                                  | Never used for                             |
| ------------- | ------------------------------------------------------ | ------------------------------------------ |
| **Copper**    | Interactive, brand, primary action, the boundary frame | State. Copper never means "good" or "bad"  |
| **Verdigris** | Active, healthy, verified, connected, succeeded        | Anything a user must act on                |
| **Ochre**     | Pending, approaching a limit, past due, degraded       | Errors                                     |
| **Oxide**     | Suspended, failed, over limit, revoked, destructive    | Warnings that are not failures             |
| **Slate**     | Informational, machine-originated, neutral             | Anything with a success or failure valence |
| **Graphite**  | Everything else                                        | Any state                                  |

Rules that keep it from decaying:

1. **One accent per surface.** A card does not carry both a copper button and a verdigris badge and an ochre chip. If it does, the surface is doing too much.
2. **State colour appears at the badge and the rule, never as a background fill on a large area.** A full-width oxide panel is an alarm; a row with an oxide left rule and an oxide badge is information.
3. **Every coloured element carries a glyph and a text label.** Colour is never the only carrier, for colour-blind users and for printed audit exports.
4. **Charts use graphite plus a single copper series**, then hatch patterns for further series. Never a rainbow. Never a gradient.
5. **The 100-level washes are for row selection and inline message backgrounds only.** Nothing else gets a tint.

---

## 4. Distinguishing the two applications

Brian will have both open at once. Confusing them is a real operational risk, since an action taken in the wrong context could be a support-mode write on a live tenant.

The distinction is structural, not decorative:

|                 | Tenant application | Platform console                                     |
| --------------- | ------------------ | ---------------------------------------------------- |
| Header ground   | `--sheet-raised`   | `--sheet-invert`, inverted                           |
| Header text     | `--graphite-900`   | `--sheet`                                            |
| Sidebar         | `--sheet`          | `--sheet-sunk`                                       |
| Density default | Comfortable        | Compact                                              |
| Title block     | Tenant name        | `PLATFORM` in `--t-label`, plus the environment name |

The inverted console header is the single strongest signal and it is present on every platform page at all times. It costs nothing and it is unmissable in peripheral vision.

---

## 5. Typography

Three families, all Libertinus, all from Google Fonts, all OFL.

| Role                 | Family               | Weights that exist      | Weights used |
| -------------------- | -------------------- | ----------------------- | ------------ |
| Display and headings | **Libertinus Serif** | 400, 600, 700 + italics | **400**      |
| Body and UI          | **Libertinus Sans**  | 400, 700 + italic       | **400**      |
| Data                 | **Fira Code**        | 300, 400, 500, 600, 700 | **500**      |

### Two constraints, both real

**Constraint one: there is one weight per typeface, locked.** Under the rule of medium and normal only, no semibold, no bold, no italic. Libertinus Serif and Sans each use weight 400; Fira Code uses weight 500. Although Fira Code offers multiple weights, only 500 is imported and used.

So the system has **one weight per family, full stop.** That is more constrained than any typical design system and it is workable, because a technical drawing has no bold either. Everything below is built for it.

**Constraint two: Libertinus Math is not a monospace font, so it is not the data face.**

The request named Libertinus Math for the mono role. It is an OpenType _math_ typeface: fraktur alphabets, scaled integral signs, redesigned operators, built for LuaTeX and XeTeX. Google Fonts classifies it as display. Its advance widths are not uniform and its figures are not tabular, which means a column of tenant IDs, timestamps, usage counts or key prefixes would sit unevenly. In a console where the primary reading task is scanning columns, that is a functional defect.

**Fira Code** at weight 500 is the current monospace choice, chosen for its clarity in a data context and its consistent tabular figures. Fallback is Libertinus Mono, which was the original choice and remains a solid substitute.

Libertinus Math keeps one legitimate use: **the entitlement expression display** in `§9`, where a plan limit is genuinely rendered as an inequality (`seats ≤ 15`). Its `≤`, `≥`, `∈` and `∞` glyphs are drawn properly and the browser fallback for those characters is ugly. One component, `MathExpr`, loads it. Nothing else does.

The mono font is one line in the token file and one line in the type scale. The rest of the system is indifferent.

### What carries hierarchy instead of weight

In descending order of strength:

1. **Size.** The scale spans 0.6875rem to 3.5rem, a 5× range doing most of the work.
2. **Family switch.** Serif against sans against mono is a stronger signal than 400 against 700 inside one family. This is the emphasis mechanism.
3. **Colour.** `--graphite-900`, `--graphite-500`, `--graphite-400` are three legible steps of prominence at identical weight.
4. **Case and tracking.** Uppercase at `0.1em` reads as a label with no weight change.
5. **Rules.** A hairline above a line promotes it. A copper left rule promotes it further.
6. **Space.** Isolation is emphasis.

**Emphasis inside a paragraph is a family switch or `--graphite-900`, never a weight change.** Emphasis inside mono is uppercase, never a weight change.

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

`font-variant-numeric: tabular-nums` on every number rendered in Libertinus Sans. Mono is already even.

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
--shadow-overlay: 0 1px 2px rgb(22 24 29 / 0.05), 0 16px 40px rgb(22 24 29 / 0.12);
```

Panels do not have shadows. Panels have a 1px `--border-default`. Depth comes from the surface ramp: `--sheet` page, `--sheet-raised` panel, `--sheet-sunk` field. Hover darkens the rule to `--border-emphasis`; it never lifts.

### Hatch

The one texture in the system, and it does real work. A 45° line pattern at `--graphite-300`, 1px lines at 5px spacing, rendered as a repeating linear gradient.

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

**The frame.** Entering support mode inlays a 3px copper frame around the entire viewport, inside the browser chrome, present on every screen and every scroll position. It is not an overlay; layout insets to accommodate it, so nothing is ever hidden beneath it.

The top edge of the frame is interrupted by a **title block**, centred, reading:

```
    ┌──────────────[ SUPPORT MODE · ACME LOGISTICS LTD · 24:18 ]──────────────┐
    │                                                                          │
    │                        tenant application view                           │
    │                                                                          │
    └──────────────────────────────[ EXIT ]────────────────────────────────────┘
```

- Tenant name in `--t-data-caps`, copper on the sheet ground, set into a break in the frame line the way a drawing's title interrupts its border.
- A countdown to the thirty-minute inactivity timeout in mono, which turns ochre below five minutes and oxide below one.
- The exit control set into the bottom edge, symmetrically. One click returns to the platform view.
- The frame is `--copper-600` in both themes. It is the only element in the system that does not change with theme, because it is a safety signal and a safety signal should look identical everywhere.

**Why it works.** It reframes the entire screen rather than annotating it. You cannot look at any part of the interface without the frame in peripheral vision. And it borrows a real convention: a drawing sheet's border with its title block is exactly how a technical document declares whose drawing it is and under what revision.

The frame appears in exactly one other context: an environment that is not production. Staging carries the same frame in `--slate-500` reading `STAGING`. Nowhere else, ever. If it starts appearing on other states it stops meaning anything.

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
| `LimitBar`                     | **Usage against an entitlement.** Filled portion, hatched remainder, ochre at 80%, oxide at 100%. See `§13` |
| `Stat`                         | Metric with label, value in `--t-data-lg`, optional delta and sparkline                                     |
| `StatusDot`                    | Service health. Verdigris, ochre, oxide, graphite for unknown                                               |
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

`recharts`. Graphite plus one copper series, then hatch patterns. Line, area (single series), bar, sparkline. **No pie charts, no dual axes, no gradients, no more than four series.** Legends and tooltips mandatory.

### Tier 8 · Marketing

`Hero` · `FeatureRow` · `LegalPage`. Three components. The marketing surface is one page and it does not need a kit.

### Component contract

TypeScript props, no `any`. `forwardRef`. `data-slot` attributes on internal elements. Every interactive state. Full keyboard operation. A stated `aria` contract. Both themes. A 360px layout. Empty and error states where data is rendered. Storybook covering default, hover, focus, disabled, loading, error and dark. **A component without its loading and empty stories is not done.**

---

## 10. Two surfaces specified precisely

### The credential reveal

The one screen in the product that shows a secret, and it never shows it again. `01 D-11`.

- Full-width panel on `--sheet-sunk`, `--r-md`, copper left rule 3px.
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
- Used portion in `--copper-600`, remaining portion in hatch at `--graphite-300`.
- A 1px `--rule-strong` tick at the 80% threshold.
- Above 80%, the used portion turns `--ochre-500` and the numeric label goes `--ochre-700`.
- At 100%, oxide, and the bar gains a 1px oxide outline.
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

Default treatment: 1px rule, `--sheet-raised` fill, `--graphite-700` text, `--t-label`, `--r-sm`, 20px tall, 8px padding, glyph plus text always.

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

Tailwind v4, CSS-first. Tokens declared once in `app/tokens.css`, exposed through `@theme`.

```css
@import 'tailwindcss';

@theme {
  --color-sheet: var(--sheet);
  --color-sheet-raised: var(--sheet-raised);
  --color-graphite-900: var(--graphite-900);
  --color-graphite-500: var(--graphite-500);
  --color-copper-600: var(--copper-600);
  --color-verdigris-500: var(--verdigris-500);
  --color-ochre-500: var(--ochre-500);
  --color-oxide-500: var(--oxide-500);
  --color-slate-500: var(--slate-500);
  --color-rule: var(--rule);

  --font-serif: 'Libertinus Serif', Georgia, serif;
  --font-sans: 'Libertinus Sans', system-ui, sans-serif;
  --font-mono: 'Fira Code', 'Libertinus Mono', ui-monospace, monospace;

  --radius-sm: 2px;
  --radius-md: 3px;
  --radius-lg: 6px;
}
```

Theme resolved server side from a cookie so there is no flash. Toggle offers light, dark and system. Class order enforced by `prettier-plugin-tailwindcss`. Arbitrary values fail lint outside a documented exception list.

---

## 20. Anti-patterns

Do not ship these. They are the tells that make an interface read as generated rather than designed.

| Avoid                                                                     | Instead                              |
| ------------------------------------------------------------------------- | ------------------------------------ |
| Gradient headers or hero backgrounds                                      | Flat surfaces, typographic contrast  |
| Glassmorphism, blurred panels                                             | Hairline rules and the surface ramp  |
| Purple-to-blue SaaS gradients                                             | Copper on vellum                     |
| Drop shadows on cards                                                     | 1px rule                             |
| Rounded corners above 6px                                                 | `--r-md`                             |
| Bold weights for emphasis                                                 | Family switch, colour, size, case    |
| Emoji as icons or in copy                                                 | Tabler, always                       |
| A statistics band of large numbers with tiny labels on the marketing page | One honest sentence                  |
| Counting-up number animations                                             | Cross-fade                           |
| Skeleton shimmer sweeps                                                   | Opacity pulse                        |
| Toast for every action                                                    | Toast for asynchronous outcomes only |
| Infinite scroll in a console                                              | Cursor pagination                    |
| A greyed-out mock inbox behind a "coming soon" overlay                    | The designed placeholder in `02 §5`  |
| Coloured backgrounds on whole panels to signal state                      | Badge plus left rule                 |
| "Powered by AI" badges                                                    | Say what it does                     |
| Dismissible support-mode banner                                           | The boundary frame                   |

---

## 21. Handoff artefacts

Design produces, in order, each in light and dark:

1. Token sheet with contrast annotations
2. Type specimen showing all fourteen tokens in context, demonstrating hierarchy without weight
3. Tenant application shell: sidebar, header, overview with setup checklist
4. Platform console shell with the inverted header and the tenant switcher open
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

---

## 22. Mark and identity

There is no brand. Ask at design lock whether one exists; if not, this placeholder ships and looks deliberate.

**The mark:** a 1:1 square outline in `--copper-600` at 1.5px, containing two horizontal rules offset from centre, suggesting a conduit passing through a boundary. Drawn once as SVG, `--r-sm`.

**The wordmark:** the product name in Libertinus Serif 400 at `--t-h3` size, `--graphite-900`, with `-0.005em` tracking. Until a name exists, the wordmark is absent and the mark stands alone.

Clear space equal to the mark's height on all sides. Minimum size 20px. Favicon, app icon and OG image generated from the same SVG. No colour variants beyond copper and a mono-graphite version for print. The mark never sits on an image, never gets a container, never animates.

Everything is driven from `components/brand/Mark.tsx` and one asset. When a real identity arrives, that file changes and nothing else does.
