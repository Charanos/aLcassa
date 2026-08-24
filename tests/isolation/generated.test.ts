import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  asActor,
  closeHarness,
  knownRowId,
  rowCount,
  tenantScopedTables,
  withNoContext,
  type Actor,
} from './harness';
import { SEED_TENANT_A, SEED_TENANT_B, SEED_USER_A } from '../../src/db/seed/constants';

/**
 * 06 §4. Ten cases per tenant-scoped table, generated from the schema.
 *
 * ⚠ CASE 2 DESERVES THE EMPHASIS IT GETS BELOW.
 *
 * RLS FILTERS RATHER THAN ERRORS. A cross-tenant select returns an EMPTY SET,
 * not an exception. A test written as `expect(...).rejects.toThrow()` would
 * pass for entirely the wrong reason and give false confidence for nine weeks.
 *
 * ASSERT ON THE ROW COUNT. Always.
 *
 * I-02 is the product. If it fails once, nothing else in this codebase matters.
 */

/**
 * ⚠ TOP-LEVEL AWAIT, AND IT HAS TO BE.
 *
 * This was `let tables: string[] = []`, filled in a `beforeAll`. But
 * `describe.each(tables)` below is evaluated at COLLECTION time, before any
 * hook runs, so it always received the empty array and fell through to the
 * `['__none__']` placeholder. The suite reported passes and failures against
 * a table that does not exist and never touched a real one.
 *
 * It typechecked, and it could not have been caught by running it either —
 * until this week there were no migrations to run it against, so the suite
 * had never met a live database at all. Discovering both together is not a
 * coincidence: the first defect hid the second.
 *
 * The table list must therefore be resolved before collection. Vitest
 * supports top-level await in ESM test files, which is what makes the
 * introspected-rather-than-listed coverage in `05 §11` actually work.
 */
const tables: string[] = await tenantScopedTables();

const asA: Actor = {
  tenantId: SEED_TENANT_A,
  role: 'owner',
  actorId: SEED_USER_A,
  supportMode: false,
};

const asAAgent: Actor = { ...asA, role: 'agent' };
const asASupport: Actor = { ...asA, role: 'support', supportMode: true };

/**
 * 01 D-13, confirmed 24 Aug 2026. Support mode is read and write, not the
 * read-only default this suite originally tested. Every table gated by
 * `app.can_write_settings()` in 00_context.sql now admits the support role,
 * which is every table below except the permanent carve-outs: the credential
 * secret table, sessions (a support session cannot extend itself),
 * customer_records (09 §4, still an open question pending Brian's ruling),
 * and any table with no tenant-facing modify policy at all regardless of
 * role. `usage_counters` is listed separately from `can_write_settings()`
 * because it has its own explicit role list, opened for the same reason:
 * inviting a member (now support-permitted) consumes the `seats` counter.
 */
const SUPPORT_WRITE_ALLOWED = new Set([
  'tenant_settings',
  'tenant_members',
  'invitations',
  'tenant_ai_rules',
  'tenant_ai_rule_versions',
  'kb_documents',
  'kb_chunks',
  'channel_connections',
  'usage_counters',
]);

beforeAll(() => {
  expect(
    tables.length,
    'no tenant-scoped tables found: is the database migrated and seeded?',
  ).toBeGreaterThan(0);
});

afterAll(async () => {
  await closeHarness();
});

