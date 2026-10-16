/** Own the service lifecycle while rule writes compete with independent conditional readers. */
import assert from 'node:assert/strict';
import { spawn, fork, type ChildProcess } from 'node:child_process';
import { resolve } from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import { parse } from 'dotenv';

async function main() {
  const local = await readFile('.env.verification.local', 'utf8').catch((error: unknown) => {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return '';
    throw error;
  });
  Object.assign(process.env, parse(local), {
    CACHE_DISABLED: 'true',
    VERIFICATION_DISPOSABLE: 'true',
    VERIFICATION_SERVICE_URL: 'http://127.0.0.1:8100',
  });
  for (const key of [
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN',
    'AXIOM_TOKEN',
    'AXIOM_DATASET',
    'SENTRY_DSN',
    'NEXT_PUBLIC_SENTRY_DSN',
    'SUPABASE_SECRET_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ])
    process.env[key] = '';
  process.env.DATABASE_URL_TEST = process.env.DATABASE_URL;
  const serviceRoot = process.env.VERIFICATION_SERVICE_ROOT ?? '../aLcassa-service';
  let service: ChildProcess | undefined;
  async function stop() {
    if (service && service.exitCode === null && service.signalCode === null) {
      const stopped = new Promise<void>((done) => service!.once('exit', () => done()));
      if (process.platform === 'win32') {
        const killer = spawn('taskkill', ['/pid', String(service.pid), '/T', '/F'], {
          windowsHide: true,
          stdio: 'ignore',
        });
        await new Promise<void>((done) => killer.once('exit', () => done()));
      } else service.kill();
      await stopped;
    }
  }
  async function start(failedCache: boolean) {
    service = spawn(
      resolve(
        serviceRoot,
        '.venv',
        process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python',
      ),
      [
        '-m',
        'uvicorn',
        'alcassa_service.main:app',
        '--host',
        '127.0.0.1',
        '--port',
        '8100',
        '--no-access-log',
      ],
      {
        cwd: serviceRoot,
        windowsHide: true,
        stdio: 'ignore',
        env: {
          ...process.env,
          SERVICE_DATABASE_URL: process.env.DATABASE_URL!,
          DATABASE_URL_ADMIN: '',
          SERVICE_DATABASE_URL_ADMIN: '',
          CACHE_DISABLED: failedCache ? 'false' : 'true',
          UPSTASH_REDIS_REST_URL: failedCache ? 'http://127.0.0.1:1' : '',
          UPSTASH_REDIS_REST_TOKEN: failedCache ? 'disposable-unreachable-cache' : '',
        },
      },
    );
    let ready = false;
    for (let n = 0; n < 120; n++) {
      if ((await fetch('http://127.0.0.1:8100/service/v1/ready').catch(() => null))?.ok) {
        ready = true;
        break;
      }
      if (service.exitCode !== null) break;
      await new Promise((done) => setTimeout(done, 100));
    }
    assert(ready, 'Owned service must become ready');
  }
  const phases = [];
  try {
    for (const failedCache of [false, true]) {
      await start(failedCache);
      const child = fork(resolve('scripts/verification-rules-propagation.ts'), [], {
        windowsHide: true,
        env: { ...process.env, VERIFICATION_RULES_READERS: '8', VERIFICATION_RULES_FORK: 'true' },
        stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
      });
      child.stdout?.pipe(process.stdout);
      child.stderr?.pipe(process.stderr);
      child.on('message', (message: unknown) => {
        if (
          message &&
          typeof message === 'object' &&
          'type' in message &&
          message.type === 'restart-service'
        )
          void (async () => {
            await stop();
            await start(failedCache);
            if (child.connected) child.send({ type: 'service-restarted' });
          })().catch(() => {
            if (child.connected) child.send({ type: 'service-restart-failed' });
          });
      });
      assert.equal(
        await new Promise<number | null>((done) => child.once('exit', done)),
        0,
        'Loaded rule propagation must pass',
      );
      const receipt = JSON.parse(
        await readFile('.test-report/phase-one/rules-propagation-loaded.json', 'utf8'),
      ) as {
        passed: boolean;
        fixtureCleanup: boolean;
        samples: unknown[];
        maximumMs: number;
        restartPreservedConditionalRead: boolean;
        concurrentReaders: number;
        restartMs: number;
      };
      assert(receipt.passed && receipt.fixtureCleanup && receipt.restartPreservedConditionalRead);
      assert.equal(receipt.samples.length, 12);
      assert.equal(receipt.concurrentReaders, 8);
      assert(receipt.maximumMs < 5000 && receipt.restartMs < 5000);
      phases.push({ mode: failedCache ? 'unreachable-cache' : 'cache-disabled', ...receipt });
      await stop();
    }
  } finally {
    await stop();
  }
  await writeFile(
    '.test-report/phase-one/m4a-loaded-freshness.json',
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        passed: true,
        localOnly: true,
        fixtureCleanup: true,
        phases,
        boundary:
          '24 master/tenant publish and restore operations under eight concurrent real service readers. Cold and conditional warm reads, two owned service restarts and unavailable Redis retain fresh authorization and versions. Application-wide 50-session timings are measured separately.',
      },
      null,
      2,
    ) + '\n',
  );
  console.log(
    'Loaded rule freshness passed: 24 changes, eight readers, two restarts and both cache conditions.',
  );
}
void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Loaded rule verification failed');
  process.exitCode = 1;
});
