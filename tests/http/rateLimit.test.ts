import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * 04 §1. THE RATE LIMITER.
 *
 * ⚠ THE SECOND CASE MATTERS MORE THAN THE FIRST.
 *
 * "It refuses the sixth attempt" is the obvious property. "It ALLOWS the
 * sixth attempt when Redis is off" is the one that decides whether a cache
 * outage becomes an application outage — and it is the one a future edit is
 * most likely to break, because failing closed feels safer in the moment.
 *
 * `CACHE_DISABLED=true` is a supported mode with a CI job dedicated to
 * proving the product works in it (definition of done, condition 9). A
 * limiter that failed closed would break that job and, in production, would
 * take sign-in down the moment Upstash blinked.
 *
 * These run without a database. The limiter's only dependency is the cache,
 * which is stubbed here so the counter is deterministic.
 */

// The counter, replaced per test so each case starts from zero.
let counter: Map<string, number>;
let incrementCalls: number;
let cacheAvailable: boolean;

vi.mock('@/lib/cache', () => ({
  CACHE_TTL: { rateLimit: 60 },
  CACHE_USES: {
    rateLimit: (key: string, window: string) => `rl:${key}:${window}`,
  },
  cacheIncrement: (key: string) => {
    incrementCalls += 1;
    // Null is what the real implementation returns with no cache configured
    // or on any Redis failure — the branch the fail-open behaviour rests on.
    if (!cacheAvailable) return Promise.resolve(null);
    const next = (counter.get(key) ?? 0) + 1;
    counter.set(key, next);
    return Promise.resolve(next);
  },
}));

const { RATE_LIMITS, enforceRateLimit } = await import('../../src/lib/http/rateLimit');
const { isAppError } = await import('../../src/lib/errors');

/** A request carrying a client address, which is what the key is built from. */
function requestFrom(ip: string): Parameters<typeof enforceRateLimit>[0] {
  return {
    headers: new Headers({ 'x-forwarded-for': ip }),
  } as Parameters<typeof enforceRateLimit>[0];
}

