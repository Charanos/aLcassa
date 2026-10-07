import { and, desc, eq, isNull } from 'drizzle-orm';
import { tenantMembers, userProfiles } from '@/db/schema';
import { resolveSessionDoor } from '@/lib/auth/resolve';
import { withTenantContext } from '@/lib/db';
import { defineRoute } from '@/lib/http/pipeline';
import { jsonOk } from '@/lib/http/response';

/** Every member may read the team; database policies restrict changes and visible profiles. */
export const GET = defineRoute({
  door: 'session',
  resolve: resolveSessionDoor,
  handle: async ({ ctx, requestId }) => {
    const rows = await withTenantContext(ctx, async (tx) =>
      tx
        .select({
          id: tenantMembers.id,
          userId: tenantMembers.userId,
          role: tenantMembers.role,
          status: tenantMembers.status,
          joinedAt: tenantMembers.joinedAt,
          fullName: userProfiles.fullName,
          avatarPath: userProfiles.avatarPath,
        })
        .from(tenantMembers)
        .leftJoin(userProfiles, eq(userProfiles.id, tenantMembers.userId))
        .where(and(eq(tenantMembers.tenantId, ctx.tenantId), isNull(tenantMembers.deletedAt)))
        .orderBy(desc(tenantMembers.role), tenantMembers.createdAt),
    );

    return jsonOk(
      rows.map((row) => ({
        id: row.id,
        userId: row.userId,
        role: row.role,
        status: row.status,
        joinedAt: row.joinedAt?.toISOString() ?? null,
        // A profile row can be absent for an invited member who has not
        // accepted yet. The list still has to render, so the name falls back
        // rather than the request failing.
        fullName: row.fullName ?? 'Pending',
        avatarPath: row.avatarPath ?? null,
        isYou: row.userId === ctx.actorId,
      })),
      { requestId, meta: { total: rows.length } },
    );
  },
});
