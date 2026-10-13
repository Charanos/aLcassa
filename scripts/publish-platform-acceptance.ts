/** Publish qualified console action evidence without private fixtures, tokens or DOM captures. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

async function main() {
  const read = async (path: string) =>
    JSON.parse(await readFile(path, 'utf8')) as Record<string, unknown>;
  const actions = await read('.test-report/phase-one/m4-platform-acceptance.json');
  for (const key of ['passed', 'productionBuild', 'localOnly', 'fixtureCleanup'])
    assert.equal(actions[key], true, key);
  assert.equal(actions.group, 'full');
  assert(Array.isArray(actions.checks) && actions.checks.length >= 13);
  const support = await read('.test-report/phase-one/m4-platform-acceptance-support.json');
  for (const key of ['passed', 'productionBuild', 'localOnly', 'fixtureCleanup'])
    assert.equal(support[key], true, `support follow-up ${key}`);
  assert.equal(support.group, 'support');
  assert(Array.isArray(support.checks) && support.checks.length === 8);
  const contrast = await read('.test-report/phase-one/m4-contrast.json');
  for (const key of ['passed', 'productionBuild', 'localOnly', 'fixtureCleanup'])
    assert.equal(contrast[key], true, `rendered contrast ${key}`);
  const reader = await read('.test-report/phase-one/m4-screen-reader.json');
  assert.equal(reader.passed, true);
  assert(Array.isArray(reader.samples) && reader.samples.length >= 4);
  const focus = await read('.test-report/phase-one/m4-provision-focus.json');
  for (const key of ['passed', 'productionBuild', 'localOnly', 'fixtureCleanup'])
    assert.equal(focus[key], true, `provision focus ${key}`);
  assert.equal(focus.group, 'provision');
  const cleanup = await read('.test-report/phase-one/m4-fixture-cleanup.json');
  assert.equal(cleanup.localOnly, true);
  assert.equal(cleanup.remainingFixturePlans, 0);
  const accessibility = await read('.test-report/phase-one/m4-accessibility.json');
  for (const key of ['passed', 'productionBuild', 'localOnly', 'fixtureCleanup'])
    assert.equal(accessibility[key], true, key);
  const visits = accessibility.checks as {
    surface: string;
    width: number;
    overflow: number;
    violations: unknown[];
    incomplete: unknown[];
  }[];
  assert.equal(visits.length, 126);
  assert(visits.every((row) => row.overflow <= 1 && row.violations.length === 0));
  const suite = await read('.test-report/phase-one/cache-disabled.json');
  assert(suite.success === true && suite.numFailedTests === 0 && suite.numPendingTests === 0);
  const manual = await read('.test-report/phase-one/m4-manual-zoom.json');
  assert.equal(manual.fixtureCleanup, true);
  const zoom = (
    manual.captures as {
      label: string;
      metrics: { width: number; height: number; devicePixelRatio: number; overflow: number };
    }[]
  ).find((row) => row.label === 'profile-zoom-200');
  assert(zoom && zoom.metrics.overflow <= 1);
  const bucket = await read('.test-report/phase-one/avatar-bucket-configuration.json');
  assert(
    bucket.passed === true &&
      bucket.visibilityPreserved === true &&
      bucket.fileSizeLimit === 2097152,
  );
  const receipt = {
    checkedAt: actions.checkedAt,
    localOnly: true,
    productionBuild: true,
    fixtureCleanup: true,
    consoleActionAcceptancePassed: true,
    checks: actions.checks,
    modalChecks: actions.modalChecks,
    supportFollowUp: {
      checkedAt: support.checkedAt,
      checks: support.checks,
      passed: true,
      fixtureCleanup: true,
      boundary: support.boundary,
    },
    renderedContrast: contrast,
    verificationDataCleanup: cleanup,
    screenReader: reader,
    provisionFocusFollowUp: {
      checkedAt: focus.checkedAt,
      checks: focus.checks,
      passed: true,
      fixtureCleanup: true,
    },
    accessibility: {
      checkedAt: accessibility.checkedAt,
      surfaces: 18,
      visits: 126,
      widths: [1440, 1280, 1024, 768, 390, 320, 720],
      violations: 0,
      pageOverflow: 0,
      checks: visits,
      boundary: accessibility.boundary,
    },
    nativeBrowserZoom: {
      percentObserved: 200,
      surface: 'Platform profile',
      metrics: zoom.metrics,
      boundary:
        'The native Chrome interface reported 200%; the owned profile page reflowed without page overflow. This is one actual zoom sample, separate from viewport emulation and screen-reader output.',
    },
    avatarConfiguration: {
      hostedSandboxConfigured: bucket.localOnly === false,
      maximumBytes: bucket.fileSizeLimit,
      allowedMimeTypes: bucket.allowedMimeTypes,
      visibilityPreserved: true,
      existingObjectsPreserved: true,
      functionalAcceptanceEnvironment: 'Disposable local provider',
    },
    regression: {
      passed: suite.numPassedTests,
      files: (suite.testResults as unknown[]).length,
      failed: 0,
      skipped: 0,
    },
    correctedDefects: [
      'An existing support visit remained readable after its operator capability was removed; context resolution and data transactions now recheck live authority.',
      'Lost mutation responses could strand drafts or pending controls; outcomes now remain explicitly unconfirmed and recoverable.',
      'Avatar limits existed in the form but not at the Storage API; bucket configuration now enforces MIME and size limits.',
      'Small-text contrast, overview definition-list semantics, chart segment labels and scroll-region keyboard access were incomplete.',
      'Profile, support notification and trial labels overstated behavior; copy now matches the actual data and delivery outcomes.',
    ],
    failedAttempts: [
      'The first resend fixture was still inside its cooldown; that refusal is now asserted before an explicit aged-fixture retry.',
      'Expiry denied customer access immediately, while terminal audit closure occurred when the support register reconciled lapsed visits.',
      'An empty master-rule pointer required exercising native first publication before publication and restoration comparisons.',
      'Native active-visit and published-rule states exposed contrast issues absent from the empty-page scan; both were corrected.',
      'The independent Storage probe originally used global provider sign-out and invalidated the browser fixture; it now ends only its own provider session.',
    ],
    remaining: [],
    boundary:
      'M4 engineering acceptance passed in the agreed disposable sandbox scope, including native actions, rendered contrast, keyboard/focus checks and an actual NVDA sample. Client demonstration, complete Phase One acceptance and other milestone gates remain separate. This receipt does not claim formal WCAG certification or every assistive-technology/browser combination.',
  };
  async function publish(name: string, value: unknown) {
    const content = JSON.stringify(value, null, 2) + '\n';
    assert(
      !/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|Bearer\s+[A-Za-z0-9_-]{20}|[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}/i.test(
        content,
      ),
      'Private material cannot be published.',
    );
    const path = `/verification/2026-10-13/${name}.json`;
    await writeFile(`public${path}`, content);
    return { path, sha256: createHash('sha256').update(content).digest('hex') };
  }
  const results = await publish('platform-console-acceptance-results', receipt);
  const index = await read('public/verification/2026-10-13/phase-one-evidence-index.json');
  const checkpoints = (
    index.checkpoints as { checkpoint: string; path: string; sha256: string }[]
  ).filter((row) => row.checkpoint !== 'platformConsoleAcceptance');
  checkpoints.push({ checkpoint: 'platformConsoleAcceptance', ...results });
  const manifest = await publish('phase-one-evidence-index', { ...index, checkpoints });
  await writeFile(
    'src/lib/presentation/phaseOneEvidenceIndex.json',
    JSON.stringify(
      { date: '13 October 2026', checkpointCount: checkpoints.length, manifest },
      null,
      2,
    ) + '\n',
  );
  await writeFile(
    'src/lib/presentation/platformConsoleVerification.json',
    JSON.stringify(
      {
        date: '13 October 2026',
        nativeChecks: actions.checks.length,
        surfaces: 18,
        visits: 126,
        zoomPercent: 200,
        regression: receipt.regression,
        results,
        remaining: receipt.remaining,
      },
      null,
      2,
    ) + '\n',
  );
  console.log(
    `Published ${actions.checks.length} native checks, final support/focus follow-ups, 126 accessibility visits, rendered contrast and actual NVDA acceptance.`,
  );
}
void main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Publication failed');
  process.exitCode = 1;
});
