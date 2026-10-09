/** Actual failed/healthy FastAPI readiness and durable webhook delivery, using owned workers. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { execFile, spawn, type ChildProcess } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { assertDisposableDatabase } from '../tests/isolation/disposable';
import { applicationWorker } from './verification-http-fixture';
import type { MonitorState, Notification } from '../src/lib/observability/dependencyMonitor';

const execute = promisify(execFile);
async function main() {
  assertDisposableDatabase();
  const directory = '.test-report/phase-one';
  await mkdir(directory, { recursive: true });
  const stateFile = resolve(directory, `monitor-${randomUUID()}.json`);
  const serviceRoot = resolve(process.env.VERIFICATION_SERVICE_REPOSITORY ?? '../aLcassa-service');
  const python = resolve(
    serviceRoot,
    '.venv',
    process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python',
  );
  const accepted: Notification[] = [];
  const attempted: string[] = [];
  let refuseDelivery = true;
  const sink = createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on('data', (chunk: Buffer) => chunks.push(chunk));
    request.on('end', () => {
      const body = Buffer.concat(chunks).toString('utf8');
      const event = JSON.parse(body) as Notification;
      assert.equal(request.headers['idempotency-key'], event.id);
      assert.equal(request.headers.authorization, 'Bearer local-monitor-acceptance');
      assert(!/password|authorization|postgres|127\.0\.0\.1|bearer/i.test(body));
      attempted.push(event.id);
      if (refuseDelivery) response.writeHead(503).end();
      else {
        if (!accepted.some((e) => e.id === event.id)) accepted.push(event);
        response.writeHead(204).end();
      }
    });
  });
  let worker: ChildProcess | undefined;
  let application: ChildProcess | undefined;
  await new Promise<void>((done) => sink.listen(0, '127.0.0.1', done));
  const address = sink.address();
  assert(address && typeof address !== 'string');
  const stop = async () => {
    if (worker && worker.exitCode === null) {
      worker.kill();
      await new Promise<void>((done) => worker!.once('exit', () => done()));
    }
  };
  const start = async (failed: boolean) => {
    const database = new URL(process.env.DATABASE_URL!);
    if (failed) database.port = '55429';
    worker = spawn(
      python,
      [
        '-m',
        'uvicorn',
        'alcassa_service.main:app',
        '--host',
        '127.0.0.1',
        '--port',
        '8126',
        '--no-access-log',
      ],
      {
        cwd: serviceRoot,
        env: {
          ...process.env,
          DATABASE_URL: database.toString(),
          SERVICE_DATABASE_URL: database.toString(),
          DATABASE_URL_ADMIN: '',
          SERVICE_DATABASE_URL_ADMIN: '',
        },
        windowsHide: true,
        stdio: ['ignore', 'ignore', 'pipe'],
      },
    );
    worker.stderr?.resume();
    for (let i = 0; i < 120; i++) {
      if (worker.exitCode !== null) throw new Error('Monitoring service worker exited.');
      if ((await fetch('http://127.0.0.1:8126/service/v1/health').catch(() => null))?.ok) return;
      await new Promise((done) => setTimeout(done, 250));
    }
    throw new Error('Monitoring service liveness timed out.');
  };
  const run = (target: 'service' | 'application' = 'service') =>
    execute(process.execPath, ['--import', 'tsx', 'scripts/monitor-dependencies.ts'], {
      env: {
        ...process.env,
        MONITOR_APPLICATION_URL: target === 'application' ? 'http://127.0.0.1:3127/api/health' : '',
        MONITOR_IDENTITY_URL: '',
        MONITOR_SERVICE_URL: target === 'service' ? 'http://127.0.0.1:8126/service/v1/ready' : '',
        MONITOR_WEBHOOK_URL: `http://127.0.0.1:${address.port}/events`,
        MONITOR_WEBHOOK_TOKEN: 'local-monitor-acceptance',
        MONITOR_STATE_FILE: stateFile,
      },
      windowsHide: true,
    });
  let result: Record<string, unknown> | undefined;
  try {
    await start(true);
    const readiness = await fetch('http://127.0.0.1:8126/service/v1/ready');
    assert.equal(readiness.status, 503);
    assert.equal(readiness.headers.get('retry-after'), '5');
    assert(!/postgres|password|55429|alcassa_app/i.test(await readiness.text()));
    await run();
    await run();
    assert.equal(accepted.length, 0);
    await assert.rejects(() => run());
    const pending = JSON.parse(await readFile(stateFile, 'utf8')) as MonitorState;
    assert.equal(pending.pending.length, 1);
    const outageId = pending.pending[0]!.id;
    refuseDelivery = false;
    await run();
    await run();
    assert.equal(accepted.length, 1);
    assert.equal(accepted[0]!.id, outageId);
    assert.equal(attempted.filter((id) => id === outageId).length, 2);
    await stop();
    await start(false);
    assert.equal((await fetch('http://127.0.0.1:8126/service/v1/ready')).status, 200);
    await run();
    assert.equal(accepted.length, 1);
    await run();
    await run();
    assert.equal(accepted.length, 2);
    assert.deepEqual(
      accepted.map((e) => e.kind),
      ['outage', 'recovery'],
    );
    assert.equal(accepted[0]!.incidentId, accepted[1]!.incidentId);
    const unavailable = new URL(process.env.DATABASE_URL!);
    unavailable.port = '55429';
    application = await applicationWorker(3127, {
      DATABASE_URL: unavailable.toString(),
      DATABASE_URL_ADMIN: '',
    });
    const failedApplication = await fetch('http://127.0.0.1:3127/api/health', {
      signal: AbortSignal.timeout(20000),
    });
    assert.equal(failedApplication.status, 503);
    assert.equal(failedApplication.headers.get('retry-after'), '30');
    assert(!/postgres|password|55429|alcassa_app/i.test(await failedApplication.text()));
    await run('application');
    await run('application');
    await run('application');
    assert.equal(accepted.length, 3);
    application.kill();
    await new Promise<void>((done) => application!.once('exit', () => done()));
    application = await applicationWorker(3127, { DATABASE_URL_ADMIN: '' });
    await run('application');
    await run('application');
    await run('application');
    assert.equal(accepted.length, 4);
    assert.equal(accepted[2]!.incidentId, accepted[3]!.incidentId);
    assert.equal(accepted[2]!.target, 'application');
    const final = JSON.parse(await readFile(stateFile, 'utf8')) as MonitorState;
    assert.equal(final.pending.length, 0);
    assert.equal(final.targets.service?.incidentId, null);
    assert.equal(final.targets.application?.incidentId, null);
    result = {
      checkedAt: new Date().toISOString(),
      localOnly: true,
      passed: true,
      livenessSurvivesDatabaseFailure: true,
      readinessRefusesDatabaseFailure: true,
      safeErrorAndRetryAfter: true,
      outageThreshold: 3,
      recoveryThreshold: 2,
      deliveredEvents: 4,
      applicationDatabaseFailureAndRecovery: true,
      serviceDatabaseFailureAndRecovery: true,
      failedDeliveryRetriedWithSameId: true,
      noDuplicateAcceptedEvents: true,
      outageRecoveryCorrelated: true,
      pendingAfterRecovery: 0,
      fixtureCleanup: true,
      boundary:
        'Actual isolated production Next and FastAPI workers with unavailable and restored local database connections, plus an authenticated local HTTP notification sink. This qualifies readiness monitoring and retry/recovery delivery; external pager delivery and broader Auth/email/storage/write-uncertainty journeys remain separate.',
    };
  } finally {
    await stop();
    if (application && application.exitCode === null) {
      application.kill();
      await new Promise<void>((done) => application!.once('exit', () => done()));
    }
    await new Promise<void>((done, reject) =>
      sink.close((error) => (error ? reject(error) : done())),
    );
    await rm(stateFile, { force: true });
  }
  await writeFile(`${directory}/monitoring-delivery.json`, JSON.stringify(result, null, 2) + '\n');
  process.stdout.write(JSON.stringify(result) + '\n');
}
void main().catch((error: unknown) => {
  process.stderr.write(String(error) + '\n');
  process.exitCode = 1;
});
