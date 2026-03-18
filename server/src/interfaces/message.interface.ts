/** Message document shape from MongoDB. */
export interface IMessage {
  _id: string;
  conversationId: string;
  sender: string;
  text: string;
  status: "sent" | "delivered" | "read";
  expires_at: Date;
  createdAt: Date;
}
