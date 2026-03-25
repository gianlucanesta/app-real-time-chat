import { describe, it, expect } from "vitest";
import jwt from "jsonwebtoken";

// Must set env BEFORE importing anything that reads config/env.js
process.env.JWT_SECRET = "test-secret-key-for-unit-tests";
process.env.JWT_EXPIRES_IN = "15m";
process.env.DATABASE_URL = "postgresql://test:test@localhost/test";
process.env.MONGO_URI = "mongodb://localhost/test";
process.env.CLOUDINARY_CLOUD_NAME = "test";
process.env.CLOUDINARY_API_KEY = "test";
process.env.CLOUDINARY_API_SECRET = "test";
process.env.MAILJET_API_KEY = "test";
process.env.MAILJET_API_SECRET = "test";

const { signAccessToken, generateRefreshToken, hashRefreshToken } =
  await import("../services/token.service.js");

describe("signAccessToken", () => {
  it("returns a valid JWT with expected claims", () => {
    const user = { id: "user-123", email: "a@b.com", display_name: "Alice" };
    const token = signAccessToken(user);

    const decoded = jwt.verify(
      token,
      "test-secret-key-for-unit-tests",
    ) as Record<string, unknown>;
    expect(decoded.sub).toBe("user-123");
    expect(decoded.email).toBe("a@b.com");
    expect(decoded.displayName).toBe("Alice");
  });
});

describe("generateRefreshToken", () => {
  it("returns an 80-character hex string", () => {
    const token = generateRefreshToken();
    expect(token).toHaveLength(80);
    expect(/^[0-9a-f]+$/.test(token)).toBe(true);
  });

  it("produces unique tokens on each call", () => {
    const a = generateRefreshToken();
    const b = generateRefreshToken();
    expect(a).not.toBe(b);
  });
});

describe("hashRefreshToken", () => {
  it("returns a 64-character hex SHA-256 hash", () => {
    const hash = hashRefreshToken("some-token");
    expect(hash).toHaveLength(64);
    expect(/^[0-9a-f]+$/.test(hash)).toBe(true);
  });

  it("is deterministic (same input → same output)", () => {
    const a = hashRefreshToken("abc");
    const b = hashRefreshToken("abc");
    expect(a).toBe(b);
  });

  it("produces different hashes for different inputs", () => {
    const a = hashRefreshToken("token-a");
    const b = hashRefreshToken("token-b");
    expect(a).not.toBe(b);
  });
});
