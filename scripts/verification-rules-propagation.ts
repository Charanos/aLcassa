/** Actual publication/restoration to effective HTTP reads; disposable fixtures only. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { adminQuery, cleanup, closeHarness } from '../tests/isolation/harness';
import { assertDisposableDatabase } from '../tests/isolation/disposable';
import { SEED_PLATFORM_ADMIN, SEED_USER_A } from '@/db/seed/constants';
import { createResolvedContext } from '@/lib/db/context';
import { createCredential } from '@/modules/credentials';
import {
  readTenantRules,
  publishTenantRules,
  restoreTenantRules,
  type RulesFields,
} from '@/modules/aiRules';
import { publishMasterRules, rollbackMasterRules } from '@/modules/platform';

async function main() {
  assertDisposableDatabase();
  assert.equal(process.env.VERIFICATION_SERVICE_URL, 'http://127.0.0.1:8100');
  const tenant = randomUUID(),
    plan = randomUUID();
  const versions: string[] = [],
    requests: string[] = [];
  const samples: {
    operation: string;
    operationStartToReadMs: number;
    publicationResolvedToReadMs: number;
    masterVersion: number;
    tenantVersion: number;
    status: number;
  }[] = [];
  let original: { id: string; current_version_id: string | null; updated_at: Date } | undefined;
  let arranged = false;
  const concurrentReaders = Number(process.env.VERIFICATION_RULES_READERS ?? '0');
  assert(Number.isInteger(concurrentReaders) && concurrentReaders >= 0 && concurrentReaders <= 50);
  let running = false;
  let readers: Promise<void>[] = [];
  const background: { status: number; elapsedMs: number }[] = [];
  const backgroundErrors: string[] = [];
  let restartMs: number | null = null;
  const receiptPath = `.test-report/phase-one/rules-propagation${concurrentReaders ? '-loaded' : ''}.json`;
  async function stopReaders() {
    running = false;
    await Promise.all(readers);
    readers = [];
  }
  async function startReaders(secret: string) {
    if (!concurrentReaders) return;
    running = true;
    const firstReads: Promise<void>[] = [];
    readers = Array.from({ length: concurrentReaders }, () => {
      let notify!: () => void;
      firstReads.push(
        new Promise<void>((done) => {
          notify = done;
        }),
      );
      return (async () => {
        let lastTag: string | null = null;
        try {
          while (running) {
            const start = performance.now();
            const response: Response = await fetch('http://127.0.0.1:8100/service/v1/ai-rules', {
              headers: {
                Authorization: `Bearer ${secret}`,
                ...(lastTag ? { 'If-None-Match': lastTag } : {}),
              },
              signal: AbortSignal.timeout(15000),
            });
            assert(
              [200, 304].includes(response.status),
              `Background service status ${response.status}`,
            );
            if (response.status === 304) assert.equal(await response.text(), '');
            else {
              const body = (await response.json()) as {
                data: { tenantId: string; masterVersion: number; tenantVersion: number };
              };
              assert.equal(body.data.tenantId, tenant);
              assert.equal(
                response.headers.get('x-rules-master-version'),
                String(body.data.masterVersion),
              );
              assert.equal(
                response.headers.get('x-rules-tenant-version'),
                String(body.data.tenantVersion),
              );
            }
            lastTag = response.headers.get('etag');
            assert(lastTag);
            background.push({
              status: response.status,
              elapsedMs: Math.round(performance.now() - start),
            });
            notify();
            await new Promise((done) => setTimeout(done, 25));
          }
        } catch (error) {
          backgroundErrors.push(error instanceof Error ? error.name : 'ReadFailure');
          running = false;
        } finally {
          notify();
        }
      })();
    });
    await Promise.all(firstReads);
    assert.equal(backgroundErrors.length, 0);
  }
  const ctx = () =>
    createResolvedContext({
      tenantId: tenant,
      role: 'owner',
      actorId: SEED_USER_A,
      actorType: 'user',
      actorLabel: 'Rules propagation verification',
      supportMode: false,
      requestId: randomUUID(),
    });
  const actor = () => {
    const requestId = randomUUID();
    requests.push(requestId);
    return { userId: SEED_PLATFORM_ADMIN, label: 'Rules propagation verification', requestId };
  };
  const fields = (information: string): RulesFields => ({
    tone: '',
    responseGuidelines: 'Workspace guidance',
    businessInformation: information,
    escalationInstructions: '',
    prohibitedTopics: '',
    customInstructions: '',
  });
  const platformFields = (tone: string) => ({
    ...fields(''),
    tone,
    responseGuidelines: 'Platform guidance',
  });
  let etag: string | null = null;
  try {
    [original] = await adminQuery<
      (typeof original)[]
    >`select id,current_version_id,updated_at from master_ai_rules`;
    assert(original, 'Prepare the disposable platform first.');
    const initial = await publishMasterRules(
      {
        fields: platformFields('Propagation baseline'),
        lockedFields: ['tone'],
        changeNote: 'Publish disposable propagation baseline',
      },
      actor(),
    );
    versions.push(initial.versionId);
    await adminQuery`insert into tenants (id,slug,name,status) values (${tenant},${`propagation-${tenant}`},'Propagation verification','active')`;
    arranged = true;
    await adminQuery`insert into plans (id,code,name) values (${plan},${`propagation-${plan}`},'Propagation verification')`;
    await adminQuery`insert into plan_entitlements (plan_id,key,kind,limit_value,display_name) values (${plan},'api_keys','limit',1,'Credentials'),(${plan},'ai_rules_versions','limit',2,'Instruction versions')`;
    await adminQuery`insert into subscriptions (tenant_id,plan_id,status,current_period_start,current_period_end) values (${tenant},${plan},'active',now(),now()+interval '30 days')`;
    const key = await createCredential(ctx(), {
      name: 'Rules propagation',
      scopes: ['ai_rules:read'],
      environment: 'test',
      requestKey: randomUUID(),
    });
    assert(key.secret);
    async function observed(
      operation: string,
      started: number,
      resolved: number,
      masterVersion: number,
      tenantVersion: number,
      information: string,
      tone: string,
    ) {
      const response = await fetch('http://127.0.0.1:8100/service/v1/ai-rules', {
        headers: {
          Authorization: `Bearer ${key.secret}`,
          ...(etag ? { 'If-None-Match': etag } : {}),
        },
      });
      assert.equal(response.status, 200, 'A changed immutable version must not return stale 304.');
      assert.equal(response.headers.get('cache-control'), 'no-store');
      const body = (await response.json()) as {
        data: {
          tenantId: string;
          masterVersion: number;
          tenantVersion: number;
          rules: { businessInformation: string; tone: string; responseGuidelines: string };
        };
      };
      assert.equal(body.data.tenantId, tenant);
      assert.equal(body.data.masterVersion, masterVersion);
      assert.equal(body.data.tenantVersion, tenantVersion);
      assert.equal(body.data.rules.businessInformation, information);
      assert.equal(body.data.rules.tone, tone);
      assert.equal(body.data.rules.responseGuidelines, 'Platform guidance\n\nWorkspace guidance');
      const ended = performance.now();
      const upperBound = ended - started;
      samples.push({
        operation,
        operationStartToReadMs: Math.round(upperBound),
        publicationResolvedToReadMs: Math.round(ended - resolved),
        masterVersion,
        tenantVersion,
        status: response.status,
      });
      assert.ok(upperBound < 5000, `Propagation exceeded five seconds for ${operation}.`);
      const next = response.headers.get('etag');
      assert(next && next !== etag);
      etag = next;
    }
    let baseline = await publishTenantRules(ctx(), {
      fields: fields('Baseline workspace information'),
      revision: (await readTenantRules(ctx())).revision,
      changeNote: 'Publish baseline workspace information',
    });
    let liveMaster = initial;
    await startReaders(key.secret);
    for (let i = 1; i <= 3; i++) {
      const before = await readTenantRules(ctx());
      let started = performance.now();
      const changed = await publishTenantRules(ctx(), {
        fields: fields(`Verified workspace information ${i}`),
        revision: before.revision,
        changeNote: `Publish workspace propagation sample ${i}`,
      });
      await observed(
        `tenant.publish.${i}`,
        started,
        performance.now(),
        liveMaster.versionNumber,
        changed.versionNumber,
        `Verified workspace information ${i}`,
        'Propagation baseline',
      );
      const changedState = await readTenantRules(ctx());
      started = performance.now();
      const restored = await restoreTenantRules(ctx(), {
        versionId: baseline.versionId,
        revision: changedState.revision,
        changeNote: `Restore workspace propagation sample ${i}`,
      });
      await observed(
        `tenant.restore.${i}`,
        started,
        performance.now(),
        liveMaster.versionNumber,
        restored.versionNumber,
        'Baseline workspace information',
        'Propagation baseline',
      );
      baseline = restored;
      started = performance.now();
      const published = await publishMasterRules(
        {
          fields: platformFields(`Verified platform tone ${i}`),
          lockedFields: ['tone'],
          changeNote: `Publish platform propagation sample ${i}`,
          expectedVersionNumber: liveMaster.versionNumber,
        },
        actor(),
      );
      versions.push(published.versionId);
      await observed(
        `master.publish.${i}`,
        started,
        performance.now(),
        published.versionNumber,
        baseline.versionNumber,
        'Baseline workspace information',
        `Verified platform tone ${i}`,
      );
      started = performance.now();
      const platformRestored = await rollbackMasterRules(
        {
          versionId: initial.versionId,
          expectedVersionNumber: published.versionNumber,
          reason: `Restore platform propagation sample ${i}`,
        },
        actor(),
      );
      await observed(
        `master.restore.${i}`,
        started,
        performance.now(),
        platformRestored.versionNumber,
        baseline.versionNumber,
        'Baseline workspace information',
        'Propagation baseline',
      );
      liveMaster = { versionId: initial.versionId, versionNumber: platformRestored.versionNumber };
      if (i === 1 && concurrentReaders && process.send) {
        await stopReaders();
        const restarting = performance.now();
        await new Promise<void>((done, reject) => {
          const timer = setTimeout(() => {
            process.off('message', receive);
            reject(new Error('Owned service restart exceeded five seconds'));
          }, 5000);
          function receive(message: unknown) {
            if (
              message &&
              typeof message === 'object' &&
              'type' in message &&
              message.type === 'service-restarted'
            ) {
              clearTimeout(timer);
              process.off('message', receive);
              done();
            }
          }
          process.on('message', receive);
          process.send!({ type: 'restart-service' });
        });
        restartMs = Math.round(performance.now() - restarting);
        const stable: Response = await fetch('http://127.0.0.1:8100/service/v1/ai-rules', {
          headers: { Authorization: `Bearer ${key.secret}`, 'If-None-Match': etag! },
        });
        assert.equal(stable.status, 304);
        assert.equal(stable.headers.get('etag'), etag);
        assert.equal(await stable.text(), '');
        await startReaders(key.secret);
      }
    }
    await stopReaders();
    assert.equal(backgroundErrors.length, 0);
    await mkdir('.test-report/phase-one', { recursive: true });
    await writeFile(
      receiptPath,
      JSON.stringify(
        {
          checkedAt: new Date().toISOString(),
          localOnly: true,
          passed: true,
          timing:
            'Upper bound from operation invocation through effective HTTP response; includes commit and request processing.',
          samples,
          maximumMs: Math.max(...samples.map((sample) => sample.operationStartToReadMs)),
          concurrentReaders,
          backgroundReads: background.length,
          conditionalReads: background.filter((row) => row.status === 304).length,
          backgroundErrors: backgroundErrors.length,
          restartMs,
          restartPreservedConditionalRead: restartMs !== null,
          releaseQualified: false,
        },
        null,
        2,
      ),
    );
    console.log(
      `Rules propagation passed: ${samples.length} actual publish/restore samples; maximum ${Math.max(...samples.map((sample) => sample.operationStartToReadMs))}ms.`,
    );
  } finally {
    await stopReaders();
    if (original)
      await cleanup`update master_ai_rules set current_version_id=${original.current_version_id},updated_at=${original.updated_at} where id=${original.id}`;
    if (requests.length)
      await cleanup`delete from platform_audit_log where request_id=any(${requests})`;
    if (versions.length)
      await cleanup`delete from master_ai_rule_versions where id=any(${versions})`;
    if (arranged) {
      await cleanup`delete from audit_log where tenant_id=${tenant}`;
      await cleanup`delete from tenant_ai_rules where tenant_id=${tenant}`;
      await cleanup`delete from tenant_ai_rule_versions where tenant_id=${tenant}`;
      await cleanup`delete from api_credentials where tenant_id=${tenant}`;
      await cleanup`delete from usage_counters where tenant_id=${tenant}`;
      await cleanup`delete from subscriptions where tenant_id=${tenant}`;
      await cleanup`delete from plan_entitlements where plan_id=${plan}`;
      await cleanup`delete from plans where id=${plan}`;
      await cleanup`delete from tenants where id=${tenant}`;
    }
    await closeHarness();
  }
  const saved = JSON.parse(await readFile(receiptPath, 'utf8')) as Record<string, unknown>;
  await writeFile(receiptPath, JSON.stringify({ ...saved, fixtureCleanup: true }, null, 2) + '\n');
}
void main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Rules propagation failed.');
    process.exitCode = 1;
  })
  .finally(() => {
    if (process.connected) {
      // Owned fork: all assertions, database cleanup and receipt writes have settled.
      process.disconnect();
    }
    if (process.env.VERIFICATION_RULES_FORK === 'true') process.exit(process.exitCode ?? 0);
  });
