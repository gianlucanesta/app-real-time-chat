/** Message document shape from MongoDB. */
export interface IMessage {
  _id: string;
  conversationId: string;
  sender: string;
  text: string;
  mediaUrl?: string | null;
  mediaType?: "image" | "video" | "audio" | null;
  mediaDuration?: number | null;
  status: "sent" | "delivered" | "read";
  expires_at: Date;
  createdAt: Date;
}
