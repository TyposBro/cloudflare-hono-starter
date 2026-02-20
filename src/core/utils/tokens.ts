/**
 * JWT helpers using Hono's built-in JWT utilities.
 *
 * Tokens are signed with HS256 and carry { sub, iat, exp }.
 */

import { sign, verify } from "hono/jwt";
import type { Bindings } from "@/core/types";

const ACCESS_TTL = 60 * 60 * 24; // 1 day in seconds
const REFRESH_TTL = 60 * 60 * 24 * 30; // 30 days

export async function generateAccessToken(
  env: Bindings,
  userId: string
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return sign(
    { sub: userId, iat: now, exp: now + ACCESS_TTL },
    env.JWT_SECRET,
    "HS256"
  );
}

export async function generateRefreshToken(
  env: Bindings,
  userId: string
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return sign(
    { sub: userId, type: "refresh", iat: now, exp: now + REFRESH_TTL },
    env.JWT_SECRET,
    "HS256"
  );
}

export async function verifyToken(
  env: Bindings,
  token: string
): Promise<{ sub: string }> {
  return (await verify(token, env.JWT_SECRET, "HS256")) as { sub: string };
}
