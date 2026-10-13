import { afterAll, beforeAll, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { adminQuery, closeHarness } from './harness';
import { previewSuspension, setTenantStatus } from '../../src/modules/platform';
import { describeEntry, natureOf } from '../../src/lib/console/auditVocabulary';

const operator = randomUUID();
const tenant = randomUUID();
const slug = `status-${tenant}`;
const actor = () => ({ userId: operator, label: 'Status verifier', requestId: randomUUID() });

beforeAll(async () => {
  await adminQuery`insert into user_profiles(id, email, full_name) values(${operator}, ${`${operator}@example.invalid`}, 'Status verifier')`;
  await adminQuery`insert into platform_admins(user_id,display_name) values(${operator}, 'Status verifier')`;
  await adminQuery`insert into tenants(id,slug,name,status) values(${tenant},${slug},'Status acceptance','active')`;
});
afterAll(async () => {
  await adminQuery`delete from platform_audit_log where actor_user_id=${operator}`;
  await adminQuery`delete from audit_log where tenant_id=${tenant}`;
  await adminQuery`delete from tenants where id=${tenant}`;
  await adminQuery`delete from platform_admins where user_id=${operator}`;
  await adminQuery`delete from user_profiles where id=${operator}`;
  await closeHarness();
});

it('records an impact preview without claiming a suspension or changing customer Activity', async () => {
  await previewSuspension(tenant, actor());
  const [preview] = await adminQuery<
    { n: number }[]
  >`select count(*)::int as n from platform_audit_log where actor_user_id=${operator} and action='tenant.suspension_previewed'`;
  const [changes] = await adminQuery<
    { n: number }[]
  >`select count(*)::int as n from audit_log where tenant_id=${tenant}`;
  const [stored] = await adminQuery<
    { status: string }[]
  >`select status from tenants where id=${tenant}`;
  expect(preview?.n).toBe(1);
  expect(changes?.n).toBe(0);
  expect(stored?.status).toBe('active');
  expect(natureOf({ action: 'tenant.suspension_previewed' })).toBe('read');
  expect(
    describeEntry({ action: 'tenant.suspended', reason: 'suspension preview, no change written' }),
  ).toMatchObject({ nature: 'read', label: 'Suspension impact reviewed' });
  expect(natureOf({ action: 'tenant.suspended', reason: 'Confirmed status change' })).toBe(
    'change',
  );
});

it('serializes concurrent status changes and records one committed change in each log', async () => {
  for (const status of ['suspended', 'active'] as const) {
    const attempts = await Promise.allSettled(
      [0, 1].map(() =>
        setTenantStatus(
          {
            tenantId: tenant,
            status,
            confirmSlug: slug,
            reason: 'Concurrent status acceptance',
          },
          actor(),
        ),
      ),
    );
    expect(attempts.filter((attempt) => attempt.status === 'fulfilled')).toHaveLength(1);
    expect(attempts.filter((attempt) => attempt.status === 'rejected')).toHaveLength(1);
    const [stored] = await adminQuery<
      { status: string }[]
    >`select status from tenants where id=${tenant}`;
    expect(stored?.status).toBe(status);
    const action = status === 'active' ? 'tenant.reactivated' : 'tenant.suspended';
    const [platform] = await adminQuery<
      { n: number }[]
    >`select count(*)::int as n from platform_audit_log where action=${action} and actor_user_id=${operator}`;
    const [customer] = await adminQuery<
      { n: number }[]
    >`select count(*)::int as n from audit_log where action=${action} and actor_user_id=${operator}`;
    expect(platform?.n).toBe(1);
    expect(customer?.n).toBe(1);
  }
});
