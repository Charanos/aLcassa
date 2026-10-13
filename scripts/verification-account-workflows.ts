/** Actual browser account and colleague invitation journeys; all identities and mutations are owned. */
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import type { ChildProcess } from 'node:child_process';
import { chromium, type BrowserContext, type Page, type Browser } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import { applicationWorker, httpFixtures } from './verification-http-fixture';
import { capturedConfirmation } from './verification-confirmation-mail';

async function main() {
  const owned = await httpFixtures(3);
  const [operator, owner, colleague] = owned.fixtures;
  assert(operator && owner && colleague);
  const newEmail = `colleague-${randomUUID()}@example.invalid`;
  const withdrawnEmail = `withdrawn-${randomUUID()}@example.invalid`;
  const newPassword = `${randomBytes(24).toString('hex')}!aA9`;
  const colleaguePassword = `${randomBytes(24).toString('hex')}!aA9`;
  const origin = 'http://127.0.0.1:3100';
  let worker: ChildProcess | undefined;
  let browser: Browser | undefined;
  let step = 'prepare';
  const progress = setInterval(() => process.stdout.write(`Account workflow: ${step}\n`), 15000);
  progress.unref();
  const checks: string[] = [];
  const auth = () =>
    createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  async function signIn(
    context: BrowserContext,
    fixture: { email: string; password: string },
    destination: string,
  ): Promise<Page> {
    const page = await context.newPage();
    page.setDefaultTimeout(60000);
    await page.goto(`${origin}/sign-in?next=${encodeURIComponent(destination)}`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForLoadState('networkidle');
    await page.getByLabel('Email address').fill(fixture.email);
    await page.getByLabel('Password', { exact: true }).fill(fixture.password);
    await Promise.all([
      page.waitForURL((url) => !url.pathname.startsWith('/sign-in'), {
        waitUntil: 'domcontentloaded',
      }),
      page.getByRole('button', { name: /^sign in$/i }).click(),
    ]);
    return page;
  }
  async function privateInvite(page: Page, email: string): Promise<string> {
    await page.goto(`${origin}/app/settings/team/invite`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await page.getByLabel('Email address').fill(email);
    await page.getByRole('radio', { name: /Administrator/ }).check();
    await page.getByRole('button', { name: 'Send invitation', exact: true }).click();
    const notice = page.getByRole('status').filter({ hasText: 'could not email' });
    await notice.waitFor();
    const token = (await notice.innerText()).match(/\/invite\/([A-Za-z0-9_-]+)/)?.[1];
    assert(token, 'Unavailable delivery must retain a private invitation link for the owner.');
    return token;
  }
  try {
    await mkdir('.test-report/phase-one', { recursive: true });
    await owned.admin`insert into platform_admins(user_id,display_name) values(${operator.userId},'Account workflow reviewer')`;
    const [subscription] = await owned.admin<
      { plan_id: string }[]
    >`select plan_id from subscriptions where tenant_id=${owner.tenantId}`;
    assert(subscription);
    await owned.admin`insert into plan_entitlements(plan_id,key,kind,limit_value,display_name)
      values(${subscription.plan_id},'seats','limit',8,'Team seats'),(${subscription.plan_id},'audit_retention_days','limit',30,'Activity history')`;
    worker = await applicationWorker(3100);
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    const primary = await browser.newContext();
    const secondary = await browser.newContext();
    step = 'password sign-ins';
    const page = await signIn(primary, operator, '/platform/profile');
    const other = await signIn(secondary, operator, '/platform/profile');
    step = 'incorrect current password';
    await page.getByRole('button', { name: 'Change password', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog
      .getByLabel('Current password', { exact: true })
      .fill('Incorrect current password for review');
    await dialog.getByLabel('New password', { exact: true }).fill(newPassword);
    await dialog.getByLabel('Confirm new password', { exact: true }).fill(newPassword);
    await dialog.getByRole('button', { name: 'Change password', exact: true }).click();
    await dialog.getByText('That is not your current password.', { exact: true }).waitFor();
    const before = await owned.admin<
      { n: number }[]
    >`select count(*)::int as n from platform_audit_log where actor_user_id=${operator.userId} and action='password.changed'`;
    assert.equal(before[0]?.n, 0);
    const unchanged = auth();
    assert(
      !(
        await unchanged.auth.signInWithPassword({
          email: operator.email,
          password: operator.password,
        })
      ).error,
    );
    await unchanged.auth.signOut({ scope: 'local' });
    checks.push('Incorrect current password refused; provider password and audit unchanged');
    step = 'password update and other-device revocation';
    await dialog.getByLabel('Current password', { exact: true }).fill(operator.password);
    await dialog.getByRole('button', { name: 'Change password', exact: true }).click();
    await page.getByText('Password changed', { exact: true }).waitFor();
    step = 'password update: old provider password refusal';
    const oldAttempt = await auth().auth.signInWithPassword({
      email: operator.email,
      password: operator.password,
    });
    const providerCode = (value: string | undefined) =>
      value && /^[a-z_]{1,64}$/.test(value) ? value : 'none';
    step = `password update: old provider password refusal (provider code: ${providerCode(oldAttempt.error?.code)})`;
    assert.equal(
      oldAttempt.error?.code,
      'invalid_credentials',
      'The old provider password must be refused for invalid credentials, not an outage or rate limit.',
    );
    step = 'password update: new provider password acceptance';
    const changed = auth();
    const newAttempt = await changed.auth.signInWithPassword({
      email: operator.email,
      password: newPassword,
    });
    step = `password update: new provider password acceptance (provider code: ${providerCode(newAttempt.error?.code)})`;
    assert(
      !newAttempt.error,
      'The new provider password must be accepted after a successful password update.',
    );
    await changed.auth.signOut({ scope: 'local' });
    step = 'password update: current device remains authenticated';
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { level: 1 }).waitFor();
    assert(
      !new URL(page.url()).pathname.startsWith('/sign-in'),
      'Current device must remain authenticated.',
    );
    step = 'password update: other device denied';
    await other.reload({ waitUntil: 'domcontentloaded' });
    await other.waitForURL('**/sign-in?**');
    step = 'password update: durable audit and active session readback';
    const [passwordAudit] = await owned.admin<
      { n: number }[]
    >`select count(*)::int as n from platform_audit_log where actor_user_id=${operator.userId} and action='password.changed'`;
    assert.equal(passwordAudit?.n, 1, 'Exactly one password-change audit must be recorded.');
    const [sessions] = await owned.admin<
      { n: number }[]
    >`select count(*)::int as n from sessions where user_id=${operator.userId} and revoked_at is null`;
    assert.equal(sessions?.n, 1, 'Exactly one application session must remain active.');
    checks.push(
      'Password changed; old password refused, new password verified, one audit, current device preserved and other device denied',
    );

    step = 'new colleague invitation';
    const ownerContext = await browser.newContext();
    const ownerPage = await signIn(ownerContext, owner, '/app/settings/team');
    const newToken = await privateInvite(ownerPage, newEmail);
    step = 'wrong signed-in invitation identity';
    await ownerPage.goto(`${origin}/invite/${newToken}`, { waitUntil: 'domcontentloaded' });
    assert(
      await ownerPage
        .getByRole('button', { name: 'Accept invitation & join workspace' })
        .isDisabled(),
    );
    checks.push('Wrong signed-in identity cannot accept invitation');
    step = 'new colleague acceptance';
    const newcomer = await browser.newContext();
    const join = await newcomer.newPage();
    join.setDefaultTimeout(60000);
    await join.goto(`${origin}/invite/${newToken}`, { waitUntil: 'domcontentloaded' });
    await join.waitForLoadState('networkidle');
    await join.getByLabel('Your full name').fill('New colleague reviewer');
    await join.getByLabel('Create your account password', { exact: true }).fill(colleaguePassword);
    await join.getByRole('button', { name: 'Accept invitation & join workspace' }).click();
    await join.getByRole('heading', { name: 'Confirm your email to join', exact: true }).waitFor();
    await join.goto(await capturedConfirmation(newEmail), { waitUntil: 'domcontentloaded' });
    await join.waitForURL((url) => url.pathname === `/invite/${newToken}`);
    await Promise.all([
      join.waitForURL('**/app', { waitUntil: 'domcontentloaded' }),
      join.getByRole('button', { name: 'Accept invitation & join workspace' }).click(),
    ]);
    const [newMember] = await owned.admin<
      { role: string; status: string; email: string; confirmed: boolean }[]
    >`select m.role,m.status,p.email,(u.email_confirmed_at is not null) as confirmed from tenant_members m join user_profiles p on p.id=m.user_id join auth.users u on u.id=p.id where m.tenant_id=${owner.tenantId} and lower(p.email)=${newEmail}`;
    assert.deepEqual(newMember, {
      role: 'admin',
      status: 'active',
      email: newEmail,
      confirmed: true,
    });
    await join.goto(`${origin}/invite/${newToken}`, { waitUntil: 'domcontentloaded' });
    await join.getByRole('heading', { name: 'You have already joined', exact: true }).waitFor();
    checks.push(
      'New colleague creates provider identity and active administrator membership; used link refuses replay',
    );

    step = 'existing colleague acceptance';
    const existingToken = await privateInvite(ownerPage, colleague.email);
    const existing = await browser.newContext();
    const existingPage = await signIn(existing, colleague, `/invite/${existingToken}`);
    await Promise.all([
      existingPage.waitForURL('**/app', { waitUntil: 'domcontentloaded' }),
      existingPage.getByRole('button', { name: 'Accept invitation & join workspace' }).click(),
    ]);
    const [membership] = await owned.admin<
      { n: number }[]
    >`select count(*)::int as n from tenant_members where user_id=${colleague.userId} and tenant_id=${owner.tenantId} and role='admin' and status='active'`;
    assert.equal(membership?.n, 1);
    checks.push(
      'Existing confirmed colleague joins correct workspace without creating a duplicate identity',
    );

    step = 'invitation renewal';
    const oldToken = await privateInvite(ownerPage, withdrawnEmail);
    await owned.admin`update invitations set updated_at=now()-interval '2 days', created_at=now()-interval '2 days', expires_at=now()-interval '1 day' where tenant_id=${owner.tenantId} and email=${withdrawnEmail}`;
    await ownerPage.goto(`${origin}/app/settings/team`, { waitUntil: 'domcontentloaded' });
    await ownerPage.getByRole('button', { name: `Renew invitation for ${withdrawnEmail}` }).click();
    await ownerPage
      .getByRole('dialog')
      .getByRole('button', { name: 'Renew invitation', exact: true })
      .click();
    const renewedNotice = ownerPage.getByRole('status').filter({ hasText: 'renewed' });
    await renewedNotice.waitFor();
    const renewedToken = (await renewedNotice.innerText()).match(/\/invite\/([A-Za-z0-9_-]+)/)?.[1];
    assert(renewedToken && renewedToken !== oldToken);
    await join.goto(`${origin}/invite/${oldToken}`, { waitUntil: 'domcontentloaded' });
    await join
      .getByRole('heading', { name: 'This invitation is not valid', exact: true })
      .waitFor();
    checks.push(
      'Expired invitation renewed in UI; old token invalidated and new private link retained',
    );
    step = 'invitation withdrawal';
    await ownerPage
      .getByRole('button', { name: `Withdraw invitation for ${withdrawnEmail}` })
      .click();
    await ownerPage
      .getByRole('dialog')
      .getByRole('button', { name: 'Withdraw invitation', exact: true })
      .click();
    await ownerPage.getByText('No outstanding invitations', { exact: true }).waitFor();
    await join.goto(`${origin}/invite/${renewedToken}`, { waitUntil: 'domcontentloaded' });
    await join
      .getByRole('heading', { name: 'This invitation was withdrawn', exact: true })
      .waitFor();
    const [counter] = await owned.admin<
      { current_value: number }[]
    >`select current_value from usage_counters where tenant_id=${owner.tenantId} and key='seats'`;
    assert.equal(counter?.current_value, 3);
    const [accepted] = await owned.admin<
      { n: number }[]
    >`select count(*)::int as n from invitations where tenant_id=${owner.tenantId} and accepted_at is not null`;
    assert.equal(accepted?.n, 2);
    checks.push(
      'Withdrawn link refused; reserved seat released; two accepted colleagues and owner reconcile to three seats',
    );
  } catch (error) {
    await writeFile('.test-report/phase-one/account-workflows-private.log', String(error));
    throw new Error(`Owned account workflow failed at: ${step}. Inspect the private diagnostic.`);
  } finally {
    clearInterval(progress);
    await browser?.close();
    if (worker && worker.exitCode === null) {
      worker.kill();
      await new Promise<void>((done) => worker!.once('exit', () => done()));
    }
    const newUsers = await owned.admin<
      { id: string }[]
    >`select id from auth.users where email=${newEmail}`;
    await owned.admin`delete from invitations where tenant_id=${owner.tenantId}`;
    for (const user of newUsers) {
      await owned.admin`delete from tenant_members where user_id=${user.id} and tenant_id=${owner.tenantId}`;
      await owned.admin`delete from sessions where user_id=${user.id}`;
      await owned.admin`delete from user_profiles where id=${user.id}`;
      await owned.admin`delete from auth.users where id=${user.id}`;
    }
    await owned.admin`delete from platform_audit_log where actor_user_id=${operator.userId}`;
    await owned.admin`delete from platform_admins where user_id=${operator.userId}`;
    await owned.cleanup();
  }
  const result = {
    checkedAt: new Date().toISOString(),
    localOnly: true,
    productionBuild: true,
    checks,
    passed: checks.length === 7,
    fixtureCleanup: true,
    boundary:
      'Actual browser journeys against disposable Auth with signup email confirmation required and captured locally. Application invitation email is deliberately unavailable and its private-link fallback is verified. External sending domains and configured OAuth remain separate.',
  };
  await writeFile(
    '.test-report/phase-one/account-workflows.json',
    JSON.stringify(result, null, 2) + '\n',
  );
  process.stdout.write(JSON.stringify({ passed: result.passed, checks: checks.length }) + '\n');
}
void main().catch((error: unknown) => {
  process.stderr.write(String(error) + '\n');
  process.exitCode = 1;
});
