import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

/** Publish bounded outcomes; identity proofs and browser diagnostics stay private. */
async function main() {
  const read = async (path: string) =>
    JSON.parse(await readFile(path, 'utf8')) as Record<string, unknown>;
  const native = await read('.test-report/phase-one/confirmed-onboarding.json');
  assert(native.passed === true && native.productionBuild === true && native.localOnly === true);
  assert(
    native.emailConfirmationRequired === true &&
      native.ownedDatabaseAndAuthFixturesRemoved === true,
  );
  assert(Array.isArray(native.checks) && native.checks.length === 9);
  const regression = await read('.test-report/phase-one/cache-disabled.json');
  assert(
    regression.success === true &&
      regression.numFailedTests === 0 &&
      regression.numPendingTests === 0,
  );
  const focused = await read('.test-report/phase-one/first-subscription-database.json');
  assert(focused.success === true && focused.numFailedTests === 0);
  const accounts = await read('.test-report/phase-one/account-workflows.json');
  assert(
    accounts.passed === true &&
      accounts.productionBuild === true &&
      accounts.fixtureCleanup === true,
  );
  assert(Array.isArray(accounts.checks) && accounts.checks.length === 7);
  const auth = await read('.test-report/phase-one/auth-closure-focused.json');
  assert(auth.success === true && auth.numFailedTests === 0 && auth.numPendingTests === 0);
  const continuity = await read('.test-report/phase-one/google-email-continuity.json');
  const invitation = await read('.test-report/phase-one/google-invitation-acceptance.json');
  const cleanup = await read('.test-report/phase-one/google-closure-cleanup.json');
  const ui = await read('.test-report/phase-one/auth-closure-ui.json');
  assert(continuity.sameProviderUserId === true && continuity.duplicateWorkspaceCreated === false);
  assert(
    invitation.invited_administrators === 1 &&
      invitation.seats === 2 &&
      invitation.joined_audits === 1,
  );
  assert(
    cleanup.ownedInvitationFixturesRemoved === true &&
      cleanup.retainedGoogleFixtureRestored === true,
  );
  assert(cleanup.active_application_sessions === 0 && cleanup.provider_sessions === 0);
  assert(
    ui.approvedRetryCopy === true &&
      ui.protectedEntryRefused === true &&
      ui.productionBuild === true,
  );
  const result = {
    date: '13 October 2026',
    checkedAt: native.checkedAt,
    environment:
      'Disposable local Supabase Auth, PostgreSQL and captured email; production application build',
    productionBuild: true,
    emailConfirmationRequired: true,
    checks: native.checks,
    responsiveConfirmationWidths: [1440, 390, 320],
    regression: {
      passed: regression.numPassedTests,
      failed: 0,
      skipped: 0,
      files: (regression.testResults as unknown[]).length,
    },
    focusedDatabaseChecks: focused.numPassedTests,
    ownedDatabaseAndAuthFixturesRemoved: true,
    failedAttempts: [
      {
        stage: 'Evidence index release check',
        finding: 'The historical path allowlist excluded the new October 12 and 13 checkpoints.',
        correction:
          'Add the recorded checkpoint dates while retaining exact file fingerprints and private-data exclusions.',
      },
      {
        stage: 'Development form submission',
        finding: 'Cold development form submission failed validation.',
        correction: 'Wait for interactive forms and qualify the production build.',
      },
      {
        stage: 'Immediate confirmation resend',
        finding: 'The test submitted again inside the local provider one-second resend window.',
        correction: 'Respect the configured provider cooldown before verifying a new message.',
      },
      {
        stage: 'New workspace discovery',
        finding: 'Reverse alphabetical pagination hid the new workspace from the initial page.',
        correction:
          'Newest-first ordering uses the actual creation timestamp; default grid, search and both views are verified.',
      },
      {
        stage: 'Initial subscription assignment',
        finding:
          'Preview and assignment required a subscription that self-serve signup had not created.',
        correction:
          'Reviewed first assignment now creates one subscription with matching customer and platform audits; concurrent and stale assignments are refused.',
      },
    ],
    remaining: [
      'External email domain and delivery qualification',
      'Wider console/settings action-state and accessibility acceptance',
      'Service contract/load, independent identity/object recovery and handover rehearsals',
    ],
    boundary:
      'These local outcomes do not qualify hosted email delivery or final Phase One acceptance. CI and deployment apply to their exact source revision separately. Captured messages remain private in local Mailpit; links, credentials, cookies and tokens are excluded.',
  };
  const directory = 'public/verification/2026-10-13';
  await mkdir(directory, { recursive: true });
  const publish = async (name: string, value: unknown) => {
    const content = JSON.stringify(value, null, 2) + '\n';
    assert(
      !/Bearer\s+\S+|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.|[\w.+-]+@[\w.-]+\.[a-z]{2,}|\/auth\/v1\/verify\?/i.test(
        content,
      ),
    );
    await writeFile(`${directory}/${name}.json`, content);
    return {
      path: `/verification/2026-10-13/${name}.json`,
      sha256: createHash('sha256').update(content).digest('hex'),
    };
  };
  const receipt = await publish('confirmed-onboarding-console-results', result);
  const authReceipt = await publish('auth-completion-results', {
    date: result.date,
    engineeringScope: 'M2 sandbox authentication and account lifecycle',
    technicalCompletionPercent: 100,
    regression: result.regression,
    accounts,
    productionAuthAndTrackerUI: ui,
    emailConfirmation: {
      productionBuild: true,
      required: true,
      capturedProviderEmails: true,
      ownedFixturesRemoved: true,
    },
    hostedGoogle: {
      continuity,
      invitation,
      cleanup,
      baselinePreparation:
        'A verified email-only identity was seeded on the retained owned sandbox fixture and password sign-in verified it before actual Google authentication. This is not a claim of a new email signup journey.',
      failureAttempt:
        'One invitation sign-in submission stalled; reloading and retrying completed the journey. No root cause is attributed to that attempt.',
    },
    focusedAuthAndEmail: {
      passed: auth.numPassedTests,
      failed: 0,
      skipped: 0,
      files: (auth.testResults as unknown[]).length,
    },
    providerFailureCoverage:
      'Contract tests cover disabled/unavailable providers, foreign origins, unsafe return paths, missing/refused/unverified exchanges and explicit provider errors. Native hosted denial-callback replay refused protected entry; this does not simulate a Google outage or new consent denial.',
    launchReadiness:
      'External sending-domain and delivery qualification, client-owned OAuth credentials and final handover remain separate gates. No production launch or final client acceptance is claimed.',
    privacy:
      'No email addresses, invitation links, passwords, tokens, cookies or provider secrets are included. Temporary email/password fixture state was removed; the original Google owner workspace remains.',
  });
  const historical = await read('public/verification/2026-10-10/phase-one-evidence-index.json');
  const googlePath = '/verification/2026-10-12/google-admin-access-results.json';
  const googleHash = createHash('sha256')
    .update(await readFile(`public${googlePath}`))
    .digest('hex');
  const checkpoints = [
    ...(historical.checkpoints as unknown[]),
    { checkpoint: 'googleAdminAccess', path: googlePath, sha256: googleHash },
    { checkpoint: 'confirmedOnboardingConsole', ...receipt },
    { checkpoint: 'authCompletion', ...authReceipt },
  ];
  const manifest = await publish('phase-one-evidence-index', {
    date: result.date,
    checkpoints,
    boundary: historical.boundary,
  });
  await writeFile(
    'src/lib/presentation/phaseOneEvidenceIndex.json',
    JSON.stringify({ date: result.date, checkpointCount: checkpoints.length, manifest }, null, 2) +
      '\n',
  );
  console.log(
    `Published ${native.checks.length} combined browser checks and ${checkpoints.length} evidence checkpoints.`,
  );
}
void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Evidence publication failed.');
  process.exitCode = 1;
});
