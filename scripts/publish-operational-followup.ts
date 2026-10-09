/** Publish bounded operational receipts; retain failed review samples as history. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { z } from 'zod';
import { projectTestEvidence } from '../src/lib/presentation/verificationEvidence';

const read = (name: string): unknown =>
  JSON.parse(readFileSync(`.test-report/phase-one/${name}`, 'utf8'));
const application = projectTestEvidence(read('cache-disabled.json'));
assert.equal(application.passed, 645);
assert.equal(application.files.length, 58);
const monitoring = z
  .object({
    checkedAt: z.string().datetime(),
    localOnly: z.literal(true),
    passed: z.literal(true),
    livenessSurvivesDatabaseFailure: z.literal(true),
    readinessRefusesDatabaseFailure: z.literal(true),
    safeErrorAndRetryAfter: z.literal(true),
    outageThreshold: z.literal(3),
    recoveryThreshold: z.literal(2),
    deliveredEvents: z.literal(4),
    applicationDatabaseFailureAndRecovery: z.literal(true),
    serviceDatabaseFailureAndRecovery: z.literal(true),
    failedDeliveryRetriedWithSameId: z.literal(true),
    noDuplicateAcceptedEvents: z.literal(true),
    outageRecoveryCorrelated: z.literal(true),
    pendingAfterRecovery: z.literal(0),
    fixtureCleanup: z.literal(true),
    boundary: z.string().max(700),
  })
  .parse(read('monitoring-delivery.json'));
const surfaceSchema = z.object({
  checkedAt: z.string().datetime(),
  localOnly: z.literal(true),
  productionBuild: z.literal(true),
  browser: z.string().max(160),
  viewports: z.array(z.number().int()).length(3),
  surfaceCount: z.literal(32),
  activityWindowAndTenantIsolation: z.boolean().optional(),
  companySaveAndReadback: z.boolean().optional(),
  results: z
    .array(
      z.object({
        surface: z
          .string()
          .regex(/^\/(platform|app)([a-z0-9/?=&-]*)$/)
          .max(180),
        width: z.number().int(),
        status: z.number().int(),
        overflowPx: z.number().int(),
        findings: z.array(z.string().max(120)),
      }),
    )
    .length(96),
  fixtureCleanup: z.literal(true),
  passed: z.boolean(),
  boundary: z.string().max(700),
});
const surfaces = surfaceSchema.parse(read('surface-review.json'));
assert(
  surfaces.passed && surfaces.activityWindowAndTenantIsolation && surfaces.companySaveAndReadback,
);
assert(
  surfaces.results.every(
    (row) => row.status === 200 && row.findings.length === 0 && row.overflowPx <= 1,
  ),
);
const baselineSurfaces = surfaceSchema.parse(read('surface-review-baseline.json'));
assert.equal(baselineSurfaces.passed, false);
const runSchema = z.object({
  headSha: z.string().regex(/^[a-f0-9]{40}$/),
  status: z.literal('completed'),
  conclusion: z.literal('success'),
  url: z.string().url(),
  jobs: z.array(z.object({ name: z.string(), conclusion: z.literal('success') })),
});
const appRun = runSchema.parse(read('operational-qualified-ci/run.json'));
const serviceRun = runSchema.parse(read('operational-qualified-service-ci/run.json'));
assert.equal(appRun.headSha, '0b510a13e5c606bb84e44ac491ee3c3d605357e3');
assert.equal(appRun.jobs.length, 6);
assert.equal(serviceRun.headSha, 'cf2a9361644c6cc716b8106eeaa1759c27fb0fa6');
assert.equal(serviceRun.jobs.length, 2);
const prior = projectTestEvidence(read('operational-qualified-ci/cache-disabled.json'));
assert.equal(prior.passed, 639);
assert.equal(prior.files.length, 57);
const deployment = z
  .object({
    state: z.literal('success'),
    statuses: z.array(
      z.object({ context: z.string(), state: z.string(), target_url: z.string().url() }),
    ),
  })
  .parse(read('operational-qualified-ci/deployment.json'));
assert(deployment.statuses.some((item) => item.context === 'Vercel' && item.state === 'success'));
const sha = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');
const root = '/verification/2026-10-10';
mkdirSync(`public${root}`, { recursive: true });
function publish(name: string, value: unknown) {
  const bytes = Buffer.from(JSON.stringify(value, null, 2) + '\n');
  const path = `${root}/${name}.json`;
  if (existsSync(`public${path}`) && !readFileSync(`public${path}`).equals(bytes))
    throw new Error('Published receipt is immutable.');
  writeFileSync(`public${path}`, bytes);
  return { path, sha256: sha(bytes) };
}
const sources = [
  'src/lib/observability/dependencyMonitor.ts',
  'scripts/monitor-dependencies.ts',
  'scripts/verification-monitoring.ts',
  'scripts/verification-surface-review.ts',
  'src/app/(tenant)/app/settings/audit/page.tsx',
].map((path) => ({ path, sha256: sha(readFileSync(path)) }));
const results = publish('operational-followup-results', {
  application,
  monitoring,
  surfaces,
  baselineSurfaces,
  sourceFiles: sources,
  applicationBuildId: readFileSync('.next-live-verify/BUILD_ID', 'utf8').trim(),
  boundary:
    'Current local candidate. Qualified preceding application/service release is linked separately. Source fingerprints identify the operational checks and Activity fix; private browser images and worker logs are excluded.',
});
const qualifiedRelease = publish('operational-qualified-release', {
  application: appRun,
  service: { ...serviceRun, pinnedApplicationCommit: appRun.headSha },
  applicationCatalogue: prior,
  deployment,
  boundary:
    'Exact preceding operational release; does not qualify the new monitoring and Activity candidate.',
});
const summary = {
  date: '10 October 2026',
  applicationCases: 645,
  applicationFiles: 58,
  monitorDeliveredEvents: 4,
  surfaceVisits: 96,
  surfaceCount: 32,
  surfacePassed: true,
  activityWindowAndTenantIsolation: true,
  scope:
    'Actual application/service database failure and recovery, durable alert retries, and an isolated Chrome review of 32 surfaces at 1440, 390 and 320px. Minimum-plan Activity availability, actual retained activity and tenant isolation are verified.',
  limits:
    'Local sandbox. The automated route review does not replace complete CRUD, keyboard, screen-reader or accessibility acceptance. Performance, provider journeys, independent Auth/object recovery, clean setup and final handover remain open.',
  results,
  qualifiedRelease,
};
const manifest = publish('operational-followup-manifest', summary);
writeFileSync(
  'src/lib/presentation/operationalFollowupVerification.json',
  JSON.stringify({ ...summary, manifest }, null, 2) + '\n',
);
process.stdout.write(
  'Published bounded monitoring, surface review and prior-release qualification.\n',
);
