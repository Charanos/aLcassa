import 'server-only';
import type { NextRequest, NextResponse } from 'next/server';
import type { z } from 'zod';
import { AppError, ERROR_CODES, validationFailed } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { hasRole, type ResolvedContext, type TenantRole } from '@/lib/db/context';
import { assertEntitlement, type EntitlementKey } from '@/modules/entitlements';
import { jsonError } from './response';
import { enforceTenantBudget } from './serviceBudget';

/**
 * 04 §2. THE REQUEST PIPELINE.
 *
 * Every request through both doors passes the same six stages, in the same
 * order, implemented once:
 *
 *   1 · AUTHENTICATE   session cookie → Supabase Auth
 *                      API key       → credential lookup
 *   2 · RESOLVE TENANT session: the membership row for this actor
 *                      key:     the tenant on the credential
 *                      → sets the RLS context on the connection
 *                      → NEVER reads tenant_id from a body, query or header
 *   3 · AUTHORISE      role check, or scope check on the service door
 *   4 · ENTITLE        checkEntitlement. ONE function, both doors
 *   5 · HANDLE         the business operation, inside a transaction
 *   6 · AUDIT          written in the same transaction as the operation
 *
 * Stages 1 and 3 legitimately differ by door. Stages 2, 4 and 6 are identical
 * implementations, and that identity is the answer to the open question in the
 * brief. 01 D-04.
 */

export type Door = 'session' | 'service' | 'platform';

export type Resolver = (request: NextRequest, requestId: string) => Promise<ResolvedContext>;

export type HandlerContext<TBody, TParams> = {
  ctx: ResolvedContext;
  body: TBody;
  params: TParams;
  request: NextRequest;
  requestId: string;
};

export type RouteDefinition<TBody, TParams> = {
  door: Door;
  /** Stage 1 and 2. Supplied by src/lib/auth, one per door. */
  resolve: Resolver;
  /** Stage 3, session door. Omit for a route every role may reach. */
  roles?: TenantRole[];
  /** Stage 3, service door. A credential lacking this never reaches the
   *  handler, which is condition 10 of the definition of done. */
  scope?: string;
  /** Stage 4. The delta a successful call would consume. */
  entitlement?: { key: EntitlementKey; delta?: number };
  /** Stage 5 input validation. Zod at every boundary, 422 with field detail. */
  bodySchema?: z.ZodType<TBody>;
  paramsSchema?: z.ZodType<TParams>;
  handle: (context: HandlerContext<TBody, TParams>) => Promise<NextResponse<unknown>>;
};

/**
 * 07 §1. `X-Request-Id` is accepted, generated if absent, echoed always, and
 * appears in every log line and every audit row. It is what a support
 * conversation is conducted in: "reference {requestId} if you get in touch".
 */
function resolveRequestId(request: NextRequest): string {
  const supplied = request.headers.get('x-request-id');
  if (supplied && /^[A-Za-z0-9_-]{8,64}$/.test(supplied)) return supplied;
  return crypto.randomUUID();
}

export function defineRoute<TBody = undefined, TParams = undefined>(
  definition: RouteDefinition<TBody, TParams>,
) {
  return async function route(
    request: NextRequest,
    segment: { params: Promise<Record<string, string>> },
  ): Promise<NextResponse<unknown>> {
    const requestId = resolveRequestId(request);
    const startedAt = performance.now();
    const log = logger.child({ requestId, door: definition.door, route: request.nextUrl.pathname });

    try {
      // ─ 1 and 2 · authenticate, then resolve the tenant server side ─────────
      const ctx = await definition.resolve(request, requestId);

      // ─ 3 · authorise ───────────────────────────────────────────────────────
      if (definition.roles && !hasRole(ctx, ...definition.roles)) {
        // Note this is a 403 and not a 404: the resource is in THIS tenant and
        // the caller simply may not act on it. A cross-tenant resource never
        // reaches this line, because RLS returned zero rows and the handler
        // raised notFound(). 07 §1.
        throw new AppError(ERROR_CODES.SUPPORT_NOT_PERMITTED, {
          message: `Only the ${definition.roles.join(' or ')} can do this.`,
          internal: { requiredRoles: definition.roles, actualRole: ctx.role },
        });
      }

      if (definition.scope && !ctx.scopes.includes(definition.scope)) {
        throw new AppError(ERROR_CODES.CREDENTIAL_SCOPE_MISSING, {
          message: `This credential does not have the ${definition.scope} scope. Add it in the dashboard under API credentials.`,
          details: [
            {
              field: 'scope',
              code: ERROR_CODES.CREDENTIAL_SCOPE_MISSING,
              message: definition.scope,
            },
          ],
        });
      }

      // ─ 4 · entitle. The same call, from both doors. ────────────────────────
      if (definition.entitlement) {
        await assertEntitlement(ctx, definition.entitlement.key, definition.entitlement.delta ?? 1);
      }

      // ─ 5 · validate, then handle ───────────────────────────────────────────
      const rawParams = await segment.params;

      const params = definition.paramsSchema
        ? parse(definition.paramsSchema, rawParams)
        : (undefined as TParams);

      const body = definition.bodySchema
        ? parse(definition.bodySchema, await readJson(request))
        : (undefined as TBody);

      if (definition.door !== 'platform') await enforceTenantBudget(ctx);
      const response = await definition.handle({ ctx, body, params, request, requestId });

      log.info('request completed', {
        tenantId: ctx.tenantId,
        actorId: ctx.actorId,
        actorType: ctx.actorType,
        supportMode: ctx.supportMode,
        status: response.status,
        durationMs: Math.round(performance.now() - startedAt),
      });

      response.headers.set('X-Request-Id', requestId);
      return response;
    } catch (error) {
      const response = jsonError(error, requestId);

      log[response.status >= 500 ? 'error' : 'warn']('request failed', {
        status: response.status,
        durationMs: Math.round(performance.now() - startedAt),
        error,
      });

      return response;
    }
  };
}

async function readJson(request: NextRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new AppError(ERROR_CODES.VALIDATION_FAILED, {
      message: 'The request body is not valid JSON.',
    });
  }
}

/** Zod at every boundary. 422 with field-level detail. 07 §1. */
function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (result.success) return result.data;

  throw validationFailed(
    result.error.issues.map((issue) => ({
      field: issue.path.join('.') || '_',
      code: issue.code,
      message: issue.message,
    })),
  );
}
