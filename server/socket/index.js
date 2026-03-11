"use strict";
const jwt = require("jsonwebtoken");
const { Message, MESSAGE_TTL_SECONDS } = require("../models/Message");
const { redis } = require("../config/redis");

// Track which users are online and their socket IDs.
// Map<userId, Set<socketId>>  (a user may have multiple tabs open)
const onlineUsers = new Map();

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

    // ── Personal notification room ───────────────────────────────────────────
    // Allows delivery of messages before the recipient has opened the conversation.
    socket.join("user:" + socket.user.sub);

    // ── Presence: mark user as online ────────────────────────────────────────
    const userId = socket.user.sub;
    if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
    const wasOffline = onlineUsers.get(userId).size === 0;
    onlineUsers.get(userId).add(socket.id);
    if (wasOffline) {
      // Broadcast to every connected client that this user came online
      io.emit("presence:online", { userId });
    }
    // Send the full set of currently-online user IDs to this newly-connected socket
    socket.emit("presence:list", [...onlineUsers.keys()]);

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
    socket.on("message:send", async (data, ack) => {
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

        // Include sender display info so receivers can build the contact entry
        const msgPayload = msg.toObject();
        msgPayload.senderDisplayName = socket.user.displayName;

        // Broadcast to conv room (joined members) + recipient's personal room
        // (in case they haven't opened this conversation yet).
        // Socket.io v4 deduplicates: a socket in both rooms only gets it once.
        const parts = conversationId.split("___");
        const recipientId =
          parts.length === 2
            ? parts.find((id) => id !== socket.user.sub)
            : null;
        if (recipientId) {
          io.to("conv:" + conversationId)
            .to("user:" + recipientId)
            .emit("message:new", msgPayload);
        } else {
          io.to("conv:" + conversationId).emit("message:new", msgPayload);
        }

        // Acknowledge to the sender so the client can show the "sent" tick
        if (typeof ack === "function") {
          ack({ ok: true, messageId: String(msg._id) });
        }
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

    // ── Message status events ────────────────────────────────────────────────
    // Client tells us it has received (displayed or at least stored) messages
    socket.on("message:delivered", ({ messageIds, conversationId }) => {
      if (!Array.isArray(messageIds) || !conversationId) return;
      // Relay to conv room + other party's personal room (so they get it
      // even if they navigated away from this conversation).
      const parts = conversationId.split("___");
      const otherId =
        parts.length === 2 ? parts.find((id) => id !== socket.user.sub) : null;
      const payload = { messageIds, status: "delivered" };
      if (otherId) {
        socket
          .to("conv:" + conversationId)
          .to("user:" + otherId)
          .emit("message:status", payload);
      } else {
        socket.to("conv:" + conversationId).emit("message:status", payload);
      }
    });

    // Client tells us the user has read (viewed) messages
    socket.on("message:read", ({ messageIds, conversationId }) => {
      if (!Array.isArray(messageIds) || !conversationId) return;
      const parts = conversationId.split("___");
      const otherId =
        parts.length === 2 ? parts.find((id) => id !== socket.user.sub) : null;
      const payload = { messageIds, status: "read" };
      if (otherId) {
        socket
          .to("conv:" + conversationId)
          .to("user:" + otherId)
          .emit("message:status", payload);
      } else {
        socket.to("conv:" + conversationId).emit("message:status", payload);
      }
    });

    // ── Disconnect ───────────────────────────────────────────────────────────
    socket.on("disconnect", (reason) => {
      console.log(`[socket] disconnected: ${socket.id} (${reason})`);
      const uid = socket.user.sub;
      const sockets = onlineUsers.get(uid);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          onlineUsers.delete(uid);
          io.emit("presence:offline", { userId: uid });
        }
      }
    });
  });
}

module.exports = { initSocket };
