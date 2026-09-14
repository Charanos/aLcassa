#!/usr/bin/env tsx
/**
 * Why can this account not sign in?
 *
 * ⚠ WRITTEN BECAUSE TWO ROUNDS OF GUESSING COST MORE THAN THIS SCRIPT DID.
 *
 * `auth.invalid_credentials` is the only thing GoTrue will tell you, deliberately
 * — distinguishing "no such user" from "wrong password" at the sign-in endpoint
 * is an account-enumeration oracle. That is correct behaviour and it means the
 * error is useless for diagnosis, so the diagnosis has to happen against the
 * database instead.
 *
 * This reports every condition that must hold, separately, and says which one
 * does not:
 *
 *   1. the auth schema exists at all
 *   2. a row exists for the address
 *   3. its id matches the one every application table points at
 *   4. the address is confirmed
 *   5. an email identity row exists
 *   6. the password verifies against the stored hash
 *   7. the application rows exist and agree
 *
 * Nothing here writes. Run it, read the ✗, fix that one thing.
 *
 *   pnpm db:check-admin
 */

import { config as loadEnv } from 'dotenv';
import postgres from 'postgres';
import { SEED_PLATFORM_ADMIN } from '../src/db/seed/constants';

loadEnv({ path: '.env.local', quiet: true });

const connectionString = process.env.DATABASE_URL_ADMIN ?? process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL_ADMIN or DATABASE_URL must be set.');
  process.exit(1);
}

const EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'brian@alcassa.co.ke';
const PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'brian@admin123';

const sql = postgres(connectionString, { prepare: false, max: 1 });

const ok = (m: string) => console.log(`  ✓ ${m}`);
const bad = (m: string) => console.log(`  ✗ ${m}`);

/**
 * Are the seed and the application even talking to the same project?
 *
 * ⚠ THIS IS THE FAILURE NOTHING ELSE WOULD CATCH, AND IT LOOKS EXACTLY LIKE A
 * WRONG PASSWORD.
 *
 * The seed writes over `DATABASE_URL_ADMIN` — a Postgres connection. Sign-in
 * goes through `NEXT_PUBLIC_SUPABASE_URL` — the Supabase API. Those are two
 * different addresses for what is SUPPOSED to be one project, and nothing in
 * the codebase makes them agree. Point them at different projects, or leave one
 * behind after switching, and the seed succeeds, reports ✓, and writes an
 * account into a database the application never reads.
 *
 * Both carry the project ref, so they can be compared.
 */
function projectRefs(): { db: string | null; api: string | null } {
  const api = (() => {
    const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!raw) return null;
    try {
      // https://<ref>.supabase.co
      return new URL(raw).hostname.split('.')[0] ?? null;
    } catch {
      return null;
    }
  })();

  const db = (() => {
    try {
      const url = new URL(connectionString!);
      // Direct:  db.<ref>.supabase.co        Pooler: user is `postgres.<ref>`
      const fromHost = url.hostname.match(/^db\.([a-z0-9]+)\.supabase\./)?.[1];
      const fromUser = decodeURIComponent(url.username).match(/^postgres\.([a-z0-9]+)$/)?.[1];
      return fromHost ?? fromUser ?? null;
    } catch {
      return null;
    }
  })();

  return { db, api };
}

