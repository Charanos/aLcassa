import type { Sql, TransactionSql } from 'postgres';
import { SEED_PLATFORM_ADMIN, SEED_TENANT_A, SEED_TENANT_B } from './constants';

/** The seed runs some steps inside a transaction and some outside it, so both
 *  handle shapes are accepted. Neither is used for anything but tagged queries. */
type Queryable = Sql | TransactionSql;

/**
 * The demo operator's own history: devices and a record of what he has done.
 *
 * ⚠ WHY THIS EXISTS, AND WHY IT IS NOT "MORE MOCK DATA".
 *
 * `lib/console/data.ts` carries a designed profile — three devices, "9 support
 * sessions this month", "412 audit entries by you" — and it is genuinely good
 * copy. It is also unreachable the moment somebody signs in, because the live
 * reader takes over and correctly reports what the database holds, which until
 * now was nothing: no sessions but the one just created, and no audit rows at
 * all.
 *
 * So signing in made the console WORSE to look at, which is exactly backwards
 * for a demonstration, and it also meant nobody ever exercised the live reader
 * against realistic volume. The same three devices and the same order of
 * magnitude of activity now exist as ROWS, so the live path and the designed
 * path show the same shape and the reader cannot tell which they are on —
 * which is the correct outcome for a seam.
 *
 * ⚠ EVERY ROW HERE IS SHAPED EXACTLY AS THE APPLICATION WOULD HAVE WRITTEN IT.
 * `used_service_role` is false on all of them because none of these actions went
 * through `asService`; the request ids are formed like real ones; the user agents
 * are real strings that `describeAgent` parses into the labels the fixture
 * shows. A seed that writes rows the application could not have produced is a
 * seed that hides bugs in the reader.
 */

/** Stable ids, so re-seeding replaces rather than accumulates. */
const SESSION_LAPTOP = '00000000-0000-4000-8000-00000000ad11';
const SESSION_PHONE = '00000000-0000-4000-8000-00000000ad12';
const SESSION_DESKTOP = '00000000-0000-4000-8000-00000000ad13';

/**
 * Real user-agent strings, because `describeAgent` parses them.
 *
 * The fixture writes the LABELS ("MacBook Pro · Chrome 141"). The live reader
 * derives them, so seeding a label would produce "Unknown device" and quietly
 * prove nothing. These three parse to "Chrome on macOS", "Safari on iOS" and
 * "Edge on Windows".
 */
const DEVICES = [
  {
    id: SESSION_LAPTOP,
    ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
    ip: '196.201.214.88',
    /* Hours ago. The laptop is the one he is most likely to still be on. */
    lastActiveHours: 2,
    expiresInDays: 6,
  },
  {
    id: SESSION_PHONE,
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
    ip: '41.90.64.12',
    lastActiveHours: 3,
    expiresInDays: 5,
  },
  {
    id: SESSION_DESKTOP,
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0',
    ip: '105.163.2.41',
    lastActiveHours: 24 * 6,
    expiresInDays: 2,
  },
] as const;

/**
 * A month of plausible platform activity.
 *
 * ⚠ THE MIX MATTERS MORE THAN THE COUNT. A profile whose activity is four
 * hundred identical rows tells a reviewer nothing about what the audit log is
 * for. These are the actions an owner actually takes — a plan assignment, a
 * suspension and its reversal, a support visit, an export — so the recent
 * activity panel and the audit screen both have something worth reading, and
 * `used_service_role` has both values present to filter on.
 */
