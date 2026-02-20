import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "../password";

describe("password utilities", () => {
  it("hashes a password to salt:hash format", async () => {
    const hashed = await hashPassword("mypassword");
    expect(hashed).toContain(":");
    const [salt, hash] = hashed.split(":");
    expect(salt).toHaveLength(32); // 16 bytes = 32 hex chars
    expect(hash).toHaveLength(64); // 256 bits = 64 hex chars
  });

  it("produces different hashes for the same password (random salt)", async () => {
    const hash1 = await hashPassword("same-password");
    const hash2 = await hashPassword("same-password");
    expect(hash1).not.toBe(hash2);
  });

  it("verifies a correct password", async () => {
    const hashed = await hashPassword("correct-horse");
    expect(await verifyPassword("correct-horse", hashed)).toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hashed = await hashPassword("correct-horse");
    expect(await verifyPassword("wrong-horse", hashed)).toBe(false);
  });
});
