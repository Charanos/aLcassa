# 19 · The Profile Surface, and Avatars

**13 September 2026.** The second surface through the `18` playbook, and the first
one to add a whole capability rather than refine an existing one.

---

## 0. What this document is for

Doc `18` is the method. This is the record of applying it to `/platform/profile`,
plus the design of the feature that pass turned out to require: **a real profile
photograph, stored, replaceable, removable, and visible everywhere the operator
appears.**

The avatar work is here rather than in `18` because it is not a refinement
pattern. It is a vertical slice — a storage bucket, an RLS policy, a CSP change,
two server actions, a browser-side image pipeline and a propagation path — and
the next surface that needs an uploaded image (the tenant logo, `05 §7`) should
read this rather than rediscover it.

---

## 1. The gap that started it

The profile card carried this sentence:

> Initials are generated from your name. The console shows no photographs, so an
> avatar can never leak a face into a screenshot.

It reads as a security decision. It was a description of an unbuilt feature, and
three facts contradicted it:

| Fact | Where |
| --- | --- |
| `user_profiles.avatar_path` has existed since the first migration | `db/schema/identity.ts:45` |
| `PATCH /v1/me` has always accepted an avatar path | `app/api/v1/me/route.ts:49` |
| The shell rendered a **stock photograph of a stranger** as the operator, in three places | `ConsoleShell.tsx` ×3 |

`Avatar.tsx` — written to replace that photograph with initials — ended with the
instruction this document acts on:

> When real uploaded avatars exist they belong here, behind an `src` prop with
> this as the fallback, and the CSP should be widened only to whatever bucket
> actually serves them.

**A product that stores a field, exposes it over its own API, and tells the
operator the feature does not exist is not being careful.** The copy was removed,
not softened.

---

## 2. Storage

### The bucket

`avatars`, **public-read**, created by `db/policies/08_storage.sql` with an
idempotent insert so applying the catalogue twice is a no-op.

Path shape: `platform/<user id>/<random uuid>.<ext>`

### Why public-read, which is a decision and not a default

The alternative is a signed URL, which is what `tenant/live.ts` reaches for with
the tenant logo. For an avatar it is the wrong trade: **the console chrome
renders this image three times on every page**, so signing would put a Supabase
round trip in the layout's critical path on every navigation — to protect a
photograph the operator uploaded so their colleagues would see it.

What makes public acceptable rather than lazy:

- the path carries a **random segment**, so the bucket is not enumerable from a
  user id;
- the CSP is widened to **exactly one host**, derived from
  `NEXT_PUBLIC_SUPABASE_URL`, so each environment admits only its own project;
- nothing but avatars goes in the bucket, and the write policy makes that
  structural rather than conventional;
- the browser **strips EXIF before upload**, so a phone photograph cannot publish
  the operator's GPS coordinates into a public object.

That last one is the reason the downscale is not merely an optimisation.

### Why the path is random

A stable path (`platform/<id>/avatar.png`) would be guessable, and worse, it
would be **cached**: replacing an avatar at the same URL leaves every browser,
proxy and `next/image` optimiser serving the old face until something expires. A
fresh path per upload makes replacement instant everywhere and makes the previous
object unreachable the moment the row stops pointing at it.

It is also what lets `cacheControl: '31536000'` be correct.

### Why the signed-in client, not the admin client

`lib/auth/supabase/admin.ts` is lint-guarded to `modules/platform` and its header
states the rule: *"if a session exists, use `createSupabaseServerClient()` and let
the policies apply."* A person uploading their own face is the clearest case of
an operation that can run as the person it concerns.

### The policy, and why `auth.uid()` here

Every other policy in the catalogue reads `app.current_actor_id()`, a GUC this
application sets on its own connection. **Storage is not reached over that
connection** — it is reached over Supabase's API with the user's JWT, where
`auth.uid()` is the token subject. Same person, different door, different
accessor. `app.current_actor_id()` there would read an unset GUC and refuse
everything.

