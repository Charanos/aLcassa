/** Persist only the disposable CI provider contract for the browser runners. */
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';

assert.equal(process.env.GITHUB_ACTIONS, 'true');
assert.equal(process.env.VERIFICATION_DISPOSABLE, 'true');
assert.equal(process.env.NEXT_PUBLIC_SUPABASE_URL, 'http://127.0.0.1:55421');
assert.match(
  process.env.DATABASE_URL ?? '',
  /^postgresql:\/\/alcassa_app:[^@]+@127\.0\.0\.1:55422\/postgres$/,
);
const names = [
  'DATABASE_URL',
  'DATABASE_URL_ADMIN',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
];
const lines = names.map((name) => {
  const value = process.env[name];
  assert(value && !/[\r\n]/.test(value), `Missing disposable ${name}`);
  return `${name}=${value}`;
});
writeFileSync('.env.verification.local', lines.join('\n') + '\n', { mode: 0o600 });
console.log('Disposable browser environment prepared; credentials remain private.');
