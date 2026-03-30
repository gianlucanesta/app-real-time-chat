import type { Request, Response, NextFunction } from "express";
import * as GroupModel from "../models/group.model.js";
import { Message } from "../models/message.model.js";

const MAX_NAME_LENGTH = 100;
const MAX_MEMBERS = 256;

/** POST /api/groups — create a new group chat */
export async function create(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { name, memberIds } = req.body as {
      name?: string;
      memberIds?: string[];
    };

    if (!name || typeof name !== "string" || !name.trim()) {
      res.status(422).json({ error: "Group name is required" });
      return;
    }
    if (name.trim().length > MAX_NAME_LENGTH) {
      res
        .status(422)
        .json({ error: `Name must be ${MAX_NAME_LENGTH} characters or fewer` });
      return;
    }
    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      res.status(422).json({ error: "At least one member is required" });
      return;
    }
    if (memberIds.length > MAX_MEMBERS) {
      res
        .status(422)
        .json({ error: `Group cannot have more than ${MAX_MEMBERS} members` });
      return;
    }

    const group = await GroupModel.create(
      name.trim(),
      req.user!.sub,
      memberIds,
    );

    // Emit socket event so all members see the new group immediately
    const io = req.app.get("io");
    if (io) {
      const conversationId = `grp_${group.id}`;
      for (const uid of group.member_ids) {
        io.to("user:" + uid).emit("group:created" as any, {
          conversationId,
          group,
        });
      }
    }

    res.status(201).json({ group });
  } catch (err) {
    next(err);
  }
}

/** GET /api/groups — list all group chats the current user belongs to */
export async function list(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.sub;
    const groups = await GroupModel.listForUser(userId);

    const conversations = await Promise.all(
      groups.map(async (g) => {
        const conversationId = `grp_${g.id}`;

        const [lastMsg, unreadCount] = await Promise.all([
          Message.findOne(
            { conversationId, expires_at: { $gt: new Date() } },
            { text: 1, createdAt: 1, sender: 1, status: 1, mediaType: 1, mediaDuration: 1 },
          )
            .sort({ createdAt: -1 })
            .lean(),
          Message.countDocuments({
            conversationId,
            sender: { $ne: userId },
            status: { $ne: "read" },
            expires_at: { $gt: new Date() },
          }),
        ]);

        const msgDoc = lastMsg as {
          _id: { toString(): string };
          text: string;
          createdAt: Date;
          sender: string;
          status: string;
          mediaType?: "image" | "video" | "audio" | null;
          mediaDuration?: number | null;
        } | null;

        const lastMessageIsMine = msgDoc ? msgDoc.sender === userId : false;

        return {
          id: conversationId,
          type: "group" as const,
          name: g.name,
          gradient: g.gradient,
          initials: g.initials,
          avatar: g.icon_url ?? undefined,
          lastMessage: msgDoc
            ? lastMessageIsMine
              ? `You: ${msgDoc.text}`
              : msgDoc.text
            : "",
          lastMessageTime: msgDoc ? msgDoc.createdAt.toISOString() : "",
          lastMessageId: msgDoc ? msgDoc._id.toString() : undefined,
          lastMessageIsMine,
          lastMessageStatus: msgDoc ? msgDoc.status : undefined,
          lastMediaType: msgDoc?.mediaType || null,
          lastMediaDuration: msgDoc?.mediaDuration || null,
          unreadCount,
          isOnline: false,
          participants: g.member_ids,
        };
      }),
    );

    res.json({ conversations });
  } catch (err) {
    next(err);
  }
}
