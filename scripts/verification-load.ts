/** Production-build HTTP timings for 50 real sessions; no hosted or browser-navigation claim. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { ChildProcess } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { httpFixtures, applicationWorker, signIn } from './verification-http-fixture';

async function main() {
  const owned = await httpFixtures(5);
  let worker: ChildProcess | undefined;
  let master: { id: string; current_version_id: string | null; updated_at: Date } | undefined;
  const masterVersion = randomUUID();
  let temporaryMaster = false;
  const routes = [
    '/app',
    '/app/settings/company',
    '/app/settings/ai-rules',
    '/api/v1/me',
    '/api/v1/ai-rules',
  ];
  const sessions: string[] = [];
  const measurements = new Map(
    routes.map((route) => [route, { times: [] as number[], errors: 0, refused: 0 }]),
  );
  let peakConnections = 0;
  let sampling = false;
  const timer = setInterval(() => {
    if (sampling) return;
    sampling = true;
    void owned.admin<
      { n: number }[]
    >`select count(*)::int as n from pg_stat_activity where datname=current_database()`
      .then(([row]) => {
        peakConnections = Math.max(peakConnections, row?.n ?? 0);
      })
      .catch(() => undefined)
      .finally(() => {
        sampling = false;
      });
  }, 500);
  let result: unknown;
  let accepted = false;
  try {
    [master] = await owned.admin<
      (typeof master)[]
    >`select id,current_version_id,updated_at from master_ai_rules`;
    assert(master);
    if (!master.current_version_id) {
      await owned.admin.begin(async (tx) => {
        await tx`select pg_advisory_xact_lock(hashtextextended('master-rules',0))`;
        await tx`insert into master_ai_rule_versions(id,version_number,status,content,locked_fields,authored_by,published_at)
          select ${masterVersion},coalesce(max(version_number),0)+1,'published',
            '{"tone":"Operational acceptance","responseGuidelines":"Use the workspace instructions."}'::jsonb,
            '[]'::jsonb,${owned.fixtures[0]!.userId},now() from master_ai_rule_versions`;
        await tx`update master_ai_rules set current_version_id=${masterVersion},updated_at=now()
          where id=${master!.id} and current_version_id is null`;
      });
      temporaryMaster = true;
    }
    worker = await applicationWorker(3121, { CACHE_DISABLED: 'true' });
    for (let index = 0; index < 50; index++)
      sessions.push(await signIn(3121, owned.fixtures[index % 5]!));
    const [count] = await owned.admin<{ n: number }[]>`select count(*)::int as n from sessions
      where user_id=any(${owned.fixtures.map((f) => f.userId)}::uuid[]) and kind='tenant' and revoked_at is null`;
    assert.equal(count?.n, 50);
    async function read(index: number, route: string, record: boolean) {
      const start = performance.now();
      const response = await fetch(`http://127.0.0.1:3121${route}`, {
        headers: { cookie: sessions[index]! },
        redirect: 'manual',
        signal: AbortSignal.timeout(30_000),
      });
      const body = await response.text();
      if (record) {
        const sample = measurements.get(route)!;
        sample.times.push(performance.now() - start);
        if (response.status === 429) sample.refused++;
        else if (response.status !== 200 || body.includes('This screen did not load.'))
          sample.errors++;
      } else assert.equal(response.status, 200, `Warm-up ${route} must succeed`);
    }
    for (const route of routes) await read(0, route, false);
    const steadyStart = performance.now();
    await Promise.all(
      sessions.map(async (_, index) => {
        let request = 0;
        while (performance.now() - steadyStart < 60_000) {
          await read(index, routes[(index + request++) % routes.length]!, true);
          await new Promise((done) => setTimeout(done, 100));
        }
      }),
    );
    const duration = performance.now() - steadyStart;
    const summaries = [...measurements].map(([route, sample]) => {
      sample.times.sort((a, b) => a - b);
      const quantile = (p: number) =>
        Math.round(sample.times[Math.max(0, Math.ceil(sample.times.length * p) - 1)] ?? 0);
      return {
        route,
        requests: sample.times.length,
        p50Ms: quantile(0.5),
        p95Ms: quantile(0.95),
        p99Ms: quantile(0.99),
        requestsPerSecond: Number((sample.times.length / (duration / 1000)).toFixed(2)),
        errors: sample.errors,
        refused: sample.refused,
        targetMs: route.startsWith('/app') ? 400 : null,
      };
    });
    const { inspectUsage } = await import('../src/lib/usage/reconciliation');
    for (const fixture of owned.fixtures)
      assert.equal((await inspectUsage(owned.admin, fixture.tenantId)).drift.length, 0);
    result = {
      checkedAt: new Date().toISOString(),
      localOnly: true,
      productionBuild: true,
      sessions: 50,
      workspaces: 5,
      durationMs: Math.round(duration),
      cache: 'disabled',
      peakDatabaseConnections: peakConnections,
      routes: summaries,
      integrityPassed: true,
      fixtureCleanup: true,
      passed: summaries.every(
        (route) =>
          route.errors === 0 &&
          route.refused === 0 &&
          (route.targetMs === null || route.p95Ms < route.targetMs),
      ),
      boundary:
        'Local Windows/Docker loopback server-request timings, including response body. Five routes rotate across 50 concurrent sessions, with 100ms think time for 60 seconds after one warm-up per route. Cold/warm cache phases, loaded propagation, server query fan-out and memory targets remain additional qualification.',
    };
    accepted = (result as { passed: boolean }).passed;
  } finally {
    clearInterval(timer);
    if (worker && worker.exitCode === null) {
      worker.kill();
      await new Promise<void>((done) => worker!.once('exit', () => done()));
    }
    if (temporaryMaster && master) {
      await owned.admin`update master_ai_rules set current_version_id=${master.current_version_id},updated_at=${master.updated_at}
        where id=${master.id} and current_version_id=${masterVersion}`;
      await owned.admin`delete from master_ai_rule_versions where id=${masterVersion}`;
    }
    await owned.cleanup();
  }
  await mkdir('.test-report/phase-one', { recursive: true });
  await writeFile(
    '.test-report/phase-one/load-50-sessions.json',
    JSON.stringify(result, null, 2) + '\n',
  );
  console.log(
    '50-session production-build load run completed; per-route target outcomes retained.',
  );
  if (!accepted) process.exitCode = 1;
}
main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Load verification failed.');
  process.exitCode = 1;
});
