# 05 · Data Model

**ORM:** Drizzle. **Database:** Supabase Postgres 15+ with `pgcrypto`, `pgvector`, `pg_trgm`.
**Files:** `src/db/schema/`, one file per module, re-exported from `schema/index.ts`. Policies live in `src/db/policies/`, one file per table, applied by migration.

---

## 1. Conventions

| Rule | Detail |
|---|---|
| Primary keys | `uuid` with `gen_random_uuid()`. Not sequential, not guessable |
| Tenant scoping | `tenant_id uuid not null references tenants(id)` on every tenant-scoped table, **always the second column**, so its absence is visible at a glance |
| Timestamps | `timestamptz`, always. `created_at` and `updated_at` everywhere |
| Soft delete | `deleted_at timestamptz` on tenants, users, memberships, credentials and customer records |
| Naming | `snake_case` in the database, `camelCase` in TypeScript |
| Enums | Postgres enums via `pgEnum`, additive changes only |
| JSON | `jsonb`, only for genuinely open-ended payloads |
| Versioning | `version integer` on rows subject to concurrent edit |
| Audit | Every write to a tenant-scoped or platform table writes an audit row **in the same transaction** |
| Policies | Every tenant-scoped table has `enable row level security` plus at least a select and a modify policy. A table without one fails the build |

```ts
// src/db/schema/_shared.ts
import { uuid, timestamp, integer } from 'drizzle-orm/pg-core';

export const pk = () => uuid('id').primaryKey().defaultRandom();
export const tenantRef = () =>
  uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'restrict' });

export const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
};

export const softDelete = {
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
};

export const version = integer('version').notNull().default(1);
```

`onDelete: 'restrict'` on the tenant reference is deliberate. A cascade delete on a tenant would silently remove audit history, which defeats the point of having it. Hard deletion is a separate documented operation that archives before it removes. `01 D-10`.

---

## 2. The isolation context

Every RLS policy reads from one place. Getting this right is the whole project.

```sql
-- Set per request by the application, on the connection, before any query.
-- Never derived from anything the client sent.
create or replace function app.current_tenant_id() returns uuid as $$
  select nullif(current_setting('app.tenant_id', true), '')::uuid;
$$ language sql stable;

create or replace function app.current_role() returns text as $$
  select coalesce(nullif(current_setting('app.role', true), ''), 'none');
$$ language sql stable;

create or replace function app.is_support_session() returns boolean as $$
  select coalesce(current_setting('app.support_mode', true), 'false')::boolean;
$$ language sql stable;
```

The standard policy shape, applied to every tenant-scoped table:

```sql
alter table tenant_settings enable row level security;

create policy tenant_settings_select on tenant_settings
  for select using (tenant_id = app.current_tenant_id());

create policy tenant_settings_modify on tenant_settings
  for all using (
    tenant_id = app.current_tenant_id()
    and app.current_role() in ('owner', 'admin')
    and not app.is_support_session()      -- support mode is read-only by default
  )
  with check (tenant_id = app.current_tenant_id());
```

Note the `with check` clause. Without it a user could update a row's `tenant_id` to move it into another tenant, which is the classic RLS mistake and it is caught by the isolation suite. Every modify policy carries one.

---

## 3. Tenancy

