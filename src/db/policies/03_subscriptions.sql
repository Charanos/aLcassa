-- ════════════════════════════════════════════════════════════════════════════
-- POLICIES · subscriptions, entitlements and usage
-- 08 §2 · 08 §3 · 06 §5
-- ════════════════════════════════════════════════════════════════════════════

-- ─── plans and plan_entitlements ────────────────────────────────────────────
-- Not tenant-scoped by design: plans are a platform catalogue and every tenant
-- reads the same rows. There is nothing tenant-specific in a plan, and making
-- them tenant-scoped would mean N copies of the same four rows and a migration
-- every time Brian adds a tier.
--
-- Readable by any authenticated session, writable only through the platform door.

alter table plans enable row level security;
alter table plans force row level security;

create policy plans_select on plans
  for select using (auth.uid() is not null and is_active = true);

alter table plan_entitlements enable row level security;
alter table plan_entitlements force row level security;

create policy plan_entitlements_select on plan_entitlements
  for select using (auth.uid() is not null);

-- ─── subscriptions ──────────────────────────────────────────────────────────
-- 06 §5: owner sees it, admin sees it read-only, agent does not.
--
-- Note there is NO tenant-facing modify policy. In Phase 1 every status
-- transition is a platform action with an audit entry naming who made it and
-- why; nothing does it automatically, and a tenant cannot upgrade themselves
-- because there is no payment gateway behind the button. 08 §1 · 08 §7.

alter table subscriptions enable row level security;
alter table subscriptions force row level security;

create policy subscriptions_select on subscriptions
  for select using (
    tenant_id = app.current_tenant_id()
    and app.current_role() in ('owner', 'admin', 'support')
  );

-- ─── subscription_overrides ─────────────────────────────────────────────────
-- The tenant READS their own overrides, with the reason, because a customer
-- granted extra seats should know it and should know it may expire. 08 §8.
-- Granting one is a platform operation with a mandatory reason.

alter table subscription_overrides enable row level security;
alter table subscription_overrides force row level security;

create policy subscription_overrides_select on subscription_overrides
  for select using (
    tenant_id = app.current_tenant_id()
    and app.current_role() in ('owner', 'admin', 'support')
  );

-- ─── usage_counters ─────────────────────────────────────────────────────────
-- The counter is incremented inside the same transaction as the operation that
-- consumed the resource, by a service acting as the tenant, which is why the
-- modify policy admits ordinary roles rather than only the platform.
--
-- `with check` is present for the same reason it is present everywhere: without
-- it, an update could rewrite tenant_id and move a counter across the boundary.
--
-- 24 Aug 2026, per 01 D-13: `support` is added to the allowed roles here.
-- Support can now invite a member (02_identity.sql, invitations_modify, via
-- can_write_settings()), which consumes the `seats` counter. Without this
-- change, a support-mode invitation would write successfully and then fail to
-- increment its counter, producing exactly the silent drift 05 I-13's nightly
-- reconciliation job exists to catch, rather than something caught at the
-- point of write. This is not a general permission grant to support over
-- counters; it exists because the actions that consume them are now
-- support-permitted, and the counter write must follow the action it counts.

alter table usage_counters enable row level security;
alter table usage_counters force row level security;

create policy usage_counters_select on usage_counters
  for select using (tenant_id = app.current_tenant_id());

create policy usage_counters_modify on usage_counters
  for all
  using (
    tenant_id = app.current_tenant_id()
    and app.current_role() in ('owner', 'admin', 'agent', 'support')
  )
  with check (tenant_id = app.current_tenant_id());
