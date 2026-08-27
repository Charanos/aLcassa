-- ════════════════════════════════════════════════════════════════════════════
-- POLICIES · identity and membership
-- 06 §5 role matrix · 09 §4 support matrix
-- ════════════════════════════════════════════════════════════════════════════

-- ─── user_profiles ──────────────────────────────────────────────────────────
-- Not tenant-scoped: a user is a user, and one person may hold memberships in
-- more than one tenant. Visibility is "myself, and anyone I share a tenant
-- with", which is what a team list needs and nothing more.
--
-- ⚠ 01 §9 question 3 is still open: whether a tenant owner's email must be
-- unique across the platform, or whether one person can own two tenants. This
-- policy assumes the latter. If Brian answers otherwise, this changes.

alter table user_profiles enable row level security;
alter table user_profiles force row level security;

create policy user_profiles_select on user_profiles
  for select using (
    id = app.current_actor_id()
    or exists (
      select 1
      from tenant_members mine
      join tenant_members theirs on theirs.tenant_id = mine.tenant_id
      where mine.user_id = app.current_actor_id()
        and theirs.user_id = user_profiles.id
        and mine.tenant_id = app.current_tenant_id()
        and mine.deleted_at is null
        and theirs.deleted_at is null
    )
  );

create policy user_profiles_modify on user_profiles
  for all
  using (id = app.current_actor_id() and not app.is_support_session())
  with check (id = app.current_actor_id());

-- ─── tenant_members ─────────────────────────────────────────────────────────

alter table tenant_members enable row level security;
alter table tenant_members force row level security;

-- ⚠ THE SECOND BRANCH IS WHAT MAKES SIGNING IN POSSIBLE, AND IT IS NOT A
--   WIDENING OF THE FIRST.
--
-- Resolving a session is a chicken-and-egg problem: to set a tenant context
-- the application must first know which tenant this person belongs to, and
-- that answer lives in this table. Scoped to `current_tenant_id()` alone,
-- the lookup returns nothing at the exact moment it is needed, and nobody can
-- sign in. 02 §11 needs the same read to tell a user with no membership that
-- their account is not attached to a workspace, rather than showing them a
-- broken shell.
--
-- It reads MY OWN rows, never anyone else's: `user_id = current_actor_id()`
-- is true for at most the handful of memberships one person holds. Isolation
-- case 2 still passes — tenant A's actor asking for tenant B's member row
-- matches neither branch, because that row is neither in A's tenant nor owned
-- by A's user.
create policy tenant_members_select on tenant_members
  for select using (
    tenant_id = app.current_tenant_id()
    or user_id = app.current_actor_id()
  );

-- Owners and admins manage the team. 24 Aug 2026, per 01 D-13: support now
-- writes here too, since `can_write_settings()` admits the support role.
-- Member removal was previously no-access for support per 09 §4's original
-- proposal; that proposal is superseded by Brian's read-write confirmation.
-- The isolation suite generates its support-mode cases from the role matrix
-- in 06 §5, not from this file, so the two cannot silently diverge; the
-- matrix was updated in the same pass as this policy.
create policy tenant_members_modify on tenant_members
  for all
  using (
    tenant_id = app.current_tenant_id()
    and app.can_write_settings()
  )
  with check (tenant_id = app.current_tenant_id());

-- ─── invitations ────────────────────────────────────────────────────────────

alter table invitations enable row level security;
alter table invitations force row level security;

create policy invitations_select on invitations
  for select using (tenant_id = app.current_tenant_id());

create policy invitations_modify on invitations
  for all
  using (
    tenant_id = app.current_tenant_id()
    and app.can_write_settings()
  )
  with check (tenant_id = app.current_tenant_id());

-- ────────────────────────────────────────────────────────────────────────────
-- ACCEPTING AN INVITATION, AND WHY IT IS TWO FUNCTIONS RATHER THAN A POLICY.
--
-- Acceptance happens BEFORE the acceptor has a membership, so no tenant
-- context can resolve and every policy above matches nothing. There is
-- deliberately NO "public select" policy here: one that let an
-- unauthenticated caller read this table by any means other than a token
-- would leak every pending invitation on the platform, addresses included.
--
-- The token IS the credential, so the only correct shape is a function that
-- takes the token hash and returns exactly the row it names. These are
-- SECURITY DEFINER, so they run as the owner and see past RLS — which is
-- precisely why each one is narrow, takes a hash rather than an id, and
-- returns no token material.
--
-- `search_path` is pinned on both. A SECURITY DEFINER function without it can
-- be hijacked by a caller who creates a same-named table earlier in their own
-- path, which turns a helper like this into an privilege escalation.
-- ────────────────────────────────────────────────────────────────────────────

-- ⚠ DROPPED BEFORE CREATE, NOT "create or replace". Postgres refuses to
--   replace a function whose OUT parameter NAMES have changed, and the error
--   it gives names the line rather than the reason. Dropping first makes the
--   catalogue reconcilable to this file no matter what the previous shape was,
--   which is the same reasoning apply-policies.ts uses for policies.
drop function if exists app.invitation_by_token(text);
drop function if exists app.accept_invitation(text, uuid, text, text);

