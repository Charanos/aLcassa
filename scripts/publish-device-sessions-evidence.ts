import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { projectTestEvidence } from '../src/lib/presentation/verificationEvidence';
const root = 'public/verification/2026-10-09';
mkdirSync(root, { recursive: true });
const tests = projectTestEvidence(
  JSON.parse(readFileSync('.test-report/phase-one/cache-disabled.json', 'utf8')),
);
if (tests.passed !== 617 || tests.files.length !== 52 || tests.failed || tests.skipped)
  throw Error('Unexpected regression results');
for (const [path, count] of [
  ['tests/isolation/device-sessions.test.ts', 6],
  ['tests/isolation/sign-out-provider.test.ts', 1],
  ['tests/tenant/session-actions.test.ts', 5],
] as const)
  if (tests.files.find((file) => file.path === path)?.cases.length !== count)
    throw Error('Device gate absent');
const readback = JSON.parse(
  readFileSync('.test-report/phase-one/device-sessions-native-readback.json', 'utf8'),
);
const cleanup = JSON.parse(
  readFileSync('.test-report/phase-one/device-sessions-native-cleanup.json', 'utf8'),
);
if (
  readback.activeSessions !== 1 ||
  readback.endedSessions !== 4 ||
  readback.audits !== 2 ||
  readback.bulkCount !== 3 ||
  readback.actualCurrentSessionPreserved !== true ||
  readback.individualAndBulkAuditMatch !== true ||
  cleanup.fixtureRemoved !== true ||
  cleanup.establishedWorkspacePreserved !== true
)
  throw Error('Native readback or cleanup incomplete');
function publish(name: string, bytes: string | Buffer) {
  const path = `${root}/${name}`;
  const data = Buffer.from(bytes);
  if (existsSync(path) && !readFileSync(path).equals(data))
    throw Error('Published evidence is immutable');
  writeFileSync(path, data);
  return {
    path: `/verification/2026-10-09/${name}`,
    sha256: createHash('sha256').update(data).digest('hex'),
  };
}
function json(name: string, value: unknown) {
  return publish(name, JSON.stringify(value, null, 2) + '\n');
}
function size(bytes: Buffer) {
  if (bytes.readUInt16BE(0) !== 0xffd8) throw Error('JPEG required');
  let offset = 2;
  while (offset < bytes.length) {
    if (bytes[offset] !== 255) throw Error('Invalid JPEG marker');
    while (bytes[offset] === 255) offset++;
    const marker = bytes[offset++]!;
    const length = bytes.readUInt16BE(offset);
    if ([0xc0, 0xc1, 0xc2].includes(marker))
      return { width: bytes.readUInt16BE(offset + 5), height: bytes.readUInt16BE(offset + 3) };
    offset += length;
  }
  throw Error('JPEG dimensions unavailable');
}
const images = [
  ['device-sessions-desktop.jpg', 'Confirmed individual session ending'],
  ['device-sessions-phone-review.jpg', 'Phone bulk review with Cancel focus and blur'],
  ['device-sessions-phone-final.jpg', 'Current browser preserved after bulk ending'],
].map(([name, label]) => {
  const bytes = readFileSync(`.test-report/phase-one/${name}`);
  const dimensions = size(bytes);
  if (name!.includes('phone') && dimensions.width !== 390)
    throw Error('Phone evidence width differs');
  return { ...publish(name!, bytes), label: label!, ...dimensions };
});
const native = json('device-sessions-browser.json', {
  environment: 'Native development browser with disposable Supabase Auth and PostgreSQL',
  outcomes: {
    individualEnded: 1,
    bulkEnded: 3,
    currentSessionsRemaining: 1,
    matchingAudits: 2,
    cancelFocus: true,
    focusReturnedToHeading: true,
    immediateServerReadback: true,
    currentProtectedReload: true,
    phoneViewport: 390,
    phoneDocument: 380,
    backdropBlurPixels: 8,
    fixtureRemoved: true,
    establishedWorkspacePreserved: true,
  },
  limits:
    'Other-device fresh refusal is covered through the real database session resolver. Audit outage, concurrency and uncertain readback are automated cases, not native fault injection. Two actual provider sessions verify local sign-out scope separately. Browser screenshots use owned test data.',
});
const checkpoint = {
  date: '9 October 2026',
  baseCommit: '9236b1a3063ebe177343cc2023298f48a7598503',
  environment:
    'Disposable local provider and restricted PostgreSQL role, with native development-browser review',
  passed: 617,
  files: 52,
  scope: 'G03 individual and bulk device sessions, atomic audit and local provider sign-out',
  results: json('device-sessions-regression.json', tests),
  native,
  images,
  limits:
    'This qualifies the local device-session subset. Complete password-change, colleague invitation and configured OAuth acceptance remain open, alongside service and operational gates. Build and exact release qualification are recorded separately in the ledger.',
};
const manifest = json('device-sessions-manifest.json', checkpoint);
writeFileSync(
  'src/lib/presentation/deviceSessionsVerification.json',
  JSON.stringify({ ...checkpoint, manifest }, null, 2) + '\n',
);
console.log(
  'Published bounded device-session evidence: 617 cases in 52 files, owned fixture removed.',
);
