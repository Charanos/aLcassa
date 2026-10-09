/** Publish bounded local account and layout receipts, excluding identities, links and private diagnostics. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { z } from 'zod';

const read = (name: string): unknown =>
  JSON.parse(readFileSync(`.test-report/phase-one/${name}.json`, 'utf8'));
const accounts = z
  .object({
    checkedAt: z.string().datetime(),
    localOnly: z.literal(true),
    productionBuild: z.literal(true),
    checks: z.array(z.string().max(250)).length(7),
    passed: z.literal(true),
    fixtureCleanup: z.literal(true),
    boundary: z.string().max(700),
  })
  .parse(read('account-workflows'));
assert(!/@|\/invite\/|Bearer |PRIVATE_|alc_(live|test)_/.test(JSON.stringify(accounts)));
const layout = z
  .object({
    checkedAt: z.string().datetime(),
    localOnly: z.literal(true),
    productionBuild: z.literal(true),
    source: z.object({
      path: z.literal('src/app/(tenant)/app/settings/audit/page.tsx'),
      sha256: z.string().regex(/^[a-f0-9]{64}$/),
    }),
    applicationBuildId: z.string().max(80),
    rows: z
      .array(
        z.object({
          width: z.number().int(),
          overflowPx: z.number().int().min(0).max(1),
          timeSeparated: z.literal(true),
          referenceKeyboardAccessible: z.literal(true),
        }),
      )
      .length(3),
    fixtureCleanup: z.literal(true),
    passed: z.literal(true),
    boundary: z.string().max(700),
  })
  .parse(read('activity-layout'));
assert.deepEqual(
  layout.rows.map((row) => row.width),
  [320, 390, 1440],
);
const sha = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');
assert.equal(sha(readFileSync(layout.source.path)), layout.source.sha256);
const root = '/verification/2026-10-10';
mkdirSync(`public${root}`, { recursive: true });
function publish(name: string, value: unknown) {
  const bytes = Buffer.from(JSON.stringify(value, null, 2) + '\n');
  const path = `${root}/${name}.json`;
  if (existsSync(`public${path}`) && !readFileSync(`public${path}`).equals(bytes))
    throw new Error('Published receipt is immutable.');
  writeFileSync(`public${path}`, bytes);
  return { path, sha256: sha(bytes) };
}
const results = publish('account-workflows-results', {
  accounts,
  layout,
  sourceFiles: [
    'scripts/verification-account-workflows.ts',
    'scripts/verification-activity-layout.ts',
  ].map((path) => ({ path, sha256: sha(readFileSync(path)) })),
});
const summary = {
  date: '10 October 2026',
  workflowChecks: 7,
  layoutWidths: [320, 390, 1440],
  scope:
    'Actual browser password reauthentication, update, provider readback and device revocation; new and existing colleague acceptance, wrong-account refusal, renewal and withdrawal with seat readback. Narrow Activity layout and keyboard disclosure are verified separately.',
  limits: accounts.boundary + ' Complete accessibility and CRUD acceptance remain open.',
  results,
};
const manifest = publish('account-workflows-manifest', summary);
writeFileSync(
  'src/lib/presentation/accountWorkflowsVerification.json',
  JSON.stringify({ ...summary, manifest }, null, 2) + '\n',
);
process.stdout.write('Published seven owned account workflows and three Activity layout checks.\n');
