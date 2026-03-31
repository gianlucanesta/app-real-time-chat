import type { Request, Response, NextFunction } from "express";
import type {
  CreateMessageBody,
  DeleteMessagesBody,
} from "../interfaces/api.interface.js";
import { Message, MESSAGE_TTL_SECONDS } from "../models/message.model.js";
import { redis } from "../config/redis.js";
import { deleteCloudinaryAssetsForMessages } from "../services/cloudinary.service.js";
import * as UserModel from "../models/user.model.js";
import * as ContactModel from "../models/contact.model.js";

const MAX_TEXT_LENGTH = 4096;

/** GET /api/messages/:conversationId */
export async function list(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const conversationId = req.params.conversationId as string;
    if (!conversationId) {
      res.status(400).json({ error: "conversationId is required" });
      return;
    }

    const messages = await Message.find(
      {
        conversationId,
        expires_at: { $gt: new Date() },
      },
      { __v: 0 },
    )
      .sort({ createdAt: 1 })
      .limit(200)
      .lean();

    // Enrich messages missing sender profile (backward compat for old messages)
    const senderIds = [
      ...new Set(
        messages
          .filter((m: any) => !m.senderDisplayName && m.sender)
          .map((m: any) => m.sender as string),
      ),
    ];
    let profileMap: Record<string, any> = {};
    if (senderIds.length > 0) {
      const profiles = await Promise.all(
        senderIds.map((id) => UserModel.findById(id).catch(() => null)),
      );
      for (let i = 0; i < senderIds.length; i++) {
        if (profiles[i]) profileMap[senderIds[i]] = profiles[i];
      }
      for (const msg of messages as any[]) {
        if (!msg.senderDisplayName && profileMap[msg.sender]) {
          const p = profileMap[msg.sender];
          msg.senderDisplayName = p.display_name ?? null;
          msg.senderInitials = p.initials ?? null;
          msg.senderGradient =
            p.avatar_gradient ?? "linear-gradient(135deg,#2563EB,#7C3AED)";
          msg.senderAvatarUrl = p.avatar_url ?? null;
        }
      }
    }

    res.status(200).json({ messages });
  } catch (err) {
    next(err);
  }
}