```ts
export const tenantStatus = pgEnum('tenant_status', [
  'provisioning', 'trial', 'active', 'past_due', 'suspended', 'closed',
]);

export const tenants = pgTable('tenants', {
  id: pk(),
  slug: text('slug').notNull().unique(),        // display and future subdomain, not routing
  name: text('name').notNull(),
  status: tenantStatus('status').notNull().default('provisioning'),
  suspendedAt: timestamp('suspended_at', { withTimezone: true }),
  suspendedReason: text('suspended_reason'),
  suspendedBy: uuid('suspended_by'),
  provisionedAt: timestamp('provisioned_at', { withTimezone: true }),
  version,
  ...timestamps,
  ...softDelete,
}, (t) => ({
  statusIdx: index('tenants_status_idx').on(t.status),
  slugIdx: uniqueIndex('tenants_slug_idx').on(t.slug),
}));

export const tenantSettings = pgTable('tenant_settings', {
  id: pk(),
  tenantId: tenantRef().unique(),               // one row per tenant, enforced
  displayName: text('display_name'),
  logoPath: text('logo_path'),                   // Supabase Storage, tenant-scoped bucket path
  supportEmail: text('support_email'),
  websiteUrl: text('website_url'),
  timezone: text('timezone').notNull().default('Africa/Nairobi'),
  locale: text('locale').notNull().default('en'),
  brandColor: text('brand_color'),               // reserved for Phase 2 widget theming
  version,
  ...timestamps,
});
```

**`tenants` is the one table that is not itself tenant-scoped in the usual sense.** Its policy is: a tenant user may select their own tenant row, resolved through membership. Platform admins select all, through the platform path.

```sql
create policy tenants_select on tenants
  for select using (
    id = app.current_tenant_id()
    or exists (
      select 1 from tenant_members m
      where m.tenant_id = tenants.id and m.user_id = auth.uid() and m.deleted_at is null
    )
  );
```

---

## 4. Identity and membership

```ts
// Supabase owns auth.users. This is our profile projection.
export const userProfiles = pgTable('user_profiles', {
  id: uuid('id').primaryKey(),                   // matches auth.users.id
  fullName: text('full_name').notNull(),
  avatarPath: text('avatar_path'),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
  ...timestamps,
  ...softDelete,
});

export const memberRole = pgEnum('member_role', ['owner', 'admin', 'agent']);
export const memberStatus = pgEnum('member_status', ['active', 'invited', 'suspended']);

export const tenantMembers = pgTable('tenant_members', {
  id: pk(),
  tenantId: tenantRef(),
  userId: uuid('user_id').notNull(),
  role: memberRole('role').notNull().default('agent'),
  status: memberStatus('status').notNull().default('active'),
  invitedBy: uuid('invited_by'),
  joinedAt: timestamp('joined_at', { withTimezone: true }),
  ...timestamps,
  ...softDelete,
}, (t) => ({
  uniqueMember: uniqueIndex('tenant_members_unique').on(t.tenantId, t.userId),
  userIdx: index('tenant_members_user_idx').on(t.userId),
  tenantRoleIdx: index('tenant_members_tenant_role_idx').on(t.tenantId, t.role),
}));

export const invitations = pgTable('invitations', {
  id: pk(),
  tenantId: tenantRef(),
  email: text('email').notNull(),
  role: memberRole('role').notNull().default('agent'),
  tokenHash: text('token_hash').notNull().unique(),
  invitedBy: uuid('invited_by').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  ...timestamps,
}, (t) => ({
  pendingUnique: uniqueIndex('invitations_pending_unique')
    .on(t.tenantId, t.email).where(sql`accepted_at is null and revoked_at is null`),
  expiryIdx: index('invitations_expiry_idx').on(t.expiresAt),
}));

export const sessions = pgTable('sessions', {
  id: pk(),
  userId: uuid('user_id').notNull(),
  kind: text('kind').notNull(),                  // tenant | platform | support
  tenantId: uuid('tenant_id'),                   // null for a platform session
  effectiveRole: text('effective_role'),          // 'support' for a support session
  supportContext: jsonb('support_context').$type<SupportContext | null>(),
  userAgent: text('user_agent'),
  ipAddress: text('ip_address'),
  lastActivityAt: timestamp('last_activity_at', { withTimezone: true }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  revokedReason: text('revoked_reason'),
  ...timestamps,
}, (t) => ({
  userIdx: index('sessions_user_idx').on(t.userId, t.revokedAt),
  expiryIdx: index('sessions_expiry_idx').on(t.expiresAt),
}));

export const platformAdmins = pgTable('platform_admins', {
  id: pk(),
  userId: uuid('user_id').notNull().unique(),
  displayName: text('display_name').notNull(),
  canSuspendTenants: boolean('can_suspend_tenants').notNull().default(true),
  canEditMasterRules: boolean('can_edit_master_rules').notNull().default(true),
  canEnterSupportMode: boolean('can_enter_support_mode').notNull().default(true),
  ...timestamps,
  ...softDelete,
});
```

