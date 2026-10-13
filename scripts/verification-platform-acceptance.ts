/** Native M4 support, profile and rule journeys, checked against owned database records. */
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import type { ChildProcess } from 'node:child_process';
import { parse } from 'dotenv';
import { chromium, type Browser, type Page, type Locator } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';
import { createClient } from '@supabase/supabase-js';

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
  const owned = await httpFixtures(3),
    [operator, customer, colleague] = owned.fixtures;
  assert(operator && customer && colleague);
  const ids = [operator.userId, colleague.userId];
  const origin = 'http://127.0.0.1:3139',
    slug = `operations-${customer.tenantId}`;
  const customerName = `Platform acceptance ${customer.tenantId.slice(0, 8)}`;
  const invitationId = randomUUID(),
    invitationEmail = `support-${randomUUID()}@example.invalid`;
  const baselineToken = createHash('sha256').update(randomUUID()).digest('hex');
  const checks: string[] = [],
    modalChecks: { name: string; violations: string[] }[] = [];
  let worker: ChildProcess | undefined,
    browser: Browser | undefined,
    page: Page | undefined,
    step = 'prepare',
    passed = false;
  const progress = setInterval(() => console.log(`Platform acceptance: ${step}`), 15000);
  progress.unref();
  const [original] = await owned.admin<
    { id: string; current_version_id: string | null; updated_at: Date }[]
  >`select id,current_version_id,updated_at from master_ai_rules`;
  assert(original);
  let [originalVersion] = await owned.admin<
    { version_number: number }[]
  >`select version_number from master_ai_rule_versions where id=${original.current_version_id}`;
  let baselineRuleId = original.current_version_id;
  const [lock] = await owned.admin<
    { action: string }[]
  >`select action from platform_audit_log where action in ('support.lock_engaged','support.lock_released') order by occurred_at desc limit 1`;
  assert.notEqual(
    lock?.action,
    'support.lock_engaged',
    'Release an existing local support lock before this owned test.',
  );
  // A global lock would revoke unrelated visits; require the isolated stack to have none open.
  const [open] = await owned.admin<
    { n: number }[]
  >`select count(*)::int n from sessions where kind='support' and revoked_at is null and expires_at>now()`;
  assert.equal(open?.n, 0, 'Do not interrupt another local support visit.');
  const auth = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  async function login(fixture: typeof operator, destination: string) {
    const context = await browser!.newContext({
      viewport: { width: 1440, height: 1000 },
      reducedMotion: 'reduce',
    });
    const target = await context.newPage();
    target.setDefaultTimeout(20000);
    target.setDefaultNavigationTimeout(90000);
    await target.goto(`${origin}/sign-in?next=${encodeURIComponent(destination)}`, {
      waitUntil: 'networkidle',
    });
    await target.getByLabel('Email address').fill(fixture!.email);
    await target.getByLabel('Password', { exact: true }).fill(fixture!.password);
    await Promise.all([
      target.waitForURL((url) => url.pathname != '/sign-in', { waitUntil: 'networkidle' }),
      target.getByRole('button', { name: /^sign in$/i }).click({ noWaitAfter: true }),
    ]);
    return target;
  }
  async function poll<T>(read: () => Promise<T>, accept: (value: T) => boolean) {
    for (let i = 0; i < 80; i++) {
      const value = await read();
      if (accept(value)) return value;
      await new Promise((done) => setTimeout(done, 100));
    }
    throw Error(`Readback did not settle: ${step}`);
  }
  async function profile() {
    const [row] = await owned.admin<
      { full_name: string; avatar_path: string | null }[]
    >`select full_name,avatar_path from user_profiles where id=${operator!.userId}`;
    assert(row);
    return row;
  }
  async function ruleState() {
    const [row] = await owned.admin<
      { current_version_id: string | null; n: number }[]
    >`select current_version_id,(select count(*)::int from master_ai_rule_versions where authored_by=any(${ids})) n from master_ai_rules where id=${original!.id}`;
    assert(row);
    return row;
  }
  async function grant() {
    const [row] = await owned.admin<
      {
        id: string;
        expires_at: Date;
        revoked_at: Date | null;
        end_reason: string | null;
        support_context: { extensions?: number };
      }[]
    >`select id,expires_at,revoked_at,end_reason,support_context from sessions where user_id=${operator!.userId} and kind='support' order by created_at desc limit 1`;
    return row;
  }
  async function keyboardModal(target: Page, dialog: Locator, name: string) {
    for (let i = 0; i < 16; i++) {
      await target.keyboard.press('Tab');
      assert(
        await dialog.evaluate((el) => el.contains(document.activeElement)),
        `${name} focus escaped`,
      );
    }
    const result = await new AxeBuilder({ page: target })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    modalChecks.push({
      name,
      violations: result.violations.map((v) => `${v.id}:${v.nodes.length}`),
    });
    if (result.violations.length)
      await writeFile(
        `.test-report/phase-one/m4-modal-${name}-private.json`,
        JSON.stringify(result.violations, null, 2),
      );
    assert.equal(result.violations.length, 0, `${name} accessibility`);
  }
  async function start(target: Page, reason: string, offline = false) {
    await target.goto(`${origin}/platform/tenants/${slug}`, { waitUntil: 'networkidle' });
    await target.getByRole('button', { name: 'Support session', exact: true }).click();
    const dialog = target.getByRole('dialog', { name: `Enter ${customerName}`, exact: true });
    await dialog.getByRole('note', { name: /Session reference TKT/ }).waitFor();
    const confirm = dialog.getByRole('button', { name: 'Start 30-minute session', exact: true });
    assert(await confirm.isDisabled());
    await dialog.getByLabel(/^Reason/).fill(reason);
    if (offline) {
      await target.context().setOffline(true);
      await confirm.click();
      await dialog.getByText(/could not be confirmed/).waitFor();
      assert.equal((await grant())?.revoked_at == null && !!(await grant()), false);
      assert.equal(await dialog.getByLabel(/^Reason/).inputValue(), reason);
      await target.context().setOffline(false);
    }
    await confirm.click();
    await dialog.waitFor({ state: 'hidden' });
    const created = await poll(grant, (row) => !!row && !row.revoked_at);
    assert(created);
    return created;
  }
  try {
    await mkdir('.test-report/phase-one', { recursive: true });
    await mkdir('.screenshots/phase-one-platform-acceptance', { recursive: true });
    await owned.admin`insert into platform_admins(user_id,display_name) values(${operator.userId},'Platform acceptance A'),(${colleague.userId},'Platform acceptance B')`;
    await owned.admin`update tenants set name=${customerName} where id=${customer.tenantId}`;
    const [sub] = await owned.admin<
      { plan_id: string }[]
    >`select plan_id from subscriptions where tenant_id=${customer.tenantId}`;
    assert(sub);
    await owned.admin`insert into plan_entitlements(plan_id,key,kind,limit_value,display_name) values(${sub.plan_id},'seats','limit',8,'Team seats'),(${sub.plan_id},'audit_retention_days','limit',30,'Activity history')`;
    await owned.admin`insert into invitations(id,tenant_id,email,role,token_hash,invited_by,expires_at,created_at,updated_at) values(${invitationId},${customer.tenantId},${invitationEmail},'agent',${baselineToken},${customer.userId},now()+interval '7 days',now()-interval '2 days',now()-interval '2 days')`;
    await owned.admin`update usage_counters set current_value=2,peak_value=2 where tenant_id=${customer.tenantId} and key='seats'`;
    worker = await applicationWorker(3139, {
      VERIFICATION_WORKER_LOG: '.test-report/phase-one/m4-acceptance-worker.log',
    });
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    page = await login(operator, `/platform/tenants/${slug}`);
    const other = await login(colleague, '/platform/support-sessions');
    let dialog: Locator;

    if (!['profile-rules', 'rules'].includes(process.env.M4_ACCEPTANCE_GROUP ?? '')) {
      step = 'provisioning draft recovery and keyboard';
      await page.goto(`${origin}/platform/tenants`, { waitUntil: 'networkidle' });
      const provisionTrigger = page.getByRole('button', {
        name: 'Provision workspace',
        exact: true,
      });
      await provisionTrigger.click();
      const provision = page.getByRole('dialog', { name: 'Provision a workspace', exact: true });
      await provision.getByLabel('Legal name', { exact: true }).waitFor();
      await keyboardModal(page, provision, 'provision');
      await provision
        .getByLabel('Legal name', { exact: true })
        .fill('Isolated offline provisioning');
      const draftSlug = `offline-${customer.tenantId.slice(0, 8)}`;
      await provision.getByLabel(/^Workspace identifier/).fill(draftSlug);
      await provision.getByLabel(/^Owner email/).fill(invitationEmail);
      await page.context().setOffline(true);
      await provision.getByRole('button', { name: 'Provision workspace', exact: true }).click();
      await provision.getByRole('alert').filter({ hasText: 'could not be confirmed' }).waitFor();
      assert.equal(
        await provision.getByLabel('Legal name', { exact: true }).inputValue(),
        'Isolated offline provisioning',
      );
      assert.equal(
        await provision
          .getByRole('button', { name: 'Provision workspace', exact: true })
          .isDisabled(),
        false,
      );
      const [missing] = await owned.admin<
        { n: number }[]
      >`select count(*)::int n from tenants where slug=${draftSlug}`;
      assert.equal(missing?.n, 0);
      await page.context().setOffline(false);
      await provision.getByRole('button', { name: 'Close', exact: true }).click();
      await provision.waitFor({ state: 'hidden' });
      await poll(
        () => provisionTrigger.evaluate((element) => document.activeElement === element),
        (focused) => focused,
      );
      checks.push(
        'Provisioning traps keyboard focus, names its fields, preserves a failed offline draft and returns focus to its opener on dismissal without creating a workspace.',
      );
      if (process.env.M4_ACCEPTANCE_GROUP === 'provision') {
        passed = true;
        return;
      }
      step = 'support entry, offline recovery and modal keyboard';
      let current = await start(page, 'Review isolated support invitation controls', true);
      checks.push(
        'Support entry requires a generated immutable reference and valid reason; offline failure retains the reason, creates no grant, and retries once.',
      );
      await page.goto(`${origin}/platform/inside`, { waitUntil: 'networkidle' });
      await page.getByRole('heading', { name: customerName, exact: true }).waitFor();
      assert.equal(
        await page.getByRole('heading', { name: 'Operational acceptance', exact: true }).count(),
        0,
      );
      const invite = page.locator('li').filter({ hasText: invitationEmail });
      await invite.getByRole('button', { name: 'Resend', exact: true }).click();
      dialog = page.getByRole('dialog');
      await keyboardModal(page, dialog, 'inside-resend');
      await page.context().setOffline(true);
      await dialog.getByRole('button', { name: 'Resend', exact: true }).click();
      await dialog.getByText(/could not be confirmed/).waitFor();
      const [unchangedInvite] = await owned.admin<
        { token_hash: string }[]
      >`select token_hash from invitations where id=${invitationId}`;
      assert.equal(unchangedInvite?.token_hash, baselineToken);
      await page.context().setOffline(false);
      await dialog.getByRole('button', { name: 'Resend', exact: true }).click();
      await dialog.getByText(/Wait a day before sending another/).waitFor();
      const [cooldownInvite] = await owned.admin<
        { token_hash: string }[]
      >`select token_hash from invitations where id=${invitationId}`;
      assert.equal(cooldownInvite?.token_hash, baselineToken);
      await owned.admin`update invitations set expires_at=now()+interval '5 days' where id=${invitationId}`;
      await dialog.getByRole('button', { name: 'Resend', exact: true }).click();
      await dialog.waitFor({ state: 'hidden' });
      const [resent] = await owned.admin<
        { token_hash: string }[]
      >`select token_hash from invitations where id=${invitationId}`;
      assert.notEqual(resent?.token_hash, baselineToken);
      const [resendAudit] = await owned.admin<
        { n: number }[]
      >`select count(*)::int n from audit_log where tenant_id=${customer.tenantId} and actor_user_id=${operator.userId} and support_mode and action='invitation.resent'`;
      assert.equal(resendAudit?.n, 1);
      checks.push(
        'Inside support reads resolve the customer context; invitation resend preserves state offline, rotates the actual token online and records one support-mode customer event.',
      );

      step = 'colleague termination and stale customer action';
      await invite.getByRole('button', { name: 'Revoke', exact: true }).click();
      dialog = page.getByRole('dialog');
      await other.reload({ waitUntil: 'networkidle' });
      const card = other.getByRole('article', {
        name: `Platform acceptance A in ${customerName}`,
        exact: true,
      });
      await card.getByRole('button', { name: 'End this visit', exact: true }).click();
      await other
        .getByRole('dialog')
        .getByRole('button', { name: 'End the visit', exact: true })
        .click();
      await poll(grant, (row) => row?.end_reason === 'colleague');
      await dialog.getByRole('button', { name: 'Revoke', exact: true }).click();
      await dialog.getByText(/support visit has ended/).waitFor();
      const [notRevoked] = await owned.admin<
        { revoked_at: Date | null }[]
      >`select revoked_at from invitations where id=${invitationId}`;
      assert.equal(notRevoked?.revoked_at, null);
      await page.reload({ waitUntil: 'networkidle' });
      await page.getByRole('heading', { name: 'Not inside a workspace', exact: true }).waitFor();
      checks.push(
        'A second operator ends the visit; the already-open invitation review is refused without a write, and the next customer read resolves no support context.',
      );

      step = 'support extension ceiling and explicit leave';
      current = await start(page, 'Review bounded support extension controls');
      for (let extension = 1; extension <= 2; extension++) {
        await owned.admin`update sessions set expires_at=now()+interval '4 minutes' where id=${current.id}`;
        await page.goto(`${origin}/platform/support-sessions`, { waitUntil: 'networkidle' });
        const mine = page.getByRole('article', {
          name: `Platform acceptance A in ${customerName}`,
          exact: true,
        });
        await mine
          .getByRole('button', { name: `Extend · ${3 - extension} left`, exact: true })
          .click();
        await poll(grant, (row) => row?.support_context.extensions === extension);
      }
      await owned.admin`update sessions set expires_at=now()+interval '4 minutes' where id=${current.id}`;
      await page.reload({ waitUntil: 'networkidle' });
      const mine = page.getByRole('article', {
        name: `Platform acceptance A in ${customerName}`,
        exact: true,
      });
      assert.equal(await mine.getByRole('button', { name: /^Extend/ }).count(), 0);
      await mine.getByRole('button', { name: 'Leave', exact: true }).click();
      await poll(grant, (row) => row?.end_reason === 'operator');
      checks.push(
        'Two native extensions succeed only in the controlled last-five-minute window; no third extension is offered, and explicit leave closes the grant.',
      );

      step = 'expiry and live capability revocation';
      current = await start(page, 'Review expiry of an isolated support grant');
      await owned.admin`update sessions set expires_at=now()-interval '1 second' where id=${current.id}`;
      await page.goto(`${origin}/platform/inside`, { waitUntil: 'networkidle' });
      await page.getByRole('heading', { name: 'Not inside a workspace', exact: true }).waitFor();
      await page.goto(`${origin}/platform/support-sessions`, { waitUntil: 'networkidle' });
      await poll(grant, (row) => row?.end_reason === 'expired');
      current = await start(page, 'Review live support capability revocation');
      await owned.admin`update platform_admins set can_enter_support_mode=false where user_id=${operator.userId}`;
      await page.goto(`${origin}/platform/inside`, { waitUntil: 'networkidle' });
      await page.getByRole('heading', { name: 'Not inside a workspace', exact: true }).waitFor();
      await owned.admin`update platform_admins set can_enter_support_mode=true where user_id=${operator.userId}`;
      await owned.admin`update sessions set revoked_at=now(),end_reason='operator' where id=${current.id}`;
      checks.push(
        'Controlled expiry closes the visit; removing the operator’s live support capability removes customer context on the next read.',
      );

      step = 'emergency support lock and recovery';
      current = await start(page, 'Review emergency support access controls');
      const stale = await page.context().newPage();
      stale.setDefaultTimeout(20000);
      await stale.goto(`${origin}/platform/tenants/${slug}`, { waitUntil: 'networkidle' });
      await stale.getByRole('button', { name: 'Support session', exact: true }).click();
      await stale
        .getByRole('dialog')
        .getByRole('note', { name: /Session reference TKT/ })
        .waitFor();
      await stale
        .getByRole('dialog')
        .getByLabel(/^Reason/)
        .fill('This must be refused while support is locked');
      await other.goto(`${origin}/platform/settings?tab=security`, { waitUntil: 'networkidle' });
      if (
        !(await other.getByRole('button', { name: 'Lock support access', exact: true }).isVisible())
      )
        await other.getByRole('tab', { name: /Security/ }).click();
      await other.getByRole('button', { name: 'Lock support access', exact: true }).click();
      let lockDialog = other.getByRole('dialog');
      await lockDialog.locator('#break-glass-reason').fill('Isolated emergency lock acceptance');
      await lockDialog.getByRole('button', { name: 'Lock support access', exact: true }).click();
      await lockDialog.waitFor({ state: 'hidden' });
      await poll(grant, (row) => row?.end_reason === 'break_glass');
      await stale
        .getByRole('dialog')
        .getByRole('button', { name: 'Start 30-minute session', exact: true })
        .click();
      await stale
        .getByRole('dialog')
        .getByText(/locked/i)
        .waitFor();
      assert.equal((await grant())?.id, current.id);
      await other.getByRole('button', { name: 'Restore support access', exact: true }).click();
      lockDialog = other.getByRole('dialog');
      await lockDialog
        .locator('#break-glass-reason')
        .fill('Isolated lock verified; restore support access');
      await lockDialog.getByRole('button', { name: 'Restore support access', exact: true }).click();
      await lockDialog.waitFor({ state: 'hidden' });
      await stale.close();
      checks.push(
        'Emergency lock closes the existing owned visit, refuses a stale prepared entry without another grant, and native release restores availability.',
      );

      step = 'successful support revoke and seat release';
      await start(page, 'Review isolated invitation withdrawal');
      await page.goto(`${origin}/platform/inside`, { waitUntil: 'networkidle' });
      await page
        .locator('li')
        .filter({ hasText: invitationEmail })
        .getByRole('button', { name: 'Revoke', exact: true })
        .click();
      await page.getByRole('dialog').getByRole('button', { name: 'Revoke', exact: true }).click();
      await page.getByRole('dialog').waitFor({ state: 'hidden' });
      const [revoked] = await owned.admin<
        { revoked_at: Date | null }[]
      >`select revoked_at from invitations where id=${invitationId}`;
      assert(revoked?.revoked_at);
      const [seat] = await owned.admin<
        { current_value: number }[]
      >`select current_value from usage_counters where tenant_id=${customer.tenantId} and key='seats'`;
      assert.equal(Number(seat?.current_value), 1);
      checks.push(
        'A fresh authorized visit revokes the invitation and releases its reserved seat; the refused stale attempt did neither.',
      );
    }
    if (!['rules', 'support'].includes(process.env.M4_ACCEPTANCE_GROUP ?? '')) {
      step = 'profile validation, keyboard and offline save';
      await page.goto(`${origin}/platform/profile`, { waitUntil: 'networkidle' });
      const fullName = page.getByLabel('Full name', { exact: true });
      await fullName.fill('');
      assert(await page.getByRole('button', { name: 'Save changes', exact: true }).isDisabled());
      await fullName.fill('Discard this isolated draft');
      await fullName.press('Escape');
      assert.equal(await fullName.inputValue(), 'Operational verifier');
      await fullName.fill('  Platform   Profile Review  ');
      await page.context().setOffline(true);
      await fullName.press('Control+Enter');
      await page
        .getByText(/Your name update could not be confirmed/)
        .first()
        .waitFor();
      assert.equal((await profile()).full_name, 'Operational verifier');
      assert.equal(await fullName.inputValue(), '  Platform   Profile Review  ');
      await page.context().setOffline(false);
      await fullName.press('Control+Enter');
      await poll(profile, (row) => row.full_name === 'Platform Profile Review');
      await page.reload({ waitUntil: 'networkidle' });
      assert.equal(await fullName.inputValue(), 'Platform Profile Review');
      const [roster] = await owned.admin<
        { display_name: string }[]
      >`select display_name from platform_admins where user_id=${operator.userId}`;
      assert.equal(roster?.display_name, 'Platform acceptance A');
      checks.push(
        'Invalid names cannot save; Escape discards, Ctrl+Enter recovers an offline draft, canonical whitespace persists, and the separately granted roster label is preserved.',
      );

      step = 'profile image validation and storage lifecycle';
      const picker = page.getByLabel('Choose a profile photo', { exact: true });
      await picker.setInputFiles({
        name: 'invalid.png',
        mimeType: 'image/png',
        buffer: Buffer.from('not an image; fixture only'),
      });
      await page.getByRole('alert').filter({ hasText: 'not a PNG' }).waitFor();
      assert.equal((await profile()).avatar_path, null);
      const image = Buffer.from(
        await page.evaluate(() => {
          const canvas = document.createElement('canvas');
          canvas.width = 128;
          canvas.height = 64;
          const ctx = canvas.getContext('2d')!;
          ctx.fillStyle = '#003cff';
          ctx.fillRect(0, 0, 128, 64);
          return canvas.toDataURL('image/png').split(',')[1]!;
        }),
        'base64',
      );
      await picker.setInputFiles({ name: 'acceptance.png', mimeType: 'image/png', buffer: image });
      const uploaded = await poll(profile, (row) => !!row.avatar_path);
      assert(uploaded.avatar_path);
      const avatarUrl = `http://127.0.0.1:55421/storage/v1/object/public/avatars/${uploaded.avatar_path}`;
      const stored = await fetch(avatarUrl);
      assert.equal(stored.status, 200);
      assert.match(stored.headers.get('content-type') || '', /image\/webp/);
      const signed = await auth.auth.signInWithPassword({
        email: operator.email,
        password: operator.password,
      });
      assert(signed.data.session);
      const forbiddenPath = `platform/${colleague.userId}/${randomUUID()}.png`;
      const forbiddenUpload = await auth.storage
        .from('avatars')
        .upload(forbiddenPath, image, { contentType: 'image/png' });
      assert(
        forbiddenUpload.error,
        'A signed-in operator must not upload into another identity’s folder.',
      );
      const deniedType = await auth.storage
        .from('avatars')
        .upload(
          `platform/${operator.userId}/${randomUUID()}.html`,
          Buffer.from('<p>Rejected owned fixture</p>'),
          { contentType: 'text/html' },
        );
      assert(
        deniedType.error,
        'Storage must refuse unsupported content types outside the application form.',
      );
      const deniedSize = await auth.storage
        .from('avatars')
        .upload(`platform/${operator.userId}/${randomUUID()}.png`, Buffer.alloc(2097153), {
          contentType: 'image/png',
        });
      assert(
        deniedSize.error,
        'Storage must enforce the 2MB ceiling outside the application form.',
      );
      const foreignAuth = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
        { auth: { persistSession: false, autoRefreshToken: false } },
      );
      const foreignSession = await foreignAuth.auth.signInWithPassword({
        email: colleague.email,
        password: colleague.password,
      });
      assert(foreignSession.data.session);
      const foreignUpload = await foreignAuth.storage
        .from('avatars')
        .upload(forbiddenPath, image, { contentType: 'image/png' });
      assert(foreignUpload.data && !foreignUpload.error);
      const forbiddenRemove = await auth.storage.from('avatars').remove([forbiddenPath]);
      assert(!forbiddenRemove.data?.length);
      const foreignUrl = `http://127.0.0.1:55421/storage/v1/object/public/avatars/${forbiddenPath}`;
      assert.equal((await fetch(foreignUrl)).status, 200);
      const ownRemoval = await foreignAuth.storage.from('avatars').remove([forbiddenPath]);
      assert(ownRemoval.data?.length === 1);
      await foreignAuth.auth.signOut({ scope: 'local' });
      await auth.auth.signOut({ scope: 'local' });
      checks.push(
        'The user-scoped Storage API refuses foreign-folder upload and deletion, unsupported MIME types and files over 2MB; the object owner can upload and remove their own image.',
      );
      await page.getByRole('button', { name: 'Replace photo', exact: true }).waitFor();
      await page.context().setOffline(true);
      await picker.setInputFiles({ name: 'offline.png', mimeType: 'image/png', buffer: image });
      await page.getByRole('alert').filter({ hasText: 'could not be confirmed' }).waitFor();
      assert.equal((await profile()).avatar_path, uploaded.avatar_path);
      await page.context().setOffline(false);
      await picker.setInputFiles({ name: 'replacement.png', mimeType: 'image/png', buffer: image });
      const replaced = await poll(
        profile,
        (row) => !!row.avatar_path && row.avatar_path !== uploaded.avatar_path,
      );
      assert(replaced.avatar_path);
      await poll(
        async () => (await fetch(avatarUrl)).status,
        (status) => status !== 200,
      );
      await page.reload({ waitUntil: 'networkidle' });
      await page.getByRole('button', { name: 'Remove', exact: true }).click();
      dialog = page.getByRole('dialog', { name: 'Remove your profile photo?', exact: true });
      await keyboardModal(page, dialog, 'profile-photo');
      await page.context().setOffline(true);
      await dialog.getByRole('button', { name: 'Remove photo', exact: true }).click();
      await dialog.getByText(/could not be confirmed/).waitFor();
      assert.equal((await profile()).avatar_path, replaced.avatar_path);
      await page.context().setOffline(false);
      await dialog.getByRole('button', { name: 'Remove photo', exact: true }).click();
      await dialog.waitFor({ state: 'hidden' });
      await poll(profile, (row) => row.avatar_path === null);
      await poll(
        async () =>
          (
            await fetch(
              `http://127.0.0.1:55421/storage/v1/object/public/avatars/${replaced.avatar_path}`,
            )
          ).status,
        (status) => status !== 200,
      );
      checks.push(
        'Malformed images are refused; real browser crop/re-encoding stores WebP, offline replacement/removal preserve the stored image, replacement deletes the old object, and removal clears the profile and object.',
      );
    }
    if (process.env.M4_ACCEPTANCE_GROUP !== 'support') {
      step = 'shared rule publication, stale editor and restoration';
      await page.goto(`${origin}/platform/ai-rules`, { waitUntil: 'networkidle' });
      if (!originalVersion) {
        await page.getByRole('button', { name: 'Create shared guidance', exact: true }).click();
        const first = page.getByRole('dialog');
        await first
          .getByLabel(/^Tone/)
          .fill('Considerate shared guidance for isolated acceptance.');
        await first.getByLabel(/^What changed/).fill('Create the first shared guidance version');
        await first.getByRole('button', { name: 'Publish rules', exact: true }).click();
        await first.waitFor({ state: 'hidden' });
        const [created] = await owned.admin<
          { id: string; version_number: number }[]
        >`select v.id,v.version_number from master_ai_rules r join master_ai_rule_versions v on v.id=r.current_version_id where r.id=${original.id}`;
        assert(created);
        originalVersion = created;
        baselineRuleId = created.id;
        checks.push(
          'An empty shared-rule set accepts its first native publication and exposes the real published version.',
        );
      }
      assert(originalVersion);
      await other.goto(`${origin}/platform/ai-rules`, { waitUntil: 'networkidle' });
      await page.getByRole('button', { name: 'Edit rules', exact: true }).click();
      await other.getByRole('button', { name: 'Edit rules', exact: true }).click();
      dialog = page.getByRole('dialog');
      const oldState = await ruleState();
      assert(await dialog.getByRole('button', { name: 'Publish rules', exact: true }).isDisabled());
      await dialog.getByLabel(/^Tone/).fill('Concise, considerate isolated acceptance guidance.');
      await dialog.getByLabel(/^What changed/).fill('Isolated publication acceptance');
      await keyboardModal(page, dialog, 'master-rules');
      await page.context().setOffline(true);
      await dialog.getByRole('button', { name: 'Publish rules', exact: true }).click();
      await dialog.getByText(/could not be confirmed/).waitFor();
      assert.deepEqual(await ruleState(), oldState);
      await page.context().setOffline(false);
      await dialog.getByRole('button', { name: 'Publish rules', exact: true }).click();
      await dialog.waitFor({ state: 'hidden' });
      const published = await poll(
        ruleState,
        (row) => row.current_version_id !== oldState.current_version_id,
      );
      assert.equal(published.n, oldState.n + 1);
      const staleRules = other.getByRole('dialog');
      await staleRules
        .getByLabel(/^Tone/)
        .fill('This stale editor must not overwrite the published review.');
      await staleRules.getByLabel(/^What changed/).fill('Stale publication acceptance');
      await staleRules.getByRole('button', { name: 'Publish rules', exact: true }).click();
      await staleRules
        .getByText(
          'Shared guidance changed while you were reviewing it. Reload the page and review the current version before continuing.',
          { exact: true },
        )
        .waitFor();
      assert.deepEqual(await ruleState(), published);
      await other.keyboard.press('Escape');
      await page.reload({ waitUntil: 'networkidle' });
      const restore = page
        .getByText(`v${originalVersion.version_number}`, { exact: true })
        .locator('xpath=../..')
        .locator('..')
        .getByRole('button', { name: 'restore', exact: true });
      await restore.click();
      dialog = page.getByRole('dialog', {
        name: `Restore v${originalVersion.version_number}`,
        exact: true,
      });
      assert(
        await dialog
          .getByRole('button', { name: `Restore v${originalVersion.version_number}`, exact: true })
          .isDisabled(),
      );
      await dialog
        .getByLabel(/^Why/)
        .fill('Restore the reviewed baseline after isolated acceptance');
      await page.context().setOffline(true);
      await dialog
        .getByRole('button', { name: `Restore v${originalVersion.version_number}`, exact: true })
        .click();
      await dialog.getByText(/could not be confirmed/).waitFor();
      assert.deepEqual(await ruleState(), published);
      await page.context().setOffline(false);
      await dialog
        .getByRole('button', { name: `Restore v${originalVersion.version_number}`, exact: true })
        .click();
      await dialog.waitFor({ state: 'hidden' });
      const restored = await poll(ruleState, (row) => row.current_version_id === baselineRuleId);
      assert.equal(restored.n, published.n);
      checks.push(
        'Shared rules require changed fields and a note; offline publish/restore keep drafts and the pointer unchanged, publication appends once, a stale second editor cannot overwrite it, and restoration retains history.',
      );

      step = 'rule authority rechecked after render';
      await other.reload({ waitUntil: 'networkidle' });
      await other.getByRole('button', { name: 'Edit rules', exact: true }).click();
      const restrictedDialog = other.getByRole('dialog');
      await restrictedDialog.getByLabel(/^Tone/).fill('Refuse after capability removal');
      await restrictedDialog.getByLabel(/^What changed/).fill('Live capability refusal acceptance');
      await owned.admin`update platform_admins set can_edit_master_rules=false where user_id=${colleague.userId}`;
      await restrictedDialog.getByRole('button', { name: 'Publish rules', exact: true }).click();
      await restrictedDialog
        .getByText(/Your operator account cannot edit the master AI rules/)
        .waitFor();
      assert.deepEqual(await ruleState(), restored);
      checks.push(
        'Removing shared-rule capability after the editor opens is enforced on submission; no version is appended and no successful publication is recorded.',
      );
    }
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto(`${origin}/platform/profile`, { waitUntil: 'networkidle' });
    assert(
      (await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)) <= 1,
    );
    await page.screenshot({
      path: '.screenshots/phase-one-platform-acceptance/profile-320.png',
      fullPage: true,
    });
    passed = true;
  } catch (error) {
    if (page) {
      await page
        .context()
        .setOffline(false)
        .catch(() => {});
      await page
        .screenshot({
          path: '.screenshots/phase-one-platform-acceptance/failure.png',
          fullPage: true,
        })
        .catch(() => {});
      await writeFile(
        '.test-report/phase-one/m4-acceptance-failure-private.txt',
        `${step}\n${String(error)}\n${await page
          .locator('body')
          .innerText()
          .catch(() => '')}`,
      );
    }
    throw error;
  } finally {
    clearInterval(progress);
    await browser?.close();
    if (worker && worker.exitCode === null) {
      worker.kill();
      await new Promise<void>((done) => worker!.once('exit', () => done()));
    }
    await owned.admin`update master_ai_rules set current_version_id=${original.current_version_id},updated_at=${original.updated_at} where id=${original.id}`;
    await owned.admin`delete from master_ai_rule_versions where authored_by=any(${ids})`;
    await owned.admin`delete from invitations where tenant_id=${customer.tenantId}`;
    await owned.admin`delete from platform_audit_log where actor_user_id=any(${ids})`;
    await owned.admin`delete from platform_admins where user_id=any(${ids})`;
    for (const identity of [operator, colleague]) {
      const { data: signed } = await auth.auth.signInWithPassword({
        email: identity.email,
        password: identity.password,
      });
      if (signed.session) {
        const { data: objects } = await auth.storage
          .from('avatars')
          .list(`platform/${identity.userId}`);
        if (objects?.length)
          await auth.storage
            .from('avatars')
            .remove(objects.map((row) => `platform/${identity.userId}/${row.name}`));
        await auth.auth.signOut({ scope: 'local' });
      }
    }
    await owned.cleanup();
    await writeFile(
      process.env.M4_ACCEPTANCE_GROUP === 'provision'
        ? '.test-report/phase-one/m4-provision-focus.json'
        : process.env.M4_ACCEPTANCE_GROUP === 'support'
          ? '.test-report/phase-one/m4-platform-acceptance-support.json'
          : '.test-report/phase-one/m4-platform-acceptance.json',
      JSON.stringify(
        {
          checkedAt: new Date().toISOString(),
          passed,
          group: process.env.M4_ACCEPTANCE_GROUP ?? 'full',
          productionBuild: true,
          localOnly: true,
          fixtureCleanup: true,
          checks,
          modalChecks,
          boundary:
            'Owned local fixtures. Expiry and extension windows use explicit controlled database clock setup. Browser and database acceptance is separate from client demonstration and actual screen-reader output.',
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
