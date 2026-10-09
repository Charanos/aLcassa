import { randomUUID } from 'node:crypto';
import { NextRequest, type NextResponse } from 'next/server';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseAdminClient } from '@/lib/auth/supabase/admin';
import { provisionTenant } from '@/modules/platform';
import { POST as confirmEmail } from '@/app/api/v1/auth/email/confirm/route';
import { POST as resetPassword } from '@/app/api/v1/auth/password/reset/route';
import { POST as requestReset } from '@/app/api/v1/auth/password/forgot/route';
import { POST as signIn } from '@/app/api/v1/auth/sign-in/route';
import { cookieNameFor, createSession, resolveSession } from '@/lib/auth/session';
import { resolveSessionDoor } from '@/lib/auth/resolve';
import { adminQuery, cleanup, closeHarness } from './harness';
import { assertDisposableDatabase } from './disposable';

const browser = vi.hoisted(() => ({
  cookies: new Map<string, string>(),
  headers: new Headers({
    'user-agent': 'Disposable Auth lifecycle verifier',
    'x-forwarded-for': '127.0.0.81',
  }),
}));
vi.mock('next/headers', () => ({
  cookies: () =>
    Promise.resolve({
      get: (name: string) =>
        browser.cookies.has(name) ? { name, value: browser.cookies.get(name)! } : undefined,
      getAll: () => Array.from(browser.cookies, ([name, value]) => ({ name, value })),
      set: (name: string, value: string) => {
        browser.cookies.set(name, value);
      },
    }),
  headers: () => Promise.resolve(browser.headers),
}));

const operatorId = randomUUID();
const planId = randomUUID();
const slug = `lifecycle-${randomUUID()}`;
const email = `${slug}@example.invalid`;
const profileOnlyId = randomUUID();
const profileOnlyEmail = `profile-only-${randomUUID()}@example.invalid`;
const unknownEmail = `unknown-recovery-${randomUUID()}@example.invalid`;
const origin = 'http://localhost:3100';
const requestIds: string[] = [];
let ownerId: string | undefined;
let prepared = false;
function request(path: string, body: Record<string, string>, nativeForm = false) {
  const requestId = randomUUID();
  requestIds.push(requestId);
  return new NextRequest(origin + path, {
    method: 'POST',
    headers: {
      origin,
      'content-type': nativeForm ? 'application/x-www-form-urlencoded' : 'application/json',
      'x-request-id': requestId,
      'x-forwarded-for': browser.headers.get('x-forwarded-for')!,
    },
    body: nativeForm ? new URLSearchParams(body).toString() : JSON.stringify(body),
  });
}
function retainCookies(response: NextResponse) {
  for (const cookie of response.cookies.getAll()) {
    if (cookie.maxAge === 0) browser.cookies.delete(cookie.name);
    else browser.cookies.set(cookie.name, cookie.value);
  }
}
async function capturedLink(kind: 'invite' | 'reset') {
  let id: string | undefined;
  await expect
    .poll(
      async () => {
        const response = await fetch(
          `http://127.0.0.1:55424/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`,
        );
        const mail = (await response.json()) as {
          messages: Array<{ ID: string; Subject: string }>;
        };
        id = mail.messages.find((message) =>
          kind === 'invite'
            ? /invit/i.test(message.Subject)
            : /reset|recover/i.test(message.Subject),
        )?.ID;
        return Boolean(id);
      },
      { timeout: 10_000, interval: 100 },
    )
    .toBe(true);
  const message = (await (await fetch(`http://127.0.0.1:55424/api/v1/message/${id!}`)).json()) as {
    HTML: string;
  };
  expect(message.HTML).toContain(kind === 'invite' ? 'A place to begin.' : 'A clear path back in.');
  expect(message.HTML.replace(/\s+/g, ' ')).toContain('Keep account links private');
  const links = [...message.HTML.matchAll(/href="([^"]+)"/g)].map((match) =>
    match[1]!.replaceAll('&amp;', '&'),
  );
  const link = links.find((candidate) =>
    candidate.startsWith('http://127.0.0.1:55421/auth/v1/verify'),
  );
  expect(
    link,
    'The actual captured email must contain its provider verification link',
  ).toBeDefined();
  return link!;
}

