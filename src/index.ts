/**
 * Application entry point.
 *
 * Wires together global middleware, feature routes, and system endpoints.
 * Each feature is a self-contained Hono app mounted under its own prefix.
 *
 * Also exports the cron handler, queue consumer, and Durable Object class
 * for Cloudflare Workers to discover them.
 */

import { OpenAPIHono } from "@hono/zod-openapi";
import { swaggerUI } from "@hono/swagger-ui";
import { cors } from "hono/cors";
import type { Bindings, Variables } from "@/core/types";
import { requestId } from "@/core/middleware/request-id.middleware";
import { globalErrorHandler } from "@/core/middleware/error.middleware";

// Feature routes
import { authApp } from "@/features/auth/api/auth.routes";
import { postsApp } from "@/features/posts/api/posts.routes";
import { abTestingApp } from "@/features/ab-testing/api/ab-testing.routes";

// Infrastructure
import { handleScheduled } from "@/cron";
import { handleQueue } from "@/queues/example.consumer";

const app = new OpenAPIHono<{ Bindings: Bindings; Variables: Variables }>();

// ── Global Error Handler ───────────────────────────────
app.onError(globalErrorHandler);

// ── Global Middleware ──────────────────────────────────
app.use("*", requestId());
app.use(
  "*",
  cors({
    origin: "*", // TODO: restrict to your frontend domain(s) in production
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-App-Version"],
  })
);

// ── Feature Routes ─────────────────────────────────────
app.route("/api/auth", authApp);
app.route("/api/posts", postsApp);
app.route("/api/ab", abTestingApp);

// ── System Endpoints ───────────────────────────────────

app.get("/health", (c) =>
  c.json({ status: "ok", timestamp: new Date().toISOString() })
);

// ── OpenAPI Documentation ──────────────────────────────

app.doc("/doc", {
  openapi: "3.0.0",
  info: {
    title: "My App API",
    version: "1.0.0",
    description: "API documentation – auto-generated from Zod schemas",
  },
  servers: [{ url: "http://localhost:8787", description: "Local" }],
  security: [{ BearerAuth: [] }],
});

app.openAPIRegistry.registerComponent("securitySchemes", "BearerAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
});

app.get("/docs", swaggerUI({ url: "/doc" }));

// ── Export ──────────────────────────────────────────────

export default {
  fetch: app.fetch,
  scheduled: handleScheduled,
  queue: handleQueue,
};

// Durable Object must be a named export
export { AsyncResultDO } from "@/durable-objects/async-result.do";
