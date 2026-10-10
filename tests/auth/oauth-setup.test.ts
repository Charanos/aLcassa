import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/v1/auth/sign-up/finish/route';

const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  finish: vi.fn(),
  session: vi.fn(),
  admin: vi.fn(),
}));
vi.mock('@/lib/auth/supabase/server', () => ({
  createSupabaseServerClient: () => Promise.resolve({ auth: { getUser: mocks.user } }),
}));
vi.mock('@/lib/auth/resolve', () => ({ isPlatformAdmin: mocks.admin }));
vi.mock('@/lib/auth/session', () => ({
  createSession: mocks.session,
  cookieNameFor: () => 'owned-session',
  sessionCookieOptions: () => ({ httpOnly: true, path: '/' }),
}));
vi.mock('@/lib/http/rateLimit', () => ({ enforceRateLimit: vi.fn(), RATE_LIMITS: { signUp: {} } }));
vi.mock('@/modules/platform', async () => {
  const { z } = await import('zod');
  return {
    finishOAuthSignUp: mocks.finish,
    finishOAuthSignUpSchema: z.object({ companyName: z.string().trim().min(1) }),
  };
});
beforeEach(() => {
  vi.resetAllMocks();
  mocks.user.mockResolvedValue({
    data: {
      user: { id: 'owned-user', email: 'test@example.invalid', email_confirmed_at: '2026-10-10' },
    },
    error: null,
  });
  mocks.admin.mockResolvedValue(false);
  mocks.finish.mockResolvedValue({
    ok: true,
    tenantId: 'owned-tenant',
    slug: 'owned-workspace',
    role: 'owner',
    created: true,
  });
  mocks.session.mockResolvedValue({ id: 'test-session', expiresAt: new Date('2026-10-11') });
});
const origin = 'http://127.0.0.1:3100';
function submit(companyName = 'Owned workspace') {
  return POST(
    new NextRequest(`${origin}/api/v1/auth/sign-up/finish`, {
      method: 'POST',
      headers: {
        host: '127.0.0.1:3100',
        origin,
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ companyName }),
    }),
  );
}
describe('OAuth setup identity and session contracts', () => {
  it.each([null, 'https://outside.example'])(
    'refuses setup from origin %s before identity or business writes',
    async (originHeader) => {
      await POST(
        new NextRequest(`${origin}/api/v1/auth/sign-up/finish`, {
          method: 'POST',
          headers: { host: '127.0.0.1:3100', ...(originHeader ? { origin: originHeader } : {}) },
        }),
      );
      expect(mocks.user).not.toHaveBeenCalled();
      expect(mocks.finish).not.toHaveBeenCalled();
      expect(mocks.session).not.toHaveBeenCalled();
    },
  );
  it.each(['missing', 'unverified', 'email-less', 'provider-error', 'platform'])(
    'refuses %s identity before business writes or session creation',
    async (state) => {
      if (state === 'missing') mocks.user.mockResolvedValue({ data: { user: null }, error: null });
      if (state === 'unverified')
        mocks.user.mockResolvedValue({
          data: { user: { id: 'owned-user', email: 'test@example.invalid' } },
          error: null,
        });
      if (state === 'email-less')
        mocks.user.mockResolvedValue({
          data: { user: { id: 'owned-user', email_confirmed_at: '2026-10-10' } },
          error: null,
        });
      if (state === 'provider-error')
        mocks.user.mockResolvedValue({ data: { user: null }, error: { code: 'unavailable' } });
      if (state === 'platform') mocks.admin.mockResolvedValue(true);
      const response = await submit();
      expect(new URL(response.headers.get('location')!).pathname).toBe('/sign-in');
      expect(mocks.finish).not.toHaveBeenCalled();
      expect(mocks.session).not.toHaveBeenCalled();
      expect(response.headers.get('set-cookie')).toBeNull();
    },
  );
  it('creates the owner session only after successful verified setup', async () => {
    const response = await submit();
    expect(response.headers.get('location')).toBe(`${origin}/app`);
    expect(mocks.finish).toHaveBeenCalledWith(
      { companyName: 'Owned workspace' },
      expect.objectContaining({ userId: 'owned-user', email: 'test@example.invalid' }),
    );
    expect(mocks.session).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'owned-tenant', effectiveRole: 'owner' }),
    );
    expect(response.headers.get('set-cookie')).toContain('workspace_created');
  });
  it('resumes an existing agent without promoting their role or claiming a new workspace', async () => {
    mocks.finish.mockResolvedValue({
      ok: true,
      tenantId: 'owned-tenant',
      slug: 'owned-workspace',
      role: 'agent',
      created: false,
    });
    const response = await submit();
    expect(mocks.session).toHaveBeenCalledWith(expect.objectContaining({ effectiveRole: 'agent' }));
    expect(response.headers.get('set-cookie')).toContain('signed_in');
    expect(response.headers.get('set-cookie')).not.toContain('workspace_created');
  });
  it.each(['membership_unavailable', 'registration_failed'])(
    'does not issue a session when setup returns %s',
    async (code) => {
      mocks.finish.mockResolvedValue({ ok: false, code, message: 'Setup not completed.' });
      await submit();
      expect(mocks.session).not.toHaveBeenCalled();
    },
  );
});
