/** Export only the named disposable provider's keys to the current CI job. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';

assert.ok(process.env.GITHUB_ENV, 'This helper requires the CI environment file.');
let provider: Record<string, unknown>;
try {
  provider = JSON.parse(
    execFileSync(
      'npx',
      [
        '--yes',
        'supabase@2.119.0',
        'status',
        '--workdir',
        'verification/local',
        '--output',
        'json',
      ],
      {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    ),
  ) as Record<string, unknown>;
} catch {
  throw new Error('The disposable provider status could not be read.');
}
assert.equal(provider.API_URL, 'http://127.0.0.1:55421');
const providerExports: Record<string, unknown> = {
  NEXT_PUBLIC_APP_URL: 'http://localhost:3100',
  NEXT_PUBLIC_SUPABASE_URL: provider.API_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: provider.ANON_KEY,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: provider.ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: provider.SERVICE_ROLE_KEY,
  SUPABASE_SECRET_KEY: provider.SERVICE_ROLE_KEY,
};
for (const [name, value] of Object.entries(providerExports)) {
  assert.ok(
    typeof value === 'string' && value.length > 0 && !/[\r\n]/.test(value),
    `Missing or malformed ${name}.`,
  );
  if (!['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_APP_URL'].includes(name))
    console.log(`::add-mask::${value}`);
  appendFileSync(process.env.GITHUB_ENV, `${name}=${value}\n`, 'utf8');
}
