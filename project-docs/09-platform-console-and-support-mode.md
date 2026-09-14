# 09 · Platform Console and Support Mode

Requirement 4. Brian's workspace, and the one interface in this system built for a person who will live in it.

---

## 1. Design posture

The tenant application optimises for a first-time B2B owner who will use it for twenty minutes and then rarely. The console optimises for throughput by someone who uses it daily.

| Tenant application | Platform console |
|---|---|
| Comfortable density | Compact density default |
| Guidance in the interface | Guidance in the runbook |
| Mouse-first, mobile supported | Keyboard-first, desktop 1440px, mobile read-only |
| One primary action per screen | Many actions, all reachable from the palette |
| Prose explains | Labels and data |

Same tokens, same components, different weighting. The console is distinguished structurally by the inverted header from `03 §4`, which is present on every page and unmissable in peripheral vision.

---

## 2. Surfaces

### `/platform` · Overview

Four bands, in order of how often Brian will look at them.

1. **Attention.** Tenants past due, tenants above 80% on any limit, credentials unused for 90 days, invitations expiring. Each row links through to the filtered list. If this band is empty it says so plainly and takes one line.
2. **Platform.** Tenant count by status, subscriptions by tier, active sessions, service-door request volume over 24 hours. `Stat` components, mono values, sparklines.
3. **Recent platform actions.** The last twenty entries from `platform_audit_log`, with support-mode entries in copper per the badge taxonomy.
4. **Health summary.** Service status dots and the most recent isolation suite result. Links to `/platform/health`.

### `/platform/tenants` · The working surface

A `DataGrid` at compact density. Columns: name, status, plan, seats used against limit, created, last activity, and a row action menu.

Filters as toolbar chips: status, plan, above 80% on any limit, past due, created within a range. Saved views, because Brian will return to the same three filters constantly.

Row click opens a drawer with the tenant summary and a permalink. The switcher is available from the drawer as well as from the header, since deciding to switch usually happens while looking at a tenant.

### `/platform/tenants/[id]` · Tenant record

Bands: identity and status, plan and entitlements with limit bars and override management, members with roles and last activity, credentials metadata (never a reveal, even here), AI rules version summary, and the tenant's audit log filtered to this tenant.

**What is deliberately absent:** the tenant's AI rules content, their knowledge base, their customer records, their settings detail. Those require support mode. `06 §10`.

That absence will feel inconvenient once, and it is the design working. A console that can read tenant content across tenants has no isolation guarantee to sell.

### `/platform/plans` · Plans and entitlements

Plan list with subscriber counts. The editor shows entitlements as rows and, before saving, **states how many tenants are affected and how many of those would immediately be over a reduced limit.** Reducing a limit on a live plan is the operation most likely to cause an incident here, so it gets a specific confirmation naming the count.

### `/platform/ai-rules` · Master rules

The singleton editor. Same component as the tenant editor, with the addition of a per-field `overridable` toggle. Version history and diff. Publishing shows the tenant count affected and invalidates every compiled cache key.

### `/platform/health`

Requirement 10. Service status rows with latency and last-checked. Database metrics: connections, slow query count, index health. Cache metrics: hit rate, latency, memory. Error rate over 24 hours from Sentry. The watchlists. And the isolation suite result with a per-table breakdown from the last CI run.

That last panel is unusual for a health page and it is the point: Brian can see on any given day that the guarantee he sells is currently holding. `04 §8`.

### `/platform/audit`

Every platform action. Filterable by actor, target tenant, action, date range, and two switches that matter: **service-role usage** and **support-mode sessions**. Those two filters answer the auditor's question directly. Exportable to CSV, and the export itself writes an audit entry.

---

## 3. The organization switcher

The header control, available from every console page.

### Behaviour

Opening it (`Cmd/Ctrl+K` then `switch`, or clicking the control) shows a searchable list: tenant name, plan tier badge, status badge, and last activity. Search matches name, slug and ID. Keyboard first, arrows and enter, no mouse required.

Selecting a tenant opens a confirmation step, not an immediate switch:

