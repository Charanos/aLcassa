/** Creates login accounts only for the disposable, seeded local workspaces. */
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { appendFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import postgres from 'postgres';
import { SEED_USER_A, SEED_USER_B } from '../src/db/seed/constants';
import {
  authSchemaExists,
  upsertAuthAccount,
  verifyAuthAccount,
} from '../src/db/seed/authAccounts';

async function main(): Promise<void> {
  const url = new URL(process.env.DATABASE_URL_ADMIN ?? '');
  assert.equal(url.hostname, '127.0.0.1');
  assert.equal(url.port, '55422');
  assert.equal(url.pathname, '/postgres');
  const environment = join(process.cwd(), '.env.verification.local');
  assert.equal(process.env.VERIFICATION_ENV_FILE, environment);
  const saved = await readFile(environment, 'utf8');
  const sql = postgres(url.toString(), { max: 1, prepare: false });
  try {
    assert.equal(await authSchemaExists(sql), true);
    for (const [key, id] of [
      ['VERIFICATION_TENANT', SEED_USER_A],
      ['VERIFICATION_OTHER_TENANT', SEED_USER_B],
    ] as const) {
      const [profile] = await sql<{ email: string; full_name: string }[]>`
        select email, full_name from user_profiles where id = ${id}`;
      assert.ok(profile);
      const existingPassword = saved
        .split(/\r?\n/)
        .find((line) => line.startsWith(`${key}_PASSWORD=`))
        ?.split('=')
        .slice(1)
        .join('=');
      const password = existingPassword ?? `${randomBytes(24).toString('hex')}!aA9`;
      const account = { id, email: profile.email, fullName: profile.full_name, password };
      await upsertAuthAccount(sql, account);
      const verified = await verifyAuthAccount(sql, account);
      assert.equal(verified.ok, true, 'Disposable login account verification failed.');
      if (!existingPassword)
        await appendFile(
          environment,
          `\n${key}_EMAIL=${profile.email}\n${key}_PASSWORD=${password}\n`,
        );
    }
    console.log(
      'Two disposable tenant login accounts verified. Credentials remain in the ignored local environment file.',
    );
  } finally {
    await sql.end();
  }
}
main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Disposable account setup failed.');
  process.exitCode = 1;
});