beforeEach(() => {
  counter = new Map();
  incrementCalls = 0;
  cacheAvailable = true;
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('rate limiter · enforcement', () => {
  it('admits requests up to the limit and refuses the one after', async () => {
    const rule = { bucket: 'test', limit: 3, windowSeconds: 60 };
    const request = requestFrom('203.0.113.10');

    // Three are permitted.
    await expect(enforceRateLimit(request, rule)).resolves.toBeUndefined();
    await expect(enforceRateLimit(request, rule)).resolves.toBeUndefined();
    await expect(enforceRateLimit(request, rule)).resolves.toBeUndefined();

    // The fourth is not.
    await expect(enforceRateLimit(request, rule)).rejects.toThrow();
  });

  it('refuses with a code the envelope turns into a 429 and a Retry-After', async () => {
    const rule = { bucket: 'test', limit: 1, windowSeconds: 90 };
    const request = requestFrom('203.0.113.11');

    await enforceRateLimit(request, rule);

    try {
      await enforceRateLimit(request, rule);
      expect.unreachable('the second request should have been refused');
    } catch (error) {
      expect(isAppError(error)).toBe(true);
      if (!isAppError(error)) return;
      expect(error.code).toBe('rate_limit.exceeded');
      // `jsonError` reads this to set the header. Without it the caller is
      // told to wait and not told how long.
      expect(error.internal?.retryAfter).toBe(90);
    }
  });

  it('gives each address its own budget', async () => {
    const rule = { bucket: 'test', limit: 1, windowSeconds: 60 };

    await enforceRateLimit(requestFrom('203.0.113.20'), rule);
    // A different caller is unaffected by the first one's usage.
    await expect(enforceRateLimit(requestFrom('203.0.113.21'), rule)).resolves.toBeUndefined();
  });

  /**
   * The identifier is what stops one person's failed sign-ins consuming the
   * budget of everybody else behind the same corporate NAT.
   */
  it('gives each identifier its own budget within one address', async () => {
    const rule = { bucket: 'auth', limit: 1, windowSeconds: 60 };
    const request = requestFrom('203.0.113.30');

    await enforceRateLimit(request, rule, 'alice@example.test');
    await expect(enforceRateLimit(request, rule, 'bob@example.test')).resolves.toBeUndefined();

    // ...and the same identifier is still limited.
    await expect(enforceRateLimit(request, rule, 'alice@example.test')).rejects.toThrow();
  });

  it('treats an identifier case-insensitively, so casing cannot buy a fresh budget', async () => {
    const rule = { bucket: 'auth', limit: 1, windowSeconds: 60 };
    const request = requestFrom('203.0.113.31');

    await enforceRateLimit(request, rule, 'Alice@Example.test');
    await expect(enforceRateLimit(request, rule, 'alice@example.TEST')).rejects.toThrow();
  });

  it('gives each bucket its own budget', async () => {
    const request = requestFrom('203.0.113.40');

    await enforceRateLimit(request, { bucket: 'one', limit: 1, windowSeconds: 60 });
    // Signing in should not consume the invitation budget.
    await expect(
      enforceRateLimit(request, { bucket: 'two', limit: 1, windowSeconds: 60 }),
    ).resolves.toBeUndefined();
  });

  it('keys on the first x-forwarded-for entry, not the whole proxy chain', async () => {
    const rule = { bucket: 'test', limit: 1, windowSeconds: 60 };

    // Same client, two different proxy paths. Keying on the whole header
    // would give the second one a fresh budget — a limiter an attacker
    // resets by changing route.
    const viaProxyA = {
      headers: new Headers({ 'x-forwarded-for': '203.0.113.50, 198.51.100.1' }),
    } as Parameters<typeof enforceRateLimit>[0];
    const viaProxyB = {
      headers: new Headers({ 'x-forwarded-for': '203.0.113.50, 198.51.100.9' }),
    } as Parameters<typeof enforceRateLimit>[0];

    await enforceRateLimit(viaProxyA, rule);
    await expect(enforceRateLimit(viaProxyB, rule)).rejects.toThrow();
  });
});

describe('rate limiter · failing open', () => {
  /**
   * ⚠ THE CASE THAT PROTECTS THE CACHE-DISABLED CI JOB AND PRODUCTION ALIKE.
   */
  it('allows every request when there is no cache', async () => {
    cacheAvailable = false;
    const rule = { bucket: 'test', limit: 1, windowSeconds: 60 };
    const request = requestFrom('203.0.113.60');

    // Far past the limit, all permitted.
    for (let i = 0; i < 20; i += 1) {
      await expect(enforceRateLimit(request, rule)).resolves.toBeUndefined();
    }

    // It still ASKED — the limiter is wired, it simply got no answer. A
    // version that skipped the call entirely would pass this test and stop
    // limiting the moment the cache came back.
    expect(incrementCalls).toBe(20);
  });
});

describe('rate limiter · the configured rules', () => {
  it('is tightest on the endpoints that send email or create accounts', () => {
    // 04 §1. An unlimited reset endpoint is a way to have us deliver
    // somebody else's mail; accepting an invitation creates an account on a
    // public URL. Both are stricter than sign-in, which Supabase also limits.
    expect(RATE_LIMITS.passwordForgot.limit).toBeLessThan(RATE_LIMITS.signIn.limit);
    expect(RATE_LIMITS.invitationAccept.limit).toBeLessThanOrEqual(RATE_LIMITS.signIn.limit);

    // ...and their windows are longer, so the budget is genuinely smaller
    // rather than merely a smaller number over a shorter period.
    expect(RATE_LIMITS.passwordForgot.windowSeconds).toBeGreaterThan(
      RATE_LIMITS.signIn.windowSeconds,
    );
  });

  it('gives every rule a distinct bucket', () => {
    const buckets = Object.values(RATE_LIMITS).map((r) => r.bucket);
    // A shared bucket would let one endpoint exhaust another's budget.
    expect(new Set(buckets).size).toBe(buckets.length);
  });
});
