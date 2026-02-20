/**
 * Posts feature – OpenAPI route contracts.
 *
 * Defines all request/response schemas and route metadata for the Posts CRUD.
 * These contracts are the single source of truth for:
 *   - Request validation (automatic via Zod)
 *   - Response typing
 *   - OpenAPI/Swagger documentation
 */

import { createRoute, z } from "@hono/zod-openapi";
import {
  ErrorSchema,
  MessageSchema,
  PaginationQuerySchema,
} from "@/core/schemas/common.schema";

// ── Schemas ────────────────────────────────────────────

export const PostSchema = z
  .object({
    id: z.string().uuid(),
    title: z.string(),
    content: z.string(),
    published: z.boolean(),
    authorId: z.string().uuid(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi("Post");

export const CreatePostSchema = z
  .object({
    title: z
      .string()
      .min(1, "Title is required")
      .max(200)
      .openapi({ example: "Getting Started with Hono" }),
    content: z
      .string()
      .min(1, "Content is required")
      .openapi({ example: "Hono is a fast web framework for Cloudflare Workers..." }),
    published: z.boolean().default(false).openapi({ example: false }),
  })
  .openapi("CreatePost");

export const UpdatePostSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    content: z.string().min(1).optional(),
    published: z.boolean().optional(),
  })
  .openapi("UpdatePost");

export const PostListSchema = z
  .object({
    data: z.array(PostSchema),
    total: z.number(),
    limit: z.number(),
    offset: z.number(),
  })
  .openapi("PostList");

// ── Route Definitions ──────────────────────────────────

export const listPostsRoute = createRoute({
  method: "get",
  path: "/",
  tags: ["Posts"],
  security: [{ BearerAuth: [] }],
  request: {
    query: PaginationQuerySchema,
  },
  responses: {
    200: {
      description: "Paginated list of posts by the current user",
      content: { "application/json": { schema: PostListSchema } },
    },
  },
});

export const getPostRoute = createRoute({
  method: "get",
  path: "/{id}",
  tags: ["Posts"],
  security: [{ BearerAuth: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      description: "Post details",
      content: { "application/json": { schema: PostSchema } },
    },
    404: {
      description: "Post not found",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

export const createPostRoute = createRoute({
  method: "post",
  path: "/",
  tags: ["Posts"],
  security: [{ BearerAuth: [] }],
  request: {
    body: {
      content: { "application/json": { schema: CreatePostSchema } },
    },
  },
  responses: {
    201: {
      description: "Post created",
      content: { "application/json": { schema: PostSchema } },
    },
    400: {
      description: "Validation error",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

export const updatePostRoute = createRoute({
  method: "patch",
  path: "/{id}",
  tags: ["Posts"],
  security: [{ BearerAuth: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: {
      content: { "application/json": { schema: UpdatePostSchema } },
    },
  },
  responses: {
    200: {
      description: "Post updated",
      content: { "application/json": { schema: PostSchema } },
    },
    404: {
      description: "Post not found",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

export const deletePostRoute = createRoute({
  method: "delete",
  path: "/{id}",
  tags: ["Posts"],
  security: [{ BearerAuth: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      description: "Post deleted",
      content: { "application/json": { schema: MessageSchema } },
    },
    404: {
      description: "Post not found",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});