The partial unique index on pending invitations is worth noting: it prevents two live invitations to the same email in one tenant, while allowing a fresh invitation after one was revoked. A plain unique index would block the legitimate case.

`platformAdmins` carries per-capability booleans rather than a role enum, answering `01 §9` question 6 in the cheapest way that survives Brian adding a second admin later.

---

## 5. Subscriptions and entitlements

```ts
export const plans = pgTable('plans', {
  id: pk(),
  code: text('code').notNull().unique(),         // pro | business | custom. Confirmed 24 Aug 2026, no free plan
  name: text('name').notNull(),
  description: text('description'),
  priceAmount: bigint('price_amount', { mode: 'number' }).notNull().default(0),  // minor units
  currency: char('currency', { length: 3 }).notNull().default('KES'),
  intervalUnit: text('interval_unit').notNull().default('month'),
  intervalCount: integer('interval_count').notNull().default(1),
  trialDays: integer('trial_days').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  ...timestamps,
});

export const entitlementKind = pgEnum('entitlement_kind', ['limit', 'feature']);

export const planEntitlements = pgTable('plan_entitlements', {
  id: pk(),
  planId: uuid('plan_id').notNull().references(() => plans.id, { onDelete: 'cascade' }),
  key: text('key').notNull(),                    // seats | channels | ai_rules_versions | api_keys
                                                   // | conversations_monthly | support_sla_hours (added 24 Aug 2026)
  kind: entitlementKind('kind').notNull(),
  limitValue: integer('limit_value'),             // null means unlimited
  featureEnabled: boolean('feature_enabled'),
  displayName: text('display_name').notNull(),
  displayOrder: integer('display_order').notNull().default(0),
  ...timestamps,
}, (t) => ({ planKeyIdx: uniqueIndex('plan_entitlements_unique').on(t.planId, t.key) }));

export const subscriptionStatus = pgEnum('subscription_status', [
  'trialing', 'active', 'past_due', 'paused', 'cancelled', 'expired',
]);

export const subscriptions = pgTable('subscriptions', {
  id: pk(),
  tenantId: tenantRef().unique(),                 // one active subscription per tenant
  planId: uuid('plan_id').notNull().references(() => plans.id),
  status: subscriptionStatus('status').notNull(),
  currentPeriodStart: timestamp('current_period_start', { withTimezone: true }).notNull(),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }).notNull(),
  trialEndsAt: timestamp('trial_ends_at', { withTimezone: true }),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),

  // Payment hooks, stubbed. No gateway in Phase 1.
  externalCustomerRef: text('external_customer_ref'),
  externalSubscriptionRef: text('external_subscription_ref'),
  paymentProvider: text('payment_provider'),

  version,
  ...timestamps,
}, (t) => ({ renewalIdx: index('subscriptions_renewal_idx').on(t.status, t.currentPeriodEnd) }));

// Per-tenant overrides, so Brian can grant a custom limit without inventing a plan
export const subscriptionOverrides = pgTable('subscription_overrides', {
  id: pk(),
  tenantId: tenantRef(),
  key: text('key').notNull(),
  limitValue: integer('limit_value'),
  featureEnabled: boolean('feature_enabled'),
  reason: text('reason').notNull(),
  grantedBy: uuid('granted_by').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  ...timestamps,
}, (t) => ({ tenantKeyIdx: uniqueIndex('sub_overrides_unique').on(t.tenantId, t.key) }));

export const usageCounters = pgTable('usage_counters', {
  id: pk(),
  tenantId: tenantRef(),
  key: text('key').notNull(),
  currentValue: integer('current_value').notNull().default(0),
  peakValue: integer('peak_value').notNull().default(0),
  lastRecalculatedAt: timestamp('last_recalculated_at', { withTimezone: true }),
  version,
  ...timestamps,
}, (t) => ({ tenantKeyIdx: uniqueIndex('usage_counters_unique').on(t.tenantId, t.key) }));
```

