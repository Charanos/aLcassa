import { NextResponse, type NextRequest } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { cacheStatus } from '@/lib/cache';
import { logger } from '@/lib/logger';

/**
 * `GET /api/health` — the probe target.
 *
 * ⚠ THERE WAS NO HEALTH ENDPOINT AT ALL UNTIL 28 Aug 2026.
 *
 * `04 §12` names Better Stack for uptime checking and `12 ·` makes a status
 * page an M6 deliverable, but nothing existed for either to poll. An uptime
 * monitor pointed at `/` would have reported the marketing page rendering,
 * which is true and useless: the marketing page renders perfectly well while
 * the database is unreachable.
 *
 * ⚠ WHAT THIS DELIBERATELY DOES NOT DO.
 *
 * No authentication — a probe that needs a credential is a probe that stops
 * working when the credential expires, and this returns nothing worth
 * protecting. No tenant data, no counts of anything, no version of the
 * application. `06 §10`'s rule holds here as everywhere: a cross-tenant read
 * to populate a dashboard is a request to weaken isolation.
 *
 * It reports the two dependencies that decide whether the product WORKS, and
 * distinguishes between them:
 *
 *   database   REQUIRED. Unreachable means the application is down, and the
 *              response is 503 so a monitor pages somebody.
 *   cache      OPTIONAL by design. `08 §6` and definition-of-done condition 9
 *              say every correctness property holds with Redis switched off;
 *              only speed changes. So a cache that is off is reported and is
 *              NOT a failure — a 503 here would page somebody at 3am for a
 *              latency regression.
 */

// Never cached, never statically rendered. A health check answered from a
// cache is a health check that reports the last time things were fine.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Check = { ok: boolean; detail: string };

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
  const startedAt = performance.now();

  const database = await checkDatabase();
  const cache = cacheStatus();

  /**
   * Only the database decides the status code.
   *
   * `Retry-After` on the failure path so a monitor backs off rather than
   * adding load to something already struggling.
   */
  const healthy = database.ok;
  const durationMs = Math.round(performance.now() - startedAt);

  if (!healthy) {
    logger.error('health check failed', { database: database.detail, durationMs, requestId });
  }

  return NextResponse.json(
    {
      status: healthy ? 'ok' : 'degraded',
      checks: {
        database,
        // Reported rather than judged. See the note above.
        cache: { ok: true, detail: cache.enabled ? 'enabled' : `disabled · ${cache.reason}` },
      },
      durationMs,
      // No application version: it would be the only field here that tells an
      // unauthenticated caller something about our deployment.
      at: new Date().toISOString(),
    },
    {
      status: healthy ? 200 : 503,
      headers: {
        'X-Request-Id': requestId,
        'Cache-Control': 'no-store, max-age=0',
        ...(healthy ? {} : { 'Retry-After': '30' }),
      },
    },
  );
}

/**
 * ⚠ IT CHECKS THE SCHEMA IS PRESENT, NOT THAT `select 1` ANSWERS.
 *
 * `select 1` proves a connection can be opened, which is worth knowing and is
 * not the interesting failure. The one that actually happens is a deploy
 * reaching a database that has not been migrated: the application boots, the
 * connection succeeds, and every query fails on a missing table.
 *
 * ⚠ AND IT DOES NOT READ drizzle.__drizzle_migrations, THOUGH THAT WAS THE
 *   FIRST ATTEMPT.
 *
 * The application connects as `alcassa_app`, which has no USAGE on the
 * `drizzle` schema — deliberately, because it is a least-privilege role that
 * owns nothing and migrates nothing. Reading the migration table returned
 * "permission denied for schema drizzle", so the health check would have
 * reported a perfectly healthy database as UNREACHABLE and paged somebody.
 *
 * Granting the app role access to make a health check work would be widening
 * a privilege boundary for the convenience of a probe. `to_regclass` needs no
 * privilege at all — it reads the catalogue — and answers the question that
 * matters: are the tables this build expects actually there.
 */
async function checkDatabase(): Promise<Check> {
  try {
    const result = await db.execute(
      sql`select
            to_regclass('public.tenants') is not null as tenants,
            to_regclass('public.subscriptions') is not null as subscriptions,
            to_regclass('public.sessions') is not null as sessions`,
    );

    const row = (
      result as unknown as {
        tenants: boolean;
        subscriptions: boolean;
        sessions: boolean;
      }[]
    )[0];

    // Three tables from three different migrations. One would prove the
    // database is not empty; three make a partially-applied migration set
    // visible rather than passing on the first table alphabetically.
    const missing = Object.entries(row ?? {})
      .filter(([, present]) => !present)
      .map(([table]) => table);

    if (missing.length > 0) {
      return { ok: false, detail: `reachable, but not migrated · missing ${missing.join(', ')}` };
    }
    return { ok: true, detail: 'reachable · schema present' };
  } catch (error) {
    /**
     * The message is deliberately generic. A connection error from Postgres
     * carries the host, the port, the database name and often the role — and
     * this endpoint is unauthenticated. The detail goes to the log, where
     * whoever is on call can read it.
     */
    logger.error('health check: database unreachable', { error });
    return { ok: false, detail: 'unreachable' };
  }
}
