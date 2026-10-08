import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { z } from 'zod';
import {
  projectTestEvidence,
  projectCredentialEvidence,
} from '../src/lib/presentation/verificationEvidence';

const root = 'public/verification/2026-10-08';
mkdirSync(root, { recursive: true });
const digest = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');
const readJson = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8'));
function imageSize(bytes: Buffer) {
  if (bytes.readUInt32BE(0) === 0x89504e47)
    return { extension: 'png', width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  if (bytes.readUInt16BE(0) !== 0xffd8) throw Error('Unsupported reviewed image');
  for (let offset = 2; offset + 9 < bytes.length;) {
    if (bytes[offset] !== 0xff) throw Error('Invalid JPEG marker');
    const marker = bytes[offset + 1];
    if (marker === 0xc0 || marker === 0xc2)
      return {
        extension: 'jpg',
        width: bytes.readUInt16BE(offset + 7),
        height: bytes.readUInt16BE(offset + 5),
      };
    const length = bytes.readUInt16BE(offset + 2);
    if (length < 2) throw Error('Invalid JPEG segment');
    offset += length + 2;
  }
  throw Error('Reviewed image dimensions unavailable');
}
function publish(name: string, value: unknown) {
  const bytes = JSON.stringify(value, null, 2) + '\n';
  writeFileSync(`${root}/${name}`, bytes);
  return { path: `/verification/2026-10-08/${name}`, sha256: digest(bytes) };
}

const tests = projectTestEvidence(
  readJson('.test-report/phase-one/rules-qualified-application/cache-disabled.json'),
);
const candidate = projectTestEvidence(
  readJson('.test-report/phase-one/tracker-evidence-full.json'),
);
if (candidate.passed !== 519 || candidate.files.length !== 41)
  throw Error('Unexpected current local regression');
if (tests.passed !== 506 || tests.files.length !== 39)
  throw Error('Unexpected qualified application checkpoint');
const propagation = z
  .object({
    passed: z.literal(true),
    maximumMs: z.number().finite().nonnegative(),
    samples: z.array(
      z.object({
        operation: z.string().regex(/^(?:tenant|master)\.(?:publish|restore)\.[1-3]$/),
        operationStartToReadMs: z.number().finite().nonnegative(),
        publicationResolvedToReadMs: z.number().finite().nonnegative(),
        status: z.literal(200),
      }),
    ),
  })
  .parse(
    readJson(
      '.test-report/phase-one/rules-service-ci/platform/.test-report/phase-one/rules-propagation.json',
    ),
  );
const bridge = z
  .object({
    passed: z.literal(true),
    samples: z.array(
      z.object({
        case: z.enum(['/service/v1/tenant', '/service/v1/ai-rules']),
        status: z.union([z.literal(200), z.literal(304), z.literal(403), z.literal(401)]),
        elapsedMs: z.number().finite().nonnegative(),
      }),
    ),
  })
  .parse(
    readJson(
      '.test-report/phase-one/rules-service-ci/platform/.test-report/phase-one/service-cross-runtime.json',
    ),
  );
if (
  !propagation.passed ||
  propagation.samples.length !== 12 ||
  propagation.maximumMs >= 5000 ||
  !bridge.passed ||
  bridge.samples.length !== 5
)
  throw Error('Service checkpoint is not qualified');
const audit = z
  .object({ dependencies: z.array(z.object({ vulns: z.array(z.unknown()) })) })
  .parse(readJson('.test-report/phase-one/rules-service-audit/python-audit.json'));
if (
  audit.dependencies.length !== 21 ||
  audit.dependencies.some((item: { vulns: unknown[] }) => item.vulns.length)
)
  throw Error('Runtime audit is not qualified');
const cleanup = z
  .object({
    allFixtureCredentialsRevoked: z.literal(true),
    temporaryFloorRestored: z.literal(true),
    serviceStatus: z.literal(401),
  })
  .parse(readJson('.test-report/phase-one/native-rules-cleanup.json'));
if (
  !cleanup.allFixtureCredentialsRevoked ||
  !cleanup.temporaryFloorRestored ||
  cleanup.serviceStatus !== 401
)
  throw Error('Fixture cleanup is not qualified');

const images = [
  [
    'rules-desktop-restored-final.png',
    'Recorded instructions and version history',
    'Desktop, 1440px',
  ],
  ['rules-phone-comparison.png', 'Readable line comparison', 'Phone, 390px'],
  ['rules-phone-restore-review.png', 'Restoration review and background blur', 'Phone, 390px'],
  [
    'rules-stale-focus-final.png',
    'Stale draft retained after refusal',
    'Keyboard and conflict state',
  ],
  [
    'rules-activity-final.png',
    'Restored versions and reasons in Activity',
    'Recorded customer changes',
  ],
].map(([name, title, context]) => {
  const bytes = readFileSync(`.test-report/phase-one/auth-20261008/${name}`);
  const dimensions = imageSize(bytes);
  const publicName = name!.replace(/\.png$/, `.${dimensions.extension}`);
  writeFileSync(`${root}/${publicName}`, bytes);
  return {
    title: title!,
    context: context!,
    path: `/verification/2026-10-08/${publicName}`,
    width: dimensions.width,
    height: dimensions.height,
    sha256: digest(bytes),
  };
});
const manifest = {
  date: '8 October 2026',
  qualification:
    'Verified development checkpoint. Production launch and final handover remain open.',
  localCandidate: {
    baseCommit: 'e68b4a414659a82cac123ee66f965a9a9c67a5b8',
    scope:
      'Tracker, evidence and document-navigation follow-up, verified locally before publication',
    environment: 'Disposable local provider, restricted database role, cache disabled',
    passed: candidate.passed,
    files: candidate.files.length,
    failed: candidate.failed,
    skipped: candidate.skipped,
    results: publish('current-local-tests.json', candidate),
  },
  application: {
    commit: '275a0ad33ab95730ea0cc53467d676c242781520',
    ci: 'https://github.com/Charanos/aLcassa/actions/runs/37783667886',
    deployment: 'https://vercel.com/dennis-munges-projects/a-lcassa/J1WJGqCA1eTa8z7vd3GN1FEN7BKC',
    jobs: 6,
    passed: tests.passed,
    files: tests.files.length,
    failed: tests.failed,
    skipped: tests.skipped,
    results: publish('application-tests.json', tests),
  },
  service: {
    commit: '46ddcf3b18e0c6c994c2c07ea8ab1641d00e23f4',
    pinnedApplicationCommit: '275a0ad33ab95730ea0cc53467d676c242781520',
    ci: 'https://github.com/Charanos/alcassa-service/actions/runs/37783721097',
    jobs: 2,
    unitCases: 9,
    databaseCases: 21,
    bridgeChecks: 5,
    propagationChecks: 12,
    maximumPropagationMs: propagation.maximumMs,
    audit: { dependencies: 21, vulnerableDependencies: 0 },
    results: publish('service-checks.json', {
      environment: 'Disposable Linux CI provider and FastAPI on loopback',
      hostedServiceQualified: false,
      bridge: bridge.samples.map((sample: { case: string; status: number; elapsedMs: number }) => ({
        route: sample.case,
        status: sample.status,
        elapsedMs: sample.elapsedMs,
      })),
      propagation: propagation.samples.map(
        (sample: {
          operation: string;
          operationStartToReadMs: number;
          publicationResolvedToReadMs: number;
          status: number;
        }) => ({
          operation: sample.operation,
          invocationToReadMs: sample.operationStartToReadMs,
          committedResponseToReadMs: sample.publicationResolvedToReadMs,
          status: sample.status,
        }),
      ),
    }),
  },
  browser: {
    environment: 'Disposable local owner workspace',
    cleanup:
      'All test credentials revoked; original platform pointer restored; workspace history preserved.',
    credentials: publish('native-credentials.json', {
      lifecycle: projectCredentialEvidence(
        readJson('.test-report/phase-one/native-credential-readback.json'),
      ),
      focusReplay: projectCredentialEvidence(
        readJson('.test-report/phase-one/native-focus-readback.json'),
      ),
      clipboardReadbackQualified: false,
    }),
    images,
  },
};
publish('manifest.json', manifest);
writeFileSync(
  'src/lib/presentation/verificationRecord.json',
  JSON.stringify(manifest, null, 2) + '\n',
);
console.log(
  `Published redacted evidence: ${tests.passed} cases, ${images.length} reviewed images, 12 propagation samples. No raw logs or private fixtures copied.`,
);
