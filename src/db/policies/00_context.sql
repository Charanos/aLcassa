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
