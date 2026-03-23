import { Message } from "../models/message.model.js";
import { deleteCloudinaryAssetsForMessages } from "./cloudinary.service.js";

const INTERVAL_MS = 5 * 60 * 1000; // every 5 minutes
const LOOKAHEAD_MS = 6 * 60 * 1000; // check messages expiring within 6 minutes

/**
 * Periodic sweep that deletes Cloudinary assets for messages about to expire.
 * Acts as a safety net: the primary path is Redis keyspace expiry (redis.ts),
 * but if Redis is unavailable or the key wasn't set, this catches stragglers
 * before MongoDB TTL removes the document (and we lose the mediaUrl reference).
 */
export function startMediaCleanupJob(): void {
  const run = async () => {
    try {
      const cutoff = new Date(Date.now() + LOOKAHEAD_MS);
      const messages = await Message.find(
        {
          mediaUrl: { $ne: null },
          expires_at: { $lte: cutoff },
        },
        { mediaUrl: 1, mediaType: 1, _id: 1 },
      ).lean();

      if (messages.length === 0) return;

      await deleteCloudinaryAssetsForMessages(messages);

      // Remove the mediaUrl so we don't process them again on the next sweep
      const ids = messages.map((m) => m._id);
      await Message.updateMany(
        { _id: { $in: ids } },
        { $set: { mediaUrl: null, mediaType: null } },
      );

      console.log(
        `[media-cleanup] cleaned ${messages.length} Cloudinary asset(s)`,
      );
    } catch (err) {
      console.warn("[media-cleanup] sweep error:", (err as Error).message);
    }
  };

  setInterval(run, INTERVAL_MS);
  console.log("[media-cleanup] scheduled every 5 min");
}
