import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createSupabaseAdminClient } from '@/lib/auth/supabase/admin';
import { provisionTenant } from '@/modules/platform';
import { adminQuery, cleanup, closeHarness } from './harness';
import { assertDisposableDatabase } from './disposable';

const operatorId = randomUUID();
const planId = randomUUID();
const slug = `provider-${randomUUID()}`;
const email = `${slug}@example.invalid`;
const requestId = randomUUID();
let ownerUserId: string | undefined;

type CapturedMail = {
  messages: Array<{ ID: string; To: Array<{ Address: string }>; Subject: string }>;
};

beforeAll(async () => {
  assertDisposableDatabase();
  if (process.env.NEXT_PUBLIC_SUPABASE_URL !== 'http://127.0.0.1:55421') {
    throw new Error('Auth contract verification requires the disposable loopback API.');
  }
  await adminQuery`insert into user_profiles(id,full_name) values(${operatorId},'Provider verifier')`;
  await adminQuery`insert into platform_admins(user_id,display_name,can_suspend_tenants) values(${operatorId},'Provider verifier',true)`;
  await adminQuery`insert into plans(id,code,name,trial_days) values(${planId},${slug},'Provider verification',14)`;
});

afterAll(async () => {
  // Recover even if an assertion failed before the module returned its Auth identifier.
  if (!ownerUserId) {
    const [account] = await adminQuery<
      Array<{ id: string }>
    >`select id from auth.users where email=${email}`;
    ownerUserId = account?.id;
  }
  const [tenant] = await adminQuery<
    Array<{ id: string }>
  >`select id from tenants where slug=${slug}`;
  if (tenant) {
    await cleanup`delete from subscriptions where tenant_id=${tenant.id}`;
    await cleanup`delete from tenant_members where tenant_id=${tenant.id}`;
    await cleanup`delete from tenant_settings where tenant_id=${tenant.id}`;
    await cleanup`delete from tenants where id=${tenant.id}`;
  }
  if (ownerUserId) {
    const removed = await createSupabaseAdminClient().auth.admin.deleteUser(ownerUserId);
    expect(removed.error, 'Disposable Auth cleanup must succeed').toBeNull();
    expect(await adminQuery`select id from auth.users where id=${ownerUserId}`).toEqual([]);
    await cleanup`delete from user_profiles where id=${ownerUserId}`;
  }
  await cleanup`delete from platform_audit_log where request_id=${requestId}`;
  await cleanup`delete from platform_admins where user_id=${operatorId}`;
  await cleanup`delete from user_profiles where id=${operatorId}`;
  await cleanup`delete from plans where id=${planId}`;
  await closeHarness();
});

describe('Provisioning against actual local Supabase Auth and SMTP capture', () => {
  it('creates an invited owner, complete workspace records and a captured invitation', async () => {
    const started = performance.now();
    const result = await provisionTenant(
      {
        name: 'Provider verification',
        slug,
        ownerEmail: email,
        ownerName: 'Provider owner',
        initialStatus: 'trial',
        planCode: slug,
      },
      { userId: operatorId, label: 'Provider verifier', requestId },
    );
    expect(result.ok, 'Provisioning should succeed against the actual provider').toBe(true);
    if (!result.ok) throw new Error(result.message);
    ownerUserId = result.ownerUserId;
    const [identity] = await adminQuery<Array<{ invited: boolean; confirmed: boolean }>>`
      select invited_at is not null as invited,email_confirmed_at is not null as confirmed from auth.users where id=${ownerUserId}`;
    expect(identity).toEqual({ invited: true, confirmed: false });
    const [workspace] = await adminQuery<
      Array<{ status: string; settings: number; owners: number; plan_id: string }>
    >`
      select s.status,s.plan_id,
      (select count(*)::int from tenant_settings where tenant_id=t.id) as settings,
      (select count(*)::int from tenant_members where tenant_id=t.id and user_id=${ownerUserId} and role='owner' and status='invited' and joined_at is null) as owners
      from tenants t join subscriptions s on s.tenant_id=t.id where t.id=${result.tenantId}`;
    expect(workspace).toEqual({ status: 'trialing', plan_id: planId, settings: 1, owners: 1 });
    await expect
      .poll(
        async () => {
          const response = await fetch(
            `http://127.0.0.1:55424/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`,
          );
          if (!response.ok) throw new Error('The local email capture could not be read.');
          const mail = (await response.json()) as CapturedMail;
          return mail.messages.filter(
            (message) =>
              message.To.some((recipient) => recipient.Address === email) &&
              /invit/i.test(message.Subject),
          ).length;
        },
        { timeout: 10_000, interval: 100 },
      )
      .toBe(1);
    expect(performance.now() - started).toBeLessThan(120_000);
    expect(
      await adminQuery`select action from platform_audit_log where request_id=${requestId} order by occurred_at`,
    ).toEqual([{ action: 'tenant.provisioning_checked' }, { action: 'tenant.provisioned' }]);
  });
});
