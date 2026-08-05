import 'server-only';
import { sql } from 'drizzle-orm';
import { db, type Transaction } from './client';
import type { ResolvedContext } from './context';

/**
 * 06 §3. THE SINGLE MOST IMPORTANT FUNCTION IN THIS CODEBASE.
 *
 * Every query in the application runs through here. Not most queries. Not every
 * write. Every query, including reads, without exception. 11 §6 rule 4.
 *
 * Three details matter more than they look:
 *
 *  1. THE `true` IN set_config. It makes the setting transaction-local. Without
 *     it the setting persists on a POOLED CONNECTION and leaks into whichever
 *     request checks that connection out next, which is precisely the failure
 *     this entire document set exists to prevent. It would not throw. It would
 *     not log. Tenant B would simply see tenant A's data, intermittently, under
 *     load, in production. This is the most dangerous line in the project and
 *     that is why it has this comment.
 *
 *  2. EVERY QUERY RUNS INSIDE A TRANSACTION, even a single read, so that the
 *     context and the query it governs cannot be separated by connection reuse.
 *     The cost is one BEGIN/COMMIT per read. It is worth it.
 *
 *  3. `ResolvedContext` IS BRANDED. It cannot be constructed anywhere except
 *     the resolvers in src/lib/auth, so nothing reachable from a request body
 *     can influence which tenant this sets.
 *
 * Isolation case 8 in the suite ("with no context set at all") is the test that
 * catches a regression in any of the three.
 */
export async function withTenantContext<T>(
  ctx: ResolvedContext,
  fn: (tx: Transaction) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    // Set once, on this connection, for the life of this transaction only.
    //                                                                 ↓ local
    await tx.execute(sql`select set_config('app.tenant_id', ${ctx.tenantId}, true)`);
    await tx.execute(sql`select set_config('app.role', ${ctx.role}, true)`);
    await tx.execute(sql`select set_config('app.support_mode', ${String(ctx.supportMode)}, true)`);
    await tx.execute(sql`select set_config('app.actor_id', ${ctx.actorId}, true)`);
    await tx.execute(sql`select set_config('app.request_id', ${ctx.requestId}, true)`);

    return fn(tx);
  });
}

/**
 * For the unauthenticated paths that legitimately have no tenant: accepting an
 * invitation by token, verifying an email, the public plan list.
 *
 * It sets an EMPTY context rather than no context, which is the important part.
 * `app.current_tenant_id()` resolves to null, every tenant-scoped policy
 * evaluates `tenant_id = null` and therefore matches nothing, and a query that
 * should have been scoped returns zero rows instead of everything. Running
 * outside a transaction would instead inherit whatever the previous request on
 * this pooled connection left behind.
 */
export async function withoutTenantContext<T>(
  requestId: string,
  fn: (tx: Transaction) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.tenant_id', '', true)`);
    await tx.execute(sql`select set_config('app.role', 'none', true)`);
    await tx.execute(sql`select set_config('app.support_mode', 'false', true)`);
    await tx.execute(sql`select set_config('app.actor_id', '', true)`);
    await tx.execute(sql`select set_config('app.request_id', ${requestId}, true)`);

    return fn(tx);
  });
}
