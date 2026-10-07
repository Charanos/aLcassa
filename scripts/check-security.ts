import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { assessAudit } from './security/braces-remediation';

try {
  const pnpm = process.env.npm_execpath;
  if (!pnpm) throw new Error('Run with pnpm check:security to use the pinned package manager.');
  const result = spawnSync(process.execPath, [pnpm, 'audit', '--json'], {
    encoding: 'utf8',
    timeout: 120_000,
    maxBuffer: 10 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.signal || ![0, 1].includes(result.status ?? -1)) {
    throw new Error('The registry audit did not complete.');
  }
  const raw: unknown = JSON.parse(result.stdout.slice(result.stdout.indexOf('{')));
  mkdirSync('.test-report/security', { recursive: true });
  writeFileSync('.test-report/security/raw-audit.json', JSON.stringify(raw, null, 2));
  const summary = assessAudit(raw);
  writeFileSync('.test-report/security/assessment.json', JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  if (summary.unresolved.length)
    throw new Error('Unresolved moderate-or-higher dependency advisories.');
  console.log('Security gate passed; raw findings retained and local remediation verified.');
} catch (error) {
  console.error(
    error instanceof Error ? error.message : 'Dependency security verification failed.',
  );
  process.exitCode = 1;
}