beforeAll(async () => {
  assertDisposableDatabase();
  if (process.env.NEXT_PUBLIC_SUPABASE_URL !== 'http://127.0.0.1:55421')
    throw new Error('Lifecycle verification requires disposable Auth.');
  vi.stubEnv('NEXT_PUBLIC_APP_URL', origin);
  prepared = true;
  await adminQuery`insert into user_profiles(id,full_name) values(${operatorId},'Lifecycle verifier')`;
  await adminQuery`insert into user_profiles(id,full_name,email) values(${profileOnlyId},'Profile without Auth identity',${profileOnlyEmail})`;
  await adminQuery`insert into platform_admins(user_id,display_name,can_suspend_tenants) values(${operatorId},'Lifecycle verifier',true)`;
  await adminQuery`insert into plans(id,code,name,trial_days) values(${planId},${slug},'Lifecycle verification',14)`;
});
afterAll(async () => {
  if (!prepared) return;
  if (!ownerId) {
    const [identity] = await adminQuery<
      Array<{ id: string }>
    >`select id from auth.users where email=${email}`;
    ownerId = identity?.id;
  }
  const [tenant] = await adminQuery<
    Array<{ id: string }>
  >`select id from tenants where slug=${slug}`;
  if (tenant) {
    await cleanup`delete from audit_log where tenant_id=${tenant.id}`;
    await cleanup`delete from subscriptions where tenant_id=${tenant.id}`;
    await cleanup`delete from tenant_members where tenant_id=${tenant.id}`;
    await cleanup`delete from tenant_settings where tenant_id=${tenant.id}`;
    await cleanup`delete from usage_counters where tenant_id=${tenant.id}`;
    await cleanup`delete from tenants where id=${tenant.id}`;
  }
  if (ownerId) {
    await cleanup`delete from sessions where user_id=${ownerId}`;
    const removed = await createSupabaseAdminClient().auth.admin.deleteUser(ownerId);
    expect(removed.error, 'Disposable lifecycle Auth cleanup must succeed').toBeNull();
    await cleanup`delete from user_profiles where id=${ownerId}`;
  }
  await cleanup`delete from platform_audit_log where request_id=any(${requestIds}::text[])`;
  await cleanup`delete from platform_admins where user_id=${operatorId}`;
  await cleanup`delete from user_profiles where id=${operatorId}`;
  await cleanup`delete from user_profiles where id=${profileOnlyId}`;
  await cleanup`delete from plans where id=${planId}`;
  await closeHarness();
  vi.unstubAllEnvs();
});

