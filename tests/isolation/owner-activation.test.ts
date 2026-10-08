import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { activateProvisionedOwner } from '@/lib/auth/provisionedOwner';
import { adminQuery, cleanup, closeHarness } from './harness';
import { assertDisposableDatabase } from './disposable';

const identity = vi.hoisted(() => {
  const user: { id: string; email_confirmed_at: string | null; user_metadata: { role: string } } = {
    id: '',
    email_confirmed_at: '2026-10-07T00:00:00Z',
    user_metadata: { role: 'owner' },
  };
  return { user };
});
vi.mock('@/lib/auth/supabase/server', () => ({
  createSupabaseServerClient: () =>
    Promise.resolve({
      auth: { getUser: () => Promise.resolve({ data: { user: identity.user }, error: null }) },
    }),
}));
const ownerId = randomUUID();
const strangerId = randomUUID();
const tenantId = randomUUID();
const memberId = randomUUID();
let prepared = false;
beforeAll(async () => {
  assertDisposableDatabase();
  prepared = true;
  await adminQuery`insert into tenants(id,slug,name,status) values(${tenantId},${`activation-${tenantId}`},'Activation verification','trial')`;
  await adminQuery`insert into user_profiles(id,full_name) values(${ownerId},'Invited owner'),(${strangerId},'Other account')`;
  await adminQuery`insert into tenant_members(id,tenant_id,user_id,role,status) values(${memberId},${tenantId},${ownerId},'owner','invited')`;
});
beforeEach(async () => {
  identity.user.id = ownerId;
  identity.user.email_confirmed_at = '2026-10-07T00:00:00Z';
  await adminQuery`update tenant_members set role='owner',status='invited',joined_at=null,deleted_at=null where id=${memberId}`;
  await adminQuery`update tenants set status='trial',deleted_at=null where id=${tenantId}`;
  await cleanup`delete from audit_log where tenant_id=${tenantId}`;
});
afterAll(async () => {
  if (!prepared) return;
  await cleanup`delete from audit_log where tenant_id=${tenantId}`;
  await cleanup`delete from tenant_members where tenant_id=${tenantId}`;
  await cleanup`delete from tenants where id=${tenantId}`;
  await cleanup`delete from user_profiles where id in (${ownerId},${strangerId})`;
  await closeHarness();
});
describe('Owner activation with actual tenant policies and commit locking', () => {
  it('records one complete joining event under concurrent confirmation', async () => {
    const results = await Promise.all([
      activateProvisionedOwner(randomUUID(), '127.0.0.82'),
      activateProvisionedOwner(randomUUID(), '127.0.0.82'),
    ]);
    expect(results).toEqual([
      { userId: ownerId, tenantId, role: 'owner' },
      { userId: ownerId, tenantId, role: 'owner' },
    ]);
    const audit = await adminQuery<
      Array<{
        entity_id: string;
        actor_user_id: string;
        ip_address: string;
        before: unknown;
        after: unknown;
      }>
    >`select entity_id,actor_user_id,ip_address,before,after from audit_log where tenant_id=${tenantId}`;
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({
      entity_id: memberId,
      actor_user_id: ownerId,
      ip_address: '127.0.0.82',
      before: { status: 'invited', role: 'owner' },
      after: { status: 'active', role: 'owner' },
    });
  });
  it('refuses an unconfirmed identity before activating its membership', async () => {
    identity.user.email_confirmed_at = null;
    await expect(activateProvisionedOwner(randomUUID(), null)).rejects.toMatchObject({
      code: 'auth.session_expired',
    });
    expect(await adminQuery`select status from tenant_members where id=${memberId}`).toEqual([
      { status: 'invited' },
    ]);
  });
  it('does not use editable identity metadata to grant the owner role', async () => {
    await adminQuery`update tenant_members set role='agent' where id=${memberId}`;
    await expect(activateProvisionedOwner(randomUUID(), null)).rejects.toMatchObject({
      code: 'auth.no_membership',
    });
  });
  it('refuses a suspended or removed owner', async () => {
    await adminQuery`update tenant_members set status='suspended' where id=${memberId}`;
    await expect(activateProvisionedOwner(randomUUID(), null)).rejects.toMatchObject({
      code: 'auth.no_membership',
    });
    await adminQuery`update tenant_members set status='invited',deleted_at=now() where id=${memberId}`;
    await expect(activateProvisionedOwner(randomUUID(), null)).rejects.toMatchObject({
      code: 'auth.no_membership',
    });
  });
  it('cannot activate another account’s invitation', async () => {
    identity.user.id = strangerId;
    await expect(activateProvisionedOwner(randomUUID(), null)).rejects.toMatchObject({
      code: 'auth.no_membership',
    });
    expect(await adminQuery`select status from tenant_members where id=${memberId}`).toEqual([
      { status: 'invited' },
    ]);
  });
  it('refuses a suspended or closed workspace without recording a join', async () => {
    await adminQuery`update tenants set status='suspended' where id=${tenantId}`;
    await expect(activateProvisionedOwner(randomUUID(), null)).rejects.toMatchObject({
      code: 'auth.no_membership',
    });
    await adminQuery`update tenants set status='closed' where id=${tenantId}`;
    await expect(activateProvisionedOwner(randomUUID(), null)).rejects.toMatchObject({
      code: 'auth.no_membership',
    });
    expect(await adminQuery`select action from audit_log where tenant_id=${tenantId}`).toEqual([]);
  });
});
