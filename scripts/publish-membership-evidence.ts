import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { z } from 'zod';
import { projectTestEvidence } from '../src/lib/presentation/verificationEvidence';

/** Publish a separate local checkpoint; historical release evidence remains immutable. */
const root = 'public/verification/2026-10-08';
const read = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8'));
const digest = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');
mkdirSync(root, { recursive: true });
function publish(name: string, value: unknown) {
  const bytes = JSON.stringify(value, null, 2) + '\n';
  writeFileSync(`${root}/${name}`, bytes);
  return { path: `/verification/2026-10-08/${name}`, sha256: digest(bytes) };
}
const tests = projectTestEvidence(read('.test-report/phase-one/cache-disabled.json'));
if (tests.passed !== 545 || tests.files.length !== 43) throw Error('Unexpected regression totals');
for (const [path, count] of [
  ['tests/isolation/membership.test.ts', 21],
  ['tests/tenant/team-actions.test.ts', 5],
] as const) {
  if (tests.files.find((file) => file.path === path)?.cases.length !== count)
    throw Error('Required team gate is absent');
}
const ui = z
  .object({
    localOnly: z.literal(true),
    checkedAt: z.string().datetime(),
    roleReduction: z.object({ result: z.literal('agent'), focus: z.literal('team-members-title') }),
    suspendedRemoval: z.object({
      remainingPeople: z.literal(2),
      seatsUsed: z.literal(3),
      focus: z.literal('team-members-title'),
    }),
    withdrawal: z.object({
      remainingInvitations: z.literal(0),
      seatsUsed: z.literal(2),
      focus: z.literal('team-invitations-title'),
      requiredReload: z.literal(false),
    }),
    phone: z.object({ viewportWidth: z.literal(390), documentWidth: z.literal(380) }),
    review: z.object({ initialFocus: z.literal('Cancel'), backdropBlurPx: z.literal(8) }),
  })
  .parse(read('.test-report/phase-one/team-native-ui.json'));
const database = z
  .object({
    localOnly: z.literal(true),
    members: z
      .array(
        z.object({
          role: z.literal('agent'),
          status: z.enum(['active', 'suspended']),
          removed: z.boolean(),
        }),
      )
      .length(2),
    invitations: z
      .array(z.object({ accepted: z.literal(false), revoked: z.literal(true) }))
      .length(1),
    counters: z.array(z.object({ current_value: z.literal(2) })).length(1),
    audits: z
      .array(
        z.object({
          action: z.enum(['member.role_changed', 'member.removed', 'invitation.revoked']),
          count: z.literal(1),
        }),
      )
      .length(3),
  })
  .parse(read('.test-report/phase-one/team-native-readback.json'));
if (
  new Set(database.audits.map((row) => row.action)).size !== 3 ||
  !database.members.some((row) => row.status === 'active' && !row.removed) ||
  !database.members.some((row) => row.status === 'suspended' && row.removed)
)
  throw Error('Native database outcomes do not reconcile');
const cleanup = z
  .object({
    localOnly: z.literal(true),
    passed: z.literal(true),
    remainingOwnedFixtures: z.literal(0),
    seatsUsed: z.literal(1),
    ownerPreserved: z.literal(true),
  })
  .parse(read('.test-report/phase-one/team-native-cleanup.json'));
const images = [
  ['team-desktop-final.jpg', 'Team desktop after suspended teammate removal'],
  ['team-phone-final.jpg', 'Phone readback after invitation withdrawal'],
  [
    'team-phone-withdraw-review.jpg',
    'Phone withdrawal review with Cancel focus and background blur',
  ],
].map(([name, label]) => {
  const bytes = readFileSync(`.test-report/phase-one/auth-20261008/${name}`);
  if (bytes.length < 10 || bytes.readUInt16BE(0) !== 0xffd8) throw Error('Reviewed JPEG required');
  for (let offset = 2; offset + 9 < bytes.length;) {
    if (bytes[offset] !== 0xff) throw Error('Invalid JPEG marker');
    const marker = bytes[offset + 1];
    if (marker === 0xc0 || marker === 0xc2) {
      const width = bytes.readUInt16BE(offset + 7);
      const height = bytes.readUInt16BE(offset + 5);
      if (width < 300 || height < 500) throw Error('Invalid reviewed dimensions');
      writeFileSync(`${root}/${name}`, bytes);
      return {
        path: `/verification/2026-10-08/${name}`,
        label,
        width,
        height,
        sha256: digest(bytes),
      };
    }
    const length = bytes.readUInt16BE(offset + 2);
    if (length < 2) throw Error('Invalid JPEG segment');
    offset += length + 2;
  }
  throw Error('Reviewed dimensions unavailable');
});
const checkpoint = {
  date: '8 October 2026',
  environment:
    'Disposable local database and development browser; email delivery mocked in module tests',
  baseCommit: '85585cd51ad2b0ec37173df31265b0fccd740995',
  scope:
    'Membership concurrency, current permissions, capacity integrity and confirmed team readback',
  passed: tests.passed,
  files: tests.files.length,
  databaseCases: 21,
  actionCases: 5,
  results: publish('membership-regression.json', tests),
  native: publish('team-native.json', { ui, database, cleanup }),
  images,
};
const manifest = publish('membership-manifest.json', checkpoint);
writeFileSync(
  'src/lib/presentation/membershipVerification.json',
  JSON.stringify({ ...checkpoint, manifest }, null, 2) + '\n',
);
console.log(
  'Published independent 545-case membership checkpoint with bounded native outcomes and reviewed images.',
);
