/**
 * Admin authentication middleware.
 *
 * Uses a **separate** JWT secret (`JWT_SECRET_ADMIN`) so admin tokens
 * cannot be forged from user-side secrets and vice-versa.
 *
 * Sets `c.set("admin", { id, email, role })` for downstream handlers.
 */

import { verify } from "hono/jwt";
import { eq } from "drizzle-orm";
import { createDb } from "@/db";
import { admins } from "@/db/schema";
import type { AppContext } from "@/core/types";

export const protectAdmin = async (c: AppContext, next: () => Promise<void>) => {
  const header = c.req.header("Authorization");
  if (!header?.startsWith("Bearer ")) {
    return c.json({ message: "Admin authorization required" }, 401);
  }

  const token = header.substring(7);

  try {
    const payload = (await verify(token, c.env.JWT_SECRET_ADMIN, "HS256")) as {
      sub: string;
    };
    if (!payload?.sub) throw new Error("Invalid payload");

    const db = createDb(c.env.DB);
    const admin = await db.query.admins.findFirst({
      where: eq(admins.id, payload.sub),
      columns: { id: true, email: true, role: true },
    });

    if (!admin) return c.json({ message: "Admin not found" }, 401);
    if (admin.role !== "admin") return c.json({ message: "Insufficient permissions" }, 403);

    c.set("admin", admin);
    await next();
  } catch {
    return c.json({ message: "Invalid admin token" }, 401);
  }
};
