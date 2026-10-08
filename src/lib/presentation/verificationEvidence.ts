import { z } from 'zod';

const assertion = z.object({
  fullName: z.string(),
  status: z.literal('passed'),
  duration: z.number().nonnegative().optional(),
});
const report = z.object({
  success: z.literal(true),
  numTotalTests: z.number().int().positive(),
  numPassedTests: z.number().int().positive(),
  numFailedTests: z.literal(0),
  numPendingTests: z.literal(0),
  startTime: z.number().positive(),
  testResults: z.array(z.object({ name: z.string(), assertionResults: z.array(assertion) })).min(1),
});
const privateText =
  /csk_(?:live|test)_[a-f0-9]{16}_|Bearer\s+\S+|[\w.+-]+@[\w.-]+\.[a-z]{2,}|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\./i;

/** Publish only test names, outcomes and timing; never logs, errors or machine paths. */
export function projectTestEvidence(input: unknown) {
  const parsed = report.parse(input);
  const files = parsed.testResults.map((file) => {
    const normalized = file.name.replaceAll('\\', '/');
    const marker = normalized.lastIndexOf('/tests/');
    const path = marker >= 0 ? normalized.slice(marker + 1) : normalized;
    if (!/^tests\/[A-Za-z0-9_/-]+\.test\.ts$/.test(path)) throw Error('Unsupported evidence path');
    return {
      path,
      cases: file.assertionResults.map((test) => {
        const title = test.fullName.trim();
        if (!title || title.length > 500 || privateText.test(title))
          throw Error('Unsafe evidence title');
        return { title, status: test.status, durationMs: test.duration ?? null };
      }),
    };
  });
  const count = files.reduce((sum, file) => sum + file.cases.length, 0);
  if (count !== parsed.numTotalTests || count !== parsed.numPassedTests)
    throw Error('Evidence totals do not reconcile');
  return {
    startedAt: new Date(parsed.startTime).toISOString(),
    passed: count,
    failed: 0,
    skipped: 0,
    files,
  };
}

export function projectCredentialEvidence(input: unknown) {
  const value = z
    .object({
      localOnly: z.literal(true),
      phases: z
        .array(
          z.object({
            phase: z.enum(['created', 'rotated', 'revoked']),
            checkedAt: z.string().datetime(),
            credentialCount: z.number().int().nonnegative(),
            statuses: z.array(z.enum(['active', 'rotating', 'revoked'])),
            usage: z.number().int().nonnegative(),
            serviceResponses: z.array(z.number().int()),
          }),
        )
        .min(3),
    })
    .parse(input);
  const final = value.phases.at(-1)!;
  if (
    final.phase !== 'revoked' ||
    final.usage !== 0 ||
    !final.statuses.length ||
    final.statuses.some((status) => status !== 'revoked') ||
    !final.serviceResponses.length ||
    final.serviceResponses.some((status) => status !== 401)
  )
    throw Error('Credential cleanup is not qualified');
  return value;
}
