import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import {
  projectOwnershipEvidence,
  projectTestEvidence,
} from '../src/lib/presentation/verificationEvidence';

/** Preserve prior checkpoints and publish only qualified, bounded local evidence. */
const root = 'public/verification/2026-10-08';
const tests = projectTestEvidence(
  JSON.parse(readFileSync('.test-report/phase-one/cache-disabled.json', 'utf8')),
);
if (tests.passed !== 578 || tests.files.length !== 46) throw Error('Unexpected regression totals');
for (const [path, count] of [
  ['tests/isolation/membership.test.ts', 31],
  ['tests/http/ownership-route.test.ts', 12],
  ['tests/tenant/ownership-transfer.test.ts', 8],
  ['tests/isolation/ownership-provider.test.ts', 1],
  ['tests/isolation/auth-lifecycle-provider.test.ts', 4],
] as const) {
  if (tests.files.find((file) => file.path === path)?.cases.length !== count)
    throw Error('Required ownership or recovery evidence is absent');
}
const native = projectOwnershipEvidence(
  JSON.parse(readFileSync('.test-report/phase-one/ownership-native-qualified.json', 'utf8')),
);
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
  environment:
    'Disposable local PostgreSQL, Supabase Auth and captured mail; native browser ownership review',
  baseCommit: '3857988424d166518b515c92c425bd11e547a6d1',
  scope: 'Owner review, password-proof identity, transfer readback and recovery recipients',
  passed: tests.passed,
  files: tests.files.length,
  ownershipRouteCases: 12,
  ownershipOutcomeCases: 8,
  recoveryProviderCases: 4,
  ownershipProviderCases: 1,
  results: publish('ownership-recovery-regression.json', tests),
  native: publish('ownership-recovery-browser.json', native),
  limits:
    'Native ownership uses actual sign-in, cookies, Auth and database reads. Recovery-recipient cases use actual Auth, database and captured mail, with a disposable cookie adapter. Uncertain ownership replies are covered by client outcome cases, not native fault injection. Colleague invitations, remaining account and OAuth journeys, wider failure-state acceptance and external delivery remain open. The separately pinned service results are unchanged.',
};
const manifest = publish('ownership-recovery-manifest.json', checkpoint);
writeFileSync(
  'src/lib/presentation/ownershipVerification.json',
  JSON.stringify({ ...checkpoint, manifest }, null, 2) + '\n',
);
console.log(
  'Published independent 578-case ownership/recovery checkpoint; private identifiers remain excluded.',
);
