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

create or replace function app.current_actor_id() returns uuid as $$
  select nullif(current_setting('app.actor_id', true), '')::uuid;
$$ language sql stable;

-- ────────────────────────────────────────────────────────────────────────────
-- 06 §8 · SUSPENSION
--
-- Suspension is a POLICY, not a flag. The recommendation in 06 §8 is read-only
-- with a clear explanation in the interface, because a suspended customer who
-- can still see their configuration and their team is a customer who can fix
-- their billing problem, whereas one locked out entirely opens a support ticket
-- and Brian is the support team.
--
-- This helper is why that is one place rather than eighteen. Every modify
-- policy in this database calls it.
--
-- ⚠ 01 §9 question 4. Brian confirms the model before M1. If he chooses
-- "blocked" rather than "read-only", this function changes and nothing else does.
-- ────────────────────────────────────────────────────────────────────────────
create or replace function app.tenant_is_writable() returns boolean as $$
  select exists (
    select 1 from public.tenants t
    where t.id = app.current_tenant_id()
      and t.status not in ('suspended', 'closed')
      and t.deleted_at is null
  );
$$ language sql stable;

-- The standard predicate for a policy that owners and admins may write and
-- support may not. 06 §5 role matrix, 09 §4 support matrix.
create or replace function app.can_write_settings() returns boolean as $$
  select app.current_role() in ('owner', 'admin')
     and not app.is_support_session()
     and app.tenant_is_writable();
$$ language sql stable;

create or replace function app.can_write_as_owner() returns boolean as $$
  select app.current_role() = 'owner'
     and not app.is_support_session()
     and app.tenant_is_writable();
$$ language sql stable;
