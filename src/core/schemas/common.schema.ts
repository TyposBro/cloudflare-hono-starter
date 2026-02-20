/**
 * Shared Zod schemas reused across multiple features.
 */

import { z } from "@hono/zod-openapi";

// ── Error Response ─────────────────────────────────────

export const ErrorSchema = z
  .object({
    message: z.string(),
    code: z.string().optional(),
    errors: z
      .array(z.object({ path: z.string(), message: z.string() }))
      .optional(),
  })
  .openapi("Error");

// ── Pagination ─────────────────────────────────────────

export const PaginationQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20).openapi({
    description: "Number of items to return",
    example: 20,
  }),
  offset: z.coerce.number().min(0).default(0).openapi({
    description: "Number of items to skip",
    example: 0,
  }),
});

// ── Common Response Helpers ────────────────────────────

export const MessageSchema = z
  .object({
    message: z.string(),
  })
  .openapi("Message");
