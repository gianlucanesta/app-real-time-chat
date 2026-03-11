"use strict";
require("dotenv").config();

const http = require("node:http");
const { Server: SocketIO } = require("socket.io");

const { initSchema } = require("./config/db");
const { connectMongo } = require("./config/mongo");
const { redis, initKeyspaceExpiry } = require("./config/redis");
const { initSocket } = require("./socket/index");
const { dispatch } = require("./router/index");
const { Message } = require("./models/Message");

const PORT = Number(process.env.PORT) || 3001;
// Support comma-separated list of allowed origins (e.g. for local dev with Live Server)
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGIN || "*")
  .split(",")
  .map((o) => o.trim());

// ── Security headers ─────────────────────────────────────────────────────────
// Applied on every response before routing – no framework needed.
function applySecurityHeaders(res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  // X-XSS-Protection is deprecated; rely on CSP instead
  res.setHeader("X-XSS-Protection", "0");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains",
  );
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:",
  );
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
}

// ── CORS headers ──────────────────────────────────────────────────────────────
function applyCORSHeaders(req, res) {
  const origin = req.headers.origin || "";
  const allowed = ALLOWED_ORIGINS.includes("*")
    ? "*"
    : ALLOWED_ORIGINS.includes(origin)
      ? origin
      : ALLOWED_ORIGINS[0];
  res.setHeader("Access-Control-Allow-Origin", allowed);
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PATCH, DELETE, OPTIONS",
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Vary", "Origin");
}

// ── HTTP server ───────────────────────────────────────────────────────────────
const httpServer = http.createServer((req, res) => {
  applySecurityHeaders(res);
  applyCORSHeaders(req, res);

  // OPTIONS pre-flight — handled globally here so the router doesn't need to
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // Only handle /api/* routes – everything else is the static frontend
  if (!req.url.startsWith("/api/")) {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
    return;
  }

  dispatch(req, res);
});

// ── Socket.io ────────────────────────────────────────────────────────────────
const io = new SocketIO(httpServer, {
  cors: {
    origin:
      ALLOWED_ORIGINS.length === 1 && ALLOWED_ORIGINS[0] === "*"
        ? "*"
        : ALLOWED_ORIGINS,
    methods: ["GET", "POST"],
    credentials: true,
  },
  // Only WebSocket transport – no long-polling fallback
  transports: ["websocket"],
});

initSocket(io);

// ── Server startup sequence ──────────────────────────────────────────────────
async function start() {
  try {
    // 1. PostgreSQL – schema migration
    await initSchema();

    // 2. MongoDB
    await connectMongo();

    // 3. Redis – optional: message TTL expiry won't work if Redis is unavailable
    try {
      await redis.ping();
      await initKeyspaceExpiry(io, Message);
    } catch (err) {
      console.warn("[redis] not available – TTL expiry disabled:", err.message);
    }

    // 4. HTTP server
    httpServer.listen(PORT, () => {
      console.log(`[server] Ephemeral backend listening on port ${PORT}`);
    });
  } catch (err) {
    console.error("[server] startup failed:", err.message);
    process.exit(1);
  }
}

// ── Graceful shutdown ─────────────────────────────────────────────────────────
async function shutdown(signal) {
  console.log(`[server] ${signal} received – shutting down gracefully`);
  httpServer.close(() => {
    console.log("[server] HTTP server closed");
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

start();
