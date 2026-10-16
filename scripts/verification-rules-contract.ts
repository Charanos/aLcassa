/** Real session and machine responses against their merged generated schemas. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { spawn, type ChildProcess } from 'node:child_process';
import { resolve } from 'node:path';
import { parse } from 'dotenv';
import Ajv from 'ajv';
import { mergedRulesContract, type MergedRulesContract } from './m4a-contract';

async function main() {
  for (const key of [
    'AXIOM_TOKEN',
    'AXIOM_DATASET',
    'SENTRY_DSN',
    'NEXT_PUBLIC_SENTRY_DSN',
    'RESEND_API_KEY',
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN',
  ])
    process.env[key] = '';
  const localEnvironment = await readFile('.env.verification.local', 'utf8').catch(
    (error: unknown) => {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return '';
      throw error;
    },
  );
  Object.assign(process.env, parse(localEnvironment), {
    CACHE_DISABLED: 'true',
    VERIFICATION_DISPOSABLE: 'true',
    SESSION_COOKIE_TENANT: 'alcassa_verify_tenant',
    SESSION_COOKIE_PLATFORM: 'alcassa_verify_platform',
  });
  const { httpFixtures, applicationWorker, signIn } = await import('./verification-http-fixture');
  const owned = await httpFixtures(2),
    [owner, agent] = owned.fixtures;
  assert(owner && agent);
  const origin = 'http://127.0.0.1:3147',
    serviceOrigin = 'http://127.0.0.1:8147';
  let worker: ChildProcess | undefined, service: ChildProcess | undefined;
  let original: { id: string; current_version_id: string | null; updated_at: Date } | undefined;
  const master = randomUUID();
  const checks: { operation: string; status: number; schemaPassed: true }[] = [];
  let merged: MergedRulesContract | undefined;
  const root = '.test-report/phase-one';
  try {
    await mkdir(root, { recursive: true });
    await owned.admin`delete from tenant_members where tenant_id=${agent.tenantId} and user_id=${agent.userId}`;
    await owned.admin`insert into tenant_members(tenant_id,user_id,role,status) values(${owner.tenantId},${agent.userId},'agent','active')`;
    await owned.admin`update usage_counters set current_value=2,peak_value=2 where tenant_id=${owner.tenantId} and key='seats'`;
    [original] = await owned.admin<
      (typeof original)[]
    >`select id,current_version_id,updated_at from master_ai_rules`;
    assert(original);
    await owned.admin`insert into master_ai_rule_versions(id,version_number,status,content,locked_fields,authored_by,published_at) select ${master},coalesce(max(version_number),0)+1,'published','{"tone":"Shared assurance","responseGuidelines":"Answer clearly."}'::jsonb,'["tone"]'::jsonb,${owner.userId},now() from master_ai_rule_versions`;
    await owned.admin`update master_ai_rules set current_version_id=${master},updated_at=now() where id=${original.id}`;
    worker = await applicationWorker(3147);
    const serviceRoot = process.env.VERIFICATION_SERVICE_ROOT ?? '../aLcassa-service';
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
        '8147',
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
          SUPABASE_SECRET_KEY: '',
          SUPABASE_SERVICE_ROLE_KEY: '',
        },
      },
    );
    let ready = false;
    for (let n = 0; n < 120; n++) {
      if ((await fetch(`${serviceOrigin}/service/v1/ready`).catch(() => null))?.ok) {
        ready = true;
        break;
      }
      if (service.exitCode !== null) break;
      await new Promise((done) => setTimeout(done, 250));
    }
    assert(ready, 'Restricted service must become ready');
    merged = mergedRulesContract(
      (await (await fetch(`${serviceOrigin}/service/openapi.json`)).json()) as MergedRulesContract,
    );
    const ajv = new Ajv({ strict: false, allErrors: true });
    ajv.addFormat('uuid', /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i);
    ajv.addFormat(
      'date-time',
      (value) =>
        /^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(value) && Number.isFinite(Date.parse(value)),
    );
    ajv.addSchema(merged, 'urn:alcassa:m4a');
    const cookie = await signIn(3147, owner),
      agentCookie = await signIn(3147, { ...agent, tenantId: owner.tenantId });
    async function checked(
      path: string,
      status: number,
      init: RequestInit = {},
      contractPath = path,
    ) {
      const machine = path.startsWith('/service/');
      const response = await fetch((machine ? serviceOrigin : origin) + path, {
        ...init,
        redirect: 'manual',
      });
      assert.equal(response.status, status, `${init.method ?? 'GET'} ${contractPath}`);
      const requestId = response.headers.get('x-request-id');
      assert(requestId);
      if (machine || status === 200 || status === 201)
        assert.equal(response.headers.get('cache-control'), 'no-store');
      const operation = merged!.paths[contractPath]![init.method?.toLowerCase() ?? 'get']!;
      if (status === 304) {
        assert.equal(await response.text(), '');
      } else {
        const schema = operation.responses[String(status)]?.content?.['application/json']?.schema;
        assert(schema, 'Every observed response must have a documented schema');
        const validator = ajv.compile({
          ...merged!,
          $ref: `#/paths/${contractPath.replaceAll('~', '~0').replaceAll('/', '~1')}/${init.method?.toLowerCase() ?? 'get'}/responses/${status}/content/application~1json/schema`,
        });
        const body: unknown = await response.json();
        assert(validator(body), `${contractPath}: ${ajv.errorsText(validator.errors)}`);
        if (status >= 400)
          assert.equal((body as { error: { requestId: string } }).error.requestId, requestId);
        checks.push({
          operation: `${init.method ?? 'GET'} ${contractPath}`,
          status,
          schemaPassed: true,
        });
        return { body, response };
      }
      checks.push({
        operation: `${init.method ?? 'GET'} ${contractPath}`,
        status,
        schemaPassed: true,
      });
      return { body: null, response };
    }
    async function mint(scopes: string[]) {
      const response = await fetch(`${origin}/api/v1/credentials`, {
        method: 'POST',
        headers: {
          cookie,
          Origin: origin,
          'Content-Type': 'application/json',
          'Idempotency-Key': randomUUID(),
        },
        body: JSON.stringify({ name: 'Rule contract acceptance', scopes }),
      });
      assert.equal(response.status, 201);
      const result = (await response.json()) as {
        data: { secret: string; credential: { id: string } };
      };
      assert(result.data.secret);
      return result.data;
    }
    const full = await mint(['ai_rules:read', 'tenant:read']),
      limited = await mint(['tenant:read']);
    const sessionHeaders = { cookie, Origin: origin, 'Content-Type': 'application/json' };
    await checked('/service/v1/health', 200);
    await checked('/service/v1/ready', 200);
    await checked('/service/v1/tenant', 200, {
      headers: { Authorization: `Bearer ${full.secret}` },
    });
    await checked('/service/v1/ai-rules', 401);
    await checked('/service/v1/ai-rules', 403, {
      headers: { Authorization: `Bearer ${limited.secret}` },
    });
    await checked('/api/v1/ai-rules', 401);
    const initial = await checked('/api/v1/ai-rules', 200, { headers: sessionHeaders });
    type SessionState = {
      data: {
        revision: unknown;
        current: { id: string; content: { businessInformation?: string } } | null;
      };
    };
    const fields = {
      tone: '',
      responseGuidelines: 'Workspace response guidance',
      businessInformation: 'Verified contract information',
      escalationInstructions: '',
      prohibitedTopics: '',
      customInstructions: '',
    };
    const payload = {
      fields,
      revision: (initial.body as SessionState).data.revision,
      changeNote: 'Publish verified contract instructions',
    };
    await checked('/api/v1/ai-rules/publish', 403, {
      method: 'POST',
      headers: { ...sessionHeaders, Origin: 'https://outside.example' },
      body: JSON.stringify(payload),
    });
    await checked('/api/v1/ai-rules/publish', 403, {
      method: 'POST',
      headers: { ...sessionHeaders, cookie: agentCookie },
      body: JSON.stringify(payload),
    });
    await checked('/api/v1/ai-rules/publish', 422, {
      method: 'POST',
      headers: sessionHeaders,
      body: JSON.stringify({ ...payload, extra: 'refused' }),
    });
    const first = await checked('/api/v1/ai-rules/publish', 201, {
      method: 'POST',
      headers: sessionHeaders,
      body: JSON.stringify(payload),
    });
    const firstVersion = (first.body as { data: { versionId: string } }).data.versionId;
    await checked('/api/v1/ai-rules/publish', 409, {
      method: 'POST',
      headers: sessionHeaders,
      body: JSON.stringify(payload),
    });
    const rules = await checked('/service/v1/ai-rules', 200, {
      headers: { Authorization: `Bearer ${full.secret}` },
    });
    const compiled = rules.body as {
      data: { rules: { tone: string; businessInformation: string }; tenantId: string };
    };
    assert.equal(compiled.data.tenantId, owner.tenantId);
    assert.equal(compiled.data.rules.tone, 'Shared assurance');
    assert.equal(compiled.data.rules.businessInformation, fields.businessInformation);
    const etag = rules.response.headers.get('etag');
    assert(etag);
    await checked('/service/v1/ai-rules', 304, {
      headers: { Authorization: `Bearer ${full.secret}`, 'If-None-Match': etag },
    });
    const latest = await checked('/api/v1/ai-rules', 200, { headers: sessionHeaders });
    await checked('/api/v1/ai-rules/publish', 201, {
      method: 'POST',
      headers: sessionHeaders,
      body: JSON.stringify({
        ...payload,
        fields: { ...fields, businessInformation: 'Second verified contract information' },
        revision: (latest.body as SessionState).data.revision,
      }),
    });
    const changed = await checked('/api/v1/ai-rules', 200, { headers: sessionHeaders });
    const restoreBody = {
      revision: (changed.body as SessionState).data.revision,
      changeNote: 'Restore verified contract instructions',
    };
    await checked(
      `/api/v1/ai-rules/rollback/${firstVersion}`,
      200,
      { method: 'POST', headers: sessionHeaders, body: JSON.stringify(restoreBody) },
      '/api/v1/ai-rules/rollback/{versionId}',
    );
    const restoredState = await checked('/api/v1/ai-rules', 200, { headers: sessionHeaders });
    await checked(
      `/api/v1/ai-rules/rollback/${randomUUID()}`,
      404,
      {
        method: 'POST',
        headers: sessionHeaders,
        body: JSON.stringify({
          ...restoreBody,
          revision: (restoredState.body as SessionState).data.revision,
        }),
      },
      '/api/v1/ai-rules/rollback/{versionId}',
    );
    await owned.admin`update master_ai_rules set current_version_id=null where id=${original.id}`;
    await checked('/api/v1/ai-rules', 503, { headers: sessionHeaders });
    await checked('/service/v1/ai-rules', 503, {
      headers: { Authorization: `Bearer ${full.secret}` },
    });
    await owned.admin`update master_ai_rules set current_version_id=${master} where id=${original.id}`;
    const revoked = await fetch(`${origin}/api/v1/credentials/${full.credential.id}`, {
      method: 'DELETE',
      headers: { cookie, Origin: origin },
    });
    assert.equal(revoked.status, 200);
    await checked('/service/v1/ai-rules', 401, {
      headers: { Authorization: `Bearer ${full.secret}`, 'If-None-Match': etag },
    });
    const [audits] = await owned.admin<
      { n: number }[]
    >`select count(*)::int as n from audit_log where tenant_id=${owner.tenantId} and action in ('rules.published','rules.rolled_back')`;
    assert.equal(audits?.n, 3);
    const covered = new Set(checks.map((check) => check.operation));
    assert.equal(covered.size, 7);
  } finally {
    for (const process of [worker, service])
      if (process && process.exitCode === null && process.signalCode === null) {
        const stopped = new Promise<void>((done) => process.once('exit', () => done()));
        if (globalThis.process.platform === 'win32') {
          const killer = spawn('taskkill', ['/pid', String(process.pid), '/T', '/F'], {
            windowsHide: true,
            stdio: 'ignore',
          });
          await new Promise<void>((done) => killer.once('exit', () => done()));
        } else process.kill();
        await stopped;
      }
    if (original)
      await owned.admin`update master_ai_rules set current_version_id=${original.current_version_id},updated_at=${original.updated_at} where id=${original.id} and (current_version_id=${master} or current_version_id is null)`;
    await owned.admin`delete from master_ai_rule_versions where id=${master}`;
    await owned.admin`delete from tenant_ai_rules where tenant_id=${owner.tenantId}`;
    await owned.admin`delete from tenant_ai_rule_versions where tenant_id=${owner.tenantId}`;
    await owned.cleanup();
  }
  await writeFile(`${root}/m4a-merged-openapi.json`, JSON.stringify(merged, null, 2) + '\n');
  await writeFile(
    `${root}/m4a-contract-results.json`,
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        passed: true,
        localOnly: true,
        productionBuild: true,
        fixtureCleanup: true,
        operations: 7,
        checks,
        boundary:
          'Complete M4a rules/service HTTP scope, using shared Node input schemas, generated response schemas and live FastAPI OpenAPI. Private Server Actions retain their dedicated tests. This does not claim response conformance for unrelated platform/account endpoints.',
      },
      null,
      2,
    ) + '\n',
  );
  console.log(
    `M4a contract passed: ${checks.length} real responses across all seven rules/service operations; fixtures removed.`,
  );
}
void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Rules contract failed');
  process.exitCode = 1;
});