`subscriptionOverrides` is not in the brief and it costs one table. Without it, the first time Brian wants to give a customer 20 seats on a 15-seat plan, the only options are inventing a bespoke plan or editing the shared plan and affecting everyone. Both are worse. The reason field is mandatory and it appears in the audit log.

---

## 6. Credentials

```ts
export const credentialStatus = pgEnum('credential_status', ['active', 'rotating', 'revoked']);

export const apiCredentials = pgTable('api_credentials', {
  id: pk(),
  tenantId: tenantRef(),
  name: text('name').notNull(),                   // 'AGNO production'
  keyPrefix: text('key_prefix').notNull(),        // 'csk_live_8f2a', shown masked, searchable
  keyHash: text('key_hash').notNull(),            // argon2id. Never recoverable
  scopes: jsonb('scopes').$type<string[]>().notNull().default([]),
  environment: text('environment').notNull().default('live'),   // live | test
  status: credentialStatus('status').notNull().default('active'),
  createdBy: uuid('created_by').notNull(),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  lastUsedIp: text('last_used_ip'),
  useCount: bigint('use_count', { mode: 'number' }).notNull().default(0),
  rotatedFromId: uuid('rotated_from_id'),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  revokedBy: uuid('revoked_by'),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  ...timestamps,
  ...softDelete,
}, (t) => ({
  prefixIdx: uniqueIndex('api_credentials_prefix_idx').on(t.keyPrefix),
  tenantIdx: index('api_credentials_tenant_idx').on(t.tenantId, t.status),
}));
```

**`keyHash` is never selected by any application route.** The verification path reads it inside a service function that returns a boolean, and the column is excluded from every projection type. This is enforced by a Drizzle select type that omits it and by the contract test in the definition of done.

`lastUsedAt` and `useCount` are updated asynchronously by a rollup rather than on every request, because writing to the credential row on every service-door call would serialise the hottest path in the system. The rollup runs every 60 seconds from a Vercel cron. A last-used timestamp accurate to the minute is entirely sufficient for its purpose.

### Scopes

```
ai_rules:read        read master and tenant AI rules through the service door
ai_rules:write       reserved, Phase 2
tenant:read          read tenant profile and settings
kb:read              reserved, Phase 2 seam
kb:write             reserved, Phase 2 seam
customers:read       reserved, Phase 2 seam. NEVER granted to an ingestion key
customers:write      reserved, Phase 2 seam
channels:read        reserved, Phase 2 seam
channels:write       reserved, Phase 2 seam
```

Reserved scopes exist in the enum now so Phase 2 does not need a migration to a shared table, and so the scope selector can show a tenant what is coming.

---

## 7. AI rules

