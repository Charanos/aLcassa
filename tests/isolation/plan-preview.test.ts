import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { SEED_PLATFORM_ADMIN, SEED_USER_A } from '@/db/seed/constants';
import { createResolvedContext } from '@/lib/db/context';
import { getEntitlementSnapshot } from '@/modules/entitlements';
import { assignPlan, grantOverride, previewPlanChange } from '@/modules/platform';
import { ERROR_CODES } from '@/lib/errors';
import { adminQuery, cleanup, closeHarness } from './harness';
import { assertDisposableDatabase } from './disposable';

const tenantId = randomUUID();
const sourceId = randomUUID();
const targetId = randomUUID();
const inactiveId = randomUUID();
const prefix = `preview-${randomUUID()}`;
const targetCode = `${prefix}-target`;
const actor = (requestId = randomUUID()) => ({
  userId: SEED_PLATFORM_ADMIN,
  label: 'Plan verification',
  requestId,
});

beforeAll(async () => {
  assertDisposableDatabase();
  await adminQuery`insert into tenants(id,slug,name,status) values(${tenantId},${prefix},'Plan verification','active')`;
  await adminQuery`insert into plans(id,code,name,price_amount,is_active) values
    (${sourceId},${prefix},'Source',3400,true),(${targetId},${targetCode},'Target',17000,true),
    (${inactiveId},${`${prefix}-inactive`},'Inactive',3400,false)`;
  await adminQuery`insert into subscriptions(tenant_id,plan_id,status,current_period_start,current_period_end) values(${tenantId},${sourceId},'active',now(),now()+interval '30 days')`;
});
beforeEach(async () => {
  await cleanup`delete from subscription_overrides where tenant_id=${tenantId}`;
  await cleanup`delete from usage_counters where tenant_id=${tenantId}`;
  await cleanup`delete from plan_entitlements where plan_id in (${sourceId},${targetId})`;
  await adminQuery`update tenants set status='active' where id=${tenantId}`;
  await adminQuery`update plans set trial_days=14 where id=${targetId}`;
  await adminQuery`insert into subscriptions(tenant_id,plan_id,status,current_period_start,current_period_end)
    values(${tenantId},${sourceId},'active',now(),now()+interval '30 days')
    on conflict(tenant_id) do update set plan_id=${sourceId},status='active',contract_amount=null,version=1`;
  await adminQuery`insert into plan_entitlements(plan_id,key,kind,limit_value,display_name) values(${sourceId},'seats','limit',10,'Seats'),(${targetId},'seats','limit',1,'Seats')`;
  await adminQuery`insert into usage_counters(tenant_id,key,current_value) values(${tenantId},'seats',6)`;
});
afterAll(async () => {
  await cleanup`delete from audit_log where tenant_id=${tenantId}`;
  await cleanup`delete from platform_audit_log where target_tenant_id=${tenantId}`;
  await cleanup`delete from subscription_overrides where tenant_id=${tenantId}`;
  await cleanup`delete from usage_counters where tenant_id=${tenantId}`;
  await cleanup`delete from subscriptions where tenant_id=${tenantId}`;
  await cleanup`delete from tenants where id=${tenantId}`;
  await cleanup`delete from plan_entitlements where plan_id in (${sourceId},${targetId},${inactiveId})`;
  await cleanup`delete from plans where id in (${sourceId},${targetId},${inactiveId})`;
  await closeHarness();
});
const preview = () => previewPlanChange({ tenantId, planCode: targetCode }, actor());
async function noMutationAudit(requestId: string) {
  expect(
    await adminQuery`select id from platform_audit_log where request_id=${requestId} union all select id from audit_log where request_id=${requestId}`,
  ).toHaveLength(0);
}
async function assign(expectedPreview: string, requestId = randomUUID()) {
  return assignPlan(
    { tenantId, planCode: targetCode, reason: 'Reviewed verification change', expectedPreview },
    actor(requestId),
  );
}

