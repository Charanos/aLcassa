import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/v1/auth/google/route';
import { GET } from '@/app/api/v1/auth/callback/route';

const mocks = vi.hoisted(() => ({
  available: vi.fn(),
  client: vi.fn(),
  begin:
    vi.fn<
      (input: {
        provider: string;
        options: { redirectTo: string };
      }) => Promise<{ data: { url: string }; error: null }>
    >(),
  exchange: vi.fn(),
  admin: vi.fn(),
  memberships: vi.fn(),
  session: vi.fn(),
  invitation: vi.fn(),
}));
vi.mock('@/modules/membership', () => ({ readInvitationByToken: mocks.invitation }));
vi.mock('@/lib/auth/providerAvailability', () => ({ googleAvailability: mocks.available }));
vi.mock('@/lib/auth/supabase/server', () => ({ createSupabaseServerClient: mocks.client }));
vi.mock('@/lib/auth/resolve', () => ({
  isPlatformAdmin: mocks.admin,
  membershipsFor: mocks.memberships,
}));
vi.mock('@/lib/auth/session', () => ({
  createSession: mocks.session,
  cookieNameFor: (kind: string) => `session-${kind}`,
  sessionCookieOptions: () => ({ httpOnly: true, path: '/' }),
}));
vi.mock('@/lib/http/rateLimit', () => ({ enforceRateLimit: vi.fn(), RATE_LIMITS: { signIn: {} } }));
beforeEach(() => {
  vi.resetAllMocks();
  mocks.available.mockResolvedValue('enabled');
  mocks.client.mockResolvedValue({
    auth: { signInWithOAuth: mocks.begin, exchangeCodeForSession: mocks.exchange },
  });
  mocks.begin.mockResolvedValue({
    data: { url: 'https://accounts.google.com/oauth' },
    error: null,
  });
  mocks.exchange.mockResolvedValue({
    data: {
      user: { id: 'owned-user', email: 'owned@example.invalid', email_confirmed_at: '2026-10-10' },
    },
    error: null,
  });
  mocks.admin.mockResolvedValue(false);
  mocks.invitation.mockResolvedValue(null);
  mocks.memberships.mockResolvedValue([
    { tenantId: 'owned-tenant', status: 'active', role: 'owner' },
  ]);
  mocks.session.mockResolvedValue({ id: 'owned-session', expiresAt: new Date('2026-10-11') });
});

const origin = 'http://127.0.0.1:3100';
function begin(next: string) {
  return POST(
    new NextRequest(`${origin}/api/v1/auth/google`, {
      method: 'POST',
      headers: {
        host: '127.0.0.1:3100',
        origin,
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ next }).toString(),
    }),
  );
}
function callback(next: string, code = 'test-code') {
  const url = new URL('/api/v1/auth/callback', origin);
  url.searchParams.set('next', next);
  if (code) url.searchParams.set('code', code);
  return GET(new NextRequest(url, { headers: { host: '127.0.0.1:3100' } }));
}

