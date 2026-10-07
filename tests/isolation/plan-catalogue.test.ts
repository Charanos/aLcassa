import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { SEED_PLATFORM_ADMIN, SEED_USER_A } from '@/db/seed/constants';
import { ERROR_CODES } from '@/lib/errors';
import { previewPlanLimitChange, setPlanLimit } from '@/modules/platform';
import { invalidateEntitlements } from '@/modules/entitlements';
import type * as Entitlements from '@/modules/entitlements';
import { adminQuery, cleanup, closeHarness } from './harness';
import { assertDisposableDatabase } from './disposable';

vi.mock('@/modules/entitlements', async (original) => ({
  ...(await original<typeof Entitlements>()),
  invalidateEntitlements: vi.fn(),
}));

const planId = randomUUID();
const entitlementId = randomUUID();
const tenantId = randomUUID();
const code = `catalogue-${randomUUID()}`;
const requestIds: string[] = [];
function actor(userId = SEED_PLATFORM_ADMIN) {
  const requestId = randomUUID();
  requestIds.push(requestId);
  return { userId, label: 'Catalogue verifier', requestId };
}
const preview = (to: number | null = 2) => previewPlanLimitChange({ entitlementId, to }, actor());
const save = (fingerprint: string, to: number | null = 2, identity = actor()) =>
  setPlanLimit(
    { entitlementId, to, reason: 'Reviewed catalogue verification', expectedPreview: fingerprint },
    identity,
  );

beforeAll(async () => {
  assertDisposableDatabase();
  await adminQuery`insert into plans(id,code,name) values(${planId},${code},'Verification catalogue')`;
  await adminQuery`insert into tenants(id,slug,name,status) values(${tenantId},${code},'Catalogue workspace','active')`;
  await adminQuery`insert into subscriptions(tenant_id,plan_id,status,current_period_start,current_period_end) values(${tenantId},${planId},'active',now(),now()+interval '30 days')`;
  await adminQuery`insert into plan_entitlements(id,plan_id,key,kind,limit_value,display_name) values(${entitlementId},${planId},'seats','limit',10,'Seats')`;
});
beforeEach(async () => {
  vi.mocked(invalidateEntitlements).mockClear();
  await cleanup`delete from subscription_overrides where tenant_id=${tenantId}`;
  await cleanup`delete from usage_counters where tenant_id=${tenantId}`;
  await adminQuery`insert into usage_counters(tenant_id,key,current_value) values(${tenantId},'seats',6)`;
  await adminQuery`update plan_entitlements set limit_value=10,kind='limit',updated_at=now() where id=${entitlementId}`;
});
afterAll(async () => {
  await cleanup`delete from audit_log where tenant_id=${tenantId}`;
  await cleanup`delete from platform_audit_log where request_id=any(${requestIds}::text[])`;
  await cleanup`delete from subscription_overrides where tenant_id=${tenantId}`;
  await cleanup`delete from usage_counters where tenant_id=${tenantId}`;
  await cleanup`delete from subscriptions where tenant_id=${tenantId}`;
  await cleanup`delete from tenants where id=${tenantId}`;
  await cleanup`delete from plan_entitlements where plan_id=${planId}`;
  await cleanup`delete from plans where id=${planId}`;
  await closeHarness();
});

