import 'server-only';
import { Redis } from '@upstash/redis';
import { logger } from '@/lib/logger';

/**
 * 08 §6 · ADR-006. Upstash Redis, four uses, never a source of truth.
 *
 * THE PROPERTY THAT MAKES THIS SAFE: with Redis switched off entirely, every
 * correctness property in the system still holds. Only speed changes.
 *
 * That is a testable claim and it is tested. `CACHE_DISABLED=true` makes every
 * read return a miss and every write a no-op, and the CI job in 08 §6 runs the
 * entire suite in that mode. If a test fails there, something has started
 * treating the cache as a database and it is a defect, not a flake.
 *
 * A miss and an outage are the same code path, deliberately, so the outage path
 * is exercised on every single miss rather than only during an incident.
 *
 * Adding a fifth use requires a note in 08 §6. Caches accrete, and an
 * uncontrolled cache is how a system becomes impossible to reason about.
 */

export const CACHE_USES = {
  /** Compiled AI rules. Key carries both versions, so a stale key is
   *  unreachable rather than wrong even if a delete fails. 08 §5. */
  compiledRules: (tenantId: string, masterVersion: number, tenantVersion: number) =>
    `compiled:${tenantId}:${masterVersion}:${tenantVersion}`,
  /** Entitlement snapshot with current usage. */
  entitlements: (tenantId: string) => `ent:${tenantId}`,
  /** Credential id, tenant, scopes, status, keyed on a hash of the presented
   *  key. This is what keeps argon2id off the hottest path in the system. */
  credential: (presentedKeyHash: string) => `cred:${presentedKeyHash}`,
  /** Rate limit counter. */
  rateLimit: (key: string, window: string) => `rl:${key}:${window}`,
} as const;

export const CACHE_TTL = {
  compiledRules: 300, // worst-case staleness, published in the service door docs
  entitlements: 60,
  credential: 60,
  rateLimit: 60,
} as const;

function cacheDisabled(): boolean {
  return process.env.CACHE_DISABLED === 'true';
}

let client: Redis | null | undefined;

function getClient(): Redis | null {
  if (client !== undefined) return client;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (cacheDisabled() || !url || !token) {
    client = null;
    return null;
  }

  client = new Redis({ url, token });
  return client;
}

/**
 * Returns null on a miss, on a disabled cache, and on any Redis failure.
 *
 * The catch is not defensive coding. It is the failure mode from 04 §11: Redis
 * unavailable means every read falls through to Postgres, latency rises, and
 * correctness is unaffected. Rethrowing here would turn a cache outage into an
 * application outage, which is exactly the coupling this design avoids.
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = getClient();
  if (!redis) return null;

  try {
    return await redis.get<T>(key);
  } catch (error) {
    logger.warn('cache read failed, falling through to postgres', { key, error });
    return null;
  }
}

export async function cacheSet<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  const redis = getClient();
  if (!redis) return;

  try {
    await redis.set(key, value, { ex: ttlSeconds });
  } catch (error) {
    logger.warn('cache write failed, continuing', { key, error });
  }
}

/**
 * Invalidation is explicit on write, never left to expiry, and it runs BEFORE
 * the mutation returns. That ordering is what makes the five-second contract in
 * 08 §5 honest: by the time the interface says published, the next machine read
 * is already guaranteed to miss.
 */
export async function cacheDelete(...keys: string[]): Promise<void> {
  const redis = getClient();
  if (!redis || keys.length === 0) return;

  try {
    await redis.del(...keys);
  } catch (error) {
    // A failed delete is bounded by the TTL rather than unbounded, which is why
    // the 300s worst case is published rather than hidden. 08 §5.
    logger.error('cache invalidation failed, falling back to ttl expiry', { keys, error });
  }
}

export async function cacheDeleteByPrefix(prefix: string): Promise<void> {
  const redis = getClient();
  if (!redis) return;

  try {
    // Master rules publish invalidates every tenant. At Brian's scale a scan
    // and a pipeline of deletes is correct; past roughly ten thousand tenants
    // this needs a version-prefixed namespace instead. 08 §5.
    let cursor = '0';
    do {
      const [next, keys] = await redis.scan(cursor, { match: `${prefix}*`, count: 500 });
      cursor = String(next);
      if (keys.length > 0) await redis.del(...keys);
    } while (cursor !== '0');
  } catch (error) {
    logger.error('cache prefix invalidation failed, falling back to ttl expiry', {
      prefix,
      error,
    });
  }
}

/**
 * Read through. The loader is the source of truth and always runs on a miss.
 * There is no code path in which a cache absence changes an answer.
 */
export async function cached<T>(
  key: string,
  ttlSeconds: number,
  load: () => Promise<T>,
): Promise<T> {
  const hit = await cacheGet<T>(key);
  if (hit !== null) return hit;

  const value = await load();
  await cacheSet(key, value, ttlSeconds);
  return value;
}

/** Exposed for the health page in 09 §2, which reports hit rate and latency. */
export function cacheStatus(): { enabled: boolean; reason: string } {
  if (cacheDisabled()) return { enabled: false, reason: 'CACHE_DISABLED is set' };
  if (!process.env.UPSTASH_REDIS_REST_URL) {
    return { enabled: false, reason: 'no Upstash credentials configured' };
  }
  return { enabled: true, reason: 'operational' };
}
