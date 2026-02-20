/**
 * Global error handler.
 *
 * Catches all unhandled errors and returns a consistent JSON envelope.
 * - ZodError        → 400 with field-level details
 * - HTTPException   → forwards the original status
 * - Everything else → 500 (message hidden in production)
 */

import type { Context, ErrorHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { ZodError } from "zod";
import type { Bindings, Variables } from "@/core/types";

export const globalErrorHandler: ErrorHandler<{
  Bindings: Bindings;
  Variables: Variables;
}> = (err: Error, c: Context) => {
  console.error(
    JSON.stringify({
      level: "error",
      msg: "unhandled_error",
      error: err.message,
      stack: err.stack,
      requestId: c.get("requestId"),
    })
  );

  // Zod validation errors
  if (err instanceof ZodError) {
    return c.json(
      {
        message: "Validation Error",
        errors: err.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
        code: "VALIDATION_ERROR",
      },
      400
    );
  }

  // Hono HTTP exceptions (thrown by middleware, etc.)
  if (err instanceof HTTPException) {
    return c.json(
      {
        message: err.message,
        code: "HTTP_ERROR",
      },
      err.status
    );
  }

  // Generic server error – hide internals in production
  return c.json(
    {
      message: "Internal Server Error",
      ...(c.env.ENVIRONMENT !== "production" ? { error: err.message } : {}),
      code: "SERVER_ERROR",
    },
    500
  );
};
