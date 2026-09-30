import { NextResponse, type NextRequest } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { invitations, tenantMembers, tenants, usageCounters } from '@/db/schema';
import { withoutTenantContext } from '@/lib/db';
import { closeLapsedSupportSessions } from '@/modules/platform';
import { logger } from '@/lib/logger';

/**
 * 08 §3 · 04 ADR-007. THE NIGHTLY USAGE RECONCILIATION, AS A ROUTE.
 *
 * ADR-007 notes the consequence of the serverless model plainly: "anything
 * scheduled runs as a Vercel cron hitting a route". `scripts/reconcile-usage.ts`
 * is the same logic for a human at a terminal; this is the same logic for the
 * scheduler, and both report rather than repair.
 *
 * ⚠ IT REPORTS AND NEVER CORRECTS, WHICH IS THE ENTIRE POINT.
 *
 * 08 §3: "alerts on divergence rather than silently correcting it. Silent
 * correction hides the bug that caused the drift." A nightly job that quietly
 * fixed the numbers would make the underlying defect invisible and permanent —
 * the symptom disappears at 3am and nobody ever sees the pattern. Repair is
 * the CLI, deliberately, because it requires a named platform admin and a
 * stated reason and neither is available to a scheduler.
 *
 * ⚠ IT IS AUTHENTICATED BY A SHARED SECRET, NOT BY A SESSION.
 *
 * A cron has no user. Vercel sends `Authorization: Bearer $CRON_SECRET` on
 * scheduled invocations, and this refuses anything else — otherwise it is an
 * unauthenticated endpoint that enumerates every workspace's usage.
 */

export const dynamic = 'force-dynamic';

/**
 * ⚠ CONSTANT TIME, AND NOT BECAUSE THE THREAT IS LIKELY.
 *
 * A plain `===` on a secret leaks its length and prefix to anyone willing to
 * measure. The comparison costs nothing to do correctly, and getting it wrong
 * in the one place a shared secret is checked is the sort of thing a security
 * review finds and reasonably asks about.
 */
function secretMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const expected = process.env.CRON_SECRET;

  /**
   * No secret configured means the endpoint is closed, not open. An
   * unconfigured cron that answered would be an unauthenticated report on
   * every tenant's usage, and "we had not set it up yet" is not a defence.
   */
  if (!expected) {
    logger.warn('cron endpoint called with no CRON_SECRET configured');
    return new NextResponse(null, { status: 404 });
  }

  const provided = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  if (!secretMatches(provided, expected)) {
    // 404 rather than 401: an unauthenticated caller should not learn that
    // this route exists.
    return new NextResponse(null, { status: 404 });
  }

  /* Doc 24 · S0.6. Visits that ran to their cap are closed at their own
     expiry, in both logs, even on a day nobody opens the console. Silent when
     there is nothing to close; see `app.close_lapsed_support_sessions`. */
  const closedVisits = await withoutTenantContext('cron-support-timer', (tx) =>
    closeLapsedSupportSessions(tx),
  );
  if (closedVisits > 0) logger.info('support visits closed at their limit', { closedVisits });

  const drift = await findDrift();

  if (drift.length === 0) {
    logger.info('usage reconciliation: every counter matches its source rows');
    return NextResponse.json({ status: 'ok', checked: true, drift: [] });
  }

  /**
   * Logged at ERROR so it reaches Sentry and whatever log alerting exists,
   * rather than at warn where a nightly job's output is skimmed. Drift is a
   * symptom of a real defect in a counter write, and it should page somebody
   * on the second consecutive night rather than the tenth.
   */
  logger.error('usage reconciliation found drift', { count: drift.length, drift });

  return NextResponse.json(
    {
      status: 'drift',
      // 08 §3 again: reported, not repaired. The response names the command
      // that would repair it, so whoever reads the alert knows the next step
      // and that it is a deliberate one.
      repairWith: 'pnpm reconcile:usage --repair --reason "..." --actor <platform-admin-uuid>',
      drift,
    },
    // 200, not 500. The job SUCCEEDED — it found what it was looking for.
    // A 500 would make the scheduler retry a report that is already correct.
    { status: 200 },
  );
}

type Drift = { tenant: string; key: string; stored: number; actual: number };

/**
 * ⚠ THE COUNTER DEFINITIONS ARE THE SPECIFICATION, AND `seats` IS THE ONE
 *   MOST EASILY GOT WRONG.
 *
 * 08 §2: seats counts "active members PLUS pending invitations", because
 * otherwise a tenant on five seats sends fifty invitations and exceeds the
 * limit the moment they are accepted. A reconciliation counting only members
 * would report drift on every tenant with an outstanding invitation, nightly,
 * and look like it was working.
 *
 * Only `seats` is checked here. The CLI covers `api_keys` and
 * `ai_rules_versions` too, and both of those source tables are empty until M5
 * and M4a — a nightly job comparing zero to zero is noise. When those modules
 * land, the definitions move here alongside this one.
 */
async function findDrift(): Promise<Drift[]> {
  return withoutTenantContext('cron-reconcile', async (tx) => {
    const rows = await tx
      .select({
        slug: tenants.slug,
        stored: sql<number>`coalesce(${usageCounters.currentValue}, 0)`,
        actual: sql<number>`(
          (select count(*) from ${tenantMembers} m
            where m.tenant_id = ${tenants.id} and m.status = 'active' and m.deleted_at is null)
          +
          (select count(*) from ${invitations} i
            where i.tenant_id = ${tenants.id} and i.accepted_at is null and i.revoked_at is null)
        )::int`,
      })
      .from(tenants)
      .leftJoin(
        usageCounters,
        and(eq(usageCounters.tenantId, tenants.id), eq(usageCounters.key, 'seats')),
      )
      .where(isNull(tenants.deletedAt));

    return rows
      .filter((row) => row.stored !== row.actual)
      .map((row) => ({ tenant: row.slug, key: 'seats', stored: row.stored, actual: row.actual }));
  });
}
