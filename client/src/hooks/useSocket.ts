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
    const socket: TypedSocket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket"],
      reconnection: false, // Manual reconnect in connect_error to avoid race with token refresh
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
