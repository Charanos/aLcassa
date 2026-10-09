import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createResolvedContext } from '@/lib/db/context';
import { enforceTenantBudget } from '@/lib/http/serviceBudget';
import { jsonError } from '@/lib/http/response';
import contract from '@/lib/http/serviceBudget.json';

const ctx = createResolvedContext({
  tenantId: 'stored-tenant',
  actorId: 'stored-user',
  actorLabel: 'Test',
  actorType: 'user',
  role: 'owner',
  supportMode: false,
  requestId: 'budget-test',
});

describe('shared tenant request budget', () => {
  const fetcher = vi.fn();
  beforeEach(() => {
    vi.stubGlobal('fetch', fetcher);
    fetcher.mockReset();
    vi.stubEnv('CACHE_DISABLED', 'false');
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'http://127.0.0.1:8079');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'test-token');
    vi.stubEnv('SERVICE_RATE_LIMIT', '10');
    vi.stubEnv('SERVICE_RATE_WINDOW_SECONDS', '60');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });
  it('uses the resolved tenant and shared Lua contract', async () => {
    fetcher.mockResolvedValue(Response.json({ result: [1, 1, 60] }));
    await enforceTenantBudget(ctx);
    const options = fetcher.mock.calls[0]![1] as RequestInit;
    if (typeof options.body !== 'string') throw new Error('Expected a JSON command');
    expect(JSON.parse(options.body)).toEqual([
      'EVAL',
      contract.script,
      '1',
      'rl:service:v1:stored-tenant',
      '10',
      '60',
    ]);
    expect(options.cache).toBe('no-store');
  });
  it('returns 429 and the server TTL as Retry-After', async () => {
    fetcher.mockResolvedValue(Response.json({ result: [0, 10, 23] }));
    const error = await enforceTenantBudget(ctx).catch((value: unknown) => value);
    const response = jsonError(error, 'budget-reference');
    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('23');
  });
  it('leaves platform and support requests outside tenant budgets', async () => {
    await enforceTenantBudget({ ...ctx, actorType: 'platform_admin' });
    await enforceTenantBudget({ ...ctx, supportMode: true });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('skips Redis in the supported cache-disabled mode', async () => {
    vi.stubEnv('CACHE_DISABLED', 'true');
    await enforceTenantBudget(ctx);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('fails open on transport and malformed Redis replies', async () => {
    fetcher.mockRejectedValueOnce(new Error('private transport details'));
    await expect(enforceTenantBudget(ctx)).resolves.toBeUndefined();
    fetcher.mockResolvedValue(Response.json({ result: [0, 10, -1] }));
    await expect(enforceTenantBudget(ctx)).resolves.toBeUndefined();
  });
  it('refuses invalid operator configuration instead of silently disabling the budget', async () => {
    vi.stubEnv('SERVICE_RATE_LIMIT', '-1');
    const error = await enforceTenantBudget(ctx).catch((value: unknown) => value);
    expect(jsonError(error, 'invalid-budget').status).toBe(503);
    expect(fetcher).not.toHaveBeenCalled();
  });
});
