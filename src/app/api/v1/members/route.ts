import { and, desc, eq, isNull } from 'drizzle-orm';
import { tenantMembers, userProfiles } from '@/db/schema';
import { resolveSessionDoor } from '@/lib/auth/resolve';
import { withTenantContext } from '@/lib/db';
import { defineRoute } from '@/lib/http/pipeline';
import { jsonOk } from '@/lib/http/response';

/**
 * 07 §5 · `GET /v1/members`. Every role may read the team.
 *
 * No `roles` clause, and that is the specification rather than an omission:
 * an agent who cannot see who else is in the workspace cannot tell who to ask
 * for help. What an agent cannot do is CHANGE any of it, which is enforced by
 * `tenant_members_modify` in the database rather than by a check here.
 *
 * The join to `user_profiles` is what makes the list legible, and it is worth
 * noticing that it works at all: `user_profiles_select` admits "myself, and
 * anyone I share a tenant with", so this returns exactly the profiles of
 * people in THIS workspace and no others. The scoping is the policy's, not
 * this query's — the `where` clause below could be deleted and the result
 * would still not cross a tenant boundary.
 */
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
