/**
 * R2 file upload utility.
 *
 * Uploads a file to Cloudflare R2 and returns its public URL.
 * File names are prefixed with a timestamp to prevent collisions.
 *
 * @example
 *   const url = await uploadToCDN(env, file, "avatars");
 *   // → "https://pub-xxx.r2.dev/avatars/1708000000000-photo.jpg"
 */

import type { Bindings } from "@/core/types";

export async function uploadToCDN(
  env: Bindings,
  file: File,
  folder: string
): Promise<string> {
  const bucket = env.CDN_BUCKET;
  if (!bucket) throw new Error("CDN_BUCKET binding not configured");

  const safeName = file.name.replace(/\s/g, "_");
  const filePath = `${folder}/${Date.now()}-${safeName}`;

  await bucket.put(filePath, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type },
  });

  return `${env.R2_PUBLIC_URL}/${filePath}`;
}

/**
 * Delete a file from R2 by its key (path).
 */
export async function deleteFromCDN(
  env: Bindings,
  key: string
): Promise<void> {
  await env.CDN_BUCKET.delete(key);
}
