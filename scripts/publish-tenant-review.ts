/** Publish bounded functional evidence, preserving historical receipts and their fingerprints. */
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
      checks: z.array(z.string().min(1).max(350)).length(10),
      visits: z
        .array(
          z.object({
            role: z.enum(['owner', 'admin', 'agent']),
            surface: z.enum(['company', 'team', 'credentials', 'ai-rules', 'audit']),
            width: z.union([z.literal(1440), z.literal(390), z.literal(320)]),
            overflow: z.number().min(0).max(1),
          }),
        )
        .length(45),
      boundary: z.string().max(700),
    })
    .parse(JSON.parse(await readFile('.test-report/phase-one/tenant-review.json', 'utf8')));
  assert.equal(new Set(native.visits.map((v) => `${v.role}/${v.surface}/${v.width}`)).size, 45);
  const consoleReview = JSON.parse(
    await readFile('.test-report/phase-one/console-operations.json', 'utf8'),
  ) as {
    checkedAt: string;
    passed: boolean;
    productionBuild: boolean;
    fixtureCleanup: boolean;
    checks: unknown[];
  };
  assert.equal(consoleReview.passed, true);
  assert.equal(consoleReview.productionBuild, true);
  assert.equal(consoleReview.fixtureCleanup, true);
  assert.equal(consoleReview.checks.length, 16);
  assert(Date.parse(consoleReview.checkedAt) >= Date.parse('2026-10-15T00:00:00Z'));
  const regression = projectTestEvidence(
    JSON.parse(await readFile('.test-report/phase-one/cache-disabled.json', 'utf8')),
  );
  assert(regression.passed >= 726);
  assert(Date.parse(regression.startedAt) >= Date.parse('2026-10-15T00:00:00Z'));
  const inventory = JSON.parse(
    await readFile('project-docs/api-surface-manifest.json', 'utf8'),
  ) as {
    application: { http: unknown[]; actions: unknown[] };
    service: { http: unknown[] };
  };
  assert.equal(inventory.application.http.length, 42);
  assert.equal(inventory.application.actions.length, 47);
  assert.equal(inventory.service.http.length, 4);
  const root = '/verification/2026-10-15';
  await mkdir(`public${root}`, { recursive: true });
  async function publish(name: string, value: unknown) {
    const bytes = JSON.stringify(value, null, 2) + '\n';
    assert(
      !/csk_(?:live|test)_[a-f0-9]{16}_|Bearer\s+\S+|[\w.+-]+@[\w.-]+\.[a-z]{2,}|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.|[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}/i.test(
        bytes,
      ),
      'Private material cannot be published.',
    );
    const path = `${root}/${name}.json`;
    await writeFile(`public${path}`, bytes);
    return { path, sha256: createHash('sha256').update(bytes).digest('hex') };
  }
  const results = await publish('tenant-functional-review', {
    ...native,
    boundary:
      "Owned Chrome/Auth/database/FastAPI journeys. Offline and response loss are browser fault injections. Role and layout checks cover three widths. Existing screen-reader proof accepted as sufficient; repeat screen-reader testing removed from the itinerary at the project owner's direction on 15 October.",
  });
  const tests = await publish('tenant-settings-regression', regression);
  const contracts = await publish('api-surface-inventory', inventory);
  const consoleResults = await publish('console-dialog-regression', consoleReview);
  const guidance = [];
  for (const target of ['local', 'hosted-sandbox']) {
    const receipt = z
      .object({
        checkedAt: z.string().datetime(),
        passed: z.literal(true),
        target: z.string(),
        versionNumber: z.number().int().positive(),
        outcome: z.enum(['published', 'unchanged']),
        fields: z.array(z.string()).length(6),
        lockedFields: z.array(z.string()),
        independentDatabaseReadback: z.literal(true),
        auditedPublication: z.boolean(),
        boundary: z.string(),
      })
      .parse(
        JSON.parse(
          await readFile(`.test-report/phase-one/default-guidance-${target}.json`, 'utf8'),
        ),
      );
    guidance.push(receipt);
  }
  const defaults = await publish('default-conversation-guidance', guidance);
  const checkpoint = {
    date: '15 October 2026',
    nativeChecks: 10,
    roleLayoutVisits: 45,
    consoleChecks: 16,
    regression: { passed: regression.passed, files: regression.files.length },
    results,
    tests,
    contracts,
    consoleResults,
    defaults,
    scopeDecision:
      'Existing screen-reader proof accepted as sufficient by the project owner on 15 October 2026; repeat screen-reader testing removed from the itinerary. Prior console evidence is retained. No new accessibility certification is claimed.',
    boundary:
      'M4 and M5 engineering closure in the agreed sandbox scope, pending presentation and client demonstration. M4a response-schema conformance and loaded latency/freshness, plus M6 operational handover, remain separate. Exact-revision CI and deployment are qualified after push.',
  };
  const manifest = await publish('tenant-settings-manifest', checkpoint);
  await writeFile(
    'src/lib/presentation/tenantSettingsVerification.json',
    JSON.stringify({ ...checkpoint, manifest }, null, 2) + '\n',
  );
  const previous = JSON.parse(
    await readFile('src/lib/presentation/phaseOneEvidenceIndex.json', 'utf8'),
  ) as { manifest: { path: string; sha256: string } };
  const indexBytes = await readFile(`public${previous.manifest.path}`);
  assert.equal(createHash('sha256').update(indexBytes).digest('hex'), previous.manifest.sha256);
  const index = JSON.parse(indexBytes.toString()) as {
    checkpoints: { checkpoint: string; path: string; sha256: string }[];
    boundary: string;
  };
  for (const entry of index.checkpoints.filter(
    (item) => item.checkpoint !== 'tenantSettingsVerification',
  ))
    assert.equal(
      createHash('sha256')
        .update(await readFile(`public${entry.path}`))
        .digest('hex'),
      entry.sha256,
    );
  const checkpoints = [
    ...index.checkpoints.filter((item) => item.checkpoint !== 'tenantSettingsVerification'),
    { checkpoint: 'tenantSettingsVerification', ...manifest },
  ];
  const exported = await publish('phase-one-evidence-index', {
    date: checkpoint.date,
    checkpoints,
    boundary: index.boundary,
  });
  await writeFile(
    'src/lib/presentation/phaseOneEvidenceIndex.json',
    JSON.stringify(
      { date: checkpoint.date, checkpointCount: checkpoints.length, manifest: exported },
      null,
      2,
    ) + '\n',
  );
  console.log(
    `Published 10 tenant scenarios, 45 role/layout visits, 16 console regressions and ${regression.passed} test cases.`,
  );
}
void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Tenant evidence publication failed.');
  process.exitCode = 1;
});
