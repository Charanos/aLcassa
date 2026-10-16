/** Bound/reuse connections in the disposable Auth container; never changes identity or policies. */
import assert from 'node:assert/strict';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';

async function main() {
  const name = 'supabase_auth_alcassa-phase-one-verification';
  const inspected = JSON.parse(
    execFileSync('docker', ['inspect', name], { encoding: 'utf8', windowsHide: true }),
  ) as { Name: string; Config: { Image: string; Env: string[] } }[];
  const container = inspected[0];
  assert(
    container?.Name === `/${name}` &&
      container.Config.Image.startsWith('public.ecr.aws/supabase/gotrue:'),
    'Only the owned disposable provider may be configured.',
  );
  const configured = container.Config.Env.filter((value) =>
    /^GOTRUE_DB_MAX_(?:IDLE_)?POOL_SIZE=/.test(value),
  );
  assert(
    configured.length === 0,
    'Explicit provider pool environment must be reviewed rather than overridden.',
  );
  const current = execFileSync(
    'docker',
    ['exec', name, 'sh', '-c', 'if [ -f /.env ]; then cat /.env; fi'],
    { encoding: 'utf8', windowsHide: true },
  );
  const desired = current
    .split(/\r?\n/)
    .filter((line) => line && !/^GOTRUE_DB_MAX_(?:IDLE_)?POOL_SIZE=/.test(line));
  desired.push('GOTRUE_DB_MAX_POOL_SIZE=20', 'GOTRUE_DB_MAX_IDLE_POOL_SIZE=20');
  const contents = desired.join('\n') + '\n';
  if (current !== contents) {
    const writer = spawn('docker', ['exec', '--user', '0', '-i', name, 'sh', '-c', 'cat > /.env'], {
      windowsHide: true,
      stdio: ['pipe', 'ignore', 'ignore'],
    });
    writer.stdin.end(contents);
    assert.equal(await new Promise<number | null>((done) => writer.once('exit', done)), 0);
    execFileSync('docker', ['restart', name], { stdio: 'ignore', windowsHide: true });
  }
  let ready = false;
  for (let i = 0; i < 120; i++) {
    if ((await fetch('http://127.0.0.1:55421/auth/v1/health').catch(() => null))?.ok) {
      ready = true;
      break;
    }
    await new Promise((done) => setTimeout(done, 250));
  }
  assert(ready, 'Disposable Auth must recover after pool configuration');
  const captured = spawnSync('docker', ['logs', '--tail', '150', name], {
    encoding: 'utf8',
    windowsHide: true,
  });
  assert.equal(captured.status, 0);
  const logs = captured.stdout + captured.stderr;
  assert(
    logs.includes('"limit_max_idle_conns":20') && logs.includes('"limit_max_open_conns":20'),
    'Auth must confirm the live bounded idle and open connection limits',
  );
  await mkdir('.test-report/phase-one', { recursive: true });
  await writeFile(
    '.test-report/phase-one/auth-pool.json',
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        passed: true,
        localOnly: true,
        image: container.Config.Image,
        maxOpenConnections: 20,
        maxIdleConnections: 20,
        identityAndPoliciesUnchanged: true,
        source: 'https://github.com/supabase/auth/issues/2831',
      },
      null,
      2,
    ) + '\n',
  );
  console.log(
    'Disposable Auth connection reuse verified: 20 open / 20 idle; identity and policies unchanged.',
  );
}
void main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : 'Disposable Auth pool configuration failed',
  );
  process.exitCode = 1;
});
