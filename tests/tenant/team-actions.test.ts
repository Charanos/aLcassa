import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError, ERROR_CODES } from '@/lib/errors';
import type { TeamModel } from '@/lib/tenant/data';

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  invite: vi.fn(),
  remove: vi.fn(),
  withdraw: vi.fn(),
  role: vi.fn(),
  resend: vi.fn(),
  read: vi.fn(),
  revalidate: vi.fn(),
}));
vi.mock('@/lib/auth/resolve', () => ({ currentSession: mocks.session }));
vi.mock('@/modules/membership', () => ({
  inviteMember: mocks.invite,
  removeMember: mocks.remove,
  revokeInvitation: mocks.withdraw,
  changeMemberRole: mocks.role,
  resendInvitation: mocks.resend,
}));
vi.mock('@/lib/tenant/live', () => ({ getLiveTeam: mocks.read, getLiveTenantAiRules: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidate }));
import {
  updateMemberRole,
  removeMember,
  revokeInvitation,
  resendTeamInvitation,
  sendInvitation,
} from '@/app/(tenant)/app/actions';

const model: TeamModel = {
  members: [],
  invitations: [],
  seatsUsed: 1,
  seatsLimit: 4,
  readAt: '2026-10-08T15:00:00.000Z',
};
beforeEach(() => {
  vi.resetAllMocks();
  mocks.session.mockResolvedValue({ tenantId: 'test-workspace', requestId: 'test-request' });
  mocks.read.mockResolvedValue(model);
  mocks.invite.mockResolvedValue({ delivery: { sent: true } });
  mocks.resend.mockResolvedValue({ delivery: { sent: true } });
});

describe('confirmed team action outcomes', () => {
  it('returns fresh team and capacity data for role, remove, withdraw and renewal', async () => {
    for (const result of [
      await updateMemberRole('member', 'agent'),
      await removeMember('member'),
      await revokeInvitation('invitation'),
      await resendTeamInvitation('invitation'),
    ])
      expect(result).toEqual({ ok: true, team: model });
    expect(mocks.read).toHaveBeenCalledTimes(4);
    expect(mocks.revalidate).toHaveBeenCalledWith('/app/settings/audit');
  });
  it('retains a committed outcome if the subsequent data read fails', async () => {
    mocks.read.mockRejectedValueOnce(new Error('Verification readback unavailable'));
    expect(await removeMember('member')).toMatchObject({
      ok: true,
      refreshRequired: true,
      notice: 'The change was saved. Reload this page to confirm the latest team details.',
    });
    expect(mocks.remove).toHaveBeenCalledTimes(1);
  });
  it('retains a committed outcome if cache revalidation fails', async () => {
    mocks.revalidate.mockImplementationOnce(() => {
      throw new Error('Verification cache unavailable');
    });
    expect(await revokeInvitation('invitation')).toMatchObject({ ok: true, refreshRequired: true });
    expect(mocks.withdraw).toHaveBeenCalledTimes(1);
  });
  it('keeps delivery failure distinct from invitation creation failure', async () => {
    mocks.invite.mockResolvedValueOnce({ token: 'test-link-only', delivery: { sent: false } });
    const result = await sendInvitation({ email: 'teammate@example.invalid', role: 'agent' });
    expect(result).toMatchObject({ ok: true, team: model });
    if (result.ok) expect(result.notice).toContain('/invite/test-link-only');
    expect(mocks.invite).toHaveBeenCalledTimes(1);
  });
  it('returns a refused write without a success model or follow-up read', async () => {
    mocks.role.mockRejectedValueOnce(new AppError(ERROR_CODES.ROLE_NOT_PERMITTED));
    expect(await updateMemberRole('member', 'admin')).toMatchObject({ ok: false });
    expect(mocks.read).not.toHaveBeenCalled();
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
});
