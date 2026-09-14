# Source

repo: tabler/tabler-icons
branch: main
path: icons/outline

Icon geometry only. Every icon in the console is a Tabler outline path lifted
verbatim from this repo and re-stroked at 1.5 per the aLcassa system, rather
than drawn by hand. The product code itself lives in the attached local folder
(`Brian/conduit`), not in a connected repository.

Charts use Recharts 2.12.7, loaded lazily as an ESM bundle from esm.sh. React
and ReactDOM are mapped back to the page's own instances via the import map in
the shell's helmet plus react-shim.js / react-dom-shim.js — without that, the
CDN would pull a second React copy and every hook inside Recharts would throw.
The documented UMD path (umd/Recharts.min.js) does not exist in 2.12.x.

## Last sync

date: 2026-09-03T17:17:02Z

### Updated in this project

- Pulled 26 outline paths verbatim for the tenant shell: home, inbox, users,
  speakerphone, robot, route, message-2, book-2, chart-line, gauge,
  plug-connected, users-group, credit-card, adjustments-horizontal, key, check,
  file-description, chevron-left/right, user.
- Added the channel glyphs brand-whatsapp, mail, world-www,
  device-mobile-message, plus trending-up / trending-down for stat deltas.
- Replaced the tenant shell's first-pass hand-approximated paths with this
  geometry, re-stroked at 1.5.

## Sync history

date: 2026-08-11T00:00:00Z

- Pulled ~60 outline icon paths across nav, chrome, status, table actions,
  entitlement meters, health services, and audit categories.
- Inlined them in every screen DC; no icon font or runtime icon package.

## Screen map

| Screen | Built from |
|---|---|
| Console-Shell.dc.html | Brian/conduit/src/components/structure/AppShell.tsx, app/(platform)/platform/layout.tsx, components/brand/Mark.tsx |
| console-tokens.css | Brian/conduit/src/app/tokens.css, src/app/globals.css |
| charts.jsx | Recharts 2.12.7 via esm.sh, coloured from console-tokens.css at mount |
| react-shim.js, react-dom-shim.js | Import-map targets so the CDN bundle reuses the page's React |
| Overview.dc.html | docs/admin-console-docs/ADMIN-CONSOLE.md §3.1 |
| Workspaces.dc.html | ADMIN-CONSOLE.md §3.2 |
| Workspace-Detail.dc.html | ADMIN-CONSOLE.md §3.3 |
| Provision.dc.html | ADMIN-CONSOLE.md §3.4 |
| Plans.dc.html | ADMIN-CONSOLE.md §3.5 |
| Revenue.dc.html | Not in the docs — added for SaaS financial tracking |
| Support-Sessions.dc.html | ADMIN-CONSOLE.md §3.6 |
| Audit-Log.dc.html | ADMIN-CONSOLE.md §3.7 |
| AI-Rules.dc.html | ADMIN-CONSOLE.md §3.8 |
| Health.dc.html | ADMIN-CONSOLE.md §3.9 |
| Admins.dc.html | ADMIN-CONSOLE.md §3.11 |
| Tenant-Shell.dc.html | Tenant-side shell — light chrome, own IA. Icons from icons/outline; VolumeChart from charts.jsx |
