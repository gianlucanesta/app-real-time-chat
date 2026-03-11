"use strict";
const authMiddleware = require("../middleware/auth");
const { globalLimiter, authLimiter } = require("../middleware/rateLimiter");

// ── Route handlers (imported lazily after all modules are ready) ───────────────
const authRoutes = require("../routes/auth");
const messagesRoutes = require("../routes/messages");
const usersRoutes = require("../routes/users");

/**
 * Route table entry:
 *   method  {string}   HTTP method in UPPERCASE
 *   pattern {RegExp}   matched against the pathname (query string stripped)
 *   handler {Function} (req, res, params) => void
 *   auth    {boolean}  whether authMiddleware must run first
 *   limiter {Function} optional rate-limiter to apply
 */
const ROUTES = [
  // ── Health check ──────────────────────────────────────────────────────────
  {
    method: "GET",
    pattern: /^\/api\/health$/,
    handler: (_req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok" }));
    },
    auth: false,
  },

  // ── Auth ──────────────────────────────────────────────────────────────────
  {
    method: "POST",
    pattern: /^\/api\/auth\/register$/,
    handler: authRoutes.register,
    auth: false,
    limiter: authLimiter,
  },
  {
    method: "POST",
    pattern: /^\/api\/auth\/login$/,
    handler: authRoutes.login,
    auth: false,
    limiter: authLimiter,
  },
  {
    method: "POST",
    pattern: /^\/api\/auth\/refresh$/,
    handler: authRoutes.refresh,
    auth: false,
    limiter: authLimiter,
  },
  {
    method: "POST",
    pattern: /^\/api\/auth\/logout$/,
    handler: authRoutes.logout,
    auth: true,
  },

  // ── Messages ──────────────────────────────────────────────────────────────
  // GET  /api/messages/:conversationId
  {
    method: "GET",
    pattern: /^\/api\/messages\/([^/]+)$/,
    handler: messagesRoutes.list,
    auth: true,
  },
  // POST /api/messages
  {
    method: "POST",
    pattern: /^\/api\/messages$/,
    handler: messagesRoutes.create,
    auth: true,
  },

  // ── Users ─────────────────────────────────────────────────────────────────
  {
    method: "GET",
    pattern: /^\/api\/users\/me$/,
    handler: usersRoutes.me,
    auth: true,
  },
  {
    method: "GET",
    pattern: /^\/api\/users\/search$/,
    handler: usersRoutes.search,
    auth: true,
  },
  {
    method: "GET",
    pattern: /^\/api\/users\/lookup-phone$/,
    handler: usersRoutes.lookupPhone,
    auth: true,
  },
  {
    method: "PATCH",
    pattern: /^\/api\/users\/([^/]+)$/,
    handler: usersRoutes.update,
    auth: true,
  },
];

/**
 * Main request dispatcher.
 * Called by server.js for every incoming request that passes the security
 * headers and CORS pre-flight phase.
 *
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse}  res
 */
function dispatch(req, res) {
  // Strip query string for pattern matching
  const pathname = req.url.split("?")[0];
  const method = req.method.toUpperCase();

  // ── OPTIONS pre-flight ────────────────────────────────────────────────────
  if (method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // ── Apply global rate limiter ─────────────────────────────────────────────
  globalLimiter(req, res, () => {
    // ── Match route ────────────────────────────────────────────────────────
    for (const route of ROUTES) {
      if (route.method !== method) continue;
      const match = pathname.match(route.pattern);
      if (!match) continue;

      // URL params: capture groups become positional params array
      const params = match.slice(1);

      // ── Per-route rate limiter (e.g. auth endpoints) ───────────────────
      const runHandler = () => {
        if (route.auth) {
          authMiddleware(req, res, () => route.handler(req, res, params));
        } else {
          route.handler(req, res, params);
        }
      };

      if (route.limiter) {
        route.limiter(req, res, runHandler);
      } else {
        runHandler();
      }
      return;
    }

    // ── 404 ────────────────────────────────────────────────────────────────
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  });
}

module.exports = { dispatch };
