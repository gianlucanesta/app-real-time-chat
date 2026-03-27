import type { Request, Response, NextFunction } from "express";
import { Status, STATUS_TTL_SECONDS } from "../models/status.model.js";
import { StatusView } from "../models/status-view.model.js";
import { Message } from "../models/message.model.js";
import { deleteCloudinaryAsset } from "../services/cloudinary.service.js";
import * as UserModel from "../models/user.model.js";
import { pool } from "../config/db.js";

const MAX_ITEMS_PER_STATUS = 30;

/**
 * Build a map of effective contacts for each owner, combining:
 * 1. PostgreSQL contacts (linked_user_id IS NOT NULL)
 * 2. MongoDB conversation partners (from Message collection)
 *
 * The viewerId's conversations are queried once; if viewerId has chatted
 * with an owner, viewerId is added to that owner's effective contacts set.
 */
async function getEffectiveContactsMap(
  ownerIds: string[],
  viewerId: string,
): Promise<Map<string, Set<string>>> {
  // 1. PostgreSQL contacts
  const { rows: contactRows } = await pool.query<{
    owner_id: string;
    linked_user_id: string;
  }>(
    `SELECT owner_id, linked_user_id
     FROM contacts
     WHERE owner_id = ANY($1) AND linked_user_id IS NOT NULL`,
    [ownerIds],
  );

  const ownerContacts = new Map<string, Set<string>>();
  for (const row of contactRows) {
    if (!ownerContacts.has(row.owner_id))
      ownerContacts.set(row.owner_id, new Set());
    ownerContacts.get(row.owner_id)!.add(row.linked_user_id);
  }

  // 2. Conversation partners — one query for the viewer
  const safeId = viewerId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const convIds: string[] = await Message.distinct("conversationId", {
    conversationId: { $regex: safeId },
    expires_at: { $gt: new Date() },
  });

  const convPartners = new Set<string>();
  for (const cid of convIds) {
    for (const p of cid.split("___")) {
      if (p !== viewerId) convPartners.add(p);
    }
  }

  // For each owner that the viewer has chatted with, add viewer to their set
  for (const ownerId of ownerIds) {
    if (convPartners.has(ownerId)) {
      if (!ownerContacts.has(ownerId))
        ownerContacts.set(ownerId, new Set());
      ownerContacts.get(ownerId)!.add(viewerId);
    }
  }

  return ownerContacts;
}

/** POST /api/status — add an item to the current user's status */
export async function addItem(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.sub;
    const { mediaType, mediaUrl, text, textBgGradient, caption } = req.body as {
      mediaType?: string;
      mediaUrl?: string;
      text?: string;
      textBgGradient?: string;
      caption?: string;
    };

    if (!mediaType || !["text", "image", "video"].includes(mediaType)) {
      res
        .status(422)
        .json({ error: "mediaType must be text, image, or video" });
      return;
    }
    if (mediaType === "text" && (!text || !text.trim())) {
      res.status(422).json({ error: "text is required for text status" });
      return;
    }
    if ((mediaType === "image" || mediaType === "video") && !mediaUrl) {
      res.status(422).json({ error: "mediaUrl is required for media status" });
      return;
    }

    const newItem = {
      mediaType,
      mediaUrl: mediaUrl || null,
      text: text?.trim() || null,
      textBgGradient: textBgGradient || null,
      caption: caption?.trim() || null,
    };

    const expires_at = (Status as any).buildExpiresAt();

    // Upsert: find existing status doc for this user or create one
    let status = await Status.findOne({ userId });

    if (status) {
      if (status.items.length >= MAX_ITEMS_PER_STATUS) {
        res.status(422).json({ error: "Maximum status items reached" });
        return;
      }
      status.items.push(newItem as any);
      // Extend expiry on every new item
      status.expires_at = expires_at;
      status.updatedAt = new Date();
      await status.save();
    } else {
      status = await Status.create({
        userId,
        items: [newItem],
        expires_at,
      });
    }

    res.status(201).json({ status: status.toObject() });
  } catch (err) {
    next(err);
  }
}

