import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError, ERROR_CODES } from '@/lib/errors';
import type { TenantRulesModel } from '@/lib/tenant/data';

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  publish: vi.fn(),
  restore: vi.fn(),
  read: vi.fn(),
  revalidate: vi.fn(),
}));
vi.mock('@/lib/auth/resolve', () => ({ currentSession: mocks.session }));
vi.mock('@/modules/aiRules', () => ({
  publishTenantRules: mocks.publish,
  restoreTenantRules: mocks.restore,
}));
vi.mock('@/lib/tenant/live', () => ({ getLiveTenantAiRules: mocks.read }));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidate }));
import { publishAiRules, restoreAiRules, refreshAiRules } from '@/app/(tenant)/app/actions';

const model: TenantRulesModel = {
  fields: [],
  currentVersion: 4,
  versions: [],
  versionsRetained: 2,
  versionsLimit: 10,
  revision: null,
  canWrite: true,
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.session.mockResolvedValue({ tenantId: 'recorded-workspace' });
  mocks.publish.mockResolvedValue({ versionNumber: 4 });
  mocks.restore.mockResolvedValue({ versionNumber: 4 });
  mocks.read.mockResolvedValue(model);
});

describe('confirmed instruction action results', () => {
  it('reviews the authorized live model without publishing, restoring or invalidating data', async () => {
    expect(await refreshAiRules()).toEqual({ ok: true, model });
    expect(mocks.read).toHaveBeenCalledWith({ tenantId: 'recorded-workspace' });
    expect(mocks.publish).not.toHaveBeenCalled();
    expect(mocks.restore).not.toHaveBeenCalled();
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
  it('does not treat missing published guidance as a successful review', async () => {
    mocks.read.mockResolvedValueOnce({ ...model, unavailable: true });
    expect(await refreshAiRules()).toMatchObject({ ok: false });
    expect(mocks.publish).not.toHaveBeenCalled();
  });
  it('returns the fresh recorded model after publication and restoration instead of relying on route cache refresh', async () => {
    expect(await publishAiRules({ changeNote: 'Verified publication' })).toEqual({
      ok: true,
      model,
    });
    expect(await restoreAiRules({ changeNote: 'Verified restoration' })).toEqual({
      ok: true,
      model,
    });
    expect(mocks.read).toHaveBeenCalledTimes(2);
    expect(mocks.read).toHaveBeenCalledWith({ tenantId: 'recorded-workspace' });
    expect(mocks.revalidate).toHaveBeenCalledWith('/app/settings/audit');
  });
  it('reports a committed write whose readback failed without claiming it was not saved or encouraging duplicate publication', async () => {
    mocks.read.mockRejectedValue(new Error('Readback unavailable'));
    const result = await publishAiRules({});
    expect(result).toEqual({
      ok: false,
      requiresReload: true,
      error:
        'The change was saved, but the live instructions could not be reloaded. Reload the version history before making another change.',
    });
    expect(mocks.publish).toHaveBeenCalledTimes(1);
  });
  it('returns a stale refusal without a success model or confirmation read', async () => {
    mocks.publish.mockRejectedValue(new AppError(ERROR_CODES.RULES_VERSION_CONFLICT));
    expect(await publishAiRules({})).toMatchObject({ ok: false, requiresReload: true });
    expect(mocks.read).not.toHaveBeenCalled();
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
});
