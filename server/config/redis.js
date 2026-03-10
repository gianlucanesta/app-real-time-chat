"use strict";
require("dotenv").config();
const Redis = require("ioredis");

// ── Publisher client (used for SET / GET / DEL) ────────────────────────────────
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: false,
  retryStrategy: (times) => Math.min(times * 100, 3_000),
});

// ── Subscriber client (dedicated – share with publisher is not allowed for SUBSCRIBE)
const sub = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: false,
  retryStrategy: (times) => Math.min(times * 100, 3_000),
});

redis.on("connect", () => console.log("[redis] publisher connected"));
redis.on("error", (e) => console.error("[redis] publisher error:", e.message));
sub.on("connect", () => console.log("[redis] subscriber connected"));
sub.on("error", (e) => console.error("[redis] subscriber error:", e.message));

/**
 * Enable keyspace notifications for key-expiry events and subscribe.
 * The `io` parameter is the Socket.io server instance – passed in after boot.
 * The `Message` model is passed in to avoid circular dependencies.
 *
 * @param {import('socket.io').Server} io
 * @param {import('mongoose').Model} Message
 */
async function initKeyspaceExpiry(io, Message) {
  // Enable keyspace events: K = keyspace, E = keyevent, x = expired
  await redis.config("SET", "notify-keyspace-events", "KEx");

  // Subscribe to the expired keyevent channel on DB 0
  await sub.subscribe("__keyevent@0__:expired");

  sub.on("message", async (_channel, key) => {
    if (!key.startsWith("msg:")) return;

    const msgId = key.slice(4); // strip 'msg:' prefix
    try {
      const msg = await Message.findByIdAndDelete(msgId).lean();
      if (msg) {
        io.to("conv:" + msg.conversationId).emit("message:expired", {
          id: msgId,
        });
        console.log(
          `[ttl] removed message ${msgId} from conv ${msg.conversationId}`,
        );
      }
    } catch (err) {
      console.error("[ttl] error removing expired message:", err.message);
    }
  });

  console.log("[redis] keyspace expiry listener active");
}

module.exports = { redis, sub, initKeyspaceExpiry };
