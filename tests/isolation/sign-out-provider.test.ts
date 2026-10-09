import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/auth/supabase/admin';
import { supabasePublishableKey, supabaseUrl } from '@/lib/auth/supabase/env';
import { adminQuery, closeHarness } from './harness';
import { assertDisposableDatabase } from './disposable';

const mock = vi.hoisted(() => ({ client: undefined as SupabaseClient | undefined }));
vi.mock('@/lib/auth/supabase/server', () => ({
  createSupabaseServerClient: () => Promise.resolve(mock.client),
}));
vi.mock('next/headers', () => ({
  cookies: () => Promise.resolve({ get: () => undefined }),
}));
import { POST } from '@/app/api/v1/auth/sign-out/route';

const email = `sign-out-${randomUUID()}@example.invalid`;
const password = `${randomUUID()}A9!`;
let owner: string | undefined;
beforeAll(async () => {
  assertDisposableDatabase();
  if (supabaseUrl() !== 'http://127.0.0.1:55421') throw Error('Disposable Auth required');
  const result = await createSupabaseAdminClient().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  owner = result.data.user?.id;
  if (result.error || !owner) throw Error('Disposable identity creation failed');
});
afterAll(async () => {
  if (owner) {
    expect((await createSupabaseAdminClient().auth.admin.deleteUser(owner)).error).toBeNull();
    expect(await adminQuery`select id from auth.users where id=${owner}`).toEqual([]);
  }
  await closeHarness();
});

it('ends the current provider refresh session while another device can still refresh', async () => {
  const client = () =>
    createClient(supabaseUrl(), supabasePublishableKey(), {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  const current = client(),
    other = client();
  const first = await current.auth.signInWithPassword({ email, password });
  expect(first.error).toBeNull();
  expect((await other.auth.signInWithPassword({ email, password })).error).toBeNull();
  expect(await adminQuery`select id from auth.sessions where user_id=${owner!}`).toHaveLength(2);
  mock.client = current;
  const response = await POST(
    new NextRequest('http://localhost:3100/api/v1/auth/sign-out', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
    }),
  );
  expect(response.status).toBe(200);
  expect((await other.auth.refreshSession()).error).toBeNull();
  expect(
    (await client().auth.refreshSession({ refresh_token: first.data.session!.refresh_token }))
      .error,
  ).not.toBeNull();
  expect(await adminQuery`select id from auth.sessions where user_id=${owner!}`).toHaveLength(1);
});
