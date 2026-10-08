import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { config } from 'dotenv';
import postgres from 'postgres';

/** Update only the invitation helper on an explicitly identified sandbox database. */
async function main() {
  config({ path: '.env.local', quiet: true });
  const expectedProject = process.argv.find((arg) => arg.startsWith('--project='))?.slice(10);
  if (!expectedProject || !/^[a-z0-9]{20}$/.test(expectedProject))
    throw Error('Supply the sandbox project reference explicitly.');
  const adminUrl = process.env.DATABASE_URL_ADMIN;
  const appUrl = process.env.DATABASE_URL;
  if (!adminUrl || !appUrl) throw Error('Both database connections are required.');
  const project = (value: string) => {
    const address = new URL(value);
    return (
      address.hostname.match(/^db\.([a-z0-9]+)\.supabase\.co$/)?.[1] ??
      decodeURIComponent(address.username).match(/\.([a-z0-9]+)$/)?.[1]
    );
  };
  if (
    project(adminUrl) !== expectedProject ||
    project(appUrl) !== expectedProject ||
    new URL(adminUrl).pathname !== new URL(appUrl).pathname ||
    new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').hostname !==
      `${expectedProject}.supabase.co`
  )
    throw Error('Application, migration and provider targets must match the named sandbox.');
  const source = readFileSync('src/db/policies/02_identity.sql', 'utf8').replaceAll('\r\n', '\n');
  const statement = source.match(
    /create or replace function app\.accept_invitation\([\s\S]*?\$\$;/,
  )?.[0];
  const body = statement?.split('$$')[1]?.trim();
  if (!statement || !body || !body.includes("hashtextextended('membership:'"))
    throw Error('Verified acceptance source is unavailable.');
  const database = postgres(adminUrl, { max: 1, prepare: false, connect_timeout: 10 });
  try {
    const receipt = await database.begin(async (tx) => {
      await tx`select pg_advisory_xact_lock(hashtextextended('alcassa-membership-function-upgrade', 0))`;
      const inspect = async () => {
        const [row] = await tx<
          {
            body: string;
            security: boolean;
            settings: string[];
            owner: string;
            acl: string | null;
            returns: string;
          }[]
        >`
          select prosrc as body, prosecdef as security, proconfig as settings,
            proowner::text as owner, proacl::text as acl, pg_get_function_result(oid) as returns
          from pg_proc where oid = to_regprocedure('app.accept_invitation(text,uuid,text,text)')`;
        if (
          !row?.security ||
          !row.settings.includes('search_path=public, pg_temp') ||
          row.returns !== 'TABLE(accepted_tenant_id uuid, accepted_role member_role)'
        )
          throw Error('The existing helper does not match the supported contract.');
        return row;
      };
      const before = await inspect();
      const matchesBefore = before.body.replaceAll('\r\n', '\n').trim() === body;
      if (process.argv.includes('--apply') && !matchesBefore) await tx.unsafe(statement);
      const after = await inspect();
      if (
        before.owner !== after.owner ||
        before.acl !== after.acl ||
        JSON.stringify(before.settings) !== JSON.stringify(after.settings)
      )
        throw Error('Function permissions or security settings changed; rolling back.');
      const matches = after.body.replaceAll('\r\n', '\n').trim() === body;
      if (process.argv.includes('--apply') && !matches) throw Error('Function readback differs.');
      return {
        checkedAt: new Date().toISOString(),
        sandbox: true,
        applied: !matchesBefore && matches,
        matchesRelease: matches,
        permissionsPreserved: true,
        sourceSha256: createHash('sha256').update(body).digest('hex'),
      };
    });
    mkdirSync('.test-report/phase-one', { recursive: true });
    writeFileSync(
      '.test-report/phase-one/membership-sandbox-function.json',
      JSON.stringify(receipt, null, 2) + '\n',
    );
    console.log(JSON.stringify(receipt));
    if (!receipt.matchesRelease) process.exitCode = 1;
  } finally {
    await database.end();
  }
}
main().catch(() => {
  console.error(
    'Invitation helper qualification failed; no unchecked database change was committed.',
  );
  process.exitCode = 1;
});