```
Enter support mode for ACME LOGISTICS LTD?

You will be able to view and change their workspace as support.
Every action is recorded in their audit log and yours.

Reason (optional, appears in both logs) [___________________]

                              [ Cancel ]  [ Enter support mode ]
```

**Copy updated 24 Aug 2026.** "Read-only support role" no longer describes the confirmed permission set; see `01 D-13`. The reasoning below is unchanged and now argues more strongly than before.

The reason field is optional in Phase 1 and I would argue for making it mandatory, more so now than when this was read-only: a support session that can change data and cannot explain why six months later is a materially worse position than a read-only one in the same spot. Raise it with Brian; it costs a required field.

On confirm: the session is minted, both audit rows are written, and the browser navigates to that tenant's `/app` with the boundary frame applied.

### The boundary frame

`03 §8` is the visual specification. What matters here is the behaviour:

- Present on every screen and every scroll position, inset so nothing is hidden beneath it.
- Tenant name in the top title block. A live countdown to the 30-minute inactivity timeout.
- Countdown turns ochre below five minutes, oxide below one.
- The exit control in the bottom edge. One click, immediate.
- **`--copper-600` in both themes**, because a safety signal should look identical everywhere.
- Server-driven from `/v1/me`, not from a query parameter, so it cannot be suppressed by editing a URL.

### Timeout

Thirty minutes of inactivity, per the brief. Activity is any request through the session door. At two minutes remaining a warning appears with an extend action; extending is a fresh confirmation, not a silent renewal. On expiry the session is revoked, the next action fails with `support.session_expired`, and the frame shows an expired state with a single control to switch in again.

### Exit

Explicit exit revokes the session and writes two audit rows. Closing the tab does not exit; the session expires on its own timer. That is deliberate, because a browser close is not a signal we can trust.

---

## 4. The support role matrix

**Signed 24 Aug 2026, per `01 D-13`.** Brian has confirmed full read and write, superseding the read-only-by-default proposal this table originally carried. It still generates the isolation suite's support-mode cases, so it remains a table with teeth rather than a description; the cases themselves need regenerating against the write column below.

| Surface | Read | Write | Notes |
|---|:---:|:---:|---|
| Tenant overview | ✓ | | Nothing to write here; it is a summary view |
| Company profile | ✓ | ✓ | Opens via `app.can_write_settings()` admitting the `support` role |
| Team list and roles | ✓ | ✓ | Invite, remove, change role. Same gate as company profile |
| Invitations | ✓ | ✓ | Can now send and revoke. Previously "cannot send or revoke"; that restriction is lifted |
| Credentials, metadata | ✓ | | Name, prefix, scopes, last used |
| Credentials, create / rotate / revoke | | | **Stays owner-only, including in support mode.** Predates this decision: `01 D-11` and ADR-008. Not reopened |
| Credentials, secret | | | **Never. Not readable by anyone, ever** |
| AI rules, current | ✓ | ✓ | Same gate as company profile |
| AI rules, version history | ✓ | | Version rows are append-only per I-10; publishing a new one is a write to the current pointer, which is covered above |
| Subscription and usage | ✓ | | No tenant-facing modify policy exists at all in Phase 1; see `08 §1`. Unaffected by this decision |
| Tenant audit log | ✓ | | Append-only, no write surface for anyone |
| Knowledge base documents | ✓ | ✓ | Phase 2 content; Phase 1 ships the seam and its isolation |
| **Customer records** | | | **Still unresolved.** See below. Currently: no access, read or write, per the existing policy |
| Member removal | ✓ | ✓ | Folded into "team list and roles" above |
| Ownership transfer | | | **Stays owner-only.** Not reopened; see `06 §5` note ⁵ |
| Tenant deletion | | | **Stays owner-only.** Not reopened; see `06 §5` note ⁶ |

### The one still to argue about

**Customer records.** The proposal below predates Brian's read-write decision and his answer did not name this table specifically. The policy as shipped (`06_seams.sql`) still blocks the support role from reading it at all, and that block does not automatically fall away when `can_write_settings()` opens for the other tables, because `customer_records_select` is a separate, explicit predicate. It stays exactly as written below until Brian rules on it, and the reply going back to him asks the question directly rather than assuming an answer either way.