-- Read-only preview for the accept screen: who invited you, to what, as what.
create or replace function app.invitation_by_token(p_token_hash text)
returns table (
  invitation_id uuid,
  tenant_id uuid,
  tenant_name text,
  invited_email text,
  invited_role member_role,
  invited_by_name text,
  expires_at timestamptz,
  accepted_at timestamptz,
  revoked_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select i.id, i.tenant_id, t.name, i.email, i.role, up.full_name,
         i.expires_at, i.accepted_at, i.revoked_at
  from invitations i
  join tenants t on t.id = i.tenant_id
  left join user_profiles up on up.id = i.invited_by
  where i.token_hash = p_token_hash;
$$;

-- The acceptance itself, whole, in one statement.
--
-- ⚠ MARKING THE TOKEN USED AND CREATING THE MEMBERSHIP MUST BE ATOMIC.
--   A failure between them burns a single-use token without granting access,
--   which locks an invited person out of a workspace while their link reports
--   "already accepted". Doing it here rather than in three application
--   statements makes that indivisible by construction.
create or replace function app.accept_invitation(
  p_token_hash text,
  p_user_id uuid,
  p_full_name text,
  p_email text
)
-- ⚠ THE OUT PARAMETERS ARE PREFIXED, AND THEY HAVE TO BE.
--   Naming one of them `tenant_id` puts that identifier in scope for every
--   statement in the body, so `insert into tenant_members (tenant_id, ...)`
--   becomes "column reference tenant_id is ambiguous" and the function fails
--   at run time rather than at creation. Prefixing them removes the collision
--   outright instead of relying on qualification everywhere.
returns table (accepted_tenant_id uuid, accepted_role member_role)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  inv record;
begin
  select i.* into inv from invitations i where i.token_hash = p_token_hash;

  if not found then
    raise exception 'invitation_not_found' using errcode = 'P0002';
  end if;
  if inv.revoked_at is not null then
    raise exception 'invitation_revoked' using errcode = 'P0001';
  end if;
  if inv.accepted_at is not null then
    raise exception 'invitation_already_accepted' using errcode = 'P0001';
  end if;
  if inv.expires_at <= now() then
    raise exception 'invitation_expired' using errcode = 'P0001';
  end if;

  update invitations set accepted_at = now() where id = inv.id;

  -- The profile, so the team list can name this person rather than showing
  -- "Pending" against somebody who has actually arrived. Existing profiles
  -- are left alone: joining a second workspace is no reason to overwrite the
  -- name and address someone already chose.
  insert into user_profiles (id, full_name, email)
  values (
    p_user_id,
    coalesce(nullif(btrim(p_full_name), ''), split_part(inv.email, '@', 1)),
    coalesce(nullif(btrim(p_email), ''), inv.email)
  )
  on conflict (id) do nothing;

  insert into tenant_members (tenant_id, user_id, role, status, invited_by, joined_at)
  values (inv.tenant_id, p_user_id, inv.role, 'active', inv.invited_by, now())
  on conflict (tenant_id, user_id) do nothing;

  accepted_tenant_id := inv.tenant_id;
  accepted_role := inv.role;
  return next;
end;
$$;

-- The application role may call both. It may still not SELECT the table.
grant execute on function app.invitation_by_token(text) to public;
grant execute on function app.accept_invitation(text, uuid, text, text) to public;

-- ─── sessions ───────────────────────────────────────────────────────────────
-- 04 §6. Sessions are rows, so revocation is real and immediate.
--
-- A user sees and revokes their own sessions. 09 §7 and design sheet 07 add
-- one more: a tenant owner sees, and can revoke, a support session opened into
-- their own workspace. That is the difference between a ceiling and a promise.

alter table sessions enable row level security;
alter table sessions force row level security;

create policy sessions_select on sessions
  for select using (
    user_id = app.current_actor_id()
    or (
      kind = 'support'
      and tenant_id = app.current_tenant_id()
      and app.current_role() in ('owner', 'admin')
    )
  );

create policy sessions_modify on sessions
  for all
  using (
    user_id = app.current_actor_id()
    or (
      kind = 'support'
      and tenant_id = app.current_tenant_id()
      and app.current_role() = 'owner'
      and not app.is_support_session()   -- a support session cannot extend itself
    )
  )
  /**
   * ⚠ THE TENANT CLAUSE IS THE FIX FOR A REAL GAP, FOUND 27 Aug 2026.
   *
   * This used to read `with check (user_id = current_actor_id() or kind =
   * 'support')` — no constraint on tenant_id at all. A user could therefore
   * UPDATE their own session row and set its tenant_id to ANY workspace,
   * including one they have no membership in. Isolation case 6 ("moving one
   * of tenant A's own rows into tenant B is rejected") is written to catch
   * exactly that, and it had been passing for the wrong reason: while the
   * policies called auth.uid(), which is null on the application connection,
   * nothing on this table was writable by anyone, so the case could not fail.
   * Repairing that made the real gap visible on the next run — and left one
   * migrated row, user A's session pinned to tenant B, as the evidence.
   *
   * The blast radius was limited rather than nil: `resolveSessionCore` reads
   * the tenant from the session and then requires a membership in it, so a
   * moved session resolved to `auth.no_membership` rather than to another
   * tenant's data. That is defence in depth working, not a reason to leave
   * the hole open — the whole point of a with-check clause is that it holds
   * whether or not the application above it is careful.
   *
   * A session may now be pinned only to a workspace its owner belongs to.
   * The `tenant_id is null` branch is what lets a platform session, which is
   * scoped to no tenant, exist at all.
   */
  with check (
    kind = 'support'
    or (
      user_id = app.current_actor_id()
      and (
        tenant_id is null
        or exists (
          select 1 from tenant_members m
          where m.tenant_id = sessions.tenant_id
            and m.user_id = app.current_actor_id()
            and m.deleted_at is null
        )
      )
    )
  );

-- ─── platform_admins ────────────────────────────────────────────────────────
-- Not tenant-scoped. A platform admin reads their own row; the table is
-- otherwise managed through the platform door.

alter table platform_admins enable row level security;
alter table platform_admins force row level security;

create policy platform_admins_select on platform_admins
  for select using (user_id = app.current_actor_id() and deleted_at is null);
