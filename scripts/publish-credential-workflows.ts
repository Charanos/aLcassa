/** Publish only successful, bounded results; private browser diagnostics stay local. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { z } from 'zod';
import { projectTestEvidence } from '../src/lib/presentation/verificationEvidence';

async function main() {
  const native = z
    .object({
      checkedAt: z.string().datetime(),
      localOnly: z.literal(true),
      passed: z.literal(true),
      productionBuild: z.literal(true),
      fixtureCleanup: z.literal(true),
      checks: z.array(z.string().min(1).max(350)).length(13),
      boundary: z.string().max(700),
    })
    .parse(JSON.parse(await readFile('.test-report/phase-one/credential-workflows.json', 'utf8')));
  const regression = projectTestEvidence(
    JSON.parse(await readFile('.test-report/phase-one/credential-security.json', 'utf8')),
  );
  assert.equal(regression.passed, 69);
  assert.equal(regression.files.length, 6);
  const root = 'public/verification/2026-10-13';
  await mkdir(root, { recursive: true });
  async function publish(name: string, value: unknown) {
    const bytes = JSON.stringify(value, null, 2) + '\n';
    assert(
      !/csk_(?:live|test)_[a-f0-9]{16}_|Bearer\s+\S+|[\w.+-]+@[\w.-]+\.[a-z]{2,}|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.|[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}/i.test(
        bytes,
      ),
      'Private material cannot be published.',
    );
    await writeFile(`${root}/${name}.json`, bytes);
    return {
      path: `/verification/2026-10-13/${name}.json`,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    };
  }
  const results = await publish('credential-ownership-workflows', native);
  const tests = await publish('credential-security-regression', regression);
  const inventory = JSON.parse(
    await readFile('project-docs/api-surface-manifest.json', 'utf8'),
  ) as {
    application: { http: unknown[]; actions: unknown[] };
    service: { http: unknown[] };
  };
  assert.equal(inventory.application.http.length, 42);
  assert.equal(inventory.application.actions.length, 46);
  assert.equal(inventory.service.http.length, 4);
  const contracts = await publish('api-surface-inventory', inventory);
  const checkpoint = {
    date: '13 October 2026',
    nativeChecks: native.checks.length,
    regression: { passed: regression.passed, files: regression.files.length },
    results,
    tests,
    contracts,
    boundary:
      'Credential and ownership failure acceptance passed locally. The operation inventory detects route/action drift; complete merged response-schema conformance, tenant rules/accessibility review and loaded latency/freshness remain separate gates.',
  };
  const manifest = await publish('credential-ownership-manifest', checkpoint);
  await writeFile(
    'src/lib/presentation/credentialWorkflowsVerification.json',
    JSON.stringify({ ...checkpoint, manifest }, null, 2) + '\n',
  );
  const index = JSON.parse(await readFile(`${root}/phase-one-evidence-index.json`, 'utf8')) as {
    date: string;
    checkpoints: { checkpoint: string; path: string; sha256: string }[];
  };
  const checkpoints = [
    ...index.checkpoints.filter((item) => item.checkpoint !== 'credentialWorkflowsVerification'),
    { checkpoint: 'credentialWorkflowsVerification', ...manifest },
  ];
  const exported = await publish('phase-one-evidence-index', { ...index, checkpoints });
  await writeFile(
    'src/lib/presentation/phaseOneEvidenceIndex.json',
    JSON.stringify(
      { date: index.date, checkpointCount: checkpoints.length, manifest: exported },
      null,
      2,
    ) + '\n',
  );
  console.log(
    `Published ${native.checks.length} native workflows, ${regression.passed} security cases and operation inventory; private diagnostics excluded.`,
  );
}
void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Evidence publication failed.');
  process.exitCode = 1;
});