async function main(): Promise<void> {
  console.log(`\nChecking ${EMAIL}\n`);

  // ── 0 · same project? ─────────────────────────────────────────────────────
  const refs = projectRefs();
  if (refs.db && refs.api) {
    if (refs.db === refs.api) {
      ok(`the seed and the app share one Supabase project (${refs.db})`);
    } else {
      bad(`DIFFERENT Supabase projects: the seed writes to "${refs.db}", the app signs in against "${refs.api}"`);
      console.log(
        '\n  This is the failure that looks exactly like a wrong password: the\n' +
          '  account is created in one project and looked for in another. Point\n' +
          '  DATABASE_URL_ADMIN and NEXT_PUBLIC_SUPABASE_URL at the same project,\n' +
          '  then re-run `pnpm db:seed`.\n',
      );
    }
  } else {
    console.log(
      `  · could not compare projects (db ref: ${refs.db ?? 'unknown'}, api ref: ${refs.api ?? 'unknown'})`,
    );
  }

  // ── 1 · the auth schema ───────────────────────────────────────────────────
  const [schema] = await sql<{ present: boolean }[]>`
    select exists (
      select 1 from information_schema.tables
      where table_schema = 'auth' and table_name = 'users'
    ) as present
  `;

  if (!schema?.present) {
    bad('there is no `auth` schema on this database');
    console.log(
      '\n  DATABASE_URL_ADMIN points at a plain Postgres, not at Supabase.\n' +
        '  The application tables can be seeded there, but nothing can sign in.\n',
    );
    await sql.end();
    process.exit(1);
  }
  ok('the auth schema is present');

  // ── 2 · where crypt lives, which is environment-specific ──────────────────
  const [fn] = await sql<{ nspname: string }[]>`
    select n.nspname from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where p.proname = 'crypt'
    order by case n.nspname when 'public' then 0 when 'extensions' then 1 else 2 end
    limit 1
  `;

  if (!fn?.nspname) {
    bad('pgcrypto is not installed, so no password can be hashed or checked');
    console.log('\n  Run `pnpm db:extensions`, or enable pgcrypto in the Supabase dashboard.\n');
    await sql.end();
    process.exit(1);
  }
  ok(`pgcrypto's crypt() is in the "${fn.nspname}" schema`);

  // ── 3 · the auth user ─────────────────────────────────────────────────────
  const users = await sql<
    { id: string; confirmed: boolean; has_password: boolean; banned: boolean }[]
  >`
    select
      id::text,
      email_confirmed_at is not null as confirmed,
      coalesce(encrypted_password, '') <> '' as has_password,
      banned_until is not null and banned_until > now() as banned
    from auth.users
    where email = ${EMAIL}
  `;

  if (users.length === 0) {
    bad(`no auth.users row for ${EMAIL}`);
    console.log('\n  Run `pnpm db:seed`.\n');
    await sql.end();
    process.exit(1);
  }
  if (users.length > 1) {
    bad(`${users.length} auth.users rows share this address, which should be impossible`);
  }

  const user = users[0]!;
  ok(`auth.users row exists, id ${user.id}`);

  if (user.id !== SEED_PLATFORM_ADMIN) {
    bad(`that id does NOT match SEED_PLATFORM_ADMIN (${SEED_PLATFORM_ADMIN})`);
    console.log(
      '\n  Sign-in would succeed and the console would then find no platform_admins\n' +
        '  row for the authenticated id. Re-run `pnpm db:seed`, which moves a\n' +
        '  conflicting row aside and recreates the account at the right id.\n',
    );
  } else {
    ok('the id matches the one the application tables point at');
  }

  if (!user.has_password) bad('the row has no password hash — this account cannot sign in with one');
  else ok('a password hash is stored');

  if (!user.confirmed) bad('email_confirmed_at is null — GoTrue will refuse the sign-in');
  else ok('the address is confirmed');

  if (user.banned) bad('the account is banned until a future date');

  // ── 4 · the identity ──────────────────────────────────────────────────────
  const [identity] = await sql<{ n: number }[]>`
    select count(*)::int as n from auth.identities
    where user_id = ${user.id} and provider = 'email'
  `;

  if ((identity?.n ?? 0) === 0) {
    bad('no auth.identities row for the email provider');
    console.log(
      '\n  GoTrue refuses signInWithPassword for a user with no linked email\n' +
        '  provider, and the failure reads as a wrong password. Re-run `pnpm db:seed`.\n',
    );
  } else {
    ok('an email identity row exists');
  }

  // ── 5 · the password itself ───────────────────────────────────────────────
  /* ⚠ A STANDALONE STATEMENT, NOT A NESTED FRAGMENT. postgres.js does not
     renumber placeholders inside an interpolated `sql.unsafe`, so a `$1` there
     collides with the outer query's `$1` and Postgres refuses with `42P08
     inconsistent types deduced for parameter $1`. The seed hit exactly that;
     this had the same bug and only escaped it by exiting earlier. */
  const [match] = await sql.unsafe<{ matches: boolean }[]>(
    `select encrypted_password = ${fn.nspname}.crypt($1, encrypted_password) as matches
     from auth.users where id = $2`,
    [PASSWORD, user.id],
  );

  if (!match?.matches) {
    bad(`the stored hash does NOT match "${PASSWORD}"`);
    console.log(
      '\n  Either the seeded password differs from the one being typed, or the\n' +
        '  hash was written by a different algorithm. `pnpm db:seed` resets it.\n',
    );
  } else {
    ok(`the password "${PASSWORD}" verifies against the stored hash`);
  }

  // ── 5b · the NULLs that take GoTrue down ──────────────────────────────────
  /*
   * ⚠ THE CHECK EVERY OTHER CHECK MISSED. All of the above passed once while
   * sign-in answered 500 on every attempt, because GoTrue scans these columns
   * into Go `string` and a NULL breaks the scan. It reports that as "Database
   * error querying schema", which names nothing and looks like the project is
   * broken rather than one row.
   */
  const tokenColumns = [
    'confirmation_token',
    'recovery_token',
    'email_change',
    'email_change_token_new',
    'email_change_token_current',
    'phone_change',
    'phone_change_token',
    'reauthentication_token',
  ];

  const present = await sql<{ column_name: string }[]>`
    select column_name from information_schema.columns
    where table_schema = 'auth' and table_name = 'users'
      and column_name = any(${tokenColumns})
  `;

  const nulled: string[] = [];
  for (const { column_name } of present) {
    const [r] = await sql.unsafe<{ is_null: boolean }[]>(
      `select ${column_name} is null as is_null from auth.users where id = $1`,
      [user.id],
    );
    if (r?.is_null) nulled.push(column_name);
  }

  if (nulled.length > 0) {
    bad(`${nulled.length} token column(s) are NULL: ${nulled.join(', ')}`);
    console.log(
      '\n  GoTrue reads these as non-nullable strings. A NULL makes it answer\n' +
        '  500 "Database error querying schema" to EVERY request, so sign-in\n' +
        '  fails with nothing in the message pointing here. `pnpm db:seed`\n' +
        '  repairs them.\n',
    );
  } else {
    ok('no NULLs in the columns GoTrue reads as strings');
  }

  // ── 6 · the application's own rows ────────────────────────────────────────
  const [profile] = await sql<{ n: number }[]>`
    select count(*)::int as n from user_profiles where id = ${user.id}
  `;
  if ((profile?.n ?? 0) === 0) bad('no user_profiles row for this id');
  else ok('a user_profiles row exists');

  const [admin] = await sql<{ n: number }[]>`
    select count(*)::int as n from platform_admins
    where user_id = ${user.id} and deleted_at is null
  `;
  if ((admin?.n ?? 0) === 0) {
    bad('no platform_admins row — sign-in would succeed and land on the TENANT door');
  } else {
    ok('a platform_admins row exists, so the console is the destination');
  }

  console.log('');
  await sql.end();
}

