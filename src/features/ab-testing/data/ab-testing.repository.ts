/**
 * A/B Testing repository — data access layer.
 *
 * Manages three tables via Drizzle ORM:
 * - `ab_experiments` — experiment definitions (key, status)
 * - `ab_variants`    — variant configurations (weight, config JSON)
 * - `ab_assignments` — sticky user→variant mappings
 */

import { eq, and, desc, sql } from "drizzle-orm";
import type { Database } from "@/db";
import {
  abExperiments,
  abVariants,
  abAssignments,
  type SelectAbExperiment,
  type SelectAbVariant,
  type SelectAbAssignment,
} from "@/db/schema";

export type { SelectAbExperiment, SelectAbVariant, SelectAbAssignment };

export class ABTestingRepository {
  constructor(private db: Database) {}

  // ── Experiments ────────────────────────────────────────

  async getActiveExperiment(key: string): Promise<SelectAbExperiment | undefined> {
    return this.db.query.abExperiments.findFirst({
      where: and(eq(abExperiments.key, key), eq(abExperiments.status, "active")),
    });
  }

  async getExperimentByKey(key: string): Promise<SelectAbExperiment | undefined> {
    return this.db.query.abExperiments.findFirst({
      where: eq(abExperiments.key, key),
    });
  }

  async listExperiments(): Promise<SelectAbExperiment[]> {
    return this.db.query.abExperiments.findMany({
      orderBy: desc(abExperiments.createdAt),
    });
  }

  async updateExperimentStatus(id: string, status: string): Promise<void> {
    await this.db
      .update(abExperiments)
      .set({ status, updatedAt: new Date().toISOString() })
      .where(eq(abExperiments.id, id));
  }

  // ── Variants ───────────────────────────────────────────

  async getEnabledVariants(experimentId: string): Promise<SelectAbVariant[]> {
    return this.db.query.abVariants.findMany({
      where: and(
        eq(abVariants.experimentId, experimentId),
        eq(abVariants.enabled, 1)
      ),
    });
  }

  async getAllVariants(experimentId: string): Promise<SelectAbVariant[]> {
    return this.db.query.abVariants.findMany({
      where: eq(abVariants.experimentId, experimentId),
    });
  }

  async updateVariant(
    id: string,
    updates: { weight?: number; enabled?: number }
  ): Promise<void> {
    await this.db
      .update(abVariants)
      .set({
        ...(updates.weight !== undefined ? { weight: updates.weight } : {}),
        ...(updates.enabled !== undefined ? { enabled: updates.enabled } : {}),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(abVariants.id, id));
  }

  // ── Assignments ────────────────────────────────────────

  async getAssignment(
    userId: string,
    experimentId: string
  ): Promise<SelectAbAssignment | undefined> {
    return this.db.query.abAssignments.findFirst({
      where: and(
        eq(abAssignments.userId, userId),
        eq(abAssignments.experimentId, experimentId)
      ),
    });
  }

  async createAssignment(
    id: string,
    userId: string,
    experimentId: string,
    variantId: string,
    variantKey: string
  ): Promise<void> {
    await this.db.insert(abAssignments).values({
      id,
      userId,
      experimentId,
      variantId,
      variantKey,
      assignedAt: new Date().toISOString(),
    });
  }

  // ── Stats ──────────────────────────────────────────────

  async getVariantStats(
    experimentId: string
  ): Promise<Array<{ variantKey: string; variantName: string; assignmentCount: number }>> {
    return this.db
      .select({
        variantKey: abVariants.variantKey,
        variantName: abVariants.name,
        assignmentCount: sql<number>`count(${abAssignments.id})`,
      })
      .from(abVariants)
      .leftJoin(abAssignments, eq(abAssignments.variantId, abVariants.id))
      .where(eq(abVariants.experimentId, experimentId))
      .groupBy(abVariants.id)
      .orderBy(abVariants.variantKey);
  }
}