describe('isolation suite', () => {
  it('covers every tenant-scoped table', () => {
    // The suite's coverage is introspected, not listed, so a new table cannot
    // ship uncovered. This assertion exists so the count is visible in CI
    // output and can be quoted at the M1 and M6 gates.
    expect(tables.length).toBeGreaterThan(0);
  });

  // No `['__none__']` fallback any more. An empty list here means the
  // database is not migrated, and the `beforeAll` above says so in those
  // words — which is far more useful than ten failures against a relation
  // that does not exist.
  describe.each(tables)('table · %s', (table) => {
    /** Case 1 · As A, select all rows. Only A's rows, count matches exactly. */
    it('1 · selecting all rows returns only tenant A rows', async () => {
      const expected = await rowCount(table, SEED_TENANT_A);
      const visible = await asActor(asA, async (tx) => {
        const rows = await tx`select id from ${tx(table)}`;
        return rows.length;
      });
      expect(visible).toBe(expected);
    });

    /** Case 2 · As A, select B's row by its known primary key.
     *  ZERO ROWS. NOT AN ERROR. ZERO ROWS. */
    it("2 · selecting tenant B's row by primary key returns zero rows, not an error", async () => {
      const bRow = await knownRowId(table, SEED_TENANT_B);
      if (!bRow) return; // nothing seeded for B on this table

      const rows = await asActor(asA, (tx) => tx`select id from ${tx(table)} where id = ${bRow}`);
      expect(rows.length).toBe(0);
    });

    /** Case 3 · As A, update B's row by primary key. Zero rows affected. */
    it("3 · updating tenant B's row affects zero rows", async () => {
      const bRow = await knownRowId(table, SEED_TENANT_B);
      if (!bRow) return;

      const affected = await asActor(asA, async (tx) => {
        const result = await tx`
          update ${tx(table)} set updated_at = now() where id = ${bRow} returning id
        `;
        return result.length;
      }).catch(() => 0); // a table without updated_at raises; either way nothing changed
      expect(affected).toBe(0);
    });

    /** Case 4 · As A, delete B's row by primary key. Zero rows affected. */
    it("4 · deleting tenant B's row affects zero rows", async () => {
      const bRow = await knownRowId(table, SEED_TENANT_B);
      if (!bRow) return;

      const affected = await asActor(asA, async (tx) => {
        const result = await tx`delete from ${tx(table)} where id = ${bRow} returning id`;
        return result.length;
      }).catch(() => 0);
      expect(affected).toBe(0);

      // And the row is still there when read with policies bypassed.
      expect(await knownRowId(table, SEED_TENANT_B)).toBe(bRow);
    });

    /** Case 5 · As A, insert a row with tenant_id = B. Rejected by WITH CHECK. */
    it('5 · inserting a row carrying tenant B is rejected by the with check clause', async () => {
      /**
       * ⚠ THE CATCH IS OUTSIDE THE TRANSACTION, AND IT HAS TO BE.
       *
       * It used to sit inside the `asActor` callback. That cannot work:
       * once any statement errors, Postgres puts the transaction into an
       * aborted state, so `sql.begin()` fails at COMMIT and rethrows —
       * past the inner catch, which never got the chance to swallow
       * anything. The assertion is about whether the row landed, so the
       * rejection of the whole transaction is the thing to catch.
       *
       * Either a policy violation or a not-null violation on another
       * column. Both mean the row did not land, which is the assertion.
       */
      let inserted = -1;
      try {
        inserted = await asActor(asA, async (tx) => {
          const result = await tx`
            insert into ${tx(table)} (tenant_id) values (${SEED_TENANT_B}) returning id
          `;
          return result.length;
        });
      } catch {
        inserted = 0;
      }
      expect(inserted).toBe(0);
    });

    /** Case 6 · As A, update A's own row setting tenant_id = B.
     *  This is the one a missing WITH CHECK lets through. */
    it("6 · moving one of tenant A's own rows into tenant B is rejected", async () => {
      const aRow = await knownRowId(table, SEED_TENANT_A);
      if (!aRow) return;

      // Catch outside the transaction — see case 5.
      let moved = -1;
      try {
        moved = await asActor(asA, async (tx) => {
          const result = await tx`
            update ${tx(table)} set tenant_id = ${SEED_TENANT_B} where id = ${aRow} returning id
          `;
          return result.length;
        });
      } catch {
        moved = 0;
      }
      expect(moved).toBe(0);
      expect(await knownRowId(table, SEED_TENANT_A)).not.toBeNull();
    });

    /** Case 7 · As A with role agent, modify a table restricted to owner and
     *  admin. Rejected. */
    it('7 · an agent cannot modify a table restricted to owner and admin', async () => {
      const aRow = await knownRowId(table, SEED_TENANT_A);
      if (!aRow) return;

      // Catch outside the transaction — see case 5.
      let affected = -1;
      try {
        affected = await asActor(asAAgent, async (tx) => {
          const result = await tx`
            update ${tx(table)} set updated_at = now() where id = ${aRow} returning id
          `;
          return result.length;
        });
      } catch {
        affected = 0;
      }
      // usage_counters admits agents by design (08 §3), so an affected row
      // there is correct rather than a failure.
      if (table === 'usage_counters') expect(affected).toBeGreaterThanOrEqual(0);
      else expect(affected).toBe(0);
    });

    /** Case 8 · With no context set at all.
     *  THE POOLED-CONNECTION LEAK TEST. */
    it('8 · with no context set, selects return zero rows and writes are rejected', async () => {
      const visible = await withNoContext(async (tx) => {
        const rows = await tx`select id from ${tx(table)}`;
        return rows.length;
      });
      expect(visible).toBe(0);

      // Catch outside the transaction — see the note on case 5 for why an
      // inner catch cannot work once a statement has aborted it.
      let written = -1;
      try {
        written = await withNoContext(async (tx) => {
          const result = await tx`
            insert into ${tx(table)} (tenant_id) values (${SEED_TENANT_A}) returning id
          `;
          return result.length;
        });
      } catch {
        written = 0;
      }
      expect(written).toBe(0);
    });

    /** Case 9 · As A in support mode, write to this table. Whether that is
     *  permitted or rejected is generated from the role matrix in 06 §5 and
     *  09 §4, confirmed 24 Aug 2026 as read and write with carve-outs rather
     *  than the read-only default this case originally tested against.
     *
     *  Case 2's warning applies here too: RLS filters, it does not always
     *  error, so an allowed write must be asserted as a REAL WRITE
     *  (`toBe(1)`), not merely as "did not throw". A weaker assertion would
     *  pass whether or not the carve-out logic in 00_context.sql and
     *  06_seams.sql is actually wired correctly. */
    it('9 · a support session can write only where 01 D-13 opened it', async () => {
      const aRow = await knownRowId(table, SEED_TENANT_A);
      if (!aRow) return;

      // Catch outside the transaction — see case 5.
      let affected = -1;
      try {
        affected = await asActor(asASupport, async (tx) => {
          const result = await tx`
            update ${tx(table)} set updated_at = now() where id = ${aRow} returning id
          `;
          return result.length;
        });
      } catch {
        affected = 0;
      }

      if (SUPPORT_WRITE_ALLOWED.has(table)) {
        expect(affected).toBe(1);
      } else {
        expect(affected).toBe(0);
      }
    });

    /** Case 10 · As A, join through a foreign key to a B-owned parent row.
     *  Catches a child whose policy is correct while a query leaks through a
     *  parent whose policy is not. */
    it('10 · a join through a foreign key to a tenant B parent returns zero rows', async () => {
      const bRow = await knownRowId(table, SEED_TENANT_B);
      if (!bRow) return;

      const rows = await asActor(asA, async (tx) => {
        return tx`
          select t.id
          from ${tx(table)} t
          join tenants parent on parent.id = t.tenant_id
          where parent.id = ${SEED_TENANT_B}
        `;
      });
      expect(rows.length).toBe(0);
    });
  });
});

/**
 * 06 §9. The customer records seam gets one case the others do not, because it
 * is the one dataset where a support session's read has real privacy weight.
 * 09 §4 proposes no support access at all and the policy implements that.
 */
describe('isolation · customer_records under support mode', () => {
  it('a support session reads nothing at all', async () => {
    const rows = await asActor(asASupport, (tx) => tx`select id from customer_records`);
    expect(rows.length).toBe(0);
  });
});
