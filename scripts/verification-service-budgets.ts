/** Real Redis contention; only owned fixtures in the disposable local database. */
import assert from 'node:assert/strict';
import { execFile, spawn, type ChildProcess } from 'node:child_process';
import { randomUUID, randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import { createConnection } from 'node:net';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { createResolvedContext } from '@/lib/db/context';
import { enforceTenantBudget } from '@/lib/http/serviceBudget';
import { jsonError } from '@/lib/http/response';
import contract from '@/lib/http/serviceBudget.json';
import { cacheIncrement, RATE_LIMIT_INCREMENT_SCRIPT } from '@/lib/cache';

const execute = promisify(execFile);
const container = 'alcassa-verification-redis';
const serviceRoot = resolve(process.env.VERIFICATION_SERVICE_REPOSITORY ?? '../aLcassa-service');
const httpMode = process.argv.includes('--http');

function context(tenant: string) {
  return createResolvedContext({
    tenantId: tenant,
    actorId: '00000000-0000-4000-8000-0000000000a1',
    actorLabel: 'Disposable budget verification',
    role: 'owner',
    actorType: 'user',
    supportMode: false,
    requestId: randomUUID(),
  });
}

async function main() {
  // Independent Node processes exercise the production admission module.
  // Their context comes from the parent fixture, not a public HTTP tenant header.
  if (process.argv[2] === 'node-worker') {
    try {
      await enforceTenantBudget(context(process.argv[3]!));
      console.log(JSON.stringify({ status: 200 }));
    } catch (error) {
      const response = jsonError(error, 'budget-worker');
      console.log(
        JSON.stringify({ status: response.status, retry: response.headers.get('retry-after') }),
      );
    }
    return;
  }
  if (process.argv[2] === 'public-counter') {
    console.log(JSON.stringify({ count: await cacheIncrement(process.argv[3]!, 20) }));
    return;
  }
  const { assertDisposableDatabase } = await import('../tests/isolation/disposable');
  assertDisposableDatabase();
  const { adminQuery, cleanup, closeHarness } = await import('../tests/isolation/harness');
  const { createCredential } = await import('@/modules/credentials');
  const { SEED_USER_A } = await import('@/db/seed/constants');
  const storedContract = JSON.parse(
    await readFile(resolve(serviceRoot, 'src/alcassa_service/service_budget.json'), 'utf8'),
  ) as unknown;
  assert.deepEqual(storedContract, contract, 'Both runtimes must use the same Redis contract');
  const image = JSON.parse(
    (await execute('docker', ['inspect', '--format', '{{json .Config}}', container])).stdout,
  ) as { Labels: Record<string, string>; Image: string };
  assert.equal(image.Labels['alcassa.verification'], 'phase-one');
  assert.equal(
    image.Image,
    'redis@sha256:858f009f9709ce576febc734aa78b8f6d624b82571f9ddb6bda4377c833b3499',
  );
  async function redis(...args: string[]): Promise<unknown> {
    // A fresh local RESP connection avoids CLI process startup under contention.
    return new Promise((done, reject) => {
      const socket = createConnection({ host: '127.0.0.1', port: 56379 });
      let buffer = Buffer.alloc(0);
      function parse(offset: number): { value: unknown; end: number } | undefined {
        const lineEnd = buffer.indexOf('\r\n', offset);
        if (lineEnd < 0) return;
        const type = String.fromCharCode(buffer[offset]!);
        const text = buffer.toString('utf8', offset + 1, lineEnd);
        let end = lineEnd + 2;
        if (type === '-') throw new Error('Redis command refused');
        if (type === '+') return { value: text, end };
        if (type === ':') return { value: Number(text), end };
        if (type === '$') {
          const length = Number(text);
          if (length === -1) return { value: null, end };
          if (buffer.length < end + length + 2) return;
          return { value: buffer.toString('utf8', end, end + length), end: end + length + 2 };
        }
        if (type === '*') {
          const value: unknown[] = [];
          for (let index = 0; index < Number(text); index++) {
            const item = parse(end);
            if (!item) return;
            value.push(item.value);
            end = item.end;
          }
          return { value, end };
        }
        throw new Error('Unsupported Redis response');
      }
      socket.setTimeout(2_000, () => socket.destroy(new Error('Local Redis timeout')));
      socket.on('error', reject);
      socket.on('connect', () =>
        socket.write(
          `*${args.length}\r\n` +
            args.map((arg) => `$${Buffer.byteLength(arg)}\r\n${arg}\r\n`).join(''),
        ),
      );
      socket.on('data', (chunk) => {
        buffer = Buffer.concat([buffer, chunk]);
        try {
          const result = parse(0);
          if (result) {
            socket.end();
            done(result.value);
          }
        } catch (error) {
          socket.destroy();
          reject(error instanceof Error ? error : new Error('Local Redis command failed'));
        }
      });
    });
  }
  const token = randomUUID();
  let available = true;
  const adapter = createServer((request, response) => {
    void (async () => {
      // Test-only REST transport. All operations execute against real Redis.
      if (request.headers.authorization !== `Bearer ${token}` || request.method !== 'POST') {
        response.writeHead(401).end();
        return;
      }
      if (!available) {
        response.writeHead(503).end();
        return;
      }
      try {
        const chunks: Buffer[] = [];
        for await (const chunk of request) chunks.push(Buffer.from(chunk as Uint8Array));
        const body: unknown = JSON.parse(Buffer.concat(chunks).toString());
        assert(Array.isArray(body));
        const pipelined = Array.isArray(body[0]);
        const commands: unknown[] = pipelined ? body : [body];
        const results = await Promise.all(
          commands.map(async (command) => {
            assert(
              Array.isArray(command) &&
                command.every((value) => typeof value === 'string' || typeof value === 'number'),
            );
            assert.equal(String(command[0]).toUpperCase(), 'EVAL');
            assert([contract.script, RATE_LIMIT_INCREMENT_SCRIPT].includes(String(command[1])));
            return { result: await redis(...command.map(String)) };
          }),
        );
        response
          .writeHead(200, { 'Content-Type': 'application/json' })
          .end(JSON.stringify(pipelined ? results : results[0]));
      } catch {
        response.writeHead(503).end();
      }
    })();
  });
  await new Promise<void>((done) => adapter.listen(8079, '127.0.0.1', done));
  const tenant = randomUUID(),
    other = randomUUID(),
    plan = randomUUID();
  const publicKey = `rl:public-verification:${tenant}`;
  const userId = randomUUID();
  const cookieJars = new Map<number, string>();
  let applicationRequest = 0;
  const workers: ChildProcess[] = [];
  const checks: { name: string; passed: boolean; admitted?: number; refused?: number }[] = [];
  const budgetEnv = {
    ...process.env,
    CACHE_DISABLED: 'false',
    UPSTASH_REDIS_REST_URL: 'http://127.0.0.1:8079',
    UPSTASH_REDIS_REST_TOKEN: token,
    SERVICE_RATE_LIMIT: '6',
    SERVICE_RATE_WINDOW_SECONDS: '120',
    DATABASE_URL_ADMIN: '',
    SERVICE_DATABASE_URL_ADMIN: '',
    SUPABASE_SERVICE_ROLE_KEY: '',
    SUPABASE_SECRET_KEY: '',
  };
  const mark = (name: string) => checks.push({ name, passed: true });
  async function node(tenantId = tenant, overrides: Record<string, string> = {}) {
    if (httpMode && tenantId === tenant && Object.keys(overrides).length === 0) {
      const port = 3111 + (applicationRequest++ % 2);
      const response = await fetch(`http://127.0.0.1:${port}/api/v1/me`, {
        headers: { cookie: cookieJars.get(port)!, 'X-Tenant-Id': other },
      });
      if (response.status === 200)
        assert.equal(
          ((await response.json()) as { data: { tenant: { id: string } } }).data.tenant.id,
          tenant,
        );
      return { status: response.status, retry: response.headers.get('retry-after') ?? undefined };
    }
    const result = await execute(
      process.execPath,
      [
        '--conditions=react-server',
        '--import',
        'tsx',
        'scripts/verification-service-budgets.ts',
        'node-worker',
        tenantId,
      ],
      { env: { ...budgetEnv, ...overrides } },
    );
    const line = result.stdout.trim().split('\n').at(-1)!;
    return JSON.parse(line) as { status: number; retry?: string };
  }
  async function startApplication(port: number, email: string, password: string) {
    const worker = spawn(
      process.execPath,
      [
        'node_modules/next/dist/bin/next',
        'start',
        '--hostname',
        '127.0.0.1',
        '--port',
        String(port),
      ],
      {
        env: {
          ...budgetEnv,
          DATABASE_URL_ADMIN: process.env.DATABASE_URL_ADMIN!,
          NEXT_DIST_DIR: '.next-live-verify',
          NEXT_PUBLIC_APP_URL: `http://127.0.0.1:${port}`,
          ALLOW_DEMO_ACCESS: '',
          CRON_SECRET: token,
        },
        stdio: ['ignore', 'ignore', 'pipe'],
        windowsHide: true,
      },
    );
    workers.push(worker);
    worker.stderr?.resume();
    for (let attempt = 0; attempt < 120; attempt++) {
      if (worker.exitCode !== null) throw new Error('Application worker exited');
      if ((await fetch(`http://127.0.0.1:${port}/sign-in`).catch(() => null))?.ok) break;
      await new Promise((done) => setTimeout(done, 250));
    }
    const response = await fetch(`http://127.0.0.1:${port}/api/v1/auth/sign-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email, password }),
      redirect: 'manual',
    });
    assert.equal(response.status, 200, 'Actual provider-backed application sign-in must succeed');
    const body = (await response.json()) as { data: { tenant: { id: string } } };
    assert.equal(body.data.tenant.id, tenant);
    const cookies = response.headers
      .getSetCookie()
      .map((cookie) => cookie.split(';')[0]!)
      .join('; ');
    assert(cookies.includes('session='), 'Sign-in must issue the application session cookie');
    assert(cookies.includes('sb-'), 'Sign-in must issue provider cookies');
    cookieJars.set(port, cookies);
  }
  async function startWorker(port: number, overrides: Record<string, string> = {}) {
    const python = resolve(
      serviceRoot,
      process.platform === 'win32' ? '.venv/Scripts/python.exe' : '.venv/bin/python',
    );
    const worker = spawn(
      python,
      [
        '-m',
        'uvicorn',
        'alcassa_service.main:app',
        '--host',
        '127.0.0.1',
        '--port',
        String(port),
        '--no-access-log',
      ],
      {
        cwd: serviceRoot,
        env: { ...budgetEnv, ...overrides },
        stdio: ['ignore', 'ignore', 'pipe'],
        windowsHide: true,
      },
    );
    workers.push(worker);
    // Consume diagnostics without leaking transport URLs or test credentials.
    worker.stderr?.resume();
    for (let attempt = 0; attempt < 60; attempt++) {
      if (worker.exitCode !== null) throw new Error('Service worker exited');
      const response = await fetch(`http://127.0.0.1:${port}/service/v1/ready`).catch(() => null);
      if (response?.ok) return worker;
      await new Promise((done) => setTimeout(done, 250));
    }
    throw new Error('Service worker readiness timed out');
  }
  let created = false;
  try {
    await adminQuery`insert into tenants (id,slug,name,status) values (${tenant},${`budget-${tenant}`},'Budget fixture','active'),(${other},${`budget-${other}`},'Independent budget fixture','active')`;
    created = true;
    await adminQuery`insert into plans (id,code,name) values (${plan},${`budget-${plan}`},'Budget verification')`;
    await adminQuery`insert into plan_entitlements (plan_id,key,kind,limit_value,display_name) values (${plan},'api_keys','limit',4,'Credentials')`;
    for (const id of [tenant, other]) {
      await adminQuery`insert into subscriptions (tenant_id,plan_id,status,current_period_start,current_period_end) values (${id},${plan},'active',now(),now()+interval '30 days')`;
    }
    if (httpMode) {
      const { upsertAuthAccount } = await import('@/db/seed/authAccounts');
      const { default: postgres } = await import('postgres');
      const email = `budget-${userId}@example.invalid`;
      const password = `${randomBytes(24).toString('hex')}!aA9`;
      const seedConnection = postgres(process.env.DATABASE_URL_ADMIN!, { prepare: false, max: 1 });
      try {
        await upsertAuthAccount(seedConnection, {
          id: userId,
          email,
          password,
          fullName: 'Budget acceptance',
        });
      } finally {
        await seedConnection.end();
      }
      await adminQuery`insert into user_profiles(id,email,full_name) values(${userId},${email},'Budget acceptance')`;
      await adminQuery`insert into tenant_members(tenant_id,user_id,role,status)
        values(${tenant},${userId},'owner','active')`;
      await startApplication(3111, email, password);
      await startApplication(3112, email, password);
      assert.equal(
        (await fetch('http://127.0.0.1:3111/api/v1/me', { headers: { 'X-Tenant-Id': tenant } }))
          .status,
        401,
      );
      assert.equal(
        await redis('GET', contract.prefix + tenant),
        null,
        'An unauthenticated request cannot consume or select a tenant budget',
      );
    }
    const owner = { ...context(tenant), actorId: SEED_USER_A };
    const first = await createCredential(owner, {
      name: 'Budget first',
      scopes: ['tenant:read'],
      requestKey: randomUUID(),
    });
    const second = await createCredential(owner, {
      name: 'Budget second',
      scopes: ['tenant:read'],
      requestKey: randomUUID(),
    });
    const independent = await createCredential(
      { ...owner, tenantId: other },
      { name: 'Independent budget', scopes: ['tenant:read'], requestKey: randomUUID() },
    );
    assert(first.secret && second.secret && independent.secret);
    const read = (
      port: number,
      key = first.secret!,
      path = 'tenant',
      extra: Record<string, string> = {},
    ) =>
      fetch(`http://127.0.0.1:${port}/service/v1/${path}`, {
        headers: { Authorization: `Bearer ${key}`, ...extra },
      });
    const a = await startWorker(8101);
    await startWorker(8102);
    const results = await Promise.all([
      ...Array.from({ length: 5 }, () => node()),
      ...Array.from({ length: 5 }, async (_, index) => {
        const response = await read(
          index % 2 ? 8101 : 8102,
          index % 2 ? first.secret! : second.secret!,
          'tenant',
          { 'X-Tenant-Id': other },
        );
        if (response.status === 200)
          assert.equal(((await response.json()) as { data: { id: string } }).data.id, tenant);
        return { status: response.status, retry: response.headers.get('retry-after') };
      }),
    ]);
    assert.equal(results.filter((item) => item.status === 200).length, 6);
    assert.equal(results.filter((item) => item.status === 429).length, 4);
    assert(
      results
        .filter((item) => item.status === 429)
        .every((item) => Number(item.retry) >= 1 && Number(item.retry) <= 120),
    );
    assert.equal(await redis('GET', contract.prefix + tenant), '6');
    assert(Number(await redis('PTTL', contract.prefix + tenant)) > 0);
    checks.push({
      name: httpMode
        ? 'Two signed-in application workers and two service workers share one atomic tenant window'
        : 'Two runtimes, two Python workers and two credentials share one atomic tenant window',
      passed: true,
      admitted: 6,
      refused: 4,
    });
    assert.equal((await read(8102, independent.secret)).status, 200);
    mark('Unrelated tenant receives an independent budget; caller tenant header is ignored');
    assert.equal((await node(tenant, { SERVICE_RATE_LIMIT: '5' })).status, 429);
    assert.equal(
      (await node(tenant, { SERVICE_RATE_LIMIT: '7', SERVICE_RATE_WINDOW_SECONDS: '600' })).status,
      200,
    );
    assert(Number(await redis('PTTL', contract.prefix + tenant)) < 120_000);
    assert.equal((await node(tenant, { SERVICE_RATE_LIMIT: '7' })).status, 429);
    mark('Configuration changes retain count and the existing window');
    a.kill();
    await new Promise<void>((done) => a.once('exit', () => done()));
    await startWorker(8103);
    assert.equal((await read(8103)).status, 429);
    mark('A fresh service process cannot reset the tenant budget');
    const [before] = await adminQuery<
      { last_used_at: Date | null }[]
    >`select last_used_at from api_credentials where id=${first.credential.id}`;
    assert.equal((await read(8102)).status, 429);
    const [after] = await adminQuery<
      { last_used_at: Date | null }[]
    >`select last_used_at from api_credentials where id=${first.credential.id}`;
    assert.equal(before?.last_used_at?.getTime(), after?.last_used_at?.getTime());
    assert.equal((await read(8102, first.secret, 'ai-rules')).status, 403);
    mark('Rate and scope refusals preserve durable last-use');
    await redis('DEL', contract.prefix + tenant);
    const originalEnvironment = { ...process.env };
    try {
      Object.assign(process.env, budgetEnv, {
        SERVICE_RATE_LIMIT: '1',
        SERVICE_RATE_WINDOW_SECONDS: '2',
      });
      await enforceTenantBudget(context(tenant));
      await assert.rejects(
        enforceTenantBudget(context(tenant)),
        (error: unknown) => jsonError(error, 'expiry-check').status === 429,
      );
      const ttl = Number(await redis('PTTL', contract.prefix + tenant));
      assert(ttl > 0 && ttl <= 2_000);
      await new Promise((done) => setTimeout(done, ttl + 50));
      await enforceTenantBudget(context(tenant));
    } finally {
      for (const name of Object.keys(process.env))
        if (!(name in originalEnvironment)) delete process.env[name];
      Object.assign(process.env, originalEnvironment);
    }
    mark('Server expiry resets the anchored window without refused requests extending it');
    const increments = await Promise.all(
      Array.from({ length: 5 }, async () => {
        const response = await execute(
          process.execPath,
          [
            '--conditions=react-server',
            '--import',
            'tsx',
            'scripts/verification-service-budgets.ts',
            'public-counter',
            publicKey,
          ],
          { env: budgetEnv },
        );
        return (JSON.parse(response.stdout.trim().split('\n').at(-1)!) as { count: number }).count;
      }),
    );
    assert.deepEqual(
      increments.sort((a, b) => a - b),
      [1, 2, 3, 4, 5],
    );
    assert(Number(await redis('PTTL', publicKey)) > 0);
    await redis('PERSIST', publicKey);
    const repair = await execute(
      process.execPath,
      [
        '--conditions=react-server',
        '--import',
        'tsx',
        'scripts/verification-service-budgets.ts',
        'public-counter',
        publicKey,
      ],
      { env: budgetEnv },
    );
    assert.equal(
      (JSON.parse(repair.stdout.trim().split('\n').at(-1)!) as { count: number }).count,
      6,
    );
    assert(Number(await redis('PTTL', publicKey)) > 0);
    mark(
      'Public limiter increments and expiry are atomic; legacy missing TTL is repaired without resetting count',
    );
    available = false;
    assert.equal((await node()).status, 200);
    assert.equal((await read(8102)).status, 200);
    assert.equal((await read(8102, first.secret, 'ai-rules')).status, 403);
    await adminQuery`update tenants set status='suspended' where id=${tenant}`;
    assert.equal((await read(8102)).status, 403);
    assert.equal((await node(tenant, { CACHE_DISABLED: 'true' })).status, 200);
    await startWorker(8104, { CACHE_DISABLED: 'true' });
    assert.equal((await read(8104)).status, 403);
    await adminQuery`update tenants set status='active' where id=${tenant}`;
    assert.equal((await read(8104)).status, 200);
    await adminQuery`update api_credentials set status='revoked',revoked_at=now() where id=${first.credential.id}`;
    assert.equal((await read(8102)).status, 401);
    assert.equal((await read(8104)).status, 401);
    mark(
      'Redis outage and cache-disabled mode preserve stored scope, suspension and revocation checks',
    );
  } finally {
    for (const worker of workers) if (worker.exitCode === null) worker.kill();
    adapter.closeAllConnections();
    await new Promise<void>((done) => adapter.close(() => done()));
    await redis('DEL', contract.prefix + tenant, contract.prefix + other, publicKey);
    if (created) {
      if (httpMode) {
        await cleanup`delete from sessions where user_id=${userId}`;
        await cleanup`delete from tenant_members where user_id=${userId}`;
        await cleanup`delete from user_profiles where id=${userId}`;
        await cleanup`delete from auth.users where id=${userId}`;
      }
      for (const id of [tenant, other]) {
        await cleanup`delete from audit_log where tenant_id=${id}`;
        await cleanup`delete from api_credentials where tenant_id=${id}`;
        await cleanup`delete from usage_counters where tenant_id=${id}`;
        await cleanup`delete from subscriptions where tenant_id=${id}`;
        await cleanup`delete from tenants where id=${id}`;
      }
      await cleanup`delete from plan_entitlements where plan_id=${plan}`;
      await cleanup`delete from plans where id=${plan}`;
    }
    await closeHarness();
  }
  await mkdir('.test-report/phase-one', { recursive: true });
  await writeFile(
    `.test-report/phase-one/${httpMode ? 'shared-budget-http' : 'shared-budget'}.json`,
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        passed: true,
        localOnly: true,
        fixtureCleanup: true,
        image: image.Image,
        checks,
        scope: httpMode
          ? 'Actual provider-backed sign-in and session HTTP across two production Next workers, plus authenticated FastAPI HTTP across two workers sharing real Redis.'
          : 'Production Node admission module in independent processes and actual authenticated FastAPI HTTP; real Redis through a local REST transport adapter.',
        limits: httpMode
          ? 'Local loopback topology; hosted latency and load qualification remain separate. Request admission is not billable usage.'
          : 'Native Node session-to-HTTP contention, hosted topology, load qualification and billable request rollup remain separate.',
      },
      null,
      2,
    ) + '\n',
  );
  console.log(`Shared Redis budget verification passed: ${checks.length} scenarios.`);
}
void main().catch((error: unknown) => {
  console.error('Budget verification failed:', error instanceof Error ? error.message : 'unknown');
  process.exitCode = 1;
});
