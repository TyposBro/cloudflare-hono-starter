/**
 * A/B Testing feature — route handlers.
 *
 * Public routes (require user auth):
 *   GET /assignment/:experimentKey  — get or assign a variant
 *
 * Admin routes (require admin auth):
 *   GET    /admin/experiments              — list all experiments
 *   GET    /admin/experiments/:key/stats   — variant stats
 *   PUT    /admin/experiments/:key/status  — update experiment status
 *   PUT    /admin/variants/:variantId      — update variant weight/enabled
 */

import { OpenAPIHono } from "@hono/zod-openapi";
import type { Bindings, Variables } from "@/core/types";
import { protectAndLoadUser } from "@/core/middleware/auth.middleware";
import { protectAdmin } from "@/core/middleware/admin.middleware";
import { createDb } from "@/db";
import { ABTestingRepository } from "../data/ab-testing.repository";
import { ABTestingService } from "../core/ab-testing.service";

export const abTestingApp = new OpenAPIHono<{
  Bindings: Bindings;
  Variables: Variables;
}>();

// ── Public Routes (user auth) ──────────────────────────

abTestingApp.use("/assignment/*", protectAndLoadUser);

abTestingApp.get("/assignment/:experimentKey", async (c) => {
  const user = c.get("user");
  const { experimentKey } = c.req.param();

  const db = createDb(c.env.DB);
  const service = new ABTestingService(new ABTestingRepository(db));
  const assignment = await service.getOrAssignVariant(user.id, experimentKey);

  if (!assignment) {
    return c.json({ variantKey: "control", config: {} }, 200);
  }

  return c.json(assignment, 200);
});

// ── Admin Routes ───────────────────────────────────────

abTestingApp.use("/admin/*", protectAdmin);

abTestingApp.get("/admin/experiments", async (c) => {
  const db = createDb(c.env.DB);
  const repo = new ABTestingRepository(db);
  const experiments = await repo.listExperiments();
  return c.json({ experiments }, 200);
});

abTestingApp.get("/admin/experiments/:key/stats", async (c) => {
  const { key } = c.req.param();
  const db = createDb(c.env.DB);
  const repo = new ABTestingRepository(db);

  const experiment = await repo.getExperimentByKey(key);
  if (!experiment) {
    return c.json({ message: "Experiment not found" }, 404);
  }

  const stats = await repo.getVariantStats(experiment.id);
  const variants = await repo.getAllVariants(experiment.id);

  return c.json(
    {
      experiment,
      variants: variants.map((v) => ({
        ...v,
        config: JSON.parse(v.config || "{}"),
        assignmentCount:
          stats.find((s) => s.variantKey === v.variantKey)?.assignmentCount ?? 0,
      })),
      totalAssignments: stats.reduce((sum, s) => sum + s.assignmentCount, 0),
    },
    200
  );
});

abTestingApp.put("/admin/experiments/:key/status", async (c) => {
  const { key } = c.req.param();
  const { status } = await c.req.json<{ status: string }>();

  if (!["draft", "active", "paused", "completed"].includes(status)) {
    return c.json({ message: "Invalid status" }, 400);
  }

  const db = createDb(c.env.DB);
  const repo = new ABTestingRepository(db);
  const experiment = await repo.getExperimentByKey(key);
  if (!experiment) {
    return c.json({ message: "Experiment not found" }, 404);
  }

  await repo.updateExperimentStatus(experiment.id, status);
  return c.json({ message: "Updated", status }, 200);
});

abTestingApp.put("/admin/variants/:variantId", async (c) => {
  const { variantId } = c.req.param();
  const body = await c.req.json<{ weight?: number; enabled?: boolean }>();

  const db = createDb(c.env.DB);
  const repo = new ABTestingRepository(db);
  await repo.updateVariant(variantId, {
    weight: body.weight,
    enabled: body.enabled !== undefined ? (body.enabled ? 1 : 0) : undefined,
  });

  return c.json({ message: "Updated" }, 200);
});
