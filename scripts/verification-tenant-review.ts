/** Owned tenant editing, role boundaries, navigation and accessibility acceptance. */
import assert from 'node:assert/strict';
import { browserFailure } from './verification-browser-failure';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { parse } from 'dotenv';
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import { spawn, type ChildProcess } from 'node:child_process';
import { resolve } from 'node:path';
import { createWriteStream } from 'node:fs';

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
  const localEnvironment = await readFile('.env.verification.local', 'utf8').catch(
    (error: unknown) => {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return '';
      throw error;
    },
  );
  Object.assign(process.env, parse(localEnvironment), {
    CACHE_DISABLED: 'true',
    VERIFICATION_DISPOSABLE: 'true',
    SESSION_COOKIE_TENANT: 'alcassa_verify_tenant',
    SESSION_COOKIE_PLATFORM: 'alcassa_verify_platform',
  });
  assert.equal(process.env.NEXT_PUBLIC_SUPABASE_URL, 'http://127.0.0.1:55421');
  const { httpFixtures, applicationWorker, signIn } = await import('./verification-http-fixture');
  const owned = await httpFixtures(3);
  const [owner, administrator, agent] = owned.fixtures;
  assert(owner && administrator && agent);
  const origin = 'http://127.0.0.1:3145';
  let worker: ChildProcess | undefined, browser: Browser | undefined;
  let service: ChildProcess | undefined;
  let key: string | undefined;
  const etags: string[] = [];
  let original: { id: string; current_version_id: string | null; updated_at: Date } | undefined;
  const masterVersions: string[] = [];
  const checks: string[] = [];
  const visits: {
    role: string;
    surface: string;
    width: number;
    overflow: number;
  }[] = [];
  let step = 'prepare';
  let diagnosticPage: Page | undefined;
  const progress = setInterval(() => console.log(`Tenant review: ${step}`), 15000);
  progress.unref();
  async function state() {
    const [row] = await owned.admin<{ versions: number; audits: number }[]>`select
      (select count(*)::int from tenant_ai_rule_versions where tenant_id=${owner!.tenantId}) as versions,
      (select count(*)::int from audit_log where tenant_id=${owner!.tenantId} and action in ('rules.published','rules.rolled_back')) as audits`;
    assert(row);
    return row;
  }
  async function effective(information: string, tone?: string) {
    assert(key);
    const response = await fetch('http://127.0.0.1:8145/service/v1/ai-rules', {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(30000),
    });
    assert.equal(response.status, 200);
    const body = (await response.json()) as {
      data: { tenantId: string; rules: { businessInformation: string; tone: string } };
    };
    assert.equal(body.data.tenantId, owner!.tenantId);
    assert.equal(body.data.rules.businessInformation, information);
    if (tone) assert.equal(body.data.rules.tone, tone);
    const etag = response.headers.get('etag');
    assert(etag);
    etags.push(etag);
  }
  async function publish(page: Page, value: string, note: string) {
    await page.getByLabel('Business information', { exact: true }).fill(value);
    await page.getByLabel('Change note', { exact: true }).fill(note);
    await page.getByRole('button', { name: 'Publish instructions', exact: true }).click();
  }
  async function loadLatest(page: Page) {
    await page
      .getByRole('button', { name: 'Review latest instructions', exact: true })
      .first()
      .click();
    await page.locator('[data-slot="rules-editor"][aria-busy="false"]').waitFor();
    const load = page.getByRole('button', { name: 'Load latest instructions', exact: true });
    if (await load.count()) {
      await load.click();
      await page
        .getByRole('dialog')
        .getByRole('button', { name: 'Load latest instructions', exact: true })
        .click();
      await page.getByRole('dialog').waitFor({ state: 'hidden' });
    }
  }
  async function contextFor(fixture: typeof owner, tenantId = owner!.tenantId) {
    const cookie = await signIn(3145, { ...fixture!, tenantId });
    const context = await browser!.newContext({
      reducedMotion: 'reduce',
      viewport: { width: 1440, height: 1000 },
    });
    await context.addCookies(
      cookie.split('; ').map((pair) => {
        const index = pair.indexOf('=');
        return { name: pair.slice(0, index), value: pair.slice(index + 1), url: origin };
      }),
    );
    return context;
  }
  async function snapshot(page: Page, role: string, surface: string, width: number) {
    const overflow = await page.evaluate(() =>
      Math.max(0, document.documentElement.scrollWidth - innerWidth),
    );
    visits.push({
      role,
      surface,
      width,
      overflow,
    });
    assert(overflow <= 1, `Tenant layout overflow: ${role}/${surface}/${width}`);
  }
  async function keepEditing(page: Page) {
    const dialog = page.getByRole('dialog', { name: 'Leave without saving?', exact: true });
    await dialog.waitFor();
    await dialog.getByRole('button', { name: 'Keep editing', exact: true }).click();
    await dialog.waitFor({ state: 'hidden' });
  }
  try {
    await mkdir('.test-report/phase-one', { recursive: true });
    for (const [fixture, role] of [
      [administrator, 'admin'],
      [agent, 'agent'],
    ] as const) {
      await owned.admin`delete from tenant_members where tenant_id=${fixture.tenantId} and user_id=${fixture.userId}`;
      await owned.admin`insert into tenant_members(tenant_id,user_id,role,status) values(${owner.tenantId},${fixture.userId},${role},'active')`;
    }
    await owned.admin`update usage_counters set current_value=3,peak_value=3 where tenant_id=${owner.tenantId} and key='seats'`;
    const [subscription] = await owned.admin<
      { plan_id: string }[]
    >`select plan_id from subscriptions where tenant_id=${owner.tenantId}`;
    assert(subscription);
    await owned.admin`insert into plan_entitlements(plan_id,key,kind,limit_value,display_name) values(${subscription.plan_id},'audit_retention_days','limit',30,'Activity history')`;
    [original] = await owned.admin<
      { id: string; current_version_id: string | null; updated_at: Date }[]
    >`select id,current_version_id,updated_at from master_ai_rules`;
    assert(original);
    const master = randomUUID();
    masterVersions.push(master);
    await owned.admin`insert into master_ai_rule_versions(id,version_number,status,content,locked_fields,authored_by,published_at)
      select ${master},coalesce(max(version_number),0)+1,'published','{"tone":"Considerate","responseGuidelines":"Keep replies clear."}'::jsonb,'[]'::jsonb,${owner.userId},now() from master_ai_rule_versions`;
    await owned.admin`update master_ai_rules set current_version_id=${master},updated_at=now() where id=${original.id}`;
    worker = await applicationWorker(
      3145,
      { VERIFICATION_WORKER_LOG: '.test-report/phase-one/tenant-review-worker-private.log' },
      process.env.VERIFICATION_APP_MODE === 'development' ? 'dev' : 'start',
    );
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    const context = await contextFor(owner),
      page = await context.newPage();
    diagnosticPage = page;
    const serviceRoot = process.env.VERIFICATION_SERVICE_ROOT ?? '../aLcassa-service';
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
        '8145',
        '--no-access-log',
      ],
      {
        cwd: serviceRoot,
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
          ...process.env,
          SERVICE_DATABASE_URL: process.env.DATABASE_URL!,
          DATABASE_URL_ADMIN: '',
          SERVICE_DATABASE_URL_ADMIN: '',
          SUPABASE_SECRET_KEY: '',
          SUPABASE_SERVICE_ROLE_KEY: '',
        },
      },
    );
    const serviceLog = createWriteStream(
      '.test-report/phase-one/tenant-review-service-private.log',
    );
    service.stdout?.pipe(serviceLog, { end: false });
    service.stderr?.pipe(serviceLog, { end: false });
    service.once('exit', () => serviceLog.end());
    let ready = false;
    for (let attempt = 0; attempt < 120; attempt++) {
      if ((await fetch('http://127.0.0.1:8145/service/v1/ready').catch(() => null))?.ok) {
        ready = true;
        break;
      }
      if (service.exitCode !== null) break;
      await new Promise((done) => setTimeout(done, 250));
    }
    assert(ready, 'Owned FastAPI worker must be ready.');
    const credential = await context.request.post(`${origin}/api/v1/credentials`, {
      headers: { Origin: origin, 'Idempotency-Key': randomUUID() },
      data: { name: 'Tenant rules review', scopes: ['ai_rules:read', 'tenant:read'] },
    });
    assert.equal(credential.status(), 201);
    key = ((await credential.json()) as { data: { secret: string } }).data.secret;
    assert(key);
    page.setDefaultTimeout(45000);
    page.setDefaultNavigationTimeout(120000);
    let allowUnload = true,
      unloadPrompts = 0;
    page.on('dialog', (dialog) => {
      if (dialog.type() === 'beforeunload') {
        unloadPrompts++;
        void (allowUnload ? dialog.accept() : dialog.dismiss());
      } else void dialog.dismiss();
    });
    const nativeErrors: string[] = [];
    page.on('pageerror', (error) => nativeErrors.push(error.name));

    step = 'draft navigation';
    await page.goto(`${origin}/app/settings/company`, { waitUntil: 'networkidle' });
    await page.getByRole('link', { name: 'Assistant rules', exact: true }).first().click();
    await page.waitForURL('**/app/settings/ai-rules', { waitUntil: 'networkidle' });
    await page
      .getByLabel('Business information', { exact: true })
      .fill('Unsaved navigation acceptance');
    await page.getByRole('link', { name: 'Company', exact: true }).first().click();
    await keepEditing(page);
    assert.equal(
      await page.getByLabel('Business information', { exact: true }).inputValue(),
      'Unsaved navigation acceptance',
    );
    await page.goBack().catch(() => null);
    await keepEditing(page);
    assert.equal(new URL(page.url()).pathname, '/app/settings/ai-rules');
    await page.getByRole('link', { name: 'Company', exact: true }).first().click();
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Discard and leave', exact: true })
      .click();
    await page.waitForURL('**/app/settings/company', { waitUntil: 'networkidle' });
    assert.equal((await state()).versions, 0);
    checks.push(
      'Link and browser Back cancellation preserve the draft; explicit discard changes the route without publishing.',
    );
    await page.getByRole('link', { name: 'Assistant rules', exact: true }).first().click();
    await page.waitForURL('**/app/settings/ai-rules', { waitUntil: 'networkidle' });
    await page.getByRole('link', { name: 'Team', exact: true }).first().click();
    await page.waitForURL('**/app/settings/team', { waitUntil: 'networkidle' });
    await page.goBack({ waitUntil: 'networkidle' });
    await page
      .getByLabel('Business information', { exact: true })
      .fill('Forward navigation acceptance');
    await page.goForward().catch(() => null);
    await keepEditing(page);
    assert.equal(
      await page.getByLabel('Business information', { exact: true }).inputValue(),
      'Forward navigation acceptance',
    );
    allowUnload = false;
    await page.reload({ waitUntil: 'networkidle', timeout: 5000 }).catch(() => null);
    allowUnload = true;
    assert(unloadPrompts > 0, 'Reload must offer a native unsaved-changes warning.');
    assert.equal(
      await page.getByLabel('Business information', { exact: true }).inputValue(),
      'Forward navigation acceptance',
    );
    checks.push(
      'Browser Forward and a cancelled reload preserve draft content without truncating navigation history.',
    );

    step = 'offline publication';
    await context.setOffline(true);
    await publish(page, 'First recorded guidance', 'Publish first acceptance guidance');
    await page.getByText(/previous request may already have completed/).waitFor();
    assert(
      await page.getByRole('button', { name: 'Publish instructions', exact: true }).isDisabled(),
    );
    assert.equal((await state()).versions, 0);
    await context.setOffline(false);
    await loadLatest(page);
    assert.equal(
      await page.getByLabel('Business information', { exact: true }).inputValue(),
      'First recorded guidance',
    );
    await page.getByRole('button', { name: 'Publish instructions', exact: true }).click();
    await page.getByText('Your instructions are live.', { exact: true }).waitFor();
    assert.equal((await state()).versions, 1);
    await effective('First recorded guidance');
    checks.push(
      'An offline publication preserves its fields, blocks another write until live review and then publishes one version.',
    );

    const stalePage = await context.newPage();
    stalePage.setDefaultTimeout(45000);
    await stalePage.goto(`${origin}/app/settings/ai-rules`, { waitUntil: 'networkidle' });
    step = 'lost publication response';
    let dropped = false;
    await page.route('**/app/settings/ai-rules', async (route) => {
      if (
        !dropped &&
        route.request().method() === 'POST' &&
        route.request().headers()['next-action']
      ) {
        dropped = true;
        await route.fetch({ maxRetries: 0 });
        await route.abort('failed');
      } else await route.continue();
    });
    await publish(page, 'Second recorded guidance', 'Publish second acceptance guidance');
    await page.getByText(/previous request may already have completed/).waitFor();
    assert.equal((await state()).versions, 2);
    await effective('Second recorded guidance');
    assert.notEqual(etags[0], etags[1]);
    await loadLatest(page);
    assert.equal(
      await page.getByLabel('Business information', { exact: true }).inputValue(),
      'Second recorded guidance',
    );
    assert.equal((await state()).versions, 2);
    checks.push(
      'A response dropped after publication is reconciled from immutable history with no duplicate version.',
    );
    await publish(stalePage, 'Refused stale guidance', 'Refuse stale acceptance guidance');
    await stalePage.getByText(/live version before another change/).waitFor();
    assert.equal((await state()).versions, 2);
    await loadLatest(stalePage);
    assert.equal(
      await stalePage.getByLabel('Business information', { exact: true }).inputValue(),
      'Second recorded guidance',
    );
    checks.push(
      'A stale editor cannot overwrite a newer publication and explicitly loads the latest version before another write.',
    );

    step = 'restoration failure and reconciliation';
    const restoreRow = page
      .locator('aside ol li')
      .filter({ has: page.getByText('v1', { exact: true }) });
    await restoreRow.getByRole('button', { name: 'Restore', exact: true }).click();
    let review = page.getByRole('dialog');
    await review.getByLabel('Reason for restoring').fill('Restore first acceptance guidance');
    await context.setOffline(true);
    await review.getByRole('button', { name: 'Restore instructions', exact: true }).click();
    await review.getByText(/could not be confirmed/).waitFor();
    assert.equal((await state()).versions, 2);
    await context.setOffline(false);
    await review.getByRole('button', { name: 'Review latest instructions', exact: true }).click();
    await review.waitFor({ state: 'hidden' });
    await restoreRow.getByRole('button', { name: 'Restore', exact: true }).click();
    review = page.getByRole('dialog');
    await review.getByLabel('Reason for restoring').fill('Restore first acceptance guidance');
    await page.unroute('**/app/settings/ai-rules');
    dropped = false;
    await page.route('**/app/settings/ai-rules', async (route) => {
      if (
        !dropped &&
        route.request().method() === 'POST' &&
        route.request().headers()['next-action']
      ) {
        dropped = true;
        await route.fetch({ maxRetries: 0 });
        await route.abort('failed');
      } else await route.continue();
    });
    await review.getByRole('button', { name: 'Restore instructions', exact: true }).click();
    await review.getByText(/could not be confirmed/).waitFor();
    assert.equal((await state()).versions, 2);
    await review.getByRole('button', { name: 'Review latest instructions', exact: true }).click();
    await review.waitFor({ state: 'hidden' });
    await page.getByRole('button', { name: 'Load latest instructions', exact: true }).click();
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Load latest instructions', exact: true })
      .click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    assert.equal(
      await page.getByLabel('Business information', { exact: true }).inputValue(),
      'First recorded guidance',
    );
    assert.equal((await state()).versions, 2);
    checks.push(
      'Offline and lost-response restoration preserve review, reconcile the actual live pointer and never create a duplicate restore.',
    );
    await effective('First recorded guidance');
    assert.equal(
      etags[0],
      etags.at(-1),
      'Restoring the same immutable version restores its stable ETag.',
    );
    await page.unroute('**/app/settings/ai-rules');
    const [recorded] = await owned.admin<
      { n: number }[]
    >`select count(*)::int as n from audit_log where tenant_id=${owner.tenantId} and action like '%rules%'`;
    assert.equal(recorded?.n, 3);
    await page.goto(`${origin}/app/settings/audit`, { waitUntil: 'networkidle' });
    assert.match(await page.locator('main').innerText(), /instructions|rules/i);
    checks.push(
      'Only the two committed publications and one restoration produce customer Activity records; refused work adds none.',
    );

    step = 'changed platform safeguards';
    await stalePage.reload({ waitUntil: 'networkidle' });
    await stalePage
      .getByLabel('Business information', { exact: true })
      .fill('Draft before safeguard change');
    await stalePage
      .getByLabel('Change note', { exact: true })
      .fill('Review changed platform safeguard');
    const locked = randomUUID();
    masterVersions.push(locked);
    await owned.admin`insert into master_ai_rule_versions(id,version_number,status,content,locked_fields,authored_by,published_at)
      select ${locked},coalesce(max(version_number),0)+1,'published','{"tone":"Shared locked assurance","responseGuidelines":"Keep replies clear."}'::jsonb,'["tone"]'::jsonb,${owner.userId},now() from master_ai_rule_versions`;
    await owned.admin`update master_ai_rules set current_version_id=${locked},updated_at=greatest(now(),updated_at+interval '1 millisecond') where id=${original.id}`;
    await stalePage.getByRole('button', { name: 'Publish instructions', exact: true }).click();
    await stalePage.getByText(/live version before another change/).waitFor();
    await loadLatest(stalePage);
    assert.equal(await stalePage.getByLabel('Tone', { exact: true }).count(), 0);
    await stalePage.getByText('Shared locked assurance', { exact: true }).waitFor();
    assert.equal((await state()).versions, 2);
    assert.equal((await state()).audits, 3);
    await effective('First recorded guidance', 'Shared locked assurance');
    assert.notEqual(etags.at(-1), etags[0]);
    await stalePage.close();
    checks.push(
      'Changed platform safeguards refuse the old editor; live review shows the locked field and actual FastAPI content/ETags follow the new master version.',
    );
    step = 'missing published guidance';
    await owned.admin`update master_ai_rules set current_version_id=null where id=${original.id}`;
    await page.goto(`${origin}/app/settings/ai-rules`, { waitUntil: 'networkidle' });
    await page
      .getByRole('heading', { name: 'Instructions are temporarily unavailable', exact: true })
      .waitFor();
    assert.equal(
      await page.getByRole('button', { name: 'Publish instructions', exact: true }).count(),
      0,
    );
    const absent = await fetch('http://127.0.0.1:8145/service/v1/ai-rules', {
      headers: { Authorization: `Bearer ${key}` },
    });
    assert.equal(absent.status, 503);
    await owned.admin`update master_ai_rules set current_version_id=${locked} where id=${original.id}`;
    await page.reload({ waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: 'Workspace instructions', exact: true }).waitFor();
    checks.push(
      'Missing published platform guidance pauses editing and returns service unavailability; restoring the pointer recovers real instructions without a false success audit.',
    );

    step = 'role and responsive settings review';
    const contexts: [string, BrowserContext][] = [
      ['owner', context],
      ['admin', await contextFor(administrator)],
      ['agent', await contextFor(agent)],
    ];
    const surfaces = ['company', 'team', 'credentials', 'ai-rules', 'audit'];
    for (const [role, current] of contexts) {
      const target = await current.newPage();
      diagnosticPage = target;
      target.setDefaultTimeout(45000);
      target.setDefaultNavigationTimeout(90000);
      for (const surface of surfaces) {
        step = `role and responsive settings review: ${role}/${surface}`;
        const response = await target.goto(`${origin}/app/settings/${surface}`, {
          waitUntil: 'networkidle',
        });
        assert.equal(response?.status(), 200);
        assert.equal(
          await target.getByText('This screen did not load.', { exact: true }).count(),
          0,
        );
        if (surface === 'credentials' && role !== 'owner') {
          await target
            .getByRole('heading', { name: 'Workspace owner access required', exact: true })
            .waitFor();
          assert.equal((await current.request.get(`${origin}/api/v1/credentials`)).status(), 403);
        }
        if (surface === 'company' && role === 'agent')
          await target
            .getByRole('heading', { name: 'Administrator access required', exact: true })
            .waitFor();
        if (surface === 'audit' && role === 'agent')
          await target
            .getByRole('heading', { name: 'Administrator access required', exact: true })
            .waitFor();
        if (surface === 'ai-rules' && role === 'agent')
          assert(
            await target
              .getByRole('button', { name: 'Publish instructions', exact: true })
              .isDisabled(),
          );
        for (const width of [1440, 390, 320]) {
          await target.setViewportSize({ width, height: 900 });
          await snapshot(target, role, surface, width);
        }
      }
      await target.close();
    }
    checks.push(
      'Owner, administrator and agent settings show correct access guidance; 45 role/layout visits pass across desktop, phone and 320px.',
    );
    assert.equal(nativeErrors.length, 0, 'Handled failures must not crash tenant pages.');
  } catch (error) {
    await browserFailure(
      step,
      error,
      diagnosticPage,
      owned.fixtures.map((fixture) => fixture.password),
      { ruleVersions: (await state()).versions },
    );
    await writeFile('.test-report/phase-one/tenant-review-private.log', String(error));
    if (diagnosticPage && !diagnosticPage.isClosed())
      await writeFile(
        '.test-report/phase-one/tenant-review-dom-private.txt',
        await diagnosticPage.locator('body').ariaSnapshot(),
      );
    throw new Error(`Tenant review failed at ${step}; inspect private diagnostics.`);
  } finally {
    clearInterval(progress);
    await browser?.close();
    if (worker && worker.exitCode === null) {
      worker.kill();
      await new Promise<void>((done) => worker!.once('exit', () => done()));
    }
    if (service && service.exitCode === null) {
      service.kill();
      await new Promise<void>((done) => service!.once('exit', () => done()));
    }
    if (original)
      await owned.admin`update master_ai_rules set current_version_id=${original.current_version_id},updated_at=${original.updated_at} where id=${original.id} and (current_version_id=any(${masterVersions}::uuid[]) or current_version_id is null)`;
    await owned.admin`delete from master_ai_rule_versions where id=any(${masterVersions}::uuid[])`;
    await owned.admin`delete from tenant_ai_rules where tenant_id=${owner.tenantId}`;
    await owned.admin`delete from tenant_ai_rule_versions where tenant_id=${owner.tenantId}`;
    await owned.cleanup();
  }
  assert.equal(checks.length, 10);
  await writeFile(
    '.test-report/phase-one/tenant-review.json',
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        localOnly: true,
        productionBuild: process.env.VERIFICATION_APP_MODE !== 'development',
        passed: true,
        fixtureCleanup: true,
        checks,
        visits,
        boundary:
          "Owned Chrome/Auth/database/FastAPI journeys. Offline and response loss are browser fault injections. Role and layout checks cover three widths. Existing console screen-reader evidence is retained as sufficient for this pass; repeat screen-reader testing was removed from the itinerary at the project owner's direction on 15 October.",
      },
      null,
      2,
    ) + '\n',
  );
  console.log(
    `Tenant review passed: ${checks.length} scenarios and ${visits.length} role/layout visits; fixtures removed.`,
  );
}
void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Tenant review failed.');
  process.exitCode = 1;
});