describe('plan preview and assignment consistency', () => {
  it('reviews and creates the first subscription for an unassigned trial', async () => {
    await cleanup`delete from subscriptions where tenant_id=${tenantId}`;
    await adminQuery`update tenants set status='trial' where id=${tenantId}`;
    const reviewed = await preview();
    expect(reviewed.fromPlan).toBe('unassigned');
    expect(reviewed.rows).toContainEqual(
      expect.objectContaining({ key: 'seats', from: 0, to: 1, current: 6 }),
    );
    const requestId = randomUUID();
    await expect(assign(reviewed.fingerprint, requestId)).resolves.toEqual({
      planCode: targetCode,
      status: 'trialing',
    });
    const stored =
      await adminQuery`select plan_id,status,trial_ends_at,current_period_start,current_period_end,version from subscriptions where tenant_id=${tenantId}`;
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ plan_id: targetId, status: 'trialing', version: 1 });
    expect(
      new Date(stored[0]!.trial_ends_at).getTime() -
        new Date(stored[0]!.current_period_start).getTime(),
    ).toBe(14 * 86_400_000);
    expect(
      await adminQuery`select id from audit_log where request_id=${requestId} and tenant_id=${tenantId}`,
    ).toHaveLength(1);
    expect(
      await adminQuery`select id from platform_audit_log where request_id=${requestId}`,
    ).toHaveLength(1);
  });
  it('allows only one first assignment from the same reviewed absence', async () => {
    await cleanup`delete from subscriptions where tenant_id=${tenantId}`;
    const reviewed = await preview(),
      requests = [randomUUID(), randomUUID()];
    const results = await Promise.allSettled(
      requests.map((id) => assign(reviewed.fingerprint, id)),
    );
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const index = results.findIndex((result) => result.status === 'rejected');
    expect(results[index]).toMatchObject({
      status: 'rejected',
      reason: { code: ERROR_CODES.SUBSCRIPTION_CHANGED },
    });
    await noMutationAudit(requests[index]!);
    expect(await adminQuery`select id from subscriptions where tenant_id=${tenantId}`).toHaveLength(
      1,
    );
  });
  it('does not start a trial when the selected plan offers no trial days', async () => {
    await cleanup`delete from subscriptions where tenant_id=${tenantId}`;
    await adminQuery`update tenants set status='trial' where id=${tenantId}`;
    await adminQuery`update plans set trial_days=0,interval_unit='year',interval_count=1 where id=${targetId}`;
    try {
      const reviewed = await preview();
      await expect(assign(reviewed.fingerprint)).resolves.toMatchObject({ status: 'active' });
      const [stored] =
        await adminQuery`select trial_ends_at,current_period_start,current_period_end from subscriptions where tenant_id=${tenantId}`;
      expect(stored!.trial_ends_at).toBeNull();
      expect(new Date(stored!.current_period_end).getUTCFullYear()).toBe(
        new Date(stored!.current_period_start).getUTCFullYear() + 1,
      );
    } finally {
      await adminQuery`update plans set interval_unit='month',interval_count=1 where id=${targetId}`;
    }
  });
  it('refuses an absent workspace instead of previewing an orphan subscription', async () => {
    const requestId = randomUUID();
    await expect(
      previewPlanChange({ tenantId: randomUUID(), planCode: targetCode }, actor(requestId)),
    ).rejects.toMatchObject({ code: ERROR_CODES.NOT_FOUND });
    await noMutationAudit(requestId);
  });
  it('warns about usage exceeding the effective target limit', async () => {
    expect((await preview()).rows).toContainEqual(
      expect.objectContaining({ key: 'seats', from: 10, to: 1, current: 6, strands: true }),
    );
  });
  it('treats a missing target grant as denied rather than unlimited', async () => {
    await cleanup`delete from plan_entitlements where plan_id=${targetId}`;
    expect((await preview()).rows[0]).toMatchObject({ to: 0, strands: true });
  });
  it('preserves an explicit unlimited override', async () => {
    await grantOverride(
      { tenantId, key: 'seats', limitValue: null, reason: 'Unlimited verification seats' },
      actor(),
    );
    expect((await preview()).rows[0]).toMatchObject({
      from: null,
      to: null,
      overridden: true,
      strands: false,
    });
  });
  it('uses a zero override as denial and ignores expired overrides', async () => {
    await grantOverride(
      { tenantId, key: 'seats', limitValue: 0, reason: 'Zero verification seats' },
      actor(),
    );
    expect((await preview()).rows[0]).toMatchObject({ to: 0, strands: true });
    await adminQuery`update subscription_overrides set expires_at=now()-interval '1 second' where tenant_id=${tenantId}`;
    expect((await preview()).rows[0]).toMatchObject({ from: 10, to: 1, overridden: false });
  });
  it('includes target-only allowances and feature losses', async () => {
    await adminQuery`insert into plan_entitlements(plan_id,key,kind,limit_value,feature_enabled,display_name) values
      (${targetId},'api_keys','limit',2,null,'API keys'),(${sourceId},'test_feature','feature',null,true,'Test feature')`;
    const rows = (await preview()).rows;
    expect(rows).toContainEqual(expect.objectContaining({ key: 'api_keys', from: 0, to: 2 }));
    expect(rows).toContainEqual(
      expect.objectContaining({
        key: 'test_feature',
        kind: 'feature',
        toEnabled: false,
        strands: true,
      }),
    );
  });
  it('resolves an override-only allowance identically in the preview and tenant guard', async () => {
    await grantOverride(
      { tenantId, key: 'api_keys', limitValue: 3, reason: 'Override-only credential allowance' },
      actor(),
    );
    const ctx = createResolvedContext({
      tenantId,
      actorId: SEED_USER_A,
      actorLabel: 'Tenant verifier',
      actorType: 'user',
      role: 'owner',
      supportMode: false,
      requestId: randomUUID(),
    });
    const snapshot = await getEntitlementSnapshot(ctx);
    expect(snapshot.byKey.api_keys).toMatchObject({
      limit: 3,
      kind: 'limit',
      override: { reason: 'Override-only credential allowance' },
    });
    expect((await preview()).rows).toContainEqual(
      expect.objectContaining({ key: 'api_keys', from: 3, to: 3, overridden: true }),
    );
  });
  it('rejects inactive and missing plans without leaving preview audits', async () => {
    for (const planCode of [`${prefix}-inactive`, `${prefix}-missing`]) {
      const requestId = randomUUID();
      await expect(
        previewPlanChange({ tenantId, planCode }, actor(requestId)),
      ).rejects.toMatchObject({ code: ERROR_CODES.NOT_FOUND });
      await noMutationAudit(requestId);
    }
  });
  it('requires the workspace-management capability even for a preview', async () => {
    const requestId = randomUUID();
    await expect(
      previewPlanChange(
        { tenantId, planCode: targetCode },
        { ...actor(requestId), userId: randomUUID() },
      ),
    ).rejects.toMatchObject({ code: ERROR_CODES.PLATFORM_CAPABILITY_MISSING });
    await noMutationAudit(requestId);
  });
  it('refuses changed usage and does not record a successful assignment', async () => {
    const reviewed = await preview(),
      requestId = randomUUID();
    await adminQuery`update usage_counters set current_value=7 where tenant_id=${tenantId}`;
    await expect(assign(reviewed.fingerprint, requestId)).rejects.toMatchObject({
      code: ERROR_CODES.SUBSCRIPTION_CHANGED,
    });
    await noMutationAudit(requestId);
  });
  it('refuses changed target allowances and active overrides', async () => {
    const reviewed = await preview();
    await adminQuery`update plan_entitlements set limit_value=3 where plan_id=${targetId}`;
    await expect(assign(reviewed.fingerprint)).rejects.toMatchObject({
      code: ERROR_CODES.SUBSCRIPTION_CHANGED,
    });
    const updated = await preview();
    await grantOverride(
      { tenantId, key: 'seats', limitValue: 8, reason: 'Changed verification override' },
      actor(),
    );
    await expect(assign(updated.fingerprint)).rejects.toMatchObject({
      code: ERROR_CODES.SUBSCRIPTION_CHANGED,
    });
  });
  it('refuses a preview whose override expired after review', async () => {
    await grantOverride(
      {
        tenantId,
        key: 'seats',
        limitValue: 8,
        reason: 'Temporary verification seats',
        expiresAt: new Date(Date.now() + 60_000),
      },
      actor(),
    );
    const reviewed = await preview();
    await adminQuery`update subscription_overrides set expires_at=now()-interval '1 second' where tenant_id=${tenantId}`;
    await expect(assign(reviewed.fingerprint)).rejects.toMatchObject({
      code: ERROR_CODES.SUBSCRIPTION_CHANGED,
    });
  });
  it('allows exactly one concurrent assignment from the same reviewed preview', async () => {
    const reviewed = await preview(),
      requests = [randomUUID(), randomUUID()];
    const results = await Promise.allSettled(
      requests.map((id) => assign(reviewed.fingerprint, id)),
    );
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const index = results.findIndex((r) => r.status === 'rejected');
    expect(results[index]).toMatchObject({
      status: 'rejected',
      reason: { code: ERROR_CODES.SUBSCRIPTION_CHANGED },
    });
    await noMutationAudit(requests[index]!);
    const [stored] =
      await adminQuery`select plan_id,version from subscriptions where tenant_id=${tenantId}`;
    expect(stored).toMatchObject({ plan_id: targetId, version: 2 });
  });
});
