import { NextResponse, type NextRequest } from 'next/server';
import { currentPlatformSessionOrNull } from '@/lib/auth/resolve';
import { withActorContext } from '@/lib/db';
import { AUDIT_ACTIONS } from '@/lib/audit';
import { recordPlatformAction } from '@/modules/platform';
import { buildExport, isExportResource } from '@/lib/console/export';

/**
 * `GET /api/platform/export/[resource]`. 17 §6.1.
 *
 * The one download in the console. Workspaces, Revenue, the audit log and the
 * settings panel all point here; the resource catalogue lives in
 * `lib/console/export.ts` and is closed.
 *
 * ⚠ A GET THAT WRITES AN AUDIT ROW, WHICH IS THE POINT RATHER THAN A LAPSE.
 *
 * The rule this codebase follows is that anything which revokes, deletes or
 * spends is a POST. An export does none of those — it reads. It is a GET
 * because a download has to be a link: a POST would mean a form and a
 * client-side fetch that reassembles a blob, which is more moving parts for
 * something a browser does natively.
 *
 * The audit row is not a side effect of the read. It is the record that a
 * named operator took the full roster off the platform, which is exactly the
 * event a security review asks about, and it is written with
 * `usedServiceRole: false` because this read went through Row Level Security
 * like any other.
 *
 * ⚠ REFUSAL IS 404-SHAPED. 07 §1: the console is not visible to somebody
 * without a platform session, so an unauthenticated caller gets "not found"
 * rather than a 403 that confirms the endpoint exists and is worth returning
 * to with better credentials.
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ resource: string }> },
): Promise<NextResponse> {
  const { resource } = await params;

  if (!isExportResource(resource)) {
    return new NextResponse(null, { status: 404 });
  }

  const ctx = await currentPlatformSessionOrNull();
  if (!ctx) {
    return new NextResponse(null, { status: 404 });
  }

  const file = await buildExport(resource, new Date());

  /*
    The row is written AFTER the file is built and BEFORE it is returned. If
    the read fails there is nothing to record; if the write fails the operator
    does not get the file. An export that reaches somebody's laptop with no
    entry in the log is the one outcome this ordering rules out.
  */
  /* ⚠ THE ACTOR CONTEXT, NOT THE EMPTY ONE. `platform_audit_log_insert` admits
     a row only when a `platform_admins` row exists FOR THE CURRENT ACTOR, and
     `withoutTenantContext` sets no actor — so this insert was refused and the
     export failed after the file had already been built. */
  await withActorContext(ctx.actorId, ctx.requestId, async (tx) => {
    await recordPlatformAction(tx, {
      actorUserId: ctx.actorId,
      actorLabel: ctx.actorLabel,
      action: AUDIT_ACTIONS.PLATFORM_EXPORTED,
      entityType: 'export',
      reason: `${resource} · ${file.rows} rows`,
      ipAddress: ctx.ipAddress,
      requestId: ctx.requestId,
    });
  });

  return new NextResponse(file.body, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${file.filename}"`,
      /* A roster is a snapshot of live records. A cached copy served to the
         next operator is a stale answer to a question they asked now. */
      'Cache-Control': 'no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
