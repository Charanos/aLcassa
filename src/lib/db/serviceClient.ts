import 'server-only';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@/db/schema';
import { inspectUsage } from '@/lib/usage/reconciliation';

/**
 * ⚠ THE ONE THING IN THIS SYSTEM THAT GENUINELY BYPASSES ROW LEVEL SECURITY.
 *
 * 06 §7 · 01 D-02 · 05 I-05.
 *
 * Importing this file is a lint error everywhere except src/modules/platform.
 * That is not a style rule; it is the enforcement of the isolation guarantee,
 * and the exception list has exactly one entry.
 *
 * WHERE IT MAY BE USED. Four operations, all of which act on tenants as
 * records rather than reading their content:
 *
 *   provision a tenant     the tenant does not exist yet, so no context can
 *                          resolve to it
 *   suspend / reactivate   writes the `tenants` row, which sits above tenant
 *                          scope
 *   assign / override plan  same
 *   list tenants           reads across all tenants by definition
 *
 * WHERE IT MAY NEVER BE USED. Reading a tenant's settings, members,
 * credentials, AI rules, audit log, knowledge base or customer records.
 *
 * FOR ANY OF THOSE, THE ANSWER IS SUPPORT MODE. The switcher is how Brian sees
 * into a tenant's world; this key is how the platform manages tenants as
 * records. A console feature that needs to read tenant content across tenants
 * is a request to weaken the isolation model and should be answered with
 * support mode rather than built. 06 §10.
 *
 * Every call goes through `asService()` below, which writes the audit row
 * BEFORE the operation rather than after, so a crash mid-operation still leaves
 * a record that it was attempted. 05 I-06.
 */

const connectionString = process.env.DATABASE_URL_ADMIN;

if (!connectionString) {
  throw new Error(
    'DATABASE_URL_ADMIN is not set. It is required only for platform operations and migrations.',
  );
}

const sql = postgres(connectionString, {
  prepare: false,
  max: 3, // deliberately small. This should be a rare path.
  idle_timeout: 20,
});

/** Scheduler-only aggregate maintenance report. No tenant content or arbitrary query is exposed. */
export async function readUsageReconciliation() {
  return inspectUsage(sql);
}

/**
 * Not exported directly. Reach it through `asService()` so the audit write
 * cannot be forgotten.
 */
const serviceDb = drizzle(sql, { schema });

export type ServiceDatabase = typeof serviceDb;
export type ServiceTransaction = Parameters<Parameters<ServiceDatabase['transaction']>[0]>[0];

export type ServiceRoleCall = {
  /** Catalogue action, for example 'tenant.provisioned'. */
  action: string;
  actorUserId: string;
  actorLabel: string;
  targetTenantId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  reason?: string | null;
  requestId: string;
  ipAddress?: string | null;
  /**
   * The state the call replaces, and the state it writes, when the caller knows
   * both before it starts — a settings save does. Written into the same audit
   * row, so the entry IS the diff rather than pointing somewhere else for it.
   */
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
};

type AuditWriter = (tx: ServiceTransaction, call: ServiceRoleCall) => Promise<void>;

let writePlatformAudit: AuditWriter | null = null;

/**
 * Wired once at module init by src/modules/platform. Injected rather than
 * imported so that `@/lib/audit` can depend on the schema without this file
 * depending on a module, which would make the boundary rule circular.
 */
export function registerPlatformAuditWriter(writer: AuditWriter): void {
  writePlatformAudit = writer;
}

/**
 * The only way to reach the service role. The audit row is written first, in
 * the same transaction, with `used_service_role = true`, which is what makes
 * "when did we bypass RLS, and why" answerable with a single filter. That is
 * exactly the question an auditor asks. 05 §9.
 */
export async function asService<T>(
  call: ServiceRoleCall,
  fn: (tx: ServiceTransaction) => Promise<T>,
): Promise<T> {
  if (!writePlatformAudit) {
    throw new Error(
      'The platform audit writer is not registered. A service-role call without an audit row is not permitted. See 06 §7.',
    );
  }
  const write = writePlatformAudit;

  return serviceDb.transaction(async (tx) => {
    await write(tx, call); // BEFORE the operation, never after.
    return fn(tx);
  });
}
