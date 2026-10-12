import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/v1/auth/sign-in/route';

const provider = vi.hoisted(() => ({
  client: vi.fn(),
  signIn: vi.fn(),
  admin: vi.fn(),
  session: vi.fn(),
}));
vi.mock('@/lib/auth/supabase/server', () => ({ createSupabaseServerClient: provider.client }));
vi.mock('@/lib/auth/resolve', () => ({ isPlatformAdmin: provider.admin, membershipsFor: vi.fn() }));
vi.mock('@/lib/auth/provisionedOwner', () => ({ activateProvisionedOwner: vi.fn() }));
vi.mock('@/lib/auth/session', () => ({
  cookieNameFor: (kind: string) => `session-${kind}`,
  createSession: provider.session,
  sessionCookieOptions: () => ({ httpOnly: true, path: '/' }),
}));
vi.mock('@/lib/http/rateLimit', () => ({ enforceRateLimit: vi.fn(), RATE_LIMITS: { signIn: {} } }));
beforeEach(() => {
  vi.clearAllMocks();
  provider.client.mockResolvedValue({ auth: { signInWithPassword: provider.signIn } });
  provider.signIn.mockResolvedValue({
    data: { user: null },
    error: { status: 400, message: 'Invalid login credentials' },
  });
});
describe('Sign-in refusal continuation', () => {
  it.each([
    {
      name: 'incorrect credentials',
      email: 'test@example.invalid',
      next: '/app/settings/team?filter=active',
      expected: '/app/settings/team?filter=active',
      calls: 1,
    },
    {
      name: 'invalid email',
      email: 'invalid-email',
      next: '/app/settings/team?filter=active',
      expected: '/app/settings/team?filter=active',
      calls: 0,
    },
    {
      name: 'external continuation',
      email: 'test@example.invalid',
      next: 'https://outside.example',
      expected: '/app',
      calls: 1,
    },
  ])('keeps $name on a safe local return path', async ({ email, next, expected, calls }) => {
    const response = await POST(
      new NextRequest('http://127.0.0.1:3100/api/v1/auth/sign-in', {
        method: 'POST',
        headers: {
          host: '127.0.0.1:3100',
          origin: 'http://127.0.0.1:3100',
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ email, password: 'incorrect-test-password', next }).toString(),
      }),
    );
    const destination = new URL(response.headers.get('location')!);
    expect(response.status).toBe(303);
    expect(destination.origin).toBe('http://127.0.0.1:3100');
    expect(destination.pathname).toBe('/sign-in');
    expect(destination.searchParams.get('next')).toBe(expected);
    expect(provider.signIn).toHaveBeenCalledTimes(calls);
    expect(response.headers.get('set-cookie')).toBeNull();
  });
});

describe('Admin password sign-in destination', () => {
  it.each([
    ['/app', '/platform'],
    ['/app/settings/company', '/platform'],
    ['/platformish', '/platform'],
    ['/platform/../app', '/platform'],
    ['/platform/tenants?view=grid', '/platform/tenants?view=grid'],
  ])('opens the console after signing in from %s', async (next, expected) => {
    provider.signIn.mockResolvedValue({
      data: { user: { id: 'owned-admin', email_confirmed_at: '2026-10-12' } },
      error: null,
    });
    provider.admin.mockResolvedValue(true);
    provider.session.mockResolvedValue({
      id: 'owned-platform-session',
      expiresAt: new Date('2026-10-13'),
    });
    const response = await POST(
      new NextRequest('http://127.0.0.1:3100/api/v1/auth/sign-in', {
        method: 'POST',
        headers: {
          host: '127.0.0.1:3100',
          origin: 'http://127.0.0.1:3100',
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          email: 'admin@example.invalid',
          password: 'owned-test-password',
          next,
        }),
      }),
    );
    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe(`http://127.0.0.1:3100${expected}`);
    expect(provider.session).toHaveBeenCalledWith(expect.objectContaining({ kind: 'platform' }));
    expect(response.cookies.get('session-platform')?.value).toBe('owned-platform-session');
    expect(response.cookies.get('session-tenant')).toBeUndefined();
  });
});
