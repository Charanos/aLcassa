import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { pk, tenantRef, timestamps } from './_shared';

export const rulesStatus = pgEnum('rules_status', ['draft', 'published', 'archived']);

export type RulesDocument = {
  tone?: string;
  responseGuidelines?: string;
  businessInformation?: string;
  escalationInstructions?: string;
  prohibitedTopics?: string[];
  customInstructions?: string;
};

/**
 * 05 §7. THE SINGLETON, ENFORCED BY A UNIQUE INDEX ON A CONSTANT COLUMN.
 *
 * A second master rules row is not possible. That is what the brief asked for:
 * not that we agree not to create one, but that one cannot be created by
 * accident. The column exists only to be indexed.
 */
export const masterAiRules = pgTable(
  'master_ai_rules',
  {
    id: pk(),
    singleton: boolean('singleton').notNull().default(true),
    currentVersionId: uuid('current_version_id'),
    ...timestamps,
  },
  (t) => [uniqueIndex('master_ai_rules_singleton').on(t.singleton)],
);

/**
 * Version rows are APPEND-ONLY. Publishing moves the `currentVersionId`
 * pointer, so a rollback is a pointer move rather than a data restore, and
 * every historical version stays readable in the audit trail. I-10.
 */
export const masterAiRuleVersions = pgTable(
  'master_ai_rule_versions',
  {
    id: pk(),
    versionNumber: integer('version_number').notNull(),
    status: rulesStatus('status').notNull().default('draft'),
    content: jsonb('content').$type<RulesDocument>().notNull(),
    /**
     * 01 D-08. CONFIRMED 24 Aug 2026: layered, master wins on conflict.
     * Master rules carry a per-field lock, so a tenant can change what is
     * permitted and see plainly what is not. Default semantics are
     * locked-unless-opened rather than open-unless-locked: a field is
     * master-authoritative unless explicitly marked overridable. No
     * migration was needed either way; this column shipped ahead of the
     * confirmation and its meaning simply firmed up. 01 §8 · 11 §3.
     */
    lockedFields: jsonb('locked_fields').$type<string[]>().notNull().default([]),
    changeNote: text('change_note'),
    authoredBy: uuid('authored_by').notNull(),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [uniqueIndex('master_rules_version_idx').on(t.versionNumber)],
);

export const tenantAiRules = pgTable('tenant_ai_rules', {
  id: pk(),
  tenantId: tenantRef().unique(),
  currentVersionId: uuid('current_version_id'),
  ...timestamps,
});

export const tenantAiRuleVersions = pgTable(
  'tenant_ai_rule_versions',
  {
    id: pk(),
    tenantId: tenantRef(),
    versionNumber: integer('version_number').notNull(),
    status: rulesStatus('status').notNull().default('draft'),
    content: jsonb('content').$type<RulesDocument>().notNull(),
    changeNote: text('change_note'),
    authoredBy: uuid('authored_by').notNull(),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [uniqueIndex('tenant_rules_version_idx').on(t.tenantId, t.versionNumber)],
);

/**
 * 07 §8. The compiled document Phase 2 reads. `provenance` tells it where each
 * field came from: without it, debugging why the assistant used a particular
 * tone means reading two tables by hand.
 */
export type CompiledRules = {
  tenantId: string;
  compiledAt: string;
  masterVersion: number;
  tenantVersion: number;
  rules: RulesDocument;
  provenance: Partial<Record<keyof RulesDocument, 'master' | 'tenant' | 'master+tenant'>>;
  locked: string[];
};

export type MasterAiRuleVersion = typeof masterAiRuleVersions.$inferSelect;
export type TenantAiRuleVersion = typeof tenantAiRuleVersions.$inferSelect;
