/**
 * Subscription status middleware.
 *
 * Runs on every authenticated request and performs two checks:
 * 1. If the user's subscription has expired → downgrade to "free" in the DB.
 * 2. Update the in-memory user object so all downstream code sees the
 *    correct tier (no stale reads within the same request).
 *
 * Place this middleware **after** auth middleware.
 */

import type { Context, Next } from "hono";
import { eq } from "drizzle-orm";
import { createDb } from "@/db";
import { users } from "@/db/schema";
import type { Bindings } from "@/core/types";

export const checkSubscriptionStatus = async (c: Context, next: Next) => {
  const user = c.get("user") as
    | {
        id: string;
        subscriptionTier: string;
        subscriptionExpiresAt: string | null;
      }
    | undefined;

  if (!user) return c.json({ message: "User not found" }, 401);

  if (user.subscriptionTier !== "free" && user.subscriptionExpiresAt) {
    const expiresAt = new Date(user.subscriptionExpiresAt);

    if (expiresAt < new Date()) {
      const db = createDb((c.env as Bindings).DB);

      await db
        .update(users)
        .set({
          subscriptionTier: "free",
          subscriptionExpiresAt: null,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(users.id, user.id));

      user.subscriptionTier = "free";
      user.subscriptionExpiresAt = null;
      c.set("user", user);
    }
  }

  await next();
};