There is **no update policy**, deliberately, for the same reason the audit log
has none: RLS denies by default, so its absence makes in-place overwrite
impossible for anyone. `upsert: false` in the code is then a property of the
system rather than an argument somebody remembered to pass.

---

## 3. The browser-side pipeline

`lib/storage/prepareAvatar.ts`. Four jobs, three of which are correctness:

1. **Strips EXIF, including GPS.** The bucket is public. Uploading a raw camera
   file would publish where it was taken, usually the operator's home. Re-encoding
   through a canvas drops every metadata block. This happens **before** the
   network call — stripping server-side would mean the coordinates still
   travelled and still landed in a request log.
2. **Applies EXIF orientation first.** Phones rely on that block rather than
   rotating pixels. Dropping it without applying it is how an avatar ends up
   sideways.
3. **Crops to a centred square.** The avatar is a circle at every call site, so
   CSS would crop it anyway — differently in each of the five places it appears.
4. **Downscales to 512px, re-encodes to WebP.** It renders at 24–84px.

**None of it is a security control.** The server action re-checks the size and
sniffs the magic bytes, because those are the checks that must hold against a
caller that never ran this code.

### Magic bytes, not `File.type`

`File.type` is derived from the extension on most platforms. `payload.exe`
renamed to `me.png` arrives declaring `image/png`. Since the bucket is
public-read, trusting the declaration is how a storage bucket becomes somebody
else's CDN. Three signatures are checked against the first twelve bytes.

### `serverActions.bodySizeLimit`

Next's default is **1MB**; `MAX_AVATAR_BYTES` is 2MB. Without raising it, a 1.4MB
upload is refused by the framework with a generic error and the product's own
validation — the one that produces a sentence an operator can act on — never
runs. Set to `2.5mb` so the application's limit always fires first.

---

## 4. Propagation, which was the actual bug

The user's question — *"how do profile changes propagate to the sidebar and top
bar?"* — found two defects that had nothing to do with avatars.

### 4.1 The layout was never revalidated

`revalidatePath(path)` with its default scope revalidates the **page segment
only**. The sidebar identity card, the top-bar account control and the account
dropdown all live in the console **layout**. So renaming yourself updated the
profile and the roster while every screen's chrome kept the old name until a hard
reload.

Fixed by `revalidatePath('/platform', 'layout')`, applied by one `PROPAGATE()`
helper so all three profile actions do the same thing.

### 4.2 The chrome read the wrong column

`getLiveConsoleChrome` selected `platform_admins.display_name` alone.

Renaming yourself writes `user_profiles.full_name` — deliberately, because
rewriting your own entry in the access register is the wrong direction for a
security record. The profile screen and the admin roster both **prefer the profile
name when one exists**. The chrome did not, so it would have shown the stale name
even with the layout revalidated.

Precedence is now the same everywhere: **profile name, then roster label, then the
session's own label.**

### The full propagation path

```
picker  →  updateConsoleAvatar / updateConsoleProfileName
        →  user_profiles row + platform_audit_log row (one transaction)
        →  PROPAGATE()  ─ revalidatePath('/platform', 'layout')
        →  getLiveConsoleChrome re-reads full_name + avatar_path
        →  ConsoleAccount { name, initials, avatarUrl }
        →  Avatar ×3 in the shell, and the profile card
```

---

## 5. The playbook applied

| Step | What it found here |
| --- | --- |
| **Componentise** | One 477-line `'use client'` panel → six files, two islands. |
| **Truth** | Expired sessions listed as live; a fabricated security history on the live screen; `emailVerified: false` meaning "we did not look"; capability flags read and discarded. |
| **Tokens** | 15 raw values from the front-end pass; two `font-medium` against a weight ceiling of 500. |
| **States** | Loading skeleton with the wrong column count; no resting state; no truncation notice. |
| **Interaction** | A revoke that reported success for zero rows; no confirmation on destructive controls; reasons only in `title=`. |
| **A11y** | A hover tint on a non-interactive row; no live region on the save status. |

### 5.1 Componentisation, and the client/server split

