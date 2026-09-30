import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Every console reader of the platform audit log opens an ACTOR context.
 *
 * ⚠ THE POLICY WAS NEVER WRONG, WHICH IS WHY NOTHING CAUGHT THIS.
 *
 * `shared-tables.test.ts` already proves `platform_audit_log` is readable by a
 * platform admin and invisible without one — and it passed throughout. What
 * was wrong was three READERS choosing `withoutTenantContext`, which sets no
 * actor: the policy did exactly its job and returned nothing, and row-level
 * security filters rather than erroring, so the audit page rendered an empty
 * ledger over 297 real entries (doc 23, A0.1). The overview's "last actions"
 * was blind the same way.
 *
 * So this checks the thing that actually broke — the context each reader opens
 * — rather than the policy again. It is structural and needs no database: each
 * async function in `src/lib/console` that queries `platformAuditLog` must
 * not do so inside `withoutTenantContext`.
 */

const DIR = join(process.cwd(), 'src', 'lib', 'console');

function asyncFunctions(source: string): Array<{ name: string; body: string }> {
  /* Every async function, exported or not: a helper that opens its own
     transaction is exactly where the first fix missed one. */
  const starts = [...source.matchAll(/(?:export )?async function (\w+)/g)];
  return starts.map((m, i) => ({
    name: m[1] ?? '?',
    /* Comments stripped: a docblock that MENTIONS the table — and the next
       function's docblock falls inside this slice — is not a query of it. */
    body: source
      .slice(m.index, starts[i + 1]?.index ?? source.length)
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/[^\n]*/g, ''),
  }));
}

describe('platform audit log readers', () => {
  const files = readdirSync(DIR).filter((f) => f.endsWith('.ts'));

  const readers = files.flatMap((file) =>
    asyncFunctions(readFileSync(join(DIR, file), 'utf8'))
      .filter((fn) => /\bplatformAuditLog\b|platform_audit_log/.test(fn.body))
      .map((fn) => ({ ...fn, file })),
  );

  it('finds the readers it is meant to guard', () => {
    /* If this drops to zero the check below proves nothing — the readers were
       renamed or moved, and this test needs pointing at them. */
    expect(readers.length).toBeGreaterThanOrEqual(3);
  });

  it.each(readers.map((r) => [`${r.file} · ${r.name}`, r] as const))(
    '%s reads with an actor context',
    (_label, reader) => {
      expect(
        reader.body.includes('withoutTenantContext('),
        `${reader.name} queries platform_audit_log inside withoutTenantContext, which sets no actor — the select policy will return zero rows and the page will show an empty log. Use withActorContext(ctx.actorId, ctx.requestId, …).`,
      ).toBe(false);
    },
  );
});
