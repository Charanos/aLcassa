import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import record from '@/lib/presentation/verificationRecord.json';
import membership from '@/lib/presentation/membershipVerification.json';
import {
  projectTestEvidence,
  projectCredentialEvidence,
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
    ];
    for (const file of files) {
      expect(file.path).toMatch(/^\/verification\/2026-10-08\/[a-z0-9-]+\.(?:json|jpg|png)$/);
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
