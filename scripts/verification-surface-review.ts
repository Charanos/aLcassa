/** Isolated automated Chromium review; never reads a user's browser profile or saved session. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import type { ChildProcess } from 'node:child_process';
import { chromium, type Browser } from 'playwright';
import { applicationWorker, httpFixtures } from './verification-http-fixture';

async function main() {
  const owned = await httpFixtures(2);
  const operator = owned.fixtures[0]!;
  const member = owned.fixtures[1]!;
  const origin = 'http://127.0.0.1:3131';
  let worker: ChildProcess | undefined;
  let browser: Browser | undefined;
  const results: {
    surface: string;
    width: number;
    status: number;
    overflowPx: number;
    findings: string[];
  }[] = [];
  const privateErrors: string[] = [];
  let activityWindowAndTenantIsolation = false;
  let companySaveAndReadback = false;
  try {
    await owned.admin`insert into platform_admins(user_id,display_name) values(${operator.userId},'Surface verifier')`;
    worker = await applicationWorker(3131);
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    await mkdir('.screenshots/phase-one-surface-review', { recursive: true });
    const reviews = await Promise.allSettled(
      (['platform', 'tenant'] as const).map(async (door) => {
        const fixture = door === 'platform' ? operator : member;
        const context = await browser!.newContext({
          viewport: { width: 1440, height: 1000 },
          reducedMotion: 'reduce',
        });
        const page = await context.newPage();
        page.setDefaultTimeout(30000);
        const errors: string[] = [];
        page.on('pageerror', (error) => {
          errors.push(error.name);
          privateErrors.push(String(error));
        });
        await page.goto(
          `${origin}/sign-in?next=${encodeURIComponent(door === 'platform' ? '/platform/settings' : '/app/settings/company')}`,
          { waitUntil: 'networkidle' },
        );
        await page.getByLabel('Email address').fill(fixture.email);
        await page.getByLabel('Password', { exact: true }).fill(fixture.password);
        await Promise.all([
          page.waitForURL((url) => !url.pathname.startsWith('/sign-in'), {
            waitUntil: 'domcontentloaded',
          }),
          page.getByRole('button', { name: /^sign in$/i }).click(),
        ]);
        const routes =
          door === 'platform'
            ? [
                '/platform',
                '/platform/tenants',
                '/platform/tenants/new',
                '/platform/plans',
                '/platform/revenue',
                '/platform/ai-rules',
                '/platform/health',
                '/platform/audit',
                '/platform/admins',
                '/platform/support-sessions',
                '/platform/settings',
                '/platform/profile',
                ...['overview', 'billing', 'staff', 'channels', 'rules', 'audit'].map(
                  (tab) => `/platform/tenants/operations-${operator.tenantId}?tab=${tab}`,
                ),
              ]
            : [
                '/app',
                '/app/settings/company',
                '/app/settings/appearance',
                '/app/settings/team',
                '/app/settings/team/invite',
                '/app/settings/credentials',
                '/app/settings/credentials/new',
                '/app/settings/subscription',
                '/app/settings/ai-rules',
                '/app/settings/audit',
                '/app/account',
                '/app/account/sessions',
                '/app/inbox',
                '/app/billing',
              ];
        for (const width of [1440, 390, 320]) {
          await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
          for (const [index, route] of routes.entries()) {
            errors.length = 0;
            const findings: string[] = [];
            let status = 0,
              overflowPx = 0;
            try {
              const response = await page.goto(`${origin}${route}`, {
                waitUntil: 'networkidle',
                timeout: 60000,
              });
              status = response?.status() ?? 0;
              if (status !== 200) findings.push(`HTTP ${status}`);
              if (route === '/platform/tenants/new') {
                await page
                  .getByRole('heading', { name: /workspace/i })
                  .last()
                  .waitFor({ state: 'visible', timeout: 10000 });
                const close = page.getByRole('button', { name: 'Close', exact: true }).last();
                await close.click();
                await page
                  .getByRole('heading', { level: 1 })
                  .first()
                  .waitFor({ state: 'visible', timeout: 10000 });
              } else
                await page
                  .getByRole('heading', { level: 1 })
                  .first()
                  .waitFor({ state: 'visible', timeout: 10000 });
              await page.evaluate(() => document.fonts.ready);
              const body = await page.locator('body').innerText();
              if (/This screen did not load\.|Something went wrong\./i.test(body))
                findings.push('Error boundary visible');
              if (/\bCurrent data\b/i.test(body)) findings.push('Retired data badge visible');
              if (new URL(page.url()).pathname.startsWith('/sign-in'))
                findings.push('Unexpected authentication redirect');
              overflowPx = await page.evaluate(() =>
                Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
              );
              if (overflowPx > 1) findings.push('Document overflows viewport');
              if (errors.length) findings.push(`${errors.length} uncaught browser errors`);
              if (
                [
                  '/platform/settings',
                  '/platform/health',
                  '/platform/plans',
                  '/platform/profile',
                  '/app/settings/audit',
                  '/app/settings/team',
                ].includes(route)
              )
                await page.screenshot({
                  path: `.screenshots/phase-one-surface-review/${door}-${index}-${width}.png`,
                });
            } catch (error) {
              privateErrors.push(String(error));
              findings.push('Browser review did not complete');
            }
            results.push({
              surface: route.replace(`operations-${operator.tenantId}`, 'owned-workspace'),
              width,
              status,
              overflowPx,
              findings,
            });
          }
        }
        if (door === 'tenant') {
          await page.goto(`${origin}/app/settings/audit`, { waitUntil: 'networkidle' });
          await page
            .getByText('Activity history is not included in this plan', { exact: true })
            .waitFor();
          const [subscription] = await owned.admin<
            { plan_id: string }[]
          >`select plan_id from subscriptions where tenant_id=${member.tenantId}`;
          assert(subscription);
          await owned.admin`insert into plan_entitlements(plan_id,key,kind,limit_value,display_name)
          values(${subscription.plan_id},'audit_retention_days','limit',1,'Activity history')`;
          await owned.admin`insert into audit_log(tenant_id,actor_type,actor_label,action,entity_type,occurred_at,request_id) values
          (${member.tenantId},'system','Visible activity verifier','tenant.settings_updated','tenant_settings',now(),${randomUUID()}),
          (${member.tenantId},'system','Expired activity verifier','tenant.settings_updated','tenant_settings',now()-interval '2 days',${randomUUID()}),
          (${operator.tenantId},'system','Other-workspace activity verifier','tenant.settings_updated','tenant_settings',now(),${randomUUID()})`;
          await page.reload({ waitUntil: 'networkidle' });
          await page.getByText('Visible activity verifier', { exact: false }).waitFor();
          const activityText = await page.locator('body').innerText();
          assert(!activityText.includes('Expired activity verifier'));
          assert(!activityText.includes('Other-workspace activity verifier'));
          assert(!activityText.includes('This screen did not load.'));
          assert(
            (await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)) <=
              1,
          );
          activityWindowAndTenantIsolation = true;
          await page.screenshot({
            path: '.screenshots/phase-one-surface-review/activity-retention-320.png',
          });
          await page.goto(`${origin}/app/settings/company`, { waitUntil: 'networkidle' });
          await page
            .getByLabel('Company name', { exact: true })
            .fill('Reviewed acceptance workspace');
          await page.getByLabel('Contact email', { exact: true }).fill(member.email);
          await page.getByRole('button', { name: 'Save changes', exact: true }).click();
          await page.getByText('Saved', { exact: true }).waitFor();
          const [company] = await owned.admin<
            { display_name: string }[]
          >`select display_name from tenant_settings where tenant_id=${member.tenantId}`;
          assert.equal(company?.display_name, 'Reviewed acceptance workspace');
          await page.reload({ waitUntil: 'networkidle' });
          assert.equal(
            await page.getByLabel('Company name', { exact: true }).inputValue(),
            'Reviewed acceptance workspace',
          );
          const [audit] = await owned.admin<
            { n: number }[]
          >`select count(*)::int as n from audit_log where tenant_id=${member.tenantId} and actor_type='user' and action='tenant.settings_updated'`;
          assert.equal(audit?.n, 1);
          companySaveAndReadback = true;
        }
        await context.close();
      }),
    );
    for (const review of reviews) if (review.status === 'rejected') throw review.reason;
    const [sessions] = await owned.admin<
      { n: number }[]
    >`select count(*)::int as n from sessions where user_id=any(${[operator.userId, member.userId]}::uuid[]) and revoked_at is null`;
    assert.equal(
      sessions?.n,
      2,
      'Both isolated UI sign-ins must create durable application sessions.',
    );
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
  await writeFile('.test-report/phase-one/surface-review-private.log', privateErrors.join('\n'));
  const result = {
    checkedAt: new Date().toISOString(),
    localOnly: true,
    productionBuild: true,
    browser: 'Isolated headless Chrome via the repository Playwright dependency',
    viewports: [1440, 390, 320],
    surfaceCount: 32,
    activityWindowAndTenantIsolation,
    companySaveAndReadback,
    results,
    fixtureCleanup: true,
    passed: results.every((row) => row.findings.length === 0),
    boundary:
      'Actual UI sign-in, rendered-route and viewport checks, Activity retention/isolation, and an owned company-name save with reload/database/audit readback. Private images are diagnostic material pending visual review. This is not complete CRUD, keyboard, screen-reader or accessibility acceptance.',
  };
  await writeFile(
    '.test-report/phase-one/surface-review.json',
    JSON.stringify(result, null, 2) + '\n',
  );
  process.stdout.write(
    JSON.stringify({
      passed: result.passed,
      visits: results.length,
      findings: results.filter((row) => row.findings.length),
    }) + '\n',
  );
  if (!result.passed) process.exitCode = 1;
}
void main().catch((error: unknown) => {
  process.stderr.write(String(error) + '\n');
  process.exitCode = 1;
});
