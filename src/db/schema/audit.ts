import { boolean, index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { pk } from './_shared';
import { tenantRef } from './tenancy';

/**
 * 05 §9. Two logs, both APPEND-ONLY, and append-only is enforced by POLICY
 * rather than by convention: each table gets a select policy and an insert
 * policy and no update or delete policy, so neither is possible for anyone,
 * including us. I-11.
 */

export const auditLog = pgTable(
  'audit_log',
  {
    id: pk(),
    tenantId: tenantRef(),
    actorUserId: uuid('actor_user_id'),
    actorType: text('actor_type').notNull(), // user | platform_admin | service | system
    /**
     * DENORMALISED ON PURPOSE. An entry reading "user 9f2a-… invited a member"
     * after that user has been deleted is useless, and joining to a
     * soft-deleted row to recover a name is fragile.
     */
    actorLabel: text('actor_label'),
    /**
     * 09 §7. This boolean is what lets a tenant filter their OWN log to every
     * time the platform looked into their workspace. Nothing is hidden, and
     * that transparency is a selling point rather than a liability: very few
     * vendors in this category can say "you can see every time we look".
     */
    supportMode: boolean('support_mode').notNull().default(false),
    action: text('action').notNull(), // 'member.invited', 'credential.revoked'
    entityType: text('entity_type').notNull(),
    entityId: uuid('entity_id'),
    before: jsonb('before'),
    after: jsonb('after'),
    ipAddress: text('ip_address'),
    requestId: text('request_id').notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('audit_log_tenant_time_idx').on(t.tenantId, t.occurredAt),
    index('audit_log_entity_idx').on(t.entityType, t.entityId),
    index('audit_log_support_idx').on(t.tenantId, t.supportMode, t.occurredAt),
  ],
);

export const platformAuditLog = pgTable(
  'platform_audit_log',
  {
    id: pk(),
    actorUserId: uuid('actor_user_id').notNull(),
    actorLabel: text('actor_label').notNull(),
    action: text('action').notNull(),
    targetTenantId: uuid('target_tenant_id'),
    entityType: text('entity_type'),
    entityId: uuid('entity_id'),
    before: jsonb('before'),
    after: jsonb('after'),
    /**
     * On EVERY platform audit row. It makes "when did we bypass RLS, and why"
     * answerable with one filter, which is exactly the question an auditor
     * asks. 05 §9 · 09 §2.
     */
    usedServiceRole: boolean('used_service_role').notNull().default(false),
    supportSessionId: uuid('support_session_id'),
    reason: text('reason'),
    ipAddress: text('ip_address'),
    requestId: text('request_id').notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index('platform_audit_time_idx').on(t.occurredAt),
    index('platform_audit_tenant_idx').on(t.targetTenantId, t.occurredAt),
    index('platform_audit_service_role_idx').on(t.usedServiceRole, t.occurredAt),
  ],
);

export type AuditLogRow = typeof auditLog.$inferSelect;
export type PlatformAuditLogRow = typeof platformAuditLog.$inferSelect;
