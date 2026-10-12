import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { PROJECT_DOCS } from '../src/lib/presentation/documents';

/** Read-only layouts plus a synthetic CSP redirect probe; no Google consent is simulated. */
async function main() {
  const origin = 'http://127.0.0.1:3100';
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const results: { route: string; width: number; overflow: number }[] = [];
  const authLayouts: { route: string; width: number; overflow: number }[] = [];
  try {
    const page = await browser.newPage();
    const routes = [
      '/project-tracker/verification',
      '/project-tracker/security',
      ...PROJECT_DOCS.filter((doc) => doc.audience === 'client').map((doc) => `/docs/${doc.slug}`),
    ];
    await mkdir('.screenshots/phase-one-tracker-auxiliary', { recursive: true });
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const route of routes) {
        const response = await page.goto(`${origin}${route}`, { waitUntil: 'load' });
        await page.evaluate(() => document.fonts.ready);
        assert.equal(response?.status(), 200, route);
        assert.equal(await page.locator('h1').count(), 1, `${route}: one document title`);
        assert.equal(await page.getByRole('navigation', { name: 'Project navigation' }).count(), 1);
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - innerWidth,
        );
        assert(overflow <= 1, `${route} overflows at ${width}px by ${overflow}px`);
        results.push({ route, width, overflow });
      }
      await page.goto(`${origin}/project-tracker/verification#milestone-M2`);
      const milestone = page.locator('#milestone-M2');
      await milestone.locator('summary').focus();
      await page.keyboard.press('Enter');
      assert.equal(await milestone.getAttribute('open'), '');
      await page.keyboard.press('Enter');
      assert.equal(await milestone.getAttribute('open'), null);
      const checkpoint = page.locator('#shared-budget-checkpoint details').first();
      await checkpoint.locator(':scope > summary').focus();
      await page.keyboard.press('Enter');
      assert.equal(await checkpoint.getAttribute('open'), '');
      await page.screenshot({
        path: `.screenshots/phase-one-tracker-auxiliary/verification-${width}.png`,
      });
      await page.goto(`${origin}/project-tracker/security`);
      await page.screenshot({
        path: `.screenshots/phase-one-tracker-auxiliary/security-${width}.png`,
      });
      await page.goto(`${origin}/docs/25-phase-one-completion-plan`);
      await page.screenshot({
        path: `.screenshots/phase-one-tracker-auxiliary/document-${width}.png`,
      });
    }
    // The real disabled local provider leaves a labelled fallback and working email forms.
    for (const width of [1440, 1024, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      for (const route of ['/sign-in', '/sign-up']) {
        await page.goto(`${origin}${route}`);
        await page.evaluate(() => document.fonts.ready);
        assert.equal(await page.locator('form[action="/api/v1/auth/google"]').count(), 0);
        assert.equal(
          await page
            .getByText('Google sign-in is currently unavailable. Continue with email below.')
            .count(),
          1,
        );
        assert.equal(await page.locator('input[name="email"]').count(), 1);
        assert.equal(
          await page.getByRole('button', { name: 'Continue with Google' }).isDisabled(),
          true,
        );
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - innerWidth,
        );
        assert(overflow <= 1, `${route} overflows at ${width}px`);
        authLayouts.push({ route, width, overflow });
        if (route === '/sign-in' && width >= 1024) {
          const bounds = await page.locator('[data-auth-node]').evaluateAll((nodes) =>
            nodes.map((node) => {
              const { x, y, width, height } = node.getBoundingClientRect();
              return { x, y, width, height, overflow: node.scrollWidth - node.clientWidth };
            }),
          );
          assert.equal(bounds.length, 7);
          assert(
            bounds.every((node) => node.overflow <= 1),
            `Auth card content clips at ${width}px`,
          );
          for (let i = 0; i < bounds.length; i++)
            for (let j = i + 1; j < bounds.length; j++) {
              const a = bounds[i]!,
                b = bounds[j]!;
              assert(
                a.x + a.width <= b.x ||
                  b.x + b.width <= a.x ||
                  a.y + a.height <= b.y ||
                  b.y + b.height <= a.y,
                `Auth diagram nodes overlap at ${width}px`,
              );
            }
          await page.emulateMedia({ reducedMotion: 'reduce' });
          assert.equal(await page.locator('[data-auth-signals]').isVisible(), false);
          await page.emulateMedia({ reducedMotion: 'no-preference' });
          assert.equal(await page.locator('[data-auth-signals]').isVisible(), true);
        }
        await page.screenshot({
          path: `.screenshots/phase-one-tracker-auxiliary/${route.slice(1)}-${width}.png`,
        });
        if (route === '/sign-in' && width === 1440)
          await page.locator('[data-auth-artwork]').screenshot({
            path: '.screenshots/phase-one-tracker-auxiliary/auth-artwork-1440.png',
          });
      }
    }
    await page.goto(`${origin}/sign-up/finish`);
    assert.equal(
      new URL(page.url()).pathname,
      '/sign-in',
      'Anonymous setup cannot claim verified identity',
    );
    await page.close();

    // Exercise Chrome's actual form-action enforcement without contacting external providers.
    const probe = await browser.newPage();
    await probe.route('**/api/v1/auth/google', (route) =>
      route.fulfill({
        status: 303,
        headers: { location: 'http://127.0.0.1:55421/auth/v1/authorize?provider=google' },
      }),
    );
    await probe.goto(`${origin}/sign-in`);
    await probe.evaluate(() => {
      const form = document.createElement('form');
      form.method = 'post';
      form.action = '/api/v1/auth/google';
      document.body.append(form);
      form.submit();
    });
    await probe.waitForURL('http://127.0.0.1:55421/auth/v1/authorize?provider=google', {
      waitUntil: 'domcontentloaded',
      timeout: 10_000,
    });
    await probe.goto(`${origin}/sign-in`);
    await probe.unroute('**/api/v1/auth/google');
    let unlistedRequested = false;
    await probe.route('https://outside.example/owned-csp-probe', (route) => {
      unlistedRequested = true;
      return route.fulfill({ status: 200, body: 'Unexpected navigation' });
    });
    await probe.route('**/api/v1/auth/google', (route) =>
      route.fulfill({
        status: 303,
        headers: { location: 'https://outside.example/owned-csp-probe' },
      }),
    );
    await probe.evaluate(() => {
      document.addEventListener('securitypolicyviolation', (event) => {
        if (event.effectiveDirective === 'form-action')
          document.documentElement.dataset.cspBlocked = 'true';
      });
      const form = document.createElement('form');
      form.method = 'post';
      form.action = '/api/v1/auth/google';
      document.body.append(form);
      form.submit();
    });
    await probe.waitForFunction(() => document.documentElement.dataset.cspBlocked === 'true');
    assert.equal(unlistedRequested, false);
    await probe.close();
  } finally {
    await browser.close();
  }
  await mkdir('.test-report/phase-one', { recursive: true });
  await writeFile(
    '.test-report/phase-one/tracker-auxiliary.json',
    JSON.stringify(
      {
        passed: true,
        results,
        keyboardDisclosures: true,
        authLayouts,
        authDiagram: {
          nodes: 7,
          widths: [1440, 1024],
          noOverlap: true,
          noCardContentOverflow: true,
          reducedMotionHidesSignals: true,
        },
        anonymousSetupRefused: true,
        disabledProviderEmailFallback: true,
        syntheticLocalProviderRedirectPassed: true,
        unlistedFormRedirectRefused: true,
        googleCloudAcceptance: 'Actual Google consent is outside this local disabled-provider run',
      },
      null,
      2,
    ),
  );
  process.stdout.write(
    `Passed ${results.length} auxiliary layouts, keyboard disclosures, anonymous setup refusal, email fallback and the local Chrome CSP redirect.\n`,
  );
}
main().catch(async (error: unknown) => {
  await mkdir('.test-report/phase-one', { recursive: true });
  await writeFile(
    '.test-report/phase-one/tracker-auxiliary-failure.log',
    error instanceof Error ? (error.stack ?? error.message) : 'Unknown acceptance failure',
  );
  process.stderr.write('Tracker auxiliary acceptance failed; inspect the local run.\n');
  process.exitCode = 1;
});
