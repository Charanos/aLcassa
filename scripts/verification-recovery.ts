/** Full local database recovery into an owned, separate target; never restores over the source. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFile, spawn, type ChildProcess } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, writeFile } from 'node:fs/promises';
import postgres, { type TransactionSql } from 'postgres';
import { assertDisposableDatabase } from '../tests/isolation/disposable';
import { httpFixtures, applicationWorker, signIn } from './verification-http-fixture';
import { createResolvedContext } from '../src/lib/db/context';
import { createCredential } from '../src/modules/credentials';

const execute = promisify(execFile);
const container = 'supabase_db_alcassa-phase-one-verification';
const target = `alcassa_recovery_${randomUUID().replaceAll('-', '')}`;
const dump = `/tmp/${target}.dump`;
async function main() {
  assertDisposableDatabase();
  const inspected = await execute('docker', [
    'inspect',
    '--format',
    '{{index .Config.Labels "com.supabase.cli.project"}}',
    container,
  ]);
  assert.equal(inspected.stdout.trim(), 'alcassa-phase-one-verification');
  const source = postgres(process.env.DATABASE_URL_ADMIN!, { max: 1, prepare: false });
  const targetUrl = new URL(process.env.DATABASE_URL_ADMIN!);
  targetUrl.pathname = `/${target}`;
  let restored: ReturnType<typeof postgres> | undefined;
  let created = false;
  const owned = await httpFixtures(1);
  const fixture = owned.fixtures[0]!;
  const workers: ChildProcess[] = [];
  let result: Record<string, unknown> | undefined;
  const started = performance.now();
  const docker = (args: string[]) =>
    execute('docker', ['exec', container, ...args], { maxBuffer: 2 * 1024 * 1024 });
  async function snapshot(sql: ReturnType<typeof postgres> | TransactionSql) {
    const tables = await sql<
      { schema: string; name: string; owner: string; rls: boolean; forced: boolean; acl: unknown }[]
    >`
      select n.nspname as schema,c.relname as name,pg_get_userbyid(c.relowner) as owner,
        c.relrowsecurity as rls,c.relforcerowsecurity as forced,
        array(select concat_ws(':',a.grantor,a.grantee,a.privilege_type,a.is_grantable)
          from aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a order by 1) as acl
      from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where c.relkind='r' and n.nspname in ('public','auth','storage') order by 1,2`;
    const rows = [];
    for (const table of tables) {
      const [content] = await sql<{ count: number; fingerprint: string }[]>`
        select count(*)::int as count,md5(coalesce(string_agg(row_to_json(t)::text,E'\n'
          order by row_to_json(t)::text),'')) as fingerprint from ${sql(table.schema)}.${sql(table.name)} t`;
      rows.push({ ...table, ...content });
    }
    const policies =
      await sql`select schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check
      from pg_policies where schemaname in ('public','storage') order by 1,2,3`;
    const functions =
      await sql`select n.nspname,p.proname,pg_get_function_identity_arguments(p.oid) as args,
      pg_get_userbyid(p.proowner) as owner,p.prosecdef,p.proconfig,
      array(select concat_ws(':',a.grantor,a.grantee,a.privilege_type,a.is_grantable)
        from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a order by 1) as proacl
      from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='app' order by 1,2,3`;
    return { rows, policies: [...policies], functions: [...functions] };
  }
  try {
    const credential = await createCredential(
      createResolvedContext({
        tenantId: fixture.tenantId,
        actorId: fixture.userId,
        actorLabel: 'Recovery verifier',
        actorType: 'user',
        role: 'owner',
        supportMode: false,
        requestId: randomUUID(),
      }),
      { name: 'Recovery acceptance', scopes: ['tenant:read'], requestKey: randomUUID() },
    );
    assert(credential.secret);
    // Export one snapshot for the independent counts and dump, even while Auth writes continue.
    const before = await source.begin('isolation level repeatable read read only', async (tx) => {
      const baseline = await snapshot(tx);
      const [exported] = await tx<{ id: string }[]>`select pg_export_snapshot() as id`;
      assert(exported?.id);
      await docker([
        'pg_dump',
        '--username=postgres',
        '--dbname=postgres',
        '--format=custom',
        `--snapshot=${exported.id}`,
        `--file=${dump}`,
      ]);
      return baseline;
    });
    await docker(['createdb', '--username=postgres', '--template=template0', target]);
    created = true;
    await docker([
      'pg_restore',
      '--username=supabase_admin',
      `--dbname=${target}`,
      '--exit-on-error',
      dump,
    ]);
    const restoredAt = performance.now();
    restored = postgres(targetUrl.toString(), { max: 1, prepare: false });
    const after = await snapshot(restored);
    assert.deepEqual(
      after,
      before,
      'Restored rows, policies, grants, ownership and definer settings must match',
    );
    const restrictedUrl = new URL(process.env.DATABASE_URL!);
    restrictedUrl.pathname = `/${target}`;
    const restricted = postgres(restrictedUrl.toString(), { max: 1, prepare: false });
    try {
      const invisible = await restricted.begin(async (tx) => {
        await tx`select set_config('app.tenant_id','',true),set_config('app.actor_id','',true)`;
        return tx`select id from public.tenant_members`;
      });
      assert.equal(
        invisible.length,
        0,
        'Restored database must retain default-deny tenant isolation',
      );
    } finally {
      await restricted.end();
    }
    const restoredApplication = await applicationWorker(3123, {
      DATABASE_URL: restrictedUrl.toString(),
      DATABASE_URL_ADMIN: targetUrl.toString(),
    });
    workers.push(restoredApplication);
    const cookies = await signIn(3123, fixture);
    const me = await fetch('http://127.0.0.1:3123/api/v1/me', { headers: { cookie: cookies } });
    assert.equal(me.status, 200);
    const page = await fetch('http://127.0.0.1:3123/app/settings/company', {
      headers: { cookie: cookies },
      redirect: 'manual',
    });
    assert.equal(page.status, 200);
    assert(!(await page.text()).includes('This screen did not load.'));
    const serviceRoot = new URL('../../aLcassa-service/', import.meta.url);
    const urlModule = await import('node:url');
    const pathModule = await import('node:path');
    const servicePath = urlModule.fileURLToPath(serviceRoot);
    const service = spawn(
      pathModule.resolve(
        servicePath,
        process.platform === 'win32' ? '.venv/Scripts/python.exe' : '.venv/bin/python',
      ),
      [
        '-m',
        'uvicorn',
        'alcassa_service.main:app',
        '--host',
        '127.0.0.1',
        '--port',
        '8123',
        '--no-access-log',
      ],
      {
        cwd: servicePath,
        env: {
          ...process.env,
          SERVICE_DATABASE_URL: restrictedUrl.toString(),
          DATABASE_URL_ADMIN: '',
          SERVICE_DATABASE_URL_ADMIN: '',
        },
        windowsHide: true,
        stdio: ['ignore', 'ignore', 'pipe'],
      },
    );
    workers.push(service);
    service.stderr?.resume();
    for (let index = 0; index < 120; index++) {
      if (service.exitCode !== null) throw new Error('Restored service exited');
      if ((await fetch('http://127.0.0.1:8123/service/v1/ready').catch(() => null))?.ok) break;
      await new Promise((done) => setTimeout(done, 250));
    }
    const read = (path = 'tenant') =>
      fetch(`http://127.0.0.1:8123/service/v1/${path}`, {
        headers: { authorization: `Bearer ${credential.secret}` },
      });
    const tenantResponse = await read();
    assert.equal(tenantResponse.status, 200);
    assert.equal(
      ((await tenantResponse.json()) as { data: { id: string } }).data.id,
      fixture.tenantId,
    );
    assert.equal((await read('ai-rules')).status, 403);
    await restored`update api_credentials set status='revoked',revoked_at=now() where id=${credential.credential.id}`;
    assert.equal((await read()).status, 401);
    assert.equal(
      (await source`select status from api_credentials where id=${credential.credential.id}`)[0]
        ?.status,
      'active',
    );
    result = {
      checkedAt: new Date().toISOString(),
      passed: true,
      localOnly: true,
      tables: before.rows.length,
      rows: before.rows.reduce((sum, row) => sum + (row.count ?? 0), 0),
      policies: before.policies.length,
      contextFunctions: before.functions.length,
      restoreMilliseconds: Math.round(restoredAt - started),
      dataDifferences: 0,
      ownershipAndGrantsMatch: true,
      definerSettingsMatch: true,
      defaultDenyPassed: true,
      applicationIdentityPassed: true,
      settingsPagePassed: true,
      serviceReadPassed: true,
      missingScopeRefused: true,
      restoredRevocationRefused: true,
      sourceUnchanged: true,
      boundary:
        'Same-cluster PostgreSQL restore, with actual provider-backed sign-in to the restored application database and restricted service HTTP. Provider validation uses the existing local Auth process. Separate Auth process, object bytes and clean upgrade remain additional checks. No hosted PITR or production RTO/RPO claim.',
      fixtureCleanup: true,
    };
    console.log(
      'Database recovery passed: source rows, ownership, grants, policies and context functions reconcile.',
    );
  } finally {
    for (const worker of workers) if (worker.exitCode === null) worker.kill();
    await Promise.all(
      workers.map((worker) =>
        worker.exitCode !== null
          ? Promise.resolve()
          : new Promise<void>((done) => worker.once('exit', () => done())),
      ),
    );
    if (restored) await restored.end();
    if (created) {
      assert(/^alcassa_recovery_[a-f0-9]{32}$/.test(target));
      await docker(['dropdb', '--username=postgres', '--force', target]);
    }
    await docker(['rm', '-f', dump]);
    await owned.cleanup();
    await source.end();
  }
  await mkdir('.test-report/phase-one', { recursive: true });
  await writeFile(
    '.test-report/phase-one/database-recovery.json',
    JSON.stringify(result, null, 2) + '\n',
  );
}
main().catch((error: unknown) => {
  // Docker diagnostics can contain Auth configuration; retain them only in the private run log.
  console.error(error instanceof Error ? error.message : 'Database recovery failed.');
  process.exitCode = 1;
});
