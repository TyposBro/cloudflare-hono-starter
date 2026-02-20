/**
 * Session tracking middleware (fire-and-forget).
 *
 * Records daily session opens per user via Drizzle ORM. Uses `waitUntil()`
 * so the DB write never blocks the response.
 *
 * Tracks:
 * - `platform`      — android | web | unknown
 * - `requestCount`  — how many requests the user made today
 * - `firstSeenAt`   — first request of the day
 * - `lastSeenAt`    — most recent request of the day
 */

import type { Context, Next } from "hono";
import { sql } from "drizzle-orm";
import { createDb } from "@/db";
import { sessionOpens } from "@/db/schema";
import type { Bindings } from "@/core/types";

export function detectPlatform(c: Context): string {
  if (c.req.header("X-App-Version")) return "android";
  if ((c.req.header("User-Agent") ?? "").includes("Mozilla")) return "web";
  return "unknown";
}

async function trackSessionToDb(
  d1: D1Database,
  userId: string,
  platform: string
): Promise<void> {
  const db = createDb(d1);
  const now = new Date().toISOString();
  const date = now.slice(0, 10); // YYYY-MM-DD

  await db
    .insert(sessionOpens)
    .values({
      userId,
      date,
      platform,
      requestCount: 1,
      firstSeenAt: now,
      lastSeenAt: now,
    })
    .onConflictDoUpdate({
      target: [sessionOpens.userId, sessionOpens.date],
      set: {
        requestCount: sql`${sessionOpens.requestCount} + 1`,
        lastSeenAt: now,
      },
    });
}

/**
 * Middleware that tracks sessions in the background.
 * Must run **after** auth middleware so `c.get("user")` is available.
 */
export function sessionTracking(getDb: (env: Bindings) => D1Database) {
  return async (c: Context, next: Next) => {
    await next();

    // Fire-and-forget — never blocks the response
    const user = c.get("user") as { id: string } | undefined;
    if (user) {
      const platform = detectPlatform(c);
      c.executionCtx?.waitUntil(
        trackSessionToDb(getDb(c.env as Bindings), user.id, platform).catch(
          (e) => console.error("[SessionTracking]", e)
        )
      );
    }
  };
}