describe('OAuth availability and safe navigation contracts', () => {
  it.each(['access_denied', '<script>private provider detail</script>'])(
    'refuses provider error %s before exchange and returns only approved recovery copy',
    async (error) => {
      const url = new URL('/api/v1/auth/callback', origin);
      url.searchParams.set('error', error);
      url.searchParams.set('code', 'must-not-be-exchanged');
      url.searchParams.set('next', '/app/settings/company');
      const response = await GET(new NextRequest(url));
      const destination = new URL(response.headers.get('location')!);
      expect(destination.searchParams.get('error')).toBe('auth.sign_in_incomplete');
      expect(destination.searchParams.get('next')).toBe('/app/settings/company');
      expect(destination.href).not.toContain('private');
      expect(mocks.client).not.toHaveBeenCalled();
      expect(mocks.session).not.toHaveBeenCalled();
      expect(response.headers.get('set-cookie')).toBeNull();
    },
  );
  it('returns a verified colleague to their matching pending invitation without a workspace session', async () => {
    mocks.memberships.mockResolvedValue([]);
    mocks.invitation.mockResolvedValue({ state: 'pending', invitedEmail: 'OWNED@example.invalid' });
    const response = await callback('/invite/owned-test-token');
    expect(response.headers.get('location')).toBe(`${origin}/invite/owned-test-token`);
    expect(mocks.session).not.toHaveBeenCalled();
  });
  it.each(['missing', 'expired', 'accepted', 'wrong-account'])(
    'refuses a %s Google invitation continuation without redirecting to workspace creation',
    async (state) => {
      mocks.memberships.mockResolvedValue([]);
      mocks.invitation.mockResolvedValue(
        state === 'missing'
          ? null
          : {
              state: state === 'wrong-account' ? 'pending' : state,
              invitedEmail:
                state === 'wrong-account' ? 'different@example.invalid' : 'owned@example.invalid',
            },
      );
      const response = await callback('/invite/owned-test-token');
      expect(new URL(response.headers.get('location')!).pathname).toBe('/sign-in');
      expect(mocks.session).not.toHaveBeenCalled();
    },
  );
  it.each([null, 'https://outside.example'])(
    'refuses initiation from origin %s before provider access',
    async (originHeader) => {
      const response = await POST(
        new NextRequest(`${origin}/api/v1/auth/google`, {
          method: 'POST',
          headers: { host: '127.0.0.1:3100', ...(originHeader ? { origin: originHeader } : {}) },
        }),
      );
      expect(new URL(response.headers.get('location')!).pathname).toBe('/sign-in');
      expect(mocks.available).not.toHaveBeenCalled();
      expect(mocks.client).not.toHaveBeenCalled();
    },
  );
  it('sends a genuinely new verified identity to workspace setup without an application session', async () => {
    mocks.memberships.mockResolvedValue([]);
    const response = await callback('/app');
    expect(response.headers.get('location')).toBe(`${origin}/sign-up/finish`);
    expect(mocks.session).not.toHaveBeenCalled();
  });
  it.each(['suspended', 'invited'])(
    'does not create a workspace for an existing %s colleague',
    async (status) => {
      mocks.memberships.mockResolvedValue([{ tenantId: 'owned-tenant', status, role: 'agent' }]);
      const response = await callback('/app');
      expect(new URL(response.headers.get('location')!).pathname).toBe('/sign-in');
      expect(mocks.session).not.toHaveBeenCalled();
    },
  );
  it.each(['disabled', 'unavailable'])(
    'refuses a direct %s provider request before client creation',
    async (state) => {
      mocks.available.mockResolvedValue(state);
      const response = await begin('/app/settings/team?filter=active');
      const destination = new URL(response.headers.get('location')!);
      expect(response.status).toBe(303);
      expect(destination.origin).toBe(origin);
      expect(destination.pathname).toBe('/sign-in');
      expect(destination.searchParams.get('next')).toBe('/app/settings/team?filter=active');
      expect(mocks.client).not.toHaveBeenCalled();
      expect(response.headers.get('set-cookie')).toBeNull();
    },
  );
  it.each([
    ['/app/settings/team?filter=active', '/app/settings/team?filter=active'],
    ['https://outside.example', '/app'],
    ['//outside.example', '/app'],
  ])('passes only a safe continuation for %s', async (next, expected) => {
    const response = await begin(next);
    expect(response.status).toBe(303);
    const options = mocks.begin.mock.calls[0]?.[0].options;
    if (!options) throw new Error('Google initiation did not supply callback options.');
    const redirect = new URL(options.redirectTo);
    expect(redirect.origin).toBe(origin);
    expect(redirect.pathname).toBe('/api/v1/auth/callback');
    expect(redirect.searchParams.get('next')).toBe(expected);
  });
  it.each([
    ['/platform/tenants?view=grid', '/platform/tenants?view=grid'],
    ['/app/settings/team', '/platform'],
    ['https://outside.example', '/platform'],
  ])('resumes a platform destination safely for %s', async (next, expected) => {
    mocks.admin.mockResolvedValue(true);
    const response = await callback(next);
    expect(response.headers.get('location')).toBe(`${origin}${expected}`);
  });
  it('preserves the intended workspace page and query after a successful exchange', async () => {
    const response = await callback('/app/settings/team?filter=active');
    expect(response.headers.get('location')).toBe(`${origin}/app/settings/team?filter=active`);
    expect(mocks.session).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'owned-tenant', kind: 'tenant' }),
    );
  });
  it.each(['missing', 'refused', 'unverified'])(
    'retains safe continuation without opening a session for %s exchange',
    async (state) => {
      if (state === 'refused')
        mocks.exchange.mockResolvedValue({ data: { user: null }, error: { code: 'expired' } });
      if (state === 'unverified')
        mocks.exchange.mockResolvedValue({ data: { user: { id: 'owned-user' } }, error: null });
      const response = await callback(
        '/app/settings/team?filter=active',
        state === 'missing' ? '' : 'test-code',
      );
      const destination = new URL(response.headers.get('location')!);
      expect(destination.pathname).toBe('/sign-in');
      expect(destination.searchParams.get('next')).toBe('/app/settings/team?filter=active');
      expect(mocks.session).not.toHaveBeenCalled();
      expect(response.headers.get('set-cookie')).toBeNull();
    },
  );
});
