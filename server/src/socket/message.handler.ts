import type { Socket } from "socket.io";
import type { TypedServer } from "./index.js";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
} from "../interfaces/socket.interface.js";
import { Message, MESSAGE_TTL_SECONDS } from "../models/message.model.js";
import { redis } from "../config/redis.js";
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
      data: { conversationId: string; text: string },
      ack: (res: { ok: boolean; messageId?: string }) => void,
    ) => {
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
        const expires_at = (Message as any).buildExpiresAt();
        const msg = await Message.create({
          conversationId,
          sender: userId,
          text: text.trim(),
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
}