The old panel was `'use client'` at the top of the whole screen to obtain one
text input and two buttons. A security checklist that never changes, a capability
list and three sentences of static prose were all serialised to the browser and
hydrated to sit there being static.

What is client code now, and nothing else: the name field, the avatar picker, the
two revoke controls, the pager, and the unsaved bar.

**The trick that made it possible.** The unsaved-changes bar must be `sticky` at
the END of the page — sticky only works inside its own container, so a bar inside
the identity card stops following the reader exactly when they scroll past it.
That puts the draft state above every card, and the naive conclusion is that
every card must be client code.

It does not. `ProfileForm` is a client component that takes `main` and `rail` as
**ReactNodes constructed on the server**. It never looks inside them; they never
hydrate. Same inversion `PagedList` uses to page server children, applied to
state instead of windowing.

### 5.2 Truth defects worth naming

**Expired sessions were listed as live.** `getLiveProfile` filtered on
`revoked_at is null` and not on expiry, so a timed-out laptop appeared under
"Devices currently signed into this account". On the one screen that answers *is
something else signed in as me*, that manufactures an intruder out of last
Tuesday. `listActiveSessions` in `lib/auth/session.ts` always had the predicate;
the two readers now agree.

**The security checklist was fabricated on the live screen.** The live reader
passed the designed fixture's `security` array straight through, so a real
operator was told "added 14 March 2025", "changed 62 days ago", "eight of ten
remaining" about their own account. Those three facts live in `auth.users`, which
nothing here reads. Now `SECURITY_POLICY`, shared by both paths, every item
`measured: false`, and the card says so once in its footer.

**`emailVerified: false` meant "we did not look".** It rendered identically to an
address that was genuinely never confirmed — opposite claims. Now `boolean | null`
with three distinct renderings, following `Admin.mfa`'s "MFA unknown" precedent.

**The capability flags were read and thrown away.** `getLiveProfile` selected all
three `platform_admins` booleans and used them only to collapse into a role
label. `05 §4` chose per-capability booleans over a role enum *precisely* so this
could be stated exactly. The rail now lists all three, and **shows a withheld
grant rather than omitting it** — a capability that disappears when not granted
is indistinguishable from one the product does not have.

### 5.3 A revoke that reported success for zero rows

`revokeSession` returned `void` and matched on session id alone, so a stale id, a
foreign id and an already-revoked row all produced: zero rows, no error, and a
caller free to report success. Press "End session", see no error, watch the row
stay.

It now returns a count. Zero is an error with its own sentence, and **no audit row
is written** — recording `session.revoked` for a revocation that revoked nothing
puts a false event in the log a security review reads.

The `user_id` predicate added alongside is belt and braces: `sessions_modify`
already admits only `user_id = app.current_actor_id()`. It is in the query so the
restriction is legible to whoever is reading the query rather than only to
whoever has read the policy file.

---

## 6. What this surface does NOT do

Recorded so each is a decision rather than an oversight.

| Gap | Why |
| --- | --- |
| **In-app navigation does not warn about unsaved changes** | `beforeunload` covers closing the tab. Next's App Router has no supported client-navigation interception, and the workarounds — patching history, wrapping every `<Link>` — break the back button worse than the problem. |
| **MFA, password and recovery codes cannot act** | They live in `auth.users`, behind the admin client that is lint-guarded for bypassing RLS. Widening that guard so a console screen can redraw a checklist is a poor trade. Disabled, with the reason **on the surface** — `17 §6.4`. |
| **The email address cannot be changed** | It needs an approval flow that does not exist. Stated on the field. |
| **No image cropper** | A centred square crop, with the result shown in the picker before it commits. A drag-to-position cropper is a real feature and a separate one. |
| **Only the session sweep sends email** | A rename or a photo change has no "if this wasn't you" reading. Mailing every profile edit trains the recipient to ignore the one message that matters. |
| **The notification bell is still fixture-backed** | There is no notifications table in the schema. `liveChrome.ts` has said so since it was written; this pass did not invent one. |

---

## 7. Two primitives this pass added

### `SettingsSection` (`console/Surface.tsx`)

