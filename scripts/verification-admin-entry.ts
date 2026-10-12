/** Native password entry and platform isolation using disposable local identities. */
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import type { ChildProcess } from 'node:child_process';
import { parse } from 'dotenv';
import { chromium, type Browser } from 'playwright';

async function main() {
  for (const name of [
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
    process.env[name] = '';
  Object.assign(process.env, parse(await readFile('.env.verification.local')), {
    CACHE_DISABLED: 'true',
    VERIFICATION_DISPOSABLE: 'true',
    NEXT_DIST_DIR: '.next-live-verify',
    SESSION_COOKIE_PLATFORM: 'alcassa_verify_platform',
    SESSION_COOKIE_TENANT: 'alcassa_verify_tenant',
  });
  assert.equal(process.env.NEXT_PUBLIC_SUPABASE_URL, 'http://127.0.0.1:55421');
  const { httpFixtures, applicationWorker } = await import('./verification-http-fixture');
  const owned = await httpFixtures(2);
  const [operator, tenant] = owned.fixtures;
  assert(operator && tenant);
  let worker: ChildProcess | undefined;
  let browser: Browser | undefined;
  const origin = 'http://127.0.0.1:3136';
  const checks: string[] = [];
  let platformSessionId: string | undefined;
  try {
    await owned.admin`insert into platform_admins(user_id,display_name) values(${operator.userId},'Entry verifier')`;
    worker = await applicationWorker(3136);
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    for (const [fixture, next, expected] of [
      [operator, '/app', '/platform'],
      [operator, '/platform/profile?review=entry', '/platform/profile?review=entry'],
      [tenant, '/app/settings/company', '/app/settings/company'],
    ] as const) {
      const context = await browser.newContext();
      const page = await context.newPage();
      page.setDefaultTimeout(60_000);
      await page.goto(`${origin}/sign-in?next=${encodeURIComponent(next)}`);
      await page.getByLabel('Email address').fill(fixture.email);
      await page.getByLabel('Password', { exact: true }).fill(fixture.password);
      await Promise.all([
        page.waitForURL((url) => url.pathname + url.search === expected, { waitUntil: 'load' }),
        page.getByRole('button', { name: /^sign in$/i }).click(),
      ]);
      const cookies = await context.cookies();
      assert(
        cookies.some(
          (cookie) =>
            cookie.name ===
            (fixture === operator ? 'alcassa_verify_platform' : 'alcassa_verify_tenant'),
        ),
      );
      assert(
        !cookies.some(
          (cookie) =>
            cookie.name ===
            (fixture === operator ? 'alcassa_verify_tenant' : 'alcassa_verify_platform'),
        ),
      );
      if (fixture === tenant) {
        await page.goto(`${origin}/platform`);
        await page.waitForURL((url) => url.pathname === '/sign-in');
        checks.push('Tenant owner is refused platform console access');
        assert(platformSessionId);
        await context.addCookies([
          {
            name: 'alcassa_verify_platform',
            value: platformSessionId,
            url: origin,
            httpOnly: true,
            sameSite: 'Lax',
          },
        ]);
        await page.goto(`${origin}/platform`);
        await page.waitForURL((url) => url.pathname === '/sign-in');
        checks.push('Copied platform session is refused for a different provider identity');
      } else {
        platformSessionId = cookies.find(
          (cookie) => cookie.name === 'alcassa_verify_platform',
        )?.value;
        assert.equal(await page.getByText('This screen did not load.', { exact: true }).count(), 0);
        checks.push(
          next === '/app'
            ? 'Admin workspace return path resolves to console'
            : 'Admin console return path and query preserved',
        );
      }
      await context.close();
    }
    const [sessions] = await owned.admin<
      { n: number }[]
    >`select count(*)::int n from sessions where user_id=${tenant.userId} and kind='platform'`;
    assert.equal(sessions?.n, 0);
    checks.push('Tenant has no platform session in database');
  } finally {
    await browser?.close();
    worker?.kill();
    await owned.admin`delete from platform_admins where user_id=${operator.userId}`;
    await owned.cleanup();
  }
  await mkdir('.test-report/phase-one', { recursive: true });
  await writeFile(
    '.test-report/phase-one/admin-entry.json',
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        passed: true,
        environment: 'Disposable local production build',
        checks,
        ownedFixturesRemoved: true,
      },
      null,
      2,
    ),
  );
  console.log(`Admin entry: ${checks.length} checks passed; owned fixtures removed.`);
}
main().catch(async (error: unknown) => {
  await mkdir('.test-report/phase-one', { recursive: true });
  await writeFile(
    '.test-report/phase-one/admin-entry-failure.log',
    error instanceof Error ? (error.stack ?? error.message) : 'Unknown failure',
  );
  console.error('Admin entry verification failed; inspect the private run log.');
  process.exitCode = 1;
});
