import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import type { ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { useSocket, type MessagePayload } from "../hooks/useSocket";
import { apiFetch } from "../lib/api";

// --- Types ---
export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
  status: "sending" | "sent" | "read";
  isMe: boolean;
}

export interface Conversation {
  id: string;
  type: "direct" | "group";
  name: string;
  avatar?: string;
  gradient: string;
  initials: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
  isOnline?: boolean;
  participants: string[];
}

interface ChatContextType {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  activeMessages: Message[];
  setActiveConversation: (conv: Conversation | null) => void;
  sendMessage: (text: string) => void;
  loadConversations: () => Promise<void>;
  addOrUpdateConversation: (conv: Conversation) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

/** Format an ISO date string to "HH:mm" for the sidebar snippet. */
function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { socket } = useSocket();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] =
    useState<Conversation | null>(null);
  const [activeMessages, setActiveMessages] = useState<Message[]>([]);

  // Keep a stable ref to activeConversation so socket handlers don't stale-close
  const activeConvRef = useRef<Conversation | null>(null);
  activeConvRef.current = activeConversation;

  // ── Load conversation list from server ──────────────────────────────────
  const loadConversations = useCallback(async () => {
    try {
      const data = await apiFetch<{ conversations: Conversation[] }>(
        "/conversations",
      );
      setConversations(
        data.conversations.map((c) => ({
          ...c,
          lastMessageTime: c.lastMessageTime
            ? fmtTime(c.lastMessageTime)
            : undefined,
        })),
      );
    } catch (err) {
      console.warn(
        "[chat] failed to load conversations:",
        (err as Error).message,
      );
    }
  }, []);

  // ── Load conversations whenever the logged-in user changes ──────────────
  useEffect(() => {
    if (user) {
      void loadConversations();
    } else {
      setConversations([]);
      setActiveConversation(null);
      setActiveMessages([]);
    }
  }, [user, loadConversations]);

  // ── Load messages when a conversation is opened ─────────────────────────
  useEffect(() => {
    if (!activeConversation) {
      setActiveMessages([]);
      return;
    }
    apiFetch<{
      messages: Array<{
        _id: string;
        sender: string;
        text: string;
        status: string;
        createdAt: string;
      }>;
    }>(`/messages/${activeConversation.id}`)
      .then(({ messages }) => {
        setActiveMessages(
          messages.map((m) => ({
            id: m._id,
            senderId: m.sender,
            senderName:
              m.sender === user?.id
                ? (user?.displayName ?? "Me")
                : activeConversation.name,
            text: m.text,
            timestamp: fmtTime(m.createdAt),
            status: (m.status === "delivered" ? "sent" : m.status) as
              | "sent"
              | "read",
            isMe: m.sender === user?.id,
          })),
        );
        // Join the conversation room so we receive real-time events
        socket?.emit("join:conversation", activeConversation.id);
      })
      .catch((err) =>
        console.warn("[chat] load messages failed:", (err as Error).message),
      );
  }, [activeConversation?.id]);

  // ── Add or overwrite a single conversation (used after contact creation) ──
  const addOrUpdateConversation = useCallback((conv: Conversation) => {
    setConversations((prev) => {
      const exists = prev.some((c) => c.id === conv.id);
      if (exists)
        return prev.map((c) => (c.id === conv.id ? { ...c, ...conv } : c));
      return [conv, ...prev];
    });
  }, []);

  // ── Real-time socket events ──────────────────────────────────────────────
  useEffect(() => {
    if (!socket || !user) return;

    const handleNewMessage = (msg: MessagePayload) => {
      const isMe = msg.sender === user.id;
      const msgTimestamp = fmtTime(msg.createdAt);

      const newMsg: Message = {
        id: msg._id,
        senderId: msg.sender,
        senderName:
          msg.senderDisplayName ??
          (isMe ? (user.displayName ?? "Me") : "Unknown"),
        text: msg.text,
        timestamp: msgTimestamp,
        status: (msg.status === "delivered" ? "sent" : msg.status) as
          | "sent"
          | "read",
        isMe,
      };

      // Append to active message list (dedupe optimistic)
      setActiveMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });

      // Update or CREATE conversation in sidebar
      setConversations((prev) => {
        const exists = prev.some((c) => c.id === msg.conversationId);

        if (exists) {
          return prev.map((c) => {
            if (c.id !== msg.conversationId) return c;
            const isActive = activeConvRef.current?.id === c.id;
            return {
              ...c,
              lastMessage: isMe ? `You: ${newMsg.text}` : newMsg.text,
              lastMessageTime: msgTimestamp,
              unreadCount: isMe || isActive ? c.unreadCount : c.unreadCount + 1,
            };
          });
        }

        // ── New conversation arriving for recipient ──
        if (!isMe) {
          const parts = msg.conversationId.split("___");
          const newConv: Conversation = {
            id: msg.conversationId,
            type: "direct",
            name: msg.senderDisplayName ?? "Unknown",
            gradient:
              msg.senderGradient ?? "linear-gradient(135deg,#2563EB,#7C3AED)",
            initials: msg.senderInitials ?? "??",
            lastMessage: newMsg.text,
            lastMessageTime: msgTimestamp,
            unreadCount: 1,
            isOnline: false,
            participants: parts,
          };
          return [newConv, ...prev];
        }

        return prev;
      });
    };

    const handleMessageStatus = (data: {
      messageIds: string[];
      status: "sent" | "delivered" | "read";
    }) => {
      const uiStatus =
        data.status === "delivered" ? "sent" : (data.status as "sent" | "read");
      setActiveMessages((prev) =>
        prev.map((m) =>
          data.messageIds.includes(m.id) ? { ...m, status: uiStatus } : m,
        ),
      );
    };

    const handlePresenceOnline = (data: { userId: string }) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.participants.includes(data.userId) ? { ...c, isOnline: true } : c,
        ),
      );
    };

    const handlePresenceOffline = (data: { userId: string }) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.participants.includes(data.userId) ? { ...c, isOnline: false } : c,
        ),
      );
    };

    const handlePresenceList = (userIds: string[]) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.participants.some((p) => userIds.includes(p))
            ? { ...c, isOnline: true }
            : c,
        ),
      );
    };

    socket.on("message:new", handleNewMessage);
    socket.on("message:status", handleMessageStatus);
    socket.on("presence:online", handlePresenceOnline);
    socket.on("presence:offline", handlePresenceOffline);
    socket.on("presence:list", handlePresenceList);

    return () => {
      socket.off("message:new", handleNewMessage);
      socket.off("message:status", handleMessageStatus);
      socket.off("presence:online", handlePresenceOnline);
      socket.off("presence:offline", handlePresenceOffline);
      socket.off("presence:list", handlePresenceList);
    };
  }, [socket, user]);

  // ── Send message ─────────────────────────────────────────────────────────
  const sendMessage = useCallback(
    (text: string) => {
      if (!activeConversation || !user || !socket) return;

      const tempId = `temp-${Date.now()}`;
      const newMsg: Message = {
        id: tempId,
        senderId: user.id ?? "me",
        senderName: user.displayName ?? "Me",
        text,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        status: "sending",
        isMe: true,
      };

      setActiveMessages((prev) => [...prev, newMsg]);

      // Update sidebar snippet optimistically
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversation.id
            ? {
                ...c,
                lastMessage: `You: ${text}`,
                lastMessageTime: newMsg.timestamp,
              }
            : c,
        ),
      );

      socket.emit(
        "message:send",
        { conversationId: activeConversation.id, text },
        (res) => {
          if (res.ok && res.messageId) {
            setActiveMessages((prev) =>
              prev.map((m) =>
                m.id === tempId
                  ? { ...m, id: res.messageId!, status: "sent" }
                  : m,
              ),
            );
          } else {
            setActiveMessages((prev) => prev.filter((m) => m.id !== tempId));
          }
        },
      );
    },
    [activeConversation, user, socket],
  );

  return (
    <ChatContext.Provider
      value={{
        conversations,
        activeConversation,
        activeMessages,
        setActiveConversation,
        sendMessage,
        loadConversations,
        addOrUpdateConversation,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}
