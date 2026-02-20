/**
 * Posts service – business logic layer.
 *
 * Orchestrates CRUD operations and enforces authorization rules.
 * Depends on `PostsRepository` (abstraction), not the database directly.
 */

import type { PostsRepository } from "../data/posts.repository";

export class PostsService {
  constructor(private repo: PostsRepository) {}

  async list(authorId: string, limit: number, offset: number) {
    return this.repo.listByAuthor(authorId, limit, offset);
  }

  async getById(id: string, authorId: string) {
    const post = await this.repo.findByIdAndAuthor(id, authorId);
    if (!post) {
      throw new PostNotFoundError();
    }
    return post;
  }

  async create(
    authorId: string,
    data: { title: string; content: string; published?: boolean }
  ) {
    const now = new Date().toISOString();
    return this.repo.create({
      id: crypto.randomUUID(),
      title: data.title,
      content: data.content,
      published: data.published ?? false,
      authorId,
      createdAt: now,
      updatedAt: now,
    });
  }

  async update(
    id: string,
    authorId: string,
    data: { title?: string; content?: string; published?: boolean }
  ) {
    const post = await this.repo.update(id, authorId, data);
    if (!post) {
      throw new PostNotFoundError();
    }
    return post;
  }

  async delete(id: string, authorId: string) {
    const deleted = await this.repo.delete(id, authorId);
    if (!deleted) {
      throw new PostNotFoundError();
    }
  }
}

export class PostNotFoundError extends Error {
  constructor() {
    super("Post not found");
  }
}
