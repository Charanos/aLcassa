-- ════════════════════════════════════════════════════════════════════════════
-- POLICIES · storage objects
--
-- 05 §9. THE BUCKET IS A TABLE, AND IT GETS THE SAME TREATMENT AS EVERY OTHER.
--
-- `storage.objects` is an ordinary Postgres table with row level security, so
-- "who may write an avatar" is answered by a policy rather than by whichever
-- function happens to perform the upload. That matters more here than it looks:
-- the application code that uploads runs as the signed-in user through
-- `createSupabaseServerClient()`, precisely so these policies apply — but a
-- future caller that forgot, or a compromised route, would still be refused.
-- The guarantee lives in the database.
--
-- ⚠ THIS FILE ASSUMES THE BUCKET EXISTS. Creating a bucket is a data insert
-- into `storage.buckets`, not a schema change, so it is done once per
-- environment. The statement is at the foot of this file, guarded so re-running
-- the catalogue is harmless.
--
-- ⚠ WHY `auth.uid()` HERE AND `app.current_actor_id()` EVERYWHERE ELSE.
--
-- Every other policy in this catalogue runs against a connection whose context
-- this application set — `app.current_actor_id()` reads a GUC that
-- `withActorContext` wrote. Storage is not reached over that connection. It is
-- reached over Supabase's own API with the user's JWT, where `auth.uid()` is
-- the subject of that token. Same person, different door, different accessor.
-- Using `app.current_actor_id()` here would read an unset GUC and refuse
-- everything.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── avatars ────────────────────────────────────────────────────────────────
-- Layout: platform/<user id>/<random>.<ext>
--
-- `storage.foldername(name)` splits the object path on '/', so for the path
-- above it yields {platform, <user id>}: index 1 is the literal prefix and
-- index 2 is the owner. Both are asserted — the prefix so this bucket cannot
-- quietly grow a second unpoliced shape, the owner so nobody can write into
-- somebody else's folder.

-- Anyone may read. The bucket is public by design and the reasoning is in
-- `lib/storage/avatar.ts`: the console chrome renders an avatar three times on
-- every page, so a signed URL would put a round trip in the layout's critical
-- path to protect a photograph the operator uploaded to be seen. The path
-- carries a random segment, so the bucket is not enumerable from a user id.
drop policy if exists avatars_read on storage.objects;
create policy avatars_read on storage.objects
  for select using (bucket_id = 'avatars');

-- ⚠ A SIGNED-IN USER WRITES ONLY UNDER THEIR OWN ID. This is the whole policy.
-- It is what makes `platform/<userId>/...` a guarantee rather than a naming
-- convention that the upload function happens to follow.
drop policy if exists avatars_insert on storage.objects;
create policy avatars_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = 'platform'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

-- Deleting your own. The application replaces rather than overwrites — a fresh
-- random path per upload — so this is reached when clearing the old object
-- after a successful replacement, and when removing an avatar outright.
drop policy if exists avatars_delete on storage.objects;
create policy avatars_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = 'platform'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

-- ⚠ THERE IS NO UPDATE POLICY, AND THE ABSENCE IS THE DESIGN.
--
-- Same reasoning as the audit log two files up: RLS denies by default, so no
-- update policy means no in-place overwrite is possible for anyone, through any
-- door. `uploadAvatar` passes `upsert: false` and a fresh path every time, and
-- this is what makes that a property of the system rather than an argument
-- somebody remembered to pass.

-- ─── the bucket itself ──────────────────────────────────────────────────────
-- Idempotent: the catalogue is applied on every migration, and a second run
-- must be a no-op rather than an error.
-- Enforce the same limits at Storage's API, including callers that bypass the profile form.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
