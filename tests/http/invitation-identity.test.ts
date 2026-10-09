import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mock = vi.hoisted(() => ({
  getUser: vi.fn(),
  signUp: vi.fn(),
  signIn: vi.fn(),
  read: vi.fn(),
  accept: vi.fn(),
  create: vi.fn(),
}));
vi.mock('@/lib/auth/supabase/server', () => ({
  createSupabaseServerClient: () =>
    Promise.resolve({
      auth: { getUser: mock.getUser, signUp: mock.signUp, signInWithPassword: mock.signIn },
    }),
}));
vi.mock('@/lib/auth/resolve', () => ({
  isPlatformAdmin: () => Promise.resolve(false),
  membershipsFor: () => Promise.resolve([]),
}));
vi.mock('@/lib/auth/provisionedOwner', () => ({ activateProvisionedOwner: vi.fn() }));
vi.mock('@/modules/membership', () => ({
  readInvitationByToken: mock.read,
  acceptInvitationByToken: mock.accept,
}));
vi.mock('@/lib/auth/session', () => ({
  createSession: mock.create,
  cookieNameFor: () => 'test_session',
  sessionCookieOptions: () => ({ path: '/' }),
}));
vi.mock('@/lib/http/rateLimit', () => ({
  enforceRateLimit: vi.fn(),
  RATE_LIMITS: { signIn: {}, invitationAccept: {} },
}));
import { POST as accept } from '@/app/api/v1/invitations/accept/[token]/route';
import { POST as signIn } from '@/app/api/v1/auth/sign-in/route';
const user = {
  id: 'owned-identity',
  email: 'colleague@example.invalid',
  email_confirmed_at: '2026-10-09T00:00:00Z',
  user_metadata: { full_name: 'Colleague' },
};
beforeEach(() => {
  vi.resetAllMocks();
  mock.getUser.mockResolvedValue({ data: { user }, error: null });
  mock.signIn.mockResolvedValue({ data: { user }, error: null });
  mock.read.mockResolvedValue({ state: 'pending', invitedEmail: user.email });
  mock.accept.mockResolvedValue({ tenantId: 'owned-workspace', role: 'agent' });
  mock.create.mockResolvedValue({ id: 'owned-session', expiresAt: new Date(Date.now() + 60000) });
});
const invitationRequest = () =>
  accept(
    new NextRequest('http://localhost:3100/api/v1/invitations/accept/owned-token', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ fullName: 'Colleague', password: 'owned-test-password-12' }),
    }),
    { params: Promise.resolve({ token: 'owned-token' }) },
  );
function noAuthority() {
  expect(mock.accept).not.toHaveBeenCalled();
  expect(mock.create).not.toHaveBeenCalled();
}
it('refuses failed provider identity reads without creating account or membership', async () => {
  mock.getUser.mockResolvedValue({
    data: { user: null },
    error: { name: 'AuthRetryableFetchError' },
  });
  expect((await invitationRequest()).status).toBe(503);
  noAuthority();
  expect(mock.signUp).not.toHaveBeenCalled();
});
it('refuses unconfirmed signed-in identities', async () => {
  mock.getUser.mockResolvedValue({
    data: { user: { ...user, email_confirmed_at: null } },
    error: null,
  });
  expect((await invitationRequest()).status).toBe(403);
  noAuthority();
});
it('refuses an invitation addressed to a different signed-in identity', async () => {
  mock.read.mockResolvedValue({ state: 'pending', invitedEmail: 'other@example.invalid' });
  expect((await invitationRequest()).status).toBe(403);
  noAuthority();
});
it('keeps an invitation unconsumed when signup needs email confirmation', async () => {
  mock.getUser.mockResolvedValue({
    data: { user: null },
    error: { name: 'AuthSessionMissingError' },
  });
  mock.signUp.mockResolvedValue({
    data: { user: { ...user, email_confirmed_at: null }, session: null },
    error: null,
  });
  expect((await invitationRequest()).status).toBe(403);
  noAuthority();
});
it('accepts a confirmed matching identity and opens only the accepted workspace', async () => {
  expect((await invitationRequest()).status).toBe(200);
  expect(mock.accept).toHaveBeenCalledWith(
    'owned-token',
    user.id,
    { fullName: 'Colleague', email: user.email },
    expect.any(String),
  );
  expect(mock.create).toHaveBeenCalledWith(
    expect.objectContaining({ userId: user.id, tenantId: 'owned-workspace', kind: 'tenant' }),
  );
});
const signInRequest = (next: string) =>
  signIn(
    new NextRequest('http://localhost:3100/api/v1/auth/sign-in', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: user.email, password: 'existing-password', next }),
    }),
  );
it('lets a confirmed account without a workspace return to its own pending invitation without app authority', async () => {
  const response = await signInRequest('/invite/owned-token');
  expect(response.status).toBe(200);
  expect((await response.json()).data).toMatchObject({
    door: 'invitation',
    destination: '/invite/owned-token',
  });
  expect(mock.create).not.toHaveBeenCalled();
});
it('refuses another recipients invitation as a no-workspace sign-in continuation', async () => {
  mock.read.mockResolvedValue({ state: 'pending', invitedEmail: 'other@example.invalid' });
  expect((await signInRequest('/invite/owned-token')).status).toBe(403);
  expect(mock.create).not.toHaveBeenCalled();
});
it('does not grant a session for unrelated or external no-workspace continuations', async () => {
  for (const next of ['/app', 'https://outside.example'])
    expect((await signInRequest(next)).status).toBe(403);
  expect(mock.read).not.toHaveBeenCalled();
  expect(mock.create).not.toHaveBeenCalled();
});
