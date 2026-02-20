/**
 * Example cron job — downgrades users whose subscription has expired.
 *
 * This is a "heavy operation" best scheduled during low-traffic hours.
 */

import { and, isNotNull, lt } from "drizzle-orm";
import { createDb } from "@/db";
import { users } from "@/db/schema";
import type { CronJobHandler } from "@/cron/types";

export const cleanupExpiredSubscriptions: CronJobHandler = async (env) => {
  console.log("[Cron] Starting expired subscription cleanup...");

  try {
    const db = createDb(env.DB);
    const now = new Date().toISOString();

    const downgraded = await db
      .update(users)
      .set({
        subscriptionTier: "free",
        subscriptionExpiresAt: null,
        updatedAt: now,
      })
      .where(
        and(
          isNotNull(users.subscriptionExpiresAt),
          lt(users.subscriptionExpiresAt, now)
        )
      )
      .returning({ id: users.id });

    console.log(`[Cron] Cleanup complete. Downgraded ${downgraded.length} users.`);
  } catch (error) {
    console.error("[Cron] Failed to downgrade subscriptions:", error);
  }
};
