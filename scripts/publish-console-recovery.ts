/** Publish only qualified, bounded console and independent Auth recovery outcomes. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

async function main() {
  const read = async (path: string) =>
    JSON.parse(await readFile(path, 'utf8')) as Record<string, unknown>;
  const consoleResult = await read('.test-report/phase-one/console-operations.json');
  assert(
    consoleResult.passed === true &&
      consoleResult.productionBuild === true &&
      consoleResult.localOnly === true &&
      consoleResult.fixtureCleanup === true,
  );
  assert(Array.isArray(consoleResult.checks) && consoleResult.checks.length === 16);
  const recovery = await read('.test-report/phase-one/database-recovery.json');
  for (const key of [
    'passed',
    'localOnly',
    'independentAuthProcessPassed',
    'restoredProviderSessionCreated',
    'sourceProviderSessionUnchanged',
    'applicationIdentityPassed',
    'settingsPagePassed',
    'serviceReadPassed',
    'missingScopeRefused',
    'restoredRevocationRefused',
    'sourceUnchanged',
    'fixtureCleanup',
  ])
    assert.equal(recovery[key], true, key);
  assert.equal(recovery.dataDifferences, 0);
  const suite = await read('.test-report/phase-one/console-recovery-regression.json');
  assert(suite.success === true && suite.numFailedTests === 0 && suite.numPendingTests === 0);
  const consoleReceipt = {
    checkedAt: consoleResult.checkedAt,
    localOnly: true,
    productionBuild: true,
    passed: true,
    fixtureCleanup: true,
    checks: consoleResult.checks,
    boundary: consoleResult.boundary,
    regression: {
      passed: suite.numPassedTests,
      files: (suite.testResults as unknown[]).length,
      failed: 0,
      skipped: 0,
    },
    correctedDefects: [
      'Drawer Reactivate submitted a suspension request.',
      'Workspace detail had no reactivation control.',
      'Suspension preview incorrectly used the committed suspension audit action.',
      'Concurrent status changes could both record the same transition.',
      'The open drawer retained a stale row after directory revalidation.',
      'Drawer focus was not trapped or restored; clipboard feedback preceded success.',
    ],
    failedHarnessAttempts: [
      'Cold development compilation exceeded navigation timeouts; acceptance uses the production build.',
      'The HTTP helper omitted Secure browser cookies; authenticated policy checks now use actual browser fetch.',
      'Credential write probe omitted its required idempotency key.',
      'The grid drawer trigger was a workspace-name button, not the separate Open workspace link.',
      'Nested modal accessibility hides its parent from role queries; readback must wait for the submitted child modal to close.',
      'Earlier settings attempts timed out or observed values before refresh; the final serialized run discards the invalid draft, uses unique reviewed values and waits for refreshed field readback.',
    ],
  };
  async function publish(name: string, value: unknown) {
    const content = JSON.stringify(value, null, 2) + '\n';
    assert(
      !/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+|Bearer\s+[A-Za-z0-9_-]{20}|[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}/i.test(
        content,
      ),
      'Public outcomes must not contain identities or credentials.',
    );
    const path = `/verification/2026-10-13/${name}.json`;
    await writeFile(`public${path}`, content);
    return { path, sha256: createHash('sha256').update(content).digest('hex') };
  }
  const operations = await publish('console-operations-results', consoleReceipt);
  const recoveryKeys = [
    'checkedAt',
    'passed',
    'localOnly',
    'tables',
    'rows',
    'policies',
    'contextFunctions',
    'restoreMilliseconds',
    'dataDifferences',
    'ownershipAndGrantsMatch',
    'definerSettingsMatch',
    'defaultDenyPassed',
    'applicationIdentityPassed',
    'independentAuthProcessPassed',
    'restoredProviderSessionCreated',
    'sourceProviderSessionUnchanged',
    'settingsPagePassed',
    'serviceReadPassed',
    'missingScopeRefused',
    'restoredRevocationRefused',
    'sourceUnchanged',
    'boundary',
    'fixtureCleanup',
  ];
  const restored = await publish(
    'independent-auth-recovery-results',
    Object.fromEntries(recoveryKeys.map((key) => [key, recovery[key]])),
  );
  const current = await read('public/verification/2026-10-13/phase-one-evidence-index.json');
  const checkpoints = (
    current.checkpoints as { checkpoint: string; path: string; sha256: string }[]
  ).filter((row) => !['consoleOperations', 'independentAuthRecovery'].includes(row.checkpoint));
  checkpoints.push(
    { checkpoint: 'consoleOperations', ...operations },
    { checkpoint: 'independentAuthRecovery', ...restored },
  );
  const manifest = await publish('phase-one-evidence-index', { ...current, checkpoints });
  await writeFile(
    'src/lib/presentation/phaseOneEvidenceIndex.json',
    JSON.stringify(
      { date: '13 October 2026', checkpointCount: checkpoints.length, manifest },
      null,
      2,
    ) + '\n',
  );
  await writeFile(
    'src/lib/presentation/consoleOperationsVerification.json',
    JSON.stringify(
      {
        date: '13 October 2026',
        nativeChecks: consoleResult.checks.length,
        operations,
        recovery: restored,
        tables: recovery.tables,
        policies: recovery.policies,
        contextFunctions: recovery.contextFunctions,
        regression: consoleReceipt.regression,
      },
      null,
      2,
    ) + '\n',
  );
  console.log(
    `Published console and independent Auth recovery; ${checkpoints.length} fingerprinted evidence checkpoints.`,
  );
}
void main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Publication failed.');
  process.exitCode = 1;
});
