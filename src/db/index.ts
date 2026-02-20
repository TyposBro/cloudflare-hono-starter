/**
 * Drizzle client factory.
 *
 * Creates a Drizzle instance from a Cloudflare D1 binding.
 * Call this once per request in your DI container – Drizzle is lightweight
 * and safe to instantiate on every request.
 */

import { drizzle } from "drizzle-orm/d1";
import * as schema from "@/db/schema";

export function createDb(d1: D1Database) {
  return drizzle(d1, { schema });
}

export type Database = ReturnType<typeof createDb>;
