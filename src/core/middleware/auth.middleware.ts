/**
 * Authentication middleware.
 *
 * Validates the `Authorization: Bearer <token>` header, decodes the JWT,
 * loads the user from the database, and sets `c.set("user", user)`.
 *
 * Follows the **Dependency Inversion Principle**: the middleware is a factory
 * that accepts a `getDb` function, so the same logic works with any D1 binding.
 *
 * Usage:
 *   // Default – uses the main DB binding
 *   app.use("/*", protectAndLoadUser);
 *
 *   // Custom – uses a different DB
 *   app.use("/*", createAuthMiddleware((env) => env.OTHER_DB));
 */

import type { MiddlewareHandler } from "hono";
import { eq } from "drizzle-orm";
import { createDb } from "@/db";
import { users } from "@/db/schema";
import { verifyToken } from "@/core/utils/tokens";
import type { Bindings, Variables } from "@/core/types";

export function createAuthMiddleware(
  getDb: (env: Bindings) => D1Database
): MiddlewareHandler<{ Bindings: Bindings; Variables: Variables }> {
  return async (c, next) => {
    const header = c.req.header("Authorization");
    if (!header?.startsWith("Bearer ")) {
      return c.json({ message: "Missing or invalid Authorization header" }, 401);
    }

    const token = header.substring(7);

    let payload: { sub: string };
    try {
      payload = await verifyToken(c.env, token);
    } catch {
      return c.json({ message: "Invalid or expired token" }, 401);
    }

    const db = createDb(getDb(c.env));
    const user = await db.query.users.findFirst({
      where: eq(users.id, payload.sub),
    });

    if (!user) {
      return c.json({ message: "User not found" }, 401);
    }

    c.set("user", user);
    await next();
  };
}

/** Default auth middleware – uses the main DB binding. */
export const protectAndLoadUser = createAuthMiddleware((env) => env.DB);
