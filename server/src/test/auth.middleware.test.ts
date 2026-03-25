import { describe, it, expect, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// Must set env before importing middleware
process.env.JWT_SECRET = "test-secret-key-for-unit-tests";
process.env.DATABASE_URL = "postgresql://test:test@localhost/test";
process.env.MONGO_URI = "mongodb://localhost/test";
process.env.CLOUDINARY_CLOUD_NAME = "test";
process.env.CLOUDINARY_API_KEY = "test";
process.env.CLOUDINARY_API_SECRET = "test";
process.env.MAILJET_API_KEY = "test";
process.env.MAILJET_API_SECRET = "test";

const { authMiddleware } = await import("../middleware/auth.middleware.js");

function mockRes(): Response {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

describe("authMiddleware", () => {
  it("rejects requests without Authorization header", () => {
    const req = { headers: {} } as Request;
    const res = mockRes();
    const next = vi.fn() as NextFunction;

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining("Missing") }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects malformed Authorization header", () => {
    const req = { headers: { authorization: "Basic abc" } } as Request;
    const res = mockRes();
    const next = vi.fn() as NextFunction;

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects an invalid token", () => {
    const req = {
      headers: { authorization: "Bearer invalid.token.here" },
    } as Request;
    const res = mockRes();
    const next = vi.fn() as NextFunction;

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: "Invalid token" }),
    );
  });

  it("attaches decoded payload to req.user for valid token", () => {
    const token = jwt.sign(
      { sub: "user-1", email: "a@b.com", displayName: "Test" },
      "test-secret-key-for-unit-tests",
      { expiresIn: "1h" },
    );
    const req = {
      headers: { authorization: `Bearer ${token}` },
    } as Request;
    const res = mockRes();
    const next = vi.fn() as NextFunction;

    authMiddleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.user).toBeDefined();
    expect(req.user!.sub).toBe("user-1");
    expect(req.user!.email).toBe("a@b.com");
  });

  it("rejects an expired token", () => {
    const token = jwt.sign(
      { sub: "user-1", email: "a@b.com", displayName: "Test" },
      "test-secret-key-for-unit-tests",
      { expiresIn: "0s" }, // already expired
    );
    const req = {
      headers: { authorization: `Bearer ${token}` },
    } as Request;
    const res = mockRes();
    const next = vi.fn() as NextFunction;

    // Small delay so the 0s token is definitely expired
    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: "Token expired" }),
    );
  });
});