A card with a **title and a standfirst**, for screens the operator came to change
something on.

`Panel variant="elevated"` is also a card. The difference is the heading: `Panel`
titles a BAND on a briefing screen with a mono uppercase eyebrow, and has nowhere
to put a sentence — deliberately, because a band needing a sentence of
explanation is a band whose visualisation has failed. A settings section is the
opposite reading task: nobody scans it, they arrive looking for one control, and
"Devices currently signed into this account" does more work than the word
"Sessions" above it.

**Thirteen hand-rolled copies of this shape exist** — four on the profile, eight
in `SettingsPanel`, one in the sessions view. The profile is the first consumer;
settings adopts it in its own pass, and that pass is then a deletion rather than a
redesign.

### `ConsoleHeader rule`

Three pages wrapped `ConsoleHeader` in `<div className="border-b pb-5">` and added
`mt-6` beneath. The header carries its own `mb-10`, so the result was: title, 40px
of air, a hairline, 24px more, content — a rule floating in the middle of an
80px gap, attached to nothing. `rule` collapses the margin into the rule's own
spacing. Settings and support-sessions drop their wrapper when their pass comes.

---

## 8. Working alongside the front-end agent

This pass ran concurrently with front-end edits to the same files, and the
collision was instructive enough to record.

Raw colour reappeared three times in files that had just been tokenised —
`#f8fafc` on an audit note, `#ffffff`/`#fafafa` on two field grounds, and five
palette values in a set of hand-rolled status chips that replaced `StatusBadge`.

**The design intent behind each was right and was kept.** The squarer chip is what
`StatusBadge`'s `squircle` variant is for; the 84px picker tile is a better size
than 72px and `Avatar` gained a numeric size to support it; the audit note's
roomier padding stayed.

**What was reverted was only the raw values.** `03 §2`: a raw hex in a component
file is the one value in the system that cannot follow a theme, a tier change or a
ground swap. `StatusBadge` was rewritten out of 36 palette classes and 16 `rgba()`
literals for exactly this reason, and re-deriving a green chip by hand in one
component puts the drift back where nobody will look for it.

**The lesson for sequencing:** tokenisation and visual iteration on the same file
at the same time means the tokens lose, repeatedly, because the visual pass is
where the file is actually being typed. Either the visual pass lands first and the
token sweep follows, or the shared primitives (`StatusBadge`, `Avatar`,
`SettingsSection`) are rich enough that the visual pass never needs a literal. The
second is the durable answer, and is why this pass put three more variants into
primitives instead of into the surface.

---

## 9. Environment prerequisites

The code is complete. Two things must be true of a Supabase project for avatars
to work in it:

1. **The `avatars` bucket exists.** `pnpm db:policies` creates it — the insert is
   at the foot of `08_storage.sql` and is idempotent.
2. **`NEXT_PUBLIC_SUPABASE_URL` is set at build time.** The CSP's `img-src` and
   `next.config.ts`'s `remotePatterns` both derive the storage origin from it. If
   it is unset or unparseable both **fail closed** — the host is omitted, avatars
   do not render, and the policy does not weaken. A visible broken avatar rather
   than an invisible hole.

Neither has been exercised against a live project from this environment. The
isolation suite cannot run here either (`ENOTFOUND`), so **the storage policy and
the upload path are unverified against a real database** and should be the first
thing checked on a deployment that has one.

---

## 10. The half-signed-out state

**Found 14 Sep 2026, from a screenshot of the upload failing.**

The reported symptom was an avatar upload returning an authentication error. The
error was real, the cause was not the avatar, and the diagnosis exposed the worst
defect on the surface.

### What was actually happening

`middleware.ts` admits any request carrying the platform cookie. Its own comment
is candid about the limit: *"coarse access control … this only avoids rendering a
shell for a request that has no session."* The live readers need something
stricter — a resolvable **Supabase auth session**.

Those two come apart whenever the identity provider's token expires while the
cookie survives. That is an ordinary Tuesday, not an edge case.

When they came apart:

