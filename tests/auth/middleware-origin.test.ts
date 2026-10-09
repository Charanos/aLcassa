import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { middleware } from '@/middleware';

const refresh = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock('@/lib/auth/supabase/middleware', () => ({ refreshSupabaseSession: refresh }));
beforeEach(() => vi.clearAllMocks());

describe('Protected navigation origins', () => {
  it('overwrites a forged return header with the actual protected path and query', async () => {
    const response = await middleware(
      new NextRequest('http://127.0.0.1:3100/app/settings/team?filter=active', {
        headers: {
          host: '127.0.0.1:3100',
          cookie: `${process.env.SESSION_COOKIE_TENANT ?? 'aLcassa_tenant_session'}=unresolved-session`,
          'x-auth-return-path': 'https://outside.example',
        },
      }),
    );
    expect(response.headers.get('x-middleware-request-x-auth-return-path')).toBe(
      '/app/settings/team?filter=active',
    );
    expect(response.headers.get('content-security-policy')).toContain("form-action 'self'");
  });
  it.each([
    ['127.0.0.1:3100', '/app/settings/team?filter=active'],
    ['[::1]:3100', '/platform/tenants?view=grid'],
    ['localhost:3100', '/app/settings/audit'],
  ])('returns an unauthenticated %s request to its own sign-in', async (host, path) => {
    const response = await middleware(
      new NextRequest(`http://${host}${path}`, { headers: { host } }),
    );
    const destination = new URL(response.headers.get('location')!);
    expect(response.status).toBe(307);
    expect(destination.origin).toBe(`http://${host}`);
    expect(destination.pathname).toBe('/sign-in');
    expect(destination.searchParams.get('next')).toBe(path);
    expect(refresh).not.toHaveBeenCalled();
    expect(response.headers.get('set-cookie')).toBeNull();
  });
});