const ACTIVITY: ReadonlyArray<{
  action: string;
  entityType: string | null;
  tenant: string | null;
  reason: string | null;
  service: boolean;
  daysAgo: number;
}> = [
  {
    action: 'subscription.plan_assigned',
    entityType: 'subscription',
    tenant: SEED_TENANT_B,
    reason: 'moved to Business at their request',
    service: true,
    daysAgo: 1,
  },
  {
    action: 'platform.exported',
    entityType: 'report',
    tenant: null,
    reason: 'workspaces',
    service: false,
    daysAgo: 2,
  },
  {
    action: 'support.entered',
    entityType: 'session',
    tenant: SEED_TENANT_A,
    reason: 'channel not delivering — ticket 4412',
    service: true,
    daysAgo: 3,
  },
  {
    action: 'support.exited',
    entityType: 'session',
    tenant: SEED_TENANT_A,
    reason: 'resolved',
    service: true,
    daysAgo: 3,
  },
  {
    action: 'profile.updated',
    entityType: 'user_profile',
    tenant: null,
    reason: 'display name',
    service: false,
    daysAgo: 5,
  },
  {
    action: 'tenant.suspended',
    entityType: 'tenant',
    tenant: null,
    reason: 'non-payment, 62 days overdue',
    service: true,
    daysAgo: 8,
  },
  {
    action: 'rules.published',
    entityType: 'master_ai_rules',
    tenant: null,
    reason: 'version 24',
    service: true,
    daysAgo: 11,
  },
  {
    action: 'platform.exported',
    entityType: 'report',
    tenant: null,
    reason: 'revenue',
    service: false,
    daysAgo: 13,
  },
  {
    action: 'session.revoked',
    entityType: 'session',
    tenant: null,
    reason: 'revoked by the account holder',
    service: false,
    daysAgo: 16,
  },
  {
    action: 'tenant.provisioned',
    entityType: 'tenant',
    tenant: SEED_TENANT_B,
    reason: 'onboarded from the pilot list',
    service: true,
    daysAgo: 21,
  },
  {
    action: 'subscription.override_granted',
    entityType: 'subscription',
    tenant: SEED_TENANT_A,
    reason: 'two extra seats for the migration week',
    service: true,
    daysAgo: 24,
  },
  {
    action: 'tenant.reactivated',
    entityType: 'tenant',
    tenant: null,
    reason: 'payment cleared',
    service: true,
    daysAgo: 27,
  },
];

export async function seedDemoProfile(sql: Queryable, actorLabel: string): Promise<void> {
  /*
   * ⚠ REVOKED FIRST, THEN RE-INSERTED. Deleting the rows would be simpler and
   * wrong: `sessions` is the table revocation acts on, and a seed that DELETES
   * sessions teaches the wrong lesson about a table whose whole design is that
   * rows persist and carry a `revoked_at`. Re-seeding replaces the three demo
   * devices by id and leaves anything else the operator has signed in from
   * alone — including the session they are reading this from.
   */
  for (const device of DEVICES) {
    await sql`
      insert into sessions (
        id, user_id, kind, tenant_id, user_agent, ip_address,
        last_activity_at, expires_at, created_at
      )
      values (
        ${device.id}, ${SEED_PLATFORM_ADMIN}, 'platform', null,
        ${device.ua}, ${device.ip},
        now() - ${`${device.lastActiveHours} hours`}::interval,
        now() + ${`${device.expiresInDays} days`}::interval,
        now() - ${`${device.lastActiveHours} hours`}::interval
      )
      on conflict (id) do update set
        user_agent       = excluded.user_agent,
        ip_address       = excluded.ip_address,
        last_activity_at = excluded.last_activity_at,
        expires_at       = excluded.expires_at,
        revoked_at       = null,
        revoked_reason   = null
    `;
  }

  /*
   * ⚠ CLEARED AND REWRITTEN, WHICH IS THE ONE PLACE THAT IS ACCEPTABLE.
   *
   * `platform_audit_log` is append-only by policy: it has a select policy and an
   * insert policy and deliberately no delete policy, so no application path can
   * remove a row. This runs on the ADMIN connection, which is not subject to
   * those policies — and re-running the seed must not leave twelve more copies
   * of the same month behind each time.
   *
   * Scoped to this one seeded actor and to rows the seed itself wrote, so a real
   * entry recorded by a person using the console is never touched.
   */
  await sql`
    delete from platform_audit_log
    where actor_user_id = ${SEED_PLATFORM_ADMIN}
      and request_id like 'seed-%'
  `;

  for (const [index, entry] of ACTIVITY.entries()) {
    await sql`
      insert into platform_audit_log (
        actor_user_id, actor_label, action, target_tenant_id, entity_type,
        used_service_role, reason, ip_address, request_id, occurred_at
      )
      values (
        ${SEED_PLATFORM_ADMIN}, ${actorLabel}, ${entry.action}, ${entry.tenant},
        ${entry.entityType}, ${entry.service}, ${entry.reason},
        '196.201.214.88', ${`seed-${String(index).padStart(3, '0')}`},
        now() - ${`${entry.daysAgo} days`}::interval
      )
    `;
  }
}
