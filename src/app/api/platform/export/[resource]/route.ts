import { NextResponse, type NextRequest } from 'next/server';
import { currentPlatformSessionOrNull } from '@/lib/auth/resolve';
import { withActorContext } from '@/lib/db';
import { AUDIT_ACTIONS } from '@/lib/audit';
import { recordPlatformAction } from '@/modules/platform';
import { buildExport, isExportResource } from '@/lib/console/export';

/** Exports use a closed resource catalogue and require an audit entry before returning the file. */

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

  /* Build the file before auditing; refuse delivery if the audit write fails. */
  /* Use actor context so the export audit insert satisfies the platform-admin policy. */
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
