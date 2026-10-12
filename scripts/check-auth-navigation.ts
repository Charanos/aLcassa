import assert from 'node:assert/strict';

/** Verify built Edge and route redirects without credentials or a valid session. */
async function main() {
  const base = process.env.AUTH_NAVIGATION_BASE_URL ?? 'http://127.0.0.1:3100';
  const origin = new URL(base).origin;
  for (const path of ['/app/settings/team?filter=active', '/platform/tenants?view=grid']) {
    const response = await fetch(new URL(path, origin), {
      redirect: 'manual',
      signal: AbortSignal.timeout(30_000),
    });
    assert.equal(response.status, 307);
    const location = response.headers.get('location');
    assert.ok(location);
    const destination = new URL(location, origin);
    assert.equal(destination.origin, origin);
    assert.equal(destination.pathname, '/sign-in');
    assert.equal(destination.searchParams.get('next'), path);
    assert.equal(response.headers.get('set-cookie'), null);
  }
  const entry = await fetch(new URL('/sign-in', origin), {
    redirect: 'manual',
    signal: AbortSignal.timeout(30_000),
  });
  assert.equal(entry.status, 200);
  const formSources = (entry.headers.get('content-security-policy') ?? '')
    .split(';')
    .map((directive) => directive.trim())
    .find((directive) => directive.startsWith('form-action '));
  const expectedSources = ["'self'"];
  if (process.env.NEXT_PUBLIC_SUPABASE_URL)
    expectedSources.push(
      new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin,
      'https://accounts.google.com',
    );
  assert.equal(formSources, `form-action ${expectedSources.join(' ')}`);
  const publicPage = await fetch(new URL('/project-tracker', origin));
  assert.match(
    publicPage.headers.get('content-security-policy') ?? '',
    /form-action 'self'(?:;|$)/,
  );
  const refused = await fetch(new URL('/api/v1/auth/sign-in', origin), {
    method: 'POST',
    redirect: 'manual',
    signal: AbortSignal.timeout(30_000),
    headers: { origin, 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ next: '/app/settings/team?filter=active' }),
  });
  assert.equal(refused.status, 303);
  const refusedDestination = new URL(refused.headers.get('location')!, origin);
  assert.equal(refusedDestination.origin, origin);
  assert.equal(refusedDestination.pathname, '/sign-in');
  assert.equal(refusedDestination.searchParams.get('next'), '/app/settings/team?filter=active');
  assert.equal(refused.headers.get('set-cookie'), null);
  const stale = await fetch(new URL('/app/settings/team?filter=active', origin), {
    redirect: 'manual',
    signal: AbortSignal.timeout(30_000),
    headers: {
      cookie:
        'aLcassa_tenant_session=00000000-0000-4000-8000-000000000000; alcassa_verify_tenant=00000000-0000-4000-8000-000000000000',
      'x-auth-return-path': 'https://outside.example',
    },
  });
  const expected = '/sign-in?next=%2Fapp%2Fsettings%2Fteam%3Ffilter%3Dactive';
  if (stale.headers.has('location')) {
    assert.equal(new URL(stale.headers.get('location')!, origin).origin, origin);
    assert.equal(
      new URL(stale.headers.get('location')!, origin).pathname +
        new URL(stale.headers.get('location')!, origin).search,
      expected,
    );
  } else {
    assert.equal(stale.status, 200);
    assert.ok((await stale.text()).includes(`NEXT_REDIRECT;replace;${expected};307;`));
  }
  console.log(
    'Built Auth navigation passes: missing and stale sessions preserve the protected return path; forged headers are overwritten; OAuth form origins are scoped to access pages.',
  );
}
main().catch((error: unknown) => {
  console.error(
    'Built Auth navigation failed: inspect redirect authorities, continuation and CSP.',
  );
  console.error(
    error instanceof Error ? error.message.slice(0, 600) : 'Unknown navigation failure',
  );
  process.exitCode = 1;
});
