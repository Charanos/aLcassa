# 23 · Audit log, Admins, Settings — the plan

One stage, three pages, because they share a job: they are the console's
**accountability** surfaces. Audit records what operators did, Admins says who
the operators are and what they may do, Settings is where they change things
that reach every workspace. Support sessions is deliberately left for its own
stage.

Every finding below was observed, not inferred: each page was screenshotted
signed in as the seeded operator against the development database
(`pnpm shots audit admins settings`), and each defect was traced to its line.

---

## Stage 0 · Correctness before design

These are wrong today, on screens a client can be shown. None is visible to any
gate — typecheck, lint and build are green over all of them.

### A0.1 · The audit log is blind — **P0**

Signed in, the audit page reports **0 platform actions in 30 days**. The
database holds **297** in that window, the newest three hours old.

Root cause: `platform_audit_log`'s select policy returns rows only when
`app.current_actor_id()` is a platform admin
(`src/db/policies/07_audit.sql:58`). The live readers run inside
`withoutTenantContext`, which sets the actor to empty. Row-level security
filters rather than erroring, so the reader receives nothing and the page
renders a confident, empty ledger.

Three readers are affected:

| Reader | Surface |
| --- | --- |
| `getLiveAuditEntries` · `liveWorkspaces.ts` | Audit stream, Operators band |
| `getLiveAuditVolume` · `liveWorkspaces.ts` | Audit volume chart and figures |
| `getLiveOverview` · `live.ts` | The overview's "last actions" |

`getLiveProfile` reads the same table correctly — it uses `withActorContext`.
That is the fix, three times.

**And a test**, because this failure is exactly the silent kind the isolation
suite exists for: a case asserting that a platform admin, connected as the app
role, reads platform audit rows. It fails today.

### A0.2 · The wrong empty state

With no filter applied, the stream says *"No entry matches those filters. The
log is append-only, so nothing has been removed — only hidden by the current
search."* Two different empty states — an empty window, and a filter that
excludes everything — share one message, and the one shown is the one that
cannot be true.

### A0.3 · Zeros that describe themselves as findings

With nothing in the window, the volume band still reports *"busiest 08-31 ·
0"*, and *"Days with nothing: 30"* carries the note *"A quiet weekend is two
short bars, not a gap"*. Both are correct sentences about a non-empty window.

### A0.4 · The volume window is a UTC calendar

`getLiveAuditVolume` buckets by `(now() at time zone 'utc')::date`. For an
operator in Nairobi every day boundary sits three hours early: an action at
01:00 EAT lands on yesterday's bar. Health was anchored to Nairobi in the last
pass; audit should match.

### AD0.1 · The capability matrix cannot place the reader

The operator card reads **`platform_admin`**. The matrix beneath it has columns
**Owner · Admin · Support**. None is `platform_admin`, so the page cannot tell
its own reader which column they are in. The real model is per-capability
booleans on `platform_admins` (`can_edit_master_rules`,
`can_enter_support_mode`, …, as `AccessRail` already reads them); the matrix is
a designed fixture drawn beside them. It should be drawn *from* them.

### S0.1 · The support address is on the wrong domain

Settings shows `support@alcassa.app`. The domain is `alcassa.co.ke`, and
`EMAIL_FROM` was set to `support@alcassa.co.ke` last week.

### S0.2 · Settings has nowhere to save — **needs your approval**

The page is honest about it: Save is disabled with *"Not yet saved anywhere.
Platform settings have no store until the settings table lands."* The schema
has `tenant_settings` and no platform-level equivalent.

The fix is a migration: a single-row `platform_settings` table, an RLS policy
admitting platform admins through `withActorContext`, an audited write that
records `settings.updated` with a field-level diff, and the Save button
enabled. **This changes the production schema, so it waits on your yes.**

### X0.1 · Rotate the `alcassa_app` password

