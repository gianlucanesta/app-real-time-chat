/** Typed Socket.io events for server ↔ client communication. */

export type MessageStatus = "sent" | "delivered" | "read";

export interface LinkPreview {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
}

export interface MessagePayload {
  _id: string;
  conversationId: string;
  sender: string;
  text: string;
  mediaUrl?: string | null;
  mediaType?: "image" | "video" | "audio" | "document" | null;
  mediaDuration?: number | null;
  viewOnce?: boolean;
  viewedAt?: string | null;
  status: MessageStatus;
  expires_at: string;
  createdAt: string;
  senderDisplayName?: string;
  senderInitials?: string;
  senderGradient?: string;
  linkPreview?: LinkPreview | null;
}

export interface ServerToClientEvents {
  "message:new": (msg: MessagePayload) => void;
  "message:expired": (data: { id: string }) => void;
  "message:status": (data: {
    messageIds: string[];
    status: MessageStatus;
  }) => void;
  "message:deleted": (data: {
    messageIds: string[];
    conversationId: string;
  }) => void;
  "message:reaction": (data: {
    messageId: string;
    conversationId: string;
    userId: string;
    displayName: string;
    emoji: string;
    action: "add" | "remove";
  }) => void;
  "message:viewOnce:opened": (data: {
    messageId: string;
    conversationId: string;
  }) => void;
  typing: (data: {
    userId: string;
    displayName: string;
    typing: boolean;
  }) => void;
  "presence:online": (data: { userId: string }) => void;
  "presence:offline": (data: { userId: string }) => void;
  "presence:list": (userIds: string[]) => void;
  error: (data: { message: string }) => void;

  // ── WebRTC call signaling ──
  "call:incoming": (data: {
    from: string;
    fromName: string;
    withVideo: boolean;
    offer: RTCSessionDescriptionInit;
  }) => void;
  "call:answer": (data: {
    from: string;
    answer: RTCSessionDescriptionInit;
  }) => void;
  "call:ice": (data: { from: string; candidate: RTCIceCandidateInit }) => void;
  "call:ended": (data: { from: string }) => void;
  "call:rejected": (data: { from: string }) => void;
  "call:busy": (data: { from: string }) => void;
  "user:profile-updated": (data: {
    userId: string;
    displayName: string;
    initials: string;
    avatarGradient: string;
    avatarUrl: string | null;
  }) => void;
}

export interface ClientToServerEvents {
  "join:conversation": (conversationId: string) => void;
  "leave:conversation": (conversationId: string) => void;
  "message:send": (
    data: { conversationId: string; text: string; viewOnce?: boolean },
    ack: (res: { ok: boolean; messageId?: string }) => void,
  ) => void;
  "message:viewOnce:open": (data: {
    messageId: string;
    conversationId: string;
  }) => void;
  "typing:start": (conversationId: string) => void;
  "typing:stop": (conversationId: string) => void;
  "message:delivered": (data: {
    messageIds: string[];
    conversationId: string;
  }) => void;
  "message:read": (data: {
    messageIds: string[];
    conversationId: string;
  }) => void;
  "message:deleteForEveryone": (
    data: { messageIds: string[]; conversationId: string },
    ack: (res: { ok: boolean; deleted?: number }) => void,
  ) => void;
  "message:react": (
    data: { messageId: string; conversationId: string; emoji: string },
    ack: (res: { ok: boolean }) => void,
  ) => void;

  // ── WebRTC call signaling ──
  "call:offer": (data: {
    to: string;
    withVideo: boolean;
    offer: RTCSessionDescriptionInit;
  }) => void;
  "call:answer": (data: {
    to: string;
    answer: RTCSessionDescriptionInit;
  }) => void;
  "call:ice": (data: { to: string; candidate: RTCIceCandidateInit }) => void;
  "call:end": (data: { to: string }) => void;
  "call:reject": (data: { to: string }) => void;
}

export interface SocketData {
  user: {
    sub: string;
    email: string;
    displayName: string;
  };
}
