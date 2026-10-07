import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { adminQuery, cleanup, closeHarness } from './harness';
import { createResolvedContext, type TenantRole } from '@/lib/db/context';
import { getLiveTenantAudit } from '@/lib/tenant/live';
import { encodeActivityCursor } from '@/lib/tenant/activity';
import { SEED_USER_A } from '@/db/seed/constants';

const tenantId = randomUUID();
const otherTenantId = randomUUID();
const planId = randomUUID();
let created = false;
function context(role: TenantRole = 'owner', tenant = tenantId) {
  return createResolvedContext({
    tenantId: tenant,
    role,
    actorId: SEED_USER_A,
    actorLabel: 'Activity verifier',
    actorType: 'user',
    supportMode: false,
    requestId: randomUUID(),
  });
}

beforeAll(async () => {
  const url = new URL(process.env.DATABASE_URL_ADMIN!);
  if (!['127.0.0.1', 'localhost'].includes(url.hostname) || process.env.CACHE_DISABLED !== 'true')
    throw new Error('Activity verification requires the disposable database and disabled cache.');
  await adminQuery`insert into tenants (id, slug, name, status) values
    (${tenantId}, ${`activity-${tenantId}`}, 'Activity fixture', 'active'),
    (${otherTenantId}, ${`activity-${otherTenantId}`}, 'Other activity fixture', 'active')`;
  created = true;
  await adminQuery`insert into plans (id, code, name) values (${planId}, ${`activity-${planId}`}, 'Activity fixture plan')`;
  await adminQuery`insert into plan_entitlements (plan_id, key, kind, limit_value, display_name)
    values (${planId}, 'audit_retention_days', 'limit', 1, 'Activity history')`;
  await adminQuery`insert into subscriptions (tenant_id, plan_id, status, current_period_start, current_period_end)
    values (${tenantId}, ${planId}, 'active', now(), now() + interval '30 days')`;
  await adminQuery`insert into tenant_settings (tenant_id, display_name, timezone, locale)
    values (${tenantId}, 'Activity fixture', 'Africa/Lagos', 'en-GB')`;
  // Timestamp ties plus differences below one millisecond exercise both cursor fields.
  await adminQuery`insert into audit_log (tenant_id, actor_type, actor_label, action, entity_type, request_id, occurred_at)
    select ${tenantId}, 'user', 'Activity verifier', 'tenant.settings_updated', 'tenant_settings',
      'activity-' || n, now() - interval '2 minutes' - (n / 3) * interval '1 microsecond'
    from generate_series(1, 2101) n`;
  await adminQuery`insert into audit_log (tenant_id, actor_type, action, entity_type, request_id, occurred_at)
    values (${tenantId}, 'system', 'tenant.settings_updated', 'tenant_settings', 'outside-retention', now() - interval '2 days'),
      (${otherTenantId}, 'system', 'tenant.settings_updated', 'tenant_settings', 'other-tenant', now())`;
});

afterAll(async () => {
  if (created) {
    await cleanup`delete from audit_log where tenant_id in (${tenantId}, ${otherTenantId})`;
    await cleanup`delete from subscriptions where tenant_id = ${tenantId}`;
    await cleanup`delete from tenant_settings where tenant_id = ${tenantId}`;
    await cleanup`delete from tenants where id in (${tenantId}, ${otherTenantId})`;
    await cleanup`delete from plan_entitlements where plan_id = ${planId}`;
    await cleanup`delete from plans where id = ${planId}`;
  }
  await closeHarness();
});

describe('customer Activity through the real reader and policies', () => {
  it('returns every retained event once across 2,101 records, ties and new arrivals', async () => {
    const expected = await adminQuery<
      { id: string }[]
    >`select id from audit_log where tenant_id = ${tenantId}
      and request_id like 'activity-%' order by occurred_at desc, id desc`;
    let page = await getLiveTenantAudit(context());
    expect(page?.entries).toHaveLength(50);
    expect(page?.timezone).toBe('Africa/Lagos');
    expect(page?.entries[0]?.actionLabel).toBeTruthy();
    expect(page?.entries[0]?.target).toBeTruthy();
    const ids = page!.entries.map((entry) => entry.id);
    await adminQuery`insert into audit_log (tenant_id, actor_type, action, entity_type, request_id)
      values (${tenantId}, 'system', 'tenant.settings_updated', 'tenant_settings', 'new-arrival')`;
    while (page?.nextCursor) {
      page = await getLiveTenantAudit(context(), { cursor: page.nextCursor });
      ids.push(...page!.entries.map((entry) => entry.id));
    }
    expect(ids).toEqual(expected.map((entry) => entry.id));
    expect(new Set(ids).size).toBe(2101);
    expect(
      (await getLiveTenantAudit(context()))?.entries.some(
        (entry) => entry.requestId === 'new-arrival',
      ),
    ).toBe(true);
  });

  it('keeps retention tied to current time even when a caller edits the snapshot cursor', async () => {
    const asOf = new Date(Date.now() - 36 * 3600_000);
    const cursor = encodeActivityCursor({
      asOf,
      at: asOf,
      id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
    });
    expect((await getLiveTenantAudit(context(), { cursor }))?.entries).toEqual([]);
  });

  it('refuses agents and missing plan coverage instead of granting unlimited history', async () => {
    await expect(getLiveTenantAudit(context('agent'))).rejects.toMatchObject({
      code: 'auth.role_not_permitted',
    });
    await expect(getLiveTenantAudit(context('owner', otherTenantId))).rejects.toMatchObject({
      code: 'entitlement.feature_unavailable',
    });
  });

  it('honors explicitly unlimited history and includes older events', async () => {
    await adminQuery`update plan_entitlements set limit_value = null where plan_id = ${planId}`;
    let page = await getLiveTenantAudit(context());
    expect(page?.cutoff).toBeNull();
    const references: Array<string | undefined> = [];
    do {
      references.push(...page!.entries.map((entry) => entry.requestId ?? undefined));
      page = page?.nextCursor
        ? await getLiveTenantAudit(context(), { cursor: page.nextCursor })
        : null;
    } while (page);
    expect(references).toContain('outside-retention');
    expect(references).not.toContain('other-tenant');
  });
});