They are the personal data of Brian's tenants' customers, two steps removed from him, and they are the one dataset where a support session's read has real privacy weight. Every other surface opened by the read-write decision is a tenant's own business configuration; this one is other people's information, which is a different kind of thing to grant "full access" to.

If a genuine support case requires it, the better answer is a separate, explicitly-consented elevated mode with its own confirmation, its own audit action and its own notification to the tenant. That is a Phase 2 conversation, and it should be quoted.

Granting it by default alongside everything else that opened on 24 Aug 2026 would be the easiest path and it would quietly make every support session a potential privacy event, which is the same reasoning that applied before the decision and is not weakened by it.

### A write-capable support mode

**Built, 24 Aug 2026.** This section previously speculated about what Brian might want if he asked for write access; he has now asked for it directly and without the ten-minute cap or the separate elevation flow proposed below, so that proposal is superseded rather than adopted. Support mode is a permanent capability of the role for the surfaces in the table above, entered exactly as `06 §6` describes, for the full thirty-minute session, with no separate elevation step. The oxide boundary-frame idea is worth keeping for a future, narrower elevation if customer records ever need one; it is not applied to ordinary support mode, which stays copper per `03 §8` and `09 §3` regardless of read or write.

### A non-human actor in the same seat

**Flagged 24 Aug 2026, not built.** Brian's answer names "future AI Copilots" alongside support as able to take action inside a workspace. That is a distinct principal from Brian acting in support mode: the audit trail's `actorType` is currently `'user' | 'platform_admin' | 'service'` per `src/lib/db/context.ts`, and a copilot acting inside a tenant is none of those cleanly, since `'service'` in this codebase currently means the FastAPI machine path reading AI rules, not an agent writing to tenant data. Giving a copilot the `support` role as written would mean every write it makes is attributed to "Brian acting in support mode" in the tenant's own audit log, which would not be true and would undermine the transparency claim in `§7` below. This needs its own actor type and its own row in the role matrix before any such capability is built, and it is out of Phase 1 scope regardless: nothing in `01 §2`'s exclusions changes to admit it, and it is raised here so it is not silently designed into the support role's plumbing by accident.

---

## 5. Command palette

`Cmd/Ctrl+K`, console only in Phase 1.

Groups: navigation, tenants by name or ID, and verbs. Verbs at launch: `switch to tenant`, `suspend tenant`, `reactivate tenant`, `assign plan`, `grant override`, `publish master rules`, `export audit`.

Destructive verbs open the same confirmation dialog as the interface path. The palette is a faster route to an action, never a route around a confirmation.

Recent items first. Full keyboard operation. It is also the accessible route to any action otherwise buried in a toolbar, per `03 §17`.

---

## 6. Platform admin accounts

`01 §9` question 6. `platform_admins` carries per-capability booleans rather than a role enum: `canSuspendTenants`, `canEditMasterRules`, `canEnterSupportMode`. `05 §4`.

That shape costs nothing now and answers the question cheaply if Brian adds a second admin later. Managing the accounts is `/platform/admins`, and it exists whether or not there is more than one row, because a screen that appears only when needed is a screen nobody tested.

Platform sessions last eight hours. Two-factor is recommended and quoted separately; it is not in the current scope and the brief does not ask for it. Say this to Brian rather than assuming he knows, since the platform account can suspend every tenant he has.

---

## 7. What the tenant sees of all this

Worth designing deliberately, because it is a trust surface.

A tenant's own audit log at `/app/settings/audit` shows every support-mode entry: when the platform entered, who, the reason if given, and every action taken during the session. Rendered with the copper support badge so it is distinguishable at a glance.

Nothing is hidden. That transparency should be stated in the marketing copy and in the terms, because "you can see every time we look at your workspace" is a genuinely strong claim in this category and very few vendors can make it.

---

## 8. Console performance

