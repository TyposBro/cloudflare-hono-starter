/**
 * Auth service – business logic layer.
 *
 * Orchestrates registration, login, and profile retrieval.
 * Depends on `AuthRepository` (abstraction) rather than raw DB calls.
 */

import type { Bindings } from "@/core/types";
import { hashPassword, verifyPassword } from "@/core/utils/password";
import { generateAccessToken, generateRefreshToken } from "@/core/utils/tokens";
import type { AuthRepository } from "../data/auth.repository";

export class AuthService {
  constructor(
    private repo: AuthRepository,
    private env: Bindings
  ) {}

  async register(email: string, password: string, name: string) {
    const existing = await this.repo.findByEmail(email);
    if (existing) {
      throw new AuthError("Email already in use", 409);
    }

    const now = new Date().toISOString();
    const user = await this.repo.create({
      id: crypto.randomUUID(),
      email,
      name,
      passwordHash: await hashPassword(password),
      createdAt: now,
      updatedAt: now,
    });

    const [accessToken, refreshToken] = await Promise.all([
      generateAccessToken(this.env, user.id),
      generateRefreshToken(this.env, user.id),
    ]);

    return { accessToken, refreshToken };
  }

  async login(email: string, password: string) {
    const user = await this.repo.findByEmail(email);
    if (!user) {
      throw new AuthError("Invalid email or password", 401);
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      throw new AuthError("Invalid email or password", 401);
    }

    const [accessToken, refreshToken] = await Promise.all([
      generateAccessToken(this.env, user.id),
      generateRefreshToken(this.env, user.id),
    ]);

    return { accessToken, refreshToken };
  }
}

/** Domain-specific error with HTTP status. */
export class AuthError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}
