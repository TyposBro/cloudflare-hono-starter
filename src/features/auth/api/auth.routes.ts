/**
 * Auth feature – HTTP route handlers.
 *
 * Thin layer: validates input (automatic via OpenAPI contract), calls the
 * service, and formats the response. No business logic lives here.
 */

import { OpenAPIHono } from "@hono/zod-openapi";
import type { Bindings, Variables } from "@/core/types";
import { protectAndLoadUser } from "@/core/middleware/auth.middleware";
import { ServiceContainer } from "@/di";
import { AuthError } from "../core/auth.service";
import { registerRoute, loginRoute, profileRoute } from "./auth.contract";

export const authApp = new OpenAPIHono<{
  Bindings: Bindings;
  Variables: Variables;
}>();

// ── Register ───────────────────────────────────────────

authApp.openapi(registerRoute, async (c) => {
  const { email, password, name } = c.req.valid("json");
  const services = new ServiceContainer(c.env);

  try {
    const tokens = await services.auth.register(email, password, name);
    return c.json(tokens, 201);
  } catch (e) {
    if (e instanceof AuthError) {
      return c.json({ message: e.message, code: "AUTH_ERROR" }, e.status as 409);
    }
    throw e;
  }
});

// ── Login ──────────────────────────────────────────────

authApp.openapi(loginRoute, async (c) => {
  const { email, password } = c.req.valid("json");
  const services = new ServiceContainer(c.env);

  try {
    const tokens = await services.auth.login(email, password);
    return c.json(tokens, 200);
  } catch (e) {
    if (e instanceof AuthError) {
      return c.json({ message: e.message, code: "AUTH_ERROR" }, e.status as 401);
    }
    throw e;
  }
});

// ── Profile (protected) ────────────────────────────────

authApp.use("/profile", protectAndLoadUser);

authApp.openapi(profileRoute, async (c) => {
  const user = c.get("user");

  return c.json(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    },
    200
  );
});
