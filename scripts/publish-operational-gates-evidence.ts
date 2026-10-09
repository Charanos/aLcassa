/** Publish bounded operational receipts; keep SQL dumps, identities, cookies and raw logs private. */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { z } from 'zod';
import { projectTestEvidence } from '../src/lib/presentation/verificationEvidence';
const read = (name: string): unknown =>
  JSON.parse(readFileSync(`.test-report/phase-one/${name}`, 'utf8'));
const application = projectTestEvidence(read('cache-disabled.json'));
if (application.passed !== 639 || application.files.length !== 57)
  throw new Error('Full application regression is incomplete.');
const prior = projectTestEvidence(read('qualified-budget-ci/cache-disabled.json'));
if (prior.passed !== 632 || prior.files.length !== 55)
  throw new Error('Qualified CI reference differs.');
const http = z
  .object({
    checkedAt: z.string().datetime(),
    passed: z.literal(true),
    fixtureCleanup: z.literal(true),
    checks: z
      .array(
        z.object({
          name: z.string().max(180),
          passed: z.literal(true),
          admitted: z.number().int().optional(),
          refused: z.number().int().optional(),
        }),
      )
      .length(8),
    scope: z.string().max(400),
    limits: z.string().max(400),
    localOnly: z.literal(true),
  })
  .parse(read('shared-budget-http.json'));
if (http.checks[0]?.admitted !== 6 || http.checks[0]?.refused !== 4)
  throw new Error('HTTP contention totals differ.');
const recovery = z
  .object({
    checkedAt: z.string().datetime(),
    passed: z.literal(true),
    fixtureCleanup: z.literal(true),
    localOnly: z.literal(true),
    tables: z.number().int().positive(),
    rows: z.number().int().nonnegative(),
    policies: z.number().int().positive(),
    contextFunctions: z.number().int().positive(),
    restoreMilliseconds: z.number().int().positive(),
    dataDifferences: z.literal(0),
    ownershipAndGrantsMatch: z.literal(true),
    definerSettingsMatch: z.literal(true),
    defaultDenyPassed: z.literal(true),
    applicationIdentityPassed: z.literal(true),
    settingsPagePassed: z.literal(true),
    serviceReadPassed: z.literal(true),
    missingScopeRefused: z.literal(true),
    restoredRevocationRefused: z.literal(true),
    sourceUnchanged: z.literal(true),
    boundary: z.string().max(600),
  })
  .parse(read('database-recovery.json'));
const loadSchema = z.object({
  checkedAt: z.string().datetime(),
  localOnly: z.literal(true),
  productionBuild: z.literal(true),
  sessions: z.literal(50),
  workspaces: z.literal(5),
  durationMs: z.number().int().positive(),
  cache: z.literal('disabled'),
  peakDatabaseConnections: z.number().int().nonnegative(),
  routes: z
    .array(
      z.object({
        route: z.enum([
          '/app',
          '/app/settings/company',
          '/app/settings/ai-rules',
          '/api/v1/me',
          '/api/v1/ai-rules',
        ]),
        requests: z.number().int().positive(),
        p50Ms: z.number().nonnegative(),
        p95Ms: z.number().nonnegative(),
        p99Ms: z.number().nonnegative(),
        requestsPerSecond: z.number().nonnegative(),
        errors: z.number().int().nonnegative(),
        refused: z.number().int().nonnegative(),
        targetMs: z.number().nullable(),
      }),
    )
    .length(5),
  integrityPassed: z.literal(true),
  fixtureCleanup: z.literal(true),
  passed: z.boolean(),
  boundary: z.string().max(700),
});
const load = loadSchema.parse(read('load-50-sessions.json'));
const baseline = loadSchema.parse(read('load-50-sessions-baseline.json'));
function publish(name: string, value: unknown) {
  const path = `/verification/2026-10-09/${name}`;
  const bytes = Buffer.from(JSON.stringify(value, null, 2) + '\n');
  if (existsSync(`public${path}`) && !readFileSync(`public${path}`).equals(bytes))
    throw new Error('Published evidence is immutable.');
  writeFileSync(`public${path}`, bytes);
  return { path, sha256: createHash('sha256').update(bytes).digest('hex') };
}
const checkpoint = {
  date: '9 October 2026',
  applicationCases: application.passed,
  applicationFiles: application.files.length,
  verifiedGates: ['G06', 'G07'],
  httpScenarios: 8,
  restoredTables: recovery.tables,
  restoreMilliseconds: recovery.restoreMilliseconds,
  loadPassed: load.passed,
  results: publish('operational-gates-results.json', {
    application,
    http,
    recovery,
    load,
    baseline,
  }),
  qualifiedRelease: publish('request-budget-qualified-release.json', {
    applicationCommit: '35df9a8caf158d4033d70aa29e005134464f4b30',
    applicationCi: 'https://github.com/Charanos/aLcassa/actions/runs/37938279891',
    applicationJobsPassed: 6,
    application: prior,
    serviceCommit: 'dad4761b0a2697a25d0c9edbd50c6aa79c499f7f',
    serviceCi: 'https://github.com/Charanos/alcassa-service/actions/runs/37938310120',
    serviceJobsPassed: 2,
    pinnedApplicationCommit: '35df9a8caf158d4033d70aa29e005134464f4b30',
    deployment: 'https://vercel.com/dennis-munges-projects/a-lcassa/7nHau7v6u4oa7AzBCU3sKbxsSrxr',
    deploymentPassed: true,
    redisScenarios: 8,
    scope:
      'Qualified preceding request-budget release; the new operational candidate has separate release checks.',
  }),
  scope:
    'Shared budgets verified through real signed-in application and service HTTP. Phase One resource counters use one source definition and audited, locked reconciliation. Separate-target recovery preserves data and access controls.',
  limits:
    'Local service-hosting scope. Performance acceptance, broader provider and browser workflows, monitoring delivery, object recovery, accessibility, clean setup and handover remain open. Failed load samples remain downloadable. Admission and credential last-use are not billable request counters.',
};
const manifest = publish('operational-gates-manifest.json', checkpoint);
writeFileSync(
  'src/lib/presentation/operationalGatesVerification.json',
  JSON.stringify({ ...checkpoint, manifest }, null, 2) + '\n',
);
console.log(
  'Published HTTP, reconciliation, recovery and load receipts, including the retained failed baseline.',
);