```ts
export const rulesStatus = pgEnum('rules_status', ['draft', 'published', 'archived']);

// Enforced singleton. One row, ever.
export const masterAiRules = pgTable('master_ai_rules', {
  id: pk(),
  singleton: boolean('singleton').notNull().default(true),
  currentVersionId: uuid('current_version_id'),
  ...timestamps,
}, (t) => ({
  onlyOne: uniqueIndex('master_ai_rules_singleton').on(t.singleton),
}));

export const masterAiRuleVersions = pgTable('master_ai_rule_versions', {
  id: pk(),
  versionNumber: integer('version_number').notNull(),
  status: rulesStatus('status').notNull().default('draft'),
  content: jsonb('content').$type<RulesDocument>().notNull(),
  lockedFields: jsonb('locked_fields').$type<string[]>().notNull().default([]),
  changeNote: text('change_note'),
  authoredBy: uuid('authored_by').notNull(),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  ...timestamps,
}, (t) => ({ versionIdx: uniqueIndex('master_rules_version_idx').on(t.versionNumber) }));

export const tenantAiRules = pgTable('tenant_ai_rules', {
  id: pk(),
  tenantId: tenantRef().unique(),
  currentVersionId: uuid('current_version_id'),
  ...timestamps,
});

export const tenantAiRuleVersions = pgTable('tenant_ai_rule_versions', {
  id: pk(),
  tenantId: tenantRef(),
  versionNumber: integer('version_number').notNull(),
  status: rulesStatus('status').notNull().default('draft'),
  content: jsonb('content').$type<RulesDocument>().notNull(),
  changeNote: text('change_note'),
  authoredBy: uuid('authored_by').notNull(),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  ...timestamps,
}, (t) => ({
  tenantVersionIdx: uniqueIndex('tenant_rules_version_idx').on(t.tenantId, t.versionNumber),
}));

export type RulesDocument = {
  tone?: string;
  responseGuidelines?: string;
  businessInformation?: string;
  escalationInstructions?: string;
  prohibitedTopics?: string[];
  customInstructions?: string;
};
```

**The singleton is enforced by a unique index on a constant column.** A second master rules row is not possible, which is what the brief asked for: a second set cannot be created by accident.

Version rows are append-only. Publishing moves the `currentVersionId` pointer, so a rollback is a pointer move rather than a data restore, and every historical version stays readable in the audit trail.

`lockedFields` implements the layered precedence model **confirmed** in `01 D-08` on 24 Aug 2026: master wins on conflict. Its default semantics are locked-unless-opened rather than open-unless-locked, so a field is master-authoritative unless explicitly marked overridable.

---

## 8. Seams

Structure and isolation only. Nothing above them.

```ts
// SEAM · knowledge base. Phase 2 owns embedding, chunking, retrieval.
export const kbDocuments = pgTable('kb_documents', {
  id: pk(),
  tenantId: tenantRef(),
  title: text('title').notNull(),
  sourceType: text('source_type').notNull(),      // upload | url | manual
  sourceRef: text('source_ref'),
  contentHash: text('content_hash'),
  status: text('status').notNull().default('pending'),
  ...timestamps,
  ...softDelete,
});

export const kbChunks = pgTable('kb_chunks', {
  id: pk(),
  tenantId: tenantRef(),                          // denormalised deliberately, so RLS applies directly
  documentId: uuid('document_id').notNull().references(() => kbDocuments.id, { onDelete: 'cascade' }),
  chunkIndex: integer('chunk_index').notNull(),
  content: text('content').notNull(),
  embedding: vector('embedding', { dimensions: 1536 }),
  embeddingModel: text('embedding_model'),        // WHICH MODEL PRODUCED THIS VECTOR
  tokenCount: integer('token_count'),
  ...timestamps,
}, (t) => ({
  docIdx: index('kb_chunks_doc_idx').on(t.documentId, t.chunkIndex),
  // HNSW index: dimension confirmed 24 Aug 2026 (1536, text-embedding-3-small).
  // Index itself still lands in Phase 2 per the original schedule; nothing here blocks it now.
}));

// SEAM · customer records. PERSONAL DATA. See 01 D-09 and 06 §9.
export const customerRecords = pgTable('customer_records', {
  id: pk(),
  tenantId: tenantRef(),
  externalRef: text('external_ref'),               // the tenant's own customer identifier
  displayName: text('display_name'),
  contactHandle: text('contact_handle'),           // REDACTED IN LOGS
  channel: text('channel'),
  summary: text('summary'),                        // REDACTED IN LOGS
  preferences: jsonb('preferences'),               // REDACTED IN LOGS
  keyFacts: jsonb('key_facts'),                    // REDACTED IN LOGS
  lastInteractionAt: timestamp('last_interaction_at', { withTimezone: true }),
  ...timestamps,
  ...softDelete,                                   // erasure support, Phase 2 automates
}, (t) => ({
  tenantExternalIdx: uniqueIndex('customer_records_external_idx').on(t.tenantId, t.externalRef),
}));

// SEAM · channel connections. Phase 2 owns every adapter.
export const channelConnections = pgTable('channel_connections', {
  id: pk(),
  tenantId: tenantRef(),
  channel: text('channel').notNull(),              // whatsapp | instagram | messenger | widget
  displayName: text('display_name').notNull(),
  status: text('status').notNull().default('disconnected'),
  externalAccountRef: text('external_account_ref'),
  credentialsRef: text('credentials_ref'),         // pointer into Supabase Vault, never the secret
  connectedAt: timestamp('connected_at', { withTimezone: true }),
  lastEventAt: timestamp('last_event_at', { withTimezone: true }),
  config: jsonb('config'),
  ...timestamps,
  ...softDelete,
}, (t) => ({
  tenantChannelIdx: uniqueIndex('channel_connections_unique').on(t.tenantId, t.channel, t.externalAccountRef),
}));
```

