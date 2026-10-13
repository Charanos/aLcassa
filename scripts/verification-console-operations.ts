/** Native console operations with independent database readback and owned fixtures. */
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import type { ChildProcess } from 'node:child_process';
import { parse } from 'dotenv';
import { chromium, type Browser, type Page } from 'playwright';

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
  const owned = await httpFixtures(3);
  const [operator, customer, restricted] = owned.fixtures;
  assert.ok(operator && customer && restricted);
  const slug = `operations-${customer.tenantId}`;
  const name = `Console acceptance ${customer.tenantId.slice(0, 8)}`;
  const settingsName = `Reviewed ${customer.tenantId.slice(0, 8)}`;
  const origin = 'http://127.0.0.1:3137';
  const development = process.env.VERIFICATION_APP_MODE === 'development';
  const checks: string[] = [];
  let step = 'prepare',
    worker: ChildProcess | undefined,
    browser: Browser | undefined;
  let page: Page | undefined;
  const progress = setInterval(() => console.log(`Console operations: ${step}`), 15000);
  progress.unref();
  const [original] = await owned.admin<
    { platform_name: string; support_email: string; updated_at: Date; updated_by: string | null }[]
  >`select platform_name,support_email,updated_at,updated_by from platform_settings`;
  assert.ok(original);
  async function status() {
    const [row] = await owned.admin<
      { status: string }[]
    >`select status from tenants where id=${customer!.tenantId}`;
    return row?.status;
  }
  async function statusAudit() {
    const [row] = await owned.admin<
      { n: number }[]
    >`select count(*)::int as n from platform_audit_log where target_tenant_id=${customer!.tenantId} and action in ('tenant.suspended','tenant.reactivated')`;
    return row?.n;
  }
  async function login(target: Page, fixture: typeof operator, next: string) {
    target.setDefaultNavigationTimeout(120000);
    target.setDefaultTimeout(45000);
    await target.goto(`${origin}/sign-in?next=${encodeURIComponent(next)}`, {
      waitUntil: 'networkidle',
    });
    await target.getByLabel('Email address').fill(fixture!.email);
    await target.getByLabel('Password', { exact: true }).fill(fixture!.password);
    await Promise.all([
      target.waitForURL((url) => url.pathname !== '/sign-in', { waitUntil: 'networkidle' }),
      target.getByRole('button', { name: /^sign in$/i }).click({ noWaitAfter: true }),
    ]);
  }
  async function settingsSave(target: Page, value: string) {
    await target.getByLabel('Platform name', { exact: true }).fill(value);
    await target.getByRole('button', { name: 'Review and save', exact: true }).click();
    await target
      .getByRole('dialog')
      .getByRole('button', { name: 'Save settings', exact: true })
      .click();
  }
  try {
    await mkdir('.test-report/phase-one', { recursive: true });
    await mkdir('.screenshots/phase-one-console-operations', { recursive: true });
    await owned.admin`insert into platform_admins(user_id,display_name) values(${operator.userId},'Console verifier')`;
    await owned.admin`insert into platform_admins(user_id,display_name,can_suspend_tenants,can_edit_master_rules,can_enter_support_mode) values(${restricted.userId},'Read-only console verifier',false,false,false)`;
    await owned.admin`update tenants set name=${name} where id=${customer.tenantId}`;
    worker = await applicationWorker(
      3137,
      { VERIFICATION_WORKER_LOG: '.test-report/phase-one/console-operations-worker.log' },
      development ? 'dev' : 'start',
    );
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      reducedMotion: 'reduce',
    });
    page = await context.newPage();
    page.setDefaultTimeout(45000);
    const nativeErrors: string[] = [];
    page.on('pageerror', (error) => nativeErrors.push(error.name));
    step = 'role entry';
    await login(page, operator, `/platform/tenants/${slug}`);
    assert.equal(new URL(page.url()).pathname, `/platform/tenants/${slug}`);
    checks.push('Operator password sign-in opens the requested live workspace.');

    step = 'suspension refusal and commit';
    await page.getByRole('button', { name: 'Suspend', exact: true }).click();
    let dialog = page.getByRole('dialog');
    await dialog.waitFor();
    assert.match(await dialog.innerText(), /team keeps read access/i);
    const confirm = dialog.getByRole('button', { name: 'Suspend workspace', exact: true });
    assert.equal(await confirm.isDisabled(), true);
    await dialog.getByLabel(`Type "${slug}" to confirm`, { exact: true }).fill('wrong workspace');
    assert.equal(await confirm.isDisabled(), true);
    assert.equal(await statusAudit(), 0);
    checks.push('Wrong typed workspace cannot submit and produces no status audit.');
    await dialog.getByLabel(`Type "${slug}" to confirm`, { exact: true }).fill(slug);
    await confirm.click();
    await dialog.getByText(/A reason is required/i).waitFor();
    assert.equal(await status(), 'active');
    assert.equal(await statusAudit(), 0);
    checks.push('Missing reason is refused by the actual server with no committed change.');
    await dialog
      .getByLabel('Reason · the customer sees this', { exact: true })
      .fill('Disposable console suspension acceptance');
    await confirm.click();
    await dialog.waitFor({ state: 'hidden' });
    await page.getByRole('button', { name: 'Reactivate', exact: true }).waitFor();
    assert.equal(await status(), 'suspended');
    assert.equal(await statusAudit(), 1);
    checks.push('Detail-page suspension commits once and immediately offers reactivation.');

    step = 'customer read-only policy';
    const customerContext = await browser.newContext();
    const customerPage = await customerContext.newPage();
    await login(customerPage, customer, '/app/settings/company');
    const reads = await customerPage.evaluate(
      async () => (await fetch('/api/v1/credentials')).status,
    );
    assert.equal(reads, 200);
    const denied = await customerPage.evaluate(
      async () =>
        (
          await fetch('/api/v1/credentials', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() },
            body: JSON.stringify({ name: 'Refused during suspension', scopes: ['tenant:read'] }),
          })
        ).status,
    );
    assert.equal(denied, 403);
    const [credentialCount] = await owned.admin<
      { n: number }[]
    >`select count(*)::int as n from api_credentials where tenant_id=${customer.tenantId}`;
    assert.equal(credentialCount?.n, 0);
    checks.push(
      'Suspended owner retains authenticated reads; credential writes are refused with no new key.',
    );

    step = 'detail reactivation';
    await page.getByRole('button', { name: 'Reactivate', exact: true }).click();
    dialog = page.getByRole('dialog');
    assert.equal(
      await dialog.getByLabel(`Type "${slug}" to confirm`, { exact: true }).inputValue(),
      '',
    );
    await dialog
      .getByLabel('Reason · the customer sees this', { exact: true })
      .fill('Disposable console reactivation acceptance');
    await dialog.getByLabel(`Type "${slug}" to confirm`, { exact: true }).fill(slug);
    await dialog.getByRole('button', { name: 'Reactivate workspace', exact: true }).click();
    await dialog.waitFor({ state: 'hidden' });
    await page.getByRole('button', { name: 'Suspend', exact: true }).waitFor();
    assert.equal(await status(), 'active');
    assert.equal(await statusAudit(), 2);
    const [correlated] = await owned.admin<
      { n: number }[]
    >`select count(*)::int as n from platform_audit_log p join audit_log a on a.request_id=p.request_id and a.action=p.action and a.tenant_id=p.target_tenant_id where p.target_tenant_id=${customer.tenantId} and p.action in ('tenant.suspended','tenant.reactivated')`;
    assert.equal(correlated?.n, 2);
    checks.push(
      'Detail-page reactivation restores active state; both status changes correlate to customer Activity.',
    );

    step = 'drawer keyboard and status operations';
    await page.goto(`${origin}/platform/tenants`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name, exact: true }).click();
    const drawer = page.getByRole('dialog', { name, exact: true });
    await drawer.waitFor();
    for (let tab = 0; tab < 24; tab++) {
      await page.keyboard.press('Tab');
      assert.equal(
        await drawer.evaluate((element) => element.contains(document.activeElement)),
        true,
      );
    }
    checks.push('Workspace drawer traps keyboard focus across repeated Tab navigation.');
    await drawer.getByRole('button', { name: 'Suspend', exact: true }).click();
    const nested = page.getByRole('dialog', { name: `Suspend ${name}`, exact: true });
    await nested.waitFor();
    await page.waitForFunction(
      (element) => element?.contains(document.activeElement),
      await nested.elementHandle(),
    );
    await page.keyboard.press('Escape');
    await nested.waitFor({ state: 'hidden' });
    // Radix restores the parent's accessibility and focus after the nested layer unmounts.
    await drawer.waitFor({ state: 'visible' });
    const suspendTrigger = drawer.getByRole('button', { name: 'Suspend', exact: true });
    await page.waitForFunction(
      (element) => element === document.activeElement,
      await suspendTrigger.elementHandle(),
    );
    assert.equal(await drawer.isVisible(), true);
    assert.equal(
      await drawer
        .getByRole('button', { name: 'Suspend', exact: true })
        .evaluate((element) => element === document.activeElement),
      true,
    );
    checks.push('Escape closes only the nested review and returns focus to its trigger.');
    await drawer.getByRole('button', { name: 'Suspend', exact: true }).click();
    await nested
      .getByLabel('Reason · the customer sees this', { exact: true })
      .fill('Disposable drawer suspension acceptance');
    await nested.getByLabel(`Type "${slug}" to confirm`, { exact: true }).fill(slug);
    await nested.getByRole('button', { name: 'Suspend workspace', exact: true }).click();
    await nested.waitFor({ state: 'hidden' });
    await drawer.waitFor({ state: 'hidden' });
    assert.equal(await status(), 'suspended');
    await page.getByRole('button', { name, exact: true }).click();
    await drawer.getByRole('button', { name: 'Reactivate', exact: true }).click();
    const resume = page.getByRole('dialog', { name: `Reactivate ${name}`, exact: true });
    await resume
      .getByLabel('Reason · the customer sees this', { exact: true })
      .fill('Disposable drawer reactivation acceptance');
    await resume.getByLabel(`Type "${slug}" to confirm`, { exact: true }).fill(slug);
    await resume.getByRole('button', { name: 'Reactivate workspace', exact: true }).click();
    await resume.waitFor({ state: 'hidden' });
    await drawer.waitFor({ state: 'hidden' });
    assert.equal(await status(), 'active');
    assert.equal(await statusAudit(), 4);
    checks.push('Drawer suspension and reactivation both persist their advertised status once.');

    step = 'phone modal and focus return';
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 720 });
      await page.goto(`${origin}/platform/tenants/${slug}`, { waitUntil: 'networkidle' });
      const trigger = page.getByRole('button', { name: 'Suspend', exact: true });
      await trigger.click();
      const review = page.getByRole('dialog');
      await review.waitFor();
      const box = await review.boundingBox();
      assert.ok(box && box.x >= 0 && box.x + box.width <= width + 1 && box.height <= 650);
      assert.equal(
        await review.evaluate((element) => element.scrollWidth <= element.clientWidth + 1),
        true,
      );
      await page.screenshot({
        path: `.screenshots/phase-one-console-operations/status-review-${width}.png`,
        fullPage: true,
      });
      await review.getByRole('button', { name: 'Cancel', exact: true }).click();
      assert.equal(await trigger.evaluate((element) => element === document.activeElement), true);
      await page.screenshot({
        path: `.screenshots/phase-one-console-operations/workspace-${width}.png`,
        fullPage: true,
      });
    }
    checks.push(
      '390px and 320px status reviews fit the viewport; Cancel returns focus without a write.',
    );

    step = 'capability refusal';
    const restrictedContext = await browser.newContext();
    const restrictedPage = await restrictedContext.newPage();
    await login(restrictedPage, restricted, `/platform/tenants/${slug}`);
    await restrictedPage.getByRole('button', { name: 'Suspend', exact: true }).click();
    const refusedReview = restrictedPage.getByRole('dialog');
    await refusedReview
      .getByLabel('Reason · the customer sees this', { exact: true })
      .fill('Restricted operator must be refused');
    await refusedReview.getByLabel(`Type "${slug}" to confirm`, { exact: true }).fill(slug);
    await refusedReview.getByRole('button', { name: 'Suspend workspace', exact: true }).click();
    await refusedReview.getByText(/Your operator account cannot/i).waitFor();
    assert.equal(await status(), 'active');
    assert.equal(await statusAudit(), 4);
    checks.push(
      'Operator without workspace-management capability cannot mutate or leave a success audit.',
    );

    step = 'settings validation and conflicting editors';
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`${origin}/platform/settings`, { waitUntil: 'networkidle' });
    await page.getByLabel('Support address', { exact: true }).fill('invalid');
    assert.equal(
      await page.getByRole('button', { name: 'Review and save', exact: true }).isDisabled(),
      true,
    );
    await page.getByRole('button', { name: 'Discard', exact: true }).click();
    const stale = await context.newPage();
    await stale.goto(`${origin}/platform/settings`, { waitUntil: 'networkidle' });
    step = 'settings initial save';
    await settingsSave(page, settingsName);
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    const [saved] = await owned.admin<
      { platform_name: string }[]
    >`select platform_name from platform_settings`;
    assert.equal(saved?.platform_name, settingsName);
    await page.reload({ waitUntil: 'networkidle' });
    assert.equal(
      await page.getByLabel('Platform name', { exact: true }).inputValue(),
      settingsName,
    );
    checks.push('Invalid platform address cannot submit; reviewed settings persist after reload.');
    step = 'settings stale refusal';
    await settingsSave(stale, 'Stale acceptance');
    await stale
      .getByRole('dialog')
      .getByRole('button', { name: 'Reload their version', exact: true })
      .waitFor();
    const [unchanged] = await owned.admin<
      { platform_name: string }[]
    >`select platform_name from platform_settings`;
    assert.equal(unchanged?.platform_name, settingsName);
    await stale.getByRole('button', { name: 'Reload their version', exact: true }).click();
    await stale.getByRole('dialog').waitFor({ state: 'hidden' });
    await stale.waitForFunction(
      (expected) =>
        (document.getElementById('platform-name') as HTMLInputElement | null)?.value === expected,
      settingsName,
    );
    assert.equal(
      await stale.getByLabel('Platform name', { exact: true }).inputValue(),
      settingsName,
    );
    checks.push('Stale settings editor is refused; reload recovers the committed version.');
    step = 'settings restore';
    await settingsSave(page, original.platform_name);
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    checks.push('Platform name is restored through the actual reviewed settings action.');

    step = 'offline refusal and retry';
    await page.goto(`${origin}/platform/tenants/${slug}`, { waitUntil: 'networkidle' });
    await context.setOffline(true);
    await page.getByRole('button', { name: 'Suspend', exact: true }).click();
    const offline = page.getByRole('dialog');
    await offline.getByText(/impact check is unavailable/i).waitFor();
    await offline
      .getByLabel('Reason · the customer sees this', { exact: true })
      .fill('Disposable network recovery acceptance');
    await offline.getByLabel(`Type "${slug}" to confirm`, { exact: true }).fill(slug);
    await offline.getByRole('button', { name: 'Suspend workspace', exact: true }).click();
    await offline.getByText(/change could not be confirmed/i).waitFor();
    assert.equal(await status(), 'active');
    assert.equal(await statusAudit(), 4);
    assert.equal(
      await offline.getByLabel('Reason · the customer sees this', { exact: true }).inputValue(),
      'Disposable network recovery acceptance',
    );
    checks.push(
      'Offline preview and save preserve the review, explain uncertainty and create no mutation.',
    );
    await context.setOffline(false);
    await offline.getByRole('button', { name: 'Suspend workspace', exact: true }).click();
    await offline.waitFor({ state: 'hidden' });
    await page.getByRole('button', { name: 'Reactivate', exact: true }).click();
    const recovered = page.getByRole('dialog');
    await recovered
      .getByLabel('Reason · the customer sees this', { exact: true })
      .fill('Restore after disposable network recovery');
    await recovered.getByLabel(`Type "${slug}" to confirm`, { exact: true }).fill(slug);
    await recovered.getByRole('button', { name: 'Reactivate workspace', exact: true }).click();
    await recovered.waitFor({ state: 'hidden' });
    assert.equal(await status(), 'active');
    assert.equal(await statusAudit(), 6);
    checks.push(
      'Retry after network recovery commits once; reactivation restores the owned workspace.',
    );
    assert.deepEqual(nativeErrors, []);
  } catch (error) {
    const dialogText = page
      ? await page
          .locator('[role="dialog"]')
          .allTextContents()
          .catch(() => [])
      : [];
    await writeFile(
      '.test-report/phase-one/console-operations-failure.txt',
      `${step}\n${String(error)}\n${JSON.stringify(dialogText)}\n${
        page
          ? await page
              .locator('body')
              .innerText()
              .catch(() => '')
          : ''
      }`,
    );
    if (page)
      await page
        .screenshot({
          path: '.screenshots/phase-one-console-operations/failure.png',
          fullPage: true,
        })
        .catch(() => undefined);
    throw error;
  } finally {
    clearInterval(progress);
    await browser?.close();
    if (worker && worker.exitCode === null) {
      worker.kill();
      await new Promise<void>((done) => worker!.once('exit', () => done()));
    }
    await owned.admin`update platform_settings set platform_name=${original.platform_name},support_email=${original.support_email},updated_at=${original.updated_at},updated_by=${original.updated_by}`;
    await owned.admin`delete from platform_audit_log where actor_user_id=any(${[operator.userId, restricted.userId]}::uuid[])`;
    await owned.admin`delete from platform_admins where user_id=any(${[operator.userId, restricted.userId]}::uuid[])`;
    await owned.cleanup();
  }
  await writeFile(
    '.test-report/phase-one/console-operations.json',
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        localOnly: true,
        productionBuild: !development,
        checks,
        passed: true,
        fixtureCleanup: true,
        boundary:
          'Native console status lifecycle, capability refusal, customer read/write policy, settings conflict recovery and targeted keyboard/phone acceptance. This is not a complete WCAG audit or full remaining console/support matrix.',
      },
      null,
      2,
    ) + '\n',
  );
  console.log(
    `Console operations: ${checks.length} native scenarios passed; owned fixtures removed.`,
  );
}
void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
