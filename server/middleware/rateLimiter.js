"use strict";

/**
 * In-memory token-bucket rate limiter.
 * Pure Node.js – no external library required.
 *
 * Creates a middleware function that allows up to `maxRequests` per
 * `windowMs` milliseconds per IP address.
 *
 * Example:
 *   const globalLimiter = createLimiter(100, 15 * 60 * 1000);   // 100 / 15 min
 *   const authLimiter   = createLimiter(10,  60 * 1000);        // 10 / 1 min
 *
 * @param {number} maxRequests
 * @param {number} windowMs
 * @returns {(req, res, next) => void}
 */
function createLimiter(maxRequests, windowMs) {
  /** @type {Map<string, { count: number, windowStart: number }>} */
  const buckets = new Map();

  // Prune stale entries every windowMs to prevent memory growth
  const pruneInterval = setInterval(() => {
    const now = Date.now();
    for (const [ip, bucket] of buckets) {
      if (now - bucket.windowStart >= windowMs) buckets.delete(ip);
    }
  }, windowMs);

  // Allow the process to exit cleanly even if the interval is still running
  if (pruneInterval.unref) pruneInterval.unref();

  return function rateLimiter(req, res, next) {
    // Prefer the X-Forwarded-For header set by Render's reverse proxy
    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
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
      res.writeHead(429, {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfterSec),
      });
      res.end(
        JSON.stringify({ error: "Too many requests. Please slow down." }),
      );
      return;
    }

    next();
  };
}

// ── Pre-configured limiters used in the router ─────────────────────────────────

/** 100 requests per 15 minutes – applied globally to all API routes */
const globalLimiter = createLimiter(100, 15 * 60 * 1000);

/** 10 requests per minute – stricter limit for auth endpoints */
const authLimiter = createLimiter(10, 60 * 1000);

module.exports = { createLimiter, globalLimiter, authLimiter };
