/**
 * Auth repository – data access layer.
 *
 * All database queries for the auth feature live here.
 * The repository receives a Drizzle `Database` instance via constructor
 * injection (Dependency Inversion).
 */

import { eq } from "drizzle-orm";
import type { Database } from "@/db";
import { users, type InsertUser, type SelectUser } from "@/db/schema";

export class AuthRepository {
  constructor(private db: Database) {}

  async findByEmail(email: string): Promise<SelectUser | undefined> {
    return this.db.query.users.findFirst({
      where: eq(users.email, email),
    });
  }

  async findById(id: string): Promise<SelectUser | undefined> {
    return this.db.query.users.findFirst({
      where: eq(users.id, id),
    });
  }

  async create(data: InsertUser): Promise<SelectUser> {
    const [user] = await this.db.insert(users).values(data).returning();
    return user;
  }
}
