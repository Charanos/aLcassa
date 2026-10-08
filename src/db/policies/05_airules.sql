-- ════════════════════════════════════════════════════════════════════════════
-- POLICIES · AI rules
-- 05 §7 · 08 §4 · 06 §5
-- ════════════════════════════════════════════════════════════════════════════

-- ─── master_ai_rules and master_ai_rule_versions ────────────────────────────
-- Platform-owned, tenant-readable. A tenant reads master rules because the
-- editor shows them what the platform locks: a locked field renders read-only
-- with the platform's value and a plain explanation, NOT HIDDEN. A tenant
-- should see what is being applied on their behalf. 08 §4.

alter table master_ai_rules enable row level security;
alter table master_ai_rules force row level security;

create policy master_ai_rules_select on master_ai_rules
  for select using (app.current_actor_id() is not null);

alter table master_ai_rule_versions enable row level security;
alter table master_ai_rule_versions force row level security;

-- Only the PUBLISHED version is visible to a tenant. A platform draft is not
-- something a tenant should be able to read and plan around.
create policy master_ai_rule_versions_select on master_ai_rule_versions
  for select using (app.current_actor_id() is not null and status = 'published');

-- ─── tenant_ai_rules ────────────────────────────────────────────────────────

alter table tenant_ai_rules enable row level security;
alter table tenant_ai_rules force row level security;

create policy tenant_ai_rules_select on tenant_ai_rules
  for select using (tenant_id = app.current_tenant_id());

create policy tenant_ai_rules_modify on tenant_ai_rules
  for all
  using (
    tenant_id = app.current_tenant_id()
    and app.can_write_settings()
  )
  with check (
    tenant_id = app.current_tenant_id()
    and app.can_write_settings()
  );

-- ─── tenant_ai_rule_versions ────────────────────────────────────────────────
-- Every role may READ, including agent: 06 §5 grants "view AI rules" to all
-- four roles, because an agent needs to know what the assistant will say.

alter table tenant_ai_rule_versions enable row level security;
alter table tenant_ai_rule_versions force row level security;

create policy tenant_ai_rule_versions_select on tenant_ai_rule_versions
  for select using (tenant_id = app.current_tenant_id());

-- I-10 · APPEND-ONLY AFTER PUBLICATION.
--
-- Two separate policies rather than one, because insert and update need
--- different predicates and folding them into `for all` would permit deleting a
--- published version. Publishing moves a pointer on the parent row; a published
-- version row itself is immutable, which is what makes a rollback a pointer
-- move rather than a data restore and keeps every historical version readable
-- in the audit trail. 08 §4.
create policy tenant_ai_rule_versions_insert on tenant_ai_rule_versions
  for insert
  with check (
    tenant_id = app.current_tenant_id()
    and app.can_write_settings()
  );

create policy tenant_ai_rule_versions_update on tenant_ai_rule_versions
  for update
  using (
    tenant_id = app.current_tenant_id()
    and app.can_write_settings()
  )
  with check (
    tenant_id = app.current_tenant_id()
    and app.can_write_settings()
  );

-- Published content stays immutable even while retention changes its status.
-- Invoker rights preserve RLS; this function grants no additional access.
create or replace function app.preserve_tenant_rule_version() returns trigger as $$
begin
  if old.status <> 'draft' then
    if (to_jsonb(new) - 'status' - 'updated_at') is distinct from
       (to_jsonb(old) - 'status' - 'updated_at')
       or new.status not in ('published', 'archived') then
      raise exception 'Published instruction versions are immutable'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists preserve_tenant_rule_version on tenant_ai_rule_versions;
create trigger preserve_tenant_rule_version before update on tenant_ai_rule_versions
  for each row execute function app.preserve_tenant_rule_version();

-- No delete policy. A version is archived by status, never removed.