| Layer | Behaviour |
| --- | --- |
| Middleware | Admits the request — cookie present |
| `getLiveProfile()` | Returns `null` — no auth session |
| The page | `?? getProfile()` renders the **designed fixture** |
| Every action | Resolves the session properly and **correctly refuses** |

So the console presented a name, an "Admin since 14 Mar 2025", three devices in
Nairobi and Mombasa and an address marked *verified* — all invented, none
labelled — as the reader's own account. Then every control failed on click.

**`?? getProfile()` is the right fallback and it was hiding this.** The seam is
correct; what was missing is that nothing downstream knew which reader answered.

### The fix, in three parts

1. **`live` is part of the page's state.** `const live = await getLiveProfile()`
   and the boolean travels to every write control.
2. **`PreviewNotice`** says the data is designed, that nothing can be saved, and
   offers `/platform/sign-in?next=/platform/profile` — `02 §3` preserves the
   return path everywhere else, and a banner that drops somebody on the overview
   has made them navigate back.
3. **Every write control is inert with a stated reason** — the name field, the
   avatar picker, both revoke buttons — and the unsaved-changes bar does not
   render at all. A floating "Save changes" over data belonging to nobody is the
   screen's most confident lie.

### And a leak that shipped in the diagnosis

Three catch blocks had grown `(Stage: ${JSON.stringify(error.internal)})`. It was
added during the front-end pass as a debugging aid and it did its job — the
screenshot of that string is how the above was diagnosed in one step.

It cannot ship. `AppError.internal` is documented as *"detail that goes to the log
and never to the client"*, and this put the auth resolver's stage names, the door
and the identity provider's own error codes on screen, in red, for somebody whose
only available action is to sign in again.

Replaced by `refusal()`, which routes every catch through one place, keeps the
internals in `logger.error`, and recognises `AUTH_SESSION_EXPIRED` as its own
outcome carrying `signedOut: true` — because that failure needs a **sign-in link**
rather than a "try again", and offering retry for it is inviting somebody to press
a button that will fail identically every time.

### The general rule

**A surface with a live-or-fixture seam must know which one answered, and say so
whenever the answer changes what the reader can do.**

Every other console surface has the same `getLiveX() ?? getX()` shape. The ones
that only READ are fine — a designed number is a designed number. The ones that
can WRITE all have this defect latent in them: tenants, settings, AI rules, the
tenant detail tabs. Each should carry `live` the same way when its pass comes.

**Added to 18's checklist, under TRUTH:**

```
  [ ] if the surface can write, it knows whether the model is live —
      and every control says so before it is pressed, not after
```

---

## 11. Reconciling the front-end pass, round two

Same collision as §8 and worth recording because the shape repeated exactly:
design intent good, literals not.

| What frank changed | Kept | Corrected |
| --- | --- | --- |
| Rows became individual cards with a hover lift | The card shape and the lift | `bg-white` → `--surface-raised`; two hand-mixed shadows → `--shadow-sm` / `--shadow-md` |
| `RowGlyph` at 40px with green tones | The larger glyph | `#f0fdf4`, `#22c55e`, `#bbf7d0`, `#e2e8f0`, `#94a3b8` → the `--badge-*` set |
| The unsaved bar gained ambient art from the overview hero | All of it | `#060913` → `--chrome-bg-base` (it was already the same value, re-typed); `rgba(255,255,255,…)` → `--chrome-rule-strong`, `--shadow-lg` |
| Upload became a hand-rolled `<button>` | The visual result — their colours were tokenised | Restored `Button`: the bare element had no disabled treatment, no `focus-visible` ring and no `motion-reduce`, and this control is disabled in two states |
| `SettingsSection title=""` on the identity card | The card having no header — the page heading names it | Made `title` optional and the header block conditional; `""` emitted an empty `<h2>` into the document outline |

**The mask-gradient exception.** `maskImage: linear-gradient(135deg, #000 …)`
keeps its literal. A mask's colour is never painted — only its alpha channel is
read — so tokenising it would imply a palette decision where none exists. It is
the second documented exception to §2's no-raw-colour rule, after brand marks.
