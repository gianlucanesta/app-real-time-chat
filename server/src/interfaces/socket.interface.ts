/** Typed Socket.io events for server ↔ client communication. */

export type MessageStatus = "sent" | "delivered" | "read";

export interface MessagePayload {
  _id: string;
  conversationId: string;
  sender: string;
  text: string;
  status: MessageStatus;
  expires_at: string;
  createdAt: string;
  senderDisplayName?: string;
  senderInitials?: string;
  senderGradient?: string;
}

export interface ServerToClientEvents {
  "message:new": (msg: MessagePayload) => void;
  "message:expired": (data: { id: string }) => void;
  "message:status": (data: {
    messageIds: string[];
    status: MessageStatus;
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
}

export interface ClientToServerEvents {
  "join:conversation": (conversationId: string) => void;
  "leave:conversation": (conversationId: string) => void;
  "message:send": (
    data: { conversationId: string; text: string },
    ack: (res: { ok: boolean; messageId?: string }) => void,
  ) => void;
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
