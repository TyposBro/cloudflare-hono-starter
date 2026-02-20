/**
 * Posts repository – data access layer.
 *
 * Encapsulates all database queries for the posts feature.
 * Uses Drizzle ORM for type-safe queries.
 */

import { eq, and, desc, sql } from "drizzle-orm";
import type { Database } from "@/db";
import { posts, type InsertPost, type SelectPost } from "@/db/schema";

export class PostsRepository {
  constructor(private db: Database) {}

  async findById(id: string): Promise<SelectPost | undefined> {
    return this.db.query.posts.findFirst({
      where: eq(posts.id, id),
    });
  }

  async findByIdAndAuthor(
    id: string,
    authorId: string
  ): Promise<SelectPost | undefined> {
    return this.db.query.posts.findFirst({
      where: and(eq(posts.id, id), eq(posts.authorId, authorId)),
    });
  }

  async listByAuthor(
    authorId: string,
    limit: number,
    offset: number
  ): Promise<{ data: SelectPost[]; total: number }> {
    const [data, countResult] = await Promise.all([
      this.db.query.posts.findMany({
        where: eq(posts.authorId, authorId),
        orderBy: desc(posts.createdAt),
        limit,
        offset,
      }),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(posts)
        .where(eq(posts.authorId, authorId)),
    ]);

    return { data, total: countResult[0].count };
  }

  async create(data: InsertPost): Promise<SelectPost> {
    const [post] = await this.db.insert(posts).values(data).returning();
    return post;
  }

  async update(
    id: string,
    authorId: string,
    data: Partial<Pick<InsertPost, "title" | "content" | "published">>
  ): Promise<SelectPost | undefined> {
    const [post] = await this.db
      .update(posts)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(and(eq(posts.id, id), eq(posts.authorId, authorId)))
      .returning();
    return post;
  }

  async delete(id: string, authorId: string): Promise<boolean> {
    const result = await this.db
      .delete(posts)
      .where(and(eq(posts.id, id), eq(posts.authorId, authorId)))
      .returning({ id: posts.id });
    return result.length > 0;
  }
}
