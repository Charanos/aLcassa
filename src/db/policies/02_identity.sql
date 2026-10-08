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
    -- Doc 24 · Stage 3. Inside a support session the operator is a member of
    -- nothing, so the branch above hid every name on the workspace's own team
    -- page. A support session reads the profiles of THIS workspace's members,
    -- exactly as its staff do — and no one else's.
    or (
      app.is_support_session()
      and exists (
        select 1 from tenant_members theirs
        where theirs.user_id = user_profiles.id
          and theirs.tenant_id = app.current_tenant_id()
          and theirs.deleted_at is null
      )
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

  -- ⚠ THE JOIN WAS NOT AUDITED, AND EVERY OTHER MEMBERSHIP CHANGE IS.
  --
  -- Definition of done, condition 3: "Every write action produces an audit
  -- entry recording actor, tenant, action, entity, before and after state."
  -- Inviting was audited. Removing was audited. Changing a role was audited.
  -- ACCEPTING was not — so a workspace's own activity log showed an
  -- invitation going out and then nothing, and a new person simply appeared
  -- in the team list with no record of when or how.
  --
  -- `member.joined` was defined in AUDIT_ACTIONS from the beginning and never
  -- emitted, because the write moved into this function when the acceptance
  -- flow was repaired (C31) and the audit row did not come with it.
  --
  -- It goes here rather than in the caller so it cannot come apart from the
  -- membership: same function, same transaction, both or neither.
  --
  -- `actor_user_id` is the person joining. They are acting on their own
  -- behalf — nobody did this TO them — which is why this is not a
  -- platform_admin entry and why support_mode is false.
  insert into audit_log (
    tenant_id, actor_user_id, actor_type, actor_label, support_mode,
    action, entity_type, entity_id, before, after, request_id
  )
  values (
    inv.tenant_id, p_user_id, 'user',
    coalesce(nullif(btrim(p_full_name), ''), inv.email),
    false,
    'member.joined', 'tenant_member', null,
    null,
    jsonb_build_object('role', inv.role, 'invitedBy', inv.invited_by),
    -- The function has no request id of its own. Naming the flow is more
    -- useful in a log than a null, and it is not pretending to be one.
    'invitation-accept'
  );

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

-- Session issuance and revocation belong to the private application connection.
-- A browser JWT must not create flows, change their purpose or undo revocation.
revoke all privileges on table public.sessions from public, anon, authenticated;

create policy sessions_select on sessions
  for select using (
    user_id = app.current_actor_id()
    or (
      kind = 'support'
      and tenant_id = app.current_tenant_id()
      and app.current_role() in ('owner', 'admin')
    )
  );

-- ⚠ THE GUARD WAS ON THE WRONG BRANCH, FOUND 27 Aug 2026.
--
-- This read:
--
--     using (
--       user_id = app.current_actor_id()
--       or ( kind = 'support' and ... and not app.is_support_session() )
--     )
--
-- with the comment "a support session cannot extend itself" on the SECOND
-- branch. That branch is the one letting an OWNER revoke a support session in
-- their workspace, and the guard belonged there too — but it was the only
-- place it appeared, and the FIRST branch let the thing it forbade straight
-- through.
--
-- A support session's `user_id` IS the platform admin who opened it, and that
-- admin is `current_actor_id()` while inside. So `user_id = current_actor_id()`
-- matched the session's own row, and a support session could
-- `update sessions set expires_at = now() + interval '8 hours'` on itself —
-- turning the thirty-minute ceiling in 09 §3 into whatever it liked, silently,
-- with nothing in the tenant's log to show for it.
--
-- 01 D-13 lists this as one of three PERMANENT carve-outs. It is now enforced
-- rather than described: while `app.support_mode` is on, no support row is
-- writable by anyone, including its own holder.
--
-- What still works, and must: the console's own extend and exit run through
-- `asService`, outside any support context, and are audited into the tenant's
-- log — so a renewed ceiling is visible to the customer rather than invisible.
-- A platform admin's own `kind = 'platform'` session is untouched by this,
-- because the exclusion is scoped to support rows.
-- ⚠ OPERATORS SEE EVERY SUPPORT SESSION. Doc 24 · D1.
--
-- The register is the list of every visit the platform made into a customer's
-- workspace, and with only the policy above an operator saw their own. It
-- read nothing at all through the context it used, and rendered "0 open ·
-- 0 recorded" as fact. `kind = 'support'` only: an operator does not read a
-- colleague's console session, nor any customer's sign-in session.
create policy sessions_select_support_operators on sessions
  for select using (kind = 'support' and app.is_platform_admin());

create policy sessions_modify on sessions
  for all
  using (
    (
      user_id = app.current_actor_id()
      -- The carve-out. Applies to the holder as much as to anyone else.
      and not (kind = 'support' and app.is_support_session())
    )
    or (
      kind = 'support'
      and tenant_id = app.current_tenant_id()
      -- Doc 24 · D6: owners AND admins may end a visit. The interface uses
      -- `app.end_support_visit` below, which also writes both logs; this
      -- branch is what makes the revocation itself legal under RLS.
      and app.current_role() in ('owner', 'admin')
      and not app.is_support_session()   -- 09 §7: the customer revokes, support does not
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

-- ────────────────────────────────────────────────────────────────────────────
-- ENDING A SUPPORT VISIT FROM INSIDE THE WORKSPACE. Doc 24 · S0.3 · D6.
--
-- 09 §7 promises that an owner sees, and can end, a support session opened
-- into their workspace. The policy allowed it; nothing in the interface used
-- it — the frame's button was wired to a no-op. This is the path it uses.
--
-- ⚠ ONE FUNCTION, BECAUSE THREE WRITES MUST LAND TOGETHER: the revocation,
-- the customer's own audit row, and the platform's. The customer cannot write
-- the platform log (no policy admits them, correctly), so a definer function
-- is the only way the platform's register learns the visit was ended by the
-- customer rather than finding a session that simply stopped.
--
-- Narrow on purpose: the caller must be in a tenant context, as owner or admin
-- of THAT tenant (checked against the membership row, not only the context
-- setting), not in support mode, and the session must be a support session
-- in their workspace. It returns false for a visit already over, so a double
-- click records one ending, not two.
-- ────────────────────────────────────────────────────────────────────────────
drop function if exists app.end_support_visit(uuid, text);

create or replace function app.end_support_visit(p_session_id uuid, p_request_id text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  s record;
  v_actor uuid := app.current_actor_id();
  v_label text;
begin
  if app.is_support_session() then
    raise exception 'support_cannot_end_itself' using errcode = '42501';
  end if;
  if app.current_role() not in ('owner', 'admin') or v_actor is null then
    raise exception 'not_permitted' using errcode = '42501';
  end if;

  select * into s from sessions where id = p_session_id and kind = 'support' for update;
  if not found or s.tenant_id is distinct from app.current_tenant_id() then
    raise exception 'visit_not_found' using errcode = 'P0002';
  end if;

  if not exists (
    select 1 from tenant_members m
    where m.tenant_id = s.tenant_id and m.user_id = v_actor
      and m.role in ('owner', 'admin') and m.status = 'active' and m.deleted_at is null
  ) then
    raise exception 'not_permitted' using errcode = '42501';
  end if;

  if s.revoked_at is not null or s.expires_at <= now() then
    return false;
  end if;

  select coalesce(nullif(btrim(up.full_name), ''), up.email)
    into v_label from user_profiles up where up.id = v_actor;
  v_label := coalesce(v_label, 'A workspace admin');

  update sessions
     set revoked_at = now(),
         revoked_reason = 'ended by the customer',
         end_reason = 'customer',
         ended_by = v_actor,
         updated_at = now()
   where id = s.id;

  insert into audit_log (
    tenant_id, actor_user_id, actor_type, actor_label, support_mode,
    action, entity_type, entity_id, before, after, request_id
  ) values (
    s.tenant_id, v_actor, 'user', v_label, false,
    'support.ended_by_customer', 'support_session', s.id,
    null,
    jsonb_build_object(
      'platformAdminId', s.support_context->>'platformAdminId',
      'platformAdminName', s.support_context->>'platformAdminName'
    ),
    coalesce(p_request_id, 'support-visit-end')
  );

  insert into platform_audit_log (
    actor_user_id, actor_label, action, target_tenant_id, entity_type, entity_id,
    used_service_role, reason, request_id
  ) values (
    v_actor, v_label, 'support.ended_by_customer', s.tenant_id, 'support_session', s.id,
    false, 'ended by the customer', coalesce(p_request_id, 'support-visit-end')
  );

  return true;
end;
$$;

grant execute on function app.end_support_visit(uuid, text) to public;

-- ────────────────────────────────────────────────────────────────────────────
-- CLOSING VISITS THAT RAN TO THE CAP. Doc 24 · S0.6.
--
-- Most visits end at thirty minutes, and nothing recorded it: the customer's
-- log showed "entered" and never "left". Nothing runs at the moment a session
-- lapses, so this closes every lapsed, unclosed support session whenever it is
-- called — by the register, by the start path, and by the daily cron — and
-- writes each ending AT `expires_at`, not at the moment of the sweep, so the
-- log reads as what happened rather than when we noticed.
--
-- A definer function because it is called from contexts that cannot see or
-- write these rows (the cron has no actor), and because it must write nothing
-- at all when there is nothing to close: routing it through the service role
-- would put a "bypassed RLS" row in the platform log on every call. It takes
-- no arguments and can only close what has already expired, so any caller may
-- run it; the worst a caller can do is make the record accurate sooner.
--
-- The platform row names the timer, not the operator: the operator did not
-- end it. The nil uuid is the timer's id and appears nowhere else.
-- ────────────────────────────────────────────────────────────────────────────
drop function if exists app.close_lapsed_support_sessions();

create or replace function app.close_lapsed_support_sessions()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  s record;
  n integer := 0;
begin
  for s in
    update sessions
       set revoked_at = expires_at,
           revoked_reason = 'reached the thirty-minute limit',
           end_reason = 'expired',
           updated_at = now()
     where kind = 'support' and revoked_at is null and expires_at <= now()
    returning id, tenant_id, expires_at, support_context
  loop
    insert into audit_log (
      tenant_id, actor_user_id, actor_type, actor_label, support_mode,
      action, entity_type, entity_id, before, after, request_id, occurred_at
    ) values (
      s.tenant_id, null, 'system', 'Support session timer', true,
      'support.expired', 'support_session', s.id, null,
      jsonb_build_object(
        'endReason', 'expired',
        'platformAdminName', s.support_context->>'platformAdminName'
      ),
      'support-session-timer', s.expires_at
    );

    insert into platform_audit_log (
      actor_user_id, actor_label, action, target_tenant_id, entity_type, entity_id,
      used_service_role, reason, request_id, occurred_at
    ) values (
      '00000000-0000-0000-0000-000000000000', 'Support session timer', 'support.expired',
      s.tenant_id, 'support_session', s.id, false, 'reached the thirty-minute limit',
      'support-session-timer', s.expires_at
    );

    n := n + 1;
  end loop;

  return n;
end;
$$;

grant execute on function app.close_lapsed_support_sessions() to public;

-- ─── platform_admins ────────────────────────────────────────────────────────
-- Not tenant-scoped. Managed through the platform door; there is no modify
-- policy, so the application role cannot grant or revoke platform access.

alter table platform_admins enable row level security;
alter table platform_admins force row level security;

-- Your own row. What signing in to the console reads, before anything else is
-- known about you.
create policy platform_admins_select on platform_admins
  for select using (user_id = app.current_actor_id() and deleted_at is null);

-- ⚠ AND EVERY OPERATOR'S ROW, IF YOU ARE ONE. Doc 23 · S0.2.
--
-- The Admins page lists everyone who can see every workspace, and with only
-- the policy above it could only ever list its reader: a second operator
-- would have been invisible to the first, and the page would have said
-- "1 person" to each of them. Operators seeing each other is the whole point
-- of that page — the list is the access review.
--
-- Revoked operators (`deleted_at`) stay hidden, as they are from their own
-- policy. Written through `app.is_platform_admin()` because a policy on this
-- table cannot query this table; see `00_context.sql`.
create policy platform_admins_select_operators on platform_admins
  for select using (deleted_at is null and app.is_platform_admin());

-- ─── platform_settings ──────────────────────────────────────────────────────
-- Doc 23 · S0.2. One row of platform-wide settings.
--
-- READ-ONLY TO THE APPLICATION ROLE, BY OMISSION. Operators read it; nothing
-- here grants insert, update or delete. A change goes through
-- `updatePlatformSettings` in the platform module, which runs as the service
-- role and writes its `settings.updated` audit row — with the before and the
-- after — in the same transaction as the change. A modify policy would not
-- enable that path; it would only open a second one, unaudited.
--
-- Customers never read this table: the support address reaches them through
-- the pages that render it, not through a query of their own.

alter table platform_settings enable row level security;
alter table platform_settings force row level security;

create policy platform_settings_select on platform_settings
  for select using (app.is_platform_admin());
