import { integer, timestamp, uuid } from 'drizzle-orm/pg-core';
import { tenants } from './tenancy';

/**
 * 05 §1. Conventions, in one place so that a new table cannot quietly differ.
 *
 * The rule that matters most: `tenant_id` is ALWAYS THE SECOND COLUMN on a
 * tenant-scoped table, so its absence is visible at a glance when reading a
 * schema file rather than only when the policy check fails.
 */

export const pk = () => uuid('id').primaryKey().defaultRandom();

/**
 * `onDelete: 'restrict'` is deliberate and it is not a default.
 *
 * A cascade on the tenant reference would silently remove audit history when a
 * tenant row is deleted, which defeats the entire point of having it. Hard
 * deletion is a separate documented operation that archives before it removes,
 * with its own confirmation, its own audit entry and its own runbook page.
 * 01 D-10 · 05 §1.
 */
export const tenantRef = () =>
  uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'restrict' });

export const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
};

/** 01 D-10. Suspend and soft delete; hard delete is a separate operation. */
export const softDelete = {
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
};

/** 04 §6. Optimistic locking. A conflict returns 409 carrying both versions. */
export const version = integer('version').notNull().default(1);
