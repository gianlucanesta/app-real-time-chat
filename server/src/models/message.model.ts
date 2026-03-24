import mongoose from "mongoose";

export const MESSAGE_TTL_SECONDS = 24 * 60 * 60; // 24 hours

const messageSchema = new mongoose.Schema({
  conversationId: {
    type: String,
    required: true,
    index: true,
  },
  sender: {
    type: String, // UUID from PostgreSQL users table
    required: true,
  },
  text: {
    type: String,
    default: "",
    maxlength: 4096,
  },
  // Media attachment fields
  mediaUrl: {
    type: String,
    default: null,
  },
  mediaType: {
    type: String,
    enum: ["image", "video", "audio", "document", null],
    default: null,
  },
  mediaDuration: {
    type: Number, // audio/video duration in seconds
    default: null,
  },
  mediaFileName: {
    type: String,
    default: null,
  },
  // View-once: content can only be opened once by the recipient
  viewOnce: {
    type: Boolean,
    default: false,
  },
  viewedAt: {
    type: Date,
    default: null,
  },
  // Message delivery status: sent → delivered → read
  status: {
    type: String,
    enum: ["sent", "delivered", "read"],
    default: "sent",
  },
  // Reactions: array of { userId, emoji, displayName }
  reactions: {
    type: [
      {
        userId: { type: String, required: true },
        emoji: { type: String, required: true },
        displayName: { type: String, default: "" },
      },
    ],
    default: [],
  },
  // Link preview metadata (populated by client from OG tags)
  linkPreview: {
    type: {
      url: { type: String, required: true },
      title: { type: String, default: null },
      description: { type: String, default: null },
      image: { type: String, default: null },
      siteName: { type: String, default: null },
    },
    default: null,
  },
  // expires_at is set SERVER-SIDE on every write — never trust the client
  expires_at: {
    type: Date,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

/**
 * MongoDB native TTL index: the storage engine deletes the document
 * automatically once `expires_at` is in the past (runs every ~60 s).
 * The Redis keyspace listener handles sub-minute precision removal.
 */
messageSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

/**
 * Helper: return an expires_at Date exactly MESSAGE_TTL_SECONDS from now.
 */
messageSchema.statics.buildExpiresAt = function (): Date {
  return new Date(Date.now() + MESSAGE_TTL_SECONDS * 1_000);
};

export const Message = mongoose.model("Message", messageSchema);
