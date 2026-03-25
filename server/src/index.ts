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
  const INTERVAL_MS = 5 * 60 * 1000; // 5 minutes — well within Render's 15-min idle cutoff

  const ping = (): void => {
    const client = pingUrl.startsWith("https") ? https : http;
    const req = client.get(pingUrl, (res) => {
      res.resume(); // drain the response
    });
    req.on("error", (err) => {
      console.warn("[keep-alive] self-ping failed:", err.message);
    });
    req.end();
  };

  // Fire immediately so the very first boot also resets Render's idle timer,
  // then keep pinging every 5 min. Using setInterval alone would wait the
  // full interval before the first ping, leaving a gap during fast restarts.
  ping();
  setInterval(ping, INTERVAL_MS);
  console.log(`[keep-alive] self-ping active → ${pingUrl} every 5 min`);
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
      // Allow polling so Render's reverse proxy can complete the upgrade to
      // WebSocket. Polling-only is rejected by websocket-only servers (400).
      transports: ["polling", "websocket"],
    });

    initSocket(io as any);

    // Expose io on app so REST controllers can emit socket events
    app.set("io", io);

    // ── Database connections ───────────────────────────────────────────────
    await initSchema();
    await connectMongo();

    // Start periodic Cloudinary media cleanup + expired-message sweep.
    // The sweep is the fallback for Redis keyspace expiry (unavailable on
    // managed Redis) – it emits `message:expired` socket events directly.
    startMediaCleanupJob(io as any);

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

      // Hard-exit fallback: if graceful shutdown doesn't complete within
      // 10 s (e.g. lingering keep-alive connections), force-exit so Render
      // counts it as a clean stop rather than a crash / force-kill.
      const forceExit = setTimeout(() => {
        console.warn("[server] graceful shutdown timed out – forcing exit");
        process.exit(0);
      }, 10_000);
      forceExit.unref(); // don't keep the event loop alive just for this

      // Close Socket.io first so all clients receive a proper disconnect
      // event (instead of "transport close") and can reconnect immediately.
      io.close(() => {
        // Explicitly destroy lingering keep-alive connections (Node ≥ 18.2).
        // Without this, httpServer.close() waits indefinitely for idle
        // keep-alive sockets (cron-job pinger, browser tabs, self-ping).
        if (typeof httpServer.closeAllConnections === "function") {
          httpServer.closeAllConnections();
        }
        httpServer.close(() => {
          console.log("[server] HTTP server closed");
          clearTimeout(forceExit);
          process.exit(0);
        });
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
