/** A real Drizzle upgrade on a newly created disposable local database. */
import { randomUUID } from 'node:crypto';
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { inspectDeploymentSchema } from './deployment-schema';

async function main(): Promise<void> {
  const url = new URL(process.env.DATABASE_URL_ADMIN ?? '');
  assert.equal(url.hostname, '127.0.0.1');
  assert.equal(url.port, '55422');
  assert.equal(url.pathname, '/postgres');
  const runId = randomUUID().replaceAll('-', '');
  const database = `alcassa_upgrade_${runId}`;
  assert.match(database, /^alcassa_upgrade_[a-f0-9]{32}$/);
  const directory = join(process.cwd(), '.test-report', `upgrade-${runId}`);
  await mkdir(join(directory, 'meta'), { recursive: true });
  const source = join(process.cwd(), 'src/db/migrations');
  const journal = JSON.parse(await readFile(join(source, 'meta/_journal.json'), 'utf8')) as {
    entries: Array<{ idx: number; tag: string }>;
    [key: string]: unknown;
  };
  assert.equal(journal.entries.at(-1)?.tag, '0004_contracted_value');
  const admin = postgres(url.toString(), { max: 1, prepare: false });
  let upgraded: ReturnType<typeof postgres> | undefined;
  let created = false;
  try {
    await admin.unsafe(`create database "${database}"`);
    created = true;
    url.pathname = `/${database}`;
    upgraded = postgres(url.toString(), { max: 1, prepare: false });
    await upgraded`create extension if not exists vector`;
    for (const entry of journal.entries) {
      await copyFile(join(source, `${entry.tag}.sql`), join(directory, `${entry.tag}.sql`));
    }
    await writeFile(
      join(directory, 'meta/_journal.json'),
      JSON.stringify({ ...journal, entries: journal.entries.slice(0, -1) }),
    );
    await migrate(drizzle(upgraded), { migrationsFolder: directory });
    const stale = await inspectDeploymentSchema(upgraded, source);
    assert.ok(stale.problems.includes('Unapplied migration: 0004_contracted_value'));
    assert.ok(stale.problems.includes('Missing column: subscriptions.contract_amount'));
    const pro = randomUUID();
    const existing = randomUUID();
    const missing = randomUUID();
    const deleted = randomUUID();
    await upgraded`insert into plans (id, code, name) values (${pro}, 'pro', 'Pro')`;
    await upgraded`insert into tenants (id, slug, name, status, created_at, deleted_at) values
    (${existing}, 'existing', 'Existing contract', 'past_due', '2026-09-01T00:00:00Z', null),
    (${missing}, 'missing', 'Missing subscription', 'trial', '2026-10-01T00:00:00Z', null),
    (${deleted}, 'deleted', 'Deleted workspace', 'closed', '2026-09-01T00:00:00Z', now())`;
    await upgraded`insert into subscriptions (tenant_id, plan_id, status, current_period_start, current_period_end)
    values (${existing}, ${pro}, 'past_due', '2026-09-01T00:00:00Z', '2026-10-01T00:00:00Z')`;
    await writeFile(join(directory, 'meta/_journal.json'), JSON.stringify(journal));
    await migrate(drizzle(upgraded), { migrationsFolder: directory });
    const current = await inspectDeploymentSchema(upgraded, source);
    assert.deepEqual(current.problems, []);
    const rows = await upgraded<
      {
        tenant_id: string;
        status: string;
        start: string;
        due: string | null;
        trial: string | null;
        amount: string | null;
      }[]
    >`
    select tenant_id, status, current_period_start::text as start, past_due_since::text as due,
      trial_ends_at::text as trial, contract_amount::text as amount from subscriptions order by tenant_id`;
    assert.equal(rows.length, 2);
    const prior = rows.find((row) => row.tenant_id === existing)!;
    assert.equal(prior.status, 'past_due');
    assert.equal(prior.due, prior.start);
    assert.equal(prior.amount, null);
    const initialized = rows.find((row) => row.tenant_id === missing)!;
    assert.equal(initialized.status, 'trialing');
    assert.match(initialized.trial!, /^2026-10-15 /);
    await upgraded`update subscriptions set contract_amount = 0 where tenant_id = ${existing}`;
    await assert.rejects(
      upgraded`update subscriptions set contract_amount = -1 where tenant_id = ${existing}`,
    );
    await migrate(drizzle(upgraded), { migrationsFolder: directory });
    const [count] = await upgraded<
      { count: number }[]
    >`select count(*)::integer as count from subscriptions`;
    assert.equal(count?.count, 2);
    const result = {
      runId,
      passed: true,
      databaseVersion: (await upgraded<{ server_version: string }[]>`show server_version`)[0]
        ?.server_version,
      checks: [
        'Drizzle 0000–0003 install',
        'release check rejects missing migration and columns',
        'release check accepts upgraded schema',
        '0004 upgrade with existing data',
        'past-due backfill',
        'missing-subscription trial backfill',
        'deleted workspace excluded',
        'zero contract allowed',
        'negative contract refused',
        'migration replay creates no duplicates',
      ],
      timestamp: new Date().toISOString(),
    };
    await writeFile(join(directory, 'result.json'), JSON.stringify(result, null, 2));
    console.log(`Upgrade verification passed: ${join(directory, 'result.json')}`);
  } finally {
    await upgraded?.end();
    if (created) await admin.unsafe(`drop database "${database}"`);
    await admin.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Upgrade verification failed.');
  process.exitCode = 1;
});
