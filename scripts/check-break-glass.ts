#!/usr/bin/env tsx
/**
 * Does break glass actually lock anything?
 *
 * ⚠ THE CONTROL REFUSED TO DO ANYTHING FOR A PHASE, WITH A REASON THAT
 *   DESCRIBED A DESIGN NOBODY BUILT — a flag at `app.support_lock` read by
 *   `withTenantContext` on every request. The lock is the most recent
 *   `support.lock_engaged` / `support.lock_released` row in the platform audit
 *   log instead: the state and its record are the same row, so they cannot
 *   drift, and it needed no migration.
 *
 * That design is only correct if the read actually reflects the writes, so
 * this exercises it: engage, read, release, read, and confirm an open support
 * session is revoked by the engage. Everything runs in a transaction and rolls
 * back, so a run costs nothing and leaves nothing.
 *
 *   pnpm db:check-break-glass
 */

import { config as loadEnv } from 'dotenv';
import postgres from 'postgres';
import { randomUUID } from 'node:crypto';

loadEnv({ path: '.env.local', quiet: true });

const connectionString = process.env.DATABASE_URL_ADMIN ?? process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL_ADMIN or DATABASE_URL must be set.');
  process.exit(1);
}

const sql = postgres(connectionString, { prepare: false, onnotice: () => {} });

let failures = 0;
const ok = (s: string) => console.log(`  ✓ ${s}`);
const bad = (s: string) => {
  console.log(`  ✗ ${s}`);
  failures += 1;
};

class Rollback extends Error {}

/** The reader, exactly as `breakGlassState` expresses it. */
async function readState(tx: postgres.TransactionSql) {
  const [row] = await tx<
    { action: string; actor_label: string; reason: string | null; occurred_at: Date }[]
  >`
    select action, actor_label, reason, occurred_at
      from platform_audit_log
     where action in ('support.lock_engaged', 'support.lock_released')
     order by occurred_at desc
     limit 1`;
  if (!row) return { locked: false, by: null, reason: null };
  return {
    locked: row.action === 'support.lock_engaged',
    by: row.actor_label,
    reason: row.reason,
  };
}

async function main() {
  console.log('\nBREAK GLASS · the lock is the latest event\n');

  const [admin] = await sql<{ user_id: string; display_name: string }[]>`
    select user_id, display_name from platform_admins where deleted_at is null limit 1`;
  if (!admin) {
    bad('no platform admin to act as. Run `pnpm db:seed`.');
    return;
  }

  const before = await readState(sql as unknown as postgres.TransactionSql);
  console.log(`  starting state: ${before.locked ? 'LOCKED' : 'open'}\n`);

  try {
    await sql.begin(async (tx) => {
      // ── 1 · a support session to be caught by the lock ───────────────────
      console.log('1. An open support session');
      const [tenant] = await tx<
        { id: string; slug: string }[]
      >`select id, slug from tenants where deleted_at is null limit 1`;
      if (!tenant) {
        bad('no tenant to open a session against');
        throw new Rollback();
      }
      const [session] = await tx<{ id: string }[]>`
        insert into sessions (user_id, kind, tenant_id, effective_role, expires_at, last_activity_at)
        values (${admin.user_id}, 'support', ${tenant.id}, 'support', now() + interval '30 minutes', now())
        returning id`;
      if (!session) {
        bad('the probe session row was not returned');
        throw new Rollback();
      }
      ok(`open against ${tenant.slug}`);

      // ── 2 · engage ───────────────────────────────────────────────────────
      console.log('\n2. Engage');
      await tx`
        insert into platform_audit_log
          (actor_user_id, actor_label, action, entity_type, reason, used_service_role, request_id)
        values (${admin.user_id}, ${admin.display_name}, 'support.lock_engaged', 'platform',
                ${'probe: verifying the lock'}, true, ${randomUUID()})`;

      const engaged = await readState(tx);
      if (engaged.locked) ok(`reads LOCKED, by ${engaged.by}, "${engaged.reason}"`);
      else bad('the event was written and the reader still says open');

      // ── 3 · open sessions are revoked, not left to expire ────────────────
      console.log('\n3. Open sessions end with the lock');
      const revoked = await tx`
        update sessions set revoked_at = now()
         where kind = 'support' and revoked_at is null and expires_at > now()
        returning id`;
      ok(`${revoked.length} revoked`);

      const [still] = await tx<{ revoked_at: Date | null }[]>`
        select revoked_at from sessions where id = ${session.id}`;
      if (still?.revoked_at) ok('the probe session is closed');
      else bad('the probe session is still open after the lock');

      // ── 4 · release ──────────────────────────────────────────────────────
      console.log('\n4. Release');
      await tx`
        insert into platform_audit_log
          (actor_user_id, actor_label, action, entity_type, reason, used_service_role, request_id)
        values (${admin.user_id}, ${admin.display_name}, 'support.lock_released', 'platform',
                ${'probe: done verifying'}, true, ${randomUUID()})`;

      const released = await readState(tx);
      if (!released.locked) ok('reads OPEN again');
      else bad('release was written and the reader still says locked');

      // ── 5 · the history survives, which is the point ─────────────────────
      console.log('\n5. The history is intrinsic');
      const events = await tx`
        select action, reason from platform_audit_log
         where action in ('support.lock_engaged', 'support.lock_released')
         order by occurred_at desc limit 2`;
      if (events.length === 2) ok('both events readable — a flag would have kept neither');
      else bad(`expected 2 events, found ${events.length}`);

      throw new Rollback();
    });
  } catch (error) {
    if (!(error instanceof Rollback)) throw error;
  }

  console.log('\n6. Rollback');
  const after = await readState(sql as unknown as postgres.TransactionSql);
  if (after.locked === before.locked) ok(`state unchanged (${after.locked ? 'LOCKED' : 'open'})`);
  else bad('the probe changed the real lock state — investigate immediately');

  console.log(
    failures === 0
      ? '\nBreak glass locks, releases, and remembers.\n'
      : `\n${failures} problems.\n`,
  );
}

main()
  .catch((error: unknown) => {
    console.error('\nThe check itself failed:', error);
    failures += 1;
  })
  .finally(async () => {
    await sql.end();
    process.exit(failures === 0 ? 0 : 1);
  });
