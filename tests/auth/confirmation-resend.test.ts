import { NextRequest } from 'next/server';
import { beforeEach, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/v1/auth/verify-email/resend/route';
const mock = vi.hoisted(() => ({ resend: vi.fn(), invitation: vi.fn() }));
vi.mock('@/lib/auth/supabase/server', () => ({
  createSupabaseServerClient: () => Promise.resolve({ auth: { resend: mock.resend } }),
}));
vi.mock('@/modules/membership', () => ({ readInvitationByToken: mock.invitation }));
vi.mock('@/lib/http/rateLimit', () => ({
  enforceRateLimit: vi.fn(),
  RATE_LIMITS: { verifyEmailResend: {} },
}));
const token = 'owned-confirmation-invitation-token';
beforeEach(() => {
  vi.resetAllMocks();
  mock.resend.mockResolvedValue({ error: null });
  mock.invitation.mockResolvedValue({
    state: 'pending',
    invitedEmail: 'colleague@example.invalid',
  });
});
const request = (body: Record<string, string>, origin = 'http://localhost:3100') =>
  new NextRequest('http://localhost:3100/api/v1/auth/verify-email/resend', {
    method: 'POST',
    headers: { origin, 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body),
  });
it('resends only to the invitation address and retains its verified callback', async () => {
  const response = await POST(
    request({ invitationToken: token, email: 'substituted@example.invalid' }),
  );
  expect(response.status).toBe(303);
  expect(response.headers.get('location')).toBe(
    `http://localhost:3100/invite/${token}?confirmation=sent`,
  );
  expect(mock.resend).toHaveBeenCalledWith({
    type: 'signup',
    email: 'colleague@example.invalid',
    options: {
      emailRedirectTo: `http://localhost:3100/api/v1/auth/callback?next=%2Finvite%2F${token}`,
    },
  });
});
it.each(['expired', 'revoked', 'accepted'])('does not send for a %s invitation', async (state) => {
  mock.invitation.mockResolvedValue({ state, invitedEmail: 'colleague@example.invalid' });
  await POST(request({ invitationToken: token }));
  expect(mock.resend).not.toHaveBeenCalled();
});
it('refuses cross-origin mail requests before provider access', async () => {
  await POST(request({ email: 'colleague@example.invalid' }, 'https://outside.example'));
  expect(mock.resend).not.toHaveBeenCalled();
});
it('returns the same acknowledgement for provider refusal and success', async () => {
  const successful = await POST(request({ email: 'colleague@example.invalid' }));
  mock.resend.mockResolvedValue({ error: { code: 'email_not_found' } });
  const refused = await POST(request({ email: 'colleague@example.invalid' }));
  expect(refused.status).toBe(successful.status);
  expect(refused.headers.get('location')).toBe(successful.headers.get('location'));
});
