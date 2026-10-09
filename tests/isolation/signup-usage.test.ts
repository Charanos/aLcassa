import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { finishOAuthSignUp, selfServeSignUp } from '@/modules/platform';
import { adminQuery, cleanup, closeHarness } from './harness';
import { assertDisposableDatabase } from './disposable';
import postgres from 'postgres';
import { inspectUsage } from '@/lib/usage/reconciliation';

const identities = [randomUUID(), randomUUID()];
const requests = identities.map(() => randomUUID());
const tenants: string[] = [];
const auth = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock('@/lib/auth/supabase/admin', () => ({
  createSupabaseAdminClient: () => ({
    auth: { admin: { createUser: auth.create, deleteUser: vi.fn() } },
  }),
}));
afterAll(async () => {
  for (const id of tenants) {
    await cleanup`delete from usage_counters where tenant_id=${id}`;
    await cleanup`delete from tenant_members where tenant_id=${id}`;
    await cleanup`delete from tenant_settings where tenant_id=${id}`;
    await cleanup`delete from tenants where id=${id}`;
  }
  await cleanup`delete from user_profiles where id=any(${identities}::uuid[])`;
  await cleanup`delete from platform_audit_log where request_id=any(${requests}::text[])`;
  await closeHarness();
});
describe('initial owner seat accounting', () => {
  it.each(['email', 'oauth'] as const)(
    'creates the %s owner and its seat in the same workspace transaction',
    async (kind) => {
      assertDisposableDatabase();
      const index = kind === 'email' ? 0 : 1;
      const userId = identities[index]!;
      const email = `signup-${userId}@example.invalid`;
      auth.create.mockResolvedValue({ data: { user: { id: userId } }, error: null });
      const input = {
        companyName: `Seat accounting ${userId}`,
        fullName: 'Seat verifier',
        email,
        password: `test-${randomUUID()}`,
      };
      const result =
        kind === 'email'
          ? await selfServeSignUp(input, { requestId: requests[index]! })
          : await finishOAuthSignUp(input, {
              userId,
              email,
              fullName: 'Seat verifier',
              requestId: requests[index]!,
            });
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error(result.message);
      tenants.push(result.tenantId);
      expect(
        await adminQuery`select current_value,peak_value from usage_counters
      where tenant_id=${result.tenantId} and key='seats'`,
      ).toEqual([{ current_value: 1, peak_value: 1 }]);
      const sql = postgres(process.env.DATABASE_URL_ADMIN!, { prepare: false, max: 1 });
      try {
        expect(await inspectUsage(sql, result.tenantId)).toEqual({ checked: 3, drift: [] });
      } finally {
        await sql.end();
      }
    },
  );
});
