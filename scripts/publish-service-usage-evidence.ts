import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { z } from 'zod';
import { projectTestEvidence } from '../src/lib/presentation/verificationEvidence';

const application = projectTestEvidence(
  JSON.parse(readFileSync('.test-report/phase-one/cache-disabled.json', 'utf8')),
);
if (application.passed !== 626 || application.files.length !== 54)
  throw Error('Application regression incomplete');
const xml = readFileSync('../alcassa-service/.test-report/service-contract.xml', 'utf8');
if (!/errors="0" failures="0" skipped="0" tests="29"/.test(xml))
  throw Error('Service regression incomplete');
const cases = [
  ...xml.matchAll(/<testcase classname="(tests\.[a-z_]+)" name="([^"]+)" time="([\d.]+)"\s*\/>/g),
].map((match) => ({
  suite: match[1]!,
  name: match[2]!,
  seconds: Number(match[3]),
  status: 'passed',
}));
if (cases.length !== 29 || cases.some((item) => !/^[a-z_\d\[\]()+ '\-]+$/.test(item.name)))
  throw Error('Unsupported service evidence');
const bridge = z
  .object({
    passed: z.literal(true),
    localOnly: z.literal(true),
    checkedAt: z.string().datetime(),
    samples: z
      .array(
        z.object({
          case: z.string().regex(/^\/service\/v1\/(tenant|ai-rules)$/),
          status: z.number(),
          elapsedMs: z.number().nonnegative(),
        }),
      )
      .length(5),
  })
  .parse(JSON.parse(readFileSync('.test-report/phase-one/service-cross-runtime.json', 'utf8')));
if (bridge.samples.map((item) => item.status).join(',') !== '200,200,304,403,401')
  throw Error('Bridge outcomes differ');
const propagation = z
  .object({
    passed: z.literal(true),
    localOnly: z.literal(true),
    checkedAt: z.string().datetime(),
    samples: z
      .array(
        z.object({
          operation: z.string().regex(/^(tenant|master)\.(publish|restore)\.\d+$/),
          operationStartToReadMs: z.number().nonnegative().max(5000),
        }),
      )
      .length(12),
  })
  .parse(JSON.parse(readFileSync('.test-report/phase-one/rules-propagation.json', 'utf8')));
function publish(name: string, value: unknown) {
  const path = `/verification/2026-10-09/${name}`;
  const bytes = Buffer.from(JSON.stringify(value, null, 2) + '\n');
  if (existsSync(`public${path}`) && !readFileSync(`public${path}`).equals(bytes))
    throw Error('Published evidence is immutable');
  writeFileSync(`public${path}`, bytes);
  return { path, sha256: createHash('sha256').update(bytes).digest('hex') };
}
const checkpoint = {
  date: '9 October 2026',
  environment: 'Disposable local PostgreSQL and actual Node-to-FastAPI HTTP',
  applicationCases: 626,
  applicationFiles: 54,
  serviceCases: cases.length,
  databaseCases: cases.filter((item) => item.suite === 'tests.test_database_contract').length,
  bridgeChecks: bridge.samples.length,
  propagationSamples: propagation.samples.length,
  maximumPropagationMs: Math.max(...propagation.samples.map((item) => item.operationStartToReadMs)),
  results: publish('service-usage-results.json', { cases, bridge, propagation }),
  scope:
    'Durable last-use for successful 200/304 reads; refusal, failure, concurrency and database write boundaries.',
  limits:
    'Local engineering checkpoint. Shared rate budgets, request rollup, hosted topology, load, backup recovery and full surface acceptance remain open. This records last-use, not billable request counts.',
};
const manifest = publish('service-usage-manifest.json', checkpoint);
writeFileSync(
  'src/lib/presentation/serviceUsageVerification.json',
  JSON.stringify({ ...checkpoint, manifest }, null, 2) + '\n',
);