| Surface | Budget |
|---|---|
| Console shell first paint | under 1.5s |
| Tenant grid, 50 rows | under 800ms |
| Tenant grid, 500 rows virtualised | under 1.2s |
| Command palette, open to results | under 120ms |
| Switcher, open to results | under 120ms |
| Support mode entry, click to framed view | under 1.5s |
| Health page, all panels | under 2s, panels stream independently |

Grids virtualise above 100 rows. Every panel on the overview and health pages has its own Suspense boundary, so a slow metrics query never holds up the attention band.

---

## 9. The console shell, as built

**Added 12 Sep 2026.** §1 describes the console's posture and §2 its surfaces. This section describes the frame both sit inside, which was rebuilt between 1 and 12 Sep and is not what the earlier sections assume.

### The rail has three states, not two

A collapse control that toggles between "open" and "shut" forces a choice a person does not want to make: open costs 248px of working width on every screen, shut costs a click every time they navigate. Gmail's answer is the right one and this is it.

| State | Trigger | Width | Reflows content |
| --- | --- | --- | --- |
| `collapsed` | Default | 60px | — |
| `peeking` | Pointer enters the rail | 248px, overlaid | **No** |
| `locked` | The collapse control is clicked | 248px | **Yes**, and persisted |

Peek overlays rather than reflows, deliberately. A layout that moves under a pointer that was only crossing the rail on its way somewhere else is worse than one that stays still. Lock reflows and persists, because a person who clicked the control meant it.

`Escape` closes a peek and returns focus to whatever opened it. The header closes its own menus on blur.

### The rail floats

12px inset from the chrome edge, 20px radius, 60px collapsed and 248px open. These are the four numbers the shell and the mobile navigation share, and they are constants in one place because they drifted twice when they were not.

It reads as an object standing on the page rather than a panel ruled into it. That is the one place the radius ceiling in `03 §20` is exceeded on purpose.

### Mobile is not read-only

`§1` says "mobile read-only". That was true when it was written and is no longer the posture. Below `md` the rail is replaced by a bottom bar carrying the six surfaces an operator reaches for on a phone, with the primary action raised out of the bar as a ringed circle — the ring being the chrome ground itself, so the control reads as punched through the bar rather than sitting on it.

What a phone cannot do is unchanged and is a matter of the operations themselves, not the navigation: support-mode entry still wants a desktop, and the data grid still wants width.

### The command palette

`Cmd/Ctrl + K`. A combobox with the full ARIA contract — `role="combobox"`, `aria-expanded`, `aria-activedescendant` — arrow keys to traverse, `Enter` to run, `Escape` to close and return focus.

It remains the accessible route to any action buried in a toolbar, which is a commitment in `03 §17` rather than a convenience.

### Flash across a redirect

Sign-in, sign-out and workspace creation all end in a `303`, and a toast cannot survive one in component state. A single-use cookie carries a **key from a closed catalogue** — never a message string — and is burned before the toast fires. A closed catalogue means an open redirect cannot be turned into an arbitrary message in the product's own voice.

---

## 10. Surface inventory

Current as of 12 Sep 2026. `17 §1` carries the density and wiring audit for each of these.

| Route | Reads | Notes |
| --- | --- | --- |
| `/platform` | live | The banded reference surface |
| `/platform/tenants` | live | Client-side filtering; reversal point stated at ~1,000 rows |
| `/platform/tenants/[id]` | live | Six tabs |
| `/platform/tenants/new` | live | Provisioning, real server action |
| `/platform/revenue` | designed | No gateway in Phase 1; the screen says so |
| `/platform/health` | designed, isolation live | Isolation is live because it is answerable and it is the guarantee |
| `/platform/plans` | live | The catalogue and the entitlement matrix |
| `/platform/admins` | designed | `platform_admins` exists and is unread. `17 §5` |
| `/platform/audit` | live | Append-only |
| `/platform/ai-rules` | designed | Versions table exists and is unsurfaced. `17 §5` |
| `/platform/support-sessions` | live | |
| `/platform/settings` | designed | No platform-settings table. Deferred, `17 §10` |
| `/platform/profile` | designed | |
