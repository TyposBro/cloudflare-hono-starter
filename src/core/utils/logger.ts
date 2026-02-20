/**
 * Structured JSON logger.
 *
 * Attaches the `requestId` from context so every log line can be
 * correlated back to a single HTTP request.
 *
 * Usage:
 *   const log = createLogger(c, "posts");
 *   log.info("Post created", { postId: "abc" });
 */

import type { AppContext } from "@/core/types";

type Extra = Record<string, unknown>;

export function createLogger(c: AppContext, feature?: string) {
  const base = () => ({
    requestId: c.get("requestId"),
    ...(feature ? { feature } : {}),
  });

  return {
    debug(msg: string, extra?: Extra) {
      console.log(JSON.stringify({ level: "debug", msg, ...base(), ...extra }));
    },
    info(msg: string, extra?: Extra) {
      console.log(JSON.stringify({ level: "info", msg, ...base(), ...extra }));
    },
    warn(msg: string, extra?: Extra) {
      console.warn(
        JSON.stringify({ level: "warn", msg, ...base(), ...extra })
      );
    },
    error(msg: string, error?: unknown, extra?: Extra) {
      console.error(
        JSON.stringify({
          level: "error",
          msg,
          error: error instanceof Error ? error.message : error,
          stack: error instanceof Error ? error.stack : undefined,
          ...base(),
          ...extra,
        })
      );
    },
  };
}
