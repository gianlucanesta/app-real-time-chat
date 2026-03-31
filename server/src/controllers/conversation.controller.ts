import type { Request, Response, NextFunction } from "express";
import { Message } from "../models/message.model.js";
import * as UserModel from "../models/user.model.js";
import * as GroupModel from "../models/group.model.js";
import * as ContactModel from "../models/contact.model.js";
import type { IContact } from "../interfaces/contact.interface.js";

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

    // Load all contacts for this user once, build lookup by linked_user_id
    const allContacts = await ContactModel.listByOwner(userId);
    const contactByLinkedUser = new Map<string, IContact>(); // linkedUserId -> contact
    const contactByPhone = new Map<string, IContact>(); // phone -> contact
    for (const ct of allContacts) {
      if (ct.linked_user_id) contactByLinkedUser.set(ct.linked_user_id, ct);
      if (ct.phone) contactByPhone.set(ct.phone, ct);
    }

    const conversations =
      convIds.length === 0
        ? []
        : await Promise.all(
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

              const lastMessageIsMine = msgDoc
                ? msgDoc.sender === userId
                : false;

              const contact =
                contactByLinkedUser.get(partnerId) ??
                contactByPhone.get(partner?.phone ?? "");

              return {
                id: convId,
                type: "direct" as const,
                name:
                  contact?.display_name ?? partner?.display_name ?? "Unknown",
                gradient:
                  partner?.avatar_gradient ??
                  contact?.gradient ??
                  "linear-gradient(135deg,#2563EB,#7C3AED)",
                initials: contact?.initials ?? partner?.initials ?? "??",
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
                firstName: contact
                  ? (contact.display_name.split(" ")[0] ?? "")
                  : (partner?.first_name ?? ""),
                lastName: contact
                  ? contact.display_name.split(" ").slice(1).join(" ")
                  : (partner?.last_name ?? ""),
                contactId: contact?.id ?? null,
              };
            }),
          );

    // Most-recent-first
    conversations.sort((a, b) =>
      b.lastMessageTime > a.lastMessageTime ? 1 : -1,
    );

    // ── Persistent contacts ──────────────────────────────────────────────────
    // Contacts saved in PostgreSQL must always appear in the chat list,
    // even when all messages have expired (24h TTL).
    const existingPartnerIds = new Set(
      conversations.map((c) => {
        const parts = c.id.split("___");
        return parts.find((p: string) => p !== userId) ?? parts[0];
      }),
    );

    const contacts = await ContactModel.listByOwner(userId);
    const contactConversations = contacts
      .filter(
        (ct) => ct.linked_user_id && !existingPartnerIds.has(ct.linked_user_id),
      )
      .map((ct) => {
        const partnerId = ct.linked_user_id as string;
        const parts = [userId, partnerId].sort();
        const convId = parts.join("___");
        return {
          id: convId,
          type: "direct" as const,
          name: ct.linked_display_name || ct.display_name,
          gradient: ct.gradient,
          initials: ct.linked_initials || ct.initials || "??",
          avatar: null as string | null,
          lastMessage: "",
          lastMessageTime: "",
          lastMessageId: undefined as string | undefined,
          lastMessageIsMine: false,
          lastMessageStatus: undefined as string | undefined,
          lastMediaType: null as "image" | "video" | "audio" | null,
          lastMediaDuration: null as number | null,
          unreadCount: 0,
          isOnline: false,
          participants: parts,
          phone: ct.phone ?? "",
          firstName: "",
          lastName: "",
          contactId: ct.id,
        };
      });

    // Merge contact-based conversations with message-based ones
    const allDirect = [...conversations, ...contactConversations];

    // ── Group conversations ──────────────────────────────────────────────────
    const groups = await GroupModel.listForUser(userId);
    const groupConversations = await Promise.all(
      groups.map(async (g) => {
        const conversationId = `grp_${g.id}`;

        const [lastMsg, unreadCount] = await Promise.all([
          Message.findOne(
            { conversationId, expires_at: { $gt: new Date() } },
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
          lastMessageTime: msgDoc
            ? msgDoc.createdAt.toISOString()
            : g.created_at,
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
    const allConversations = [...allDirect, ...groupConversations].sort(
      (a, b) => (b.lastMessageTime > a.lastMessageTime ? 1 : -1),
    );

    console.log("[conversations.list]", {
      userId,
      directFromMessages: conversations.length,
      fromContacts: contactConversations.length,
      groups: groupConversations.length,
      total: allConversations.length,
    });

    res.json({ conversations: allConversations });
  } catch (err) {
    next(err);
  }
}
