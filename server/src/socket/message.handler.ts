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
        mediaType?: "image" | "video" | "audio" | "document";
        mediaDuration?: number;
        mediaFileName?: string;
        viewOnce?: boolean;
        linkPreview?: {
          url: string;
          title: string | null;
          description: string | null;
          image: string | null;
          siteName: string | null;
        } | null;
        statusReply?: {
          mediaType: "text" | "image" | "video";
          text?: string | null;
          textBgGradient?: string | null;
          mediaUrl?: string | null;
          caption?: string | null;
          senderName: string;
        } | null;
        quotedReply?: {
          messageId: string;
          senderName: string;
          text: string;
          mediaType?: "image" | "video" | "audio" | "document" | null;
          mediaUrl?: string | null;
        } | null;
      },
      ack: (res: { ok: boolean; messageId?: string }) => void,
    ) => {
      const {
        conversationId,
        text,
        mediaUrl,
        mediaType,
        mediaDuration,
        mediaFileName,
        viewOnce,
        linkPreview,
        statusReply,
        quotedReply,
      } = data || {};

      if (!conversationId) {
        socket.emit("error", {
          message: "conversationId is required",
        });
        if (typeof ack === "function") ack({ ok: false });
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
        if (typeof ack === "function") ack({ ok: false });
        return;
      }
      if (hasText && text.length > 4096) {
        socket.emit("error", { message: "Message exceeds 4096 characters" });
        if (typeof ack === "function") ack({ ok: false });
        return;
      }

      try {
        const expires_at = (Message as any).buildExpiresAt();
        const senderProfile = await UserModel.findById(userId).catch(
          () => null,
        );

        const msg = await Message.create({
          conversationId,
          sender: userId,
          text: hasText ? text.trim() : "",
          mediaUrl: mediaUrl || null,
          mediaType: mediaType || null,
          mediaDuration: mediaDuration || null,
          mediaFileName: mediaFileName || null,
          viewOnce: !!viewOnce,
          linkPreview: linkPreview || null,
          statusReply: statusReply || null,
          quotedReply: quotedReply || null,
          senderDisplayName: displayName,
          senderInitials: senderProfile?.initials ?? "",
          senderGradient:
            senderProfile?.avatar_gradient ??
            "linear-gradient(135deg,#2563EB,#7C3AED)",
          senderAvatarUrl: senderProfile?.avatar_url ?? null,
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

        const msgPayload = {
          ...msg.toObject(),
          _id: String(msg._id),
          senderDisplayName: displayName,
          senderInitials: senderProfile?.initials ?? "",
          senderGradient:
            senderProfile?.avatar_gradient ??
            "linear-gradient(135deg,#2563EB,#7C3AED)",
          senderAvatarUrl: senderProfile?.avatar_url ?? null,
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
        // One reaction per user per message: find any existing reaction
        const msg = await Message.findOne({ _id: messageId });
        const existingReaction = (msg as any)?.reactions?.find(
          (r: any) => r.userId === userId,
        );

        let action: "add" | "remove";

        if (existingReaction && existingReaction.emoji === emoji) {
          // Same emoji → toggle off
          await Message.updateOne(
            { _id: messageId },
            { $pull: { reactions: { userId } } },
          );
          action = "remove";
        } else {
          // Different emoji or no existing → replace/add
          if (existingReaction) {
            await Message.updateOne(
              { _id: messageId },
              { $pull: { reactions: { userId } } },
            );
          }
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

  // ── message:edit ──
  socket.on(
    "message:edit",
    async (
      data: { messageId: string; conversationId: string; text: string },
      ack: (res: { ok: boolean }) => void,
    ) => {
      const { messageId, conversationId, text } = data;
      if (!messageId || !conversationId || typeof text !== "string") {
        if (typeof ack === "function") ack({ ok: false });
        return;
      }

      const trimmed = text.trim();
      if (trimmed.length === 0 || trimmed.length > 4096) {
        if (typeof ack === "function") ack({ ok: false });
        return;
      }

      try {
        const editedAt = new Date();
        const msg = await Message.findOneAndUpdate(
          { _id: messageId, sender: userId },
          { $set: { text: trimmed, edited: true, editedAt } },
          { new: true },
        );

        if (!msg) {
          if (typeof ack === "function") ack({ ok: false });
          return;
        }

        const editPayload = {
          messageId,
          conversationId,
          text: trimmed,
          editedAt: editedAt.toISOString(),
        };

        io.to("conv:" + conversationId).emit("message:edited", editPayload);
        const parts = conversationId.split("___");
        if (parts.length === 2) {
          const otherId = parts.find((id: string) => id !== userId);
          if (otherId) {
            io.to("user:" + otherId).emit("message:edited", editPayload);
          }
        }

        if (typeof ack === "function") ack({ ok: true });
      } catch (err) {
        console.error(
          "[socket] message:edit error:",
          (err as Error).message,
        );
        if (typeof ack === "function") ack({ ok: false });
      }
    },
  );

  // ── message:star (toggle important/starred) ──
  socket.on(
    "message:star",
    async (
      data: { messageId: string; conversationId: string },
      ack: (res: { ok: boolean; starred?: boolean }) => void,
    ) => {
      const { messageId, conversationId } = data;
      if (!messageId || !conversationId) {
        if (typeof ack === "function") ack({ ok: false });
        return;
      }

      try {
        const msg = await Message.findOne({ _id: messageId });
        if (!msg) {
          if (typeof ack === "function") ack({ ok: false });
          return;
        }

        const alreadyStarred = (msg as any).starredBy?.includes(userId);
        let starred: boolean;

        if (alreadyStarred) {
          await Message.updateOne(
            { _id: messageId },
            { $pull: { starredBy: userId } },
          );
          starred = false;
        } else {
          await Message.updateOne(
            { _id: messageId },
            { $addToSet: { starredBy: userId } },
          );
          starred = true;
        }

        // Notify the user who starred (only themselves — starring is per-user)
        socket.emit("message:starred", {
          messageId,
          conversationId,
          userId,
          starred,
        });

        if (typeof ack === "function") ack({ ok: true, starred });
      } catch (err) {
        console.error(
          "[socket] message:star error:",
          (err as Error).message,
        );
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
