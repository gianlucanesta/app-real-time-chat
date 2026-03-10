"use strict";
const jwt = require("jsonwebtoken");
const { Message, MESSAGE_TTL_SECONDS } = require("../models/Message");
const { redis } = require("../config/redis");

/**
 * Attach the Socket.io event map to the given server instance.
 *
 * Events:
 *   client → server: join:conversation, message:send, typing:start, typing:stop
 *   server → clients: message:new, message:expired, typing (re-broadcast)
 *
 * Authentication is enforced at handshake level – the JWT token must be
 * present in `socket.handshake.auth.token`. Any connection without a valid
 * token is rejected before event handlers run.
 *
 * @param {import('socket.io').Server} io
 */
function initSocket(io) {
  // ── Authentication middleware (runs on every new connection) ───────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Authentication error: token missing"));

    try {
      socket.user = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch {
      next(new Error("Authentication error: invalid or expired token"));
    }
  });

  // ── Connection handler ─────────────────────────────────────────────────────
  io.on("connection", (socket) => {
    console.log(`[socket] connected: ${socket.id} (user: ${socket.user.sub})`);

    // ── Join a conversation room ─────────────────────────────────────────────
    socket.on("join:conversation", (conversationId) => {
      if (typeof conversationId !== "string" || !conversationId) return;
      socket.join("conv:" + conversationId);
    });

    // ── Leave a conversation room ────────────────────────────────────────────
    socket.on("leave:conversation", (conversationId) => {
      if (typeof conversationId !== "string" || !conversationId) return;
      socket.leave("conv:" + conversationId);
    });

    // ── Send a message ───────────────────────────────────────────────────────
    socket.on("message:send", async (data) => {
      const { conversationId, text } = data || {};

      if (
        !conversationId ||
        !text ||
        typeof text !== "string" ||
        text.trim().length === 0
      ) {
        socket.emit("error", {
          message: "conversationId and text are required",
        });
        return;
      }
      if (text.length > 4096) {
        socket.emit("error", { message: "Message exceeds 4096 characters" });
        return;
      }

      try {
        const expires_at = Message.buildExpiresAt();
        const msg = await Message.create({
          conversationId,
          sender: socket.user.sub,
          text: text.trim(),
          expires_at,
        });

        // Mirror in Redis for precise TTL notification
        await redis.set(`msg:${msg._id}`, "1", "EX", MESSAGE_TTL_SECONDS);

        // Broadcast to all clients in the room, including the sender
        io.to("conv:" + conversationId).emit("message:new", msg);
      } catch (err) {
        console.error("[socket] message:send error:", err.message);
        socket.emit("error", { message: "Failed to save message" });
      }
    });

    // ── Typing indicators (re-broadcast to room, except sender) ─────────────
    socket.on("typing:start", (conversationId) => {
      if (typeof conversationId !== "string") return;
      socket.to("conv:" + conversationId).emit("typing", {
        userId: socket.user.sub,
        displayName: socket.user.displayName,
        typing: true,
      });
    });

    socket.on("typing:stop", (conversationId) => {
      if (typeof conversationId !== "string") return;
      socket.to("conv:" + conversationId).emit("typing", {
        userId: socket.user.sub,
        displayName: socket.user.displayName,
        typing: false,
      });
    });

    // ── Disconnect ───────────────────────────────────────────────────────────
    socket.on("disconnect", (reason) => {
      console.log(`[socket] disconnected: ${socket.id} (${reason})`);
    });
  });
}

module.exports = { initSocket };
