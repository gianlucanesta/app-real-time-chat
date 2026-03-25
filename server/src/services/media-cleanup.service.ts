import type { Server } from "socket.io";
import { Message } from "../models/message.model.js";
import { Status } from "../models/status.model.js";
import {
  deleteCloudinaryAssetsForMessages,
  deleteCloudinaryAsset,
} from "./cloudinary.service.js";

const INTERVAL_MS = 5 * 60 * 1000; // every 5 minutes
const LOOKAHEAD_MS = 6 * 60 * 1000; // pre-clean Cloudinary before expiry

/**
 * Periodic sweep with two passes:
 *
 * 1. Pre-expiry Cloudinary sweep: delete Cloudinary assets for messages
 *    expiring within LOOKAHEAD_MS and null out mediaUrl so we don't lose
 *    the reference once the document is gone.
 *
 * 2. Expired message sweep: explicitly delete documents whose expires_at is
 *    in the past and emit `message:expired` socket events to connected
 *    clients. This is the fallback for the Redis keyspace path, which is
 *    unavailable on managed Redis (CONFIG SET not permitted).
 */
export function startMediaCleanupJob(io: Server): void {
  const run = async () => {
    try {
      const now = new Date();
      const cutoff = new Date(Date.now() + LOOKAHEAD_MS);

      // ── 1. Pre-expiry Cloudinary sweep ──────────────────────────────────
      const preExpiry = await Message.find(
        { mediaUrl: { $ne: null }, expires_at: { $lte: cutoff } },
        { mediaUrl: 1, mediaType: 1, _id: 1 },
      ).lean();

      if (preExpiry.length > 0) {
        await deleteCloudinaryAssetsForMessages(preExpiry);
        const preIds = preExpiry.map((m) => m._id);
        await Message.updateMany(
          { _id: { $in: preIds } },
          { $set: { mediaUrl: null, mediaType: null } },
        );
        console.log(
          `[media-cleanup] cleaned ${preExpiry.length} Cloudinary asset(s)`,
        );
      }

      // ── 2. Expired message sweep ─────────────────────────────────────────
      const expired = await Message.find(
        { expires_at: { $lte: now } },
        { conversationId: 1, _id: 1 },
      ).lean();

      if (expired.length > 0) {
        const ids = expired.map((m) => m._id);
        await Message.deleteMany({ _id: { $in: ids } });
        for (const msg of expired) {
          io.to("conv:" + (msg as Record<string, unknown>).conversationId).emit(
            "message:expired",
            { id: String(msg._id) },
          );
        }
        console.log(`[media-cleanup] expired ${expired.length} message(s)`);
      }
      // ── 3. Expired status sweep (Cloudinary cleanup) ──────────────────
      const expiredStatuses = await Status.find(
        { expires_at: { $lte: now } },
        { items: 1, _id: 1 },
      ).lean();

      if (expiredStatuses.length > 0) {
        for (const status of expiredStatuses) {
          for (const item of (status as any).items || []) {
            if (item.mediaUrl && item.mediaType && item.mediaType !== "text") {
              deleteCloudinaryAsset(item.mediaUrl, item.mediaType).catch(
                () => {},
              );
            }
          }
        }
        await Status.deleteMany({
          _id: { $in: expiredStatuses.map((s) => s._id) },
        });
        console.log(
          `[media-cleanup] expired ${expiredStatuses.length} status(es)`,
        );
      }
    } catch (err) {
      console.warn("[media-cleanup] sweep error:", (err as Error).message);
    }
  };

  setInterval(run, INTERVAL_MS);
  console.log("[media-cleanup] scheduled every 5 min");
}
