-- ════════════════════════════════════════════════════════════════════════════
-- 05 §2 · THE ISOLATION CONTEXT
--
-- Every RLS policy in this database reads from these four functions and from
-- nowhere else. Getting this file right is the whole project.
--
-- The values are set per request by `withTenantContext` in the application,
-- ON THE CONNECTION, INSIDE A TRANSACTION, before any query runs. They are
-- never derived from anything the client sent: not a body, not a query string,
-- not a header. 06 §1 · 06 §2 rule 2.
-- ════════════════════════════════════════════════════════════════════════════

create schema if not exists app;

-- `true` as the second argument to current_setting means "return null rather
-- than raising if the setting is missing". A request that somehow reaches the
-- database without a context therefore resolves to NULL, every policy compares
-- `tenant_id = null`, and every comparison is null and matches nothing.
--
-- That is the correct failure: a query with no context returns ZERO ROWS rather
-- than every row. Isolation case 8 asserts exactly this.
create or replace function app.current_tenant_id() returns uuid as $$
  select nullif(current_setting('app.tenant_id', true), '')::uuid;
$$ language sql stable;

create or replace function app.current_role() returns text as $$
  select coalesce(nullif(current_setting('app.role', true), ''), 'none');
$$ language sql stable;

create or replace function app.is_support_session() returns boolean as $$
  select coalesce(nullif(current_setting('app.support_mode', true), ''), 'false')::boolean;
$$ language sql stable;

-- ────────────────────────────────────────────────────────────────────────────
-- THE ACTOR, AND WHY THIS FUNCTION IS NOT A ONE-LINER.
--
-- ⚠ POLICIES MUST NOT CALL auth.uid() DIRECTLY. THEY DID, IN FIFTEEN PLACES,
--   AND IT MADE SIX TABLES INVISIBLE TO THE APPLICATION.
--
-- There are two ways into this database and only one of them carries a JWT:
--
--   Drizzle (`lib/db/client.ts`)  connects as the RLS-bound application role
--                                and identifies the actor by `app.actor_id`,
--                                set transaction-locally by withTenantContext.
--                                THERE IS NO JWT. auth.uid() IS NULL.
--   Supabase client              connects through PostgREST with the user's
--                                JWT, so auth.uid() resolves and app.actor_id
--                                is unset.
--
-- Every application query goes down the FIRST path. So a policy reading
-- auth.uid() evaluates NULL, and `user_id = null` matches nothing: the table
-- is not merely restricted, it is EMPTY FOR EVERYONE. That is how
-- user_profiles came to hide the signed-in user's own profile and plans came
-- to return zero of three rows, while every isolation test still passed —
-- a cross-tenant read of an empty table is indistinguishable from isolation
-- working.
--
-- Reading both sources here, in one place, is what makes the policies correct
-- under either door. The header at the top of this file says every policy
-- reads from these functions AND FROM NOWHERE ELSE; that rule was right, and
-- the fifteen direct calls were the bug.
--
-- SECURITY DEFINER because the application role has no USAGE on the `auth`
-- schema, and the exception block because it may not have it tomorrow either.
-- Failing to resolve a JWT must degrade to "no actor", never to an error.
-- ────────────────────────────────────────────────────────────────────────────
create or replace function app.current_actor_id() returns uuid as $$
declare
  from_context uuid;
  from_jwt uuid;
begin
  from_context := nullif(current_setting('app.actor_id', true), '')::uuid;
  if from_context is not null then
    return from_context;
  end if;

  begin
    from_jwt := auth.uid();
  exception when others then
    from_jwt := null;
  end;

  return from_jwt;
end;
$$ language plpgsql stable security definer;

-- ────────────────────────────────────────────────────────────────────────────
-- IS THE ACTOR A PLATFORM OPERATOR. Doc 23 · S0.2.
--
-- ⚠ A POLICY ON `platform_admins` CANNOT ASK `platform_admins` DIRECTLY.
--   The obvious policy for "operators can see each other" is
--   `exists (select 1 from platform_admins where user_id = actor)` — which is
--   a policy on a table querying that same table, and Postgres refuses it as
--   infinite recursion. The only select policy the table had was "your own
--   row", so the Admins page, which lists every operator, could only ever
--   list the one reading it.
--
-- SECURITY DEFINER runs the lookup as the function's owner, outside the
-- caller's row level security, which is what breaks the recursion. It is
-- narrow on purpose: it answers one yes-or-no question about the CURRENT
-- actor, takes no arguments, and returns nothing else — so it cannot be used
-- to ask about anybody but yourself. `search_path` is pinned for the reason
-- given at `app.invitation_by_token`: a definer function without it can be
-- hijacked through the caller's own path.
--
-- New policies should call this rather than repeat the `exists` inline.
-- ────────────────────────────────────────────────────────────────────────────
create or replace function app.is_platform_admin() returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.platform_admins pa
    where pa.user_id = app.current_actor_id()
      and pa.deleted_at is null
  );
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- 06 §8 · SUSPENSION
--
-- Suspension is a POLICY, not a flag. CONFIRMED 24 Aug 2026: read-only, with a
-- clear explanation in the interface, because a suspended customer who can
-- still see their configuration and their team is a customer who can fix
-- their billing problem, whereas one locked out entirely opens a support ticket
-- and Brian is the support team.
--
-- This helper is why that is one place rather than eighteen. Every modify
-- policy in this database calls it.
-- ────────────────────────────────────────────────────────────────────────────
create or replace function app.tenant_is_writable() returns boolean as $$
  select exists (
    select 1 from public.tenants t
    where t.id = app.current_tenant_id()
      and t.status not in ('suspended', 'closed')
      and t.deleted_at is null
  );
$$ language sql stable;

-- ────────────────────────────────────────────────────────────────────────────
-- 01 D-13 · SUPPORT MODE IS READ AND WRITE, CONFIRMED 24 Aug 2026.
--
-- This function previously excluded the support role entirely: only owner and
-- admin passed, and `not app.is_support_session()` was a second, redundant
-- guard against the same thing. Brian has confirmed full read and write for
-- support, so `support` is now an admitted role here, and the redundant guard
-- is removed along with it, per 06 §5 and 09 §4.
--
-- What this function does NOT open, because it is not what it gates:
--   - the credential secret (04_credentials.sql, `can_write_as_owner()` only)
--   - a support session extending its own timeout (02_identity.sql,
--     `sessions_modify`, which does not call this function)
--   - customer records (06_seams.sql, `customer_records_modify`, which calls
--     this function but adds its own explicit block on top, pending Brian's
--     ruling per 09 §4)
-- ────────────────────────────────────────────────────────────────────────────
create or replace function app.can_write_settings() returns boolean as $$
  select app.current_role() in ('owner', 'admin', 'support')
     and app.tenant_is_writable();
$$ language sql stable;

create or replace function app.can_write_as_owner() returns boolean as $$
  select app.current_role() = 'owner'
     and not app.is_support_session()
     and app.tenant_is_writable();
$$ language sql stable;
