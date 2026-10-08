import { defineRoute } from '@/lib/http/pipeline';
import { jsonOk } from '@/lib/http/response';
import { resolveSessionDoor } from '@/lib/auth/resolve';
import { readTenantRules } from '@/modules/aiRules';

export const GET = defineRoute({
  door: 'session',
  resolve: resolveSessionDoor,
  handle: async ({ ctx, requestId }) => {
    const { master, current: workspace, revision } = await readTenantRules(ctx);
    const current = {
      master,
      current: workspace
        ? {
            id: workspace.id,
            versionNumber: workspace.versionNumber,
            content: workspace.content,
            publishedAt: workspace.publishedAt,
          }
        : null,
      revision,
    };
    return jsonOk(current, { requestId, headers: { 'Cache-Control': 'no-store' } });
  },
});
