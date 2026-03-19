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
  lastMessageId?: string;
  lastMessageIsMine?: boolean;
  lastMessageStatus?: "sending" | "sent" | "delivered" | "read";
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
  deleteMessages: (ids: string[]) => void;
  clearMessages: () => void;
  deleteConversation: () => void;
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

  // Track sent messageId → convId so status updates can find the right conversation
  // even when lastMessageId isn't populated from the server yet
  const sentMsgsRef = useRef<Map<string, string>>(new Map());

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
  }, [activeConversation?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── (Re-)join conversation room whenever socket or active conversation changes
  useEffect(() => {
    if (!socket || !activeConversation) return;
    socket.emit("join:conversation", activeConversation.id);
  }, [socket, activeConversation?.id]);

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
        // Register real id in the sent-messages map for status tracking
        sentMsgsRef.current.set(msg._id, msg.conversationId);
        // Just upgrade the temp entry to the confirmed id/status if ack hasn't
        // fired yet (race condition safety).
        setActiveMessages((prev) => {
          const hasRealId = prev.some((m) => m.id === newMsg.id);
          if (hasRealId) return prev;
          // Replace the most recent "sending" entry from us with the real one
          const sendingIdx = [...prev]
            .reverse()
            .findIndex((m) => m.isMe && m.status === "sending");
          if (sendingIdx !== -1) {
            const realIdx = prev.length - 1 - sendingIdx;
            const updated = [...prev];
            updated[realIdx] = newMsg;
            return updated;
          }
          // Fallback: no sending slot found, append
          return [...prev, newMsg];
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
              lastMessageId: msg._id,
              lastMessageIsMine: isMe,
              lastMessageStatus: isMe
                ? (msg.status as "sent" | "delivered" | "read")
                : undefined,
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
      // Build the set of conversation IDs whose sent messages are affected
      const affectedConvIds = new Set<string>();
      for (const msgId of data.messageIds) {
        const convId = sentMsgsRef.current.get(msgId);
        if (convId) affectedConvIds.add(convId);
      }
      // Update sidebar last-message status:
      // primary check  → lastMessageId match (populated from server or ack)
      // fallback check → sentMsgsRef match (populated when message is sent)
      setConversations((prev) =>
        prev.map((c) => {
          if (c.lastMessageId && data.messageIds.includes(c.lastMessageId)) {
            return { ...c, lastMessageStatus: data.status };
          }
          if (affectedConvIds.has(c.id) && c.lastMessageIsMine) {
            return { ...c, lastMessageStatus: data.status };
          }
          return c;
        }),
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
                lastMessageId: tempId,
                lastMessageIsMine: true,
                lastMessageStatus: "sending",
              }
            : c,
        ),
      );

      socket.emit(
        "message:send",
        { conversationId: activeConversation.id, text },
        (res) => {
          if (res.ok && res.messageId) {
            // Register the real message id → convId for future status tracking
            sentMsgsRef.current.set(res.messageId!, activeConversation.id);
            setActiveMessages((prev) => {
              const alreadyReal = prev.some((m) => m.id === res.messageId);
              if (alreadyReal && !prev.find((m) => m.id === tempId)) {
                // message:new already replaced the temp — nothing to do
                return prev;
              }
              return prev.map((m) =>
                m.id === tempId
                  ? { ...m, id: res.messageId!, status: "sent" }
                  : m,
              );
            });
            // Upgrade sidebar: tempId → real id, status sending → sent
            const convId = activeConversation.id;
            setConversations((prev) =>
              prev.map((c) =>
                c.id === convId &&
                (c.lastMessageId === tempId ||
                  c.lastMessageId === res.messageId!)
                  ? {
                      ...c,
                      lastMessageId: res.messageId!,
                      lastMessageStatus: "sent",
                    }
                  : c,
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

  const deleteMessages = useCallback((ids: string[]) => {
    // Optimistic local removal
    setActiveMessages((prev) => prev.filter((m) => !ids.includes(m.id)));
    // Persist deletion on server
    apiFetch("/messages", {
      method: "DELETE",
      body: JSON.stringify({ messageIds: ids }),
    }).catch((err) =>
      console.warn("[chat] delete messages failed:", (err as Error).message),
    );
  }, []);

  const clearMessages = useCallback(() => {
    if (!activeConversation) return;
    const convId = activeConversation.id;
    // Optimistic local clear — keep conversation in sidebar, just empty its messages
    setActiveMessages([]);
    setConversations((prev) =>
      prev.map((c) =>
        c.id === convId
          ? {
              ...c,
              lastMessage: "",
              lastMessageTime: undefined,
              lastMessageId: undefined,
              lastMessageStatus: undefined,
              unreadCount: 0,
            }
          : c,
      ),
    );
    // Persist on server
    apiFetch(`/messages/${convId}`, { method: "DELETE" }).catch((err) =>
      console.warn("[chat] clear conversation failed:", (err as Error).message),
    );
  }, [activeConversation]);

  const deleteConversation = useCallback(() => {
    if (!activeConversation) return;
    const convId = activeConversation.id;
    // Clear messages locally
    setActiveMessages([]);
    // Remove conversation from sidebar
    setConversations((prev) => prev.filter((c) => c.id !== convId));
    // Deselect active conversation
    setActiveConversation(null);
    // Delete messages on server
    apiFetch(`/messages/${convId}`, { method: "DELETE" }).catch((err) =>
      console.warn(
        "[chat] delete conversation failed:",
        (err as Error).message,
      ),
    );
  }, [activeConversation]);

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
        deleteMessages,
        clearMessages,
        deleteConversation,
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
