/**
 * Request ID middleware.
 *
 * Generates a unique correlation ID for every request.
 * - Sets it on `c.set("requestId")` for use in logging.
 * - Returns it as the `X-Request-Id` response header.
 * - Logs request start + end with duration.
 */

import type { MiddlewareHandler } from "hono";
import type { Bindings, Variables } from "@/core/types";

export const requestId: () => MiddlewareHandler<{
  Bindings: Bindings;
  Variables: Variables;
}> = () => {
  return async (c, next) => {
    const id = crypto.randomUUID();
    c.set("requestId", id);
    c.header("X-Request-Id", id);

    const start = Date.now();
    console.log(
      JSON.stringify({
        level: "info",
        msg: "request:start",
        requestId: id,
        method: c.req.method,
        path: c.req.path,
      })
    );

    await next();

    console.log(
      JSON.stringify({
        level: "info",
        msg: "request:end",
        requestId: id,
        method: c.req.method,
        path: c.req.path,
        status: c.res.status,
        durationMs: Date.now() - start,
      })
    );
  };
};
