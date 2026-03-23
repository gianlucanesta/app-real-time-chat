import type { Socket } from "socket.io";
import type { TypedServer } from "./index.js";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
} from "../interfaces/socket.interface.js";
import { Message, MESSAGE_TTL_SECONDS } from "../models/message.model.js";
import { redis } from "../config/redis.js";
import { deleteCloudinaryAssetsForMessages } from "../services/cloudinary.service.js";
import * as UserModel from "../models/user.model.js";

type TypedSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;

/** Register message-related event handlers on a socket. */
export function registerMessageHandlers(
  io: TypedServer,
  socket: TypedSocket,
): void {
  const userId = socket.data.user.sub;
  const displayName = socket.data.user.displayName;

  // ── message:send ──
  socket.on(
    "message:send",
    async (
      data: {
        conversationId: string;
        text: string;
        mediaUrl?: string;
        mediaType?: "image" | "video" | "audio";
        mediaDuration?: number;
        viewOnce?: boolean;
      },
      ack: (res: { ok: boolean; messageId?: string }) => void,
    ) => {
      const {
        conversationId,
        text,
        mediaUrl,
        mediaType,
        mediaDuration,
        viewOnce,
      } = data || {};

      if (!conversationId) {
        socket.emit("error", {
          message: "conversationId is required",
        });
        return;
      }

      // Must have either text or media
      const hasText =
        text && typeof text === "string" && text.trim().length > 0;
      const hasMedia = mediaUrl && mediaType;

      if (!hasText && !hasMedia) {
        socket.emit("error", {
          message: "text or media is required",
        });
        return;
      }
      if (hasText && text.length > 4096) {
        socket.emit("error", { message: "Message exceeds 4096 characters" });
        return;
      }

      try {
        const expires_at = (Message as any).buildExpiresAt();
        const msg = await Message.create({
          conversationId,
          sender: userId,
          text: hasText ? text.trim() : "",
          mediaUrl: mediaUrl || null,
          mediaType: mediaType || null,
          mediaDuration: mediaDuration || null,
          viewOnce: !!viewOnce,
          expires_at,
        });

        try {
          await redis.set(`msg:${msg._id}`, "1", "EX", MESSAGE_TTL_SECONDS);
        } catch (redisErr) {
          console.warn(
            "[socket] redis set failed (non-fatal):",
            (redisErr as Error).message,
          );
        }

        const senderProfile = await UserModel.findById(userId).catch(
          () => null,
        );

        const msgPayload = {
          ...msg.toObject(),
          _id: String(msg._id),
          senderDisplayName: displayName,
          senderInitials: senderProfile?.initials ?? "",
          senderGradient:
            senderProfile?.avatar_gradient ??
            "linear-gradient(135deg,#2563EB,#7C3AED)",
        };

        const parts = conversationId.split("___");
        const recipientId =
          parts.length === 2 ? parts.find((id: string) => id !== userId) : null;

        if (recipientId) {
          io.to("conv:" + conversationId)
            .to("user:" + recipientId)
            .emit("message:new", msgPayload as any);
        } else {
          io.to("conv:" + conversationId).emit(
            "message:new",
            msgPayload as any,
          );
        }

        if (typeof ack === "function") {
          ack({ ok: true, messageId: String(msg._id) });
        }
      } catch (err) {
        console.error("[socket] message:send error:", (err as Error).message);
        socket.emit("error", { message: "Failed to save message" });
        if (typeof ack === "function") {
          ack({ ok: false });
        }
      }
    },
  );

  // ── message:delivered ──
  socket.on(
    "message:delivered",
    async (data: { messageIds: string[]; conversationId: string }) => {
      const { messageIds, conversationId } = data;
      if (!Array.isArray(messageIds) || !conversationId) return;

      try {
        await Message.updateMany(
          { _id: { $in: messageIds }, status: "sent" },
          { $set: { status: "delivered" } },
        );
      } catch (err) {
        console.error(
          "[socket] message:delivered DB error:",
          (err as Error).message,
        );
      }

      const parts = conversationId.split("___");
      const otherId =
        parts.length === 2 ? parts.find((id: string) => id !== userId) : null;
      const payload = { messageIds, status: "delivered" as const };

      if (otherId) {
        socket
          .to("conv:" + conversationId)
          .to("user:" + otherId)
          .emit("message:status", payload);
      } else {
        socket.to("conv:" + conversationId).emit("message:status", payload);
      }
    },
  );

  // ── message:read ──
  socket.on(
    "message:read",
    async (data: { messageIds: string[]; conversationId: string }) => {
      const { messageIds, conversationId } = data;
      if (!Array.isArray(messageIds) || !conversationId) return;

      try {
        await Message.updateMany(
          {
            _id: { $in: messageIds },
            status: { $in: ["sent", "delivered"] },
          },
          { $set: { status: "read" } },
        );
      } catch (err) {
        console.error(
          "[socket] message:read DB error:",
          (err as Error).message,
        );
      }

      const parts = conversationId.split("___");
      const otherId =
        parts.length === 2 ? parts.find((id: string) => id !== userId) : null;
      const payload = { messageIds, status: "read" as const };

      if (otherId) {
        socket
          .to("conv:" + conversationId)
          .to("user:" + otherId)
          .emit("message:status", payload);
      } else {
        socket.to("conv:" + conversationId).emit("message:status", payload);
      }
    },
  );

  // ── message:deleteForEveryone ──
  socket.on(
    "message:deleteForEveryone",
    async (
      data: { messageIds: string[]; conversationId: string },
      ack: (res: { ok: boolean; deleted?: number }) => void,
    ) => {
      const { messageIds, conversationId } = data;
      if (
        !Array.isArray(messageIds) ||
        messageIds.length === 0 ||
        !conversationId
      ) {
        if (typeof ack === "function") ack({ ok: false });
        return;
      }
      if (messageIds.length > 500) {
        if (typeof ack === "function") ack({ ok: false });
        return;
      }

      try {
        // Only allow deleting own messages
        const messages = await Message.find(
          { _id: { $in: messageIds }, sender: userId },
          { mediaUrl: 1, mediaType: 1 },
        ).lean();

        const ownIds = messages.map((m) => String(m._id));
        if (ownIds.length === 0) {
          if (typeof ack === "function") ack({ ok: true, deleted: 0 });
          return;
        }

        await Message.deleteMany({ _id: { $in: ownIds } });

        // Delete Cloudinary assets (fire-and-forget)
        deleteCloudinaryAssetsForMessages(messages).catch(() => {});

        // Notify all participants in the conversation
        const parts = conversationId.split("___");
        const otherId2 =
          parts.length === 2 ? parts.find((id: string) => id !== userId) : null;
        const deletePayload = { messageIds: ownIds, conversationId };

        if (otherId2) {
          io.to("conv:" + conversationId)
            .to("user:" + otherId2)
            .emit("message:deleted", deletePayload);
        } else {
          io.to("conv:" + conversationId).emit(
            "message:deleted",
            deletePayload,
          );
        }

        if (typeof ack === "function")
          ack({ ok: true, deleted: ownIds.length });
      } catch (err) {
        console.error(
          "[socket] message:deleteForEveryone error:",
          (err as Error).message,
        );
        if (typeof ack === "function") ack({ ok: false });
      }
    },
  );

  // ── message:react ──
  socket.on(
    "message:react",
    async (
      data: { messageId: string; conversationId: string; emoji: string },
      ack: (res: { ok: boolean }) => void,
    ) => {
      const { messageId, conversationId, emoji } = data;
      if (!messageId || !conversationId || !emoji) {
        if (typeof ack === "function") ack({ ok: false });
        return;
      }

      try {
        // Check if user already reacted with this emoji
        const existing = await Message.findOne({
          _id: messageId,
          "reactions.userId": userId,
          "reactions.emoji": emoji,
        });

        let action: "add" | "remove";

        if (existing) {
          // Remove the reaction (toggle off)
          await Message.updateOne(
            { _id: messageId },
            { $pull: { reactions: { userId, emoji } } },
          );
          action = "remove";
        } else {
          // Add the reaction
          await Message.updateOne(
            { _id: messageId },
            {
              $push: {
                reactions: { userId, emoji, displayName },
              },
            },
          );
          action = "add";
        }

        // Broadcast to all participants in the conversation
        const reactionPayload = {
          messageId,
          conversationId,
          userId,
          displayName,
          emoji,
          action,
        };

        io.to("conv:" + conversationId).emit(
          "message:reaction",
          reactionPayload,
        );
        // Also send to users not in the room but part of the conversation
        const parts = conversationId.split("___");
        if (parts.length === 2) {
          const otherId = parts.find((id: string) => id !== userId);
          if (otherId) {
            io.to("user:" + otherId).emit("message:reaction", reactionPayload);
          }
        }

        if (typeof ack === "function") ack({ ok: true });
      } catch (err) {
        console.error("[socket] message:react error:", (err as Error).message);
        if (typeof ack === "function") ack({ ok: false });
      }
    },
  );

  // ── message:viewOnce:open ──
  socket.on(
    "message:viewOnce:open",
    async (data: { messageId: string; conversationId: string }) => {
      const { messageId, conversationId } = data;
      if (!messageId || !conversationId) return;

      try {
        // Only mark as viewed if it's a viewOnce message not sent by this user
        // and not already viewed
        const msg = await Message.findOneAndUpdate(
          {
            _id: messageId,
            viewOnce: true,
            sender: { $ne: userId },
            viewedAt: null,
          },
          { $set: { viewedAt: new Date() } },
          { new: true },
        );

        if (!msg) return;

        // Notify the sender that their view-once message was opened
        const parts = conversationId.split("___");
        const senderId = msg.sender;

        io.to("user:" + senderId)
          .to("conv:" + conversationId)
          .emit("message:viewOnce:opened", {
            messageId,
            conversationId,
          });
      } catch (err) {
        console.error(
          "[socket] message:viewOnce:open error:",
          (err as Error).message,
        );
      }
    },
  );
}
