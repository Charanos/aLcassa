import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ERROR_CODES } from '@/lib/errors';
import { natureOf } from '@/lib/console/auditVocabulary';
import { provisionTenant } from '@/modules/platform';
import { adminQuery, cleanup, closeHarness } from './harness';
import { assertDisposableDatabase } from './disposable';

const auth = vi.hoisted(() => ({ invite: vi.fn(), remove: vi.fn(), client: vi.fn() }));
vi.mock('@/lib/auth/supabase/admin', () => ({ createSupabaseAdminClient: auth.client }));
const operatorId = randomUUID();
const planId = randomUUID();
const planCode = `provision-${randomUUID()}`;
const ownerIds: string[] = [];
const slugs: string[] = [];
const requestIds: string[] = [];
function input(overrides = {}) {
  const slug = `verify-${randomUUID()}`;
  slugs.push(slug);
  return {
    name: 'Provision verification',
    slug,
    ownerEmail: `${slug}@example.invalid`,
    ownerName: 'Verification owner',
    initialStatus: 'trial' as const,
    planCode,
    ...overrides,
  };
}
function actor(userId = operatorId) {
  const requestId = randomUUID();
  requestIds.push(requestId);
  return { userId, requestId, label: 'Provision verifier' };
}
function owner() {
  const id = randomUUID();
  ownerIds.push(id);
  return { data: { user: { id } }, error: null };
}
async function audits(requestId: string) {
  return adminQuery<
    Array<{ action: string; used_service_role: boolean }>
  >`select action,used_service_role from platform_audit_log where request_id=${requestId} order by occurred_at`;
}
async function assertNoWorkspace(slug: string) {
  expect(await adminQuery`select id from tenants where slug=${slug}`).toEqual([]);
}

beforeAll(async () => {
  assertDisposableDatabase();
  await adminQuery`insert into user_profiles(id,full_name) values(${operatorId},'Provision verifier')`;
  await adminQuery`insert into platform_admins(user_id,display_name,can_suspend_tenants) values(${operatorId},'Provision verifier',true)`;
  await adminQuery`insert into plans(id,code,name,trial_days) values(${planId},${planCode},'Provision verification',14)`;
});
beforeEach(async () => {
  vi.resetAllMocks();
  auth.client.mockReturnValue({
    auth: { admin: { inviteUserByEmail: auth.invite, deleteUser: auth.remove } },
  });
  auth.invite.mockImplementation(() => Promise.resolve(owner()));
  auth.remove.mockResolvedValue({ error: null });
  await adminQuery`update plans set is_active=true where id=${planId}`;
  await adminQuery`update platform_admins set can_suspend_tenants=true where user_id=${operatorId}`;
});
afterAll(async () => {
  await cleanup`delete from platform_audit_log where request_id=any(${requestIds}::text[])`;
  const rows = await adminQuery<
    Array<{ id: string }>
  >`select id from tenants where slug=any(${slugs}::text[])`;
  for (const row of rows) {
    await cleanup`delete from subscriptions where tenant_id=${row.id}`;
    await cleanup`delete from tenant_members where tenant_id=${row.id}`;
    await cleanup`delete from tenant_settings where tenant_id=${row.id}`;
    await cleanup`delete from tenants where id=${row.id}`;
  }
  await cleanup`delete from user_profiles where id=any(${ownerIds}::uuid[])`;
  await cleanup`delete from platform_admins where user_id=${operatorId}`;
  await cleanup`delete from user_profiles where id=${operatorId}`;
  await cleanup`delete from plans where id=${planId}`;
  await closeHarness();
});

