-- ════════════════════════════════════════════════════════════════════════════
-- POLICIES · API credentials
-- 01 D-11 · 05 §6 · 06 §5 · 09 §4
-- ════════════════════════════════════════════════════════════════════════════

alter table api_credentials enable row level security;
alter table api_credentials force row level security;

-- Issuance and hash verification use the private application connection only.
revoke all privileges on table public.api_credentials from public, anon, authenticated;

-- 06 §5: the OWNER manages credentials. An admin does not see them at all.
-- The support role sees METADATA ONLY, which is enforced here by admitting the
-- select and in the application by a projection type from which `key_hash` is
-- absent, so returning it is a compile error rather than a review catch.
--
-- There is no row-level way to hide one column, so the two mechanisms are
-- complementary rather than redundant: this policy decides WHICH ROWS, and the
-- CredentialView type decides WHICH COLUMNS. 07 §6 · I-08.
create policy api_credentials_select on api_credentials
  for select using (
    tenant_id = app.current_tenant_id()
    and app.current_role() in ('owner', 'support')
    and deleted_at is null
  );

-- Resolve exactly one indexed prefix before a machine credential's tenant is known.
-- No tenant payload and no bypass role participates in this lookup.
create policy api_credentials_service_lookup on api_credentials
  for select using (
    app.current_role() = 'service_lookup'
    and app.current_tenant_id() is null
    and key_prefix = nullif(current_setting('app.credential_prefix', true), '')
    and deleted_at is null
  );

-- Create, rotate and revoke are owner-only, and never in support mode.
--
-- 09 §4 is explicit about the secret itself: NEVER READABLE BY ANYONE, EVER.
-- Not by the creator, not by the tenant owner, not by Brian, not from the
-- console, not in support mode. Rotation replaces; it never re-reveals.
create policy api_credentials_modify on api_credentials
  for all
  using (
    tenant_id = app.current_tenant_id()
    and app.can_write_as_owner()
  )
  with check (
    tenant_id = app.current_tenant_id()
    and app.can_write_as_owner()
  );
