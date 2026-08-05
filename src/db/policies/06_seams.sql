-- ════════════════════════════════════════════════════════════════════════════
-- POLICIES · the seams
--
-- ADR-011. Structure and isolation only, nothing above them. These four tables
-- carry no Phase 1 logic and they pass THE SAME ISOLATION SUITE as every other
-- table, which is condition 11 of the definition of done. 11 §4.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── kb_documents ───────────────────────────────────────────────────────────

alter table kb_documents enable row level security;
alter table kb_documents force row level security;

create policy kb_documents_select on kb_documents
  for select using (tenant_id = app.current_tenant_id() and deleted_at is null);

create policy kb_documents_modify on kb_documents
  for all
  using (
    tenant_id = app.current_tenant_id()
    and app.can_write_settings()
  )
  with check (tenant_id = app.current_tenant_id());

-- ─── kb_chunks ──────────────────────────────────────────────────────────────
-- The policy compares this table's OWN denormalised tenant_id rather than
-- joining to kb_documents. That is the point of denormalising it: a policy that
-- has to join to check isolation is slower and easier to get wrong, and
-- isolation case 10 exists because a child's policy can be correct while a
-- query leaks through its parent's. 05 §8.

alter table kb_chunks enable row level security;
alter table kb_chunks force row level security;

create policy kb_chunks_select on kb_chunks
  for select using (tenant_id = app.current_tenant_id());

create policy kb_chunks_modify on kb_chunks
  for all
  using (
    tenant_id = app.current_tenant_id()
    and app.can_write_settings()
  )
  with check (tenant_id = app.current_tenant_id());

-- ─── customer_records ───────────────────────────────────────────────────────
-- ⚠ PERSONAL DATA BELONGING TO SOMEONE TWICE REMOVED FROM US. 01 D-09 · 06 §9.
--
-- 09 §4 proposes that THE SUPPORT ROLE CANNOT READ THESE AT ALL, and this
-- policy implements that proposal. Every other surface a support session
-- touches is a tenant's own business configuration; this one is other people's
-- information, and building it read-only-by-default alongside everything else
-- would quietly make every support session a potential privacy event.
--
-- If a genuine support case needs it, the answer is a separate explicitly
-- consented elevated mode with its own confirmation, its own audit action and
-- its own notification to the tenant. That is a Phase 2 conversation and it
-- should be quoted rather than slipped in.
--
-- ⚠ This is one of the four items blocking at M0. The support role matrix needs
-- Brian's signature, because it generates the isolation suite's support cases.

alter table customer_records enable row level security;
alter table customer_records force row level security;

create policy customer_records_select on customer_records
  for select using (
    tenant_id = app.current_tenant_id()
    and not app.is_support_session()      -- ← the line 09 §4 argues for
    and deleted_at is null
  );

create policy customer_records_modify on customer_records
  for all
  using (
    tenant_id = app.current_tenant_id()
    and app.can_write_settings()
  )
  with check (tenant_id = app.current_tenant_id());

-- ─── channel_connections ────────────────────────────────────────────────────

alter table channel_connections enable row level security;
alter table channel_connections force row level security;

create policy channel_connections_select on channel_connections
  for select using (tenant_id = app.current_tenant_id() and deleted_at is null);

create policy channel_connections_modify on channel_connections
  for all
  using (
    tenant_id = app.current_tenant_id()
    and app.can_write_settings()
  )
  with check (tenant_id = app.current_tenant_id());
