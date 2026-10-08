import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { projectTestEvidence } from '../src/lib/presentation/verificationEvidence';

/** Publish a bounded account checkpoint without replacing earlier evidence. */
const root = 'public/verification/2026-10-08';
const tests = projectTestEvidence(
  JSON.parse(readFileSync('.test-report/phase-one/cache-disabled.json', 'utf8')),
);
if (tests.passed !== 564 || tests.files.length !== 45) throw Error('Unexpected regression totals');
for (const [path, count] of [
  ['tests/isolation/membership.test.ts', 31],
  ['tests/http/ownership-route.test.ts', 8],
  ['tests/isolation/ownership-provider.test.ts', 1],
] as const) {
  if (tests.files.find((file) => file.path === path)?.cases.length !== count)
    throw Error('Required account gate is absent');
}
mkdirSync(root, { recursive: true });
function publish(name: string, value: unknown) {
  const bytes = JSON.stringify(value, null, 2) + '\n';
  const path = `${root}/${name}`;
  if (existsSync(path) && readFileSync(path, 'utf8') !== bytes)
    throw Error('Published evidence is immutable; use a new checkpoint name');
  writeFileSync(path, bytes);
  return {
    path: `/verification/2026-10-08/${name}`,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  };
}
const checkpoint = {
  date: '8 October 2026',
  environment: 'Disposable local PostgreSQL and Supabase Auth; invitation email delivery mocked',
  baseCommit: '3674cfe5542a9e1e04a767ddf1f5fb4f5a3dcb5e',
  scope: 'Invitation acceptance, membership restoration and ownership reauthentication',
  passed: tests.passed,
  files: tests.files.length,
  membershipCases: 31,
  ownershipRouteCases: 8,
  ownershipProviderCases: 1,
  results: publish('account-gates-regression.json', tests),
  limits:
    'The ownership route uses the actual provider and database with the session resolver and cookie adapter replaced by disposable test context. This is not native browser acceptance, OAuth or external email delivery evidence.',
};
const manifest = publish('account-gates-manifest.json', checkpoint);
writeFileSync(
  'src/lib/presentation/accountVerification.json',
  JSON.stringify({ ...checkpoint, manifest }, null, 2) + '\n',
);
console.log('Published independent 564-case account checkpoint; private logs remain excluded.');
