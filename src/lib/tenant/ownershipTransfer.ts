import { z } from 'zod';

const receipt = z.object({
  data: z.object({
    previousOwnerId: z.string().uuid(),
    newOwnerId: z.string().uuid(),
    newOwnerMemberId: z.string().uuid(),
    yourRoleNow: z.literal('admin'),
  }),
});
const refusal = z.object({
  error: z.object({ code: z.string(), message: z.string().min(1).max(500) }),
});

export type OwnershipOutcome =
  | { kind: 'confirmed' }
  | { kind: 'refused'; message: string; passwordError: boolean; reloadRequired: boolean }
  | { kind: 'unconfirmed'; requestId: string };

/** A lost response may follow a committed transfer; only a matching receipt confirms success. */
export async function requestOwnershipTransfer(
  memberId: string,
  password: string,
  send: typeof fetch = fetch,
): Promise<OwnershipOutcome> {
  const requestId = crypto.randomUUID();
  try {
    const response = await send('/api/v1/tenant/transfer-ownership', {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(30_000),
      headers: { 'Content-Type': 'application/json', 'X-Request-Id': requestId },
      body: JSON.stringify({ memberId, password }),
    });
    const body: unknown = await response.json();
    const confirmed = receipt.safeParse(body);
    if (
      response.ok &&
      confirmed.success &&
      confirmed.data.data.newOwnerMemberId === memberId &&
      confirmed.data.data.previousOwnerId !== confirmed.data.data.newOwnerId
    )
      return { kind: 'confirmed' };

    const rejected = refusal.safeParse(body);
    if (response.status >= 400 && response.status < 500 && rejected.success)
      return {
        kind: 'refused',
        message: rejected.data.error.message,
        passwordError: rejected.data.error.code === 'auth.invalid_credentials',
        reloadRequired:
          rejected.data.error.code === 'auth.session_expired' || response.status === 403,
      };
  } catch {
    // A timeout or unreadable response does not establish whether the write committed.
  }
  return { kind: 'unconfirmed', requestId };
}
