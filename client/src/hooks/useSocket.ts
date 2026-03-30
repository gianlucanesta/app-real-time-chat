import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "../contexts/AuthContext";
import { getAccessToken, setAccessToken } from "../lib/api";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3001/api";
// Socket.IO connects to the server root (no /api prefix)
const SOCKET_URL = API_BASE.replace(/\/api$/, "");

export type MessageStatus = "sent" | "delivered" | "read";

export interface MessagePayload {
  _id: string;
  conversationId: string;
  sender: string;
  text: string;
  mediaUrl?: string | null;
  mediaType?: "image" | "video" | "audio" | "document" | null;
  mediaDuration?: number | null;
  mediaFileName?: string | null;
  viewOnce?: boolean;
  viewedAt?: string | null;
  status: MessageStatus;
  expires_at: string;
  createdAt: string;
  senderDisplayName?: string;
  senderInitials?: string;
  senderGradient?: string;
  senderAvatarUrl?: string | null;
  linkPreview?: {
    url: string;
    title: string | null;
    description: string | null;
    image: string | null;
    siteName: string | null;
  } | null;
  statusReply?: {
    mediaType: "text" | "image" | "video";
    text?: string | null;
    textBgGradient?: string | null;
    mediaUrl?: string | null;
    caption?: string | null;
    senderName: string;
  } | null;
  quotedReply?: {
    messageId: string;
    senderName: string;
    text: string;
    mediaType?: "image" | "video" | "audio" | "document" | null;
    mediaUrl?: string | null;
  } | null;
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
  "call:screenshare": (data: { from: string; active: boolean }) => void;

  // ── Call link rooms ──
  "call:peer-joined": (data: {
    userId: string;
    displayName: string;
    roomId: string;
  }) => void;
  "call:peer-in-room": (data: {
    userId: string;
    displayName: string;
    roomId: string;
  }) => void;
  "call:peer-left": (data: { userId: string; roomId: string }) => void;

  "user:profile-updated": (data: {
    userId: string;
    displayName: string;
    initials: string;
    avatarGradient: string;
    avatarUrl: string | null;
  }) => void;
  /** Sent to the status owner when someone views one of their items */
  "status:viewed": (data: { itemId: string; viewerCount: number }) => void;
}

export interface ClientToServerEvents {
  "join:conversation": (conversationId: string) => void;
  "leave:conversation": (conversationId: string) => void;
  "message:send": (
    data: {
      conversationId: string;
      text: string;
      mediaUrl?: string;
      mediaType?: "image" | "video" | "audio" | "document";
      mediaDuration?: number;
      mediaFileName?: string;
      viewOnce?: boolean;
      linkPreview?: {
        url: string;
        title: string | null;
        description: string | null;
        image: string | null;
        siteName: string | null;
      } | null;
      statusReply?: {
        mediaType: "text" | "image" | "video";
        text?: string | null;
        textBgGradient?: string | null;
        mediaUrl?: string | null;
        caption?: string | null;
        senderName: string;
      } | null;
      quotedReply?: {
        messageId: string;
        senderName: string;
        text: string;
        mediaType?: "image" | "video" | "audio" | "document" | null;
        mediaUrl?: string | null;
      } | null;
    },
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
  "call:screenshare": (data: { to: string; active: boolean }) => void;

  // ── Call link rooms ──
  "call:join-room": (data: { roomId: string }) => void;
  "call:leave-room": (data: { roomId: string }) => void;
}

export type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export function useSocket() {
  const { isAuthenticated } = useAuth();
  const token = getAccessToken();
  const socketRef = useRef<TypedSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    // Initialize socket connection
    // Use polling first so Render's reverse proxy (Cloudflare) can reliably
    // upgrade to WebSocket. "websocket"-only silently fails through some proxies.
    const socket: TypedSocket = io(SOCKET_URL, {
      auth: { token },
      transports: ["polling", "websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
      setIsConnected(true);
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected");
      setIsConnected(false);
    });

    socket.on("connect_error", async (err) => {
      console.warn("[socket] connect_error:", err.message);
      // Attempt token refresh on auth failure
      if (
        err.message?.includes("auth") ||
        err.message?.includes("jwt") ||
        err.message?.includes("token")
      ) {
        try {
          const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
          });
          if (refreshRes.ok) {
            const data = await refreshRes.json();
            setAccessToken(data.accessToken);
            socket.auth = { token: data.accessToken };
            socket.connect();
          }
        } catch (refreshErr) {
          console.error("[socket] Token refresh failed:", refreshErr);
        }
      }
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, isAuthenticated]);

  return { socket: socketRef.current, isConnected };
}
