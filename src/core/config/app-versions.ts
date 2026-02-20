/**
 * App version allow-list.
 *
 * The version middleware reads this config on every request.
 * - Set `allowed` to `"*"` to skip version checks entirely.
 * - Or list specific version strings (e.g. `["1.2.0", "1.3.0"]`).
 */

export const appVersions = {
  allowed: "*" as string | string[], // "*" = allow all, or ["1.0.0", "1.1.0"]
  latest: "1.0.0",
  minSupported: "1.0.0",
  updateUrl: "https://play.google.com/store/apps/details?id=com.example.myapp",
  message: "A new version is available. Please update to continue.",
};
