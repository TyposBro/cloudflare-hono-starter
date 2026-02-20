/**
 * A/B Testing service — business logic layer.
 *
 * Key design decisions:
 * - **Sticky assignments**: once a user is assigned a variant, they always
 *   get the same one (persisted in `ab_assignments`).
 * - **Weighted random**: variants have configurable weights so you can do
 *   90/10 splits, 50/50, etc.
 * - **Graceful fallback**: if an experiment is not active or has no
 *   enabled variants, returns `null` so the caller can use a default.
 */

import type {
  ABTestingRepository,
  SelectAbVariant,
} from "../data/ab-testing.repository";

export interface VariantAssignment {
  variantKey: string;
  config: Record<string, unknown>;
}

export class ABTestingService {
  constructor(private repo: ABTestingRepository) {}

  /**
   * Get or assign a variant for a user.
   * Returns `null` if the experiment doesn't exist or is inactive.
   */
  async getOrAssignVariant(
    userId: string,
    experimentKey: string
  ): Promise<VariantAssignment | null> {
    const experiment = await this.repo.getActiveExperiment(experimentKey);
    if (!experiment) return null;

    // Sticky — return existing assignment
    const existing = await this.repo.getAssignment(userId, experiment.id);
    if (existing) {
      const variants = await this.repo.getAllVariants(experiment.id);
      const variant = variants.find((v) => v.id === existing.variantId);
      return {
        variantKey: existing.variantKey,
        config: variant ? this.parseConfig(variant.config) : {},
      };
    }

    // New assignment — weighted random selection
    const variants = await this.repo.getEnabledVariants(experiment.id);
    if (variants.length === 0) return null;

    const selected = this.weightedRandom(variants);

    const assignmentId = crypto.randomUUID();
    await this.repo.createAssignment(
      assignmentId,
      userId,
      experiment.id,
      selected.id,
      selected.variantKey
    );

    return {
      variantKey: selected.variantKey,
      config: this.parseConfig(selected.config),
    };
  }

  /**
   * Read-only — get existing assignment without creating one.
   */
  async getAssignment(
    userId: string,
    experimentKey: string
  ): Promise<VariantAssignment | null> {
    const experiment = await this.repo.getExperimentByKey(experimentKey);
    if (!experiment) return null;

    const existing = await this.repo.getAssignment(userId, experiment.id);
    if (!existing) return null;

    const variants = await this.repo.getAllVariants(experiment.id);
    const variant = variants.find((v) => v.id === existing.variantId);
    return {
      variantKey: existing.variantKey,
      config: variant ? this.parseConfig(variant.config) : {},
    };
  }

  private weightedRandom(variants: SelectAbVariant[]): SelectAbVariant {
    const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
    let random = Math.random() * totalWeight;

    for (const variant of variants) {
      random -= variant.weight;
      if (random <= 0) return variant;
    }

    return variants[variants.length - 1];
  }

  private parseConfig(config: string): Record<string, unknown> {
    try {
      return JSON.parse(config);
    } catch {
      return {};
    }
  }
}
