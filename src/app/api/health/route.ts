import { NextResponse, type NextRequest } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { cacheStatus } from '@/lib/cache';
import { logger } from '@/lib/logger';

/** The unauthenticated health probe checks application dependencies without exposing configuration or tenant data. */

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

/** Check required schema objects through the restricted application role; connectivity alone does not establish readiness. */
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
