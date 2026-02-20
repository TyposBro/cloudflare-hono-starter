/**
 * IP-based rate limiting middleware using D1 + Drizzle as the backing store.
 *
 * Uses a sliding-window algorithm:
 * 1. Count requests from this IP within the last `windowSeconds`.
 * 2. If over `limit`, return 429 with standard rate-limit headers.
 * 3. Otherwise, record the request and continue.
 *
 * Old entries are cleaned up in the background (non-blocking) so the
 * rate_limits table stays small.
 *
 * @example
 *   // 10 req/min on all auth routes
 *   app.use("/api/auth/*", rateLimit({ limit: 10, windowSeconds: 60 }));
 *
 *   // 3 req/15min on password reset
 *   app.post("/api/auth/reset", sensitiveRateLimit, handler);
 */

import { and, eq, gte, lt, sql } from "drizzle-orm";
import { createDb } from "@/db";
import { rateLimits } from "@/db/schema";
import type { AppContext } from "@/core/types";

interface RateLimitConfig {
  /** Maximum requests allowed in the window. */
  limit: number;
  /** Time window in seconds. */
  windowSeconds: number;
  /** Key prefix to separate different limiters. */
  keyPrefix?: string;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  limit: 10,
  windowSeconds: 60,
  keyPrefix: "default",
};

function getClientIP(c: AppContext): string {
  const cfIP = c.req.header("CF-Connecting-IP");
  if (cfIP) return cfIP;

  const xff = c.req.header("X-Forwarded-For");
  if (xff) return xff.split(",")[0].trim();

  return "unknown";
}

export function rateLimit(config: Partial<RateLimitConfig> = {}) {
  const { limit, windowSeconds, keyPrefix } = { ...DEFAULT_CONFIG, ...config };

  return async (c: AppContext, next: () => Promise<void>) => {
    const ip = getClientIP(c);
    const key = `ratelimit:${keyPrefix}:${ip}`;
    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - windowSeconds;

    try {
      const db = createDb(c.env.DB);

      const [result] = await db
        .select({ count: sql<number>`count(*)` })
        .from(rateLimits)
        .where(and(eq(rateLimits.key, key), gte(rateLimits.timestamp, windowStart)));

      const currentCount = result?.count ?? 0;

      // Background cleanup — non-blocking, errors silenced
      c.executionCtx?.waitUntil(
        (async () => {
          const cleanupDb = createDb(c.env.DB);
          await cleanupDb
            .delete(rateLimits)
            .where(lt(rateLimits.timestamp, windowStart - 3600));
        })().catch(() => {})
      );

      if (currentCount >= limit) {
        return c.json(
          { message: "Too many requests. Please try again later.", retryAfter: windowSeconds },
          429,
          {
            "Retry-After": String(windowSeconds),
            "X-RateLimit-Limit": String(limit),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(now + windowSeconds),
          }
        );
      }

      await db.insert(rateLimits).values({ key, timestamp: now });

      c.header("X-RateLimit-Limit", String(limit));
      c.header("X-RateLimit-Remaining", String(limit - currentCount - 1));
      c.header("X-RateLimit-Reset", String(now + windowSeconds));

      await next();
    } catch (error) {
      // If rate-limit infra fails, allow the request but log the error
      console.error("[RateLimit] Error:", error);
      await next();
    }
  };
}

// ── Presets ────────────────────────────────────────────

/** Standard auth rate limit — 20 req/min. */
export const authRateLimit = rateLimit({ limit: 20, windowSeconds: 60, keyPrefix: "auth" });

/** Strict rate limit — 5 req/5min. */
export const strictRateLimit = rateLimit({ limit: 5, windowSeconds: 300, keyPrefix: "strict" });

/** Sensitive operations — 3 req/15min (password reset, etc.). */
export const sensitiveRateLimit = rateLimit({ limit: 3, windowSeconds: 900, keyPrefix: "sensitive" });
