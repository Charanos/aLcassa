import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { adminQuery, cleanup, closeHarness } from './harness';
import { SEED_USER_A } from '@/db/seed/constants';
import { createResolvedContext, type TenantRole } from '@/lib/db/context';
import { withTenantContext } from '@/lib/db';
import { tenantSettings } from '@/db/schema';
import { saveCompanySettings } from '@/modules/settings';

const tenantA = randomUUID();
const tenantB = randomUUID();
const settingsB = randomUUID();
let created = false;
const values = {
  name: 'Updated company',
  contactEmail: 'contact@example.test',
  timezone: 'Africa/Lagos',
  locale: 'en-GB',
};
function context(role: TenantRole = 'owner', supportMode = false, tenantId = tenantA) {
  return createResolvedContext({
    tenantId,
    role,
    actorId: SEED_USER_A,
    actorLabel: 'Verification actor',
    actorType: supportMode ? 'platform_admin' : 'user',
    supportMode,
    requestId: randomUUID(),
  });
}
async function current() {
  const [row] = await adminQuery<
    { display_name: string; version: number }[]
  >`select display_name, version from tenant_settings where tenant_id = ${tenantA}`;
  if (!row) throw new Error('Disposable settings fixture missing');
  return row;
}
async function countAudits() {
  const [row] = await adminQuery<
    { count: string }[]
  >`select count(*)::text as count from audit_log where tenant_id = ${tenantA}`;
  return Number(row?.count ?? 0);
}

beforeAll(async () => {
  // These probes create and remove only their own disposable fixtures.
  const url = new URL(process.env.DATABASE_URL_ADMIN!);
  if (!['localhost', '127.0.0.1'].includes(url.hostname))
    throw new Error('Company verification requires a local disposable database.');
  await adminQuery`insert into tenants (id, slug, name, status) values (${tenantA}, ${`settings-${tenantA}`}, 'Platform identity A', 'active'), (${tenantB}, ${`settings-${tenantB}`}, 'Platform identity B', 'active')`;
  created = true;
  await adminQuery`insert into tenant_settings (tenant_id, display_name) values (${tenantA}, 'Original company')`;
  await adminQuery`insert into tenant_settings (id, tenant_id, display_name) values (${settingsB}, ${tenantB}, 'Other company')`;
});
afterAll(async () => {
  if (created) {
    await cleanup`delete from audit_log where tenant_id in (${tenantA}, ${tenantB})`;
    await cleanup`delete from tenant_settings where tenant_id in (${tenantA}, ${tenantB})`;
    await cleanup`delete from tenants where id in (${tenantA}, ${tenantB})`;
  }
  await closeHarness();
});

describe('company saves under real policies', () => {
  it('saves the settings with a correlated audit and preserves platform identity', async () => {
    const before = await current();
    const ctx = context();
    expect(await saveCompanySettings(ctx, { ...values, version: before.version })).toEqual({
      version: before.version + 1,
    });
    expect((await current()).display_name).toBe(values.name);
    const [tenant] = await adminQuery<
      { name: string }[]
    >`select name from tenants where id = ${tenantA}`;
    expect(tenant?.name).toBe('Platform identity A');
    const [audit] = await adminQuery<
      { action: string; request_id: string; after: { version: number } }[]
    >`select action, request_id, after from audit_log where request_id = ${ctx.requestId}`;
    expect(audit?.action).toBe('tenant.settings_updated');
    expect(audit?.request_id).toBe(ctx.requestId);
    expect(audit?.after.version).toBe(before.version + 1);
  });

  it('refuses an agent without changing settings or adding an audit', async () => {
    const before = await current();
    const audits = await countAudits();
    await expect(
      saveCompanySettings(context('agent'), { ...values, version: before.version }),
    ).rejects.toMatchObject({ code: 'auth.role_not_permitted' });
    expect(await current()).toEqual(before);
    expect(await countAudits()).toBe(audits);
  });

  it('refuses stale versions without changing settings or history', async () => {
    const before = await current();
    const audits = await countAudits();
    await expect(
      saveCompanySettings(context(), { ...values, version: before.version - 1 }),
    ).rejects.toMatchObject({ code: 'tenant.settings_conflict' });
    expect(await current()).toEqual(before);
    expect(await countAudits()).toBe(audits);
  });

  it('commits exactly one simultaneous save at the same version', async () => {
    const before = await current();
    const audits = await countAudits();
    const results = await Promise.allSettled(
      ['First', 'Second'].map((name) =>
        saveCompanySettings(context(), { ...values, name, version: before.version }),
      ),
    );
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    expect((await current()).version).toBe(before.version + 1);
    expect(await countAudits()).toBe(audits + 1);
  });

  it('attributes support changes to the support actor', async () => {
    const before = await current();
    const ctx = context('support', true);
    await saveCompanySettings(ctx, { ...values, version: before.version });
    const [audit] = await adminQuery<
      { support_mode: boolean; actor_label: string }[]
    >`select support_mode, actor_label from audit_log where request_id = ${ctx.requestId}`;
    expect(audit?.support_mode).toBe(true);
    expect(audit?.actor_label).toBe('Verification actor');
  });

  it('cannot update another tenant by its real row ID even through the query layer', async () => {
    const changed = await withTenantContext(context(), (tx) =>
      tx
        .update(tenantSettings)
        .set({ displayName: 'Cross-tenant attempt' })
        .where(eq(tenantSettings.id, settingsB))
        .returning({ id: tenantSettings.id }),
    );
    expect(changed).toEqual([]);
    const [other] = await adminQuery<
      { display_name: string }[]
    >`select display_name from tenant_settings where id = ${settingsB}`;
    expect(other?.display_name).toBe('Other company');
  });

  it('enforces the role on first insert and allows an owner to initialize settings', async () => {
    await cleanup`delete from tenant_settings where tenant_id = ${tenantB}`;
    await expect(
      withTenantContext(context('agent', false, tenantB), (tx) =>
        tx.insert(tenantSettings).values({ tenantId: tenantB, displayName: 'Agent attempt' }),
      ),
    ).rejects.toThrow();
    const [count] = await adminQuery<
      { count: string }[]
    >`select count(*)::text as count from tenant_settings where tenant_id = ${tenantB}`;
    expect(Number(count?.count)).toBe(0);
    expect(
      await saveCompanySettings(context('owner', false, tenantB), { ...values, version: 0 }),
    ).toEqual({ version: 1 });
    const [settings] = await adminQuery<
      { display_name: string; version: number }[]
    >`select display_name, version from tenant_settings where tenant_id = ${tenantB}`;
    expect(settings?.display_name).toBe(values.name);
    expect(settings?.version).toBe(1);
  });
});
