import "dotenv/config";
import http from "node:http";
import https from "node:https";
import { Server as SocketIO } from "socket.io";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { initSchema } from "./config/db.js";
import { connectMongo } from "./config/mongo.js";
import { redis, initKeyspaceExpiry } from "./config/redis.js";
import { initSocket } from "./socket/index.js";
import { Message } from "./models/message.model.js";
import { startMediaCleanupJob } from "./services/media-cleanup.service.js";

/**
 * Ping our own /api/health every 10 minutes to prevent Render free tier
 * from spinning the service down after 15 minutes of inactivity.
 * Only runs when RENDER_EXTERNAL_URL is set (i.e. on Render).
 */
function startSelfPing(): void {
  const externalUrl = process.env.RENDER_EXTERNAL_URL;
  if (!externalUrl) return; // local dev — skip

  const pingUrl = `${externalUrl}/api/health`;
  const INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

  const ping = (): void => {
    const client = pingUrl.startsWith("https") ? https : http;
    const req = client.get(pingUrl, (res) => {
      console.log(`[keep-alive] self-ping → ${res.statusCode}`);
      res.resume(); // drain the response
    });
    req.on("error", (err) => {
      console.warn("[keep-alive] self-ping failed:", err.message);
    });
    req.end();
  };

  setInterval(ping, INTERVAL_MS);
  console.log(`[keep-alive] self-ping active → ${pingUrl} every 10 min`);
}

/**
 * Server startup sequence.
 * 1. PostgreSQL – schema migration
 * 2. MongoDB – connect
 * 3. Redis – ping + keyspace expiry (optional)
 * 4. HTTP server + Socket.io – listen
 */
async function start(): Promise<void> {
  try {
    const app = createApp();
    const httpServer = http.createServer(app);

    // ── Socket.io ──────────────────────────────────────────────────────────
    const io = new SocketIO(httpServer, {
      cors: {
        origin:
          env.ALLOWED_ORIGINS.length === 1 && env.ALLOWED_ORIGINS[0] === "*"
            ? "*"
            : env.ALLOWED_ORIGINS,
        methods: ["GET", "POST"],
        credentials: true,
      },
      transports: ["websocket"],
    });

    initSocket(io as any);

    // Expose io on app so REST controllers can emit socket events
    app.set("io", io);

    // ── Database connections ───────────────────────────────────────────────
    await initSchema();
    await connectMongo();

    // Start periodic Cloudinary media cleanup for expiring messages
    startMediaCleanupJob();

    // Redis – optional: message TTL expiry won't work if Redis is unavailable
    try {
      await redis.ping();
      await initKeyspaceExpiry(io, Message as any);
    } catch (err) {
      console.warn(
        "[redis] not available – TTL expiry disabled:",
        (err as Error).message,
      );
    }

    // ── HTTP server ───────────────────────────────────────────────────────
    httpServer.listen(env.PORT, () => {
      console.log(`[server] Ephemeral backend listening on port ${env.PORT}`);
      startSelfPing();
    });

    // ── Graceful shutdown ─────────────────────────────────────────────────
    const shutdown = (signal: string): void => {
      console.log(`[server] ${signal} received – shutting down gracefully`);
      httpServer.close(() => {
        console.log("[server] HTTP server closed");
        process.exit(0);
      });
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (err) {
    console.error("[server] startup failed:", (err as Error).message);
    process.exit(1);
  }
}

start();
