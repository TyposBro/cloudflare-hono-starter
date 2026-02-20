import { describe, it, expect, vi, beforeEach } from "vitest";
import { PostsService, PostNotFoundError } from "../posts.service";
import type { PostsRepository } from "../../data/posts.repository";

function createMockRepo(): PostsRepository {
  return {
    findById: vi.fn(),
    findByIdAndAuthor: vi.fn(),
    listByAuthor: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  } as unknown as PostsRepository;
}

const AUTHOR_ID = "user-1";

describe("PostsService", () => {
  let repo: ReturnType<typeof createMockRepo>;
  let service: PostsService;

  beforeEach(() => {
    repo = createMockRepo();
    service = new PostsService(repo);
  });

  describe("list", () => {
    it("delegates to repository with correct params", async () => {
      const expected = { data: [], total: 0 };
      vi.mocked(repo.listByAuthor).mockResolvedValue(expected);

      const result = await service.list(AUTHOR_ID, 10, 0);

      expect(repo.listByAuthor).toHaveBeenCalledWith(AUTHOR_ID, 10, 0);
      expect(result).toEqual(expected);
    });
  });

  describe("getById", () => {
    it("returns post when found", async () => {
      const post = { id: "post-1", title: "Hello", authorId: AUTHOR_ID };
      vi.mocked(repo.findByIdAndAuthor).mockResolvedValue(post as any);

      const result = await service.getById("post-1", AUTHOR_ID);
      expect(result).toEqual(post);
    });

    it("throws PostNotFoundError when not found", async () => {
      vi.mocked(repo.findByIdAndAuthor).mockResolvedValue(undefined);

      await expect(service.getById("missing", AUTHOR_ID)).rejects.toThrow(
        PostNotFoundError
      );
    });
  });

  describe("create", () => {
    it("creates a post with generated id and timestamps", async () => {
      vi.mocked(repo.create).mockImplementation(async (data: any) => data);

      const result = await service.create(AUTHOR_ID, {
        title: "New Post",
        content: "Content here",
      });

      expect(result.title).toBe("New Post");
      expect(result.content).toBe("Content here");
      expect(result.authorId).toBe(AUTHOR_ID);
      expect(result.published).toBe(false);
      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeDefined();
    });
  });

  describe("update", () => {
    it("returns updated post", async () => {
      const updated = { id: "post-1", title: "Updated" };
      vi.mocked(repo.update).mockResolvedValue(updated as any);

      const result = await service.update("post-1", AUTHOR_ID, {
        title: "Updated",
      });
      expect(result.title).toBe("Updated");
    });

    it("throws PostNotFoundError when post does not exist", async () => {
      vi.mocked(repo.update).mockResolvedValue(undefined);

      await expect(
        service.update("missing", AUTHOR_ID, { title: "X" })
      ).rejects.toThrow(PostNotFoundError);
    });
  });

  describe("delete", () => {
    it("succeeds when post exists", async () => {
      vi.mocked(repo.delete).mockResolvedValue(true);
      await expect(service.delete("post-1", AUTHOR_ID)).resolves.not.toThrow();
    });

    it("throws PostNotFoundError when post does not exist", async () => {
      vi.mocked(repo.delete).mockResolvedValue(false);
      await expect(service.delete("missing", AUTHOR_ID)).rejects.toThrow(
        PostNotFoundError
      );
    });
  });
});
