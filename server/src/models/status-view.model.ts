import mongoose from "mongoose";
import { STATUS_TTL_SECONDS } from "./status.model.js";

/**
 * Tracks which users have viewed which status items.
 * Single source of truth for view counts — replaces the embedded `viewedBy` array.
 *
 * Guarantees:
 *   - Exactly 1 record per (itemId, viewerId) thanks to the unique compound index.
 *   - Auto-cleanup ~1 h after the parent status would expire (TTL index on viewedAt).
 */
const statusViewSchema = new mongoose.Schema({
  /** ObjectId of the parent Status document */
  statusId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Status",
    index: true,
  },
  /** String representation of the StatusItem sub-document _id */
  itemId: { type: String, required: true },
  /** userId (UUID) of the status owner — denormalized for fast queries */
  ownerId: { type: String, required: true, index: true },
  /** userId (UUID) of the user who viewed the item */
  viewerId: { type: String, required: true },
  /** Timestamp of the first (and only) view */
  viewedAt: { type: Date, default: Date.now },
});

/** Unique per (item, viewer) — DB-level guarantee of 1 view per user per item */
statusViewSchema.index({ itemId: 1, viewerId: 1 }, { unique: true });

/** TTL: auto-delete records ~1 h after the status TTL expires */
statusViewSchema.index(
  { viewedAt: 1 },
  { expireAfterSeconds: STATUS_TTL_SECONDS + 3600 },
);

export const StatusView = mongoose.model("StatusView", statusViewSchema);
