import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/v1/auth/email/confirm/route';
import { authEmailRedirect } from '@/lib/auth/emailLink';

const provider = vi.hoisted(() => ({ client: vi.fn() }));
vi.mock('@/lib/auth/supabase/server', () => ({ createSupabaseServerClient: provider.client }));
vi.mock('@/lib/http/rateLimit', () => ({
  enforceRateLimit: () => Promise.resolve(),
  RATE_LIMITS: { passwordReset: {} },
}));
vi.mock('@/lib/auth/session', () => ({
  cookieNameFor: (kind: string) => `session-${kind}`,
  createSession: vi.fn(),
}));
beforeEach(() => {
  vi.resetAllMocks();
  vi.unstubAllEnvs();
});
afterEach(() => vi.unstubAllEnvs());

describe('Email confirmation refusals before provider access', () => {
  it.each([
    {
      name: 'cross-origin submission',
      origin: 'https://untrusted.example',
      body: { proof: 'code', purpose: 'recovery', code: 'held-code' },
    },
    {
      name: 'missing origin',
      origin: undefined,
      body: { proof: 'code', purpose: 'recovery', code: 'held-code' },
    },
    {
      name: 'opaque origin',
      origin: 'null',
      body: { proof: 'code', purpose: 'recovery', code: 'held-code' },
    },
    {
      name: 'unsupported purpose',
      origin: 'http://localhost:3100',
      body: { proof: 'code', purpose: 'admin', code: 'held-code' },
    },
    {
      name: 'combined proofs',
      origin: 'http://localhost:3100',
      body: { proof: 'code', purpose: 'invite', code: 'held-code', tokenHash: 'held-hash' },
    },
    {
      name: 'missing refresh proof',
      origin: 'http://localhost:3100',
      body: { proof: 'session', purpose: 'invite', accessToken: 'held-access' },
    },
  ])('refuses $name without touching Auth', async ({ origin, body }) => {
    const request = new NextRequest('http://localhost:3100/api/v1/auth/email/confirm', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(origin ? { origin } : {}) },
      body: JSON.stringify(body),
    });
    const response = await POST(request);
    expect(provider.client).not.toHaveBeenCalled();
    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toContain('error=link_unavailable');
    expect(response.headers.get('location')).not.toContain('held-');
  });
  it('uses the production domain instead of a retained local-development URL', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000');
    vi.stubEnv('VERCEL_ENV', 'production');
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', 'a-lcassa.vercel.app');
    expect(authEmailRedirect('invite')).toBe(
      'https://a-lcassa.vercel.app/auth/confirm?type=invite',
    );
  });
  it('refuses a malformed configured destination', () => {
    vi.stubEnv('VERCEL_ENV', 'development');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://account:password@example.test');
    expect(() => authEmailRedirect('recovery')).toThrow();
  });
});
