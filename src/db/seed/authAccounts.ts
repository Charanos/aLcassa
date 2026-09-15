import type { Sql } from 'postgres';

/**
 * Seeds rows into Supabase's own `auth` schema, so a seeded account can
 * actually SIGN IN.
 *
 * ⚠ THIS IS THE STEP THE SEED HAS ALWAYS BEEN MISSING, AND ITS ABSENCE WAS NOT
 * OBVIOUS FROM THE SEED — IT WAS OBVIOUS FROM THE CONSOLE.
 *
 * `pnpm db:seed` wrote `user_profiles` and `platform_admins` rows for Brian. It
 * never created an account he could authenticate as. So:
 *
 *   `/api/v1/auth/sign-in`  → `signInWithPassword` → no such user → refused
 *   the console               → reachable anyway, because middleware only
 *                               checks for the platform COOKIE
 *   every live reader         → `currentPlatformSessionOrNull()` → null
 *   every page                → `?? getProfile()` → the designed fixture
 *   every write action        → correctly refused, with an auth error
 *
 * That is the half-signed-out state documented in 19 §10, and this file is the
 * other half of the fix. The banner makes the state honest; this makes it
 * unnecessary.
 *
 * ⚠ WHY SQL RATHER THAN `admin.auth.admin.createUser()`.
 *
 * The eslint boundary permits the admin client here — `src/db/seed/**` is on the
 * exemption list — so the Supabase API was available and was still the wrong
 * tool. `createUser` mints its own UUID, and `SEED_PLATFORM_ADMIN` is a FIXED
 * uuid that `tests/isolation/support-mode.test.ts` asserts against by value. An
 * auth account whose id did not match would leave the profile row, the admin row
 * and the isolation suite pointing at one id while the thing that can actually
 * sign in carried another — which is the same class of split this file exists to
 * close.
 *
 * ⚠ AND IT IS COUPLED TO GOTRUE'S SCHEMA, WHICH IS THE REAL COST. Supabase owns
 * these tables and has changed them repeatedly. Everything below that could move
 * is ASKED FOR rather than assumed: where `crypt` lives, whether `identities`
 * has a `provider_id`. What is left is the column set that has been stable since
 * 2021.
 */

/** GoTrue's single-instance sentinel. Not a tenant id; nothing to do with us. */
const GOTRUE_INSTANCE = '00000000-0000-0000-0000-000000000000';

export type SeedAccount = {
  /** Must equal the `user_profiles.id` the application seeds. */
  id: string;
  email: string;
  password: string;
  fullName: string;
};

/**
 * Is Supabase's auth schema present at all?
 *
 * A plain Postgres — CI, a throwaway container, someone running the isolation
 * suite locally — has the application's tables and none of GoTrue's. Seeding
 * must still succeed there: the isolation suite does not sign anybody in, it
 * sets `app.current_actor_id` directly. So this is a skip rather than a failure,
 * and it says so on the way past.
 */
export async function authSchemaExists(sql: Sql): Promise<boolean> {
  const rows = await sql<{ present: boolean }[]>`
    select exists (
      select 1 from information_schema.tables
      where table_schema = 'auth' and table_name = 'users'
    ) as present
  `;
  return rows[0]?.present ?? false;
}

/**
 * Where `crypt()` actually lives.
 *
 * ⚠ THIS IS THE BUG THAT MADE THE FIRST VERSION OF THIS FILE FAIL ON SUPABASE,
 * AND IT FAILS IN A WAY THAT LOOKS LIKE SOMETHING ELSE.
 *
 * `scripts/create-extensions.ts` runs `create extension if not exists pgcrypto`,
 * which on a Supabase project is a NO-OP — the extension is already installed,
 * into the `extensions` schema rather than `public`. `extensions` is not on the
 * default `search_path` for a direct Postgres connection, so an unqualified
 * `crypt(...)` raises "function crypt(text, text) does not exist".
 *
 * On a plain Postgres the same statement really does create it, in `public`,
 * where it resolves unqualified. So the identical seed works locally and fails
 * against the thing it is actually for.
 *
 * Asking the catalogue costs one query and removes the guess entirely.
 */
