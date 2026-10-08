import { randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { requestOwnershipTransfer } from '@/lib/tenant/ownershipTransfer';

const target = randomUUID();
const confirmed = (memberId = target) => ({
  data: {
    previousOwnerId: randomUUID(),
    newOwnerId: randomUUID(),
    newOwnerMemberId: memberId,
    yourRoleNow: 'admin',
  },
});
const sender = (body: unknown, status = 200) =>
  vi.fn<typeof fetch>().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    }),
  );

describe('Ownership review request outcomes', () => {
  it('confirms only a receipt for the reviewed successor with the former owner demoted', async () => {
    const send = sender(confirmed());
    expect(await requestOwnershipTransfer(target, 'test-only', send)).toEqual({
      kind: 'confirmed',
    });
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0]![1]).toMatchObject({
      credentials: 'same-origin',
      redirect: 'error',
      cache: 'no-store',
    });
  });
  it('does not confirm a successful HTTP response with a different successor', async () => {
    expect(
      await requestOwnershipTransfer(target, 'test-only', sender(confirmed(randomUUID()))),
    ).toMatchObject({ kind: 'unconfirmed' });
  });
  it('does not confirm an unchanged owner or an unexpected role', async () => {
    const body = confirmed();
    body.data.newOwnerId = body.data.previousOwnerId;
    expect(await requestOwnershipTransfer(target, 'test-only', sender(body))).toMatchObject({
      kind: 'unconfirmed',
    });
    expect(
      await requestOwnershipTransfer(
        target,
        'test-only',
        sender({ data: { ...confirmed().data, yourRoleNow: 'owner' } }),
      ),
    ).toMatchObject({ kind: 'unconfirmed' });
  });
  it('identifies an incorrect password as a confirmed refusal that can be corrected', async () => {
    expect(
      await requestOwnershipTransfer(
        target,
        'test-only',
        sender(
          { error: { code: 'auth.invalid_credentials', message: 'That password is not correct.' } },
          401,
        ),
      ),
    ).toEqual({
      kind: 'refused',
      message: 'That password is not correct.',
      passwordError: true,
      reloadRequired: false,
    });
  });
  it('requires refreshed permissions for expired sessions and denied authority', async () => {
    for (const [status, code] of [
      [401, 'auth.session_expired'],
      [403, 'auth.role_not_permitted'],
    ] as const)
      expect(
        await requestOwnershipTransfer(
          target,
          'test-only',
          sender({ error: { code, message: 'Sign in again.' } }, status),
        ),
      ).toMatchObject({ kind: 'refused', reloadRequired: true });
  });
  it('does not offer a blind retry after a provider/server failure', async () => {
    expect(
      await requestOwnershipTransfer(
        target,
        'test-only',
        sender({ error: { code: 'internal', message: 'Unavailable' } }, 503),
      ),
    ).toMatchObject({ kind: 'unconfirmed' });
  });
  it('handles a lost response without retrying or retaining the password in its result', async () => {
    const send = vi.fn<typeof fetch>().mockRejectedValue(new Error('Disconnected'));
    const outcome = await requestOwnershipTransfer(target, 'test-only-private-password', send);
    expect(outcome).toMatchObject({ kind: 'unconfirmed' });
    expect(JSON.stringify(outcome)).not.toContain('test-only-private-password');
    expect(send).toHaveBeenCalledTimes(1);
  });
  it('treats redirected or unreadable responses as unconfirmed', async () => {
    const send = vi.fn<typeof fetch>().mockResolvedValue(new Response('<html>Sign in</html>'));
    expect(await requestOwnershipTransfer(target, 'test-only', send)).toMatchObject({
      kind: 'unconfirmed',
    });
  });
});