describe('Catalogue limit review and persistence', () => {
  it('uses recorded usage and preserves an explicit unlimited override', async () => {
    expect(await preview()).toMatchObject({
      affected: 1,
      stranded: 1,
      overridden: 0,
      unmeasured: 0,
    });
    await adminQuery`insert into subscription_overrides(tenant_id,key,limit_value,reason,granted_by) values(${tenantId},'seats',null,'Unlimited verification',${SEED_PLATFORM_ADMIN})`;
    expect(await preview()).toMatchObject({ stranded: 0, overridden: 1, unmeasured: 0 });
    await adminQuery`update subscription_overrides set expires_at=now()-interval '1 second' where tenant_id=${tenantId}`;
    expect(await preview()).toMatchObject({ stranded: 1, overridden: 0 });
  });
  it('reports missing measurements without asserting zero usage', async () => {
    await cleanup`delete from usage_counters where tenant_id=${tenantId}`;
    expect(await preview()).toMatchObject({ stranded: 0, unmeasured: 1 });
    expect(await preview(null)).toMatchObject({ stranded: 0, unmeasured: 0 });
  });
  it('accepts zero and refuses fractional or negative limits', async () => {
    const reviewed = await preview(0);
    await save(reviewed.fingerprint, 0);
    expect(
      (await adminQuery`select limit_value from plan_entitlements where id=${entitlementId}`)[0]
        ?.limit_value,
    ).toBe(0);
    await expect(preview(-1)).rejects.toMatchObject({ code: ERROR_CODES.VALIDATION_FAILED });
    await expect(preview(1.5)).rejects.toMatchObject({ code: ERROR_CODES.VALIDATION_FAILED });
  });
  it('refuses changed usage without a committed mutation audit', async () => {
    const reviewed = await preview();
    const identity = actor();
    await adminQuery`update usage_counters set current_value=7 where tenant_id=${tenantId}`;
    await expect(save(reviewed.fingerprint, 2, identity)).rejects.toMatchObject({
      code: ERROR_CODES.SUBSCRIPTION_CHANGED,
    });
    expect(
      await adminQuery`select id from platform_audit_log where request_id=${identity.requestId} union all select id from audit_log where request_id=${identity.requestId}`,
    ).toHaveLength(0);
  });
  it('refuses changed overrides and expired reviewed overrides', async () => {
    const reviewed = await preview();
    await adminQuery`insert into subscription_overrides(tenant_id,key,limit_value,reason,granted_by,expires_at) values(${tenantId},'seats',null,'Expiry verification',${SEED_PLATFORM_ADMIN},now()+interval '1 hour')`;
    await expect(save(reviewed.fingerprint)).rejects.toMatchObject({
      code: ERROR_CODES.SUBSCRIPTION_CHANGED,
    });
    const overridePreview = await preview();
    await adminQuery`update subscription_overrides set expires_at=now()-interval '1 second' where tenant_id=${tenantId}`;
    await expect(save(overridePreview.fingerprint)).rejects.toMatchObject({
      code: ERROR_CODES.SUBSCRIPTION_CHANGED,
    });
  });
  it('allows one competing write and correlates both before/after audit trails', async () => {
    const reviewed = await preview();
    const identities = [actor(), actor()];
    const results = await Promise.allSettled(
      identities.map((identity) => save(reviewed.fingerprint, 2, identity)),
    );
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const [platform] = await adminQuery<
      { request_id: string; before: { limit: number }; after: { limit: number } }[]
    >`select request_id,before,after from platform_audit_log where request_id=any(${identities.map((identity) => identity.requestId)}::text[])`;
    if (!platform) throw new Error('No committed catalogue audit was recorded.');
    const customer =
      await adminQuery`select request_id,before,after,actor_type from audit_log where request_id=${platform.request_id}`;
    expect(customer).toHaveLength(1);
    expect(platform.before.limit).toBe(10);
    expect(platform.after.limit).toBe(2);
    expect(customer[0]).toMatchObject({
      actor_type: 'platform_admin',
      before: { planLimit: 10, effectiveLimit: 10 },
      after: { planLimit: 2, effectiveLimit: 2 },
    });
    expect(invalidateEntitlements).toHaveBeenCalledExactlyOnceWith(tenantId);
  });
  it('refuses a caller without the workspace-management capability', async () => {
    await expect(
      previewPlanLimitChange({ entitlementId, to: 2 }, actor(SEED_USER_A)),
    ).rejects.toMatchObject({ code: ERROR_CODES.PLATFORM_CAPABILITY_MISSING });
  });
  it('requires a reviewed preview and never edits a feature as a numeric allowance', async () => {
    await expect(save('')).rejects.toMatchObject({ code: ERROR_CODES.VALIDATION_FAILED });
    await adminQuery`update plan_entitlements set kind='feature',limit_value=null,feature_enabled=true where id=${entitlementId}`;
    await expect(preview()).rejects.toMatchObject({ code: ERROR_CODES.VALIDATION_FAILED });
    expect(
      (
        await adminQuery`select kind,feature_enabled from plan_entitlements where id=${entitlementId}`
      )[0],
    ).toMatchObject({ kind: 'feature', feature_enabled: true });
  });
  it('preserves the effective allowance in customer activity when an override wins', async () => {
    await adminQuery`insert into subscription_overrides(tenant_id,key,limit_value,reason,granted_by) values(${tenantId},'seats',null,'Preserve override verification',${SEED_PLATFORM_ADMIN})`;
    const reviewed = await preview();
    const identity = actor();
    await save(reviewed.fingerprint, 2, identity);
    const [event] =
      await adminQuery`select before,after from audit_log where request_id=${identity.requestId}`;
    expect(event).toMatchObject({
      before: { planLimit: 10, effectiveLimit: null },
      after: { planLimit: 2, effectiveLimit: null },
    });
  });
});
