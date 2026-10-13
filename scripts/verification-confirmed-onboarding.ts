/** Actual confirmation emails, workspace creation, console reads and colleague acceptance. */
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import type { ChildProcess } from 'node:child_process';
import { parse } from 'dotenv';
import { chromium, type Browser, type Page } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import { capturedConfirmation } from './verification-confirmation-mail';

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
    NEXT_DIST_DIR: '.next-live-verify',
    SESSION_COOKIE_PLATFORM: 'alcassa_verify_platform',
    SESSION_COOKIE_TENANT: 'alcassa_verify_tenant',
  });
  assert.equal(process.env.NEXT_PUBLIC_SUPABASE_URL, 'http://127.0.0.1:55421');
  const settings = (await (
    await fetch('http://127.0.0.1:55421/auth/v1/settings', {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! },
    })
  ).json()) as { mailer_autoconfirm: boolean };
  assert.equal(settings.mailer_autoconfirm, false, 'This run requires actual email confirmation.');
  const { httpFixtures, applicationWorker } = await import('./verification-http-fixture');
  const owned = await httpFixtures(1);
  const operator = owned.fixtures[0]!;
  const run = randomUUID();
  const company = `Created acceptance ${run.slice(0, 8)}`;
  const ownerEmail = `created-${run}@example.invalid`;
  const colleagueEmail = `confirmed-${run}@example.invalid`;
  const password = `${randomBytes(24).toString('hex')}!aA9`;
  const origin = 'http://127.0.0.1:3100';
  const development = process.env.VERIFICATION_APP_MODE === 'development';
  let browser: Browser | undefined, worker: ChildProcess | undefined;
  let step = 'prepare';
  const checks: string[] = [];
  const seenMail = new Set<string>();
  let newTenant: string | undefined;
  const progress = setInterval(() => console.log(`Confirmed onboarding: ${step}`), 15000);
  progress.unref();
  const confirmation = (email: string) => capturedConfirmation(email, seenMail);
  async function signIn(page: Page, email: string, pwd: string, next: string) {
    await page.goto(`${origin}/sign-in?next=${encodeURIComponent(next)}`);
    await page.waitForLoadState('networkidle');
    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password', { exact: true }).fill(pwd);
    await Promise.all([
      page.waitForURL(
        (url) => !url.pathname.startsWith('/sign-in') || url.searchParams.has('error'),
        { waitUntil: 'load' },
      ),
      page.getByRole('button', { name: /^sign in$/i }).click(),
    ]);
    assert(
      !new URL(page.url()).searchParams.has('error'),
      `Native sign-in refused: ${new URL(page.url()).searchParams.get('error')}`,
    );
  }
  try {
    await mkdir('.test-report/phase-one', { recursive: true });
    await owned.admin`insert into platform_admins(user_id,display_name) values(${operator.userId},'Creation reviewer')`;
    const provider = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const operatorIdentity = await provider.auth.signInWithPassword({
      email: operator.email,
      password: operator.password,
    });
    assert.equal(
      operatorIdentity.error,
      null,
      'Owned operator must authenticate against the local provider.',
    );
    assert.equal(operatorIdentity.data.user?.id, operator.userId);
    const [plan] = await owned.admin<
      { plan_id: string; code: string }[]
    >`select s.plan_id,p.code from subscriptions s join plans p on p.id=s.plan_id where s.tenant_id=${operator.tenantId}`;
    assert(plan);
    await owned.admin`update plans set price_amount=1700 where id=${plan.plan_id}`;
    await owned.admin`insert into plan_entitlements(plan_id,key,kind,limit_value,display_name) values(${plan.plan_id},'seats','limit',5,'Team seats')`;
    const [before] = await owned.admin<
      { n: number }[]
    >`select count(*)::int n from tenants where deleted_at is null`;
    worker = await applicationWorker(
      3100,
      { VERIFICATION_WORKER_LOG: '.test-report/phase-one/confirmed-worker-private.log' },
      development ? 'dev' : 'start',
    );
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    const adminContext = await browser.newContext(),
      ownerContext = await browser.newContext(),
      colleagueContext = await browser.newContext();
    const adminPage = await adminContext.newPage(),
      ownerPage = await ownerContext.newPage(),
      join = await colleagueContext.newPage();
    for (const page of [adminPage, ownerPage, join]) page.setDefaultTimeout(60000);
    step = 'public workspace signup';
    await ownerPage.goto(`${origin}/sign-up`);
    await ownerPage.waitForLoadState('networkidle');
    await ownerPage.getByLabel('Your full name').fill('Workspace acceptance owner');
    await ownerPage.getByLabel('Work email').fill(ownerEmail);
    await ownerPage.getByLabel('Company or organisation name').fill(company);
    await ownerPage.getByLabel('Account password', { exact: true }).fill(password);
    await Promise.all([
      ownerPage.waitForURL('**/sign-up/verify?**'),
      ownerPage.getByRole('button', { name: 'Create workspace', exact: true }).click(),
    ]);
    const [created] = await owned.admin<
      { id: string; slug: string; status: string }[]
    >`select id,slug,status from tenants where name=${company} and deleted_at is null`;
    assert(created);
    newTenant = created.id;
    assert.equal(created.status, 'trial');
    await confirmation(ownerEmail);
    // Local Auth permits another confirmation email after one second.
    await new Promise((done) => setTimeout(done, 1100));
    step = 'owner confirmation resend';
    await ownerPage.getByRole('button', { name: 'Resend verification email', exact: true }).click();
    await ownerPage.waitForURL('**resent=1');
    const ownerLink = await confirmation(ownerEmail);
    await ownerPage.goto(`${origin}/app/settings/company`);
    await ownerPage.waitForURL((url) => url.pathname === '/sign-in');
    checks.push('Unconfirmed signup cannot enter protected workspace pages');
    step = 'actual owner email confirmation';
    await ownerPage.goto(ownerLink, { waitUntil: 'load' });
    await ownerPage.waitForURL((url) => url.pathname === '/app');
    await ownerPage.goto(`${origin}/app/settings/company`);
    assert.equal(await ownerPage.getByLabel('Company name').inputValue(), company);
    checks.push('Latest captured owner confirmation resumes the created workspace');
    step = 'live console directory and detail';
    await signIn(adminPage, operator.email, operator.password, '/platform/tenants');
    await adminPage.waitForLoadState('networkidle');
    await adminPage.getByRole('button', { name: company, exact: true }).waitFor();
    assert.equal(
      await adminPage
        .getByRole('button', { name: 'Grid view', exact: true })
        .getAttribute('aria-pressed'),
      'true',
    );
    await adminPage.getByPlaceholder('Search by name, slug or ID...').fill(company);
    await adminPage.getByRole('button', { name: company, exact: true }).waitFor();
    await adminPage.getByRole('button', { name: 'List view', exact: true }).click();
    await adminPage.getByRole('button', { name: company, exact: true }).waitFor();
    await adminPage.getByRole('button', { name: 'Grid view', exact: true }).click();
    await adminPage.getByRole('button', { name: company, exact: true }).waitFor();
    const directory = (await adminPage.locator('body').innerText()).replace(/\s+/g, ' ');
    assert(directory.includes(`${before!.n + 1} businesses.`));
    await adminPage.goto(`${origin}/platform/tenants/${created.slug}?tab=billing`);
    await adminPage.getByRole('heading', { name: company, exact: true }).waitFor();
    assert.equal(
      await adminPage.getByText('This screen did not load.', { exact: true }).count(),
      0,
    );
    checks.push(
      'Created trial without a plan appears first in the default grid, search, live counts and detail',
    );
    step = 'native initial plan assignment';
    await adminPage.getByRole('button', { name: 'Change plan', exact: true }).click();
    const dialog = adminPage.getByRole('dialog');
    await dialog.getByRole('combobox', { name: 'New plan' }).selectOption(plan.code);
    await dialog
      .getByLabel('Reason', { exact: true })
      .fill('Assign the owned acceptance plan for confirmation verification.');
    await dialog.getByRole('button', { name: 'Change plan', exact: true }).click();
    await dialog.waitFor({ state: 'hidden' });
    const [assigned] = await owned.admin<
      { plan_id: string }[]
    >`select plan_id from subscriptions where tenant_id=${newTenant}`;
    assert.equal(assigned?.plan_id, plan.plan_id);
    checks.push(
      'Admin assigns a first plan to the newly created workspace through the reviewed dialog',
    );
    step = 'colleague invitation';
    await ownerPage.goto(`${origin}/app/settings/team/invite`);
    await ownerPage.getByLabel('Email address').fill(colleagueEmail);
    await ownerPage.getByRole('radio', { name: /Administrator/ }).check();
    await ownerPage.getByRole('button', { name: 'Send invitation', exact: true }).click();
    const notice = ownerPage.getByRole('status').filter({ hasText: 'could not email' });
    await notice.waitFor();
    const token = (await notice.innerText()).match(/\/invite\/([A-Za-z0-9_-]+)/)?.[1];
    assert(token);
    await join.goto(`${origin}/invite/${token}`);
    await join.waitForLoadState('networkidle');
    await join.getByLabel('Your full name').fill('Confirmed acceptance colleague');
    await join.getByLabel('Create your account password', { exact: true }).fill(password);
    await join
      .getByRole('button', { name: 'Accept invitation & join workspace', exact: true })
      .click();
    await join.getByRole('heading', { name: 'Confirm your email to join', exact: true }).waitFor();
    assert.equal(await join.locator('input[type="password"]').count(), 0);
    for (const width of [1440, 390, 320]) {
      await join.setViewportSize({ width, height: 900 });
      assert(
        await join.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        `Confirmation must fit ${width}px`,
      );
    }
    await join.setViewportSize({ width: 1440, height: 900 });
    const [pending] = await owned.admin<
      { accepted_at: Date | null; members: number }[]
    >`select i.accepted_at,(select count(*)::int from tenant_members m join auth.users u on u.id=m.user_id where m.tenant_id=${newTenant} and u.email=${colleagueEmail}) members from invitations i where i.tenant_id=${newTenant} and i.email=${colleagueEmail}`;
    assert.equal(pending?.accepted_at, null);
    assert.equal(pending?.members, 0);
    checks.push(
      'Confirmation-required colleague signup reserves the invitation without granting membership',
    );
    await confirmation(colleagueEmail);
    await new Promise((done) => setTimeout(done, 1100));
    step = 'invitation confirmation resend and continuation';
    await join.getByRole('button', { name: 'Resend confirmation email', exact: true }).click();
    await join.waitForURL('**confirmation=sent');
    const colleagueLink = await confirmation(colleagueEmail);
    await join.goto(colleagueLink, { waitUntil: 'load' });
    await join.waitForURL((url) => url.pathname === `/invite/${token}`);
    await join.getByRole('heading', { name: `Join ${company}`, exact: true }).waitFor();
    checks.push('Actual confirmation email returns to the same invitation for explicit acceptance');
    await Promise.all([
      join.waitForURL((url) => url.pathname === '/app'),
      join.getByRole('button', { name: 'Accept invitation & join workspace', exact: true }).click(),
    ]);
    const [joined] = await owned.admin<
      { members: number; seats: number; admins: number; verified: number }[]
    >`select
      (select count(*)::int from tenant_members where tenant_id=${newTenant} and status='active') members,
      (select current_value::int from usage_counters where tenant_id=${newTenant} and key='seats') seats,
      (select count(*)::int from tenant_members m join auth.users u on u.id=m.user_id where m.tenant_id=${newTenant} and u.email=${colleagueEmail} and m.role='admin' and m.status='active') admins,
      (select count(*)::int from auth.users where email=${colleagueEmail} and email_confirmed_at is not null) verified`;
    assert.deepEqual(joined, { members: 2, seats: 2, admins: 1, verified: 1 });
    checks.push(
      'Confirmed colleague receives exactly the invited role; two memberships reconcile to two seats',
    );
    step = 'replay refusal and console tabs';
    await join.goto(`${origin}/invite/${token}`);
    await join.getByRole('heading', { name: 'You have already joined', exact: true }).waitFor();
    for (const tab of ['overview', 'billing', 'staff', 'channels', 'rules', 'audit']) {
      const response = await adminPage.goto(
        `${origin}/platform/tenants/${created.slug}?tab=${tab}`,
        { waitUntil: 'load' },
      );
      assert.equal(response?.status(), 200);
      await adminPage.getByRole('heading', { name: company, exact: true }).waitFor();
      assert.equal(
        await adminPage.getByText('This screen did not load.', { exact: true }).count(),
        0,
      );
    }
    checks.push('Reused invitation is refused; all six live workspace detail tabs load');
    step = 'live console export';
    await adminPage.goto(`${origin}/platform/tenants`);
    const [download] = await Promise.all([
      adminPage.waitForEvent('download'),
      adminPage.getByRole('link', { name: 'Export', exact: true }).click(),
    ]);
    assert(download.suggestedFilename().endsWith('.csv'));
    const downloadedPath = await download.path();
    assert(downloadedPath);
    assert((await readFile(downloadedPath, 'utf8')).includes(company));
    await download.delete();
    checks.push('Console export includes the actual created workspace');
  } catch (error) {
    const diagnostic = browser?.contexts()[0]?.pages()[0];
    if (diagnostic) {
      await diagnostic
        .screenshot({ path: '.test-report/phase-one/confirmed-console-private.png' })
        .catch(() => undefined);
      await writeFile(
        '.test-report/phase-one/confirmed-console-private.txt',
        await diagnostic
          .locator('body')
          .innerText()
          .catch(() => 'Page unavailable'),
      );
    }
    await mkdir('.test-report/phase-one', { recursive: true });
    await writeFile(
      '.test-report/phase-one/confirmed-onboarding-private.log',
      error instanceof Error ? (error.stack ?? error.message) : String(error),
    );
    throw Error(`Confirmed onboarding failed at ${step}; inspect the private diagnostic.`);
  } finally {
    clearInterval(progress);
    await browser?.close();
    if (worker && worker.exitCode === null) {
      worker.kill();
      await new Promise<void>((done) => worker!.once('exit', () => done()));
    }
    const users = await owned.admin<
      { id: string }[]
    >`select id from auth.users where email in (${ownerEmail},${colleagueEmail})`;
    const tenantRows = await owned.admin<
      { id: string }[]
    >`select id from tenants where name=${company}`;
    for (const tenant of tenantRows) {
      for (const table of [
        'audit_log',
        'invitations',
        'subscription_overrides',
        'subscriptions',
        'usage_counters',
        'tenant_settings',
        'tenant_members',
      ])
        await owned.admin`delete from ${owned.admin(table)} where tenant_id=${tenant.id}`;
      await owned.admin`delete from platform_audit_log where target_tenant_id=${tenant.id}`;
      await owned.admin`delete from tenants where id=${tenant.id}`;
    }
    for (const user of users) {
      await owned.admin`delete from platform_audit_log where actor_user_id=${user.id}`;
      await owned.admin`delete from sessions where user_id=${user.id}`;
      await owned.admin`delete from user_profiles where id=${user.id}`;
      await owned.admin`delete from auth.users where id=${user.id}`;
    }
    await owned.admin`delete from platform_audit_log where actor_user_id=${operator.userId}`;
    await owned.admin`delete from platform_admins where user_id=${operator.userId}`;
    await owned.cleanup();
  }
  await writeFile(
    '.test-report/phase-one/confirmed-onboarding.json',
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        passed: true,
        productionBuild: !development,
        localOnly: true,
        emailConfirmationRequired: true,
        checks,
        ownedDatabaseAndAuthFixturesRemoved: true,
        capturedEmailEvidence:
          'Retained privately in disposable local capture; excluded from public receipt',
      },
      null,
      2,
    ),
  );
  console.log(
    `Confirmed onboarding and live console: ${checks.length} checks passed; owned database/Auth fixtures removed.`,
  );
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Owned onboarding verification failed');
  process.exitCode = 1;
});