/** POST /api/messages */
export async function create(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { conversationId, text } = req.body as CreateMessageBody;

    if (!conversationId || typeof conversationId !== "string") {
      res.status(422).json({ error: "conversationId is required" });
      return;
    }
    if (!text || typeof text !== "string" || text.trim().length === 0) {
      res.status(422).json({ error: "text is required" });
      return;
    }
    if (text.length > MAX_TEXT_LENGTH) {
      res
        .status(422)
        .json({ error: `text exceeds ${MAX_TEXT_LENGTH} characters` });
      return;
    }

    const expires_at = (Message as any).buildExpiresAt();

    const msg = await Message.create({
      conversationId,
      sender: req.user!.sub,
      text: text.trim(),
      expires_at,
    });

    // Mirror key in Redis with same TTL for sub-minute expiry precision
    try {
      await redis.set(`msg:${msg._id}`, "1", "EX", MESSAGE_TTL_SECONDS);
    } catch (redisErr) {
      console.warn(
        "[messages] redis set failed (non-fatal):",
        (redisErr as Error).message,
      );
    }

    res.status(201).json({ message: msg });
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/messages — delete specific messages by id */
export async function deleteMessages(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { messageIds } = req.body as DeleteMessagesBody;

    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      res.status(422).json({ error: "messageIds array is required" });
      return;
    }
    if (messageIds.length > 500) {
      res.status(422).json({ error: "Too many messageIds (max 500)" });
      return;
    }

    // Fetch messages first to get media URLs for Cloudinary cleanup
    const messages = await Message.find(
      { _id: { $in: messageIds }, sender: req.user!.sub },
      { mediaUrl: 1, mediaType: 1 },
    ).lean();

    const result = await Message.deleteMany({
      _id: { $in: messageIds },
      sender: req.user!.sub,
    });

    // Delete associated Cloudinary assets (fire-and-forget)
    deleteCloudinaryAssetsForMessages(messages).catch(() => {});

    res.status(200).json({ deleted: result.deletedCount });
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/messages/mark-all-read — mark all incoming messages as read */
export async function markAllAsRead(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = String(req.user!.sub);
    const { conversationIds } = req.body as { conversationIds?: string[] };

    const filter: Record<string, unknown> = {
      sender: { $ne: userId },
      status: { $ne: "read" },
      expires_at: { $gt: new Date() },
    };

    if (Array.isArray(conversationIds) && conversationIds.length > 0) {
      // Only mark the requested conversations — validate user is a participant
      const validIds = conversationIds.filter((id) =>
        id.split("___").includes(userId),
      );
      filter.conversationId = { $in: validIds };
    } else {
      // Mark all — user must be a participant
      filter.conversationId = { $regex: userId };
    }

    // Fetch unread message IDs grouped by conversation before updating
    const unreadMessages = await Message.find(filter, {
      _id: 1,
      conversationId: 1,
    }).lean();

    const result = await Message.updateMany(filter, {
      $set: { status: "read" },
    });

    // Broadcast read receipts via WebSocket so senders see blue double-ticks
    const io = req.app.get("io");
    if (io && unreadMessages.length > 0) {
      const byConversation = new Map<string, string[]>();
      for (const m of unreadMessages) {
        const cid = m.conversationId as string;
        const arr = byConversation.get(cid);
        if (arr) arr.push(String(m._id));
        else byConversation.set(cid, [String(m._id)]);
      }

      for (const [convId, messageIds] of byConversation) {
        const payload = { messageIds, status: "read" as const };
        const parts = convId.split("___");
        const otherId =
          parts.length === 2 ? parts.find((id: string) => id !== userId) : null;

        if (otherId) {
          io.to("conv:" + convId)
            .to("user:" + otherId)
            .emit("message:status", payload);
        } else {
          io.to("conv:" + convId).emit("message:status", payload);
        }
      }
    }

    res.status(200).json({ updated: result.modifiedCount });
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/messages/mark-unread — revert last message in selected conversations to "delivered" */
export async function markAsUnread(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = String(req.user!.sub);
    const { conversationIds } = req.body as { conversationIds: string[] };

    if (!Array.isArray(conversationIds) || conversationIds.length === 0) {
      res.status(400).json({ error: "conversationIds required" });
      return;
    }

    const validIds = conversationIds.filter((id) =>
      id.split("___").includes(userId),
    );
    if (validIds.length === 0) {
      res.status(200).json({ updated: 0 });
      return;
    }

    // For each conversation, find the last message sent TO us that is "read"
    // and revert it to "delivered"
    const io = req.app.get("io");
    let totalUpdated = 0;

    for (const convId of validIds) {
      const lastMsg = await Message.findOne(
        {
          conversationId: convId,
          sender: { $ne: userId },
          status: "read",
          expires_at: { $gt: new Date() },
        },
        { _id: 1, sender: 1 },
      )
        .sort({ createdAt: -1 })
        .lean();

      if (!lastMsg) continue;

      await Message.updateOne(
        { _id: lastMsg._id },
        { $set: { status: "delivered" } },
      );
      totalUpdated++;

      // Notify the sender via WebSocket so the blue ticks revert
      if (io) {
        const payload = {
          messageIds: [String(lastMsg._id)],
          status: "delivered" as const,
        };
        const parts = convId.split("___");
        const otherId =
          parts.length === 2 ? parts.find((id: string) => id !== userId) : null;

        if (otherId) {
          io.to("conv:" + convId)
            .to("user:" + otherId)
            .emit("message:status", payload);
        } else {
          io.to("conv:" + convId).emit("message:status", payload);
        }
      }
    }

    res.status(200).json({ updated: totalUpdated });
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/messages/:conversationId — clear entire conversation */
export async function clearConversation(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const conversationId = req.params.conversationId as string;
    if (!conversationId) {
      res.status(400).json({ error: "conversationId is required" });
      return;
    }

    // Verify the user is a participant
    const parts = conversationId.split("___");
    const userId = String(req.user!.sub);
    if (parts.length !== 2 || !parts.includes(userId)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    // Fetch messages first to get media URLs for Cloudinary cleanup
    const messages = await Message.find(
      { conversationId },
      { mediaUrl: 1, mediaType: 1 },
    ).lean();

    await Message.deleteMany({ conversationId });

    // Delete associated Cloudinary assets (fire-and-forget)
    deleteCloudinaryAssetsForMessages(messages).catch(() => {});

    // When the caller requests a full "delete chat" (not just clear),
    // also remove the contact record so the conversation doesn't reappear
    // on the next page load via the persistent-contacts fallback.
    if (req.query.deleteContact === "true") {
      const partnerId = parts.find((id) => id !== userId);
      if (partnerId) {
        await ContactModel.deleteByLinkedUserId(userId, partnerId).catch(
          () => {},
        );
      }
    }

    res.status(200).json({ cleared: true });
  } catch (err) {
    next(err);
  }
}

/** GET /api/messages/:conversationId/starred */
export async function listStarred(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const conversationId = req.params.conversationId as string;
    const userId = String(req.user!.sub);

    if (!conversationId) {
      res.status(400).json({ error: "conversationId is required" });
      return;
    }

    const messages = await Message.find(
      {
        conversationId,
        starredBy: userId,
        expires_at: { $gt: new Date() },
      },
      { __v: 0 },
    )
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    // Enrich messages missing sender profile
    const senderIds = [
      ...new Set(
        messages
          .filter((m: any) => !m.senderDisplayName && m.sender)
          .map((m: any) => m.sender as string),
      ),
    ];
    let profileMap: Record<string, any> = {};
    if (senderIds.length > 0) {
      const profiles = await Promise.all(
        senderIds.map((id) => UserModel.findById(id).catch(() => null)),
      );
      for (let i = 0; i < senderIds.length; i++) {
        if (profiles[i]) profileMap[senderIds[i]] = profiles[i];
      }
      for (const msg of messages as any[]) {
        if (!msg.senderDisplayName && profileMap[msg.sender]) {
          const p = profileMap[msg.sender];
          msg.senderDisplayName = p.display_name ?? null;
          msg.senderInitials = p.initials ?? null;
          msg.senderGradient =
            p.avatar_gradient ?? "linear-gradient(135deg,#2563EB,#7C3AED)";
          msg.senderAvatarUrl = p.avatar_url ?? null;
        }
      }
    }

    res.status(200).json({ messages });
  } catch (err) {
    next(err);
  }
}
