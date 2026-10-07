import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { assertDisposableDatabase } from './disposable';

const admin = postgres(process.env.DATABASE_URL_ADMIN!, { max: 1, prepare: false });
const actor = randomUUID();
const other = randomUUID();
const prefix = `verification-${randomUUID()}`;
const ownPath = `platform/${actor}/${prefix}.png`;
let verifiedDisposable = false;

async function asStorage<T>(
  userId: string,
  run: (tx: postgres.TransactionSql) => Promise<T>,
  storageDeletion = false,
): Promise<T> {
  return admin.begin(async (tx) => {
    await tx.unsafe('set local role authenticated');
    await tx`select set_config('request.jwt.claim.sub', ${userId}, true)`;
    // The provider sets this for API deletion. SQL policy checks reproduce
    // that invocation; a separate case verifies direct deletion stays denied.
    if (storageDeletion) await tx`select set_config('storage.allow_delete_query', 'true', true)`;
    return run(tx);
  }) as Promise<T>;
}

beforeAll(() => {
  assertDisposableDatabase();
  verifiedDisposable = true;
});

afterAll(async () => {
  if (verifiedDisposable) {
    await admin.begin(async (tx) => {
      await tx`select set_config('storage.allow_delete_query', 'true', true)`;
      await tx`delete from storage.objects where name like ${`%${prefix}%`}`;
    });
  }
  await admin.end();
});

describe('Avatar policies on the real provider schema', () => {
  it('enforces RLS without bypass for the authenticated provider role', async () => {
    const [role] = await admin<
      { bypass: boolean; superuser: boolean; rls: boolean }[]
    >`select r.rolbypassrls as bypass, r.rolsuper as superuser, c.relrowsecurity as rls
      from pg_roles r cross join pg_class c
      where r.rolname = 'authenticated' and c.oid = 'storage.objects'::regclass`;
    expect(role).toEqual({ bypass: false, superuser: false, rls: true });
  });

  it('allows an authenticated user to insert only in their own platform folder', async () => {
    const rows = await asStorage(actor, async (tx) => {
      return tx`insert into storage.objects(bucket_id,name) values('avatars',${ownPath}) returning name`;
    });
    expect(rows).toHaveLength(1);
    await expect(
      asStorage(other, async (tx) => {
        return tx`insert into storage.objects(bucket_id,name) values('avatars',${`platform/${actor}/${prefix}-foreign.png`})`;
      }),
    ).rejects.toMatchObject({ code: '42501' });
  });

  it('rejects a different path prefix even when the user ID matches', async () => {
    await expect(
      asStorage(actor, async (tx) => {
        return tx`insert into storage.objects(bucket_id,name) values('avatars',${`tenant/${actor}/${prefix}-prefix.png`})`;
      }),
    ).rejects.toMatchObject({ code: '42501' });
  });

  it('keeps public avatar reads available to another authenticated identity', async () => {
    const rows = await asStorage(other, async (tx) => {
      return tx`select name from storage.objects where bucket_id='avatars' and name=${ownPath}`;
    });
    expect(rows).toHaveLength(1);
  });

  it('preserves the provider safeguard against direct object deletion', async () => {
    await expect(
      asStorage(actor, async (tx) => {
        return tx`delete from storage.objects where name=${ownPath}`;
      }),
    ).rejects.toMatchObject({ code: '42501' });
  });

  it('refuses an overwrite and a foreign deletion while allowing provider-style owner removal', async () => {
    const overwritten = await asStorage(actor, async (tx) => {
      return tx`update storage.objects set name=${`${ownPath}.changed`} where name=${ownPath} returning id`;
    });
    expect(overwritten).toHaveLength(0);
    const foreign = await asStorage(
      other,
      async (tx) => {
        return tx`delete from storage.objects where name=${ownPath} returning id`;
      },
      true,
    );
    expect(foreign).toHaveLength(0);
    const own = await asStorage(
      actor,
      async (tx) => {
        return tx`delete from storage.objects where name=${ownPath} returning id`;
      },
      true,
    );
    expect(own).toHaveLength(1);
  });
});
