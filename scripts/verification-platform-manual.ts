/** Owned browser station for native browser zoom and assistive-technology review. */
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { parse } from 'dotenv';
import { chromium } from 'playwright';
import type { ChildProcess } from 'node:child_process';

async function main() {
  for (const key of [
    'RESEND_API_KEY',
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN',
    'SENTRY_DSN',
    'NEXT_PUBLIC_SENTRY_DSN',
    'AXIOM_TOKEN',
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
  let worker: ChildProcess | undefined,
    browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
  const root = '.test-report/phase-one',
    control = `${root}/m4-manual-control.json`;
  await mkdir(root, { recursive: true });
  await writeFile(control, JSON.stringify({ action: 'wait' }));
  const captures: unknown[] = [];
  try {
    await owned.admin`insert into platform_admins(user_id,display_name) values(${operator.userId},'Manual accessibility verifier')`;
    worker = await applicationWorker(3140);
    browser = await chromium.launch({
      channel: 'chrome',
      headless: false,
      args: ['--force-renderer-accessibility'],
    });
    const context = await browser.newContext({ viewport: null, reducedMotion: 'reduce' });
    const page = await context.newPage();
    page.setDefaultNavigationTimeout(90000);
    await page.goto('http://127.0.0.1:3140/sign-in?next=%2Fplatform%2Fprofile', {
      waitUntil: 'networkidle',
    });
    await page.getByLabel('Email address').fill(operator.email);
    await page.getByLabel('Password', { exact: true }).fill(operator.password);
    await Promise.all([
      page.waitForURL((url) => url.pathname === '/platform/profile', { waitUntil: 'networkidle' }),
      page.getByRole('button', { name: /^sign in$/i }).click({ noWaitAfter: true }),
    ]);
    await writeFile(
      `${root}/m4-manual-ready.json`,
      JSON.stringify({ ready: true, origin: 'http://127.0.0.1:3140', ownedFixture: true }),
    );
    console.log('Owned manual accessibility station ready on port 3140.');
    for (let iteration = 0; iteration < 7200; iteration++) {
      const command = JSON.parse(await readFile(control, 'utf8')) as {
        action: string;
        label?: string;
      };
      if (command.action === 'finish') break;
      if (command.action === 'capture') {
        assert(command.label && /^[a-z0-9-]{1,60}$/.test(command.label));
        const metrics = await page.evaluate(() => ({
          width: innerWidth,
          height: innerHeight,
          devicePixelRatio,
          overflow: Math.max(0, document.documentElement.scrollWidth - innerWidth),
          title: document.title,
        }));
        const accessibility = await page.locator('body').ariaSnapshot();
        await writeFile(
          `${root}/m4-manual-${command.label}-private.json`,
          JSON.stringify({ metrics, accessibility }, null, 2),
        );
        captures.push({ label: command.label, metrics });
        await writeFile(control, JSON.stringify({ action: 'wait', captured: command.label }));
      }
      await new Promise((done) => setTimeout(done, 500));
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
    await writeFile(
      `${root}/m4-manual-browser.json`,
      JSON.stringify(
        {
          checkedAt: new Date().toISOString(),
          localOnly: true,
          fixtureCleanup: true,
          captures,
          boundary:
            'Browser metrics and accessibility trees are observations, not proof of screen-reader speech. Native zoom and speech observations require their own review record.',
        },
        null,
        2,
      ) + '\n',
    );
  }
}
void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
