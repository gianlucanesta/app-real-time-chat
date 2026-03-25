import mongoose from "mongoose";

export const STATUS_TTL_SECONDS = 24 * 60 * 60; // 24 hours

const statusItemSchema = new mongoose.Schema(
  {
    mediaType: {
      type: String,
      enum: ["text", "image", "video"],
      required: true,
    },
    mediaUrl: { type: String, default: null },
    text: { type: String, default: null, maxlength: 700 },
    textBgGradient: { type: String, default: null },
    caption: { type: String, default: null, maxlength: 500 },
    /** Who has viewed this item */
    viewedBy: { type: [String], default: [] },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const statusSchema = new mongoose.Schema({
  /** User UUID from PostgreSQL */
  userId: { type: String, required: true, index: true },
  items: { type: [statusItemSchema], default: [] },
  privacy: {
    type: String,
    enum: ["contacts", "contacts_except", "only_share_with"],
    default: "contacts",
  },
  exceptIds: { type: [String], default: [] },
  onlyShareIds: { type: [String], default: [] },
  /** TTL — MongoDB deletes the document when expires_at is in the past */
  expires_at: { type: Date, required: true },
  updatedAt: { type: Date, default: Date.now },
});

/**
 * TTL index: MongoDB deletes the document automatically once
 * `expires_at` is in the past (checked every ~60 s).
 */
statusSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

/**
 * Helper: return an expires_at Date exactly STATUS_TTL_SECONDS from now.
 */
statusSchema.statics.buildExpiresAt = function (): Date {
  return new Date(Date.now() + STATUS_TTL_SECONDS * 1_000);
};

export const Status = mongoose.model("Status", statusSchema);