/**
 * ⚠ THE CONNECTION ITSELF IS THE MOST LIKELY FAILURE, SO IT GETS AN EXPLANATION
 * RATHER THAN A STACK TRACE.
 *
 * Supavisor answers `tenant/user <user>.<ref> not found` when it cannot map the
 * username to a project. The message names the pooler's internal concept of a
 * "tenant", which has nothing to do with this product's tenants, so it reads as
 * an application error and is not one. Every time it appeared in this project it
 * meant the same thing: the connection string points at a project that is not
 * there.
 */
function explainConnectionFailure(error: unknown): string | null {
  const message = error instanceof Error ? error.message : String(error);

  if (/tenant\/user .* not found/i.test(message)) {
    return [
      'The Supabase POOLER rejected the connection: it has no project matching',
      'the username in DATABASE_URL_ADMIN.',
      '',
      '  "tenant" there is Supavisor\'s word for a Supabase PROJECT. It is not',
      '  one of this product\'s tenants, and nothing is wrong with the schema.',
      '',
      'Check, in order:',
      '  1. does <ref>.supabase.co resolve? If not, the project is gone and the',
      '     connection string, NEXT_PUBLIC_SUPABASE_URL and the keys all need',
      '     replacing with a new project\'s.',
      '  2. is the project paused? Free-tier projects pause when idle.',
      '  3. is the region in the pooler host right? A pooler in one region does',
      '     not know a project in another, and says exactly this when asked.',
    ].join('\n');
  }

  if (/ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ETIMEDOUT/i.test(message)) {
    return 'The database host could not be reached at all. Check DATABASE_URL_ADMIN and your network.';
  }

  return null;
}

main().catch(async (error: unknown) => {
  const explanation = explainConnectionFailure(error);

  if (explanation) {
    console.log(`\n  ✗ could not connect to the database\n`);
    console.log(
      explanation
        .split('\n')
        .map((line) => `  ${line}`)
        .join('\n'),
    );
    console.log('');
  } else {
    console.error('\ncheck failed:', error);
  }

  await sql.end().catch(() => undefined);
  process.exit(1);
});
