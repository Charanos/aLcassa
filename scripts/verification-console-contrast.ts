/** Measure rendered backgrounds for chrome text that axe cannot resolve through gradients. */
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { parse } from 'dotenv';
import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';

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
  const worker = await applicationWorker(
    3141,
    {},
    process.env.CONTRAST_REVIEW_MODE === 'development' ? 'dev' : 'start',
  );
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const rows: {
    surface: string;
    measured: number;
    decorative: number;
    failed: number;
    minimumRatio: number;
  }[] = [];
  const failures: unknown[] = [];
  try {
    await owned.admin`insert into platform_admins(user_id,display_name) values(${operator.userId},'Contrast verifier')`;
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    page.setDefaultNavigationTimeout(90000);
    await page.goto('http://127.0.0.1:3141/sign-in?next=%2Fplatform', { waitUntil: 'networkidle' });
    await page.getByLabel('Email address').fill(operator.email);
    await page.getByLabel('Password', { exact: true }).fill(operator.password);
    await Promise.all([
      page.waitForURL((url) => url.pathname === '/platform', { waitUntil: 'networkidle' }),
      page.getByRole('button', { name: /^sign in$/i }).click({ noWaitAfter: true }),
    ]);
    for (const [surface, route] of [
      ['overview', '/platform'],
      ['plans', '/platform/plans'],
      ['health', '/platform/health'],
      ['profile', '/platform/profile'],
      ['provision', '/platform/tenants/new'],
    ]) {
      if (process.env.CONTRAST_SURFACE && surface !== process.env.CONTRAST_SURFACE) continue;
      await page.goto(`http://127.0.0.1:3141${route}`, { waitUntil: 'networkidle' });
      if (surface === 'provision')
        await page
          .getByRole('dialog', { name: 'Provision a workspace', exact: true })
          .getByLabel('Legal name', { exact: true })
          .waitFor();
      const axe = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      const nodes = axe.incomplete
        .filter((row) => row.id === 'color-contrast')
        .flatMap((row) => row.nodes);
      let measured = 0,
        decorative = 0,
        failed = 0,
        minimumRatio = 21;
      for (const node of nodes) {
        if (process.env.CONTRAST_PROBE === 'headline' && !/^<(?:h2|strong)/.test(node.html))
          continue;
        assert(node.target.length === 1 && typeof node.target[0] === 'string');
        const locator = page.locator(node.target[0]);
        if (await locator.evaluate((el) => !!el.closest('[aria-hidden="true"]'))) {
          decorative++;
          continue;
        }
        await locator.scrollIntoViewIfNeeded();
        if (process.env.CONTRAST_PROBE === 'headline')
          await locator.screenshot({
            path: `.test-report/phase-one/m4-contrast-original-${measured}.png`,
          });
        const sample = await locator.evaluate((element) => {
          const bounds = element.getBoundingClientRect();
          const rects: {
            x: number;
            y: number;
            width: number;
            height: number;
            color: number[];
            threshold: number;
          }[] = [];
          const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
          for (let text = walker.nextNode(); text; text = walker.nextNode()) {
            if (!text.textContent?.trim()) continue;
            const parent = text.parentElement!;
            const style = getComputedStyle(parent);
            const foreground = parent instanceof SVGElement ? style.fill : style.color;
            const color = (foreground.match(/[\d.]+/g) ?? []).map(Number);
            if (color.length === 3) color.push(1);
            if (!foreground.startsWith('rgb'))
              throw Error('Unsupported foreground color representation');
            let opacity = 1;
            for (let ancestor: Element | null = parent; ancestor; ancestor = ancestor.parentElement)
              opacity *= Number(getComputedStyle(ancestor).opacity);
            color[3] = color[3]! * opacity;
            const range = document.createRange();
            range.selectNodeContents(text);
            for (const rect of range.getClientRects()) {
              let left = rect.left,
                right = rect.right,
                top = rect.top,
                bottom = rect.bottom;
              for (
                let ancestor: Element | null = parent;
                ancestor && ancestor !== element.parentElement;
                ancestor = ancestor.parentElement
              ) {
                const css = getComputedStyle(ancestor),
                  clip = ancestor.getBoundingClientRect();
                if (css.overflowX !== 'visible') {
                  left = Math.max(left, clip.left);
                  right = Math.min(right, clip.right);
                }
                if (css.overflowY !== 'visible') {
                  top = Math.max(top, clip.top);
                  bottom = Math.min(bottom, clip.bottom);
                }
              }
              if (right > left && bottom > top)
                rects.push({
                  x: left - bounds.left,
                  y: top - bounds.top,
                  width: right - left,
                  height: bottom - top,
                  color,
                  threshold:
                    parseFloat(style.fontSize) >= 24 ||
                    (parseFloat(style.fontSize) >= 18.6667 && Number(style.fontWeight) >= 700)
                      ? 3
                      : 4.5,
                });
            }
          }
          const elements = [element, ...element.querySelectorAll('*')];
          const saved = elements.map((el) => el.getAttribute('style'));
          for (const el of elements) {
            const html = el as HTMLElement;
            html.style.setProperty('-webkit-text-fill-color', 'transparent', 'important');
            html.style.setProperty('-webkit-text-stroke-width', '0', 'important');
            html.style.setProperty('text-shadow', 'none', 'important');
            if (el instanceof SVGElement)
              html.style.setProperty('fill', 'transparent', 'important');
            if (getComputedStyle(el).backgroundClip === 'text')
              html.style.setProperty('background-image', 'none', 'important');
          }
          return { rects, saved, width: bounds.width, height: bounds.height };
        });
        let bytes: Buffer;
        try {
          bytes = await locator.screenshot({ animations: 'disabled' });
        } finally {
          await locator.evaluate((element, saved) => {
            [element, ...element.querySelectorAll('*')].forEach((el, index) => {
              const style = saved[index];
              if (style === null) el.removeAttribute('style');
              else if (style !== undefined) el.setAttribute('style', style);
            });
          }, sample.saved);
        }
        const outcome = await page.evaluate(
          async ({ png, sample }) => {
            const bitmap = await createImageBitmap(
              new Blob([new Uint8Array(png)], { type: 'image/png' }),
            );
            const canvas = document.createElement('canvas');
            canvas.width = bitmap.width;
            canvas.height = bitmap.height;
            const context = canvas.getContext('2d')!;
            context.drawImage(bitmap, 0, 0);
            bitmap.close();
            const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
            let minimum = 21,
              failed = false,
              count = 0;
            const sx = canvas.width / sample.width,
              sy = canvas.height / sample.height;
            for (const rect of sample.rects)
              for (
                let y = Math.max(0, Math.ceil(rect.y * sy));
                y < Math.min(canvas.height, Math.floor((rect.y + rect.height) * sy));
                y++
              )
                for (
                  let x = Math.max(0, Math.ceil(rect.x * sx));
                  x < Math.min(canvas.width, Math.floor((rect.x + rect.width) * sx));
                  x++
                ) {
                  const offset = (y * canvas.width + x) * 4,
                    bg = [pixels[offset]!, pixels[offset + 1]!, pixels[offset + 2]!];
                  const fg = bg.map(
                    (c, i) => rect.color[i]! * rect.color[3]! + c * (1 - rect.color[3]!),
                  );
                  const a = fg
                      .map((c) => {
                        const s = c / 255;
                        return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
                      })
                      .reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i]!, 0),
                    b = bg
                      .map((c) => {
                        const s = c / 255;
                        return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
                      })
                      .reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i]!, 0),
                    ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
                  minimum = Math.min(minimum, ratio);
                  if (ratio + 0.01 < rect.threshold) failed = true;
                  count++;
                }
            return { minimum, failed, count };
          },
          { png: [...bytes], sample },
        );
        if (!outcome.count) {
          decorative++;
          continue;
        }
        measured++;
        minimumRatio = Math.min(minimumRatio, outcome.minimum);
        if (outcome.failed) {
          await writeFile(`.test-report/phase-one/m4-contrast-background-${measured}.png`, bytes);
          failed++;
          failures.push({ surface, html: node.html, ratio: outcome.minimum });
        }
      }
      rows.push({ surface: surface!, measured, decorative, failed, minimumRatio });
      console.log(JSON.stringify(rows.at(-1)));
      await writeFile(
        '.test-report/phase-one/m4-contrast-private.json',
        JSON.stringify(failures, null, 2) + '\n',
      );
    }
  } finally {
    await browser.close();
    if (worker.exitCode === null) {
      worker.kill();
      await new Promise<void>((done) => worker.once('exit', () => done()));
    }
    await owned.admin`delete from platform_audit_log where actor_user_id=${operator.userId}`;
    await owned.admin`delete from platform_admins where user_id=${operator.userId}`;
    await owned.cleanup();
  }
  const passed =
    rows.length === 5 &&
    rows.every((row) => row.failed === 0 && (row.measured > 0 || row.surface === 'provision'));
  await writeFile(
    '.test-report/phase-one/m4-contrast-private.json',
    JSON.stringify(failures, null, 2) + '\n',
  );
  await writeFile(
    '.test-report/phase-one/m4-contrast.json',
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        passed,
        fixtureCleanup: true,
        localOnly: true,
        productionBuild: process.env.CONTRAST_REVIEW_MODE !== 'development',
        rows,
        boundary:
          'Pixel backgrounds beneath rendered text rectangles, with foreground alpha and font-size thresholds, on five representative shared chrome/hero/KPI surfaces. Decorative aria-hidden text is excluded. This complements axe incomplete findings; it is not a screen-reader or formal compliance certification.',
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
