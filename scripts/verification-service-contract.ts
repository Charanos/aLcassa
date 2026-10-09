/** Cross-runtime credential acceptance; refuses every non-disposable database and service URL. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { writeFile, mkdir } from 'node:fs/promises';
import { adminQuery, cleanup, closeHarness } from '../tests/isolation/harness';
import { assertDisposableDatabase } from '../tests/isolation/disposable';
import { SEED_PLATFORM_ADMIN, SEED_USER_A } from '@/db/seed/constants';
import { createResolvedContext } from '@/lib/db/context';
import { createCredential, revokeCredential } from '@/modules/credentials';

async function main() {
  assertDisposableDatabase();
  const service = process.env.VERIFICATION_SERVICE_URL ?? 'http://127.0.0.1:8100';
  assert.equal(service, 'http://127.0.0.1:8100');
  const tenant = randomUUID();
  const plan = randomUUID();
  const masterVersion = randomUUID();
  let originalMaster:
    { id: string; current_version_id: string | null; updated_at: Date } | undefined;
  const samples: { case: string; status: number; elapsedMs: number }[] = [];
  let created = false;
  const ctx = createResolvedContext({
    tenantId: tenant,
    actorId: SEED_USER_A,
    actorLabel: 'Service verification',
    actorType: 'user',
    role: 'owner',
    supportMode: false,
    requestId: randomUUID(),
  });
  async function read(
    path: string,
    key: string,
    expected: number,
    extra: Record<string, string> = {},
  ) {
    const started = performance.now();
    const response = await fetch(`${service}${path}`, {
      headers: { Authorization: `Bearer ${key}`, ...extra },
    });
    samples.push({
      case: path,
      status: response.status,
      elapsedMs: Math.round(performance.now() - started),
    });
    assert.equal(response.status, expected);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    return response;
  }
  try {
    [originalMaster] = await adminQuery<
      { id: string; current_version_id: string | null; updated_at: Date }[]
    >`select id,current_version_id,updated_at from master_ai_rules`;
    assert(originalMaster, 'Provision the disposable platform fixture first.');
    await adminQuery`insert into master_ai_rule_versions (id,version_number,status,content,locked_fields,authored_by,published_at) select ${masterVersion},coalesce(max(version_number),0)+1,'published','{"tone":"Cross-runtime published fixture"}'::jsonb,'["tone"]'::jsonb,${SEED_PLATFORM_ADMIN},now() from master_ai_rule_versions`;
    await adminQuery`update master_ai_rules set current_version_id=${masterVersion} where id=${originalMaster.id}`;
    await adminQuery`insert into tenants (id,slug,name,status) values (${tenant}, ${`service-contract-${tenant}`}, 'Node credential service verification', 'active')`;
    created = true;
    await adminQuery`insert into plans (id,code,name) values (${plan},${`service-contract-${plan}`},'Service verification')`;
    await adminQuery`insert into plan_entitlements (plan_id,key,kind,limit_value,display_name) values (${plan},'api_keys','limit',2,'Credentials')`;
    await adminQuery`insert into subscriptions (tenant_id,plan_id,status,current_period_start,current_period_end) values (${tenant},${plan},'active',now(),now()+interval '30 days')`;
    const minted = await createCredential(ctx, {
      name: 'Cross-runtime verification',
      scopes: ['ai_rules:read', 'tenant:read'],
      requestKey: randomUUID(),
    });
    assert(minted.secret);
    const tenantResponse = await read('/service/v1/tenant', minted.secret, 200);
    const body = (await tenantResponse.json()) as { data: { id: string; name: string } };
    assert.equal(body.data.id, tenant);
    assert.equal(body.data.name, 'Node credential service verification');
    async function lastUse(id: string) {
      const [row] = await adminQuery<{ last_used_at: Date | null }[]>`
        select last_used_at from api_credentials where id=${id}`;
      assert(row);
      return row.last_used_at?.getTime() ?? null;
    }
    const firstUse = await lastUse(minted.credential.id);
    assert(firstUse !== null, 'Successful service read must persist last-use.');
    const rules = await read('/service/v1/ai-rules', minted.secret, 200);
    const etag = rules.headers.get('etag');
    assert(etag);
    const conditional = await read('/service/v1/ai-rules', minted.secret, 304, {
      'If-None-Match': etag,
    });
    assert.equal(await conditional.text(), '');
    const conditionalUse = await lastUse(minted.credential.id);
    assert(conditionalUse !== null && conditionalUse > firstUse);
    const limited = await createCredential(ctx, {
      name: 'Scope refusal',
      scopes: ['tenant:read'],
      requestKey: randomUUID(),
    });
    assert(limited.secret);
    await read('/service/v1/ai-rules', limited.secret, 403);
    assert.equal(await lastUse(limited.credential.id), null);
    await revokeCredential(ctx, minted.credential.id);
    await read('/service/v1/ai-rules', minted.secret, 401, { 'If-None-Match': etag });
    assert.equal(await lastUse(minted.credential.id), conditionalUse);
    await mkdir('.test-report/phase-one', { recursive: true });
    await writeFile(
      '.test-report/phase-one/service-cross-runtime.json',
      JSON.stringify(
        {
          checkedAt: new Date().toISOString(),
          passed: true,
          localOnly: true,
          samples,
          claims: [
            'Node-minted Argon2id accepted by FastAPI',
            'Tenant resolved from stored credential',
            'Scope refused before rules handler',
            'Empty conditional response',
            'Revocation checked before 304',
            'Successful and conditional reads persist last-use',
            'Scope and revocation refusals preserve last-use',
          ],
          releaseQualified: false,
        },
        null,
        2,
      ),
    );
    console.log(`Cross-runtime service contract passed: ${samples.length} checks.`);
  } finally {
    if (originalMaster) {
      await cleanup`update master_ai_rules set current_version_id=${originalMaster.current_version_id},updated_at=${originalMaster.updated_at} where id=${originalMaster.id} and current_version_id=${masterVersion}`;
      await cleanup`delete from master_ai_rule_versions where id=${masterVersion}`;
    }
    if (created) {
      await cleanup`delete from audit_log where tenant_id=${tenant}`;
      await cleanup`delete from api_credentials where tenant_id=${tenant}`;
      await cleanup`delete from usage_counters where tenant_id=${tenant}`;
      await cleanup`delete from subscriptions where tenant_id=${tenant}`;
      await cleanup`delete from tenants where id=${tenant}`;
      await cleanup`delete from plan_entitlements where plan_id=${plan}`;
      await cleanup`delete from plans where id=${plan}`;
    }
    await closeHarness();
  }
}

void main().then(
  () => {
    process.exitCode = 0;
  },
  (error: unknown) => {
    console.error(
      'Cross-runtime verification failed:',
      error instanceof Error ? error.name : 'unknown',
    );
    process.exitCode = 1;
  },
);
