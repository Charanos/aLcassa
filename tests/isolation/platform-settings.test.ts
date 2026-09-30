import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import type postgres from 'postgres';
import { adminQuery, asActor, cleanup, closeHarness, sql } from './harness';
import { SEED_TENANT_A, SEED_USER_A } from '../../src/db/seed/constants';
/* Through the module's entry, which installs the audit writer `asService`
   refuses to run without. See platform-capabilities.test.ts. */
import { updatePlatformSettings } from '../../src/modules/platform';
import { AppError, ERROR_CODES } from '../../src/lib/errors';

/**
 * Doc 23 · S0.2. The platform settings row, and who can see the operators.
 *
 * Three claims, each of which the Settings and Admins pages now make:
 *
 *   1. An operator reads the one settings row; nobody else reads it, and the
 *      application role cannot write it by any route but the audited one.
 *   2. Operators see each other. Until this migration the only select policy
 *      on `platform_admins` was "your own row", so a second operator was
 *      invisible to the first and the Admins page could only ever list one.
 *   3. A save writes the diff into the platform audit log in the same
 *      transaction as the change, and a save over a version the operator never
 *      saw is refused with nothing written.
 *
 * The suite runs against the development database the app also uses, so every
 * change it makes is undone: the row is restored to what it held, and the
 * probes' audit rows are removed with the probes.
 */

const operator = randomUUID();
const colleague = randomUUID();
const revoked = randomUUID();
const probes = [operator, colleague, revoked];

type Row = {
  platform_name: string;
  support_email: string;
  updated_at: Date;
  updated_by: string | null;
};
let original: Row;

async function asOperator<T>(
  actorId: string,
  run: (tx: postgres.TransactionSql) => Promise<T>,
): Promise<T> {
  /* What `withActorContext` sets: an actor, and no tenant. */
  return sql.begin(async (tx) => {
    await tx`select set_config('app.tenant_id', '', true)`;
    await tx`select set_config('app.role', 'none', true)`;
    await tx`select set_config('app.support_mode', 'false', true)`;
    await tx`select set_config('app.actor_id', ${actorId}, true)`;
    return run(tx);
  }) as Promise<T>;
}

async function stored(): Promise<Row> {
  const [row] = await adminQuery<Row[]>`
    select platform_name, support_email, updated_at, updated_by from platform_settings`;
  if (!row) throw new Error('platform_settings has no row. Is the database migrated?');
  return row;
}

/** The version the page would send back: milliseconds, as a JS Date holds it. */
async function version(): Promise<string> {
  const [row] = await adminQuery<{ v: Date }[]>`select updated_at as v from platform_settings`;
  return (row?.v ?? new Date(0)).toISOString();
}

function actor(userId: string) {
  return { userId, label: 'Settings probe <probe@example.invalid>', requestId: randomUUID() };
}

beforeAll(async () => {
  original = await stored();
  for (const [id, name] of [
    [operator, 'Settings probe'],
    [colleague, 'Settings colleague'],
    [revoked, 'Settings revoked'],
  ] as const) {
    await adminQuery`
      insert into user_profiles (id, full_name, email)
      values (${id}, ${name}, ${`probe-${id.slice(0, 8)}@example.invalid`})
      on conflict do nothing`;
  }
  await adminQuery`
    insert into platform_admins (user_id, display_name, deleted_at)
    values (${operator}, 'Settings probe', null),
           (${colleague}, 'Settings colleague', null),
           (${revoked}, 'Settings revoked', now())`;
});

afterAll(async () => {
  await cleanup`
    update platform_settings
    set platform_name = ${original.platform_name},
        support_email = ${original.support_email},
        updated_by = ${original.updated_by},
        updated_at = ${original.updated_at}`;
  await cleanup`delete from platform_audit_log where actor_user_id = any(${probes})`;
  await cleanup`delete from platform_admins where user_id = any(${probes})`;
  await cleanup`delete from user_profiles where id = any(${probes})`;
  await closeHarness();
});

