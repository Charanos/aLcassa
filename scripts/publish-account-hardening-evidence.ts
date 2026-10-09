import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { projectTestEvidence } from '../src/lib/presentation/verificationEvidence';

const results = projectTestEvidence(
  JSON.parse(readFileSync('.test-report/phase-one/cache-disabled.json', 'utf8')),
);
if (results.passed !== 626 || results.files.length !== 54 || results.failed || results.skipped)
  throw Error('Unexpected combined regression results');
for (const [path, count] of [
  ['tests/http/invitation-identity.test.ts', 8],
  ['tests/tenant/credential-download.test.ts', 1],
  ['tests/isolation/device-sessions.test.ts', 6],
  ['tests/isolation/sign-out-provider.test.ts', 1],
] as const)
  if (results.files.find((file) => file.path === path)?.cases.length !== count)
    throw Error('Required account verification absent');
function publish(name: string, value: unknown) {
  const path = `/verification/2026-10-09/${name}`;
  const bytes = Buffer.from(JSON.stringify(value, null, 2) + '\n');
  if (existsSync(`public${path}`) && !readFileSync(`public${path}`).equals(bytes))
    throw Error('Published evidence is immutable');
  writeFileSync(`public${path}`, bytes);
  return { path, sha256: createHash('sha256').update(bytes).digest('hex') };
}
const checkpoint = {
  date: '9 October 2026',
  environment: 'Disposable local verification; cache disabled',
  passed: 626,
  files: 54,
  results: publish('account-hardening-regression.json', results),
  scope:
    'Invitation identity guards, safe credential export metadata and device-session regression.',
  limits:
    'Invitation routes use controlled provider responses. Native invitation acceptance, clipboard and download feedback, complete password change, external OAuth and durable service usage remain open. Separate device-session evidence records real provider and native browser checks.',
};
const manifest = publish('account-hardening-manifest.json', checkpoint);
writeFileSync(
  'src/lib/presentation/accountHardeningVerification.json',
  JSON.stringify({ ...checkpoint, manifest }, null, 2) + '\n',
);
