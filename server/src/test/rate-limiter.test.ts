import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { createLimiter } from "../middleware/rate-limiter.middleware.js";

function mockReq(ip = "127.0.0.1"): Request {
  return {
    headers: {},
    socket: { remoteAddress: ip },
  } as unknown as Request;
}

function mockRes(): Response {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn(),
  } as unknown as Response;
  return res;
}

describe("createLimiter", () => {
  let limiter: (req: Request, res: Response, next: NextFunction) => void;

  beforeEach(() => {
    limiter = createLimiter(3, 60_000); // 3 requests per minute
  });

  it("allows requests under the limit", () => {
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn();

    limiter(req, res, next);
    limiter(req, res, next);
    limiter(req, res, next);

    expect(next).toHaveBeenCalledTimes(3);
  });

  it("blocks requests over the limit with 429", () => {
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn();

    // Use up all 3 allowed requests
    limiter(req, res, next);
    limiter(req, res, next);
    limiter(req, res, next);

    // 4th should be blocked
    limiter(req, res, next);

    expect(next).toHaveBeenCalledTimes(3);
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.setHeader).toHaveBeenCalledWith(
      "Retry-After",
      expect.any(String),
    );
  });

  it("tracks IPs independently", () => {
    const next = vi.fn();

    // Exhaust IP A
    for (let i = 0; i < 4; i++) {
      limiter(mockReq("10.0.0.1"), mockRes(), next);
    }
    expect(next).toHaveBeenCalledTimes(3);

    // IP B should still be allowed
    const nextB = vi.fn();
    limiter(mockReq("10.0.0.2"), mockRes(), nextB);
    expect(nextB).toHaveBeenCalledOnce();
  });
});
