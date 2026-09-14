import 'server-only';
import type { NextRequest } from 'next/server';
import { CACHE_TTL, CACHE_USES, cacheIncrement } from '@/lib/cache';
import { AppError, ERROR_CODES } from '@/lib/errors';
import { logger } from '@/lib/logger';

/**
 * 04 §1 · 07 §1. RATE LIMITING ON THE PUBLIC DOORS.
 *
 * ⚠ THE COUNTER AND ITS TTL EXISTED FROM THE BEGINNING AND NOTHING EVER
 *   CALLED THEM.
 *
 * `CACHE_USES.rateLimit` and `CACHE_TTL.rateLimit` have been in the cache
 * module since it was written, listed as one of the four scoped uses ADR-006
 * permits. No code invoked either. `04 §1` places rate limiting at the edge,
 * before session resolve; there was nothing there.
 *
 * The exposure was the four public auth routes and invitation acceptance —
 * every endpoint reachable without a session. Supabase applies its own limits
 * to sign-in and password reset, which is why this was not catastrophic, but
 * it left invitation acceptance and our own handlers unprotected, and it
 * meant an attacker could burn Supabase's per-address budget for a real user
 * at whatever rate they liked.
 *
 * ⚠ IT FAILS OPEN, DELIBERATELY, AND THAT IS NOT A COMPROMISE.
 *
 * `cacheIncrement` returns null when Redis is absent or unreachable, and this
 * treats null as "allowed". `CACHE_DISABLED=true` is a supported mode with a
 * CI job dedicated to proving the product works in it (definition of done,
 * condition 9). A limiter that failed closed would take the whole application
 * down whenever the cache blinked — converting a latency problem into an
 * outage, which is the exact coupling `04 §11` exists to prevent.
 *
 * Rate limiting is a mitigation. It is not what makes the system correct:
 * correctness is the policies, and they do not depend on Redis being up.
 */

export type RateLimitRule = {
  /** How many requests are permitted inside one window. */
  limit: number;
  /** Window length in seconds. Defaults to the shared 60s in CACHE_TTL. */
  windowSeconds?: number;
  /** Names the bucket, so sign-in attempts and invitation lookups do not
   *  share a budget. */
  bucket: string;
};

/**
 * ⚠ THE CLIENT ADDRESS, AND ONLY THE FIRST ENTRY.
 *
 * Behind Vercel, `x-forwarded-for` is a list: the client first, then each
 * proxy. Keying on the whole header would give every proxy path its own
 * budget, which is a limiter an attacker can reset by changing route. Taking
 * the last entry is the opposite mistake — that is the proxy nearest us, and
 * every request would share one bucket.
 *
 * A caller can forge this header, and that is worth being honest about: it is
 * why this is a mitigation against volume rather than a control against a
 * determined attacker. `04 §1` puts a WAF in front of the application for
 * that; this is the layer behind it.
 */
function clientKey(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const real = request.headers.get('x-real-ip')?.trim();
  return forwarded || real || 'unknown';
}

/**
 * Consumes one unit from the caller's budget, or throws.
 *
 * Throws `AppError(RATE_LIMIT_EXCEEDED)`, which the catalogue maps to 429 and
 * `jsonError` decorates with `Retry-After` — so a caller is told how long to
 * wait rather than being left to guess. That wiring already existed; nothing
 * had ever raised the error to use it.
 *
 * `identifier` narrows the bucket beyond the address where a route has
 * something better: an email address on sign-in means one person's failed
 * attempts do not consume the budget of everybody else behind the same
 * corporate NAT. It is lowercased and never logged — `05 I-16` keeps
 * addresses out of log lines, and the key is a cache key rather than a record.
 */
export async function enforceRateLimit(
  request: NextRequest,
  rule: RateLimitRule,
  identifier?: string,
): Promise<void> {
  const windowSeconds = rule.windowSeconds ?? CACHE_TTL.rateLimit;

  // The window is part of the key, so a counter cannot outlive its window even
  // if the TTL fails to apply — a fixed window rather than a sliding one,
  // which is the cheaper correct thing at this scale.
  const window = String(Math.floor(Date.now() / 1000 / windowSeconds));
  const subject = identifier ? `${rule.bucket}:${identifier.trim().toLowerCase()}` : rule.bucket;
  const key = CACHE_USES.rateLimit(`${subject}:${clientKey(request)}`, window);

  const count = await cacheIncrement(key, windowSeconds);

  // No cache, no limit. See the note at the top of this file.
  if (count === null) return;

  if (count > rule.limit) {
    // Logged without the identifier, so a burst of failed sign-ins does not
    // write a list of attempted addresses into log aggregation.
    logger.warn('rate limit exceeded', {
      bucket: rule.bucket,
      limit: rule.limit,
      windowSeconds,
    });

    throw new AppError(ERROR_CODES.RATE_LIMIT_EXCEEDED, {
      message: `Too many attempts. Wait ${windowSeconds} seconds and try again.`,
      internal: { retryAfter: windowSeconds, bucket: rule.bucket, count },
    });
  }
}

/**
 * The rules, in one place.
 *
 * ⚠ THESE ARE PER ADDRESS PER WINDOW, NOT PER ACCOUNT.
 *
 * The numbers are deliberately generous for a human and tight for a script.
 * Five sign-in attempts a minute is more than anyone types by hand and far
 * less than a credential-stuffing run needs to be useful. The reset and
 * invitation buckets are tighter still, because both send email — an
 * unlimited reset endpoint is a way to have us deliver somebody's mail for
 * them.
 */
export const RATE_LIMITS = {
  signIn: { bucket: 'auth:sign-in', limit: 5, windowSeconds: 60 },
  passwordForgot: { bucket: 'auth:password-forgot', limit: 3, windowSeconds: 300 },
  passwordReset: { bucket: 'auth:password-reset', limit: 5, windowSeconds: 300 },
  /** Reading an invitation is harmless; guessing at tokens is not. Generous
   *  enough that a recipient refreshing the page is unaffected. */
  invitationRead: { bucket: 'invitation:read', limit: 20, windowSeconds: 60 },
  /** Accepting creates an account, so it is the tightest of the five. */
  invitationAccept: { bucket: 'invitation:accept', limit: 5, windowSeconds: 300 },
  /**
   * Registration creates a TENANT — four rows and an outbound mail — from an
   * unauthenticated request, which makes it the most expensive thing the
   * public can ask this application to do. Three per five minutes is a
   * generous allowance for a person mistyping a password and a poor one for
   * anybody enumerating workspace names.
   */
  signUp: { bucket: 'auth:sign-up', limit: 3, windowSeconds: 300 },
  /** Resending confirmation is us delivering somebody's mail for them, so it
   *  is held to the same bar as the forgot-password send. */
  verifyEmailResend: { bucket: 'auth:verify-resend', limit: 3, windowSeconds: 300 },
} as const satisfies Record<string, RateLimitRule>;