While diagnosing A0.1, a shell filter of mine failed to match and printed the
full `DATABASE_URL` — including the `alcassa_app` role's password — into this
session's output. It went nowhere else. Rotate it in Supabase, then update
`.env.local` and the Vercel environment.

---

## Stage 1 · Shared components the three pages need

Doc 22 found the same local component declared in several files with drifting
props. These three pages would add to it unless it is closed first.

- **`Figure`** — the label / right-aligned numeric / note row. Three local
  copies (`VolumeBand`, `MovementBand`, `ActorBand`) with three prop sets, and
  Health added a fourth under a different name (`Fact` in `IsolationBand`).
  One `primitives/Figure.tsx` with the union of their props; delete the four.
- **Page header** — Health now opens with breadcrumbs and a single live status
  chip. Audit, Admins and Settings open with an eyebrow and a title. All four
  should read as one family.
- **`DataSource`** — extracted during Health. Every figure on these three pages
  is either live or designed, and each band should say which.

---

## Stage 2 · The pages

Each page ends the same way: screenshots at desktop and phone, the full gate
run, a push.

### Audit log — the ledger

The question it answers: *what happened, who did it, and can I prove it?*

1. **Header** — breadcrumbs; Export with an explicit range; a live `DataSource`
   stating the entry count and the time of the newest entry.
