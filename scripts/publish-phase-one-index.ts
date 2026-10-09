/** One verified download index for immutable Phase One checkpoints, including retained failures. */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { z } from 'zod';

const digest = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const checkpoint = z.object({
  manifest: z.object({
    path: z.string().regex(/^\/verification\/2026-10-(08|09|10)\/[a-z0-9-]+\.json$/),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
  }),
});
const sources = [
  'membershipVerification',
  'accountVerification',
  'ownershipVerification',
  'authNavigationVerification',
  'deviceSessionsVerification',
  'accountHardeningVerification',
  'serviceUsageVerification',
  'serviceBudgetVerification',
  'operationalGatesVerification',
  'operationalFollowupVerification',
  'accountWorkflowsVerification',
];
const checkpoints = sources.map((source) => {
  const { manifest } = checkpoint.parse(
    JSON.parse(readFileSync(`src/lib/presentation/${source}.json`, 'utf8')),
  );
  if (digest(readFileSync(`public${manifest.path}`)) !== manifest.sha256)
    throw new Error('Checkpoint fingerprint does not match.');
  return { checkpoint: source, ...manifest };
});
const original = '/verification/2026-10-08/manifest.json';
checkpoints.unshift({
  checkpoint: 'verificationRecord',
  path: original,
  sha256: digest(readFileSync(`public${original}`)),
});
const bytes = Buffer.from(
  JSON.stringify(
    {
      date: '10 October 2026',
      checkpoints,
      boundary:
        'Immutable historical and current local checkpoints. Each checkpoint states its scope, failed samples and release qualification. This index does not claim all milestones or the newest source revision have passed CI.',
    },
    null,
    2,
  ) + '\n',
);
const path = '/verification/2026-10-10/phase-one-evidence-index.json';
if (existsSync(`public${path}`) && !readFileSync(`public${path}`).equals(bytes))
  throw new Error('Published receipt is immutable.');
writeFileSync(`public${path}`, bytes);
writeFileSync(
  'src/lib/presentation/phaseOneEvidenceIndex.json',
  JSON.stringify(
    {
      date: '10 October 2026',
      checkpointCount: checkpoints.length,
      manifest: { path, sha256: digest(bytes) },
    },
    null,
    2,
  ) + '\n',
);
process.stdout.write(`Published complete evidence index: ${checkpoints.length} checkpoints.\n`);
