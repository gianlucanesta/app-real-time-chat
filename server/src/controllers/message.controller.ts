import type { Request, Response, NextFunction } from "express";
import type {
  CreateMessageBody,
  DeleteMessagesBody,
} from "../interfaces/api.interface.js";
import { Message, MESSAGE_TTL_SECONDS } from "../models/message.model.js";
import { redis } from "../config/redis.js";
import { deleteCloudinaryAssetsForMessages } from "../services/cloudinary.service.js";

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
    if (parts.length !== 2 || !parts.includes(String(req.user!.sub))) {
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

    res.status(200).json({ cleared: true });
  } catch (err) {
    next(err);
  }
}
