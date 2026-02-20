import { describe, it, expect, vi, beforeEach } from "vitest";
import { ABTestingService } from "../ab-testing.service";
import type { ABTestingRepository } from "../../data/ab-testing.repository";

function createMockRepo(): ABTestingRepository {
  return {
    getActiveExperiment: vi.fn(),
    getExperimentByKey: vi.fn(),
    listExperiments: vi.fn(),
    updateExperimentStatus: vi.fn(),
    getEnabledVariants: vi.fn(),
    getAllVariants: vi.fn(),
    updateVariant: vi.fn(),
    getAssignment: vi.fn(),
    createAssignment: vi.fn(),
    getVariantStats: vi.fn(),
  } as unknown as ABTestingRepository;
}

const USER_ID = "user-1";
const EXPERIMENT = {
  id: "exp-1",
  key: "pricing-test",
  status: "active",
  createdAt: "2025-01-01T00:00:00Z",
  updatedAt: "2025-01-01T00:00:00Z",
};

const VARIANTS = [
  {
    id: "var-1",
    experimentId: "exp-1",
    variantKey: "control",
    name: "Control",
    weight: 50,
    config: '{"price": 9.99}',
    enabled: 1,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
  {
    id: "var-2",
    experimentId: "exp-1",
    variantKey: "treatment",
    name: "Treatment",
    weight: 50,
    config: '{"price": 14.99}',
    enabled: 1,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
];

describe("ABTestingService", () => {
  let repo: ReturnType<typeof createMockRepo>;
  let service: ABTestingService;

  beforeEach(() => {
    repo = createMockRepo();
    service = new ABTestingService(repo);
  });

  describe("getOrAssignVariant", () => {
    it("returns null when experiment does not exist", async () => {
      vi.mocked(repo.getActiveExperiment).mockResolvedValue(undefined);

      const result = await service.getOrAssignVariant(USER_ID, "nonexistent");
      expect(result).toBeNull();
    });

    it("returns existing assignment (sticky)", async () => {
      vi.mocked(repo.getActiveExperiment).mockResolvedValue(EXPERIMENT as any);
      vi.mocked(repo.getAssignment).mockResolvedValue({
        id: "assign-1",
        userId: USER_ID,
        experimentId: "exp-1",
        variantId: "var-1",
        variantKey: "control",
        assignedAt: "2025-01-01T00:00:00Z",
      } as any);
      vi.mocked(repo.getAllVariants).mockResolvedValue(VARIANTS as any);

      const result = await service.getOrAssignVariant(USER_ID, "pricing-test");

      expect(result).toEqual({
        variantKey: "control",
        config: { price: 9.99 },
      });
      expect(repo.createAssignment).not.toHaveBeenCalled();
    });

    it("creates new assignment when none exists", async () => {
      vi.mocked(repo.getActiveExperiment).mockResolvedValue(EXPERIMENT as any);
      vi.mocked(repo.getAssignment).mockResolvedValue(undefined);
      vi.mocked(repo.getEnabledVariants).mockResolvedValue(VARIANTS as any);
      vi.mocked(repo.createAssignment).mockResolvedValue(undefined);

      const result = await service.getOrAssignVariant(USER_ID, "pricing-test");

      expect(result).not.toBeNull();
      expect(["control", "treatment"]).toContain(result!.variantKey);
      expect(repo.createAssignment).toHaveBeenCalledOnce();
    });

    it("returns null when no enabled variants exist", async () => {
      vi.mocked(repo.getActiveExperiment).mockResolvedValue(EXPERIMENT as any);
      vi.mocked(repo.getAssignment).mockResolvedValue(undefined);
      vi.mocked(repo.getEnabledVariants).mockResolvedValue([]);

      const result = await service.getOrAssignVariant(USER_ID, "pricing-test");
      expect(result).toBeNull();
    });

    it("respects variant weights over many assignments", async () => {
      vi.mocked(repo.getActiveExperiment).mockResolvedValue(EXPERIMENT as any);
      vi.mocked(repo.getAssignment).mockResolvedValue(undefined);
      vi.mocked(repo.createAssignment).mockResolvedValue(undefined);

      const heavyVariants = [
        { ...VARIANTS[0], weight: 90 },
        { ...VARIANTS[1], weight: 10 },
      ];
      vi.mocked(repo.getEnabledVariants).mockResolvedValue(heavyVariants as any);

      const counts: Record<string, number> = { control: 0, treatment: 0 };
      for (let i = 0; i < 1000; i++) {
        const result = await service.getOrAssignVariant(`user-${i}`, "pricing-test");
        counts[result!.variantKey]++;
      }

      // With 90/10 weights, control should get the majority
      expect(counts.control).toBeGreaterThan(counts.treatment);
      expect(counts.control).toBeGreaterThan(700); // ~900 expected
    });
  });

  describe("getAssignment (read-only)", () => {
    it("returns null when experiment does not exist", async () => {
      vi.mocked(repo.getExperimentByKey).mockResolvedValue(undefined);

      const result = await service.getAssignment(USER_ID, "nonexistent");
      expect(result).toBeNull();
    });

    it("returns null when user has no assignment", async () => {
      vi.mocked(repo.getExperimentByKey).mockResolvedValue(EXPERIMENT as any);
      vi.mocked(repo.getAssignment).mockResolvedValue(undefined);

      const result = await service.getAssignment(USER_ID, "pricing-test");
      expect(result).toBeNull();
    });

    it("returns existing assignment with parsed config", async () => {
      vi.mocked(repo.getExperimentByKey).mockResolvedValue(EXPERIMENT as any);
      vi.mocked(repo.getAssignment).mockResolvedValue({
        id: "assign-1",
        userId: USER_ID,
        experimentId: "exp-1",
        variantId: "var-1",
        variantKey: "control",
        assignedAt: "2025-01-01T00:00:00Z",
      } as any);
      vi.mocked(repo.getAllVariants).mockResolvedValue(VARIANTS as any);

      const result = await service.getAssignment(USER_ID, "pricing-test");
      expect(result).toEqual({
        variantKey: "control",
        config: { price: 9.99 },
      });
    });
  });
});
