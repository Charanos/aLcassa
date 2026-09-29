#!/usr/bin/env tsx
/**
 * Screenshot console pages, signed in, at desktop and phone widths.
 *
 * ⚠ WRITTEN SO THAT "IT TYPECHECKS" STOPS BEING THE STRONGEST CLAIM A CHANGE
 *   CAN MAKE ABOUT HOW IT LOOKS.
 *
 * The health page rendered its latency chart over its own panel title for as
 * long as it existed, and every gate this project runs was green throughout:
 * the types were right, the lint was clean, the build succeeded. A chart
 * positioned against the wrong ancestor is invisible to all of them and
 * obvious in one look. This is the look.
 *
 *   pnpm shots                         # every page in PAGES, both widths
 *   pnpm shots health audit            # just those
 *   SHOTS_BASE=https://… pnpm shots    # against a deployment
 *
 * Writes `.screenshots/<page>-<width>.png` (gitignored).
 *
 * ⚠ IT USES THE CHROME ALREADY ON THE MACHINE. `channel: 'chrome'` drives the
 * installed browser rather than a Playwright-downloaded one, so a local run
 * needs nothing fetched. CI passes `SHOTS_CHANNEL=chromium` and installs that.
 *
 * ⚠ CREDENTIALS COME FROM THE ENVIRONMENT, defaulting to the seeded demo
 * operator in `src/db/seed/index.ts` — the account `pnpm db:seed` creates on a
 * development database. Never point this at production with real credentials
 * in a shell history.
 */

import { chromium, type Browser, type Page } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = (process.env.SHOTS_BASE ?? 'http://localhost:3000').replace(/\/+$/, '');
const EMAIL = process.env.SHOTS_EMAIL ?? process.env.SEED_ADMIN_EMAIL ?? 'brian@alcassa.co.ke';
const PASSWORD = process.env.SHOTS_PASSWORD ?? process.env.SEED_ADMIN_PASSWORD ?? 'brian@admin123';
const CHANNEL = process.env.SHOTS_CHANNEL ?? 'chrome';
const OUT = '.screenshots';

const PAGES: Record<string, string> = {
  overview: '/platform',
  health: '/platform/health',
  audit: '/platform/audit',
  admins: '/platform/admins',
  'support-sessions': '/platform/support-sessions',
  tenants: '/platform/tenants',
  plans: '/platform/plans',
  revenue: '/platform/revenue',
  'ai-rules': '/platform/ai-rules',
  settings: '/platform/settings',
  profile: '/platform/profile',
};

const WIDTHS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'phone', width: 390, height: 844 },
] as const;

async function signIn(page: Page) {
  /* `networkidle`, not `domcontentloaded`: the form is a client component,
     and a submit before it hydrates goes nowhere — which is how the first
     version of this script timed out on a page that works by hand. */
  await page.goto(`${BASE}/sign-in`, { waitUntil: 'networkidle' });
  await page.getByLabel('Email address').fill(EMAIL);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await Promise.all([
    /* `commit`: the URL changing is the proof of sign-in. Waiting for the
       landing page's full load waits on the overview, the heaviest page. */
    page.waitForURL((u: URL) => !u.pathname.startsWith('/sign-in'), {
      timeout: 60_000,
      waitUntil: 'commit',
    }),
    page.getByRole('button', { name: /^sign in$/i }).click(),
  ]);
}

async function main() {
  const wanted = process.argv.slice(2);
  const targets = Object.entries(PAGES).filter(([k]) => wanted.length === 0 || wanted.includes(k));
  if (targets.length === 0) {
    console.error(`No pages match: ${wanted.join(', ')}. Known: ${Object.keys(PAGES).join(', ')}`);
    process.exitCode = 1;
    return;
  }

  mkdirSync(OUT, { recursive: true });
  let browser: Browser | null = null;
  let failures = 0;

  try {
    browser = await chromium.launch(CHANNEL === 'chromium' ? {} : { channel: CHANNEL });

    for (const vp of WIDTHS) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 1,
        /* Screenshots of an animation are screenshots of one arbitrary frame.
           Reduced motion lands every page at rest, which is what a review
           wants to see and what 03 §15 says the page must look like anyway. */
        reducedMotion: 'reduce',
      });
      const page = await context.newPage();
      await signIn(page);

      for (const [name, path] of targets) {
        try {
          await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 60_000 });
          /* Charts measure their container after mount; give them a frame. */
          await page.waitForTimeout(900);
          /*
           * ⚠ `fullPage` ALONE CAPTURED ONE SCREEN. The console shell scrolls an
           * inner container, not the document, so the document is exactly one
           * viewport tall and Playwright's full-page capture stops there. Find
           * the tallest scrolling element, grow the viewport to fit it, shoot,
           * and put the viewport back for the next page.
           */
          const tall = await page.evaluate(() => {
            let max = document.documentElement.scrollHeight;
            for (const el of Array.from(document.querySelectorAll<HTMLElement>('*'))) {
              const o = getComputedStyle(el).overflowY;
              if ((o === 'auto' || o === 'scroll') && el.scrollHeight > el.clientHeight) {
                max = Math.max(max, el.scrollHeight + el.getBoundingClientRect().top);
              }
            }
            return Math.ceil(max);
          });
          await page.setViewportSize({ width: vp.width, height: Math.min(tall, 16_000) });
          await page.waitForTimeout(400);
          const file = `${OUT}/${name}-${vp.name}.png`;
          await page.screenshot({ path: file, fullPage: true });

          /* A 4,000px image is unreadable at review size. Screen-height slices
             are what a person — or a model reading the image — can inspect. */
          const sliceH = vp.name === 'phone' ? 1400 : 1000;
          for (let y = 0, i = 0; y < tall; y += sliceH, i++) {
            await page.screenshot({
              path: `${OUT}/${name}-${vp.name}.${i}.png`,
              fullPage: true,
              clip: { x: 0, y, width: vp.width, height: Math.min(sliceH, tall - y) },
            });
          }
          await page.setViewportSize({ width: vp.width, height: vp.height });
          console.log(`  ✓ ${file}`);
        } catch (error) {
          failures += 1;
          console.log(`  ✗ ${name} at ${vp.name}: ${(error as Error).message.split('\n')[0]}`);
        }
      }
      await context.close();
    }
  } finally {
    await browser?.close();
  }

  process.exitCode = failures === 0 ? 0 : 1;
}

void main();