async function cryptSchema(sql: Sql): Promise<string> {
  const rows = await sql<{ nspname: string }[]>`
    select n.nspname
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where p.proname = 'crypt'
    order by case n.nspname when 'public' then 0 when 'extensions' then 1 else 2 end
    limit 1
  `;

  const schema = rows[0]?.nspname;
  if (!schema) {
    throw new Error(
      'pgcrypto is not installed, so a password cannot be hashed. Run `pnpm db:extensions`, or enable the extension in the Supabase dashboard.',
    );
  }
  return schema;
}

/**
 * GoTrue's string columns that must never be NULL.
 *
 * ⚠ THIS LIST IS THE FIX FOR A 500 THAT LOOKS NOTHING LIKE ITS CAUSE.
 *
 * GoTrue scans these into Go `string`, which is not nullable. A NULL makes the
 * driver fail with "converting NULL to string is unsupported", which GoTrue
 * reports as:
 *
 *     HTTP 500  {"error_code":"unexpected_failure",
 *                "msg":"Database error querying schema"}
 *
 * Nothing in that message points at a column, a row, or this seed. Every
 * endpoint that reads a user breaks at once, so the project looks broken rather
 * than the row.
 *
 * ⚠ AND IT IS A REGRESSION I INTRODUCED. The first version of this file set four
 * of them to `''` explicitly. The rewrite removed them with a comment asserting
 * that "where they are NOT NULL they carry a default of ''" — they do not. On
 * Supabase today, `confirmation_token`, `recovery_token`, `email_change` and
 * `email_change_token_new` are all NULLABLE WITH NO DEFAULT, so omitting them
 * writes NULL. The assumption was wrong and it was stated confidently, which is
 * the combination worth recording.
 *
 * The list is filtered against `information_schema` before use, so a column that
 * does not exist in a given GoTrue version is skipped rather than failing the
 * statement — which is what the rewrite was reaching for and got wrong.
 *
 * `phone` is deliberately absent: it is genuinely nullable and GoTrue reads it
 * as one.
 */
const MUST_NOT_BE_NULL = [
  'confirmation_token',
  'recovery_token',
  'email_change',
  'email_change_token_new',
  'email_change_token_current',
  'phone_change',
  'phone_change_token',
  'reauthentication_token',
] as const;

/**
 * Set every one of those to `''` where it is null.
 *
 * ⚠ A REPAIR RATHER THAN PART OF THE INSERT, ON PURPOSE. It runs after the
 * upsert, so it also fixes a row an EARLIER run of this seed wrote wrongly —
 * which matters, because the broken row is already out there on any database
 * this has been run against. Making it a separate, idempotent statement means
 * re-running the seed is the fix rather than "drop the row by hand first".
 */
async function repairNullTokens(sql: Sql, id: string): Promise<void> {
  const present = await sql<{ column_name: string }[]>`
    select column_name from information_schema.columns
    where table_schema = 'auth' and table_name = 'users'
      and column_name = any(${MUST_NOT_BE_NULL})
  `;

  if (present.length === 0) return;

  /* Identifiers cannot be bound, and these come from the catalogue rather than
     from any caller. The id is still a parameter. Standalone statement, own
     numbering — see the note in `upsertAuthAccount`. */
  const assignments = present
    .map((c) => `${c.column_name} = coalesce(${c.column_name}, '')`)
    .join(', ');

  await sql.unsafe(`update auth.users set ${assignments} where id = $1`, [id]);
}

