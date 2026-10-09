/** Check actual retained Activity text geometry in an isolated browser and owned workspace. */
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import type { ChildProcess } from 'node:child_process';
import { chromium, type Browser } from 'playwright';
import { applicationWorker, httpFixtures } from './verification-http-fixture';

async function main() {
  const owned = await httpFixtures(1);
  const fixture = owned.fixtures[0]!;
  let worker: ChildProcess | undefined;
  let browser: Browser | undefined;
  const rows: {
    width: number;
    overflowPx: number;
    timeSeparated: boolean;
    referenceKeyboardAccessible: boolean;
  }[] = [];
  try {
    await mkdir('.screenshots/phase-one-surface-review', { recursive: true });
    await mkdir('.test-report/phase-one', { recursive: true });
    const [subscription] = await owned.admin<
      { plan_id: string }[]
    >`select plan_id from subscriptions where tenant_id=${fixture.tenantId}`;
    assert(subscription);
    await owned.admin`insert into plan_entitlements(plan_id,key,kind,limit_value,display_name)
      values(${subscription.plan_id},'audit_retention_days','limit',30,'Activity history')`;
    await owned.admin`insert into audit_log(tenant_id,actor_type,actor_label,action,entity_type,request_id)
      values(${fixture.tenantId},'system','Activity layout reviewer with a longer descriptive name','tenant.settings_updated','tenant_settings',${randomUUID()})`;
    worker = await applicationWorker(3133);
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:3133/sign-in?next=%2Fapp%2Fsettings%2Faudit');
    await page.getByLabel('Email address').fill(fixture.email);
    await page.getByLabel('Password', { exact: true }).fill(fixture.password);
    await Promise.all([
      page.waitForURL('**/app/settings/audit'),
      page.getByRole('button', { name: /^sign in$/i }).click(),
    ]);
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 950 });
      const item = page.getByRole('listitem').filter({ hasText: 'Activity layout reviewer' });
      await item.waitFor();
      await page.evaluate(() => document.fonts.ready);
      const text = await item.locator(':scope > span').nth(1).boundingBox();
      const time = await item.locator('time').boundingBox();
      assert(text && time);
      const separated =
        text.x + text.width <= time.x + 1 ||
        text.y + text.height <= time.y + 1 ||
        time.y + time.height <= text.y + 1;
      assert(separated, 'Timestamp must not overlap the activity description.');
      const overflowPx = await page.evaluate(() =>
        Math.max(0, document.documentElement.scrollWidth - innerWidth),
      );
      assert(overflowPx <= 1);
      const summary = item.locator('summary');
      await summary.focus();
      await page.keyboard.press('Enter');
      assert(
        await item.locator('details').evaluate((element) => (element as HTMLDetailsElement).open),
      );
      await page.keyboard.press('Enter');
      await page.screenshot({
        path: `.screenshots/phase-one-surface-review/activity-layout-${width}.png`,
      });
      rows.push({ width, overflowPx, timeSeparated: separated, referenceKeyboardAccessible: true });
    }
  } finally {
    await browser?.close();
    if (worker && worker.exitCode === null) {
      worker.kill();
      await new Promise<void>((done) => worker!.once('exit', () => done()));
    }
    await owned.cleanup();
  }
  const source = 'src/app/(tenant)/app/settings/audit/page.tsx';
  const receipt = {
    checkedAt: new Date().toISOString(),
    localOnly: true,
    productionBuild: true,
    source: {
      path: source,
      sha256: createHash('sha256')
        .update(await readFile(source))
        .digest('hex'),
    },
    applicationBuildId: (await readFile('.next-live-verify/BUILD_ID', 'utf8')).trim(),
    rows,
    fixtureCleanup: true,
    passed: rows.length === 3,
    boundary:
      'Follow-up to the 96-visit surface sweep. Actual retained Activity with a longer actor name; timestamp geometry and keyboard Reference disclosure at three widths. Does not establish complete accessibility acceptance.',
  };
  await writeFile(
    '.test-report/phase-one/activity-layout.json',
    JSON.stringify(receipt, null, 2) + '\n',
  );
  process.stdout.write(
    JSON.stringify({ passed: receipt.passed, widths: rows.map((row) => row.width) }) + '\n',
  );
}
void main().catch((error: unknown) => {
  process.stderr.write(String(error) + '\n');
  process.exitCode = 1;
});
