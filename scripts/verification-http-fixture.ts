import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { spawn, type ChildProcess } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import postgres from 'postgres';
import { upsertAuthAccount } from '../src/db/seed/authAccounts';
import { assertDisposableDatabase } from '../tests/isolation/disposable';

/** Own every identity and workspace used by operational HTTP checks. */
export async function httpFixtures(count: number) {
  assertDisposableDatabase();
  const admin = postgres(process.env.DATABASE_URL_ADMIN!, { prepare: false, max: 2 });
  const fixtures: { userId: string; tenantId: string; email: string; password: string }[] = [];
  const planId = randomUUID();
  async function cleanup() {
    for (const fixture of fixtures) {
      for (const table of [
        'audit_log',
        'api_credentials',
        'usage_counters',
        'subscriptions',
        'tenant_settings',
        'tenant_members',
      ])
        await admin`delete from ${admin(table)} where tenant_id=${fixture.tenantId}`;
      await admin`delete from sessions where user_id=${fixture.userId}`;
      await admin`delete from tenants where id=${fixture.tenantId}`;
      await admin`delete from user_profiles where id=${fixture.userId}`;
      await admin`delete from auth.users where id=${fixture.userId}`;
    }
    await admin`delete from plan_entitlements where plan_id=${planId}`;
    await admin`delete from plans where id=${planId}`;
    await admin.end();
  }
  try {
    await admin`insert into plans(id,code,name) values(${planId},${`operations-${planId}`},'Operational acceptance')`;
    await admin`insert into plan_entitlements(plan_id,key,kind,limit_value,display_name) values
      (${planId},'api_keys','limit',4,'Credentials'),(${planId},'ai_rules_versions','limit',4,'Rule versions')`;
    for (let index = 0; index < count; index++) {
      const userId = randomUUID(),
        tenantId = randomUUID();
      const fixture = {
        userId,
        tenantId,
        email: `operations-${userId}@example.invalid`,
        password: `${randomBytes(24).toString('hex')}!aA9`,
      };
      fixtures.push(fixture);
      await upsertAuthAccount(admin, {
        id: userId,
        email: fixture.email,
        password: fixture.password,
        fullName: 'Operational verifier',
      });
      await admin`insert into user_profiles(id,email,full_name) values(${userId},${fixture.email},'Operational verifier')`;
      await admin`insert into tenants(id,slug,name,status) values(${tenantId},${`operations-${tenantId}`},'Operational acceptance','active')`;
      await admin`insert into tenant_members(tenant_id,user_id,role,status) values(${tenantId},${userId},'owner','active')`;
      await admin`insert into tenant_settings(tenant_id,display_name) values(${tenantId},'Operational acceptance')`;
      await admin`insert into subscriptions(tenant_id,plan_id,status,current_period_start,current_period_end)
        values(${tenantId},${planId},'active',now(),now()+interval '30 days')`;
      await admin`insert into usage_counters(tenant_id,key,current_value,peak_value) values(${tenantId},'seats',1,1)`;
    }
    return { fixtures, admin, cleanup };
  } catch (error) {
    await cleanup();
    throw error;
  }
}

export async function applicationWorker(
  port: number,
  environment: Record<string, string> = {},
  mode: 'start' | 'dev' = 'start',
): Promise<ChildProcess> {
  const worker = spawn(
    process.execPath,
    ['node_modules/next/dist/bin/next', mode, '--hostname', '127.0.0.1', '--port', String(port)],
    {
      env: {
        ...process.env,
        NEXT_DIST_DIR: mode === 'dev' ? '.next-local-verify' : '.next-live-verify',
        NEXT_PUBLIC_APP_URL: `http://127.0.0.1:${port}`,
        ALLOW_DEMO_ACCESS: '',
        ...environment,
      },
      windowsHide: true,
      stdio: ['ignore', environment.VERIFICATION_WORKER_LOG ? 'pipe' : 'ignore', 'pipe'],
    },
  );
  if (environment.VERIFICATION_WORKER_LOG) {
    const log = createWriteStream(environment.VERIFICATION_WORKER_LOG, { flags: 'w' });
    worker.stdout?.pipe(log, { end: false });
    worker.stderr?.pipe(log, { end: false });
    worker.once('exit', () => log.end());
  }
  worker.stderr?.resume();
  for (let index = 0; index < 240; index++) {
    if (worker.exitCode !== null) throw new Error('Application worker exited before readiness.');
    if ((await fetch(`http://127.0.0.1:${port}/sign-in`).catch(() => null))?.ok) return worker;
    await new Promise((done) => setTimeout(done, 250));
  }
  worker.kill();
  throw new Error('Application worker readiness timed out.');
}

export async function signIn(
  port: number,
  fixture: { email: string; password: string; tenantId: string },
) {
  const response = await fetch(`http://127.0.0.1:${port}/api/v1/auth/sign-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email: fixture.email, password: fixture.password }),
    redirect: 'manual',
  });
  assert.equal(response.status, 200, 'Operational check requires actual provider-backed sign-in.');
  const body = (await response.json()) as { data: { tenant: { id: string } } };
  assert.equal(body.data.tenant.id, fixture.tenantId);
  return response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(';')[0]!)
    .join('; ');
}
