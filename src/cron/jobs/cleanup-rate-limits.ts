/**
 * Example cron job — purges stale rate-limit entries.
 *
 * The rate-limit middleware does background cleanup per request, but
 * this cron provides a safety net to keep the table small.
 */

import { lt } from "drizzle-orm";
import { createDb } from "@/db";
import { rateLimits } from "@/db/schema";
import type { CronJobHandler } from "@/cron/types";

export const cleanupRateLimits: CronJobHandler = async (env) => {
  console.log("[Cron] Cleaning up stale rate-limit entries...");

  try {
    const db = createDb(env.DB);
    const cutoff = Math.floor(Date.now() / 1000) - 7200; // 2 hours ago

    const deleted = await db
      .delete(rateLimits)
      .where(lt(rateLimits.timestamp, cutoff))
      .returning({ id: rateLimits.id });

    console.log(`[Cron] Removed ${deleted.length} stale rate-limit entries.`);
  } catch (error) {
    console.error("[Cron] Rate-limit cleanup failed:", error);
  }
};
