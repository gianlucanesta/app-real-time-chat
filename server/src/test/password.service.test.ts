import { describe, it, expect } from "vitest";
import { hashPassword, comparePassword } from "../services/password.service.js";

describe("password hashing", () => {
  it("hashes a password and verifies it", async () => {
    const hash = await hashPassword("Secret123");
    expect(hash).not.toBe("Secret123");
    expect(hash.startsWith("$2a$") || hash.startsWith("$2b$")).toBe(true);

    const match = await comparePassword("Secret123", hash);
    expect(match).toBe(true);
  });

  it("rejects wrong password", async () => {
    const hash = await hashPassword("Correct1");
    const match = await comparePassword("Wrong999", hash);
    expect(match).toBe(false);
  });

  it("produces different hashes for the same password (salt)", async () => {
    const a = await hashPassword("Same1234");
    const b = await hashPassword("Same1234");
    expect(a).not.toBe(b);
  });
});
