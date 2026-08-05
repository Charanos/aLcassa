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
    id = auth.uid()
    or exists (
      select 1
      from tenant_members mine
      join tenant_members theirs on theirs.tenant_id = mine.tenant_id
      where mine.user_id = auth.uid()
        and theirs.user_id = user_profiles.id
        and mine.tenant_id = app.current_tenant_id()
        and mine.deleted_at is null
        and theirs.deleted_at is null
    )
  );

create policy user_profiles_modify on user_profiles
  for all
  using (id = auth.uid() and not app.is_support_session())
  with check (id = auth.uid());

-- ─── tenant_members ─────────────────────────────────────────────────────────

alter table tenant_members enable row level security;
alter table tenant_members force row level security;

create policy tenant_members_select on tenant_members
  for select using (tenant_id = app.current_tenant_id());

-- Owners and admins manage the team. Support never writes here: 09 §4 marks
-- member removal as no-access, and the isolation suite generates case 9 from
-- that matrix rather than from this file, so the two cannot silently diverge.
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

-- Accepting an invitation happens BEFORE the acceptor has a membership, so it
-- cannot resolve a tenant context. It runs through `withoutTenantContext` and a
-- security-definer function that looks the invitation up by token hash, which
-- is why there is no "public select" policy here: the token is the credential,
-- and a policy that let an unauthenticated caller read this table by any other
-- means would leak every pending invitation on the platform.

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
    user_id = auth.uid()
    or (
      kind = 'support'
      and tenant_id = app.current_tenant_id()
      and app.current_role() in ('owner', 'admin')
    )
  );

create policy sessions_modify on sessions
  for all
  using (
    user_id = auth.uid()
    or (
      kind = 'support'
      and tenant_id = app.current_tenant_id()
      and app.current_role() = 'owner'
      and not app.is_support_session()   -- a support session cannot extend itself
    )
  )
  with check (user_id = auth.uid() or kind = 'support');

-- ─── platform_admins ────────────────────────────────────────────────────────
-- Not tenant-scoped. A platform admin reads their own row; the table is
-- otherwise managed through the platform door.

alter table platform_admins enable row level security;
alter table platform_admins force row level security;

create policy platform_admins_select on platform_admins
  for select using (user_id = auth.uid() and deleted_at is null);