`kbChunks.tenantId` is denormalised rather than joined through the document. That is deliberate: a policy that has to join to check isolation is a policy that is slower and easier to get wrong. Denormalising the tenant reference onto every tenant-scoped table, without exception, is a rule in this codebase.

`embeddingModel` is the column that makes a model change survivable. `01 §8` listed confirming the model as blocking for week one; **confirmed 24 Aug 2026: OpenAI `text-embedding-3-small`**, which is the 1536-dimension model this column's sibling, `embedding`, was already sized for. The HNSW index deferred above with "added in Phase 2 when the dimension is confirmed" can now be specified against a known dimension; whether it lands in Phase 1 or Phase 2 is a scheduling question for `11`, not a schema one, since the column is unchanged either way.

---

## 9. Audit

Two logs, both append-only.

```ts
export const auditLog = pgTable('audit_log', {
  id: pk(),
  tenantId: tenantRef(),
  actorUserId: uuid('actor_user_id'),
  actorType: text('actor_type').notNull(),        // user | platform_admin | service | system
  actorLabel: text('actor_label'),                 // denormalised name, survives user deletion
  supportMode: boolean('support_mode').notNull().default(false),
  action: text('action').notNull(),                // 'member.invited', 'credential.revoked'
  entityType: text('entity_type').notNull(),
  entityId: uuid('entity_id'),
  before: jsonb('before'),
  after: jsonb('after'),
  ipAddress: text('ip_address'),
  requestId: text('request_id').notNull(),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  tenantTimeIdx: index('audit_log_tenant_time_idx').on(t.tenantId, t.occurredAt),
  entityIdx: index('audit_log_entity_idx').on(t.entityType, t.entityId),
  supportIdx: index('audit_log_support_idx').on(t.tenantId, t.supportMode, t.occurredAt),
}));

export const platformAuditLog = pgTable('platform_audit_log', {
  id: pk(),
  actorUserId: uuid('actor_user_id').notNull(),
  actorLabel: text('actor_label').notNull(),
  action: text('action').notNull(),
  targetTenantId: uuid('target_tenant_id'),
  entityType: text('entity_type'),
  entityId: uuid('entity_id'),
  before: jsonb('before'),
  after: jsonb('after'),
  usedServiceRole: boolean('used_service_role').notNull().default(false),
  supportSessionId: uuid('support_session_id'),
  reason: text('reason'),
  ipAddress: text('ip_address'),
  requestId: text('request_id').notNull(),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  timeIdx: index('platform_audit_time_idx').on(t.occurredAt),
  tenantIdx: index('platform_audit_tenant_idx').on(t.targetTenantId, t.occurredAt),
}));
```

