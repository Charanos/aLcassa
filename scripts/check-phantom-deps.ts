#!/usr/bin/env tsx
/**
 * PHANTOM DEPENDENCY CHECK.
 *
 * ⚠ THIS EXISTS BECAUSE A PHANTOM DEPENDENCY BROKE A PRODUCTION DEPLOY.
 *
 * `drizzle.config.ts` and five other files imported `dotenv`, which
 * `package.json` had never declared. Under npm that worked: its flat
 * `node_modules` hoists every transitive dependency to the top level, so
 * anything anywhere in the tree is importable by anything else. `drizzle-kit`
 * depends on dotenv, so dotenv appeared, and nobody noticed for months.
 *
 * pnpm links only what is declared — that is the point of it — so the moment
 * the lockfile changed, the Vercel build failed with "Cannot find module
 * 'dotenv'". The same scan found `server-only` in the same state, imported by
 * 34 files and declared by none; it survived only because Next's bundler
 * aliases it internally.
 *
 * Both are now declared. This script is what stops the next one reaching a
 * deploy: it runs in CI, and an undeclared import fails the build in ten
 * seconds rather than after a push to production.
 *
 *   pnpm check:deps
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

type Pkg = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as Pkg;

const declared = new Set([
  ...Object.keys(pkg.dependencies ?? {}),
  ...Object.keys(pkg.devDependencies ?? {}),
  ...Object.keys(pkg.peerDependencies ?? {}),
]);

/**
 * ⚠ MATCHES IMPORT STATEMENTS, NOT THE WORD "import" ANYWHERE.
 *
 * The first version of this scan matched `from '...'` inside comments and
 * string literals, and duly reported `not signed in` and
 * `99.82% because it wobbles every third day` as missing packages. Anchoring
 * to the start of a line and requiring a plausible package name is what makes
 * the output worth reading — a checker that cries wolf is a checker somebody
 * switches off.
 */
const IMPORT = /^\s*(?:import|export)\s[^'"]*from\s*['"]([^'"]+)['"]/gm;
const BARE_IMPORT = /^\s*import\s+['"]([^'"]+)['"]/gm;
const REQUIRE = /\brequire\(\s*['"]([^'"]+)['"]\s*\)/g;

/** A package specifier: no spaces, no punctuation prose. */
const PACKAGE_NAME = /^(?:@[a-z0-9][\w.-]*\/)?[a-z0-9][\w.-]*(?:\/.*)?$/i;

const IGNORED = new Set([
  // Node builtins reachable without the `node:` prefix.
  'fs',
  'path',
  'crypto',
  'util',
  'os',
  'url',
  'http',
  'https',
  'stream',
  'buffer',
  'events',
  'child_process',
  'zlib',
  'assert',
  'process',
  'perf_hooks',
  'timers',
  'querystring',
  'string_decoder',
  'worker_threads',
]);

const files: string[] = [];
function walk(dir: string): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.next', '.git', 'dist'].includes(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|tsx|mts|mjs)$/.test(entry.name)) files.push(full);
  }
}
walk('.');

const phantoms = new Map<string, Set<string>>();

for (const file of files) {
  const source = readFileSync(file, 'utf8');
  const specifiers = [
    ...[...source.matchAll(IMPORT)].map((m) => m[1]),
    ...[...source.matchAll(BARE_IMPORT)].map((m) => m[1]),
    ...[...source.matchAll(REQUIRE)].map((m) => m[1]),
  ].filter((s): s is string => Boolean(s));

  for (const spec of specifiers) {
    // Relative, the `@/` alias, node: builtins, and anything that is not a
    // plausible package name.
    if (spec.startsWith('.') || spec.startsWith('/')) continue;
    if (spec.startsWith('@/')) continue;
    if (spec.startsWith('node:')) continue;
    if (!PACKAGE_NAME.test(spec)) continue;

    const name = spec.startsWith('@')
      ? spec.split('/').slice(0, 2).join('/')
      : (spec.split('/')[0] ?? spec);

    if (IGNORED.has(name) || declared.has(name)) continue;

    if (!phantoms.has(name)) phantoms.set(name, new Set());
    phantoms.get(name)?.add(file.replace(/\\/g, '/').replace(/^\.\//, ''));
  }
}

if (phantoms.size === 0) {
  console.log(`✓ dependency check passed · ${files.length} files, every import is declared`);
  process.exit(0);
}

console.error(`\n✗ ${phantoms.size} PHANTOM DEPENDENCY(IES) — imported but not in package.json\n`);
for (const [name, where] of [...phantoms].sort(([a], [b]) => a.localeCompare(b))) {
  console.error(`  ${name}`);
  for (const file of [...where].sort()) console.error(`      ${file}`);
  console.error('');
}
console.error(
  'These may resolve today by accident — a transitive dependency happens to\n' +
    'provide them — and will stop the moment that dependency changes. Declare\n' +
    'each one, or stop importing it.\n',
);
process.exit(1);
