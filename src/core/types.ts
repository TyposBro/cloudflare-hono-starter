/**
 * Global type definitions for the application.
 *
 * - `Bindings`   – Cloudflare resource bindings (D1, R2, secrets, env vars).
 * - `Variables`  – Per-request context set by middleware (authenticated user, etc.).
 * - `AppContext`  – Shorthand for a fully-typed Hono context.
 */

import type { Context } from "hono";

// ── Cloudflare Bindings ────────────────────────────────
// Each binding maps to a resource declared in wrangler.toml.
// Add new bindings here as you add D1 databases, R2 buckets, KV namespaces, etc.

export type Bindings = {
  // Databases
  DB: D1Database;

  // R2 Storage
  CDN_BUCKET: R2Bucket;

  // Queues
  MY_QUEUE: Queue;

  // Durable Objects
  ASYNC_RESULT: DurableObjectNamespace;

  // Secrets (set via `wrangler secret put <KEY>`)
  JWT_SECRET: string;
  JWT_SECRET_ADMIN: string;

  // Environment variables (set in wrangler.toml [vars])
  ENVIRONMENT: string;
  R2_PUBLIC_URL: string;
};

// ── Per-Request Variables ──────────────────────────────
// Populated by middleware and consumed by route handlers.

export type Variables = {
  user: User;
  admin: { id: string; email: string; role: string };
  requestId: string;
};

// ── Domain Models ──────────────────────────────────────

export type User = {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  subscriptionTier: string;
  subscriptionExpiresAt: string | null;
  createdAt: string;
  updatedAt: string;
};

// ── Hono Context Shorthand ─────────────────────────────

export type AppContext = Context<{ Bindings: Bindings; Variables: Variables }>;
