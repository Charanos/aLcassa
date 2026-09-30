-- ════════════════════════════════════════════════════════════════════════════
-- POLICIES · the audit logs
--
-- 05 §9 · I-11. APPEND-ONLY IS ENFORCED BY POLICY, NOT BY CONVENTION.
--
-- Each table gets a select policy and an insert policy and NOTHING ELSE.
-- Because RLS denies by default, the absence of an update policy and the
-- absence of a delete policy mean neither operation is possible, for anyone,
-- through any door, including us. There is no code path that can amend history
-- because there is no policy that would permit one.
--
-- The CI policy catalogue check asserts this absence, so a well-meaning
-- migration that adds an update policy "to fix a typo in an old entry" fails
-- the build rather than quietly succeeding.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── audit_log · the tenant's own trail ─────────────────────────────────────

alter table audit_log enable row level security;
alter table audit_log force row level security;

-- 06 §5: owner and admin read the audit log; agent does not. Support does,
-- because reading what has happened is most of what a support session is for.
--
-- 09 §7: this includes every support-mode entry, rendered with the copper
-- support badge. Nothing is hidden from the tenant. "You can see every time we
-- look at your workspace" is a genuinely strong claim in this category and it
-- is made true here rather than in the marketing copy.
create policy audit_log_select on audit_log
  for select using (
    tenant_id = app.current_tenant_id()
    and app.current_role() in ('owner', 'admin', 'support')
  );

-- Any role may cause an entry, because any role can take an auditable action.
-- The `with check` is what stops a write into another tenant's history.
--
-- Note the deliberate absence of `app.tenant_is_writable()` here: a SUSPENDED
-- tenant still generates audit entries. Suspension makes a workspace read-only
-- for its users; it does not stop us recording what the platform did to it.
create policy audit_log_insert on audit_log
  for insert
  with check (tenant_id = app.current_tenant_id());

-- NO UPDATE POLICY. NO DELETE POLICY. Therefore neither is possible.

-- ─── platform_audit_log · the platform's trail ──────────────────────────────
-- Not tenant-scoped and not tenant-readable: a tenant sees platform actions
-- affecting them through their own audit_log, where the support_mode flag and
-- the actor label tell the same story without exposing other tenants' names.
--
-- Every row carries `used_service_role`, which makes "when did we bypass RLS,
-- and why" answerable with one filter. 05 §9 · 09 §2.

alter table platform_audit_log enable row level security;
alter table platform_audit_log force row level security;

create policy platform_audit_log_select on platform_audit_log
  for select using (
    exists (
      select 1 from platform_admins pa
      where pa.user_id = app.current_actor_id() and pa.deleted_at is null
    )
  );

create policy platform_audit_log_insert on platform_audit_log
  for insert
  with check (
    exists (
      select 1 from platform_admins pa
      where pa.user_id = app.current_actor_id() and pa.deleted_at is null
    )
  );

-- NO UPDATE POLICY. NO DELETE POLICY.

-- ────────────────────────────────────────────────────────────────────────────
-- WHAT THE PLATFORM DID DURING A VISIT. Doc 24 · Stage 5.
--
-- The register answers the question a customer actually asks — "what did you
-- change?" — and the answer lives in THEIR log, which an operator cannot read
-- and should not: `audit_log_select` admits the workspace's own owners, admins
-- and an open support session, and nobody else.
--
-- This returns exactly the rows the platform itself wrote into a workspace's
-- log during the given visits — `support_mode = true`, inside the visit's own
-- window — and nothing the customer's staff did. It is the platform reading
-- its own footprint, not the customer's history. Operators only.
--
-- A visit's window is its start to its end (or its expiry while open). One
-- open support session per workspace (support.ts) is what makes the window
-- attribute each row to exactly one visit.
-- ────────────────────────────────────────────────────────────────────────────
drop function if exists app.support_visit_activity(uuid[]);

create or replace function app.support_visit_activity(p_session_ids uuid[])
returns table (
  session_id uuid,
  occurred_at timestamptz,
  action text,
  entity_type text,
  entity_id uuid,
  actor_label text,
  before jsonb,
  after jsonb
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not app.is_platform_admin() then
    return;
  end if;

  return query
    select s.id, a.occurred_at, a.action, a.entity_type, a.entity_id, a.actor_label,
           a.before, a.after
    from sessions s
    join audit_log a
      on a.tenant_id = s.tenant_id
     and a.support_mode = true
     and a.occurred_at >= s.created_at
     and a.occurred_at <= coalesce(s.revoked_at, s.expires_at)
    where s.id = any(p_session_ids) and s.kind = 'support'
    order by a.occurred_at;
end;
$$;

grant execute on function app.support_visit_activity(uuid[]) to public;

-- ────────────────────────────────────────────────────────────────────────────
-- A WORKSPACE, SUMMARISED FOR THE CONSOLE. Doc 24 · D1.
--
-- The Workspaces list and a workspace's detail need three things about each
-- customer that live in tables operators do not read: how many people are in
-- it, who to contact (the owner), and when anything last happened. Opening
-- `tenant_members`, `user_profiles` and `audit_log` to operators to get them
-- would hand over every member's row and every customer's history.
--
-- This returns the three answers and nothing else — counts, the owner's name
-- and address, and one timestamp — for platform admins only. Anything a
-- workspace holds beyond that stays behind a support session.
-- ────────────────────────────────────────────────────────────────────────────
drop function if exists app.workspace_summaries(uuid[]);

create or replace function app.workspace_summaries(p_tenant_ids uuid[])
returns table (
  tenant_id uuid,
  active_members integer,
  admins integer,
  owner_name text,
  owner_email text,
  last_activity timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not app.is_platform_admin() then
    return;
  end if;

  return query
    select t.id,
           (select count(*)::int from tenant_members m
             where m.tenant_id = t.id and m.status = 'active' and m.deleted_at is null),
           (select count(*)::int from tenant_members m
             where m.tenant_id = t.id and m.status = 'active' and m.deleted_at is null
               and m.role in ('owner', 'admin')),
           o.full_name,
           o.email,
           (select max(a.occurred_at) from audit_log a where a.tenant_id = t.id)
    from tenants t
    left join lateral (
      select up.full_name, up.email
      from tenant_members m
      join user_profiles up on up.id = m.user_id
      where m.tenant_id = t.id and m.role = 'owner' and m.deleted_at is null
      order by m.created_at
      limit 1
    ) o on true
    where t.id = any(p_tenant_ids);
end;
$$;

grant execute on function app.workspace_summaries(uuid[]) to public;

-- Every active membership on the platform, as one number. The Overview's
-- "People" figure. Operators only; no row is returned, only the count.
drop function if exists app.platform_member_count();

create or replace function app.platform_member_count()
returns integer
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not app.is_platform_admin() then
    return null;
  end if;
  return (select count(*)::int from tenant_members
          where status = 'active' and deleted_at is null);
end;
$$;

grant execute on function app.platform_member_count() to public;
