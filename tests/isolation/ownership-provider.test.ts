import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/auth/supabase/admin';
import { supabasePublishableKey, supabaseUrl } from '@/lib/auth/supabase/env';
import { createResolvedContext } from '@/lib/db/context';
import { adminQuery, cleanup, closeHarness } from './harness';
import { assertDisposableDatabase } from './disposable';

const mock = vi.hoisted(() => ({ resolve: vi.fn(), getUser: vi.fn() }));
vi.mock('@/lib/auth/resolve', () => ({ resolveSessionDoor: mock.resolve }));
vi.mock('@/lib/auth/supabase/server', () => ({
  createSupabaseServerClient: () => Promise.resolve({ auth: { getUser: mock.getUser } }),
}));
import { POST } from '@/app/api/v1/tenant/transfer-ownership/route';

const tenant = randomUUID(),
  target = randomUUID(),
  targetMember = randomUUID();
const email = `ownership-${randomUUID()}@example.invalid`;
const password = `${randomUUID()}A9!`;
let owner: string | undefined;
let prepared = false;
beforeAll(async () => {
  assertDisposableDatabase();
  if (supabaseUrl() !== 'http://127.0.0.1:55421') throw Error('Disposable Auth required');
  const result = await createSupabaseAdminClient().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  owner = result.data.user?.id;
  if (result.error || !owner) throw Error('Disposable owner creation failed');
  prepared = true;
  await adminQuery`insert into tenants(id,slug,name,status) values(${tenant},${`ownership-${tenant}`},'Ownership provider verification','active')`;
  await adminQuery`insert into user_profiles(id,full_name,email) values(${owner},'Disposable owner',${email}),(${target},'Disposable successor','successor@example.invalid')`;
  await adminQuery`insert into tenant_members(tenant_id,user_id,role,status) values(${tenant},${owner},'owner','active')`;
  await adminQuery`insert into tenant_members(id,tenant_id,user_id,role,status) values(${targetMember},${tenant},${target},'admin','active')`;
});
afterAll(async () => {
  if (prepared) {
    await cleanup`delete from audit_log where tenant_id=${tenant}`;
    await cleanup`delete from tenant_members where tenant_id=${tenant}`;
    await cleanup`delete from tenants where id=${tenant}`;
    await cleanup`delete from user_profiles where id in (${owner!},${target})`;
  }
  if (owner) {
    expect((await createSupabaseAdminClient().auth.admin.deleteUser(owner)).error).toBeNull();
    expect(await adminQuery`select id from auth.users where id=${owner}`).toEqual([]);
  }
  await closeHarness();
});
describe('Ownership transfer against the actual local identity provider', () => {
  it('preserves both original provider sessions while ending only password verification and recording one transfer', async () => {
    if (!owner) throw Error('Disposable owner unavailable');
    const client = () =>
      createClient(supabaseUrl(), supabasePublishableKey(), {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });
    const first = client(),
      second = client();
    expect((await first.auth.signInWithPassword({ email, password })).error).toBeNull();
    expect((await second.auth.signInWithPassword({ email, password })).error).toBeNull();
    mock.getUser.mockImplementation(() => first.auth.getUser());
    mock.resolve.mockResolvedValue(
      createResolvedContext({
        tenantId: tenant,
        actorId: owner,
        actorType: 'user',
        actorLabel: 'Disposable owner',
        role: 'owner',
        supportMode: false,
        requestId: 'ownership-provider-verification',
      }),
    );
    expect(await adminQuery`select id from auth.sessions where user_id=${owner}`).toHaveLength(2);
    const response = await POST(
      new NextRequest('http://localhost:3100/api/v1/tenant/transfer-ownership', {
        method: 'POST',
        headers: { origin: 'http://localhost:3100', 'content-type': 'application/json' },
        body: JSON.stringify({ memberId: targetMember, password }),
      }),
      { params: Promise.resolve({}) },
    );
    expect(response.status).toBe(200);
    expect(await adminQuery`select id from auth.sessions where user_id=${owner}`).toHaveLength(2);
    expect((await first.auth.refreshSession()).error).toBeNull();
    expect((await second.auth.refreshSession()).error).toBeNull();
    expect(
      await adminQuery`select user_id from tenant_members where tenant_id=${tenant} and role='owner'`,
    ).toEqual([{ user_id: target }]);
    expect(await adminQuery`select action from audit_log where tenant_id=${tenant}`).toEqual([
      { action: 'tenant.ownership_transferred' },
    ]);
  });
});
