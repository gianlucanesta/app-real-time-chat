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
import { useWebRTC, type IncomingCallData } from "../hooks/useWebRTC";
import type { CallStatus } from "../hooks/useWebRTC";
import { apiFetch } from "../lib/api";

// --- Types ---
export interface LinkPreview {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  mediaUrl?: string | null;
  mediaType?: "image" | "video" | "audio" | "document" | null;
  mediaDuration?: number | null;
  mediaFileName?: string | null;
  viewOnce?: boolean;
  viewedAt?: string | null;
  timestamp: string;
  rawTimestamp: string;
  status: "sending" | "sent" | "delivered" | "read";
  isMe: boolean;
  linkPreview?: LinkPreview | null;
  isUploading?: boolean;
  statusReply?: {
    mediaType: "text" | "image" | "video";
    text?: string | null;
    textBgGradient?: string | null;
    mediaUrl?: string | null;
    caption?: string | null;
    senderName: string;
  } | null;
}

export interface Reaction {
  userId: string;
  displayName: string;
  emoji: string;
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
  lastMediaType?: "image" | "video" | "audio" | "document" | null;
  lastMediaDuration?: number | null;
  lastMessageViewOnce?: boolean;
  lastMessageViewedAt?: string | null;
  lastMessageDeleted?: boolean;
  lastReaction?: string;
  reactionHistory?: Array<{
    userId: string;
    displayName: string;
    emoji: string;
    text: string;
  }>;
  unreadCount: number;
  isOnline?: boolean;
  participants: string[];
  phone?: string;
  firstName?: string;
  lastName?: string;
  isTyping?: boolean;
  typingName?: string;
}

