import { beforeEach, expect, it, vi } from 'vitest';
import { AppError, ERROR_CODES } from '@/lib/errors';
const mock = vi.hoisted(() => ({ ctx: vi.fn(), end: vi.fn(), read: vi.fn(), revalidate: vi.fn() }));
vi.mock('@/lib/auth/resolve', () => ({ currentSession: mock.ctx }));
vi.mock('@/modules/identity', () => ({
  endOwnSessions: mock.end,
  updateOwnProfile: vi.fn(),
  endSupportVisit: vi.fn(),
}));
vi.mock('@/lib/tenant/live', () => ({
  getLiveAccountSessions: mock.read,
  getLiveTeam: vi.fn(),
  getLiveTenantAiRules: vi.fn(),
}));
vi.mock('next/cache', () => ({ revalidatePath: mock.revalidate }));
import { revokeSession } from '@/app/(tenant)/app/actions';
const context = { sessionId: 'current', requestId: 'session-test' };
const sessions = [
  {
    id: 'current',
    current: true,
    device: 'Test browser',
    location: 'Address unavailable',
    lastActive: 'Just now',
  },
];
beforeEach(() => {
  vi.resetAllMocks();
  mock.ctx.mockResolvedValue(context);
  mock.end.mockResolvedValue({ count: 2 });
  mock.read.mockResolvedValue({ sessions });
});
it('bulk calls the shared bulk contract and returns confirmed devices', async () => {
  expect(await revokeSession('all')).toEqual({ ok: true, notice: '2 sessions ended.', sessions });
  expect(mock.end).toHaveBeenCalledWith(context, 'all');
});
it('refuses ending the current browser through the device-list action', async () => {
  expect(await revokeSession('current')).toMatchObject({ ok: false });
  expect(mock.end).not.toHaveBeenCalled();
});
it('returns a refused mutation without a follow-up read', async () => {
  mock.end.mockRejectedValue(new AppError(ERROR_CODES.NOT_FOUND));
  expect(await revokeSession('missing')).toMatchObject({ ok: false });
  expect(mock.read).not.toHaveBeenCalled();
});
it('does not report a committed session change as failed when readback is unavailable', async () => {
  mock.read.mockRejectedValue(Error('Read unavailable'));
  expect(await revokeSession('all')).toMatchObject({ ok: true, refreshRequired: true });
  expect(mock.end).toHaveBeenCalledTimes(1);
});
it('does not report a committed session change as failed when revalidation fails', async () => {
  mock.revalidate.mockImplementation(() => {
    throw Error('Cache unavailable');
  });
  expect(await revokeSession('all')).toMatchObject({ ok: true, refreshRequired: true });
});
