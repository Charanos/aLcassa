import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/v1/auth/sign-in/route';

const provider = vi.hoisted(() => ({ client: vi.fn(), signIn: vi.fn() }));
vi.mock('@/lib/auth/supabase/server', () => ({ createSupabaseServerClient: provider.client }));
vi.mock('@/lib/auth/resolve', () => ({ isPlatformAdmin: vi.fn(), membershipsFor: vi.fn() }));
vi.mock('@/lib/auth/provisionedOwner', () => ({ activateProvisionedOwner: vi.fn() }));
vi.mock('@/lib/auth/session', () => ({
  cookieNameFor: vi.fn(),
  createSession: vi.fn(),
  sessionCookieOptions: vi.fn(),
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
