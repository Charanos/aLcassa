/** Separate provider, database and application timings without relaxing authentication. */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import type { ChildProcess } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import postgres from 'postgres';
import { applicationWorker, httpFixtures, signIn } from './verification-http-fixture';

async function main() {
  const owned = await httpFixtures(1);
  const database = postgres(process.env.DATABASE_URL!, { prepare: false, max: 10 });
  let worker: ChildProcess | undefined;
  const rows: { surface: string; concurrency: number; p50Ms: number; p95Ms: number }[] = [];
  async function measure(surface: string, concurrency: number, run: () => Promise<unknown>) {
    const timings = await Promise.all(
      Array.from({ length: concurrency }, async () => {
        const start = performance.now();
        await run();
        return performance.now() - start;
      }),
    );
    timings.sort((a, b) => a - b);
    rows.push({
      surface,
      concurrency,
      p50Ms: Math.round(timings[Math.ceil(timings.length * 0.5) - 1]!),
      p95Ms: Math.round(timings[Math.ceil(timings.length * 0.95) - 1]!),
    });
  }
  try {
    await mkdir('.test-report/phase-one', { recursive: true });
    const fixture = owned.fixtures[0]!;
    const auth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const identity = await auth.auth.signInWithPassword({
      email: fixture.email,
      password: fixture.password,
    });
    assert(identity.data.session);
    for (const concurrency of [1, 20, 50]) {
      await measure('provider-user', concurrency, async () => {
        const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`, {
          headers: {
            apikey: (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
              process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
            Authorization: `Bearer ${identity.data.session!.access_token}`,
          },
        });
        assert.equal(response.status, 200);
        const result = (await response.json()) as { id: string };
        assert.equal(result.id, fixture.userId);
      });
      await measure('database-roundtrip', concurrency, async () => {
        const [result] = await database`select 1 as n`;
        assert.equal(result?.n, 1);
      });
    }
    worker = await applicationWorker(3125, {
      VERIFICATION_WORKER_LOG: '.test-report/phase-one/latency-worker-private.log',
    });
    const cookie = await signIn(3125, fixture);
    for (const concurrency of [1, 20, 50]) {
      await measure('application-me', concurrency, async () => {
        const response = await fetch('http://127.0.0.1:3125/api/v1/me', {
          headers: { cookie },
          signal: AbortSignal.timeout(60000),
        });
        assert.equal(response.status, 200);
        const body = (await response.json()) as { data: { tenant: { id: string } } };
        assert.equal(body.data.tenant.id, fixture.tenantId);
      });
    }
  } finally {
    if (worker && worker.exitCode === null) {
      worker.kill();
      await new Promise<void>((done) => worker!.once('exit', () => done()));
    }
    await database.end();
    await owned.cleanup();
  }
  const result = {
    checkedAt: new Date().toISOString(),
    localOnly: true,
    rows,
    fixtureCleanup: true,
    boundary:
      'Single batches for bottleneck diagnosis, not sustained-load acceptance. Private worker logs are not published.',
  };
  await writeFile(
    '.test-report/phase-one/latency-diagnostics.json',
    JSON.stringify(result, null, 2) + '\n',
  );
  process.stdout.write(JSON.stringify(result) + '\n');
}
void main().catch((error: unknown) => {
  process.stderr.write(String(error) + '\n');
  process.exitCode = 1;
});
