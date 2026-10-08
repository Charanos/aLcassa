import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { adminQuery, cleanup, closeHarness } from './harness';
import { assertDisposableDatabase } from './disposable';
import { SEED_USER_A } from '@/db/seed/constants';
import { createResolvedContext, type TenantRole } from '@/lib/db/context';
import * as email from '@/modules/email';
import * as audit from '@/lib/audit';
import {
  inviteMember,
  resendInvitation,
  revokeInvitation,
  removeMember,
  changeMemberRole,
  transferOwnership,
  acceptInvitationByToken,
  readInvitationByToken,
} from '@/modules/membership';

const tenant = randomUUID();
const plan = randomUUID();
const agents = [randomUUID(), randomUUID()];
const memberIds = [randomUUID(), randomUUID(), randomUUID()];
const context = (role: TenantRole = 'owner', actorId = SEED_USER_A) =>
  createResolvedContext({
    tenantId: tenant,
    role,
    supportMode: role === 'support',
    actorId,
    actorLabel: 'Membership verification',
    actorType: role === 'support' ? 'platform_admin' : 'user',
    requestId: randomUUID(),
  });
let created = false;

beforeAll(async () => {
  assertDisposableDatabase();
  vi.spyOn(email, 'sendEmail').mockResolvedValue({
    delivered: false,
    reason: 'Local verification does not send email.',
    retryable: false,
  });
  await adminQuery`insert into tenants (id, slug, name, status) values (${tenant}, ${`membership-${tenant}`}, 'Membership verification', 'active')`;
  created = true;
  await adminQuery`insert into plans (id, code, name) values (${plan}, ${`membership-${plan}`}, 'Membership verification')`;
  await adminQuery`insert into plan_entitlements (plan_id, key, kind, limit_value, display_name) values (${plan}, 'seats', 'limit', 4, 'Seats')`;
  await adminQuery`insert into subscriptions (tenant_id, plan_id, status, current_period_start, current_period_end) values (${tenant}, ${plan}, 'active', now(), now() + interval '30 days')`;
  for (const userId of agents)
    await adminQuery`insert into user_profiles (id, full_name, email) values (${userId}, 'Test teammate', ${`${userId}@example.invalid`})`;
});

beforeEach(async () => {
  await cleanup`delete from audit_log where tenant_id = ${tenant}`;
  await cleanup`delete from invitations where tenant_id = ${tenant}`;
  await cleanup`delete from tenant_members where tenant_id = ${tenant}`;
  await cleanup`delete from subscription_overrides where tenant_id = ${tenant}`;
  await adminQuery`update tenants set status = 'active' where id = ${tenant}`;
  await adminQuery`update subscriptions set status = 'active' where tenant_id = ${tenant}`;
  await adminQuery`update plan_entitlements set limit_value = 4 where plan_id = ${plan} and key = 'seats'`;
  await adminQuery`insert into tenant_members (id, tenant_id, user_id, role, status) values (${memberIds[0]!}, ${tenant}, ${SEED_USER_A}, 'owner', 'active'), (${memberIds[1]!}, ${tenant}, ${agents[0]!}, 'agent', 'active'), (${memberIds[2]!}, ${tenant}, ${agents[1]!}, 'agent', 'active')`;
  await adminQuery`insert into usage_counters (tenant_id, key, current_value, peak_value) values (${tenant}, 'seats', 3, 3) on conflict (tenant_id, key) do update set current_value = 3, peak_value = 3`;
});

afterAll(async () => {
  vi.restoreAllMocks();
  if (created) {
    await cleanup`delete from audit_log where tenant_id = ${tenant}`;
    await cleanup`delete from invitations where tenant_id = ${tenant}`;
    await cleanup`delete from tenant_members where tenant_id = ${tenant}`;
    await cleanup`delete from usage_counters where tenant_id = ${tenant}`;
    await cleanup`delete from subscription_overrides where tenant_id = ${tenant}`;
    await cleanup`delete from subscriptions where tenant_id = ${tenant}`;
    await cleanup`delete from plan_entitlements where plan_id = ${plan}`;
    await cleanup`delete from plans where id = ${plan}`;
    await cleanup`delete from tenants where id = ${tenant}`;
    await cleanup`delete from user_profiles where id = any(${agents})`;
  }
  await closeHarness();
});

