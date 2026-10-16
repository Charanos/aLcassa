/** Publish bounded M4a results and retain the separately measured M6 latency failure. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { z } from 'zod';
import { projectTestEvidence } from '../src/lib/presentation/verificationEvidence';

async function main() {
  const read = async (name: string): Promise<unknown> =>
    JSON.parse(await readFile(`.test-report/phase-one/${name}.json`, 'utf8')) as unknown;
  const freshness = z
    .object({
      checkedAt: z.string().datetime(),
      passed: z.literal(true),
      localOnly: z.literal(true),
      fixtureCleanup: z.literal(true),
      phases: z
        .array(
          z.object({
            mode: z.enum(['cache-disabled', 'unreachable-cache']),
            passed: z.literal(true),
            fixtureCleanup: z.literal(true),
            concurrentReaders: z.literal(8),
            maximumMs: z.number().nonnegative().lt(5000),
            restartMs: z.number().nonnegative().lt(5000),
            restartPreservedConditionalRead: z.literal(true),
            backgroundReads: z.number().positive(),
            conditionalReads: z.number().positive(),
            backgroundErrors: z.literal(0),
            samples: z
              .array(
                z.object({
                  operation: z.string(),
                  operationStartToReadMs: z.number().nonnegative().lt(5000),
                  publicationResolvedToReadMs: z.number().nonnegative(),
                  masterVersion: z.number(),
                  tenantVersion: z.number(),
                  status: z.literal(200),
                }),
              )
              .length(12),
          }),
        )
        .length(2),
    })
    .parse(await read('m4a-loaded-freshness'));
  assert.equal(new Set(freshness.phases.map((p) => p.mode)).size, 2);
  const contracts = z
    .object({
      checkedAt: z.string().datetime(),
      passed: z.literal(true),
      localOnly: z.literal(true),
      productionBuild: z.literal(true),
      fixtureCleanup: z.literal(true),
      operations: z.literal(7),
      checks: z
        .array(
          z.object({
            operation: z.string(),
            status: z.number().int(),
            schemaPassed: z.literal(true),
          }),
        )
        .min(22),
      boundary: z.string(),
    })
    .parse(await read('m4a-contract-results'));
  assert.equal(new Set(contracts.checks.map((c) => c.operation)).size, 7);
  const regression = projectTestEvidence(await read('cache-disabled'));
  assert(regression.passed >= 727 && regression.failed === 0 && regression.skipped === 0);
  const root = '/verification/2026-10-16';
  await mkdir(`public${root}`, { recursive: true });
  async function publish(name: string, value: unknown) {
    const bytes = JSON.stringify(value, null, 2) + '\n';
    assert(
      !/csk_(?:live|test)_[a-f0-9]{16}_|Bearer\s+\S+|[\w.+-]+@[\w.-]+\.[a-z]{2,}|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.|[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}/i.test(
        bytes,
      ),
      'Private fixture material cannot be published',
    );
    const path = `${root}/${name}.json`;
    const existing = await readFile(`public${path}`, 'utf8').catch((error: unknown) => {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
      throw error;
    });
    assert(existing === undefined || existing === bytes, 'Published evidence is immutable');
    await writeFile(`public${path}`, bytes);
    return { path, sha256: createHash('sha256').update(bytes).digest('hex') };
  }
  const results = await publish('rules-loaded-freshness', freshness);
  const responses = await publish('rules-response-conformance', contracts);
  const tests = await publish('rules-regression', regression);
  const schema = await publish('rules-merged-openapi', await read('m4a-merged-openapi'));
  const retainedLoad = z.object({
    checkedAt: z.string().datetime(),
    sessions: z.literal(50),
    productionBuild: z.literal(true),
    localOnly: z.literal(true),
    passed: z.literal(false),
    fixtureCleanup: z.literal(true),
    integrityPassed: z.literal(true),
    routes: z.array(
      z.object({
        route: z.string(),
        requests: z.number(),
        p50Ms: z.number(),
        p95Ms: z.number(),
        p99Ms: z.number(),
        errors: z.literal(0),
        refused: z.literal(0),
        targetMs: z.number().nullable(),
      }),
    ),
    boundary: z.string(),
  });
  const m6Latency = await publish('m6-retained-latency-failures', {
    milestone: 'M6',
    targetMs: 400,
    passed: false,
    singleWorker: retainedLoad.parse(await read('m4a-single-worker-load')),
    fourWorkers: retainedLoad.parse(await read('load-50-sessions')),
  });
  const checkpoint = {
    date: '16 October 2026',
    samples: 24,
    concurrentReaders: 8,
    restarts: 2,
    maximumMs: Math.max(...freshness.phases.map((p) => p.maximumMs)),
    responseChecks: contracts.checks.length,
    operations: 7,
    regression: { passed: regression.passed, files: regression.files.length },
    results,
    responses,
    tests,
    schema,
    m6Latency,
    boundary:
      'M4a engineering verification in the agreed local service-hosting scope; client demonstration remains pending. Architecture section 10 assigns the separate 400ms p95 dashboard/settings gate at 50 sessions to M6. Its failed measurements remain open; no latency threshold or authorization check has been relaxed. Exact-revision CI and deployment are checked after push.',
  };
  const manifest = await publish('rules-closure-manifest', checkpoint);
  await writeFile(
    'src/lib/presentation/rulesClosureVerification.json',
    JSON.stringify({ ...checkpoint, manifest }, null, 2) + '\n',
  );
  const previous = JSON.parse(
    await readFile('src/lib/presentation/phaseOneEvidenceIndex.json', 'utf8'),
  ) as { manifest: { path: string; sha256: string } };
  const bytes = await readFile(`public${previous.manifest.path}`);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), previous.manifest.sha256);
  const index = JSON.parse(bytes.toString()) as {
    checkpoints: { checkpoint: string; path: string; sha256: string }[];
    boundary: string;
  };
  for (const entry of index.checkpoints)
    assert.equal(
      createHash('sha256')
        .update(await readFile(`public${entry.path}`))
        .digest('hex'),
      entry.sha256,
    );
  const checkpoints = [
    ...index.checkpoints.filter((entry) => entry.checkpoint !== 'rulesClosureVerification'),
    { checkpoint: 'rulesClosureVerification', ...manifest },
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
    `Published ${checkpoint.samples} loaded changes and ${checkpoint.responseChecks} schema-checked responses across all seven M4a operations.`,
  );
}
void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Rules evidence publication failed');
  process.exitCode = 1;
});
