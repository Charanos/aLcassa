import 'server-only';
import type { ResolvedContext } from '@/lib/db/context';
import { AppError, ERROR_CODES } from '@/lib/errors';
import { logger } from '@/lib/logger';
import contract from './serviceBudget.json';

function positiveSetting(name: string, fallback: number, maximum: number): number {
  const value = process.env[name];
  if (value === undefined || value === '') return fallback;
  if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > maximum) {
    throw new AppError(ERROR_CODES.UPSTREAM_UNAVAILABLE);
  }
  return Number(value);
}

/** One anchored window per authenticated tenant, shared with the Python API.
 * Refusals do not consume slots. Redis loss leaves database authorization intact.
 */
export async function enforceTenantBudget(ctx: ResolvedContext): Promise<void> {
  if (ctx.actorType === 'platform_admin' || ctx.supportMode) return;
  const limit = positiveSetting('SERVICE_RATE_LIMIT', contract.defaultLimit, 1_000_000);
  const window = positiveSetting(
    'SERVICE_RATE_WINDOW_SECONDS',
    contract.defaultWindowSeconds,
    86_400,
  );
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (process.env.CACHE_DISABLED === 'true' || !url || !token) return;

  let result: [number, number, number];
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([
        'EVAL',
        contract.script,
        '1',
        `${contract.prefix}${ctx.tenantId}`,
        String(limit),
        String(window),
      ]),
      signal: AbortSignal.timeout(2_000),
      cache: 'no-store',
    });
    if (!response.ok) throw new Error('Redis unavailable');
    const body = (await response.json()) as { result?: unknown };
    if (!Array.isArray(body.result) || body.result.length !== 3)
      throw new Error('Invalid Redis response');
    const [allowed, count, retry] = body.result as unknown[];
    if (
      typeof allowed !== 'number' ||
      typeof count !== 'number' ||
      typeof retry !== 'number' ||
      ![allowed, count, retry].every(Number.isSafeInteger) ||
      ![0, 1].includes(allowed) ||
      count < 0 ||
      retry < 1
    ) {
      throw new Error('Invalid Redis response');
    }
    result = [allowed, count, retry];
  } catch {
    logger.warn('tenant request budget unavailable; database authorization remains required');
    return;
  }
  const [allowed, , retryAfter] = result;
  if (!allowed) {
    throw new AppError(ERROR_CODES.RATE_LIMIT_EXCEEDED, { internal: { retryAfter } });
  }
}