describe('platform_settings · reading and writing', () => {
  it('an operator reads exactly the one row', async () => {
    const rows = await asOperator(
      operator,
      (tx) => tx`select platform_name from platform_settings`,
    );
    expect(rows.length).toBe(1);
  });

  it('a revoked operator reads nothing', async () => {
    const rows = await asOperator(revoked, (tx) => tx`select 1 from platform_settings`);
    expect(rows.length).toBe(0);
  });

  it('a tenant owner reads nothing', async () => {
    const rows = await asActor(
      { tenantId: SEED_TENANT_A, role: 'owner', actorId: SEED_USER_A, supportMode: false },
      (tx) => tx`select 1 from platform_settings`,
    );
    expect(rows.length).toBe(0);
  });

  it('the application role cannot write it, even as an operator', async () => {
    const updated = await asOperator(
      operator,
      (tx) => tx`update platform_settings set support_email = 'hijack@example.invalid'`,
    );
    expect(updated.count, 'an update matched a row with no update policy').toBe(0);

    const deleted = await asOperator(operator, (tx) => tx`delete from platform_settings`);
    expect(deleted.count).toBe(0);

    await expect(
      asOperator(
        operator,
        (tx) =>
          tx`insert into platform_settings (singleton, platform_name, support_email)
             values (true, 'Second', 'second@example.invalid')`,
      ),
    ).rejects.toThrow();

    expect((await stored()).support_email).toBe(original.support_email);
  });

  it('a save records the diff, and only the diff, in the same transaction', async () => {
    const next =
      original.support_email === 'probe@alcassa.co.ke'
        ? 'probe2@alcassa.co.ke'
        : 'probe@alcassa.co.ke';
    const result = await updatePlatformSettings(
      {
        platformName: original.platform_name,
        /* Upper case and padded: stored trimmed and lower-cased. */
        supportEmail: `  ${next.toUpperCase()} `,
        expectedUpdatedAt: await version(),
      },
      actor(operator),
    );
    expect(result.changed).toEqual(['supportEmail']);

    const row = await stored();
    expect(row.support_email).toBe(next);
    expect(row.updated_by).toBe(operator);

    const [entry] = await adminQuery<
      { before: unknown; after: unknown; used_service_role: boolean; entity_type: string }[]
    >`
      select before, after, used_service_role, entity_type from platform_audit_log
      where actor_user_id = ${operator} and action = 'platform.settings_updated'
      order by occurred_at desc limit 1`;
    expect(entry, 'the save wrote no audit row').toBeDefined();
    expect(entry?.before).toEqual({ supportEmail: original.support_email });
    expect(entry?.after).toEqual({ supportEmail: next });
    expect(entry?.used_service_role).toBe(true);
    expect(entry?.entity_type).toBe('platform_settings');
  });

  it('a save over a version the operator never saw is refused, and writes nothing', async () => {
    const before = await stored();
    const auditBefore = await adminQuery<{ n: number }[]>`
      select count(*)::int as n from platform_audit_log where actor_user_id = ${operator}`;

    const error = await updatePlatformSettings(
      {
        platformName: 'Stale edit',
        supportEmail: before.support_email,
        expectedUpdatedAt: new Date(before.updated_at.getTime() - 60_000).toISOString(),
      },
      actor(operator),
    ).then(
      () => null,
      (e: unknown) => e,
    );

    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).code).toBe(ERROR_CODES.PLATFORM_SETTINGS_CONFLICT);
    expect((await stored()).platform_name).toBe(before.platform_name);
    const auditAfter = await adminQuery<{ n: number }[]>`
      select count(*)::int as n from platform_audit_log where actor_user_id = ${operator}`;
    expect(auditAfter[0]?.n).toBe(auditBefore[0]?.n);
  });

  it('a save that changes nothing writes nothing', async () => {
    const before = await stored();
    const result = await updatePlatformSettings(
      {
        platformName: before.platform_name,
        supportEmail: before.support_email,
        expectedUpdatedAt: await version(),
      },
      actor(operator),
    );
    expect(result.changed).toEqual([]);
    expect((await stored()).updated_at.getTime()).toBe(before.updated_at.getTime());
  });
});

describe('platform_admins · operators see each other', () => {
  it('an operator sees every current operator, and no revoked one', async () => {
    const rows = await asOperator(
      operator,
      (tx) => tx<{ user_id: string }[]>`
        select user_id from platform_admins where user_id = any(${probes})`,
    );
    const seen = rows.map((r) => r.user_id).sort();
    expect(seen).toEqual([operator, colleague].sort());
  });

  it('a tenant owner sees no operator at all', async () => {
    const rows = await asActor(
      { tenantId: SEED_TENANT_A, role: 'owner', actorId: SEED_USER_A, supportMode: false },
      (tx) => tx`select 1 from platform_admins`,
    );
    expect(rows.length).toBe(0);
  });

  it('a revoked operator sees nobody, not even themselves', async () => {
    const rows = await asOperator(revoked, (tx) => tx`select 1 from platform_admins`);
    expect(rows.length).toBe(0);
  });
});
