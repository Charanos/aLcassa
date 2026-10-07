import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  assessAudit,
  assertBracesRegression,
  BRACES_ADVISORY,
  verifyBracesRemediation,
  type BracesApi,
} from '../../scripts/security/braces-remediation';

const finding = {
  github_advisory_id: BRACES_ADVISORY,
  module_name: 'braces',
  severity: 'high' as const,
  findings: [
    {
      version: '3.0.3',
      paths: [
        '. > eslint-config-next@15.5.27 > @next/eslint-plugin-next@15.5.27 > fast-glob@3.3.1 > micromatch@4.0.8 > braces@3.0.3',
      ],
    },
  ],
};
const report = () => ({
  advisories: { braces: finding },
  muted: [],
  metadata: { vulnerabilities: { info: 0, low: 0, moderate: 0, high: 1, critical: 0 } },
});
const temporaryRoots: string[] = [];
afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});
function copiedPatch(): string {
  const root = mkdtempSync(join(tmpdir(), 'alcassa-security-'));
  temporaryRoots.push(root);
  for (const file of [
    'package.json',
    'verification/security/braces.json',
    'patches/braces@3.0.3.patch',
  ]) {
    const target = join(root, file);
    mkdirSync(join(target, '..'), { recursive: true });
    writeFileSync(target, readFileSync(file));
  }
  return root;
}

describe('Dependency security gate', () => {
  it('retains the raw high advisory and proves the installed remediation', () => {
    expect(assessAudit(report())).toEqual({
      raw: report().metadata.vulnerabilities,
      remediated: [BRACES_ADVISORY],
      unresolved: [],
    });
  });
  it('blocks every unrelated moderate-or-higher advisory', () => {
    const input = report();
    const unrelated = {
      ...finding,
      github_advisory_id: 'GHSA-new-finding',
      module_name: 'another',
    };
    input.metadata.vulnerabilities.high = 2;
    expect(
      assessAudit({ ...input, advisories: { ...input.advisories, unrelated } }).unresolved,
    ).toEqual(['GHSA-new-finding']);
  });
  it('rejects registry errors, incomplete counts and muted findings', () => {
    expect(() => assessAudit({ error: 'Registry unavailable' })).toThrow();
    expect(() => assessAudit({ ...report(), advisories: {} })).toThrow(/Incomplete high/);
    expect(() => assessAudit({ ...report(), muted: [finding] })).toThrow();
  });
  it('fails if patch bytes or declaration drift', () => {
    const root = copiedPatch();
    writeFileSync(join(root, 'patches/braces@3.0.3.patch'), 'modified patch');
    expect(() => verifyBracesRemediation(finding, root)).toThrow();
    writeFileSync(
      join(root, 'package.json'),
      JSON.stringify({ pnpm: { patchedDependencies: {} } }),
    );
    expect(() => verifyBracesRemediation(finding, root)).toThrow();
  });
  it('refuses an unexpected package version or an unresolved audit path', () => {
    expect(() =>
      verifyBracesRemediation({
        ...finding,
        findings: [{ version: '3.0.4', paths: ['. > braces@3.0.4'] }],
      }),
    ).toThrow();
    expect(() =>
      verifyBracesRemediation({
        ...finding,
        findings: [{ version: '3.0.3', paths: ['. > missing-package@1.0.0 > braces@3.0.3'] }],
      }),
    ).toThrow();
  });
  it('does not accept the original stack overflow as a controlled rejection', () => {
    const overflow = () => {
      throw new RangeError('Maximum call stack size exceeded');
    };
    const original: BracesApi = {
      parse: overflow,
      compile: overflow,
      expand: overflow,
      stringify: overflow,
    };
    expect(() => assertBracesRegression(original)).toThrow();
  });
});
