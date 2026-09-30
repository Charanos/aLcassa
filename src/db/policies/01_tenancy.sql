-- ════════════════════════════════════════════════════════════════════════════
-- POLICIES · tenancy
--
-- Read 06 in full before changing anything in this directory. 11 §6.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── tenants ────────────────────────────────────────────────────────────────
-- 05 §3. The one table that is not tenant-scoped in the usual sense: it has an
-- `id` where everything else has a `tenant_id`. Its policy is therefore written
-- by hand rather than generated from the standard shape.

alter table tenants enable row level security;
alter table tenants force row level security;

create policy tenants_select on tenants
  for select using (
    id = app.current_tenant_id()
    or exists (
      select 1 from tenant_members m
      where m.tenant_id = tenants.id
        and m.user_id = app.current_actor_id()
        and m.deleted_at is null
    )
  );

-- ⚠ OPERATORS READ THE DIRECTORY. Doc 24 · D1.
--
-- The console lists every workspace, and until this policy it could list
-- none: a platform admin is a member of no tenant, so `tenants_select`
-- returned nothing and the Workspaces list, the switcher, the Overview counts
-- and the support register all fell back to designed data or rendered zeros.
-- The alternative — reading through the service role — writes a row flagged
-- as bypassing RLS on every page view.
--
-- SELECT ONLY, AND ONLY THIS TABLE AND THE BILLING RECORDS THE PLATFORM ITSELF
-- WRITES (03_subscriptions.sql). A workspace's data — members, customer
-- records, knowledge base, rules, channels — stays closed to operators except
-- inside a support session, where the workspace's own policies apply to them
-- as role `support`.
create policy tenants_select_operators on tenants
  for select using (app.is_platform_admin());

-- No insert, update or delete policy for tenant users. Provisioning,
-- suspension and plan assignment are platform operations through the service
-- role, and every one of them writes an audit row before it runs. 06 §7.

-- ─── tenant_settings ────────────────────────────────────────────────────────

alter table tenant_settings enable row level security;
alter table tenant_settings force row level security;

create policy tenant_settings_select on tenant_settings
  for select using (tenant_id = app.current_tenant_id());

create policy tenant_settings_modify on tenant_settings
  for all
  using (
    tenant_id = app.current_tenant_id()
    and app.can_write_settings()
  )
  -- ⚠ THE `with check` CLAUSE IS NOT OPTIONAL.
  --
  -- Without it a user can UPDATE a row's tenant_id and move it into another
  -- tenant. The `using` clause governs which rows you may touch; the
  -- `with check` clause governs what the row may look like afterwards. A
  -- modify policy with only a `using` clause reads as correct and permits a
  -- write that migrates data across the boundary.
  --
  -- This is the classic RLS mistake. Isolation cases 5 and 6 catch it, and
  -- `pnpm check:policies` fails the build when a modify policy has no
  -- `with check` at all. 05 §2 · I-03.
  with check (tenant_id = app.current_tenant_id());
