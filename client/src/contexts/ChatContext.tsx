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
import {
  useSocket,
  type MessagePayload,
  type TypedSocket,
} from "../hooks/useSocket";
import { apiFetch } from "../lib/api";

// --- Types ---
export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
  rawTimestamp: string;
  status: "sending" | "sent" | "delivered" | "read";
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
  lastMessageTimestamp?: string;
  unreadCount: number;
  isOnline?: boolean;
  participants: string[];
  isTyping?: boolean;
  typingName?: string;
}

interface ChatContextType {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  activeMessages: Message[];
  typingUsers: Record<string, { displayName: string }>;
  socket: TypedSocket | null;
  mobileInChat: boolean;
  setActiveConversation: (conv: Conversation | null) => void;
  setMobileInChat: (v: boolean) => void;
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
  const [typingUsers, setTypingUsers] = useState<
    Record<string, { displayName: string }>
  >({});
  const [mobileInChat, setMobileInChat] = useState(false);

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
          lastMessageTimestamp: c.lastMessageTime || undefined,
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
            rawTimestamp: m.createdAt,
            status: m.status as "sent" | "delivered" | "read",
            isMe: m.sender === user?.id,
          })),
        );
        // Join the conversation room so we receive real-time events
        socket?.emit("join:conversation", activeConversation.id);

        // Mark unread messages as read
        const unreadIds = messages
          .filter((m) => m.sender !== user?.id && m.status !== "read")
          .map((m) => m._id);
        if (unreadIds.length > 0 && socket) {
          socket.emit("message:read", {
            messageIds: unreadIds,
            conversationId: activeConversation.id,
          });
        }

        // Reset unread count in sidebar
        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeConversation.id ? { ...c, unreadCount: 0 } : c,
          ),
        );
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
        rawTimestamp: msg.createdAt,
        status: msg.status as "sent" | "delivered" | "read",
        isMe,
      };

      // For own messages, the optimistic update + ack callback already manages
      // the entry in the list (tempId → real id). Appending again here would
      // cause the duplicate that disappears on refresh.
      if (isMe) {
        // Just upgrade the temp entry to the confirmed id/status if ack hasn't
        // fired yet (race condition safety).
        setActiveMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          // Replace the most recent "sending" entry from us with the real one
          const idx = [...prev]
            .reverse()
            .findIndex((m) => m.isMe && m.status === "sending");
          if (idx !== -1) {
            const realIdx = prev.length - 1 - idx;
            const updated = [...prev];
            updated[realIdx] = newMsg;
            return updated;
          }
          return prev;
        });
      } else {
        // Only append to the active conversation's message list
        if (msg.conversationId === activeConvRef.current?.id) {
          setActiveMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      }

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
              lastMessageTimestamp: msg.createdAt,
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
            lastMessageTimestamp: msg.createdAt,
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
      setActiveMessages((prev) =>
        prev.map((m) =>
          data.messageIds.includes(m.id) ? { ...m, status: data.status } : m,
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

    const handleTyping = (data: {
      userId: string;
      displayName: string;
      typing: boolean;
    }) => {
      if (data.userId === user.id) return;
      if (data.typing) {
        setTypingUsers((prev) => ({
          ...prev,
          [data.userId]: { displayName: data.displayName },
        }));
      } else {
        setTypingUsers((prev) => {
          const next = { ...prev };
          delete next[data.userId];
          return next;
        });
      }
      // Update sidebar typing indicator
      setConversations((prev) =>
        prev.map((c) =>
          c.participants.includes(data.userId)
            ? { ...c, isTyping: data.typing, typingName: data.displayName }
            : c,
        ),
      );
    };

    const handleMessageExpired = (data: { id: string }) => {
      setActiveMessages((prev) => prev.filter((m) => m.id !== data.id));
    };

    // Emit read/delivered status for incoming messages (not own)
    const handleDeliverOnReceive = (msg: MessagePayload) => {
      if (msg.sender === user.id) return;

      const isConvActive = msg.conversationId === activeConvRef.current?.id;

      if (isConvActive) {
        // User is looking at this conversation — mark as read immediately
        socket.emit("message:read", {
          messageIds: [msg._id],
          conversationId: msg.conversationId,
        });
        // Reflect read status locally so the sender's tick updates without reload
        setActiveMessages((prev) =>
          prev.map((m) => (m.id === msg._id ? { ...m, status: "read" } : m)),
        );
      } else if (msg.status === "sent") {
        // Conversation not open — mark as delivered
        socket.emit("message:delivered", {
          messageIds: [msg._id],
          conversationId: msg.conversationId,
        });
      }
    };

    socket.on("message:new", handleNewMessage);
    socket.on("message:new", handleDeliverOnReceive);
    socket.on("message:status", handleMessageStatus);
    socket.on("message:expired", handleMessageExpired);
    socket.on("presence:online", handlePresenceOnline);
    socket.on("presence:offline", handlePresenceOffline);
    socket.on("presence:list", handlePresenceList);
    socket.on("typing", handleTyping);

    return () => {
      socket.off("message:new", handleNewMessage);
      socket.off("message:new", handleDeliverOnReceive);
      socket.off("message:status", handleMessageStatus);
      socket.off("message:expired", handleMessageExpired);
      socket.off("presence:online", handlePresenceOnline);
      socket.off("presence:offline", handlePresenceOffline);
      socket.off("presence:list", handlePresenceList);
      socket.off("typing", handleTyping);
    };
  }, [socket, user]);

  // ── Send message ─────────────────────────────────────────────────────────
  const sendMessage = useCallback(
    (text: string) => {
      if (!activeConversation || !user || !socket) return;

      const tempId = `temp-${Date.now()}`;
      const now = new Date();
      const newMsg: Message = {
        id: tempId,
        senderId: user.id ?? "me",
        senderName: user.displayName ?? "Me",
        text,
        timestamp: now.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        rawTimestamp: now.toISOString(),
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
        typingUsers,
        socket,
        mobileInChat,
        setActiveConversation,
        setMobileInChat,
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
