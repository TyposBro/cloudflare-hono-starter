/**
 * Posts feature – HTTP route handlers.
 *
 * Full CRUD example demonstrating the vertical slice pattern:
 *   Contract (OpenAPI) → Route Handler → Service → Repository → DB
 */

import { OpenAPIHono } from "@hono/zod-openapi";
import type { Bindings, Variables } from "@/core/types";
import { protectAndLoadUser } from "@/core/middleware/auth.middleware";
import { ServiceContainer } from "@/di";
import { PostNotFoundError } from "../core/posts.service";
import {
  listPostsRoute,
  getPostRoute,
  createPostRoute,
  updatePostRoute,
  deletePostRoute,
} from "./posts.contract";

export const postsApp = new OpenAPIHono<{
  Bindings: Bindings;
  Variables: Variables;
}>();

// All posts routes require authentication
postsApp.use("/*", protectAndLoadUser);

// ── List Posts ─────────────────────────────────────────

postsApp.openapi(listPostsRoute, async (c) => {
  const user = c.get("user");
  const { limit, offset } = c.req.valid("query");
  const services = new ServiceContainer(c.env);

  const result = await services.posts.list(user.id, limit, offset);

  return c.json({ ...result, limit, offset }, 200);
});

// ── Get Post ───────────────────────────────────────────

postsApp.openapi(getPostRoute, async (c) => {
  const user = c.get("user");
  const { id } = c.req.valid("param");
  const services = new ServiceContainer(c.env);

  try {
    const post = await services.posts.getById(id, user.id);
    return c.json(post, 200);
  } catch (e) {
    if (e instanceof PostNotFoundError) {
      return c.json({ message: e.message, code: "NOT_FOUND" }, 404);
    }
    throw e;
  }
});

// ── Create Post ────────────────────────────────────────

postsApp.openapi(createPostRoute, async (c) => {
  const user = c.get("user");
  const body = c.req.valid("json");
  const services = new ServiceContainer(c.env);

  const post = await services.posts.create(user.id, body);

  return c.json(post, 201);
});

// ── Update Post ────────────────────────────────────────

postsApp.openapi(updatePostRoute, async (c) => {
  const user = c.get("user");
  const { id } = c.req.valid("param");
  const body = c.req.valid("json");
  const services = new ServiceContainer(c.env);

  try {
    const post = await services.posts.update(id, user.id, body);
    return c.json(post, 200);
  } catch (e) {
    if (e instanceof PostNotFoundError) {
      return c.json({ message: e.message, code: "NOT_FOUND" }, 404);
    }
    throw e;
  }
});

// ── Delete Post ────────────────────────────────────────

postsApp.openapi(deletePostRoute, async (c) => {
  const user = c.get("user");
  const { id } = c.req.valid("param");
  const services = new ServiceContainer(c.env);

  try {
    await services.posts.delete(id, user.id);
    return c.json({ message: "Post deleted" }, 200);
  } catch (e) {
    if (e instanceof PostNotFoundError) {
      return c.json({ message: e.message, code: "NOT_FOUND" }, 404);
    }
    throw e;
  }
});
