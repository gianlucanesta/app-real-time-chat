import type { Request, Response, NextFunction } from "express";
import { Status, STATUS_TTL_SECONDS } from "../models/status.model.js";
import { deleteCloudinaryAsset } from "../services/cloudinary.service.js";
import * as UserModel from "../models/user.model.js";
import { pool } from "../config/db.js";

const MAX_ITEMS_PER_STATUS = 30;

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

/** GET /api/status/me — get my own status */
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

    res.status(200).json({ status: status || null });
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

    // Batch-fetch contacts for all status owners in one SQL query.
    // This gives us: for each owner, the set of user IDs they have saved as contacts.
    const { rows: contactRows } = await pool.query<{
      owner_id: string;
      linked_user_id: string;
    }>(
      `SELECT owner_id, linked_user_id
       FROM contacts
       WHERE owner_id = ANY($1) AND linked_user_id IS NOT NULL`,
      [ownerIds],
    );

    // Map: ownerId → Set of linked_user_ids (i.e. their contacts)
    const ownerContacts = new Map<string, Set<string>>();
    for (const row of contactRows) {
      if (!ownerContacts.has(row.owner_id)) {
        ownerContacts.set(row.owner_id, new Set());
      }
      ownerContacts.get(row.owner_id)!.add(row.linked_user_id);
    }

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

    // Fetch user profiles for each visible status owner
    const enriched = await Promise.all(
      visibleStatuses.map(async (s) => {
        const user = await UserModel.findById(s.userId).catch(() => null);
        return {
          contactId: s.userId,
          contactName: user?.display_name || "Unknown",
          contactAvatar: user?.avatar_url || null,
          contactGradient:
            user?.avatar_gradient ||
            "linear-gradient(135deg, #6366f1, #a855f7)",
          contactInitials: user?.initials || "?",
          items: s.items.map((item: any) => ({
            id: String(item._id),
            mediaType: item.mediaType,
            mediaUrl: item.mediaUrl,
            text: item.text,
            textBgGradient: item.textBgGradient,
            caption: item.caption,
            timestamp:
              item.createdAt?.toISOString?.() || new Date().toISOString(),
            viewed: (item.viewedBy || []).includes(userId),
          })),
          lastUpdated: s.updatedAt?.toISOString?.() || new Date().toISOString(),
          allViewed: s.items.every((item: any) =>
            (item.viewedBy || []).includes(userId),
          ),
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

    // Add viewer to the item's viewedBy set
    const updated = await Status.findOneAndUpdate(
      { "items._id": itemId },
      { $addToSet: { "items.$.viewedBy": userId } },
      { new: true },
    );

    if (updated) {
      // Compute total unique viewers across all items so the owner sees
      // a single aggregated counter.
      const allViewers = new Set<string>();
      for (const item of updated.items) {
        for (const v of (item as any).viewedBy ?? []) allViewers.add(v);
      }
      // Emit real-time update to the status owner
      const io = req.app.get("io");
      if (io) {
        io.to(`user:${updated.userId}`).emit("status:viewed", {
          itemId,
          viewerCount: allViewers.size,
        });
      }
    }

    res.status(200).json({ ok: true });
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
    } else {
      await status.save();
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