const invite = () =>
  inviteMember(context(), { email: `${randomUUID()}@example.invalid`, role: 'agent' });
async function seats() {
  const [row] = await adminQuery<
    { n: number }[]
  >`select current_value::int as n from usage_counters where tenant_id = ${tenant} and key = 'seats'`;
  return row?.n;
}
async function audits(action: string) {
  const [row] = await adminQuery<
    { n: number }[]
  >`select count(*)::int as n from audit_log where tenant_id = ${tenant} and action = ${action}`;
  return row?.n;
}

describe('membership mutations under actual policies', () => {
  it('returns a conflict for a second normalized pending address without consuming a seat', async () => {
    await adminQuery`update plan_entitlements set limit_value = 5 where plan_id = ${plan}`;
    await inviteMember(context(), { email: 'pending-review@example.invalid', role: 'agent' });
    await expect(
      inviteMember(context(), { email: ' PENDING-REVIEW@EXAMPLE.INVALID ', role: 'agent' }),
    ).rejects.toMatchObject({ code: 'member.already_exists' });
    expect(await seats()).toBe(4);
    expect(await audits('member.invited')).toBe(1);
  });
  it('reserves the final seat only once across simultaneous invitations', async () => {
    const outcomes = await Promise.allSettled(Array.from({ length: 6 }, invite));
    expect(outcomes.filter((outcome) => outcome.status === 'fulfilled')).toHaveLength(1);
    expect(await seats()).toBe(4);
    expect(await audits('member.invited')).toBe(1);
  });

  it('withdraws an invitation once and returns exactly one seat', async () => {
    const invitation = await invite();
    const outcomes = await Promise.allSettled([
      revokeInvitation(context(), invitation.id),
      revokeInvitation(context(), invitation.id),
    ]);
    expect(outcomes.filter((outcome) => outcome.status === 'fulfilled')).toHaveLength(1);
    expect(await seats()).toBe(3);
    expect(await audits('invitation.revoked')).toBe(1);
  });

  it('removes a teammate once and returns exactly one seat', async () => {
    const outcomes = await Promise.allSettled([
      removeMember(context(), memberIds[1]!),
      removeMember(context(), memberIds[1]!),
    ]);
    expect(outcomes.filter((outcome) => outcome.status === 'fulfilled')).toHaveLength(1);
    expect(await seats()).toBe(2);
    expect(await audits('member.removed')).toBe(1);
  });

  it('reissues only one new token across simultaneous eligible resends', async () => {
    const invitation = await invite();
    await adminQuery`update invitations set expires_at = now() + interval '5 days' where id = ${invitation.id}`;
    const outcomes = await Promise.allSettled([
      resendInvitation(context(), invitation.id),
      resendInvitation(context(), invitation.id),
    ]);
    expect(outcomes.filter((outcome) => outcome.status === 'fulfilled')).toHaveLength(1);
    expect(await seats()).toBe(4);
    expect(await audits('invitation.resent')).toBe(1);
  });

  it('refuses stale owner authority after the first ownership transfer', async () => {
    await transferOwnership(context(), memberIds[1]!);
    await expect(transferOwnership(context(), memberIds[2]!)).rejects.toMatchObject({
      code: 'auth.role_not_permitted',
    });
    const owners =
      await adminQuery`select user_id from tenant_members where tenant_id = ${tenant} and role = 'owner' and deleted_at is null`;
    expect(owners).toHaveLength(1);
    expect(owners[0]?.user_id).toBe(agents[0]);
    expect(await audits('tenant.ownership_transferred')).toBe(1);
  });

  it('refuses role changes by an administrator through a direct module call', async () => {
    await adminQuery`update tenant_members set role = 'admin' where id = ${memberIds[1]!}`;
    await expect(
      changeMemberRole(context('admin', agents[0]), memberIds[2]!, 'admin'),
    ).rejects.toMatchObject({ code: 'auth.role_not_permitted' });
    expect(await audits('member.role_changed')).toBe(0);
  });

  it('consumes a single-use invitation once across simultaneous acceptances', async () => {
    const invitation = await invite();
    const userId = randomUUID();
    agents.push(userId);
    const profile = { email: invitation.email, fullName: 'Invited teammate' };
    const outcomes = await Promise.allSettled(
      Array.from({ length: 2 }, () =>
        acceptInvitationByToken(invitation.token, userId, profile, randomUUID()),
      ),
    );
    expect(outcomes.filter((outcome) => outcome.status === 'fulfilled')).toHaveLength(1);
    expect(await audits('member.joined')).toBe(1);
    expect(await seats()).toBe(4);
  });

  it('keeps one owner under simultaneous transfers to different teammates', async () => {
    const outcomes = await Promise.allSettled([
      transferOwnership(context(), memberIds[1]!),
      transferOwnership(context(), memberIds[2]!),
    ]);
    expect(outcomes.filter((outcome) => outcome.status === 'fulfilled')).toHaveLength(1);
    const [owners] = await adminQuery<
      { n: number }[]
    >`select count(*)::int as n from tenant_members where tenant_id = ${tenant} and role = 'owner' and deleted_at is null`;
    expect(owners?.n).toBe(1);
    expect(await audits('tenant.ownership_transferred')).toBe(1);
  });

  it('preserves owner access when role change and removal are attempted', async () => {
    await expect(changeMemberRole(context(), memberIds[0]!, 'admin')).rejects.toMatchObject({
      code: 'member.last_owner',
    });
    await expect(removeMember(context(), memberIds[0]!)).rejects.toMatchObject({
      code: 'member.last_owner',
    });
    expect(await seats()).toBe(3);
  });

  it('refuses an agent invitation and direct owner promotion', async () => {
    await expect(
      inviteMember(context('agent', agents[0]), {
        email: 'blocked@example.invalid',
        role: 'agent',
      }),
    ).rejects.toMatchObject({ code: 'auth.role_not_permitted' });
    await expect(
      inviteMember(context(), { email: 'blocked@example.invalid', role: 'owner' as 'agent' }),
    ).rejects.toMatchObject({ code: 'validation.failed' });
    await expect(changeMemberRole(context(), memberIds[1]!, 'owner')).rejects.toMatchObject({
      code: 'validation.failed',
    });
    expect(await seats()).toBe(3);
  });

  it('denies new invitations for a paused subscription or suspended workspace', async () => {
    await adminQuery`update subscriptions set status = 'paused' where tenant_id = ${tenant}`;
    await expect(invite()).rejects.toMatchObject({ code: 'subscription.not_active' });
    await adminQuery`update subscriptions set status = 'active' where tenant_id = ${tenant}`;
    await adminQuery`update tenants set status = 'suspended' where id = ${tenant}`;
    await expect(invite()).rejects.toMatchObject({ code: 'tenant.suspended' });
    expect(await audits('member.invited')).toBe(0);
  });

  it('counts an expired unwithdrawn invitation as a reserved seat', async () => {
    const invitation = await invite();
    await adminQuery`update invitations set expires_at = now() - interval '1 hour' where id = ${invitation.id}`;
    await expect(invite()).rejects.toMatchObject({ code: 'entitlement.limit_reached' });
    await revokeInvitation(context(), invitation.id);
    await expect(invite()).resolves.toMatchObject({ delivery: { sent: false } });
    expect(await seats()).toBe(4);
  });

  it('does not release a seat when removing a suspended member', async () => {
    await adminQuery`update tenant_members set status = 'suspended' where id = ${memberIds[1]!}`;
    await adminQuery`update usage_counters set current_value = 2 where tenant_id = ${tenant} and key = 'seats'`;
    await removeMember(context(), memberIds[1]!);
    expect(await seats()).toBe(2);
  });

  it('initializes a missing counter from source rows and refuses existing drift', async () => {
    await cleanup`delete from usage_counters where tenant_id = ${tenant} and key = 'seats'`;
    await invite();
    expect(await seats()).toBe(4);
    await adminQuery`update usage_counters set current_value = 1 where tenant_id = ${tenant} and key = 'seats'`;
    await expect(invite()).rejects.toMatchObject({ code: 'internal' });
    expect(await audits('member.invited')).toBe(1);
  });

  it('reads current grants and ignores expired overrides', async () => {
    await adminQuery`update plan_entitlements set limit_value = 3 where plan_id = ${plan}`;
    await adminQuery`insert into subscription_overrides (tenant_id, key, limit_value, reason, granted_by, expires_at) values (${tenant}, 'seats', 8, 'Expired test grant', ${SEED_USER_A}, now() - interval '1 hour')`;
    await expect(invite()).rejects.toMatchObject({ code: 'entitlement.limit_reached' });
    await adminQuery`update subscription_overrides set expires_at = null, limit_value = null where tenant_id = ${tenant} and key = 'seats'`;
    await invite();
    await invite();
    expect(await seats()).toBe(5);
  });

  it('refuses inviting an existing teammate by normalized email', async () => {
    await expect(
      inviteMember(context(), { email: ` ${agents[0]!}@EXAMPLE.INVALID `, role: 'agent' }),
    ).rejects.toMatchObject({ code: 'member.already_exists' });
    expect(await seats()).toBe(3);
  });

  it('returns not found for member and invitation IDs outside this workspace', async () => {
    await expect(removeMember(context(), randomUUID())).rejects.toMatchObject({
      code: 'not_found',
    });
    await expect(revokeInvitation(context(), randomUUID())).rejects.toMatchObject({
      code: 'not_found',
    });
    expect(await seats()).toBe(3);
  });

  it('rolls back invitation and seat reservation if its audit write fails', async () => {
    const spy = vi
      .spyOn(audit, 'audited')
      .mockImplementationOnce(async (_tx, _ctx, _entry, operation) => {
        await operation();
        throw new Error('Verification audit failure');
      });
    try {
      await expect(invite()).rejects.toThrow('Verification audit failure');
      expect(await seats()).toBe(3);
      const [count] = await adminQuery<
        { n: number }[]
      >`select count(*)::int as n from invitations where tenant_id = ${tenant}`;
      expect(count?.n).toBe(0);
    } finally {
      spy.mockRestore();
    }
  });

  it('retires the previous invitation link when an invitation is renewed', async () => {
    const invitation = await invite();
    await adminQuery`update invitations set expires_at = now() + interval '5 days' where id = ${invitation.id}`;
    const renewed = await resendInvitation(context(), invitation.id);
    expect(await readInvitationByToken(invitation.token, randomUUID())).toBeNull();
    expect(await readInvitationByToken(renewed.token, randomUUID())).toMatchObject({
      state: 'pending',
      invitationId: invitation.id,
    });
    expect(await seats()).toBe(4);
  });

  it('makes acceptance and withdrawal mutually exclusive', async () => {
    const invitation = await invite();
    const userId = randomUUID();
    agents.push(userId);
    const outcomes = await Promise.allSettled([
      acceptInvitationByToken(
        invitation.token,
        userId,
        { email: invitation.email, fullName: 'Acceptance race' },
        randomUUID(),
      ),
      revokeInvitation(context(), invitation.id),
    ]);
    expect(outcomes.filter((outcome) => outcome.status === 'fulfilled')).toHaveLength(1);
    const joined = await audits('member.joined');
    expect((joined ?? 0) + ((await audits('invitation.revoked')) ?? 0)).toBe(1);
    expect(await seats()).toBe(joined ? 4 : 3);
  });
});
