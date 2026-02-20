/**
 * Cron job registry.
 *
 * Maps cron expressions to handler functions. The strings **must** match
 * the `[triggers] crons` array in `wrangler.toml` exactly.
 *
 * Adding a new cron job:
 * 1. Create a handler in `cron/jobs/`.
 * 2. Import it here and add an entry to `CRON_JOBS`.
 * 3. Add the same cron expression to `wrangler.toml` `[triggers]`.
 */

import type { Bindings } from "@/core/types";
import type { CronRegistry } from "@/cron/types";
import { cleanupExpiredSubscriptions } from "@/cron/jobs/cleanup-expired-subscriptions";
import { cleanupRateLimits } from "@/cron/jobs/cleanup-rate-limits";

const CRON_JOBS: CronRegistry = {
  // Daily at 03:00 UTC — downgrade expired subscriptions
  "0 3 * * *": cleanupExpiredSubscriptions,

  // Daily at 04:00 UTC — purge old rate-limit entries
  "0 4 * * *": cleanupRateLimits,
};

export const handleScheduled = async (
  event: ScheduledEvent,
  env: Bindings,
  ctx: ExecutionContext
) => {
  const job = CRON_JOBS[event.cron];

  if (!job) {
    console.warn(`[Cron] No handler found for: "${event.cron}"`);
    return;
  }

  console.log(`[Cron] Triggered: "${event.cron}"`);
  await job(env, ctx);
};
