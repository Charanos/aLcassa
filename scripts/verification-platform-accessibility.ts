/** Owned console fixture, WCAG-tagged browser scans and viewport/zoom checks. */
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import type { ChildProcess } from 'node:child_process';
import { parse } from 'dotenv';
import { chromium, type Browser } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';

async function main() {
  for (const key of [
    'RESEND_API_KEY',
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN',
    'SENTRY_DSN',
    'NEXT_PUBLIC_SENTRY_DSN',
    'AXIOM_TOKEN',
    'AXIOM_DATASET',
    'OPENAI_API_KEY',
    'ALLOW_DEMO_ACCESS',
  ])
    process.env[key] = '';
  Object.assign(process.env, parse(await readFile('.env.verification.local')), {
    CACHE_DISABLED: 'true',
    VERIFICATION_DISPOSABLE: 'true',
    SESSION_COOKIE_PLATFORM: 'alcassa_verify_platform',
    SESSION_COOKIE_TENANT: 'alcassa_verify_tenant',
  });
  assert.equal(process.env.NEXT_PUBLIC_SUPABASE_URL, 'http://127.0.0.1:55421');
  const { httpFixtures, applicationWorker } = await import('./verification-http-fixture');
  const owned = await httpFixtures(1),
    operator = owned.fixtures[0]!;
  let worker: ChildProcess | undefined, browser: Browser | undefined;
  const findings: unknown[] = [];
  const checks: {
    surface: string;
    width: number;
    overflow: number;
    violations: { id: string; impact: string | null | undefined; nodes: number }[];
    incomplete: { id: string; nodes: number }[];
  }[] = [];
  try {
    await mkdir('.test-report/phase-one', { recursive: true });
    await owned.admin`insert into platform_admins(user_id,display_name) values(${operator.userId},'Accessibility verifier')`;
    worker = await applicationWorker(3138);
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:3138/sign-in?next=%2Fplatform', { waitUntil: 'networkidle' });
    await page.getByLabel('Email address').fill(operator.email);
    await page.getByLabel('Password', { exact: true }).fill(operator.password);
    await Promise.all([
      page.waitForURL((url) => url.pathname === '/platform', { waitUntil: 'networkidle' }),
      page.getByRole('button', { name: /^sign in$/i }).click(),
    ]);
    const routes = [
      ['overview', '/platform'],
      ['workspaces', '/platform/tenants'],
      ['provision', '/platform/tenants/new'],
      ['plans', '/platform/plans'],
      ['value', '/platform/revenue'],
      ['rules', '/platform/ai-rules'],
      ['health', '/platform/health'],
      ['audit', '/platform/audit'],
      ['admins', '/platform/admins'],
      ['support', '/platform/support-sessions'],
      ['settings', '/platform/settings'],
      ['profile', '/platform/profile'],
      ...['overview', 'billing', 'staff', 'channels', 'rules', 'audit'].map((tab) => [
        `workspace.${tab}`,
        `/platform/tenants/operations-${operator.tenantId}?tab=${tab}`,
      ]),
    ];
    const widths = [1440, 1280, 1024, 768, 390, 320, 720];
    for (const width of widths) {
      await page.setViewportSize({ width, height: width === 1440 ? 1000 : 800 });
      for (const [surface, route] of routes) {
        const response = await page.goto(`http://127.0.0.1:3138${route}`, {
          waitUntil: 'networkidle',
        });
        assert.equal(response?.status(), 200, surface);
        assert.equal(await page.getByText('This screen did not load.', { exact: true }).count(), 0);
        const overflow = await page.evaluate(() =>
          Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
        );
        const result = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
          .analyze();
        checks.push({
          surface: surface!,
          width,
          overflow,
          violations: result.violations.map((row) => ({
            id: row.id,
            impact: row.impact,
            nodes: row.nodes.length,
          })),
          incomplete: result.incomplete.map((row) => ({ id: row.id, nodes: row.nodes.length })),
        });
        if (result.violations.length || result.incomplete.length)
          findings.push({
            surface,
            width,
            violations: result.violations,
            incomplete: result.incomplete,
          });
        console.log(
          JSON.stringify({
            surface,
            width,
            overflow,
            violations: result.violations.map((row) => `${row.id}:${row.nodes.length}`),
          }),
        );
      }
    }
  } finally {
    await browser?.close();
    if (worker && worker.exitCode === null) {
      worker.kill();
      await new Promise<void>((done) => worker!.once('exit', () => done()));
    }
    await owned.admin`delete from platform_audit_log where actor_user_id=${operator.userId}`;
    await owned.admin`delete from platform_admins where user_id=${operator.userId}`;
    await owned.cleanup();
  }
  await writeFile(
    '.test-report/phase-one/m4-accessibility-private.json',
    JSON.stringify(findings, null, 2) + '\n',
  );
  const passed =
    checks.length === 126 &&
    checks.every((row) => row.overflow <= 1 && row.violations.length === 0);
  await writeFile(
    '.test-report/phase-one/m4-accessibility.json',
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        localOnly: true,
        productionBuild: true,
        passed,
        fixtureCleanup: true,
        checks,
        boundary:
          'WCAG 2.1 A/AA tagged axe scans of 18 console surfaces at 1440, 1280, 1024, 768, 390, 320 and 720px. Incomplete findings require review; native browser zoom, keyboard/modal and action workflows are separate acceptance. This is not a claim of actual NVDA/VoiceOver output or formal WCAG certification.',
      },
      null,
      2,
    ) + '\n',
  );
  if (!passed) process.exitCode = 1;
}
void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