interface ChatContextType {
  conversations: Conversation[];
  conversationsLoading: boolean;
  activeConversation: Conversation | null;
  activeMessages: Message[];
  typingUsers: Record<string, { displayName: string }>;
  socket: TypedSocket | null;
  mobileInChat: boolean;
  setActiveConversation: (conv: Conversation | null) => void;
  setMobileInChat: (v: boolean) => void;
  sendMessage: (text: string, linkPreview?: LinkPreview | null) => void;
  sendMediaMessage: (media: {
    mediaUrl: string;
    mediaType: "image" | "video" | "audio" | "document";
    mediaDuration?: number;
    mediaFileName?: string;
    text?: string;
    viewOnce?: boolean;
    replaceTempId?: string;
  }) => void;
  addOptimisticMediaMessage: (media: {
    mediaType: "image" | "video" | "audio" | "document";
    mediaDuration?: number;
    mediaFileName?: string;
    localPreviewUrl?: string;
    text?: string;
    viewOnce?: boolean;
  }) => string;
  cancelOptimisticMediaMessage: (tempId: string) => void;
  loadConversations: () => Promise<void>;
  addOrUpdateConversation: (conv: Conversation) => void;
  deleteMessages: (ids: string[]) => void;
  deleteForMe: (ids: string[]) => void;
  deleteForEveryone: (ids: string[]) => void;
  markViewOnceOpened: (messageId: string) => void;
  clearMessages: () => void;
  deleteConversation: () => void;
  markAllAsRead: (conversationIds?: string[]) => Promise<void>;
  clearConversationById: (convId: string) => void;
  pendingRemoteDeletions: string[];
  confirmRemoteDeletion: (ids: string[]) => void;
  reactions: Record<string, Reaction[]>;
  reactToMessage: (messageId: string, emoji: string) => void;
  feedStatusUserIds: Set<string>;
  removeFeedStatusUserId: (userId: string) => void;
  sendStatusReplyMessage: (
    recipientId: string,
    conversationId: string,
    text: string,
    statusReply: {
      mediaType: "text" | "image" | "video";
      text?: string | null;
      textBgGradient?: string | null;
      mediaUrl?: string | null;
      caption?: string | null;
      senderName: string;
    },
  ) => void;
  // ── WebRTC ──
  webrtc: {
    status: CallStatus;
    localStream: MediaStream | null;
    remoteStream: MediaStream | null;
    isMuted: boolean;
    isCameraOff: boolean;
    isScreenSharing: boolean;
    remoteIsScreenSharing: boolean;
    incomingCall: IncomingCallData | null;
    callWithVideo: boolean;
    callContactId: string | null;
    startCall: (toUserId: string, withVideo?: boolean) => Promise<void>;
    answerCall: () => Promise<void>;
    rejectCall: () => void;
    endCall: () => void;
    toggleMute: () => void;
    toggleCamera: () => void;
    toggleScreenShare: () => Promise<void>;
    retryCall: () => void;
  };
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
  const webrtc = useWebRTC(socket);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [activeConversation, setActiveConversation] =
    useState<Conversation | null>(null);
  const [activeMessages, setActiveMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<
    Record<string, { displayName: string }>
  >({});
  const [mobileInChat, setMobileInChat] = useState(false);
  const [pendingRemoteDeletions, setPendingRemoteDeletions] = useState<
    string[]
  >([]);
  const [reactions, setReactions] = useState<Record<string, Reaction[]>>({});
  const [feedStatusUserIds, setFeedStatusUserIds] = useState<Set<string>>(
    new Set(),
  );
  const [hiddenMessageIds, setHiddenMessageIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem("hiddenMessageIds");
      return stored ? new Set(JSON.parse(stored) as string[]) : new Set();
    } catch {
      return new Set();
    }
  });

  // Keep a stable ref to activeConversation so socket handlers don't stale-close
  const activeConvRef = useRef<Conversation | null>(null);
  activeConvRef.current = activeConversation;

  const activeMessagesRef = useRef<Message[]>([]);
  activeMessagesRef.current = activeMessages;

  const reactionsRef = useRef<Record<string, Reaction[]>>({});
  reactionsRef.current = reactions;

  // Track sent messageId → convId so status updates can find the right conversation
  // even when lastMessageId isn't populated from the server yet
  const sentMsgsRef = useRef<Map<string, string>>(new Map());

  // Cache online user IDs so presence info survives the async gap between
  // socket connect (presence:list) and loadConversations (API response).
  const onlineUserIdsRef = useRef<Set<string>>(new Set());

  // ── Load conversation list from server ──────────────────────────────────
  const loadConversations = useCallback(async () => {
    try {
      setConversationsLoading(true);
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
          // Apply cached presence info (presence:list may have arrived before this API response)
          isOnline: c.participants.some((p) => onlineUserIdsRef.current.has(p)),
        })),
      );
    } catch (err) {
      console.warn(
        "[chat] failed to load conversations:",
        (err as Error).message,
      );
    } finally {
      setConversationsLoading(false);
    }
  }, []);

  // ── Load conversations whenever the logged-in user changes ──────────────
  useEffect(() => {
    if (user) {
      void loadConversations();
      // Fetch status feed to know which contacts have UNSEEN statuses (for blue border)
      apiFetch<{
        statuses: Array<{ contactId: string; allViewed: boolean }>;
      }>("/status/feed")
        .then(({ statuses }) => {
          setFeedStatusUserIds(
            new Set(
              statuses.filter((s) => !s.allViewed).map((s) => s.contactId),
            ),
          );
        })
        .catch(() => {});
    } else {
      setConversations([]);
      setActiveConversation(null);
      setActiveMessages([]);
      setFeedStatusUserIds(new Set());
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
        mediaUrl?: string | null;
        mediaType?: "image" | "video" | "audio" | "document" | null;
        mediaDuration?: number | null;
        mediaFileName?: string | null;
        viewOnce?: boolean;
        viewedAt?: string | null;
        status: string;
        createdAt: string;
        reactions?: Array<{
          userId: string;
          emoji: string;
          displayName: string;
        }>;
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
            mediaUrl: m.mediaUrl || null,
            mediaType: m.mediaType || null,
            mediaDuration: m.mediaDuration || null,
            mediaFileName: m.mediaFileName || null,
            viewOnce: m.viewOnce || false,
            viewedAt: m.viewedAt || null,
            timestamp: fmtTime(m.createdAt),
            rawTimestamp: m.createdAt,
            status: m.status as "sent" | "delivered" | "read",
            isMe: m.sender === user?.id,
            linkPreview: m.linkPreview || null,
            statusReply: (m as any).statusReply || null,
          })),
        );

        // Populate reactions state from loaded messages
        const loadedReactions: Record<string, Reaction[]> = {};
        for (const m of messages) {
          if (m.reactions && m.reactions.length > 0) {
            loadedReactions[m._id] = m.reactions;
          }
        }
        setReactions((prev) => ({ ...prev, ...loadedReactions }));

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
  // Also re-join on reconnect (socket.connect() reuses the same object ref,
  // so we listen for the "connect" event to catch reconnections).
  useEffect(() => {
    if (!socket || !activeConversation) return;
    const convId = activeConversation.id;
    socket.emit("join:conversation", convId);

    const handleReconnect = () => {
      socket.emit("join:conversation", convId);
    };
    socket.on("connect", handleReconnect);
    return () => {
      socket.off("connect", handleReconnect);
    };
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
        mediaUrl: msg.mediaUrl || null,
        mediaType: msg.mediaType || null,
        mediaDuration: msg.mediaDuration || null,
        mediaFileName: (msg as any).mediaFileName || null,
        viewOnce: msg.viewOnce || false,
        viewedAt: msg.viewedAt || null,
        timestamp: msgTimestamp,
        rawTimestamp: msg.createdAt,
        status: msg.status as "sent" | "delivered" | "read",
        isMe,
        linkPreview: (msg as any).linkPreview || null,
        statusReply: (msg as any).statusReply || null,
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
              lastMediaType: msg.mediaType || null,
              lastMediaDuration: msg.mediaDuration || null,
              lastMessageViewOnce: msg.viewOnce || false,
              lastMessageViewedAt: msg.viewedAt || null,
              lastMessageDeleted: false,
              lastReaction: undefined,
              reactionHistory: [],
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
            lastMediaType: msg.mediaType || null,
            lastMediaDuration: msg.mediaDuration || null,
            lastMessageViewOnce: msg.viewOnce || false,
            lastMessageViewedAt: msg.viewedAt || null,
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
      if (data.userId === user.id) return; // ignore self
      onlineUserIdsRef.current.add(data.userId);
      setConversations((prev) =>
        prev.map((c) =>
          c.participants.includes(data.userId) ? { ...c, isOnline: true } : c,
        ),
      );
    };

    const handlePresenceOffline = (data: { userId: string }) => {
      if (data.userId === user.id) return;
      onlineUserIdsRef.current.delete(data.userId);
      setConversations((prev) =>
        prev.map((c) =>
          c.participants.includes(data.userId) ? { ...c, isOnline: false } : c,
        ),
      );
    };

    const handlePresenceList = (userIds: string[]) => {
      const others = userIds.filter((id) => id !== user.id);
      onlineUserIdsRef.current = new Set(others);
      setConversations((prev) =>
        prev.map((c) =>
          c.participants.some((p) => others.includes(p))
            ? { ...c, isOnline: true }
            : { ...c, isOnline: false },
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

    const handleMessageDeleted = (data: {
      messageIds: string[];
      conversationId: string;
    }) => {
      // Check if these messages are still in our active list (not already
      // removed by the sender's own optimistic delete)
      setActiveMessages((prev) => {
        const idsStillPresent = data.messageIds.filter((id) =>
          prev.some((m) => m.id === id),
        );
        if (idsStillPresent.length > 0) {
          // Defer removal: add to pending so ChatArea can animate first
          setPendingRemoteDeletions((p) => [...p, ...idsStillPresent]);
        }
        return prev;
      });
      // Update sidebar: if deleted message was the lastMessage, show "Message deleted"
      setConversations((prev) =>
        prev.map((c) => {
          if (
            c.id === data.conversationId &&
            c.lastMessageId &&
            data.messageIds.includes(c.lastMessageId)
          ) {
            return {
              ...c,
              lastMessage: "Message deleted",
              lastMessageDeleted: true,
              lastMediaType: null,
              lastMediaDuration: null,
              lastMessageViewOnce: false,
              lastMessageViewedAt: null,
            };
          }
          return c;
        }),
      );
    };

    const handleViewOnceOpened = (data: {
      messageId: string;
      conversationId: string;
    }) => {
      const now = new Date().toISOString();
      setActiveMessages((prev) =>
        prev.map((m) =>
          m.id === data.messageId ? { ...m, viewedAt: now } : m,
        ),
      );
      // Update sidebar — if this view-once message is the last message, mark it opened
      setConversations((prev) =>
        prev.map((c) =>
          c.id === data.conversationId && c.lastMessageId === data.messageId
            ? { ...c, lastMessageViewedAt: now }
            : c,
        ),
      );
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

    // ── Browser notifications for incoming messages ─────────────────────
    const handleBrowserNotification = (msg: MessagePayload) => {
      if (msg.sender === user.id) return;

      // Check if messages notifications are enabled
      const messagesOn =
        localStorage.getItem("ephemeral-notif-messages") !== "false";
      if (!messagesOn) return;

      // Banner mode: "always" | "when-inactive" | "never"
      const bannerMode =
        localStorage.getItem("ephemeral-notif-banner") ?? "always";
      if (bannerMode === "never") return;

      const isConvActive = msg.conversationId === activeConvRef.current?.id;
      if (bannerMode === "when-inactive" && document.hasFocus() && isConvActive)
        return;

      // Must have permission
      if (
        typeof Notification === "undefined" ||
        Notification.permission !== "granted"
      )
        return;

      const showPreview =
        localStorage.getItem("ephemeral-notif-preview") !== "false";
      const senderName = msg.senderDisplayName ?? "New message";
      let body: string;
      if (showPreview) {
        if (msg.mediaType === "audio") body = "🎤 Voice message";
        else if (msg.mediaType === "image") body = "📷 Photo";
        else if (msg.mediaType === "video") body = "🎥 Video";
        else if (msg.mediaType === "document") body = "📄 Document";
        else body = msg.text?.slice(0, 100) || "New message";
      } else {
        body = "New message";
      }

      const n = new Notification(senderName, { body, tag: msg._id });
      // Auto-close after 5 seconds
      setTimeout(() => n.close(), 5000);
    };

    socket.on("message:new", handleNewMessage);
    socket.on("message:new", handleDeliverOnReceive);
    socket.on("message:new", handleBrowserNotification);
    socket.on("message:status", handleMessageStatus);
    socket.on("message:expired", handleMessageExpired);
    socket.on("message:deleted", handleMessageDeleted);
    socket.on("message:viewOnce:opened", handleViewOnceOpened);

    const handleReaction = (data: {
      messageId: string;
      conversationId: string;
      userId: string;
      displayName: string;
      emoji: string;
      action: "add" | "remove";
    }) => {
      setReactions((prev) => {
        const msgReactions = [...(prev[data.messageId] || [])];
        if (data.action === "add") {
          // One reaction per user: remove any existing first
          const existingIdx = msgReactions.findIndex(
            (r) => r.userId === data.userId,
          );
          if (existingIdx >= 0) msgReactions.splice(existingIdx, 1);
          msgReactions.push({
            userId: data.userId,
            displayName: data.displayName,
            emoji: data.emoji,
          });
        } else {
          const idx = msgReactions.findIndex(
            (r) => r.userId === data.userId && r.emoji === data.emoji,
          );
          if (idx >= 0) msgReactions.splice(idx, 1);
        }
        return { ...prev, [data.messageId]: msgReactions };
      });
      // Update sidebar preview for last message reactions (with history stack)
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== data.conversationId) return c;
          const history = [...(c.reactionHistory || [])];
          if (data.action === "add") {
            const msgText =
              activeConvRef.current?.id === data.conversationId
                ? (() => {
                    const msg = activeMessagesRef.current.find(
                      (m) => m.id === data.messageId,
                    );
                    if (!msg) return c.lastMessage || "";
                    if (msg.mediaType === "audio") return "🎤 Voice message";
                    if (msg.mediaType === "image") return "📷 Photo";
                    if (msg.mediaType === "video") return "🎥 Video";
                    if (msg.mediaType === "document") return "📄 Document";
                    return `"${msg.text.slice(0, 50)}${msg.text.length > 50 ? "..." : ""}"`;
                  })()
                : c.lastMessage || "";
            const prefix =
              data.userId === user?.id
                ? "You reacted with"
                : `${data.displayName} reacted with`;
            const reactionText = `${prefix} ${data.emoji} to: ${msgText}`;
            // Remove any previous entry by same user, then push new
            const filtered = history.filter((e) => e.userId !== data.userId);
            filtered.push({
              userId: data.userId,
              displayName: data.displayName,
              emoji: data.emoji,
              text: reactionText,
            });
            return {
              ...c,
              reactionHistory: filtered,
              lastReaction: reactionText,
            };
          }
          if (data.action === "remove") {
            const filtered = history.filter(
              (e) => !(e.userId === data.userId && e.emoji === data.emoji),
            );
            const last =
              filtered.length > 0
                ? filtered[filtered.length - 1].text
                : undefined;
            return { ...c, reactionHistory: filtered, lastReaction: last };
          }
          return c;
        }),
      );
    };
    socket.on("message:reaction", handleReaction);

    socket.on("presence:online", handlePresenceOnline);
    socket.on("presence:offline", handlePresenceOffline);
    socket.on("presence:list", handlePresenceList);
    socket.on("typing", handleTyping);

    const handleProfileUpdated = (data: {
      userId: string;
      displayName: string;
      initials: string;
      avatarGradient: string;
      avatarUrl: string | null;
    }) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.participants.includes(data.userId)
            ? {
                ...c,
                name: data.displayName,
                initials: data.initials,
                gradient: data.avatarGradient,
                avatar: data.avatarUrl || undefined,
              }
            : c,
        ),
      );
      // Also update activeConversation if it involves this user
      setActiveConversation((prev) =>
        prev && prev.participants.includes(data.userId)
          ? {
              ...prev,
              name: data.displayName,
              initials: data.initials,
              gradient: data.avatarGradient,
              avatar: data.avatarUrl || undefined,
            }
          : prev,
      );
    };
    socket.on("user:profile-updated", handleProfileUpdated);

    return () => {
      socket.off("message:new", handleNewMessage);
      socket.off("message:new", handleDeliverOnReceive);
      socket.off("message:new", handleBrowserNotification);
      socket.off("message:status", handleMessageStatus);
      socket.off("message:expired", handleMessageExpired);
      socket.off("message:deleted", handleMessageDeleted);
      socket.off("message:viewOnce:opened", handleViewOnceOpened);
      socket.off("message:reaction", handleReaction);
      socket.off("presence:online", handlePresenceOnline);
      socket.off("presence:offline", handlePresenceOffline);
      socket.off("presence:list", handlePresenceList);
      socket.off("typing", handleTyping);
      socket.off("user:profile-updated", handleProfileUpdated);
    };
  }, [socket, user]);

  // ── Send message ─────────────────────────────────────────────────────────
  const sendMessage = useCallback(
    (text: string, linkPreview?: LinkPreview | null) => {
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
        linkPreview: linkPreview || null,
      };

      setActiveMessages((prev) => [...prev, newMsg]);

      // Play sent-message sound if enabled
      if (localStorage.getItem("ephemeral-notif-send-sound") === "true") {
        try {
          const ctx = new AudioContext();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.value = 600;
          gain.gain.setValueAtTime(0.15, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
          osc.connect(gain).connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.15);
          osc.onended = () => ctx.close();
        } catch {
          // AudioContext not available
        }
      }

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

      // Timeout fallback: if the ack never fires (socket disconnect, proxy
      // drop, etc.) remove the stuck "sending" message after 15 seconds.
      const ackTimeoutId = setTimeout(() => {
        setActiveMessages((prev) => prev.filter((m) => m.id !== tempId));
        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeConversation.id && c.lastMessageId === tempId
              ? { ...c, lastMessageId: undefined, lastMessageStatus: undefined }
              : c,
          ),
        );
      }, 15_000);

      socket.emit(
        "message:send",
        {
          conversationId: activeConversation.id,
          text,
          linkPreview: linkPreview || null,
        },
        (res) => {
          clearTimeout(ackTimeoutId);
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

  // ── Send a status reply message (from the Status page) ──────────────────
  const sendStatusReplyMessage = useCallback(
    (
      _recipientId: string,
      conversationId: string,
      text: string,
      statusReply: {
        mediaType: "text" | "image" | "video";
        text?: string | null;
        textBgGradient?: string | null;
        mediaUrl?: string | null;
        caption?: string | null;
        senderName: string;
      },
    ) => {
      if (!socket || !user) return;

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
        statusReply,
      };

      // If this conversation is already active, append optimistically
      if (activeConvRef.current?.id === conversationId) {
        setActiveMessages((prev) => [...prev, newMsg]);
      }

      // Update sidebar snippet optimistically
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId
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

      socket.emit("join:conversation", conversationId);

      socket.emit(
        "message:send",
        {
          conversationId,
          text,
          statusReply,
        } as any,
        (res) => {
          if (res.ok && res.messageId) {
            sentMsgsRef.current.set(res.messageId!, conversationId);
            if (activeConvRef.current?.id === conversationId) {
              setActiveMessages((prev) =>
                prev.map((m) =>
                  m.id === tempId
                    ? { ...m, id: res.messageId!, status: "sent" }
                    : m,
                ),
              );
            }
            setConversations((prev) =>
              prev.map((c) =>
                c.id === conversationId && c.lastMessageId === tempId
                  ? {
                      ...c,
                      lastMessageId: res.messageId!,
                      lastMessageStatus: "sent",
                    }
                  : c,
              ),
            );
          }
        },
      );
    },
    [user, socket],
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

  const deleteForMe = useCallback((ids: string[]) => {
    // Hide messages locally without touching the server
    setHiddenMessageIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      localStorage.setItem("hiddenMessageIds", JSON.stringify([...next]));
      return next;
    });
  }, []);

  const deleteForEveryone = useCallback(
    (ids: string[]) => {
      if (!socket || !activeConversation) return;
      const convId = activeConversation.id;
      // Optimistic local removal
      setActiveMessages((prev) => prev.filter((m) => !ids.includes(m.id)));
      // Update sidebar: if deleted message was the lastMessage, show "Message deleted"
      setConversations((prev) =>
        prev.map((c) => {
          if (
            c.id === convId &&
            c.lastMessageId &&
            ids.includes(c.lastMessageId)
          ) {
            return {
              ...c,
              lastMessage: "Message deleted",
              lastMessageDeleted: true,
              lastMediaType: null,
              lastMediaDuration: null,
              lastMessageViewOnce: false,
              lastMessageViewedAt: null,
            };
          }
          return c;
        }),
      );
      // Ask server via socket to delete and notify all participants
      socket.emit(
        "message:deleteForEveryone",
        { messageIds: ids, conversationId: convId },
        (res) => {
          if (!res.ok) {
            console.warn("[chat] deleteForEveryone failed");
          }
        },
      );
    },
    [socket, activeConversation],
  );

  // Called by ChatArea after the disintegration animation finishes
  const confirmRemoteDeletion = useCallback((ids: string[]) => {
    setActiveMessages((prev) => prev.filter((m) => !ids.includes(m.id)));
    setPendingRemoteDeletions((prev) => prev.filter((id) => !ids.includes(id)));
  }, []);

  const markAllAsRead = useCallback(
    async (conversationIds?: string[]) => {
      // Zero unread counts optimistically
      setConversations((prev) =>
        prev.map((c) => {
          if (conversationIds && !conversationIds.includes(c.id)) return c;
          return { ...c, unreadCount: 0 };
        }),
      );

      // If the currently open conversation is included, also update its messages
      const activeId = activeConvRef.current?.id;
      if (
        activeId &&
        (!conversationIds || conversationIds.includes(activeId))
      ) {
        const unreadIds = activeMessagesRef.current
          .filter((m) => !m.isMe && m.status !== "read")
          .map((m) => m.id);

        // Update local message status immediately
        setActiveMessages((prev) =>
          prev.map((m) => (!m.isMe ? { ...m, status: "read" as const } : m)),
        );

        // Notify senders via socket so they see blue double-ticks
        if (unreadIds.length > 0 && socket) {
          socket.emit("message:read", {
            messageIds: unreadIds,
            conversationId: activeId,
          });
        }
      }

      try {
        await apiFetch("/messages/mark-all-read", {
          method: "PATCH",
          body: JSON.stringify(conversationIds ? { conversationIds } : {}),
        });
      } catch (err) {
        console.warn("[chat] markAllAsRead failed:", (err as Error).message);
      }
    },
    [socket],
  );

  const clearConversationById = useCallback((convId: string) => {
    if (activeConvRef.current?.id === convId) {
      setActiveMessages([]);
    }
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
    apiFetch(`/messages/${convId}`, { method: "DELETE" }).catch((err) =>
      console.warn(
        "[chat] clearConversationById failed:",
        (err as Error).message,
      ),
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

  // ── React to message ─────────────────────────────────────────────────────
  const reactToMessage = useCallback(
    (messageId: string, emoji: string) => {
      if (!socket || !user) return;
      const convId = activeConversation?.id;
      if (!convId) return;

      // Peek at current reactions to determine add vs remove
      const currentReactions = reactionsRef.current[messageId] || [];
      const existing = currentReactions.find((r) => r.userId === user.id);
      const isRemove = !!existing && existing.emoji === emoji;

      // Optimistic update: one reaction per user — replace or toggle off
      setReactions((prev) => {
        const msgReactions = [...(prev[messageId] || [])];
        const existingIdx = msgReactions.findIndex((r) => r.userId === user.id);
        if (existingIdx >= 0) {
          const ex = msgReactions[existingIdx];
          msgReactions.splice(existingIdx, 1);
          if (ex.emoji === emoji) {
            return { ...prev, [messageId]: msgReactions };
          }
        }
        msgReactions.push({
          userId: user.id,
          displayName: user.displayName,
          emoji,
        });
        return { ...prev, [messageId]: msgReactions };
      });

      // Optimistic sidebar update — mirrors handleReaction but instant
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== convId) return c;
          const history = [...(c.reactionHistory || [])];
          if (isRemove) {
            const filtered = history.filter(
              (e) => !(e.userId === user.id && e.emoji === emoji),
            );
            const last =
              filtered.length > 0
                ? filtered[filtered.length - 1].text
                : undefined;
            return { ...c, reactionHistory: filtered, lastReaction: last };
          }
          // Add / replace
          const msg = activeMessagesRef.current.find((m) => m.id === messageId);
          const msgText = !msg
            ? c.lastMessage || ""
            : msg.mediaType === "audio"
              ? "🎤 Voice message"
              : msg.mediaType === "image"
                ? "📷 Photo"
                : msg.mediaType === "video"
                  ? "🎥 Video"
                  : msg.mediaType === "document"
                    ? "📄 Document"
                    : `"${msg.text.slice(0, 50)}${msg.text.length > 50 ? "..." : ""}"`;
          const reactionText = `You reacted with ${emoji} to: ${msgText}`;
          const filtered = history.filter((e) => e.userId !== user.id);
          filtered.push({
            userId: user.id,
            displayName: user.displayName,
            emoji,
            text: reactionText,
          });
          return {
            ...c,
            reactionHistory: filtered,
            lastReaction: reactionText,
          };
        }),
      );

      socket.emit(
        "message:react",
        { messageId, conversationId: convId, emoji },
        (ack) => {
          if (!ack?.ok) console.warn("[chat] reaction failed");
        },
      );
    },
    [socket, user, activeConversation],
  );

  // ── Send media message ───────────────────────────────────────────────────
  // ── Add optimistic media bubble immediately (before upload) ────────────────
  const addOptimisticMediaMessage = useCallback(
    (media: {
      mediaType: "image" | "video" | "audio" | "document";
      mediaDuration?: number;
      mediaFileName?: string;
      localPreviewUrl?: string;
      text?: string;
      viewOnce?: boolean;
    }): string => {
      if (!activeConversation || !user) return "";
      const tempId = `temp-${Date.now()}`;
      const now = new Date();
      const newMsg: Message = {
        id: tempId,
        senderId: user.id ?? "me",
        senderName: user.displayName ?? "Me",
        text: media.text || "",
        mediaUrl: media.localPreviewUrl || null,
        mediaType: media.mediaType,
        mediaDuration: media.mediaDuration || null,
        mediaFileName: media.mediaFileName || null,
        viewOnce: media.viewOnce || false,
        viewedAt: null,
        timestamp: now.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        rawTimestamp: now.toISOString(),
        status: "sending",
        isMe: true,
        isUploading: true,
      };
      setActiveMessages((prev) => [...prev, newMsg]);
      return tempId;
    },
    [activeConversation, user],
  );

  const cancelOptimisticMediaMessage = useCallback((tempId: string) => {
    setActiveMessages((prev) => prev.filter((m) => m.id !== tempId));
  }, []);

  const sendMediaMessage = useCallback(
    (media: {
      mediaUrl: string;
      mediaType: "image" | "video" | "audio" | "document";
      mediaDuration?: number;
      mediaFileName?: string;
      text?: string;
      viewOnce?: boolean;
      replaceTempId?: string;
    }) => {
      if (!activeConversation || !user || !socket) return;

      const tempId = media.replaceTempId || `temp-${Date.now()}`;
      const now = new Date();
      const label =
        media.mediaType === "audio"
          ? "🎤 Voice message"
          : media.mediaType === "video"
            ? "🎬 Video"
            : media.mediaType === "document"
              ? "📄 Document"
              : "📷 Photo";
      const sidebarLabel = media.viewOnce
        ? `🔒 ${label.replace(/^.+\s/, "")}`
        : label;
      const newMsg: Message = {
        id: tempId,
        senderId: user.id ?? "me",
        senderName: user.displayName ?? "Me",
        text: media.text || "",
        mediaUrl: media.mediaUrl,
        mediaType: media.mediaType,
        mediaDuration: media.mediaDuration || null,
        mediaFileName: media.mediaFileName || null,
        viewOnce: media.viewOnce || false,
        viewedAt: null,
        timestamp: now.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        rawTimestamp: now.toISOString(),
        status: "sending",
        isMe: true,
        isUploading: false,
      };

      if (media.replaceTempId) {
        // Update the existing optimistic bubble in-place
        setActiveMessages((prev) =>
          prev.map((m) =>
            m.id === media.replaceTempId
              ? { ...newMsg, id: media.replaceTempId! }
              : m,
          ),
        );
      } else {
        setActiveMessages((prev) => [...prev, newMsg]);
      }

      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversation.id
            ? {
                ...c,
                lastMessage: `You: ${sidebarLabel}`,
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
        {
          conversationId: activeConversation.id,
          text: media.text || "",
          mediaUrl: media.mediaUrl,
          mediaType: media.mediaType,
          mediaDuration: media.mediaDuration,
          mediaFileName: media.mediaFileName,
          viewOnce: media.viewOnce || false,
        },
        (res) => {
          if (res.ok && res.messageId) {
            sentMsgsRef.current.set(res.messageId!, activeConversation.id);
            setActiveMessages((prev) =>
              prev.map((m) =>
                m.id === tempId
                  ? { ...m, id: res.messageId!, status: "sent" }
                  : m,
              ),
            );
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

  // ── Mark view-once message as opened ─────────────────────────────────────
  const markViewOnceOpened = useCallback(
    (messageId: string) => {
      if (!activeConversation || !socket) return;

      const now = new Date().toISOString();

      // Optimistically mark as viewed locally
      setActiveMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, viewedAt: now } : m)),
      );

      // Update sidebar if this is the last message
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversation.id && c.lastMessageId === messageId
            ? { ...c, lastMessageViewedAt: now }
            : c,
        ),
      );

      // Notify server
      socket.emit("message:viewOnce:open", {
        messageId,
        conversationId: activeConversation.id,
      });
    },
    [activeConversation, socket],
  );

  return (
    <ChatContext.Provider
      value={{
        conversations,
        conversationsLoading,
        activeConversation,
        activeMessages: activeMessages.filter(
          (m) => !hiddenMessageIds.has(m.id),
        ),
        typingUsers,
        socket,
        mobileInChat,
        setActiveConversation,
        setMobileInChat,
        sendMessage,
        sendMediaMessage,
        addOptimisticMediaMessage,
        cancelOptimisticMediaMessage,
        loadConversations,
        addOrUpdateConversation,
        deleteMessages,
        deleteForMe,
        deleteForEveryone,
        markViewOnceOpened,
        clearMessages,
        deleteConversation,
        markAllAsRead,
        clearConversationById,
        pendingRemoteDeletions,
        confirmRemoteDeletion,
        reactions,
        reactToMessage,
        feedStatusUserIds,
        removeFeedStatusUserId: (userId: string) => {
          setFeedStatusUserIds((prev) => {
            const next = new Set(prev);
            next.delete(userId);
            return next;
          });
        },
        sendStatusReplyMessage,
        webrtc,
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
