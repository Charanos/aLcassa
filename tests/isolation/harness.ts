import postgres from 'postgres';

/**
 * 06 §4. THE ISOLATION TEST SUITE.
 *
 * The suite is the deliverable that proves the guarantee. It runs in CI on
 * every pull request and it blocks merge WITH NO OVERRIDE PATH. 04 §11.
 *
 * It is generated from the schema rather than hand-written, so a new table gets
 * coverage automatically and nobody has to remember. Ten cases across roughly
 * eighteen tenant-scoped tables is 180 assertions, they run in a few seconds
 * against a branch database, and they are the reason Brian can be told the
 * guarantee holds TODAY rather than that it held when someone last checked.
 */

/**
 * ⚠ TWO CONNECTIONS, AND CONFLATING THEM MAKES THE SUITE PROVE NOTHING.
 *
 * This harness needs both halves of a question it is asking: "what does the
 * database actually contain" and "what can this actor see". They cannot come
 * down the same connection.
 *
 *   `sql`      RLS-BOUND. Everything an actor does. If this role can bypass
 *              policies, every case passes for the wrong reason.
 *   `adminSql` BYPASSES RLS. Ground truth only — the row counts and primary
 *              keys the assertions are compared against, which is what the
 *              comment on `knownRowId` means by "read with policies
 *              bypassed".
 *
 * Both failure modes are silent and were both hit while wiring this up. Point
 * `sql` at an admin role and the actors see everything, so isolation cases
 * fail loudly — recoverable. Point `adminSql` at the RLS-bound role and every
 * ground-truth read returns zero, so assertions become `0 === 0` and the suite
 * reports a confident green while testing nothing. The second is the dangerous
 * one, and it is why these are separate constants with separate names rather
 * than one variable and a fallback chain.
 */
const rlsUrl = process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL;
const adminUrl = process.env.DATABASE_URL_ADMIN;

if (!rlsUrl) {
  throw new Error('DATABASE_URL_TEST or DATABASE_URL must be set to run the isolation suite.');
}
if (!adminUrl) {
  throw new Error(
    'DATABASE_URL_ADMIN must be set to run the isolation suite: the ground-truth reads must bypass RLS, or every assertion compares zero to zero.',
  );
}

export const sql = postgres(rlsUrl, { prepare: false, max: 4 });
const adminSql = postgres(adminUrl, { prepare: false, max: 2 });

export type Actor = {
  tenantId: string;
  role: 'owner' | 'admin' | 'agent' | 'support';
  actorId: string;
  supportMode: boolean;
};

/**
 * Runs a statement under exactly the context the application would set, using
 * the same transaction-local `set_config` calls as `withTenantContext`.
 *
 * If this harness and `src/lib/db/withTenantContext.ts` ever diverge, the suite
 * is testing something the application does not do, so the two are deliberately
 * written to look identical.
 */
export async function asActor<T>(
  actor: Actor,
  run: (tx: postgres.TransactionSql) => Promise<T>,
): Promise<T> {
  return sql.begin(async (tx) => {
    await tx`select set_config('app.tenant_id', ${actor.tenantId}, true)`;
    await tx`select set_config('app.role', ${actor.role}, true)`;
    await tx`select set_config('app.support_mode', ${String(actor.supportMode)}, true)`;
    await tx`select set_config('app.actor_id', ${actor.actorId}, true)`;
    return run(tx);
  }) as Promise<T>;
}

/**
 * Case 8, the pooled-connection leak test: a transaction with NO context set at
 * all. It is the case that catches a missing `set_config`, a transaction
 * boundary mistake, or a `set_config` that forgot its transaction-local flag
 * and is now leaking into whichever request checks the connection out next.
 */
export async function withNoContext<T>(run: (tx: postgres.TransactionSql) => Promise<T>): Promise<T> {
  return sql.begin(async (tx) => {
    await tx`select set_config('app.tenant_id', '', true)`;
    await tx`select set_config('app.role', 'none', true)`;
    await tx`select set_config('app.support_mode', 'false', true)`;
    return run(tx);
  }) as Promise<T>;
}

/** Introspects the tables the suite must cover, so the coverage is not a list
 *  someone maintains by hand. */
export async function tenantScopedTables(): Promise<string[]> {
  // Catalogue introspection, so it uses the admin connection: the coverage
  // list must be what the schema contains, not what one role happens to be
  // able to see.
  const rows = await adminSql<{ table_name: string }[]>`
    select c.relname as table_name
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    join pg_attribute a on a.attrelid = c.oid
    where n.nspname = 'public'
      and c.relkind = 'r'
      and a.attname = 'tenant_id'
      and a.attnum > 0
      and not a.attisdropped
    order by c.relname
  `;
  return rows.map((row) => row.table_name);
}

/** A row belonging to a given tenant, read with policies bypassed, so the suite
 *  knows a primary key that genuinely exists and genuinely is not the caller's. */
export async function knownRowId(table: string, tenantId: string): Promise<string | null> {
  const rows = await adminSql<{ id: string }[]>`
    select id from ${adminSql(table)} where tenant_id = ${tenantId} limit 1
  `;
  return rows[0]?.id ?? null;
}

/** Ground truth. MUST bypass RLS — see the note at the top of this file. */
export async function rowCount(table: string, tenantId: string): Promise<number> {
  const rows = await adminSql<{ count: string }[]>`
    select count(*)::text as count from ${adminSql(table)} where tenant_id = ${tenantId}
  `;
  return Number(rows[0]?.count ?? 0);
}

export async function closeHarness(): Promise<void> {
  await Promise.all([sql.end(), adminSql.end()]);
}
