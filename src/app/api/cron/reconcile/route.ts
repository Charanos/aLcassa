import { NextResponse, type NextRequest } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { invitations, tenantMembers, tenants, usageCounters } from '@/db/schema';
import { withoutTenantContext } from '@/lib/db';
import { closeLapsedSupportSessions } from '@/modules/platform';
import { logger } from '@/lib/logger';

/** Scheduled reconciliation reports usage drift without silently modifying counters. */

export const dynamic = 'force-dynamic';

/** Compare the scheduler secret in constant time. */
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

/** Seat usage includes active members and pending invitations; source definitions determine reconciliation coverage. */
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
