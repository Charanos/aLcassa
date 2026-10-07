import { assertDisposableDatabase } from './disposable';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { adminQuery, asActor, cleanup, closeHarness } from './harness';
import { SEED_PLATFORM_ADMIN, SEED_USER_A } from '@/db/seed/constants';
import {
  assignPlan,
  changeSubscriptionStatus,
  grantOverride,
  setContractAmount,
  type PlatformActor,
} from '@/modules/platform';

const tenantId = randomUUID();
const prefix = `subscription-activity-${randomUUID()}`;
const actor = (requestId: string): PlatformActor => ({
  userId: SEED_PLATFORM_ADMIN,
  label: 'Subscription verifier',
  requestId,
});
const owner = { tenantId, actorId: SEED_USER_A, role: 'owner' as const, supportMode: false };
let created = false;
beforeAll(async () => {
  assertDisposableDatabase();
  await adminQuery`insert into tenants(id,slug,name,status) values(${tenantId},${prefix},'Subscription verification','active')`;
  created = true;
  await adminQuery`insert into subscriptions(tenant_id,plan_id,status,current_period_start,current_period_end) select ${tenantId},id,'active',now(),now()+interval '30 days' from plans where code='pro'`;
});
afterAll(async () => {
  if (created) {
    await cleanup`delete from audit_log where tenant_id=${tenantId}`;
    await cleanup`delete from platform_audit_log where target_tenant_id=${tenantId}`;
    await cleanup`delete from subscription_overrides where tenant_id=${tenantId}`;
    await cleanup`delete from subscriptions where tenant_id=${tenantId}`;
    await cleanup`delete from tenants where id=${tenantId}`;
  }
  await closeHarness();
});
async function correlated(requestId: string, action: string) {
  const records = await asActor(
    owner,
    (tx) =>
      tx`select action,actor_type,support_mode,before,after from audit_log where request_id=${requestId}`,
  );
  expect(records).toHaveLength(1);
  expect(records[0]).toMatchObject({ action, actor_type: 'platform_admin', support_mode: false });
  const platform =
    await adminQuery`select action,used_service_role from platform_audit_log where request_id=${requestId}`;
  expect(platform).toEqual([{ action, used_service_role: true }]);
  const foreign = await asActor(
    { ...owner, tenantId: randomUUID() },
    (tx) => tx`select id from audit_log where request_id=${requestId}`,
  );
  expect(foreign).toHaveLength(0);
  return records[0]!;
}
describe('subscription changes and customer Activity', () => {
  it('rolls back the subscription and platform audit if customer audit storage fails', async () => {
    const requestId = randomUUID();
    // Scoped to this disposable failure marker; other actions and fixture data remain valid.
    await adminQuery`alter table audit_log add constraint verification_subscription_customer_audit check (action <> 'subscription.plan_assigned' or "after"->>'reason' <> 'verification_forced_customer_audit_failure')`;
    try {
      await expect(
        assignPlan(
          { tenantId, planCode: 'business', reason: 'verification_forced_customer_audit_failure' },
          actor(requestId),
        ),
      ).rejects.toThrow();
      const [subscription] =
        await adminQuery`select p.code from subscriptions s join plans p on p.id=s.plan_id where s.tenant_id=${tenantId}`;
      expect(subscription?.code).toBe('pro');
      const logs =
        await adminQuery`select id from platform_audit_log where request_id=${requestId} union all select id from audit_log where request_id=${requestId}`;
      expect(logs).toHaveLength(0);
    } finally {
      await cleanup`alter table audit_log drop constraint verification_subscription_customer_audit`;
    }
  });
  it('records a plan assignment with its reason and monthly values in both logs', async () => {
    const requestId = randomUUID();
    await assignPlan(
      { tenantId, planCode: 'business', reason: 'Upgrade agreed for verification' },
      actor(requestId),
    );
    const record = await correlated(requestId, 'subscription.plan_assigned');
    expect(record.before).toMatchObject({ plan: 'pro', monthly: 3400 });
    expect(record.after).toMatchObject({
      plan: 'business',
      monthly: 17000,
      reason: 'Upgrade agreed for verification',
    });
  });
  it('records a negotiated Custom plan price in customer Activity', async () => {
    const requestId = randomUUID();
    await assignPlan(
      {
        tenantId,
        planCode: 'custom',
        contractAmount: 23400,
        reason: 'Agreed Custom verification price',
      },
      actor(requestId),
    );
    const record = await correlated(requestId, 'subscription.plan_assigned');
    expect(record.after).toMatchObject({ plan: 'custom', monthly: 23400 });
  });
  it('records a change to a negotiated contract price', async () => {
    const requestId = randomUUID();
    await setContractAmount(
      { tenantId, amount: 24100, reason: 'Revised verification agreement' },
      actor(requestId),
    );
    const record = await correlated(requestId, 'subscription.contract_set');
    expect(record.before).toMatchObject({ monthly: 23400 });
    expect(record.after).toMatchObject({ monthly: 24100 });
  });
  it('records a lifecycle change with the actual prior status', async () => {
    const requestId = randomUUID();
    await changeSubscriptionStatus(
      { tenantId, to: 'past_due', reason: 'Verification follow-up needed' },
      actor(requestId),
    );
    const record = await correlated(requestId, 'subscription.status_changed');
    expect(record.before).toEqual({ status: 'active' });
    expect(record.after).toMatchObject({ status: 'past_due' });
  });
  it('records an allowance override with a real record reference', async () => {
    const requestId = randomUUID();
    await grantOverride(
      { tenantId, key: 'seats', limitValue: 5, reason: 'Temporary verification seats' },
      actor(requestId),
    );
    const record = await correlated(requestId, 'subscription.override_granted');
    expect(record.after).toMatchObject({ key: 'seats', limitValue: 5 });
    const [override] =
      await adminQuery`select id from subscription_overrides where tenant_id=${tenantId} and key='seats'`;
    const [event] = await adminQuery`select entity_id from audit_log where request_id=${requestId}`;
    expect(event?.entity_id).toBe(override?.id);
  });
  it('rolls back the attempted platform audit when a plan change is refused', async () => {
    const requestId = randomUUID();
    await expect(
      assignPlan(
        { tenantId, planCode: 'missing-verification-plan', reason: 'Refused verification attempt' },
        actor(requestId),
      ),
    ).rejects.toThrow();
    const logs =
      await adminQuery`select id from platform_audit_log where request_id=${requestId} union all select id from audit_log where request_id=${requestId}`;
    expect(logs).toHaveLength(0);
    const [subscription] =
      await adminQuery`select p.code,s.contract_amount from subscriptions s join plans p on p.id=s.plan_id where s.tenant_id=${tenantId}`;
    expect(subscription?.code).toBe('custom');
    expect(Number(subscription?.contract_amount)).toBe(24100);
  });
});
