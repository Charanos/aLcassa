# Conduit console shell — boilerplate

Refactored `AppShell` (topbar + sidebar) for the platform console, built
against the Conduit design system doc (§2–§9, §19). Verified end-to-end in a
running Next.js 16 / Tailwind v4 app: light, dark, collapsed rail, mobile
slide-over, tenant switcher panel, all screenshotted and fixed where broken.

## Install

```bash
npm install @tabler/icons-react
```

Next.js 16+, App Router, Tailwind v4 (CSS-first `@theme`) assumed.

## Files

```
app/
  tokens.css                    Raw hex — the only file allowed to have it
  globals.css                   Tailwind @theme wiring, type scale, hatch fill
  layout.tsx                    Root layout — loads the three local fonts
  fonts/*.ttf                   Self-hosted Libertinus Serif/Sans + Fira Code
  platform-layout.example.tsx   Reference usage — copy into app/platform/layout.tsx

lib/
  fonts.ts                      next/font/local loaders
  theme.ts                      Server-side theme cookie resolution (stub — wire to your cookie store)
  theme-shared.ts                ResolvedTheme / ThemePreference types

components/
  brand/Mark.tsx                 Placeholder mark (§22) — swap when real identity lands
  primitives/IconButton.tsx      Tier 1 primitive
  primitives/ThemeToggle.tsx     Tier 1 primitive
  structure/AppShell.tsx         The shell itself — topbar + sidebar + mobile sheet
  structure/TenantSwitcher.tsx   Topbar workspace switcher (searchable, keyboard nav)
  structure/CommandTrigger.tsx   Topbar ⌘K trigger — wire onOpen to your CommandPalette
  structure/AdminProfileCard.tsx Sidebar footer identity + account menu

next.config.ts                  Sets devIndicators: false (avoids the Next.js
                                 dev badge colliding with the sidebar footer —
                                 dev-only, drop this line if you don't want it)
```

## Why fonts are self-hosted `.ttf` instead of a Google Fonts `@import`

A CSS `@import url(fonts.googleapis.com/...)` is a render-blocking network
request and Libertinus isn't in `next/font/google`'s bundled catalog. These
three files are pulled straight from Google Fonts' own OFL-licensed GitHub
mirror and loaded via `next/font/local`, which self-hosts and inlines them —
no external request at runtime, no flash of fallback font. If your build
pipeline has its own font hosting, swap `lib/fonts.ts` for that instead; the
CSS variable names (`--font-libertinus-serif`, `--font-libertinus-sans`,
`--font-fira-code`) are what `globals.css` actually depends on.

## What AppShell expects

```tsx
<AppShell
  application="platform" | "tenant"
  titleBlock={{ label, value, revision? }}
  navigation={NavGroup[]}
  role={string}                    // filters nav items by NavItem.roles
  theme="light" | "dark"
  defaultCollapsed?={boolean}
  tenants?={TenantSummary[]}       // platform only — powers the switcher
  onTenantSelect?={(t) => void}    // fires on selection; YOU own the confirm step
  adminProfile?={AdminProfile}     // sidebar footer identity
  notificationCount?={number}
  onCommandPaletteOpen?={() => void}
  headerActions?={ReactNode}       // extra controls before notifications/theme
>
  {children}
</AppShell>
```

## Real fixes made during verification (so you don't reintroduce them)

1. **AdminProfileCard avatar contrast** — the sidebar is theme-inverted
   relative to the page (`data-theme` flips on the `<nav>` itself per §4), so
   a `--copper-100` wash resolves to a *dark* copper-brown in that scope —
   nearly invisible against the near-black inverted ground. Fixed by using
   `--copper-solid` (a full-strength fill) with white text instead of a wash,
   which holds contrast in both scopes.
2. **TenantSwitcher / CommandTrigger contrast in dark page-theme** — these
   sit inside a header that is *unconditionally* inverted for the platform
   console (`--sheet-invert`, independent of light/dark page theme), but the
   controls were reading page-theme-scoped tokens (`--surface-field`), so in
   dark mode both the header and the controls went near-black together.
   Fixed by wrapping them in `<div data-theme="dark">` in `AppShell` so they
   always resolve against the dark token scope, matching the header they
   actually sit on.
3. **Collapse toggle low contrast** — the original border/background were too
   close to the page ground to read as a control. Given a real panel
   background, stronger border, and a subtle shadow.

## Still open (flagged in the design doc, not built here)

- `CommandPalette` itself (Tier 4) — `CommandTrigger` only fires
  `onCommandPaletteOpen`; wire it to your actual palette implementation.
- Tenant-select confirmation dialog (§9 TODO) — switching workspaces must
  name the consequence before navigating, per the platform layout's own
  comment. `onTenantSelect` is the hook; the confirm UI is not included.
- `BoundaryFrame` (§8) — the support-mode signature element. Separate
  component, not part of the shell itself.