/**
 * Create or update one sign-in-able account at a chosen id.
 *
 * ⚠ IT IS AN UPSERT ON THE ID, AND IT RESETS THE PASSWORD EVERY RUN. A seed that
 * refuses to re-run is a seed nobody runs. `pnpm db:seed` after a schema reset,
 * or after somebody changed the demo password by hand, must end with the
 * documented credentials working — otherwise the command that exists to produce
 * a known state produces an unknown one.
 *
 * ⚠ IT ALSO UPSERTS ON THE EMAIL. GoTrue has a unique index on the address, so
 * an earlier attempt that created this account at a DIFFERENT id — anyone who
 * signed up through the sign-up form with it, or a previous
 * `admin.createUser()` — would otherwise collide and fail. The conflicting row
 * is moved aside first, because an id mismatch is precisely the split this file
 * exists to prevent.
 *
 * ⚠ `email_confirmed_at` IS SET. There is no inbox behind a seeded address, so
 * leaving it unconfirmed would seed an account that exists and cannot be used.
 * This is the one place that shortcut is correct: real sign-up goes through
 * `selfServeSignUp`, which deliberately creates users with `email_confirm: false`
 * and sends the link.
 */
export async function upsertAuthAccount(sql: Sql, account: SeedAccount): Promise<void> {
  const schema = await cryptSchema(sql);

  /*
   * ⚠ THE HASH IS COMPUTED BY ITS OWN QUERY, AND THE FIRST VERSION NESTED IT.
   *
   * That version built `sql.unsafe('<schema>.crypt($1, …)', [password])` and
   * interpolated it into the tagged template below. postgres.js does NOT
   * renumber placeholders inside a nested fragment, so that `$1` collided with
   * the outer statement's own `$1` — `instance_id`, a uuid — and Postgres
   * refused with `42P08 inconsistent types deduced for parameter $1: text
   * versus uuid`.
   *
   * A standalone query owns its numbering completely. The hash comes back as an
   * ordinary string and goes into the insert as an ordinary parameter, so the
   * statement below has no raw SQL in it at all.
   *
   * The schema name is interpolated rather than bound because an identifier
   * cannot be a bind parameter — and it comes from `pg_namespace`, not from
   * anything a caller supplies, so there is no injection surface. The password
   * is still bound.
   */
  const [hashed] = await sql.unsafe<{ hash: string }[]>(
    `select ${schema}.crypt($1, ${schema}.gen_salt('bf')) as hash`,
    [account.password],
  );

  const hash = hashed?.hash;
  if (!hash) throw new Error('The password could not be hashed.');

  /*
   * ⚠ ANY OTHER ACCOUNT HOLDING THIS ADDRESS IS REMOVED FIRST.
   *
   * `auth.users.email` is unique. Without this, a second run after somebody had
   * registered the address by hand fails on the unique index with a message that
   * names the constraint and not the cause. Deleting is safe here and only here:
   * the address is the demonstration account's, this is a seed, and the row is
   * about to be recreated at the id every other table already points at.
   */
  await sql`delete from auth.users where email = ${account.email} and id <> ${account.id}`;

  /*
   * ⚠ A DELIBERATELY SMALL COLUMN LIST. Every column named here has existed
   * since 2021. The token columns (`confirmation_token`, `recovery_token`,
   * `email_change_token_new`, …) are omitted rather than set to '': where they
   * are NOT NULL they carry a default of '', and naming them is how this file
   * breaks on the next GoTrue release that renames one.
   */
  await sql`
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data
    )
    values (
      ${GOTRUE_INSTANCE}, ${account.id}, 'authenticated', 'authenticated',
      ${account.email}, ${hash},
      now(), now(), now(),
      ${sql.json({ provider: 'email', providers: ['email'] })},
      ${sql.json({ full_name: account.fullName, email_verified: true })}
    )
    on conflict (id) do update set
      email              = excluded.email,
      encrypted_password = excluded.encrypted_password,
      email_confirmed_at = coalesce(auth.users.email_confirmed_at, excluded.email_confirmed_at),
      -- raw_app_meta_data WAS MISSING FROM THIS LIST. It carries the provider,
      -- so a row written by an older version of this file kept its broken value
      -- through every re-seed: the update repaired the user metadata and left
      -- the one thing GoTrue actually reads.
      raw_app_meta_data  = excluded.raw_app_meta_data,
      raw_user_meta_data = excluded.raw_user_meta_data,
      updated_at         = now()
  `;

  /*
   * ⚠ THE IDENTITY ROW IS NOT OPTIONAL. Without it GoTrue has a user with no
   * linked email provider, and `signInWithPassword` refuses — which is the most
   * confusing possible outcome, because the account plainly exists in the
   * dashboard and the failure reads as a wrong password.
   */
  const [shape] = await sql<{ has_provider_id: boolean }[]>`
    select exists (
      select 1 from information_schema.columns
      where table_schema = 'auth' and table_name = 'identities' and column_name = 'provider_id'
    ) as has_provider_id
  `;

  /**
   * ⚠ `sql.json(...)`, NOT `JSON.stringify(...)::jsonb`. THIS ONE COST THE MOST.
   *
   * Passing a pre-stringified object made postgres.js bind a JS STRING, so the
   * cast produced a jsonb SCALAR STRING rather than an object:
   *
   *     jsonb_typeof(identity_data)  →  "string"     (not "object")
   *     identity_data->>'email'      →  NULL
   *
   * `auth.identities.email` is a GENERATED column —
   * `lower(identity_data->>'email')` — so it computed to NULL. GoTrue scans it
   * into a Go `string`, the scan fails, and every password grant answers:
   *
   *     500  {"error_code":"unexpected_failure",
   *           "msg":"Database error querying schema"}
   *
   * The same double-encoding hit `raw_app_meta_data`, so `->>'provider'` was
   * NULL too and GoTrue could not see that this account has an email provider.
   *
   * ⚠ AND NOTHING ABOUT THE ROW LOOKED WRONG. `select *` renders a
   * double-encoded jsonb almost identically to a real object — the difference is
   * a backslash in a dump nobody reads closely. Every column was populated,
   * every earlier check passed, and the account was unusable. Only
   * `jsonb_typeof` tells the two apart, which is why the verification below now
   * asks for it by name.
   */
  const identityData = sql.json({
    sub: account.id,
    email: account.email,
    email_verified: true,
    phone_verified: false,
  });

  if (shape?.has_provider_id) {
    // Current shape: a surrogate `id`, with the provider's own key in
    // `provider_id`, unique per (provider, provider_id).
    await sql`
      insert into auth.identities (
        id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
      )
      values (
        gen_random_uuid(), ${account.id}, ${account.id}, ${identityData},
        'email', now(), now(), now()
      )
      on conflict (provider_id, provider) do update set
        user_id       = excluded.user_id,
        identity_data = excluded.identity_data,
        updated_at    = now()
    `;
  } else {
    // Pre-2023 shape: `id` IS the provider key, and it is text.
    await sql`
      insert into auth.identities (
        id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
      )
      values (
        ${account.id}, ${account.id}, ${identityData}, 'email', now(), now(), now()
      )
      on conflict (id, provider) do update set
        user_id       = excluded.user_id,
        identity_data = excluded.identity_data,
        updated_at    = now()
    `;
  }

  /* Last, so it also repairs a row an earlier run of this seed wrote with
     NULLs. See `MUST_NOT_BE_NULL` — those NULLs take GoTrue's whole user
     endpoint down with a 500 that names nothing. */
  await repairNullTokens(sql, account.id);
}

