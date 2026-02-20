/**
 * App version enforcement middleware.
 *
 * Mobile clients send `X-App-Version` on every request. If the version
 * is not in the allow-list, the server responds with **426 Upgrade Required**
 * and includes the latest version + store URL so the client can prompt the user.
 *
 * Web clients (identified by a `Mozilla` User-Agent) are always allowed through.
 *
 * Configuration lives in `core/config/app-versions.ts`.
 */

import type { Context, Next } from "hono";
import { appVersions } from "@/core/config/app-versions";

export const FORCE_UPDATE_CODE = "FORCE_UPDATE_REQUIRED";

export const requireAllowedVersion = async (c: Context, next: Next) => {
  try {
    const version = c.req.header("X-App-Version");

    // No header → distinguish web from old mobile builds
    if (!version) {
      const ua = c.req.header("User-Agent") ?? "";
      if (ua.includes("Mozilla")) {
        return next();
      }
      return c.json(
        {
          code: FORCE_UPDATE_CODE,
          message: appVersions.message,
          latestVersion: appVersions.latest,
          updateUrl: appVersions.updateUrl,
        },
        426
      );
    }

    const allowAll =
      appVersions.allowed === "*" ||
      (Array.isArray(appVersions.allowed) && appVersions.allowed.includes("*"));

    if (!allowAll && !appVersions.allowed.includes(version)) {
      return c.json(
        {
          code: FORCE_UPDATE_CODE,
          message: appVersions.message,
          latestVersion: appVersions.latest,
          updateUrl: appVersions.updateUrl,
        },
        426
      );
    }

    await next();
  } catch (e) {
    console.error("[VersionCheck] Error:", e);
    return c.json({ message: "Server error during version check" }, 500);
  }
};