**Append-only is enforced by policy, not by convention:**

```sql
alter table audit_log enable row level security;

create policy audit_log_select on audit_log
  for select using (tenant_id = app.current_tenant_id());

create policy audit_log_insert on audit_log
  for insert with check (tenant_id = app.current_tenant_id());

-- No update policy. No delete policy. Therefore neither is possible.
```

`actorLabel` is denormalised on purpose. An audit entry that reads "user 9f2a-… invited a member" after that user has been deleted is useless, and joining to a soft-deleted row to recover a name is fragile.

`usedServiceRole` is a boolean on every platform audit row. It makes the question "when did we bypass RLS, and why" answerable with one filter, which is exactly the question an auditor asks.

---

## 10. Invariants

Enforced by constraint, policy, service assertion and test. Each one, if violated, is a serious defect.

| # | Invariant | Enforcement |
|---|---|---|
| I-01 | **Every tenant-scoped table has RLS enabled and at least one select and one modify policy** | Build-time schema check. Fails CI |
| I-02 | **No query in any request can return a row whose `tenant_id` differs from `app.current_tenant_id()`** | The isolation suite, per table, both read and write |
| I-03 | Every modify policy carries a `with check` preventing tenant reassignment | Policy review plus an isolation suite case per table |
| I-04 | `tenant_id` is never read from a request body, query string or header | Lint rule plus code review |
| I-05 | The service role client is imported only in `modules/platform/**` | Lint rule on the import path |
| I-06 | Every service-role call writes a `platform_audit_log` row with `usedServiceRole = true` before the operation | Service wrapper, tested |
| I-07 | A support session is never granted write access to a table its role matrix excludes | Policy plus the support role matrix test |
| I-08 | `api_credentials.keyHash` is never present in any API response | Contract test asserting key absence at every nesting level |
| I-09 | Exactly one row exists in `master_ai_rules` | Unique index on the singleton column |
| I-10 | AI rule version rows are never updated after publication | No update policy on published rows |
| I-11 | `audit_log` and `platform_audit_log` have no update or delete policy | Policy catalogue check in CI |
| I-12 | A tenant at or over an entitlement limit cannot create another of that resource through either door | Shared entitlement guard, tested through both |
| I-13 | `usage_counters.currentValue` equals the count of live source rows for that key | Reconciliation job, alerts on divergence |
| I-14 | One active subscription per tenant | Unique index on `subscriptions.tenant_id` |
| I-15 | A pending invitation is unique per tenant and email | Partial unique index |
| I-16 | Customer record fields never appear in a log line | Redaction middleware plus a log-scanning test |

Invariant I-02 is the product. If it fails once, nothing else in this document matters.

---

## 11. Seed data

| Set | Volume | Notes |
|---|---|---|
| Plans | 3 | Pro, Business, Custom. Confirmed by Brian 24 Aug 2026, ahead of the week-4 schedule. No free plan |
| Plan entitlements | 8 keys per plan | seats, channels, api_keys, kb_documents, ai_rules_versions, audit_retention_days, conversations_monthly, support_sla_hours |
| Platform admin | 1 | Brian |
| Development tenants | 3 | Deliberately different: one on a paid tier at its seat limit, one mid-usage, one suspended. The isolation suite runs against these |
| Master AI rules | 1 draft | Empty content, so the singleton exists from migration |

The three development tenants matter more than they look. An isolation suite needs at least two tenants with overlapping-looking data to prove anything, and a suspended one to prove the status policy works.

---

## 12. Migration policy

Forward-only. Every migration is reviewed for backwards compatibility with the deployed code. Adding a non-null column requires a default or a three-step deploy. Renames are add, backfill, switch, drop. **Every migration that creates a tenant-scoped table must create its policies in the same migration**, and the CI check will fail the build if it does not, which means the two can never drift.
