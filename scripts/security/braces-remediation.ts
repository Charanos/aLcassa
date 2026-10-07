import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { z } from 'zod';

export const BRACES_ADVISORY = 'GHSA-vfj7-8cjw-p6xm';
const digest = (data: Buffer) => createHash('sha256').update(data).digest('hex');
const severities = ['info', 'low', 'moderate', 'high', 'critical'] as const;
const severitySchema = z.enum(severities);
const advisorySchema = z.object({
  github_advisory_id: z.string(),
  module_name: z.string(),
  severity: severitySchema,
  findings: z.array(z.object({ version: z.string(), paths: z.array(z.string()).min(1) })).min(1),
});
const reportSchema = z.object({
  advisories: z.record(advisorySchema),
  muted: z.array(z.unknown()).max(0),
  metadata: z.object({
    vulnerabilities: z.object({
      info: z.number().int().nonnegative(),
      low: z.number().int().nonnegative(),
      moderate: z.number().int().nonnegative(),
      high: z.number().int().nonnegative(),
      critical: z.number().int().nonnegative(),
    }),
  }),
});
type Advisory = z.infer<typeof advisorySchema>;
export type BracesApi = {
  parse: (pattern: string) => unknown;
  compile: (pattern: unknown) => unknown;
  expand: (pattern: unknown) => unknown;
  stringify: (pattern: unknown) => unknown;
};

/** Prove the failure mode and representative existing glob behavior. */
export function assertBracesRegression(api: BracesApi): void {
  const pattern = '{'.repeat(4_000) + 'a,b' + '}'.repeat(4_000);
  const parens = '('.repeat(4_000) + 'a' + ')'.repeat(4_000);
  const mixed = '{('.repeat(51) + 'a,b' + ')}'.repeat(51);
  for (const method of [api.parse, api.compile, api.expand, api.stringify]) {
    for (const input of [pattern, parens, mixed]) {
      assert.throws(() => method(input), { name: 'SyntaxError', message: /maximum depth/ });
    }
  }
  const boundary = '{'.repeat(100) + 'a,b' + '}'.repeat(100);
  assert.equal(api.stringify(boundary), boundary);
  for (const method of [api.parse, api.compile, api.expand, api.stringify]) {
    assert.doesNotThrow(() => method(boundary));
    assert.throws(() => method(`{${boundary}}`), { name: 'SyntaxError' });
  }
  const makeAst = () => {
    let node: { type: string; value?: string; nodes?: unknown[] } = { type: 'text', value: 'x' };
    for (let depth = 0; depth < 150; depth++) node = { type: 'root', nodes: [node] };
    return node;
  };
  for (const method of [api.compile, api.expand, api.stringify]) {
    assert.throws(() => method(makeAst()), { name: 'SyntaxError', message: /maximum depth/ });
  }
  assert.equal(api.compile('src/{app,lib}/**/*.{ts,tsx}'), 'src/(app|lib)/**/*.(ts|tsx)');
  assert.deepEqual(api.expand('file-{1..3}.{ts,tsx}'), [
    'file-1.ts',
    'file-1.tsx',
    'file-2.ts',
    'file-2.tsx',
    'file-3.ts',
    'file-3.tsx',
  ]);
  assert.equal(api.stringify('a/\\{literal\\}/b'), 'a/{literal}/b');
  assert.equal(api.stringify('"{quoted}"'), '{quoted}');
}

/** Resolve every affected dependency path, rather than an unrelated hoisted copy. */
export function verifyBracesRemediation(advisory: Advisory, root = process.cwd()): void {
  assert.equal(advisory.module_name, 'braces');
  assert.equal(advisory.github_advisory_id, BRACES_ADVISORY);
  const manifest = z
    .object({
      advisory: z.literal(BRACES_ADVISORY),
      version: z.literal('3.0.3'),
      patch: z.literal('patches/braces@3.0.3.patch'),
      patchSha256: z.string().regex(/^[a-f0-9]{64}$/),
      files: z.record(z.string().regex(/^[a-f0-9]{64}$/)),
    })
    .parse(JSON.parse(readFileSync(resolve(root, 'verification/security/braces.json'), 'utf8')));
  const pkg = z
    .object({
      pnpm: z.object({ patchedDependencies: z.record(z.string()) }),
    })
    .parse(JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')));
  assert.equal(pkg.pnpm.patchedDependencies['braces@3.0.3'], manifest.patch);
  assert.equal(digest(readFileSync(resolve(root, manifest.patch))), manifest.patchSha256);
  assert.deepEqual(
    Object.keys(manifest.files).sort(),
    [
      'index.js',
      'lib/compile.js',
      'lib/constants.js',
      'lib/expand.js',
      'lib/parse.js',
      'lib/stringify.js',
      'lib/utils.js',
    ].sort(),
  );
  const checked = new Set<string>();
  for (const finding of advisory.findings) {
    assert.equal(finding.version, manifest.version);
    for (const path of finding.paths) {
      const segments = path.split(' > ');
      assert.equal(segments.shift(), '.');
      let localRequire = createRequire(resolve(root, 'package.json'));
      let entry = '';
      for (const segment of segments) {
        const name = segment.replace(/@[^@]+$/, '');
        assert.match(name, /^(?:@[a-z0-9_.-]+\/)?[a-z0-9_.-]+$/i);
        entry = localRequire.resolve(`${name}/package.json`);
        localRequire = createRequire(entry);
      }
      assert.ok(entry, 'Audit must identify an installed dependency path.');
      if (checked.has(entry)) continue;
      const installed = JSON.parse(readFileSync(entry, 'utf8')) as {
        name: string;
        version: string;
      };
      assert.equal(installed.name, 'braces');
      assert.equal(installed.version, manifest.version);
      for (const [file, hash] of Object.entries(manifest.files)) {
        assert.equal(
          digest(readFileSync(resolve(dirname(entry), file))),
          hash,
          `Patch mismatch: ${file}`,
        );
      }
      const api = localRequire('./index.js') as BracesApi;
      assertBracesRegression(api);
      checked.add(entry);
    }
  }
  assert.ok(checked.size > 0, 'No remediated installed copy was verified.');
}

/** Never accept missing findings, muted entries or inconsistent audit totals. */
export function assessAudit(input: unknown, verify = verifyBracesRemediation) {
  const report = reportSchema.parse(input);
  const advisories = Object.values(report.advisories);
  for (const severity of severities) {
    assert.equal(
      advisories.filter((a) => a.severity === severity).length,
      report.metadata.vulnerabilities[severity],
      `Incomplete ${severity} audit findings`,
    );
  }
  const unresolved: string[] = [];
  const remediated: string[] = [];
  for (const advisory of advisories) {
    if (advisory.github_advisory_id === BRACES_ADVISORY) {
      verify(advisory);
      remediated.push(advisory.github_advisory_id);
    } else if (['moderate', 'high', 'critical'].includes(advisory.severity)) {
      unresolved.push(advisory.github_advisory_id);
    }
  }
  return { raw: report.metadata.vulnerabilities, remediated, unresolved };
}
