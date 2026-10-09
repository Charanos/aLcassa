import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import {
  projectAuthNavigationEvidence,
  projectTestEvidence,
} from '../src/lib/presentation/verificationEvidence';

const root = 'public/verification/2026-10-09';
mkdirSync(root, { recursive: true });
const tests = projectTestEvidence(
  JSON.parse(readFileSync('.test-report/phase-one/cache-disabled.json', 'utf8')),
);
if (tests.passed !== 605 || tests.files.length !== 49) throw Error('Unexpected regression totals');
for (const [path, count] of [
  ['tests/auth/request-origin.test.ts', 15],
  ['tests/auth/middleware-origin.test.ts', 4],
  ['tests/auth/email-confirmation.test.ts', 12],
  ['tests/auth/sign-in-return.test.ts', 3],
] as const) {
  if (tests.files.find((file) => file.path === path)?.cases.length !== count)
    throw Error('Required origin checks are absent');
}
const native = projectAuthNavigationEvidence(
  JSON.parse(readFileSync('.test-report/phase-one/auth-navigation-native-qualified.json', 'utf8')),
);
const images = [
  {
    name: 'auth-signed-out-desktop.jpg',
    label: 'Signed-out entry on desktop',
    width: 1280,
    height: 800,
  },
  {
    name: 'auth-recovery-phone.jpg',
    label: 'Generic recovery response at 390px',
    width: 390,
    height: 843,
  },
].map(({ name, label, width, height }) => {
  const bytes = readFileSync(`${root}/${name}`);
  if (bytes.readUInt16BE(0) !== 0xffd8) throw Error('Reviewed evidence image must be JPEG');
  return {
    path: `/verification/2026-10-09/${name}`,
    label,
    width,
    height,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  };
});
function publish(name: string, value: unknown) {
  const bytes = JSON.stringify(value, null, 2) + '\n';
  const path = `${root}/${name}`;
  if (existsSync(path) && readFileSync(path, 'utf8') !== bytes)
    throw Error('Published evidence is immutable; use another checkpoint');
  writeFileSync(path, bytes);
  return {
    path: `/verification/2026-10-09/${name}`,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  };
}
const checkpoint = {
  date: '9 October 2026',
  baseCommit: '8b2de0507ab6fe0265026eeabfef769f5586473c',
  environment:
    'Production build with disposable local Supabase Auth, PostgreSQL and native browser navigation',
  passed: tests.passed,
  files: tests.files.length,
  scope: 'G03 local sign-in, sign-out, protected deep links and same-origin email confirmation',
  results: publish('auth-navigation-regression.json', tests),
  native: publish('auth-navigation-browser.json', native),
  images,
  limits:
    'Native navigation is qualified on IPv4 loopback, with built HTTP checks on IPv4 and localhost and IPv6 route/unit coverage. Email proof guards include expired-code refusal; this checkpoint adds no native password change, colleague invitation acceptance or Google OAuth acceptance. Remaining G01/G03 journeys, wider failure states and operational gates stay open. Local captured mail is separate from external email delivery; service evidence retains its prior pin.',
};
const manifest = publish('auth-navigation-manifest.json', checkpoint);
writeFileSync(
  'src/lib/presentation/authNavigationVerification.json',
  JSON.stringify({ ...checkpoint, manifest }, null, 2) + '\n',
);
console.log('Published bounded Auth navigation checkpoint and immutable evidence index.');
