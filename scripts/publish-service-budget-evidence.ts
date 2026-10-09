import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { z } from 'zod';
import { projectTestEvidence } from '../src/lib/presentation/verificationEvidence';

const application = projectTestEvidence(
  JSON.parse(readFileSync('.test-report/phase-one/cache-disabled.json', 'utf8')),
);
if (application.passed !== 632 || application.files.length !== 55)
  throw Error('Application regression incomplete');
const prior = projectTestEvidence(
  JSON.parse(
    readFileSync('.test-report/phase-one/service-usage-qualified-ci/cache-disabled.json', 'utf8'),
  ),
);
if (prior.passed !== 626 || prior.files.length !== 54)
  throw Error('Prior CI artifact does not reconcile');
const serviceXml = readFileSync('../aLcassa-service/.test-report/service-contract.xml', 'utf8');
if (!/errors="0" failures="0" skipped="0" tests="34"/.test(serviceXml))
  throw Error('Service regression incomplete');
const budget = z
  .object({
    checkedAt: z.string().datetime(),
    passed: z.literal(true),
    localOnly: z.literal(true),
    fixtureCleanup: z.literal(true),
    image: z.literal(
      'redis@sha256:858f009f9709ce576febc734aa78b8f6d624b82571f9ddb6bda4377c833b3499',
    ),
    checks: z
      .array(
        z.object({
          name: z
            .string()
            .regex(/^[A-Za-z0-9 ,;.-]+$/)
            .max(180),
          passed: z.literal(true),
          admitted: z.number().int().optional(),
          refused: z.number().int().optional(),
        }),
      )
      .length(8),
    scope: z.string().max(400),
    limits: z.string().max(400),
  })
  .parse(JSON.parse(readFileSync('.test-report/phase-one/shared-budget.json', 'utf8')));
if (budget.checks[0]?.admitted !== 6 || budget.checks[0]?.refused !== 4)
  throw Error('Contention totals differ');
const advisor = z
  .object({
    results: z
      .array(
        z.object({
          name: z.literal('extension_in_public'),
          level: z.literal('WARN'),
          metadata: z.object({
            name: z.enum(['vector', 'pg_trgm']),
            type: z.literal('extension'),
            schema: z.literal('public'),
          }),
        }),
      )
      .length(2),
  })
  .parse(
    JSON.parse(
      readFileSync('.test-report/phase-one/shared-budget-security-advisors.raw', 'utf8')
        .split(/\r?\n/)
        .find((line) => line.startsWith('{"results"'))!,
    ),
  );
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
  applicationCases: application.passed,
  applicationFiles: application.files.length,
  serviceCases: 34,
  databaseCases: 20,
  budgetScenarios: budget.checks.length,
  repairedFunctionWarnings: 8,
  remainingSecurityWarnings: advisor.results.length,
  results: publish('service-budget-results.json', { application, budget, security: advisor }),
  priorRelease: publish('service-usage-qualified-release.json', {
    applicationCommit: 'd7f99cdaba500be07efc08d4b6a19aef5ff17e0b',
    applicationCi: 'https://github.com/Charanos/aLcassa/actions/runs/37906113971',
    applicationJobsPassed: 6,
    application: prior,
    serviceCommit: '6436127a103d84e62513c81e8898e170a6e5bf7f',
    serviceCi: 'https://github.com/Charanos/alcassa-service/actions/runs/37906133208',
    serviceJobsPassed: 2,
    qualification:
      'Previous durable last-use release; the current request-budget candidate has separate release checks.',
  }),
  scope:
    'Atomic tenant request budgets across independent Node processes and authenticated Python workers, plus public limiter expiry and pinned database function search paths.',
  limits:
    'Disposable local verification. Native Node session-to-HTTP contention, hosted topology, billable request rollup, load, recovery and remaining surface acceptance stay open. Two extension-placement warnings remain.',
};
const manifest = publish('service-budget-manifest.json', checkpoint);
writeFileSync(
  'src/lib/presentation/serviceBudgetVerification.json',
  JSON.stringify({ ...checkpoint, manifest }, null, 2) + '\n',
);
