import type { Request, Response, NextFunction } from "express";

interface Bucket {
  count: number;
  windowStart: number;
}

/**
 * In-memory token-bucket rate limiter.
 * Creates middleware that allows up to `maxRequests` per `windowMs` per IP.
 */
export function createLimiter(
  maxRequests: number,
  windowMs: number,
): (req: Request, res: Response, next: NextFunction) => void {
  const buckets = new Map<string, Bucket>();

  // Prune stale entries to prevent memory growth
  const pruneInterval = setInterval(() => {
    const now = Date.now();
    for (const [ip, bucket] of buckets) {
      if (now - bucket.windowStart >= windowMs) buckets.delete(ip);
    }
  }, windowMs);

  if (pruneInterval.unref) pruneInterval.unref();

  return function rateLimiter(
    req: Request,
    res: Response,
    next: NextFunction,
  ): void {
    const ip =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      "unknown";

    const now = Date.now();
    let bucket = buckets.get(ip);

    if (!bucket || now - bucket.windowStart >= windowMs) {
      bucket = { count: 0, windowStart: now };
    }

    bucket.count += 1;
    buckets.set(ip, bucket);

    if (bucket.count > maxRequests) {
      const retryAfterSec = Math.ceil(
        (windowMs - (now - bucket.windowStart)) / 1000,
      );
      res.setHeader("Retry-After", String(retryAfterSec));
      res.status(429).json({ error: "Too many requests. Please slow down." });
      return;
    }

    next();
  };
}

/** 100 requests per 15 minutes – applied globally to all API routes. */
export const globalLimiter = createLimiter(100, 15 * 60 * 1000);

/** 10 requests per minute – stricter limit for auth endpoints. */
export const authLimiter = createLimiter(10, 60 * 1000);
