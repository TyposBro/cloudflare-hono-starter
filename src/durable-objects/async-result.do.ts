/**
 * AsyncResultDO — Durable Object for async result polling.
 *
 * Implements the **store → poll → ack → auto-cleanup** pattern for
 * long-running background jobs whose results need to be retrieved later.
 *
 * Lifecycle:
 *   1. Producer (queue consumer) stores result:  PUT  /store  { data }
 *   2. Client polls until ready:                 GET  /       → 202 (pending) or 200 (ready)
 *   3. Client acknowledges receipt:              DELETE /      → tombstone
 *   4. If no ACK within 24h, alarm auto-deletes the data.
 *
 * Setup in wrangler.toml:
 *   [[durable_objects.bindings]]
 *   name = "ASYNC_RESULT"
 *   class_name = "AsyncResultDO"
 *
 *   [[migrations]]
 *   tag = "v1"
 *   new_classes = ["AsyncResultDO"]
 */

import { DurableObject } from "cloudflare:workers";
import type { Bindings } from "@/core/types";

export class AsyncResultDO extends DurableObject {
  private storage: DurableObjectStorage;

  constructor(ctx: DurableObjectState, env: Bindings) {
    super(ctx, env);
    this.storage = ctx.storage;
  }

  async fetch(request: Request): Promise<Response> {
    const method = request.method;

    try {
      switch (method) {
        case "PUT":
          return this.store(request);
        case "GET":
          return this.retrieve();
        case "DELETE":
          return this.acknowledge();
        default:
          return new Response("Method not allowed", { status: 405 });
      }
    } catch (error) {
      console.error("[AsyncResultDO] Error:", error);
      return new Response("Internal error", { status: 500 });
    }
  }

  /** Store result data (called by queue consumer). */
  private async store(request: Request): Promise<Response> {
    const data = await request.json();

    await this.storage.put({
      result: data,
      status: "ready",
      storedAt: new Date().toISOString(),
    });

    // Set 24h auto-cleanup alarm for orphaned results
    try {
      await this.ctx.storage.setAlarm(Date.now() + 24 * 60 * 60 * 1000);
    } catch {
      // Non-critical — data is still stored
    }

    return new Response("stored", { status: 201 });
  }

  /** Retrieve result (polled by client). */
  private async retrieve(): Promise<Response> {
    const status = await this.storage.get("status");

    if (status === "deleted") {
      return Response.json({ message: "Result deleted" }, { status: 404 });
    }

    if (status !== "ready") {
      return Response.json({ status: "pending" }, { status: 202 });
    }

    const result = await this.storage.get("result");
    const storedAt = await this.storage.get("storedAt");

    return Response.json({ status: "ready", result, storedAt });
  }

  /** Client acknowledges receipt — tombstone pattern. */
  private async acknowledge(): Promise<Response> {
    await this.storage.put("status", "deleted");
    await this.storage.delete(["result", "storedAt"]);

    // Set 1h alarm to fully remove the tombstone
    try {
      await this.ctx.storage.setAlarm(Date.now() + 60 * 60 * 1000);
    } catch {
      // Non-critical
    }

    return new Response("deleted", { status: 200 });
  }

  /** Alarm handler — auto-cleanup orphaned or tombstoned data. */
  async alarm(): Promise<void> {
    console.log("[AsyncResultDO] Alarm: cleaning up");
    await this.storage.deleteAll();
  }
}
