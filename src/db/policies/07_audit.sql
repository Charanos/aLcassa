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