describe('Real-provider owner acceptance and PKCE password recovery', () => {
  it('activates the invited owner, opens the correct workspace and revokes old sessions after recovery', async () => {
    const provisioningId = randomUUID();
    requestIds.push(provisioningId);
    const result = await provisionTenant(
      {
        name: 'Lifecycle verification',
        slug,
        ownerEmail: email,
        ownerName: 'Lifecycle owner',
        initialStatus: 'trial',
        planCode: slug,
      },
      { userId: operatorId, label: 'Lifecycle verifier', requestId: provisioningId },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.message);
    ownerId = result.ownerUserId;
    const inviteLink = await capturedLink('invite');
    const invitation = await fetch(inviteLink, { redirect: 'manual' });
    expect(invitation.status).toBe(303);
    const inviteDestination = new URL(invitation.headers.get('location')!);
    expect(inviteDestination.origin + inviteDestination.pathname).toBe(origin + '/auth/confirm');
    const inviteProof = new URLSearchParams(inviteDestination.hash.slice(1));
    expect(inviteProof.get('type')).toBe('invite');
    const confirmed = await confirmEmail(
      request('/api/v1/auth/email/confirm', {
        purpose: 'invite',
        proof: 'session',
        accessToken: inviteProof.get('access_token')!,
        refreshToken: inviteProof.get('refresh_token')!,
      }),
    );
    expect(confirmed.headers.get('location')).toBe(origin + '/reset-password?purpose=invite');
    retainCookies(confirmed);
    browser.headers.set('x-forwarded-for', '127.0.0.84');
    const reusedSession = await confirmEmail(
      request('/api/v1/auth/email/confirm', {
        purpose: 'invite',
        proof: 'session',
        accessToken: inviteProof.get('access_token')!,
        refreshToken: inviteProof.get('refresh_token')!,
      }),
    );
    expect(reusedSession.headers.get('location')).toContain('error=link_unavailable');
    expect(reusedSession.cookies.get(cookieNameFor('recovery'))).toBeUndefined();
    browser.headers.set('x-forwarded-for', '127.0.0.81');
    const flowId = browser.cookies.get(cookieNameFor('recovery'))!;
    const flow = await resolveSession(flowId, ownerId, randomUUID());
    expect(flow?.kind).toBe('recovery');
    expect(flow!.expiresAt.getTime() - Date.now()).toBeLessThanOrEqual(15 * 60_000);
    browser.cookies.set(cookieNameFor('tenant'), flowId);
    await expect(
      resolveSessionDoor(new NextRequest(origin + '/api/v1/me'), randomUUID()),
    ).rejects.toMatchObject({ code: 'auth.session_expired' });
    browser.cookies.delete(cookieNameFor('tenant'));
    browser.headers.set('x-forwarded-for', '127.0.0.87');
    const invalidInvitationPassword = await resetPassword(
      request(
        '/api/v1/auth/password/reset',
        {
          password: `first-${randomUUID()}`,
          passwordConfirm: 'does-not-match',
          purpose: 'invite',
        },
        true,
      ),
    );
    expect(invalidInvitationPassword.status).toBe(303);
    const retryDestination = new URL(invalidInvitationPassword.headers.get('location')!);
    expect(retryDestination.pathname).toBe('/reset-password');
    expect(retryDestination.searchParams.get('purpose')).toBe('invite');
    expect(retryDestination.searchParams.get('error')).toBe('validation.failed');
    expect((await resolveSession(flowId, ownerId, randomUUID()))?.effectiveRole).toBe('invite');
    browser.headers.set('x-forwarded-for', '127.0.0.81');
    const firstPassword = `first-${randomUUID()}`;
    const setup = await resetPassword(
      request('/api/v1/auth/password/reset', {
        password: firstPassword,
        passwordConfirm: firstPassword,
        purpose: 'invite',
      }),
    );
    expect(setup.status).toBe(200);
    retainCookies(setup);
    const ctx = await resolveSessionDoor(new NextRequest(origin + '/api/v1/me'), randomUUID());
    expect(ctx.tenantId).toBe(result.tenantId);
    expect(ctx.role).toBe('owner');
    const [member] = await adminQuery<
      Array<{ status: string; joined: boolean }>
    >`select status,joined_at is not null as joined from tenant_members where tenant_id=${result.tenantId} and user_id=${ownerId}`;
    expect(member).toEqual({ status: 'active', joined: true });
    expect(
      await adminQuery`select current_value from usage_counters where tenant_id=${result.tenantId} and key='seats'`,
    ).toEqual([{ current_value: 1 }]);
    const joined = await adminQuery<
      Array<{ actor_user_id: string; entity_id: string; before: unknown; after: unknown }>
    >`select actor_user_id,entity_id,before,after from audit_log where tenant_id=${result.tenantId} and action='member.joined'`;
    expect(joined).toHaveLength(1);
    expect(joined[0]).toMatchObject({
      actor_user_id: ownerId,
      before: { status: 'invited', role: 'owner' },
      after: { status: 'active', role: 'owner' },
    });
    const oldSession = browser.cookies.get(cookieNameFor('tenant'))!;
    const otherSession = await createSession({
      userId: ownerId,
      kind: 'tenant',
      tenantId: result.tenantId,
      requestId: randomUUID(),
    });
    expect(await adminQuery`select id from auth.users where email=${email}`).toEqual([
      { id: ownerId },
    ]);
    expect(await adminQuery`select id from user_profiles where email=${email}`).toEqual([
      { id: ownerId },
    ]);
    const recoveryRequested = await requestReset(
      request('/api/v1/auth/password/forgot', { email }),
    );
    expect(recoveryRequested.status).toBe(204);
    const recoveryLink = await capturedLink('reset');
    const recovery = await fetch(recoveryLink, { redirect: 'manual' });
    const recoveryDestination = new URL(recovery.headers.get('location')!);
    expect(recoveryDestination.origin + recoveryDestination.pathname).toBe(
      origin + '/auth/confirm',
    );
    const code = recoveryDestination.searchParams.get('code');
    expect(code, 'SSR recovery must issue a PKCE code').toBeTruthy();
    const recovered = await confirmEmail(
      request('/api/v1/auth/email/confirm', { purpose: 'recovery', proof: 'code', code: code! }),
    );
    expect(recovered.headers.get('location')).toBe(origin + '/reset-password');
    retainCookies(recovered);
    const nextPassword = `recovered-${randomUUID()}`;
    const changed = await resetPassword(
      request('/api/v1/auth/password/reset', {
        password: nextPassword,
        passwordConfirm: nextPassword,
      }),
    );
    expect(changed.status).toBe(200);
    retainCookies(changed);
    expect(await resolveSession(oldSession, ownerId, randomUUID())).toBeNull();
    expect(await resolveSession(otherSession.id, ownerId, randomUUID())).toBeNull();
    expect(browser.cookies.has(cookieNameFor('recovery'))).toBe(false);
    const auth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    expect(
      (await auth.auth.signInWithPassword({ email, password: firstPassword })).error,
    ).not.toBeNull();
    const passwordLogin = await auth.auth.signInWithPassword({ email, password: nextPassword });
    expect(passwordLogin.error).toBeNull();
    const publicHeaders = {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      authorization: `Bearer ${passwordLogin.data.session!.access_token}`,
      'content-type': 'application/json',
    };
    const forgedFlow = await fetch(process.env.NEXT_PUBLIC_SUPABASE_URL! + '/rest/v1/sessions', {
      method: 'POST',
      headers: publicHeaders,
      body: JSON.stringify({
        id: randomUUID(),
        user_id: ownerId,
        kind: 'recovery',
        effective_role: 'recovery',
        last_activity_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 900_000).toISOString(),
      }),
    });
    expect(forgedFlow.status).toBe(403);
    expect(((await forgedFlow.json()) as { code: string }).code).toBe('42501');
    const revivedSession = await fetch(
      process.env.NEXT_PUBLIC_SUPABASE_URL! + `/rest/v1/sessions?id=eq.${oldSession}`,
      {
        method: 'PATCH',
        headers: publicHeaders,
        body: JSON.stringify({ revoked_at: null }),
      },
    );
    expect(revivedSession.status).toBe(403);
    const publicRead = await fetch(
      process.env.NEXT_PUBLIC_SUPABASE_URL! + '/rest/v1/sessions?select=id,kind,effective_role',
      { headers: publicHeaders },
    );
    expect(publicRead.status).toBe(403);
    browser.headers.set('x-forwarded-for', '127.0.0.85');
    const ordinaryProof = await confirmEmail(
      request('/api/v1/auth/email/confirm', {
        purpose: 'recovery',
        proof: 'session',
        accessToken: passwordLogin.data.session!.access_token,
        refreshToken: passwordLogin.data.session!.refresh_token,
      }),
    );
    expect(ordinaryProof.headers.get('location')).toContain('error=link_unavailable');
    expect(ordinaryProof.cookies.get(cookieNameFor('recovery'))).toBeUndefined();
    browser.headers.set('x-forwarded-for', '127.0.0.81');
    await auth.auth.signOut();
    const ordinarySignIn = await signIn(
      request('/api/v1/auth/sign-in', { email, password: nextPassword }),
    );
    expect(ordinarySignIn.status).toBe(200);
    retainCookies(ordinarySignIn);
    const withoutEmailProof = await resetPassword(
      request('/api/v1/auth/password/reset', {
        password: `refused-${randomUUID()}`,
        passwordConfirm: 'does-not-match',
      }),
    );
    expect(withoutEmailProof.status).toBe(422);
    const prohibitedPassword = `refused-${randomUUID()}`;
    const withoutMarker = await resetPassword(
      request('/api/v1/auth/password/reset', {
        password: prohibitedPassword,
        passwordConfirm: prohibitedPassword,
      }),
    );
    expect(withoutMarker.status).toBe(401);
    const passwordEvents = await adminQuery<
      Array<{ action: string; after: unknown }>
    >`select action,after from audit_log where tenant_id=${result.tenantId} and action in ('password.set','password.reset') order by occurred_at`;
    expect(passwordEvents).toEqual([
      { action: 'password.set', after: { passwordChanged: true, sessionsRevoked: 0 } },
      { action: 'password.reset', after: { passwordChanged: true, sessionsRevoked: 2 } },
    ]);
    const replay = await fetch(recoveryLink, { redirect: 'manual' });
    const replayDestination = new URL(replay.headers.get('location')!);
    expect(replayDestination.searchParams.has('code')).toBe(false);
    expect(replayDestination.searchParams.get('error_code')).toBe('otp_expired');
  });
  it('accepts a single-use token hash only for its actual provider purpose', async () => {
    browser.cookies.clear();
    browser.headers.set('x-forwarded-for', '127.0.0.83');
    const link = await createSupabaseAdminClient().auth.admin.generateLink({
      type: 'recovery',
      email,
    });
    expect(link.error).toBeNull();
    const tokenHash = link.data.properties!.hashed_token;
    const wrongPurpose = await confirmEmail(
      request('/api/v1/auth/email/confirm', { purpose: 'invite', proof: 'hash', tokenHash }),
    );
    expect(wrongPurpose.headers.get('location')).toContain('error=link_unavailable');
    expect(wrongPurpose.cookies.get(cookieNameFor('recovery'))).toBeUndefined();
    const confirmed = await confirmEmail(
      request('/api/v1/auth/email/confirm', { purpose: 'recovery', proof: 'hash', tokenHash }),
    );
    expect(confirmed.headers.get('location')).toBe(origin + '/reset-password');
    retainCookies(confirmed);
    const replayed = await confirmEmail(
      request('/api/v1/auth/email/confirm', { purpose: 'recovery', proof: 'hash', tokenHash }),
    );
    expect(replayed.headers.get('location')).toContain('error=link_unavailable');
    const unrelatedPurpose = `refused-${randomUUID()}`;
    const mismatch = await resetPassword(
      request('/api/v1/auth/password/reset', {
        purpose: 'invite',
        password: unrelatedPurpose,
        passwordConfirm: unrelatedPurpose,
      }),
    );
    expect(mismatch.status).toBe(401);
    const flowId = browser.cookies.get(cookieNameFor('recovery'))!;
    await adminQuery`update sessions set expires_at=now()-interval '1 minute' where id=${flowId}`;
    const expired = await resetPassword(
      request('/api/v1/auth/password/reset', {
        password: unrelatedPurpose,
        passwordConfirm: unrelatedPurpose,
      }),
    );
    expect(expired.status).toBe(401);
  });
  it.each([
    ['an unknown address', unknownEmail],
    ['an application profile without an Auth account', profileOnlyEmail],
  ])('does not send recovery mail or create an identity for %s', async (_label, address) => {
    expect(await adminQuery`select id from auth.users where email=${address}`).toEqual([]);
    const profileBefore =
      await adminQuery`select id,email from user_profiles where email=${address}`;
    const response = await requestReset(
      request('/api/v1/auth/password/forgot', { email: ` ${address.toUpperCase()} ` }),
    );
    expect(response.status).toBe(204);
    expect(await response.text()).toBe('');
    const form = await requestReset(
      request('/api/v1/auth/password/forgot', { email: address }, true),
    );
    expect(form.status).toBe(303);
    expect(form.headers.get('location')).toBe(origin + '/forgot-password?sent=1');
    for (let sample = 0; sample < 4; sample++) {
      const messages = await fetch(
        `http://127.0.0.1:55424/api/v1/search?query=${encodeURIComponent(`to:${address}`)}`,
      );
      expect(messages.ok).toBe(true);
      expect(((await messages.json()) as { messages: unknown[] }).messages).toEqual([]);
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    expect(await adminQuery`select id from auth.users where email=${address}`).toEqual([]);
    expect(await adminQuery`select id,email from user_profiles where email=${address}`).toEqual(
      profileBefore,
    );
    expect(await adminQuery`select id from sessions where user_id=${profileOnlyId}`).toEqual([]);
  });
});
