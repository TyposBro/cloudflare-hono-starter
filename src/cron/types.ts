/**
 * Cron job type definitions.
 *
 * Every cron handler receives the Cloudflare env bindings and the
 * execution context (for `waitUntil` if needed).
 */

import type { Bindings } from "@/core/types";

export type CronJobHandler = (env: Bindings, ctx: ExecutionContext) => Promise<void>;

/** Maps cron expressions (must match wrangler.toml triggers) to handlers. */
export type CronRegistry = Record<string, CronJobHandler>;
