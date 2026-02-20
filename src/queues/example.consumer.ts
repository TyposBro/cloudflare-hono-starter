/**
 * Queue consumer — processes async background jobs.
 *
 * Cloudflare Queues deliver messages in batches. Each message is
 * individually ack'd or retried so a single failure doesn't block
 * the rest of the batch.
 *
 * Setup:
 * 1. Create a queue:       npx wrangler queues create my-queue
 * 2. Add bindings in wrangler.toml (producer + consumer).
 * 3. Send messages from routes: `c.env.MY_QUEUE.send({ type: "...", ... })`
 *
 * @see https://developers.cloudflare.com/queues/
 */

import type { Bindings } from "@/core/types";

// ── Job types ──────────────────────────────────────────
// Use a discriminated union so the consumer can handle multiple job types.

interface EmailJob {
  type: "email";
  to: string;
  subject: string;
  body: string;
}

interface ReportJob {
  type: "report";
  userId: string;
  reportType: string;
}

type AnyJob = EmailJob | ReportJob;

// ── Consumer ───────────────────────────────────────────

export async function handleQueue(
  batch: MessageBatch<AnyJob>,
  env: Bindings
): Promise<void> {
  for (const msg of batch.messages) {
    const job = msg.body;

    console.log(`[Queue] Processing job: ${job.type}`);

    try {
      switch (job.type) {
        case "email":
          await processEmail(job, env);
          break;
        case "report":
          await processReport(job, env);
          break;
        default:
          console.warn(`[Queue] Unknown job type: ${(job as any).type}`);
      }

      msg.ack();
    } catch (error) {
      console.error(`[Queue] Job failed (${job.type}):`, error);
      msg.retry(); // Cloudflare will retry with backoff
    }
  }
}

// ── Job processors ─────────────────────────────────────

async function processEmail(job: EmailJob, _env: Bindings): Promise<void> {
  // TODO: integrate your email provider (Resend, SendGrid, etc.)
  console.log(`[Queue:Email] Sending to ${job.to}: ${job.subject}`);
}

async function processReport(job: ReportJob, _env: Bindings): Promise<void> {
  // TODO: generate report and store result
  console.log(`[Queue:Report] Generating ${job.reportType} for user ${job.userId}`);
}
