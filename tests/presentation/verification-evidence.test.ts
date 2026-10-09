import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import record from '@/lib/presentation/verificationRecord.json';
import membership from '@/lib/presentation/membershipVerification.json';
import account from '@/lib/presentation/accountVerification.json';
import ownership from '@/lib/presentation/ownershipVerification.json';
import navigation from '@/lib/presentation/authNavigationVerification.json';
import devices from '@/lib/presentation/deviceSessionsVerification.json';
import hardening from '@/lib/presentation/accountHardeningVerification.json';
import {
  projectTestEvidence,
  projectCredentialEvidence,
  projectOwnershipEvidence,
  projectAuthNavigationEvidence,
} from '@/lib/presentation/verificationEvidence';

const report = () => ({
  success: true,
  numTotalTests: 1,
  numPassedTests: 1,
  numFailedTests: 0,
  numPendingTests: 0,
  startTime: 1791464645239,
  testResults: [
    {
      name: 'C:\\private-machine\\tests\\isolation\\rules.test.ts',
      assertionResults: [
        {
          fullName: 'Rules refuse another workspace',
          status: 'passed',
          duration: 15,
          failureMessages: ['PRIVATE_ERROR_CANARY'],
          secret: 'PRIVATE_SECRET_CANARY',
        },
      ],
      message: 'PRIVATE_LOG_CANARY',
    },
  ],
  token: 'PRIVATE_TOKEN_CANARY',
});
describe('Public verification evidence boundary', () => {
  it('excludes private navigation fixture fields and refuses incomplete browser qualification', () => {
    const receipt = {
      localOnly: true,
      checkedAt: new Date().toISOString(),
      browserHost: '127.0.0.1',
      protectedDeepLinkPreserved: true,
      invalidPasswordRefused: true,
      refusalReturnPathPreserved: true,
      signInAutomatic: true,
      signOutAutomatic: true,
      signedOutProtectedRequestRefused: true,
      recoveryFormGeneric: true,
      strictFormActionPreserved: true,
      noFormCspViolations: true,
      phoneViewportPx: 390,
      phoneDocumentPx: 380,
      fixtureRemoved: true,
      establishedWorkspacePreserved: true,
    };
    expect(
      projectAuthNavigationEvidence({ ...receipt, password: 'PRIVATE_PASSWORD_CANARY' }),
    ).toEqual(receipt);
    expect(() => projectAuthNavigationEvidence({ ...receipt, signInAutomatic: false })).toThrow();
    expect(() => projectAuthNavigationEvidence({ ...receipt, fixtureRemoved: false })).toThrow();
    expect(() => projectAuthNavigationEvidence({ ...receipt, phoneDocumentPx: 391 })).toThrow();
  });
  it('keeps published artifacts and their fingerprints consistent with the evidence index', () => {
    const files = [
      record.localCandidate.results,
      record.application.results,
      record.service.results,
      record.browser.credentials,
      ...record.browser.images,
      membership.results,
      membership.native,
      membership.manifest,
      ...membership.images,
      account.results,
      account.manifest,
      ownership.results,
      ownership.native,
      ownership.manifest,
      navigation.results,
      navigation.native,
      navigation.manifest,
      ...navigation.images,
      devices.results,
      devices.native,
      devices.manifest,
      ...devices.images,
      hardening.results,
      hardening.manifest,
    ];
    for (const file of files) {
      expect(file.path).toMatch(
        /^\/verification\/2026-10-(?:08|09)\/[a-z0-9-]+\.(?:json|jpg|png)$/,
      );
      const bytes = readFileSync(`public${file.path}`);
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(file.sha256);
    }
    expect(
      JSON.parse(readFileSync('public/verification/2026-10-08/manifest.json', 'utf8')),
    ).toEqual(record);
    const teamCheckpoint = JSON.parse(
      readFileSync(`public${membership.manifest.path}`, 'utf8'),
    ) as Omit<typeof membership, 'manifest'>;
    expect({ ...teamCheckpoint, manifest: membership.manifest }).toEqual(membership);
    const accountCheckpoint = JSON.parse(
      readFileSync(`public${account.manifest.path}`, 'utf8'),
    ) as Omit<typeof account, 'manifest'>;
    expect({ ...accountCheckpoint, manifest: account.manifest }).toEqual(account);
    const ownershipCheckpoint = JSON.parse(
      readFileSync(`public${ownership.manifest.path}`, 'utf8'),
    ) as Omit<typeof ownership, 'manifest'>;
    expect({ ...ownershipCheckpoint, manifest: ownership.manifest }).toEqual(ownership);
    const navigationCheckpoint = JSON.parse(
      readFileSync(`public${navigation.manifest.path}`, 'utf8'),
    ) as Omit<typeof navigation, 'manifest'>;
    expect({ ...navigationCheckpoint, manifest: navigation.manifest }).toEqual(navigation);
    const deviceCheckpoint = JSON.parse(
      readFileSync(`public${devices.manifest.path}`, 'utf8'),
    ) as Omit<typeof devices, 'manifest'>;
    expect({ ...deviceCheckpoint, manifest: devices.manifest }).toEqual(devices);
    const deviceCatalogue = JSON.parse(readFileSync(`public${devices.results.path}`, 'utf8'));
    expect(deviceCatalogue).toMatchObject({ passed: 617, failed: 0, skipped: 0 });
    expect(deviceCatalogue.files).toHaveLength(52);
    const combinedCatalogue = JSON.parse(readFileSync(`public${hardening.results.path}`, 'utf8'));
    expect(combinedCatalogue).toMatchObject({ passed: 626, failed: 0, skipped: 0 });
    expect(combinedCatalogue.files).toHaveLength(54);
    expect(JSON.parse(readFileSync(`public${hardening.manifest.path}`, 'utf8'))).toEqual(
      Object.fromEntries(Object.entries(hardening).filter(([key]) => key !== 'manifest')),
    );
    expect(
      projectAuthNavigationEvidence(
        JSON.parse(readFileSync(`public${navigation.native.path}`, 'utf8')),
      ).refusalReturnPathPreserved,
    ).toBe(true);
    const native = projectOwnershipEvidence(
      JSON.parse(readFileSync(`public${ownership.native.path}`, 'utf8')),
    );
    expect(projectOwnershipEvidence({ ...native, token: 'PRIVATE_TOKEN_CANARY' })).toEqual(native);
    expect(() => projectOwnershipEvidence({ ...native, fixtureRemoved: false })).toThrow();
    expect(() => projectOwnershipEvidence({ ...native, transferAuditCount: 2 })).toThrow();
  });
  it('excludes private paths, logs, errors and unknown secret fields', () => {
    const projected = projectTestEvidence(report());
    expect(projected.files[0]?.path).toBe('tests/isolation/rules.test.ts');
    expect(JSON.stringify(projected)).not.toMatch(
      /PRIVATE_|private-machine|failureMessages|secret|token|message/,
    );
    expect(projected.passed).toBe(1);
  });
  it('refuses mismatched results and paths outside test sources', () => {
    expect(() => projectTestEvidence({ ...report(), numTotalTests: 2 })).toThrow('reconcile');
    const source = report();
    source.testResults[0]!.name = '/tests/../../private.ts';
    expect(() => projectTestEvidence(source)).toThrow('path');
  });
  it('refuses credentials or email addresses embedded in a case title', () => {
    const source = report();
    source.testResults[0]!.assertionResults[0]!.fullName = 'Bearer PRIVATE_SECRET_CANARY';
    expect(() => projectTestEvidence(source)).toThrow('title');
    source.testResults[0]!.assertionResults[0]!.fullName = 'private@example.invalid';
    expect(() => projectTestEvidence(source)).toThrow('title');
  });
  it('publishes only lifecycle metrics and refuses unrevoked fixture access', () => {
    const input = {
      localOnly: true,
      secret: 'PRIVATE_SECRET_CANARY',
      phases: Array.from({ length: 3 }, () => ({
        phase: 'revoked',
        checkedAt: '2026-10-08T08:22:57.900Z',
        credentialCount: 2,
        statuses: ['revoked', 'revoked'],
        usage: 0,
        serviceResponses: [401, 401],
        secret: 'PRIVATE_SECRET_CANARY',
      })),
    };
    expect(JSON.stringify(projectCredentialEvidence(input))).not.toContain('PRIVATE_SECRET_CANARY');
    input.phases[2]!.usage = 1;
    expect(() => projectCredentialEvidence(input)).toThrow('cleanup');
  });
});
