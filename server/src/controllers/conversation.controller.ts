import type { Request, Response, NextFunction } from "express";
import { Message } from "../models/message.model.js";
import * as UserModel from "../models/user.model.js";
import * as GroupModel from "../models/group.model.js";

/**
 * GET /api/conversations
 *
 * Returns all conversations the authenticated user participates in,
 * derived from messages stored in MongoDB.
 * Each conversation includes partner profile data and latest message snippet.
 */
export async function list(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.sub;

    // Escape userId for use in a regex (UUIDs are safe but be defensive)
    const safeId = userId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // One query: all distinct conversationIds that contain this userId
    const convIds: string[] = await Message.distinct("conversationId", {
      conversationId: { $regex: safeId },
      expires_at: { $gt: new Date() },
    });

    const conversations = convIds.length === 0 ? [] : await Promise.all(
      convIds.map(async (convId: string) => {
        const parts = convId.split("___");
        const partnerId = parts.find((id) => id !== userId) ?? parts[0];

        const [lastMsg, unreadCount, partner] = await Promise.all([
          Message.findOne(
            { conversationId: convId, expires_at: { $gt: new Date() } },
            {
              text: 1,
              createdAt: 1,
              sender: 1,
              status: 1,
              mediaType: 1,
              mediaDuration: 1,
            },
          )
            .sort({ createdAt: -1 })
            .lean(),
          Message.countDocuments({
            conversationId: convId,
            sender: { $ne: userId },
            status: { $ne: "read" },
            expires_at: { $gt: new Date() },
          }),
          UserModel.findById(partnerId),
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
          id: convId,
          type: "direct" as const,
          name: partner?.display_name ?? "Unknown",
          gradient:
            partner?.avatar_gradient ??
            "linear-gradient(135deg,#2563EB,#7C3AED)",
          initials: partner?.initials ?? "??",
          avatar: partner?.avatar_url ?? null,
          lastMessage: msgDoc
            ? lastMessageIsMine
              ? `You: ${msgDoc.text}`
              : msgDoc.text
            : "",
          // ISO string — client formats to "HH:mm"
          lastMessageTime: msgDoc ? msgDoc.createdAt.toISOString() : "",
          lastMessageId: msgDoc ? msgDoc._id.toString() : undefined,
          lastMessageIsMine,
          lastMessageStatus: msgDoc ? msgDoc.status : undefined,
          lastMediaType: msgDoc?.mediaType || null,
          lastMediaDuration: msgDoc?.mediaDuration || null,
          unreadCount,
          isOnline: false,
          participants: parts,
          phone: partner?.phone ?? "",
          firstName: partner?.first_name ?? "",
          lastName: partner?.last_name ?? "",
        };
      }),
    );

    // Most-recent-first
    conversations.sort((a, b) =>
      b.lastMessageTime > a.lastMessageTime ? 1 : -1,
    );

    // ── Group conversations ──────────────────────────────────────────────────
    const groups = await GroupModel.listForUser(userId);
    const groupConversations = await Promise.all(
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
          lastMessageTime: msgDoc ? msgDoc.createdAt.toISOString() : g.created_at,
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

    // Merge and re-sort
    const allConversations = [...conversations, ...groupConversations].sort(
      (a, b) => (b.lastMessageTime > a.lastMessageTime ? 1 : -1),
    );

    res.json({ conversations: allConversations });
  } catch (err) {
    next(err);
  }
}
