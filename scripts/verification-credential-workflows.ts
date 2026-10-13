/** Native credential and ownership failures against owned local accounts. */
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { createWriteStream, existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { parse } from 'dotenv';
import { resolve } from 'node:path';
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';

async function main() {
  for (const name of [
    'RESEND_API_KEY',
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN',
    'SENTRY_DSN',
    'NEXT_PUBLIC_SENTRY_DSN',
    'AXIOM_TOKEN',
    'AXIOM_DATASET',
    'OPENAI_API_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_SECRET_KEY',
    'ALLOW_DEMO_ACCESS',
  ])
    process.env[name] = '';
  const environment = existsSync('.env.verification.local')
    ? parse(await readFile('.env.verification.local'))
    : {};
  for (const [name, value] of Object.entries(environment))
    if (!['SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEY'].includes(name))
      process.env[name] = value;
  Object.assign(process.env, {
    CACHE_DISABLED: 'true',
    VERIFICATION_DISPOSABLE: 'true',
    SESSION_COOKIE_PLATFORM: 'alcassa_verify_platform',
    SESSION_COOKIE_TENANT: 'alcassa_verify_tenant',
  });
  assert.equal(process.env.NEXT_PUBLIC_SUPABASE_URL, 'http://127.0.0.1:55421');
  const database = new URL(process.env.DATABASE_URL ?? '');
  assert.equal(database.hostname, '127.0.0.1');
  assert.equal(database.port, '55422');
  assert.equal(database.username, 'alcassa_app');
  const { httpFixtures, applicationWorker, signIn } = await import('./verification-http-fixture');
  const owned = await httpFixtures(2);
  const [owner, colleague] = owned.fixtures;
  assert(owner && colleague);
  const origin = 'http://127.0.0.1:3142';
  const serviceOrigin = 'http://127.0.0.1:8142';
  const serviceRoot = process.env.VERIFICATION_SERVICE_ROOT ?? '../aLcassa-service';
  const checks: string[] = [],
    secrets: string[] = [];
  let worker: ChildProcess | undefined,
    service: ChildProcess | undefined,
    browser: Browser | undefined;
  let step = 'prepare';
  let originalMaster:
    { id: string; current_version_id: string | null; updated_at: Date } | undefined;
  let temporaryMaster = false;
  const masterVersion = crypto.randomUUID();
  const progress = setInterval(() => console.log(`Credential workflows: ${step}`), 15000);
  progress.unref();
  async function count() {
    const [row] = await owned.admin<
      { n: number }[]
    >`select count(*)::int as n from api_credentials where tenant_id=${owner!.tenantId}`;
    return row!.n;
  }
  async function keyFrom(page: Page) {
    const reveal = page.locator('[data-slot="credential-reveal"]');
    await reveal.waitFor();
    const key = (await reveal.innerText()).match(
      /csk_(?:live|test)_[a-f0-9]{16}_[A-Za-z0-9_-]{43}/,
    )?.[0];
    assert(key, 'Creation must show one valid key.');
    secrets.push(key);
    return key;
  }
  async function begin(page: Page, name: string) {
    await page.goto(`${origin}/app/settings/credentials/new`, { waitUntil: 'networkidle' });
    await page.getByLabel('Name', { exact: true }).fill(name);
    await page.getByLabel('Read assistant rules').check();
    await page.getByLabel('Read workspace details').check();
  }
  async function finish(page: Page) {
    await page.getByLabel('I have stored this key securely.').check();
    await page.getByRole('button', { name: 'I have saved this', exact: true }).click();
    await page.waitForURL('**/app/settings/credentials', { waitUntil: 'networkidle' });
  }
  async function serviceRead(key: string, path: string, status: number, etag?: string) {
    const requestId = crypto.randomUUID();
    const response = await fetch(`${serviceOrigin}/service/v1/${path}`, {
      headers: {
        Authorization: `Bearer ${key}`,
        'X-Request-Id': requestId,
        ...(etag ? { 'If-None-Match': etag } : {}),
      },
      signal: AbortSignal.timeout(30000),
    });
    assert.equal(response.status, status, `Service ${path} must return the expected status.`);
    assert.equal(response.headers.get('x-request-id'), requestId);
    assert.match(response.headers.get('cache-control') ?? '', /no-store/);
    if (status === 304) assert.equal(await response.text(), '');
    return response;
  }
  async function noSecrets(context: BrowserContext, page: Page) {
    const stored =
      JSON.stringify(await context.storageState()) +
      (await page.evaluate(() =>
        JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }),
      ));
    const html = await page.content();
    assert(
      !/csk_(?:live|test)_[a-f0-9]{16}_[A-Za-z0-9_-]{43}/.test(stored + html),
      'No plaintext API key may survive outside the one-time reveal.',
    );
    for (const secret of secrets) {
      assert(!stored.includes(secret), 'API key must not enter browser storage.');
      assert(!html.includes(secret), 'API key must not reappear outside its one-time reveal.');
    }
  }
  try {
    await mkdir('.test-report/phase-one', { recursive: true });
    [originalMaster] = await owned.admin<
      { id: string; current_version_id: string | null; updated_at: Date }[]
    >`select id,current_version_id,updated_at from master_ai_rules`;
    assert(originalMaster);
    if (!originalMaster.current_version_id) {
      await owned.admin.begin(async (tx) => {
        await tx`select pg_advisory_xact_lock(hashtextextended('master-rules',0))`;
        await tx`insert into master_ai_rule_versions(id,version_number,status,content,locked_fields,authored_by,published_at)
          select ${masterVersion},coalesce(max(version_number),0)+1,'published','{"tone":"Credential acceptance"}'::jsonb,'[]'::jsonb,${owner.userId},now() from master_ai_rule_versions`;
        await tx`update master_ai_rules set current_version_id=${masterVersion},updated_at=now() where id=${originalMaster!.id} and current_version_id is null`;
      });
      temporaryMaster = true;
    }
    worker = await applicationWorker(
      3142,
      { VERIFICATION_WORKER_LOG: '.test-report/phase-one/credential-worker-private.log' },
      process.env.VERIFICATION_APP_MODE === 'development' ? 'dev' : 'start',
    );
    service = spawn(
      resolve(
        serviceRoot,
        '.venv',
        process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python',
      ),
      [
        '-m',
        'uvicorn',
        'alcassa_service.main:app',
        '--host',
        '127.0.0.1',
        '--port',
        '8142',
        '--no-access-log',
      ],
      {
        cwd: serviceRoot,
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
          ...process.env,
          SERVICE_DATABASE_URL: process.env.DATABASE_URL!,
          SERVICE_DATABASE_URL_ADMIN: '',
          DATABASE_URL_ADMIN: '',
        },
      },
    );
    const serviceLog = createWriteStream('.test-report/phase-one/credential-service-private.log');
    service.stdout?.pipe(serviceLog, { end: false });
    service.stderr?.pipe(serviceLog, { end: false });
    service.once('exit', () => serviceLog.end());
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      if ((await fetch(`${serviceOrigin}/service/v1/ready`).catch(() => null))?.ok) {
        ready = true;
        break;
      }
      if (service.exitCode !== null) break;
      await new Promise((done) => setTimeout(done, 250));
    }
    assert(ready, 'Owned FastAPI worker must be ready.');
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    const context = await browser.newContext({
      acceptDownloads: true,
      permissions: ['clipboard-read', 'clipboard-write'],
    });
    const cookie = await signIn(3142, owner);
    await context.addCookies(
      cookie.split('; ').map((pair) => {
        const index = pair.indexOf('=');
        return { name: pair.slice(0, index), value: pair.slice(index + 1), url: origin };
      }),
    );
    const page = await context.newPage();
    page.setDefaultTimeout(45000);
    page.setDefaultNavigationTimeout(120000);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.name));

    step = 'offline creation and clipboard';
    await begin(page, 'Browser integration');
    await context.setOffline(true);
    await page.getByRole('button', { name: 'Create credential', exact: true }).click();
    await page.getByText(/Creation could not be confirmed/).waitFor();
    assert.equal(await count(), 0);
    assert(await page.getByLabel('Name', { exact: true }).isDisabled());
    await context.setOffline(false);
    await page.getByRole('button', { name: 'Check creation', exact: true }).click();
    const original = await keyFrom(page);
    assert.equal(await count(), 1);
    checks.push(
      'Refusal before dispatch retains the reviewed payload and checks the same request without duplicate creation.',
    );
    await page.getByRole('button', { name: 'Copy', exact: true }).click();
    await page.getByRole('button', { name: 'Copied', exact: true }).waitFor();
    assert(
      (await page.evaluate(() => navigator.clipboard.readText())) === original,
      'Clipboard must contain the one-time key.',
    );
    await page.evaluate(
      "Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.reject(new DOMException('Denied', 'NotAllowedError')) } })",
    );
    await page.getByRole('button', { name: 'Copied', exact: true }).click();
    await page.getByText(/Copy was unavailable/).waitFor();
    await page.evaluate(() =>
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined }),
    );
    await page.getByRole('button', { name: 'Copy', exact: true }).click();
    await page.getByText(/Copy was unavailable/).waitFor();
    checks.push(
      'Real clipboard success and injected permission-denied/unavailable APIs preserve the one-time reveal and offer alternatives.',
    );
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download .env', exact: true }).click();
    const download = await downloadPromise;
    assert.equal(download.suggestedFilename(), 'alcassa.env');
    const path = await download.path();
    assert(path);
    const content = await readFile(path, 'utf8');
    assert(
      content.includes(`API_KEY=${original}\n`),
      'Downloaded file must contain the exact one-time key.',
    );
    assert.match(content, /# Scopes: ai_rules:read, tenant:read/);
    await download.delete();
    await page.evaluate(
      "URL.createObjectURL = () => { throw new Error('Injected download refusal'); }",
    );
    await page.getByRole('button', { name: 'Download .env', exact: true }).click();
    await page.getByText(/Download was unavailable/).waitFor();
    checks.push(
      'Actual .env download has the reviewed scopes and exact key; download failure keeps copy/manual recovery available.',
    );
    await finish(page);
    await noSecrets(context, page);
    await page.goBack({ waitUntil: 'networkidle' });
    assert.equal(await page.locator('[data-slot="credential-reveal"]').count(), 0);
    await page.reload({ waitUntil: 'networkidle' });
    await noSecrets(context, page);
    const second = await context.newPage();
    await second.goto(`${origin}/app/settings/credentials`, { waitUntil: 'networkidle' });
    await noSecrets(context, second);
    checks.push(
      'Acknowledgement, history navigation, refresh and a second tab never recover the key or store it in browser state.',
    );

    step = 'lost creation response';
    await begin(page, 'Interrupted creation');
    let dropped = false;
    await page.route('**/app/settings/credentials/new', async (route) => {
      if (
        !dropped &&
        route.request().method() === 'POST' &&
        route.request().headers()['next-action']
      ) {
        dropped = true;
        await route.fetch({ maxRetries: 0, maxRedirects: 0 });
        await route.abort('failed');
      } else await route.continue();
    });
    await page.getByRole('button', { name: 'Create credential', exact: true }).click();
    await page.getByText(/Creation could not be confirmed/).waitFor();
    assert.equal(await count(), 2);
    await page.getByRole('button', { name: 'Check creation', exact: true }).click();
    await page.getByText(/This request already created a credential/).waitFor();
    assert.equal(await count(), 2);
    assert.equal(await page.locator('[data-slot="credential-reveal"]').count(), 0);
    await page.getByRole('button', { name: 'Open credentials', exact: true }).click();
    await page.waitForURL('**/app/settings/credentials', { waitUntil: 'networkidle' });
    checks.push(
      'A dropped response after committed creation resolves to metadata only with one credential and one creation audit.',
    );

    step = 'service use and replacement';
    const tenantResponse = await serviceRead(original, 'tenant', 200);
    assert.equal(
      ((await tenantResponse.json()) as { data: { id: string } }).data.id,
      owner.tenantId,
    );
    const rules = await serviceRead(original, 'ai-rules', 200);
    const etag = rules.headers.get('etag');
    assert(etag);
    await serviceRead(original, 'ai-rules', 304, etag);
    const row = page
      .getByRole('listitem')
      .filter({ has: page.getByRole('heading', { name: 'Browser integration', exact: true }) });
    await row.getByRole('button', { name: 'Replace', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click();
    assert.equal(await count(), 2);
    await row.getByRole('button', { name: 'Replace', exact: true }).click();
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Create replacement', exact: true })
      .click();
    const replacement = await keyFrom(page);
    await page.getByLabel('I have stored this key securely.').check();
    await page.getByRole('button', { name: 'I have saved this', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    await serviceRead(original, 'tenant', 200);
    await serviceRead(replacement, 'tenant', 200);
    await owned.admin`update api_credentials set expires_at=now()-interval '1 second' where tenant_id=${owner.tenantId} and status='rotating'`;
    await serviceRead(original, 'ai-rules', 401, etag);
    await serviceRead(replacement, 'ai-rules', 200);
    checks.push(
      'UI-created key reaches actual FastAPI; conditional reads authenticate; replacement cancellation, grace and expiry preserve the active successor.',
    );

    step = 'lost revocation response';
    await page.reload({ waitUntil: 'networkidle' });
    const active = page
      .getByRole('listitem')
      .filter({ has: page.getByRole('heading', { name: 'Browser integration', exact: true }) })
      .filter({ has: page.getByRole('button', { name: 'Replace', exact: true }) });
    await active.getByRole('button', { name: 'Revoke', exact: true }).click();
    let revokeDropped = false;
    await page.route('**/app/settings/credentials', async (route) => {
      if (
        !revokeDropped &&
        route.request().method() === 'POST' &&
        route.request().headers()['next-action']
      ) {
        revokeDropped = true;
        await route.fetch({ maxRetries: 0, maxRedirects: 0 });
        await route.abort('failed');
      } else await route.continue();
    });
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Revoke credential', exact: true })
      .click();
    await page
      .getByRole('dialog')
      .getByText(/Revocation could not be confirmed/)
      .waitFor();
    await serviceRead(replacement, 'ai-rules', 401, etag);
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Revoke credential', exact: true })
      .click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    const audit = await owned.admin<
      { action: string; entity_id: string }[]
    >`select action,entity_id from audit_log where tenant_id=${owner.tenantId} and action like 'credential.%'`;
    const created = audit.filter((row) => row.action === 'credential.created');
    assert.equal(created.length, 3);
    for (const record of created)
      assert.equal(
        audit.filter(
          (row) => row.entity_id === record.entity_id && row.action === 'credential.created',
        ).length,
        1,
      );
    const revoked = audit.filter((row) => row.action === 'credential.revoked');
    assert.equal(new Set(revoked.map((row) => row.entity_id)).size, revoked.length);
    checks.push(
      'Lost revocation response preserves review; idempotent retry records one event and warmed conditional service access is refused.',
    );
    await page.goto(`${origin}/app/settings/audit`, { waitUntil: 'networkidle' });
    await noSecrets(context, page);
    const later = JSON.stringify(
      await owned.admin`select before,after from audit_log where tenant_id=${owner.tenantId}`,
    );
    const metadata = await context.request.get(`${origin}/api/v1/credentials`);
    assert.equal(metadata.status(), 200);
    const metadataText = await metadata.text();
    assert(
      !/csk_(?:live|test)_[a-f0-9]{16}_[A-Za-z0-9_-]{43}/.test(later + metadataText),
      'Audit and metadata must exclude keys from interrupted creation too.',
    );
    for (const secret of secrets)
      assert(
        !later.includes(secret) && !metadataText.includes(secret),
        'Later metadata and audit must be secret-free.',
      );
    assert(!/key_hash|keyHash/.test(metadataText), 'Metadata must not expose stored hashes.');
    assert.equal(errors.length, 0, 'Fault handling must not crash the page.');
    checks.push(
      'Activity, metadata, browser storage and recorded audits exclude plaintext keys and stored hashes; handled transport failures do not crash the page.',
    );

    step = 'lost replacement response';
    await page.goto(`${origin}/app/settings/credentials`, { waitUntil: 'networkidle' });
    const interrupted = page
      .getByRole('listitem')
      .filter({ has: page.getByRole('heading', { name: 'Interrupted creation', exact: true }) });
    await interrupted.getByRole('button', { name: 'Replace', exact: true }).click();
    let replacementDropped = false;
    await page.unroute('**/app/settings/credentials');
    await page.route('**/app/settings/credentials', async (route) => {
      if (
        !replacementDropped &&
        route.request().method() === 'POST' &&
        route.request().headers()['next-action']
      ) {
        replacementDropped = true;
        await route.fetch({ maxRetries: 0, maxRedirects: 0 });
        await route.abort('failed');
      } else await route.continue();
    });
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Create replacement', exact: true })
      .click();
    await page
      .getByRole('dialog')
      .getByText(/Creation could not be confirmed/)
      .waitFor();
    assert.equal(await count(), 4);
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Check creation', exact: true })
      .click();
    await page
      .getByRole('dialog')
      .getByText(/This request already created a credential/)
      .waitFor();
    assert.equal(await count(), 4);
    const rotated = await owned.admin<
      { status: string; expires_at: Date | null }[]
    >`select status,expires_at from api_credentials where tenant_id=${owner.tenantId} and name='Interrupted creation'`;
    assert.equal(rotated.filter((credential) => credential.status === 'active').length, 1);
    const predecessor = rotated.find((credential) => credential.status === 'rotating');
    assert(predecessor?.expires_at && predecessor.expires_at.getTime() > Date.now());
    assert(predecessor.expires_at.getTime() <= Date.now() + 24 * 3600000);
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Open credentials', exact: true })
      .click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    await noSecrets(context, page);
    checks.push(
      'A lost replacement response reconciles the same operation without another successor or a second reveal; the predecessor keeps its bounded grace period.',
    );

    step = 'stale allowance';
    await begin(page, 'Stale allowance');
    const [subscription] = await owned.admin<
      { plan_id: string }[]
    >`select plan_id from subscriptions where tenant_id=${owner.tenantId}`;
    assert(subscription);
    await owned.admin`update plan_entitlements set limit_value=0 where plan_id=${subscription.plan_id} and key='api_keys'`;
    await page.getByRole('button', { name: 'Create credential', exact: true }).click();
    await page
      .getByRole('alert')
      .filter({ hasText: /credential|limit|allowance/i })
      .waitFor();
    assert.equal(await count(), 4);
    assert.equal(await page.locator('[data-slot="credential-reveal"]').count(), 0);
    await owned.admin`update plan_entitlements set limit_value=4 where plan_id=${subscription.plan_id} and key='api_keys'`;
    checks.push(
      'An allowance changed after opening the form is enforced at submission without a new key or secret reveal.',
    );

    step = 'ownership before dispatch';
    await owned.admin`delete from tenant_members where tenant_id=${colleague.tenantId} and user_id=${colleague.userId}`;
    await owned.admin`update user_profiles set full_name='Maya Review' where id=${colleague.userId}`;
    await owned.admin`insert into tenant_members(tenant_id,user_id,role,status) values(${owner.tenantId},${colleague.userId},'admin','active')`;
    await owned.admin`update usage_counters set current_value=2,peak_value=greatest(peak_value,2) where tenant_id=${owner.tenantId} and key='seats'`;
    const colleagueCookie = await signIn(3142, { ...colleague, tenantId: owner.tenantId });
    const colleagueContext = await browser.newContext();
    await colleagueContext.addCookies(
      colleagueCookie.split('; ').map((pair) => {
        const index = pair.indexOf('=');
        return { name: pair.slice(0, index), value: pair.slice(index + 1), url: origin };
      }),
    );
    assert.equal(
      (await colleagueContext.request.get(`${origin}/api/v1/credentials`)).status(),
      403,
    );
    await page.goto(`${origin}/app/settings/team`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Transfer ownership', exact: true }).click();
    let review = page.getByRole('dialog');
    await review.getByRole('radio', { name: /Maya Review/ }).check();
    await review.getByLabel('Your current password', { exact: true }).fill(owner.password);
    await context.setOffline(true);
    await review.getByRole('button', { name: 'Transfer ownership', exact: true }).click();
    await review.getByText('Check the current owner', { exact: true }).waitFor();
    assert.equal(
      await review.getByLabel('Your current password', { exact: true }).inputValue(),
      '',
    );
    assert.equal(
      await review.getByRole('button', { name: 'Transfer ownership', exact: true }).count(),
      0,
    );
    const unchanged =
      await owned.admin`select user_id from tenant_members where tenant_id=${owner.tenantId} and role='owner'`;
    assert.equal(unchanged.length, 1);
    assert.equal(unchanged[0]!.user_id, owner.userId);
    await context.setOffline(false);
    await review.getByRole('button', { name: 'Reload team', exact: true }).click();
    await page.waitForLoadState('networkidle');
    checks.push(
      'Ownership interrupted before dispatch preserves the owner, clears password input and requires reconciliation before another transfer.',
    );

    step = 'ownership after commit';
    await page.getByRole('button', { name: 'Transfer ownership', exact: true }).click();
    review = page.getByRole('dialog');
    await review.getByRole('radio', { name: /Maya Review/ }).check();
    await review.getByLabel('Your current password', { exact: true }).fill(owner.password);
    await page.route('**/api/v1/tenant/transfer-ownership', async (route) => {
      const committed = await route.fetch({ maxRetries: 0, maxRedirects: 0 });
      assert.equal(committed.status(), 200);
      await route.abort('failed');
    });
    const beforeSessions = await owned.admin<
      { id: string }[]
    >`select id from auth.sessions where user_id=${owner.userId}`;
    await review.getByRole('button', { name: 'Transfer ownership', exact: true }).click();
    await review.getByText('Check the current owner', { exact: true }).waitFor();
    assert.equal(
      await review.getByLabel('Your current password', { exact: true }).inputValue(),
      '',
    );
    const afterSessions = await owned.admin<
      { id: string }[]
    >`select id from auth.sessions where user_id=${owner.userId}`;
    assert.deepEqual(
      afterSessions.map((row) => row.id).sort(),
      beforeSessions.map((row) => row.id).sort(),
    );
    await page.unroute('**/api/v1/tenant/transfer-ownership');
    const duplicate = await context.request.post(`${origin}/api/v1/tenant/transfer-ownership`, {
      headers: { origin },
      data: { memberId: colleague.userId, password: owner.password },
    });
    assert.equal(duplicate.status(), 403);
    const owners =
      await owned.admin`select user_id from tenant_members where tenant_id=${owner.tenantId} and role='owner'`;
    assert.equal(owners.length, 1);
    assert.equal(owners[0]!.user_id, colleague.userId);
    const transfers =
      await owned.admin`select id from audit_log where tenant_id=${owner.tenantId} and action='tenant.ownership_transferred'`;
    assert.equal(transfers.length, 1);
    checks.push(
      'Lost ownership response after commit clears the password, preserves original provider sessions and records exactly one owner and one audit; duplicate former-owner submission is refused.',
    );
    await review.getByRole('button', { name: 'Reload team', exact: true }).click();
    await page.waitForLoadState('networkidle');
    assert.equal(
      await page.getByRole('button', { name: 'Transfer ownership', exact: true }).count(),
      0,
    );
    assert.equal((await context.request.get(`${origin}/api/v1/credentials`)).status(), 403);
    assert.equal(
      (await colleagueContext.request.get(`${origin}/api/v1/credentials`)).status(),
      200,
    );
    await noSecrets(context, page);
    checks.push(
      'Existing sessions immediately resolve changed owner/admin permissions; the new owner gains credentials access without signing in again.',
    );
    step = 'published tracker checkpoint';
    const layout: { width: number; overflow: number; violations: string[] }[] = [];
    const checkpointResponse = await page.goto(
      `${origin}/project-tracker/verification#credential-ownership-checkpoint`,
      { waitUntil: 'networkidle' },
    );
    assert.equal(checkpointResponse?.status(), 200);
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      await page
        .getByRole('heading', { name: 'Interrupted changes, safely resolved', exact: true })
        .waitFor();
      const overflow = await page.evaluate(() =>
        Math.max(0, document.documentElement.scrollWidth - innerWidth),
      );
      const scan = await new AxeBuilder({ page })
        .include('#credential-ownership-checkpoint')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      assert.equal(overflow, 0);
      assert.equal(scan.violations.length, 0);
      layout.push({ width, overflow, violations: scan.violations.map((finding) => finding.id) });
    }
    await writeFile(
      '.test-report/phase-one/joint-tracker-layout.json',
      JSON.stringify(
        { checkedAt: new Date().toISOString(), productionBuild: true, passed: true, layout },
        null,
        2,
      ) + '\n',
    );
  } catch (error) {
    await writeFile('.test-report/phase-one/credential-workflows-private.log', String(error));
    throw new Error(`Credential workflow failed at ${step}; inspect the private diagnostic.`);
  } finally {
    clearInterval(progress);
    await browser?.close();
    for (const process of [worker, service])
      if (process && process.exitCode === null) {
        process.kill();
        await new Promise<void>((done) => process.once('exit', () => done()));
      }
    if (temporaryMaster && originalMaster) {
      await owned.admin`update master_ai_rules set current_version_id=${originalMaster.current_version_id},updated_at=${originalMaster.updated_at} where id=${originalMaster.id} and current_version_id=${masterVersion}`;
      await owned.admin`delete from master_ai_rule_versions where id=${masterVersion}`;
    }
    await owned.admin`update api_credentials set status='revoked',revoked_at=coalesce(revoked_at,now()) where tenant_id=${owner.tenantId} and status<>'revoked'`;
    await owned.cleanup();
  }
  assert.equal(checks.length, 13);
  const result = {
    checkedAt: new Date().toISOString(),
    localOnly: true,
    passed: true,
    productionBuild: process.env.VERIFICATION_APP_MODE !== 'development',
    checks,
    fixtureCleanup: true,
    boundary:
      'Real Chrome, provider-backed cookies, RLS-bound application and actual FastAPI. Clipboard denial, missing clipboard/download APIs and transport loss are deliberately injected in the browser. No external email or hosted-service qualification.',
  };
  await writeFile(
    '.test-report/phase-one/credential-workflows.json',
    JSON.stringify(result, null, 2) + '\n',
  );
  console.log(`Credential workflows passed: ${checks.length}; owned fixtures removed.`);
}
void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Credential verification failed.');
  process.exitCode = 1;
});