2. **Integrity statement, promoted.** "Append-only by policy — select, and no
   update or delete, for anyone" is the strongest claim this page makes. It is
   a paragraph under the title today; it should be a stated fact with its
   evidence (the policy, and the newest entry's time).
3. **Volume** (fix A0.1–A0.4), with Nairobi day boundaries and honest empty
   figures.
4. **Operators** — keep; it reads correctly once it has data.
5. **The stream**, rebuilt for 300+ entries:
   - grouped by day, with a sticky day header;
   - filters in the URL, so a filtered view can be shared or reopened;
   - actor and date-range filters beside the existing kind filters, each chip
     showing its count;
   - an entry opens a detail drawer — the field-level diff, the stated reason,
     request id (copyable), IP, and a link to the workspace it touched;
   - paging, so the page does not ship every row;
   - both empty states, separately (A0.2).

### Admins — who holds the keys

The question: *who can act on every workspace, and exactly what may each do?*

1. **Header** with an operator count and one live chip.
2. **Operator cards** from the real record — avatar, capability chips drawn from
   the actual booleans, last active, session count, and MFA state stated
   honestly (unknown is a valid answer; "unknown" in grey beside a name is not).
3. **Capability matrix from the real columns** (AD0.1): rows are capabilities,
   columns are operators, cells are their actual flags. The closing two rows —
   *read a customer message body*, *read a credential value*, empty for
   everyone — stay; they are the page's strongest statement.
4. **Access history** — grants, revocations and capability changes, read from
   the audit log (`admin.*` actions). Who was given what, by whom, when.
5. **Invite** stays inert, but its reason moves beside the button. Today the
   reason is a box above the operator list and the disabled button is at the
   far right of the page; a reason is only useful where the eye is when the
   control refuses.

### Settings — changes that reach every workspace

The question: *what is set platform-wide, who changed it last, and what happens
if I change it?*

1. **A store** (S0.2), then Save enabled.
2. **Every field classified** as live, designed or read-only, per tab — General,
   Security, Notifications, Data, Developer — and each tab says which.
3. **Changes confirmed with their reach.** Saving opens a `ConsoleDialog` that
   lists each changed field as before → after and states that it applies to
   every workspace without an override. On this page a typo is not local.
4. **"Last changed by … at …"** per section, read from the audit log.
5. **Break glass** stays in Settings; its dialog already uses the canon, and it
   gets the same live state treatment as isolation on Health.
6. S0.1's address corrected, and the form keeps its per-field dirty markers and
   sticky save bar.

---

## Stage 3 · Screenshots in CI

`pnpm shots` works locally. In CI it cannot sign in: the app authenticates
through Supabase, and the CI Postgres service has no auth server. The way
through is to shoot the **Vercel preview** each push already produces:

- a workflow on its own branch first (`ci/visual`), triggered by Vercel's
  `deployment_status` event, which carries the preview URL;
- a **dedicated CI operator account** — not Brian's — whose credentials live in
  GitHub secrets (`SHOTS_EMAIL`, `SHOTS_PASSWORD`);
- a Vercel protection-bypass token as a secret, if previews are protected;
- screenshots uploaded as workflow artifacts on every PR, and attached to the
  run summary.

Merged into `main` once it has run green on the branch. **The account and the
three secrets are yours to create;** everything else is code.

---

## Order

1. **Stage 0** — A0.1 first (it is visible to a client today and is three
   one-line changes plus a test), then A0.2–A0.4, AD0.1, S0.1. S0.2 after your
   approval. X0.1 on your side.
2. **Stage 1** — `Figure`, the header family.
3. **Audit → Admins → Settings**, each ending in screenshots, gates, push.
4. **Stage 3** — the CI visual job, on its branch.

---

## Outcome · Settings (30 Sep 2026)

What shipped, and where it departed from the plan above.

**The store (S0.2).** Migration `0002_platform_settings` adds one table and one
row: `platform_name` and `support_email`, a `singleton` column the database
holds to a single `true`, and `updated_by`. It is additive; nothing existing
changed shape. Policies: `platform_settings_select` admits a platform admin and
nobody else, and there is **no** insert, update or delete policy — a save goes
through `updatePlatformSettings` in the platform module, which runs as the
service role and writes `platform.settings_updated` with only the changed fields
in `before` and `after`, in the same transaction. A save carries the version it
loaded and is refused (`platform.settings_conflict`) if another operator saved
in between; the refusal rolls back its audit row too.

**`app.is_platform_admin()`**, a narrow `security definer` function, and with it
`platform_admins_select_operators`: operators now see each other. Until this,
the Admins page could only ever list the person reading it.

**Two more blind readers, found on the way.** The Settings break-glass state and
the support-reference counter both read `platform_audit_log` without an actor —
A0.1's defect in `actions.ts`, which the first guard test did not scan. The
break-glass panel therefore always said "unlocked", and every support reference
was numbered first of its day. Both fixed; the guard now scans the actions
directory and names both readers.

**Departures from the plan, each for a stated reason:**

- *"Applies to every workspace without an override"* is not said anywhere. It is
  not true: nothing customer-facing reads either field yet, and outgoing mail is
  sent from `EMAIL_FROM`. The page says so in a "What reads these" section and
  in the save dialog, and the fact strip shows the real sending address.
- *Every field classified live/designed.* Went further: the Security tab has
  **no toggles**. Four enforced controls are stated with where each is enforced;
  three unbuilt ones (two-factor requirement, idle sign-out, address allow-list)
  are listed as not built. Notifications are drawn as the design's intent, not
  as switches. Retention states that nothing is deleted on a schedule, rather
  than periods no job enforces. Developer no longer lists fixture `pk_live_`
  keys or a "failing" webhook that did not exist.
- *"Last changed" per section.* One section is stored, so one line, plus the
  fact strip.
- *The sticky save bar* is the profile's `UnsavedBar`, moved to
  `components/console/UnsavedBar.tsx` at its second use rather than rebuilt.

**Tests.** `tests/isolation/platform-settings.test.ts` (10 cases: the row is
operator-only and unwritable by the app role; a save writes the diff; a stale
save and an unchanged save write nothing; operators see each other and a
revoked one sees nobody). `shared-tables` declares the new table. The suite
restores the row and removes its probes' audit rows, since it runs against the
development database.

**Follow-ups, not done here:** attach the stored support address to outgoing
mail as reply-to (the email module needs a way to read it outside an operator
context); split `can_suspend_tenants` if saving settings should need its own
capability (today it takes `manage_workspaces`).
