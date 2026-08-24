import { integer, timestamp, uuid } from 'drizzle-orm/pg-core';

/**
 * 05 §1. Conventions, in one place so that a new table cannot quietly differ.
 *
 * The rule that matters most: `tenant_id` is ALWAYS THE SECOND COLUMN on a
 * tenant-scoped table, so its absence is visible at a glance when reading a
 * schema file rather than only when the policy check fails.
 *
 * ⚠ THIS FILE IMPORTS NOTHING FROM ANOTHER SCHEMA MODULE, AND MUST NOT.
 *
 * `tenantRef` used to live here, which meant this file imported `tenants`
 * from `./tenancy` while `./tenancy` imported `pk` from here — a cycle. It
 * survived `tsc` and `next build`, both of which tolerate it, and broke
 * `drizzle-kit generate`, which evaluates modules eagerly: `index.ts`
 * re-exports `_shared` first, so `tenancy` began evaluating before `pk` was
 * initialised and threw "Cannot access 'pk' before initialization". That is
 * why no migration had ever been generated.
 *
 * `tenantRef` now lives in `./tenancy` beside the table it references. A leaf
 * of conventions does not depend on the modules that consume it.
 */

export const pk = () => uuid('id').primaryKey().defaultRandom();

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
