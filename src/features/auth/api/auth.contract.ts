/**
 * Auth feature – OpenAPI route contracts.
 *
 * Each `createRoute` call defines the HTTP method, path, request schema,
 * and response schemas. The actual handler is wired in auth.routes.ts.
 */

import { createRoute, z } from "@hono/zod-openapi";
import { ErrorSchema, MessageSchema } from "@/core/schemas/common.schema";

// ── Schemas ────────────────────────────────────────────

export const RegisterBodySchema = z
  .object({
    email: z.string().email().openapi({ example: "user@example.com" }),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .openapi({ example: "securepassword123" }),
    name: z.string().min(1).openapi({ example: "John Doe" }),
  })
  .openapi("RegisterBody");

export const LoginBodySchema = z
  .object({
    email: z.string().email().openapi({ example: "user@example.com" }),
    password: z.string().openapi({ example: "securepassword123" }),
  })
  .openapi("LoginBody");

export const TokenResponseSchema = z
  .object({
    accessToken: z.string(),
    refreshToken: z.string(),
  })
  .openapi("TokenResponse");

export const UserProfileSchema = z
  .object({
    id: z.string(),
    email: z.string(),
    name: z.string(),
    createdAt: z.string(),
  })
  .openapi("UserProfile");

// ── Routes ─────────────────────────────────────────────

export const registerRoute = createRoute({
  method: "post",
  path: "/register",
  tags: ["Auth"],
  request: {
    body: {
      content: { "application/json": { schema: RegisterBodySchema } },
    },
  },
  responses: {
    201: {
      description: "User registered successfully",
      content: { "application/json": { schema: TokenResponseSchema } },
    },
    409: {
      description: "Email already in use",
      content: { "application/json": { schema: ErrorSchema } },
    },
    400: {
      description: "Validation error",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

export const loginRoute = createRoute({
  method: "post",
  path: "/login",
  tags: ["Auth"],
  request: {
    body: {
      content: { "application/json": { schema: LoginBodySchema } },
    },
  },
  responses: {
    200: {
      description: "Login successful",
      content: { "application/json": { schema: TokenResponseSchema } },
    },
    401: {
      description: "Invalid credentials",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

export const profileRoute = createRoute({
  method: "get",
  path: "/profile",
  tags: ["Auth"],
  security: [{ BearerAuth: [] }],
  responses: {
    200: {
      description: "Current user profile",
      content: { "application/json": { schema: UserProfileSchema } },
    },
    401: {
      description: "Unauthorized",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});
