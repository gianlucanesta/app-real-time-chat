/** OG link preview metadata. */
export interface LinkPreview {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
}

/** Message document shape from MongoDB. */
export interface IMessage {
  _id: string;
  conversationId: string;
  sender: string;
  text: string;
  mediaUrl?: string | null;
  mediaType?: "image" | "video" | "audio" | "document" | null;
  mediaDuration?: number | null;
  status: "sent" | "delivered" | "read";
  linkPreview?: LinkPreview | null;
  expires_at: Date;
  createdAt: Date;
}
