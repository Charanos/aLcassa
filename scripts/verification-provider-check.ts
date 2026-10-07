/** CI and local checks use the real provider schema, never a Storage facsimile. */
import assert from 'node:assert/strict';
import postgres from 'postgres';

async function main(): Promise<void> {
  const url = new URL(process.env.DATABASE_URL_ADMIN ?? '');
  assert.equal(url.hostname, '127.0.0.1');
  assert.equal(url.port, '55422');
  assert.equal(url.pathname, '/postgres');
  const sql = postgres(url.toString(), { max: 1, prepare: false });
  try {
    const [provider] = await sql<
      { objects: string | null; buckets: string | null; uid: string | null; role: boolean }[]
    >`select to_regclass('storage.objects')::text as objects,
      to_regclass('storage.buckets')::text as buckets,
      to_regprocedure('auth.uid()')::text as uid,
      exists(select 1 from pg_roles where rolname = 'authenticated') as role`;
    assert.ok(provider?.objects, 'Real storage.objects must exist before application policies.');
    assert.ok(provider?.buckets, 'Real storage.buckets must exist before application policies.');
    assert.ok(provider?.uid, 'The provider must supply auth.uid().');
    assert.equal(provider?.role, true, 'The provider must supply the authenticated role.');
    console.log(
      'Disposable provider schema verified: Storage, Auth and authenticated role present.',
    );
  } finally {
    await sql.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Provider schema verification failed.');
  process.exitCode = 1;
});
