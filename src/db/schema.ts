/**
 * Drizzle ORM schema – single source of truth for database tables.
 *
 * After editing this file run:
 *   npm run db:generate    # generates a SQL migration in /migrations
 *   npm run db:migrate:local   # applies it to the local D1 dev database
 */

import { sqliteTable, text, integer, primaryKey } from "drizzle-orm/sqlite-core";

// ── Users ──────────────────────────────────────────────

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  subscriptionTier: text("subscription_tier").notNull().default("free"),
  subscriptionExpiresAt: text("subscription_expires_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// ── Posts ───────────────────────────────────────────────

export const posts = sqliteTable("posts", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  published: integer("published", { mode: "boolean" }).notNull().default(false),
  authorId: text("author_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// ── Admins ─────────────────────────────────────────────

export const admins = sqliteTable("admins", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("admin"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// ── Rate Limits ────────────────────────────────────────

export const rateLimits = sqliteTable("rate_limits", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull(),
  timestamp: integer("timestamp").notNull(),
});

// ── Session Tracking ───────────────────────────────────

export const sessionOpens = sqliteTable(
  "session_opens",
  {
    userId: text("user_id").notNull(),
    date: text("date").notNull(),
    platform: text("platform").notNull().default("unknown"),
    requestCount: integer("request_count").notNull().default(1),
    firstSeenAt: text("first_seen_at").notNull(),
    lastSeenAt: text("last_seen_at").notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.date] })]
);

// ── A/B Testing: Experiments ───────────────────────────

export const abExperiments = sqliteTable("ab_experiments", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  status: text("status").notNull().default("draft"), // draft | active | paused | completed
  createdAt: text("createdAt").notNull(),
  updatedAt: text("updatedAt").notNull(),
});

// ── A/B Testing: Variants ──────────────────────────────

export const abVariants = sqliteTable("ab_variants", {
  id: text("id").primaryKey(),
  experimentId: text("experimentId")
    .notNull()
    .references(() => abExperiments.id, { onDelete: "cascade" }),
  variantKey: text("variantKey").notNull(),
  name: text("name").notNull(),
  weight: integer("weight").notNull().default(50),
  config: text("config").notNull().default("{}"), // JSON
  enabled: integer("enabled").notNull().default(1),
  createdAt: text("createdAt").notNull(),
  updatedAt: text("updatedAt").notNull(),
});

// ── A/B Testing: Assignments ───────────────────────────

export const abAssignments = sqliteTable("ab_assignments", {
  id: text("id").primaryKey(),
  userId: text("userId").notNull(),
  experimentId: text("experimentId")
    .notNull()
    .references(() => abExperiments.id, { onDelete: "cascade" }),
  variantId: text("variantId")
    .notNull()
    .references(() => abVariants.id, { onDelete: "cascade" }),
  variantKey: text("variantKey").notNull(),
  assignedAt: text("assignedAt").notNull(),
});

// ── Type helpers (inferred from schema) ────────────────

export type InsertUser = typeof users.$inferInsert;
export type SelectUser = typeof users.$inferSelect;
export type InsertPost = typeof posts.$inferInsert;
export type SelectPost = typeof posts.$inferSelect;
export type SelectAdmin = typeof admins.$inferSelect;
export type SelectAbExperiment = typeof abExperiments.$inferSelect;
export type SelectAbVariant = typeof abVariants.$inferSelect;
export type SelectAbAssignment = typeof abAssignments.$inferSelect;