/** GET /api/status/me — get my own status with viewer count */
export async function getMyStatus(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.sub;
    const status = await Status.findOne({
      userId,
      expires_at: { $gt: new Date() },
    }).lean();

    if (!status) {
      res.status(200).json({ status: null, viewerCount: 0 });
      return;
    }

    // Count unique users who have viewed at least one item of this status
    const uniqueViewers = await StatusView.distinct("viewerId", {
      statusId: status._id,
    });

    res.status(200).json({ status, viewerCount: uniqueViewers.length });
  } catch (err) {
    next(err);
  }
}

/** GET /api/status/feed — get statuses of contacts (users with conversations) */
export async function getFeed(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.sub;

    // Get all active statuses except the current user's
    const statuses = await Status.find({
      userId: { $ne: userId },
      expires_at: { $gt: new Date() },
      "items.0": { $exists: true }, // at least one item
    }).lean();

    if (statuses.length === 0) {
      res.status(200).json({ statuses: [] });
      return;
    }

    const ownerIds = statuses.map((s) => s.userId);

    // Batch-fetch effective contacts (PostgreSQL + conversation partners)
    const ownerContacts = await getEffectiveContactsMap(ownerIds, userId);

    // Apply privacy rules: can the requesting user (userId) see each status?
    const visibleStatuses = statuses.filter((s) => {
      const privacy = (s.privacy as string) || "contacts";
      const contacts = ownerContacts.get(s.userId) ?? new Set<string>();

      if (privacy === "contacts") {
        // Requester must be in the owner's contact list
        return contacts.has(userId);
      }
      if (privacy === "contacts_except") {
        // Must be a contact but NOT in the exception list
        const exceptIds: string[] = (s.exceptIds as string[]) ?? [];
        return contacts.has(userId) && !exceptIds.includes(userId);
      }
      if (privacy === "only_share_with") {
        // Must be explicitly listed
        const onlyShareIds: string[] = (s.onlyShareIds as string[]) ?? [];
        return onlyShareIds.includes(userId);
      }
      // Fallback: contacts only
      return contacts.has(userId);
    });

    // Batch-fetch which items the requesting user has already viewed
    const visibleStatusIds = visibleStatuses.map((s) => s._id);
    const viewRecords = await StatusView.find({
      viewerId: userId,
      statusId: { $in: visibleStatusIds },
    })
      .select("itemId")
      .lean();
    const viewedItemIds = new Set(viewRecords.map((v) => v.itemId));

    // Fetch user profiles for each visible status owner
    const enriched = await Promise.all(
      visibleStatuses.map(async (s) => {
        const user = await UserModel.findById(s.userId).catch(() => null);
        const items = s.items.map((item: any) => ({
          id: String(item._id),
          mediaType: item.mediaType,
          mediaUrl: item.mediaUrl,
          text: item.text,
          textBgGradient: item.textBgGradient,
          caption: item.caption,
          timestamp:
            item.createdAt?.toISOString?.() || new Date().toISOString(),
          viewed: viewedItemIds.has(String(item._id)),
        }));
        return {
          contactId: s.userId,
          contactName: user?.display_name || "Unknown",
          contactAvatar: user?.avatar_url || null,
          contactGradient:
            user?.avatar_gradient ||
            "linear-gradient(135deg, #6366f1, #a855f7)",
          contactInitials: user?.initials || "?",
          items,
          lastUpdated: s.updatedAt?.toISOString?.() || new Date().toISOString(),
          allViewed: items.every((i) => i.viewed),
        };
      }),
    );

    res.status(200).json({ statuses: enriched });
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/status/:itemId/view — mark a status item as viewed */
export async function markViewed(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.sub;
    const { itemId } = req.params;

    // Find the status document that contains this item
    const status = await Status.findOne({ "items._id": itemId }).lean();
    if (!status) {
      res.status(404).json({ error: "Status item not found" });
      return;
    }

    // Owner cannot count as a viewer of their own status
    if (status.userId === userId) {
      res.status(200).json({ ok: true });
      return;
    }

    // Enforce privacy: viewer must be allowed to see this status
    const contactsMap = await getEffectiveContactsMap([status.userId], userId);
    const isContact = (contactsMap.get(status.userId) ?? new Set<string>()).has(userId);
    const privacy = (status.privacy as string) || "contacts";

    let allowed = false;
    if (privacy === "contacts") {
      allowed = isContact;
    } else if (privacy === "contacts_except") {
      const exceptIds: string[] = (status.exceptIds as string[]) ?? [];
      allowed = isContact && !exceptIds.includes(userId);
    } else if (privacy === "only_share_with") {
      const onlyShareIds: string[] = (status.onlyShareIds as string[]) ?? [];
      allowed = onlyShareIds.includes(userId);
    }

    if (!allowed) {
      res.status(403).json({ error: "Not allowed to view this status" });
      return;
    }

    // Upsert a StatusView record — unique index on (itemId, viewerId) ensures
    // exactly 1 view is recorded per user per item, at the database level.
    await StatusView.updateOne(
      { itemId, viewerId: userId },
      {
        $setOnInsert: {
          statusId: status._id,
          ownerId: status.userId,
          viewedAt: new Date(),
        },
      },
      { upsert: true },
    );

    // Count unique viewers across the whole status and notify the owner
    const uniqueViewers = await StatusView.distinct("viewerId", {
      statusId: status._id,
    });
    const io = req.app.get("io");
    if (io) {
      io.to(`user:${status.userId}`).emit("status:viewed", {
        itemId,
        viewerCount: uniqueViewers.length,
      });
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    next(err);
  }
}

/** GET /api/status/viewers — list users who have viewed my status */
export async function getViewers(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.sub;
    const status = await Status.findOne({
      userId,
      expires_at: { $gt: new Date() },
    }).lean();

    if (!status) {
      res.status(200).json({ viewers: [] });
      return;
    }

    const views = await StatusView.find({ statusId: status._id }).lean();

    // Deduplicate: keep the earliest viewedAt per viewer
    const viewerMap = new Map<string, Date>();
    for (const v of views) {
      if (!viewerMap.has(v.viewerId) || v.viewedAt < viewerMap.get(v.viewerId)!) {
        viewerMap.set(v.viewerId, v.viewedAt);
      }
    }

    const viewers = await Promise.all(
      Array.from(viewerMap.entries()).map(async ([viewerId, viewedAt]) => {
        const profile = await UserModel.findById(viewerId).catch(() => null);
        return {
          userId: viewerId,
          displayName: profile?.display_name || "Unknown",
          avatar: profile?.avatar_url || null,
          gradient:
            profile?.avatar_gradient ||
            "linear-gradient(135deg, #6366f1, #a855f7)",
          initials: profile?.initials || "?",
          viewedAt: viewedAt.toISOString(),
        };
      }),
    );

    // Sort: most recent first
    viewers.sort(
      (a, b) => new Date(b.viewedAt).getTime() - new Date(a.viewedAt).getTime(),
    );

    res.status(200).json({ viewers });
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/status/:itemId — delete a specific status item */
export async function deleteItem(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.sub;
    const itemId = req.params.itemId as string;

    const status = await Status.findOne({ userId });
    if (!status) {
      res.status(404).json({ error: "Status not found" });
      return;
    }

    const item = status.items.id(itemId);
    if (!item) {
      res.status(404).json({ error: "Status item not found" });
      return;
    }

    // Delete Cloudinary asset if present
    if (item.mediaUrl && item.mediaType && item.mediaType !== "text") {
      deleteCloudinaryAsset(item.mediaUrl, item.mediaType).catch(() => {});
    }

    status.items.pull({ _id: itemId });

    if (status.items.length === 0) {
      await Status.deleteOne({ _id: status._id });
      // Clean up all view records for this status
      await StatusView.deleteMany({ statusId: status._id });
    } else {
      await status.save();
      // Clean up view records for the deleted item only
      await StatusView.deleteMany({ itemId });
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/status/privacy — update privacy settings */
export async function updatePrivacy(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.sub;
    const { privacy, exceptIds, onlyShareIds } = req.body as {
      privacy?: string;
      exceptIds?: string[];
      onlyShareIds?: string[];
    };

    if (
      privacy &&
      !["contacts", "contacts_except", "only_share_with"].includes(privacy)
    ) {
      res.status(422).json({ error: "Invalid privacy setting" });
      return;
    }

    const update: Record<string, unknown> = {};
    if (privacy) update.privacy = privacy;
    if (exceptIds) update.exceptIds = exceptIds;
    if (onlyShareIds) update.onlyShareIds = onlyShareIds;

    await Status.updateOne({ userId }, { $set: update }, { upsert: false });
    res.status(200).json({ ok: true });
  } catch (err) {
    next(err);
  }
}
