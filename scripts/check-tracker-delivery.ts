import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { COMMERCIAL, MILESTONES, PROJECT_TIMING } from '../src/lib/presentation/engagement';

/** Read-only rendered acceptance against the local production tracker. */
async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const results: { width: number; overflow: number; milestones: number }[] = [];
  try {
    const page = await browser.newPage();
    await mkdir('.screenshots/phase-one-tracker', { recursive: true });
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      const response = await page.goto('http://127.0.0.1:3100/project-tracker', {
        waitUntil: 'domcontentloaded',
      });
      assert.equal(response?.status(), 200);
      const table = page.getByRole('table');
      assert.equal(await table.locator('tbody tr').count(), MILESTONES.length);
      assert.equal(await table.getByRole('progressbar').count(), MILESTONES.length);
      const clippedHeadings = await table.locator('thead th').evaluateAll(
        (headings) =>
          headings.filter((heading) => {
            const cell = heading.getBoundingClientRect();
            if (!cell.width) return false;
            const range = document.createRange();
            range.selectNodeContents(heading);
            return range.getBoundingClientRect().right > cell.right - 1;
          }).length,
      );
      assert.equal(clippedHeadings, 0, `Table headings must fit their cells at ${width}px.`);
      for (const milestone of MILESTONES) {
        const row = table.getByRole('row').filter({ hasText: milestone.name });
        assert((await row.innerText()).includes(`${milestone.progress}%`));
      }
      const subscription = table.getByRole('row').filter({ hasText: 'Subscriptions' });
      assert((await subscription.innerText()).includes('Demo pending'));
      const payments = page.locator('#commercial');
      assert.equal(await payments.getByText('Paid', { exact: true }).count(), 1);
      assert.equal(await payments.getByText('Awaiting payment', { exact: true }).count(), 1);
      assert.equal(await payments.getByText('Pending milestone', { exact: true }).count(), 2);
      const figures = await payments.locator('dl').innerText();
      assert(figures.includes(COMMERCIAL.totalFee));
      assert(figures.includes('KES 19,500'));
      assert(figures.includes('KES 45,500'));
      const schedule = page.locator('#schedule');
      assert((await schedule.innerText()).includes('7 Aug 2026'));
      assert((await schedule.innerText()).includes('Awaiting target date'));
      const today = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Africa/Nairobi',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date());
      const elapsed = Math.round(
        (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${PROJECT_TIMING.kickoffDate}T00:00:00Z`)) /
          86400000,
      );
      assert((await schedule.innerText()).includes(`${elapsed} days`));
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      assert(overflow <= 1, `Tracker exceeds viewport by ${overflow}px at ${width}px.`);
      await page
        .locator('#milestones')
        .screenshot({ path: `.screenshots/phase-one-tracker/milestones-${width}.png` });
      await payments.screenshot({ path: `.screenshots/phase-one-tracker/payments-${width}.png` });
      const disclosure = page.getByText('Detailed milestone reviews', { exact: true });
      await disclosure.focus();
      await page.keyboard.press('Enter');
      assert((await page.locator('#milestones details').getAttribute('open')) !== null);
      await page.keyboard.press('Enter');
      assert.equal(await page.locator('#milestones details').getAttribute('open'), null);
      results.push({ width, overflow, milestones: MILESTONES.length });
    }
    await mkdir('.test-report/phase-one', { recursive: true });
    await writeFile(
      '.test-report/phase-one/tracker-delivery.json',
      JSON.stringify(
        {
          checkedAt: new Date().toISOString(),
          passed: true,
          localOnly: true,
          productionBuild: true,
          results,
          depositOnlyPaid: true,
          acceptedGateDoesNotImplyPayment: true,
          unconfirmedDeadlineNotInvented: true,
          keyboardDisclosure: true,
        },
        null,
        2,
      ) + '\n',
    );
    process.stdout.write(`Tracker delivery acceptance passed at ${results.length} widths.\n`);
  } finally {
    await browser.close();
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(String(error) + '\n');
  process.exitCode = 1;
});
