import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createResolvedContext } from '@/lib/db/context';

const mocks = vi.hoisted(() => ({
  resolve: vi.fn(),
  getUser: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  transfer: vi.fn(),
}));
vi.mock('@/lib/auth/resolve', () => ({ resolveSessionDoor: mocks.resolve }));
vi.mock('@/lib/auth/supabase/server', () => ({
  createSupabaseServerClient: () => Promise.resolve({ auth: { getUser: mocks.getUser } }),
}));
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ auth: { signInWithPassword: mocks.signIn, signOut: mocks.signOut } }),
}));
vi.mock('@/lib/auth/supabase/env', () => ({
  supabaseUrl: () => 'http://127.0.0.1:55421',
  supabasePublishableKey: () => 'verification-only',
}));
vi.mock('@/modules/membership', () => ({ transferOwnership: mocks.transfer }));
import { POST } from '@/app/api/v1/tenant/transfer-ownership/route';

const actor = randomUUID(),
  target = randomUUID(),
  tenant = randomUUID();
const context = (role: 'owner' | 'admin' = 'owner', supportMode = false) =>
  createResolvedContext({
    tenantId: tenant,
    actorId: actor,
    actorType: 'user',
    actorLabel: 'Ownership verification',
    role,
    supportMode,
    requestId: 'ownership-verification',
  });
const request = (body: unknown = { memberId: target, password: 'verification-only-password' }) =>
  new NextRequest('http://localhost:3100/api/v1/tenant/transfer-ownership', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'http://localhost:3100' },
    body: JSON.stringify(body),
  });
const segment = { params: Promise.resolve({}) };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.resolve.mockResolvedValue(context());
  mocks.getUser.mockResolvedValue({
    data: {
      user: {
        id: actor,
        email: 'owner@example.invalid',
        email_confirmed_at: '2026-10-08T00:00:00Z',
      },
    },
    error: null,
  });
  mocks.signIn.mockResolvedValue({ data: { user: { id: actor } }, error: null });
  mocks.signOut.mockResolvedValue({ error: null });
  mocks.transfer.mockResolvedValue({ previousOwnerId: actor, newOwnerId: target });
});
describe('Ownership reauthentication boundary', () => {
  it('ends only the temporary provider session before transferring ownership', async () => {
    const response = await POST(request(), segment);
    expect(response.status).toBe(200);
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(mocks.signOut.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.transfer.mock.invocationCallOrder[0]!,
    );
    expect((await response.json()) as unknown).toMatchObject({
      data: { yourRoleNow: 'admin', newOwnerMemberId: target },
    });
  });
  it('refuses a provider identity different from the resolved owner', async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { id: randomUUID(), email: 'other@example.invalid' } },
      error: null,
    });
    expect((await POST(request(), segment)).status).toBe(401);
    expect(mocks.signIn).not.toHaveBeenCalled();
    expect(mocks.transfer).not.toHaveBeenCalled();
  });
  it('refuses a failed current-identity read', async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Provider unavailable' },
    });
    expect((await POST(request(), segment)).status).toBe(401);
    expect(mocks.transfer).not.toHaveBeenCalled();
  });
  it('refuses an incorrect password before ownership changes', async () => {
    mocks.signIn.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid credentials', status: 400 },
    });
    expect((await POST(request(), segment)).status).toBe(401);
    expect(mocks.signOut).not.toHaveBeenCalled();
    expect(mocks.transfer).not.toHaveBeenCalled();
  });
  it('does not transfer if temporary session cleanup fails', async () => {
    mocks.signOut.mockResolvedValue({ error: { message: 'Provider unavailable' } });
    expect((await POST(request(), segment)).status).toBe(503);
    expect(mocks.transfer).not.toHaveBeenCalled();
  });
  it('refuses a password proof for a different provider identity and cleans up that session', async () => {
    mocks.signIn.mockResolvedValue({ data: { user: { id: randomUUID() } }, error: null });
    expect((await POST(request(), segment)).status).toBe(401);
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(mocks.transfer).not.toHaveBeenCalled();
  });
  it('refuses a missing password-proof identity rather than accepting an empty provider result', async () => {
    mocks.signIn.mockResolvedValue({ data: { user: null }, error: null });
    expect((await POST(request(), segment)).status).toBe(401);
    expect(mocks.transfer).not.toHaveBeenCalled();
  });
  it('distinguishes an unavailable password provider from a rejected password', async () => {
    mocks.signIn.mockResolvedValue({
      data: { user: null },
      error: { status: 503, message: 'Provider unavailable' },
    });
    expect((await POST(request(), segment)).status).toBe(503);
    expect(mocks.transfer).not.toHaveBeenCalled();
  });
  it('retains the provider lockout outcome instead of calling it an incorrect password', async () => {
    mocks.signIn.mockResolvedValue({
      data: { user: null },
      error: { status: 429, message: 'Rate limited' },
    });
    expect((await POST(request(), segment)).status).toBe(423);
    expect(mocks.transfer).not.toHaveBeenCalled();
  });
  it('refuses administrators before password verification', async () => {
    mocks.resolve.mockResolvedValue(context('admin'));
    expect((await POST(request(), segment)).status).toBe(403);
    expect(mocks.getUser).not.toHaveBeenCalled();
    expect(mocks.transfer).not.toHaveBeenCalled();
  });
  it('refuses support visits before password verification', async () => {
    mocks.resolve.mockResolvedValue(context('owner', true));
    expect((await POST(request(), segment)).status).toBe(403);
    expect(mocks.getUser).not.toHaveBeenCalled();
    expect(mocks.transfer).not.toHaveBeenCalled();
  });
  it('refuses invalid target identifiers before contacting the provider', async () => {
    expect(
      (await POST(request({ memberId: 'invalid', password: 'verification-only' }), segment)).status,
    ).toBe(422);
    expect(mocks.getUser).not.toHaveBeenCalled();
    expect(mocks.transfer).not.toHaveBeenCalled();
  });
});