describe('Provisioning validation and compensation with actual database transactions', () => {
  it('refuses malformed input before reaching Auth or committing audit', async () => {
    const identity = actor();
    expect(await provisionTenant(input({ slug: 'platform' }), identity)).toMatchObject({
      ok: false,
      code: 'validation_failed',
    });
    expect(auth.client).not.toHaveBeenCalled();
    expect(await audits(identity.requestId)).toEqual([]);
  });
  it.each(['limited', 'non-operator'])(
    'refuses a %s actor before sending an invitation',
    async (kind) => {
      if (kind === 'limited')
        await adminQuery`update platform_admins set can_suspend_tenants=false where user_id=${operatorId}`;
      const identity = actor(kind === 'limited' ? operatorId : randomUUID());
      await expect(provisionTenant(input(), identity)).rejects.toMatchObject({
        code: ERROR_CODES.PLATFORM_CAPABILITY_MISSING,
      });
      expect(auth.client).not.toHaveBeenCalled();
      expect(await audits(identity.requestId)).toEqual([]);
    },
  );
  it('refuses an existing workspace address before sending email', async () => {
    const data = input();
    const identity = actor();
    await adminQuery`insert into tenants(slug,name) values(${data.slug},'Competing workspace')`;
    expect(await provisionTenant(data, identity)).toMatchObject({ ok: false, code: 'slug_taken' });
    expect(auth.invite).not.toHaveBeenCalled();
    expect(await audits(identity.requestId)).toEqual([]);
  });
  it.each(['missing', 'inactive'])('refuses a %s plan before sending email', async (kind) => {
    if (kind === 'inactive') await adminQuery`update plans set is_active=false where id=${planId}`;
    const data = input({ planCode: kind === 'missing' ? 'not-a-plan' : planCode });
    const identity = actor();
    expect(await provisionTenant(data, identity)).toMatchObject({
      ok: false,
      code: 'unknown_plan',
    });
    expect(auth.invite).not.toHaveBeenCalled();
    expect(await audits(identity.requestId)).toEqual([]);
    await assertNoWorkspace(data.slug);
  });
  it('projects provider refusal without exposing its raw diagnostic', async () => {
    auth.invite.mockResolvedValue({
      data: { user: null },
      error: { code: 'unexpected_failure', message: 'PRIVATE_PROVIDER_DIAGNOSTIC' },
    });
    const data = input();
    const identity = actor();
    const result = await provisionTenant(data, identity);
    expect(result).toMatchObject({ ok: false, code: 'provisioning_failed' });
    expect(JSON.stringify(result)).not.toContain('PRIVATE_PROVIDER_DIAGNOSTIC');
    expect(auth.remove).not.toHaveBeenCalled();
    expect(await audits(identity.requestId)).toEqual([
      { action: 'tenant.provisioning_checked', used_service_role: true },
    ]);
    expect(natureOf({ action: 'tenant.provisioning_checked' })).toBe('read');
    await assertNoWorkspace(data.slug);
  });
  it('handles an unconfirmed Auth request without claiming a clean retry', async () => {
    auth.invite.mockRejectedValue(new Error('PRIVATE_PROVIDER_DIAGNOSTIC'));
    const data = input();
    const result = await provisionTenant(data, actor());
    expect(result).toMatchObject({ ok: false, code: 'provisioning_failed' });
    expect(JSON.stringify(result)).toContain('Check the owner account before retrying');
    expect(JSON.stringify(result)).not.toContain('PRIVATE_PROVIDER_DIAGNOSTIC');
    await assertNoWorkspace(data.slug);
  });
  it('identifies an already registered owner without recommending an unsupported setup route', async () => {
    auth.invite.mockResolvedValue({
      data: { user: null },
      error: { code: 'email_exists', message: 'PRIVATE_PROVIDER_DIAGNOSTIC' },
    });
    expect(await provisionTenant(input(), actor())).toMatchObject({
      ok: false,
      code: 'owner_exists',
    });
    expect(auth.remove).not.toHaveBeenCalled();
  });
  it.each(['trial', 'active'] as const)(
    'commits complete %s workspace records and an accurate creation audit',
    async (initialStatus) => {
      const data = input({ initialStatus });
      const identity = actor();
      const result = await provisionTenant(data, identity);
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error(result.message);
      const [record] = await adminQuery<
        Array<{
          owners: number;
          settings: number;
          plan_id: string;
          status: string;
          trial_ends_at: Date | null;
          start: Date;
          end: Date;
        }>
      >`
      select (select count(*)::int from tenant_members where tenant_id=t.id and role='owner' and status='invited') as owners,
      (select count(*)::int from tenant_settings where tenant_id=t.id) as settings,
      s.plan_id,s.status,s.trial_ends_at,s.current_period_start as start,s.current_period_end as end
      from tenants t join subscriptions s on s.tenant_id=t.id where t.id=${result.tenantId}`;
      expect(record).toMatchObject({
        owners: 1,
        settings: 1,
        plan_id: planId,
        status: initialStatus === 'trial' ? 'trialing' : 'active',
      });
      expect(record!.end.getTime()).toBeGreaterThan(record!.start.getTime());
      expect(Boolean(record!.trial_ends_at)).toBe(initialStatus === 'trial');
      expect(await audits(identity.requestId)).toEqual([
        { action: 'tenant.provisioning_checked', used_service_role: true },
        { action: 'tenant.provisioned', used_service_role: true },
      ]);
      expect(
        await adminQuery`select target_tenant_id,entity_id from platform_audit_log where request_id=${identity.requestId} and action='tenant.provisioned'`,
      ).toEqual([{ target_tenant_id: result.tenantId, entity_id: result.tenantId }]);
      expect(auth.remove).not.toHaveBeenCalled();
    },
  );
  it('rechecks a plan deactivated during Auth and compensates without a creation audit', async () => {
    const authOwner = owner();
    auth.invite.mockImplementation(async () => {
      await adminQuery`update plans set is_active=false where id=${planId}`;
      return authOwner;
    });
    const data = input();
    const identity = actor();
    const result = await provisionTenant(data, identity);
    expect(result).toMatchObject({ ok: false, code: 'unknown_plan' });
    expect(JSON.stringify(result)).toContain('invitation may already have been sent');
    expect(auth.remove).toHaveBeenCalledWith(authOwner.data.user.id);
    await assertNoWorkspace(data.slug);
    expect((await audits(identity.requestId)).map((row) => row.action)).toEqual([
      'tenant.provisioning_checked',
    ]);
  });
  it('rechecks operator permission after Auth and removes the temporary account', async () => {
    auth.invite.mockImplementation(async () => {
      await adminQuery`update platform_admins set can_suspend_tenants=false where user_id=${operatorId}`;
      return owner();
    });
    const data = input();
    const identity = actor();
    await expect(provisionTenant(data, identity)).rejects.toMatchObject({
      code: ERROR_CODES.PLATFORM_CAPABILITY_MISSING,
    });
    expect(auth.remove).toHaveBeenCalledTimes(1);
    await assertNoWorkspace(data.slug);
    expect((await audits(identity.requestId)).map((row) => row.action)).toEqual([
      'tenant.provisioning_checked',
    ]);
  });
  it.each(['slug', 'plan'])(
    'reports account recovery when compensation fails after a %s conflict',
    async (kind) => {
      const data = input();
      auth.invite.mockImplementation(async () => {
        if (kind === 'slug')
          await adminQuery`insert into tenants(slug,name) values(${data.slug},'Concurrent workspace')`;
        else await adminQuery`update plans set is_active=false where id=${planId}`;
        return owner();
      });
      auth.remove.mockResolvedValue({ error: { message: 'PRIVATE_CLEANUP_DIAGNOSTIC' } });
      const identity = actor();
      const result = await provisionTenant(data, identity);
      expect(result).toMatchObject({ ok: false, code: 'provisioning_failed' });
      expect(JSON.stringify(result)).toContain('recover that account before retrying');
      expect(JSON.stringify(result)).not.toContain('PRIVATE_CLEANUP_DIAGNOSTIC');
      expect((await audits(identity.requestId)).map((row) => row.action)).toEqual([
        'tenant.provisioning_checked',
      ]);
    },
  );
  it('allows exactly one concurrent provisioning and compensates the losing owner', async () => {
    const data = input();
    let release: () => void = () => {};
    const bothInvited = new Promise<void>((resolve) => {
      release = resolve;
    });
    let arrivals = 0;
    auth.invite.mockImplementation(async () => {
      const result = owner();
      if (++arrivals === 2) release();
      await bothInvited;
      return result;
    });
    const identities = [actor(), actor()];
    const results = await Promise.all(
      identities.map((identity) => provisionTenant(data, identity)),
    );
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results.find((result) => !result.ok)).toMatchObject({ ok: false, code: 'slug_taken' });
    expect(auth.remove).toHaveBeenCalledTimes(1);
    expect(await adminQuery`select id from tenants where slug=${data.slug}`).toHaveLength(1);
    const allAudits = (
      await Promise.all(identities.map((identity) => audits(identity.requestId)))
    ).flat();
    expect(allAudits.filter((row) => row.action === 'tenant.provisioned')).toHaveLength(1);
  });
  it('requires account recovery if the cleanup request itself throws', async () => {
    auth.invite.mockImplementation(async () => {
      await adminQuery`update plans set is_active=false where id=${planId}`;
      return owner();
    });
    auth.remove.mockRejectedValue(new Error('PRIVATE_CLEANUP_DIAGNOSTIC'));
    const data = input();
    const result = await provisionTenant(data, actor());
    expect(result).toMatchObject({ ok: false, code: 'provisioning_failed' });
    expect(JSON.stringify(result)).toContain('recover that account before retrying');
    expect(JSON.stringify(result)).not.toContain('PRIVATE_CLEANUP_DIAGNOSTIC');
    await assertNoWorkspace(data.slug);
  });
});