/**
 * Prove the credentials actually work, before anybody tries them.
 *
 * ⚠ A SEED THAT REPORTS SUCCESS WITHOUT CHECKING IS THE SAME DEFECT THIS
 * CODEBASE KEEPS FINDING IN ITS OWN ACTIONS — a write that could affect zero
 * rows, reported as done. Every failure mode above is silent from the seed's
 * point of view: a hash written with the wrong algorithm, an identity row that
 * did not land, an `email_confirmed_at` left null. All three produce a seed that
 * prints ✓ and a sign-in page that says the password is wrong.
 *
 * This re-runs the comparison GoTrue itself performs, plus the two conditions it
 * checks alongside, and reports what is actually true.
 */
export async function verifyAuthAccount(
  sql: Sql,
  account: SeedAccount,
): Promise<{ ok: true } | { ok: false; problem: string }> {
  const schema = await cryptSchema(sql);

  /* One standalone statement, own placeholder numbering — see the note in
     `upsertAuthAccount` for why this must not be nested in a template. */
  const rows = await sql.unsafe<{ password_ok: boolean; confirmed: boolean; identities: number }[]>(
    `select
       u.encrypted_password = ${schema}.crypt($1, u.encrypted_password) as password_ok,
       u.email_confirmed_at is not null                                 as confirmed,
       (select count(*)::int from auth.identities i where i.user_id = u.id) as identities
     from auth.users u
     where u.id = $2`,
    [account.password, account.id],
  );

  const row = rows[0];
  if (!row) return { ok: false, problem: 'the auth.users row was not written' };
  if (!row.password_ok)
    return { ok: false, problem: 'the password does not verify against the stored hash' };
  if (!row.confirmed)
    return {
      ok: false,
      problem: 'the address is not confirmed, so GoTrue will refuse the sign-in',
    };
  if (row.identities === 0)
    return {
      ok: false,
      problem: 'no auth.identities row, so there is no email provider to sign in with',
    };

  /**
   * ⚠ THIS CHECK EXISTS BECAUSE THE OTHER FOUR ALL PASSED WHILE SIGN-IN WAS
   * BROKEN.
   *
   * Every condition above was green — the row, the hash, the confirmation, the
   * identity — and GoTrue still answered 500 to every request, because four
   * token columns were NULL. The verification was checking what the SEED had
   * written rather than what the CONSUMER needs, which is a comfortable thing
   * to check and not the useful one.
   *
   * A verification step is only worth its line count if it can fail for the
   * reason the thing actually breaks.
   */
  const nulls = await sql<{ column_name: string }[]>`
    select c.column_name
    from information_schema.columns c
    where c.table_schema = 'auth' and c.table_name = 'users'
      and c.column_name = any(${MUST_NOT_BE_NULL})
  `;

  for (const { column_name } of nulls) {
    const [check] = await sql.unsafe<{ is_null: boolean }[]>(
      `select ${column_name} is null as is_null from auth.users where id = $1`,
      [account.id],
    );
    if (check?.is_null) {
      return {
        ok: false,
        problem: `auth.users.${column_name} is NULL, which makes GoTrue answer 500 "Database error querying schema" to every request`,
      };
    }
  }

  /**
   * ⚠ THE JSONB SHAPE, BY NAME. A double-encoded jsonb is a scalar string that
   * renders almost exactly like the object it should be, so nothing short of
   * `jsonb_typeof` distinguishes them — and the consequence is that GoTrue
   * answers 500 to every request while the row looks perfect.
   *
   * The generated `auth.identities.email` is the same fact from the other end:
   * it is `lower(identity_data->>'email')`, so it is NULL exactly when the
   * identity data is not really an object.
   */
  const [shape] = await sql<
    { app_ok: boolean; identity_ok: boolean; identity_email: string | null }[]
  >`
    select
      jsonb_typeof(u.raw_app_meta_data) = 'object' as app_ok,
      jsonb_typeof(i.identity_data)     = 'object' as identity_ok,
      i.email                                      as identity_email
    from auth.users u
    join auth.identities i on i.user_id = u.id and i.provider = 'email'
    where u.id = ${account.id}
  `;

  if (!shape)
    return { ok: false, problem: 'the user and its email identity could not be read together' };
  if (!shape.app_ok) {
    return {
      ok: false,
      problem:
        'auth.users.raw_app_meta_data is a JSON string rather than an object — the value was double-encoded',
    };
  }
  if (!shape.identity_ok) {
    return {
      ok: false,
      problem:
        'auth.identities.identity_data is a JSON string rather than an object — the value was double-encoded',
    };
  }
  if (!shape.identity_email) {
    return {
      ok: false,
      problem:
        'auth.identities.email is NULL, which makes GoTrue answer 500 "Database error querying schema" to every sign-in',
    };
  }

  return { ok: true };
}
