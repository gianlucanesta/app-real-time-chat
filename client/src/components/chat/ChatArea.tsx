import {
  Search,
  Video,
  Phone,
  MoreVertical,
  Plus,
  Smile,
  Mic,
  Send,
  CheckSquare,
  BellOff,
  Timer,
  Star,
  AlertTriangle,
  ShieldAlert,
  Trash2,
  ChevronLeft,
  ChevronDown,
  Users2,
  Link2,
  Calendar,
  X,
} from "lucide-react";
import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useClickOutside } from "../../hooks/useClickOutside";
import { ContactProfilePanel } from "./ContactProfilePanel";
import { GroupInfoPanel } from "./GroupInfoPanel";
import { EditContactPanel } from "./EditContactPanel";
import { ChatMessage } from "./ChatMessage";
import { ConfirmModal } from "./ConfirmModal";
import { DeleteChoiceModal } from "./DeleteChoiceModal";
import { AttachmentMenu } from "./AttachmentMenu";
import { CameraModal } from "./CameraModal";
import { VoiceRecorder } from "./VoiceRecorder";
import { MediaPreviewScreen } from "./MediaPreviewScreen";
import { MediaViewer, type MediaItem } from "./MediaViewer";
import { EmojiPicker } from "./EmojiPicker";
import {
  MuteConversationModal,
  type MuteDuration,
} from "./MuteConversationModal";
import { useChat, type Message } from "../../contexts/ChatContext";
import type { LinkPreview } from "../../types";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { getAccessToken } from "../../lib/api";
import { disintegrate } from "../../lib/disintegrate";
import { LinkPreviewCard } from "./LinkPreviewCard";
import {
  useChatSettings,
  applyEmojiReplace,
  DOODLE_BG_IMAGE,
} from "../../hooks/useChatSettings";

/** Return a human-friendly date label for a message group separator. */
function dateSeparatorLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffMs = today.getTime() - msgDay.getTime();
  const diffDays = Math.round(diffMs / 86_400_000);
  if (diffDays === 0) return "TODAY";
  if (diffDays === 1) return "YESTERDAY";
  return d
    .toLocaleDateString(undefined, {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
    .toUpperCase();
}

/** Group messages by day, returning [label, messages][] pairs. */
function groupMessagesByDate(messages: Message[]): [string, Message[]][] {
  const groups: [string, Message[]][] = [];
  let currentLabel = "";
  for (const msg of messages) {
    const label = dateSeparatorLabel(msg.rawTimestamp);
    if (label !== currentLabel) {
      currentLabel = label;
      groups.push([label, [msg]]);
    } else {
      groups[groups.length - 1][1].push(msg);
    }
  }
  return groups;
}

interface ChatAreaProps {
  onMobileBack?: () => void;
  onOpenNewContact?: () => void;
  onOpenNewGroup?: () => void;
}

export function ChatArea({
  onMobileBack,
  onOpenNewContact,
  onOpenNewGroup,
}: ChatAreaProps) {
  const navigate = useNavigate();

  const { user } = useAuth();
  const {
    conversations,
    activeConversation,
    setActiveConversation,
    activeMessages,
    messagesLoading,
    sendMessage,
    sendMediaMessage,
    addOptimisticMediaMessage,
    cancelOptimisticMediaMessage,
    socket,
    deleteForMe,
    deleteForEveryone,
    markViewOnceOpened,
    clearMessages,
    deleteConversation,
    pendingRemoteDeletions,
    confirmRemoteDeletion,
    reactions,
    reactToMessage,
    muteConversation,
    unmuteConversation,
  } = useChat();
  const toast = useToast();
  const chatSettings = useChatSettings();

  // Derive live state from the conversations array (activeConversation is a stale copy)
  const liveConv = conversations.find((c) => c.id === activeConversation?.id);
  const isContactTyping = liveConv?.isTyping ?? false;
  const isContactOnline = liveConv?.isOnline ?? false;

  const [isContactInfoOpen, setIsContactInfoOpen] = useState(false);
  const [isEditContactOpen, setIsEditContactOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [offlineTextVisible, setOfflineTextVisible] = useState(true);
  const offlineTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Link preview state
  const [linkPreview, setLinkPreview] = useState<LinkPreview | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const linkPreviewDismissed = useRef(false);
  const previewAbortRef = useRef<AbortController | null>(null);

  // Dropdowns
  const [isCallMenuOpen, setIsCallMenuOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  const callMenuRef = useClickOutside<HTMLDivElement>(() =>
    setIsCallMenuOpen(false),
  );
  const moreMenuRef = useClickOutside<HTMLDivElement>(() =>
    setIsMoreMenuOpen(false),
  );

  const handleOpenContactInfo = () => setIsContactInfoOpen(true);
  const handleCloseContactInfo = () => setIsContactInfoOpen(false);

  const handleOpenEditContact = () => {
    setIsContactInfoOpen(false);
    setIsEditContactOpen(true);
  };
  const handleCloseEditContact = () => setIsEditContactOpen(false);

  // Select Mode State
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectModeReason, setSelectModeReason] = useState<"select" | "delete">(
    "select",
  );
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);

  // Reply state
  const [replyingTo, setReplyingTo] = useState<{
    messageId: string;
    senderName: string;
    text: string;
    mediaType?: "image" | "video" | "audio" | "document" | null;
    mediaUrl?: string | null;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Attachment menu & voice recording
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [viewOnce, setViewOnce] = useState(false);

  // Media preview state
  const [previewFiles, setPreviewFiles] = useState<
    Array<{
      file: File;
      type: "image" | "video" | "audio" | "document";
      previewUrl: string;
    }>
  >([]);
  const addMoreInputRef = useRef<HTMLInputElement>(null);

  // Media gallery viewer state (null = closed)
  const [mediaViewerIndex, setMediaViewerIndex] = useState<number | null>(null);

  // Build gallery items from all non-view-once image/video messages
  const allMedia: MediaItem[] = activeMessages
    .filter(
      (m) =>
        m.mediaUrl &&
        (m.mediaType === "image" || m.mediaType === "video") &&
        !m.viewOnce,
    )
    .map((m) => ({
      messageId: m.id,
      url: m.mediaUrl!,
      type: m.mediaType as "image" | "video",
      caption: m.text || undefined,
      time: m.timestamp,
      isSent: m.isMe,
    }));

  const toggleMessageSelection = (id: string) => {
    setSelectedMessages((prev) =>
      prev.includes(id) ? prev.filter((msgId) => msgId !== id) : [...prev, id],
    );
  };

  // Reactions are now managed by ChatContext

  const handleCopyMessage = useCallback(
    (text: string) => {
      navigator.clipboard
        .writeText(text)
        .then(() => toast.showToast("Message copied!", "success"));
    },
    [toast],
  );

  const handleEnterSelectMode = useCallback(
    (msgId: string, reason: "select" | "delete" = "select") => {
      setIsSelectMode(true);
      setSelectModeReason(reason);
      setSelectedMessages([msgId]);
    },
    [],
  );

  // Animated delete: disintegrate messages, then remove them
  const handleAnimatedDelete = useCallback(
    async (ids: string[], deleteFn: () => void, message: string) => {
      setActiveModal(null);
      setIsSelectMode(false);
      setSelectModeReason("select");
      setSelectedMessages([]);

      // Wait for re-render so messages show without selection styling
      await new Promise((r) => requestAnimationFrame(r));
      await new Promise((r) => requestAnimationFrame(r));

      const elements = ids
        .map(
          (id) =>
            document.querySelector(
              `[data-id="${CSS.escape(id)}"]`,
            ) as HTMLElement | null,
        )
        .filter((el): el is HTMLElement => el !== null);

      if (elements.length > 0) {
        await Promise.all(elements.map((el) => disintegrate(el)));
      }

      deleteFn();
      toast.showToast(message, "success");
    },
    [toast],
  );

  // Watch for remote deletions (delete-for-everyone from another user)
  // and play the disintegration animation before confirming removal
  useEffect(() => {
    if (pendingRemoteDeletions.length === 0) return;
    const ids = [...pendingRemoteDeletions];
    // Run animation then confirm
    (async () => {
      await new Promise((r) => requestAnimationFrame(r));
      const elements = ids
        .map(
          (id) =>
            document.querySelector(
              `[data-id="${CSS.escape(id)}"]`,
            ) as HTMLElement | null,
        )
        .filter((el): el is HTMLElement => el !== null);
      if (elements.length > 0) {
        await Promise.all(elements.map((el) => disintegrate(el)));
      }
      confirmRemoteDeletion(ids);
    })();
  }, [pendingRemoteDeletions, confirmRemoteDeletion]);

  const handleCopySelected = useCallback(() => {
    const texts = activeMessages
      .filter((m) => selectedMessages.includes(m.id))
      .map((m) => m.text)
      .join("\n");
    navigator.clipboard.writeText(texts).then(() => {
      toast.showToast(
        `${selectedMessages.length} message(s) copied!`,
        "success",
      );
      setIsSelectMode(false);
      setSelectModeReason("select");
      setSelectedMessages([]);
    });
  }, [activeMessages, selectedMessages, toast]);

  // Call & Modal State
  const webrtc = useChat().webrtc;
  const [activeModal, setActiveModal] = useState<
    | "delete-messages"
    | "clear-chat"
    | "delete-chat"
    | "mute-notifications"
    | null
  >(null);

  const contactName = activeConversation?.name || "";
  const contactInitials = activeConversation?.initials || "";
  const contactGradient = activeConversation?.gradient || "";

  // Derive current user's initials & gradient for sent audio messages
  const myInitials = user?.displayName
    ? user.displayName
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "";
  const myGradient =
    user?.avatarGradient || "linear-gradient(135deg,#2563EB,#7C3AED)";
  const myAvatarUrl = user?.avatarUrl || null;
  const contactAvatarUrl = activeConversation?.avatar || null;

  // Scroll-to-bottom logic
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const prevConvIdRef = useRef<string | undefined>(undefined);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  useEffect(() => {
    if (!messagesEndRef.current || !activeMessages.length) return;
    const isConvSwitch = prevConvIdRef.current !== activeConversation?.id;
    prevConvIdRef.current = activeConversation?.id;
    messagesEndRef.current.scrollIntoView({
      behavior: isConvSwitch ? "instant" : "smooth",
    });
  }, [activeMessages, activeConversation?.id]);

  // Scroll to bottom when typing indicator appears
  useEffect(() => {
    if (isContactTyping && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [isContactTyping]);

  // Show/hide scroll-to-bottom button based on scroll position
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const handleScroll = () => {
      const distanceFromBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight;
      setShowScrollBtn(distanceFromBottom > 300);
    };
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const handleScrollToMessage = useCallback((messageId: string) => {
    const el = messagesContainerRef.current?.querySelector<HTMLElement>(
      `[data-id="${CSS.escape(messageId)}"]`,
    );
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    // Brief highlight flash
    el.classList.add(
      "ring-1",
      "ring-accent/30",
      "bg-accent/5",
      "rounded-2xl",
      "transition-all",
      "duration-500",
    );
    setTimeout(() => {
      el.classList.remove(
        "ring-1",
        "ring-accent/30",
        "bg-accent/5",
        "rounded-2xl",
        "transition-all",
        "duration-500",
      );
    }, 1500);
  }, []);

  // Typing emit logic
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  const handleTypingEmit = useCallback(() => {
    if (!activeConversation || !socket) return;
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit("typing:start", activeConversation.id);
    }
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      isTypingRef.current = false;
      socket.emit("typing:stop", activeConversation.id);
    }, 2000);
  }, [activeConversation, socket]);

  // Debounce URL detection from inputValue
  useEffect(() => {
    if (linkPreviewDismissed.current) return;
    const urlMatch = inputValue.match(/https?:\/\/[^\s]+/);
    if (!urlMatch) {
      setLinkPreview(null);
      setIsLoadingPreview(false);
      previewAbortRef.current?.abort();
      return;
    }
    const url = urlMatch[0];
    const timer = setTimeout(async () => {
      previewAbortRef.current?.abort();
      const controller = new AbortController();
      previewAbortRef.current = controller;
      setIsLoadingPreview(true);
      try {
        const apiBase =
          import.meta.env.VITE_API_URL ?? "http://localhost:3001/api";
        const token = await getAccessToken();
        const res = await fetch(
          `${apiBase}/upload/link-preview?url=${encodeURIComponent(url)}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          },
        );
        if (res.ok) {
          const data = (await res.json()) as LinkPreview;
          setLinkPreview(data);
        }
      } catch {
        // aborted or network error — silently ignore
      } finally {
        setIsLoadingPreview(false);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [inputValue]);

  // Reset dismissed flag when conversation changes
  useEffect(() => {
    linkPreviewDismissed.current = false;
    setLinkPreview(null);
  }, [activeConversation?.id]);

  const handleSend = useCallback(() => {
    if (!inputValue.trim()) return;
    sendMessage(inputValue.trim(), linkPreview, replyingTo ?? undefined);
    setInputValue("");
    setLinkPreview(null);
    setReplyingTo(null);
    linkPreviewDismissed.current = false;
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    if (isTypingRef.current && activeConversation && socket) {
      isTypingRef.current = false;
      socket.emit("typing:stop", activeConversation.id);
    }
  }, [
    inputValue,
    linkPreview,
    replyingTo,
    sendMessage,
    activeConversation,
    socket,
  ]);

  // Handle file selection from AttachmentMenu → open preview screen
  const handleFileSelected = useCallback(
    (file: File, type: "image" | "video" | "audio" | "document") => {
      const previewUrl = URL.createObjectURL(file);
      setPreviewFiles([{ file, type, previewUrl }]);
      setIsAttachmentMenuOpen(false);
    },
    [],
  );

  // Handle "add more" from preview screen
  const handleAddMoreFiles = useCallback(() => {
    addMoreInputRef.current?.click();
  }, []);

  const handleAddMoreChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      let type: "image" | "video" | "audio" | "document" = "document";
      if (file.type.startsWith("image/")) type = "image";
      else if (file.type.startsWith("video/")) type = "video";
      else if (file.type.startsWith("audio/")) type = "audio";
      const previewUrl = URL.createObjectURL(file);
      setPreviewFiles((prev) => [...prev, { file, type, previewUrl }]);
      e.target.value = "";
    },
    [],
  );

  // Upload file to Cloudinary via server
  const handleFileUpload = useCallback(
    async (
      file: File,
      type: "image" | "video" | "audio" | "document",
      caption?: string,
    ) => {
      if (!activeConversation) return;

      // Blob URL for immediate in-bubble preview (image & video only)
      const localPreviewUrl =
        type === "image" || type === "video"
          ? URL.createObjectURL(file)
          : undefined;

      // Show the bubble immediately with a loading overlay
      const tempId = addOptimisticMediaMessage({
        mediaType: type,
        mediaFileName: file.name,
        localPreviewUrl,
        text: caption,
        viewOnce,
      });

      try {
        const formData = new FormData();
        formData.append("file", file);
        const token = getAccessToken();
        const API_BASE =
          import.meta.env.VITE_API_URL ?? "http://localhost:3001/api";
        const res = await fetch(`${API_BASE}/upload`, {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          credentials: "include",
          body: formData,
        });
        if (!res.ok) {
          const err = await res
            .json()
            .catch(() => ({ error: "Upload failed" }));
          throw new Error(err.error || "Upload failed");
        }
        const data: {
          url: string;
          mediaType: "image" | "video" | "audio" | "document";
          duration: number | null;
          fileName?: string;
        } = await res.json();

        if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);

        sendMediaMessage({
          mediaUrl: data.url,
          mediaType: data.mediaType,
          mediaDuration: data.duration ?? undefined,
          mediaFileName: data.fileName,
          text: caption || undefined,
          viewOnce,
          replaceTempId: tempId,
        });
        if (viewOnce) setViewOnce(false);
      } catch (err) {
        if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
        cancelOptimisticMediaMessage(tempId);
        toast.showToast(
          (err as Error).message || "Failed to upload file",
          "error",
        );
      }
    },
    [
      activeConversation,
      addOptimisticMediaMessage,
      cancelOptimisticMediaMessage,
      sendMediaMessage,
      toast,
      viewOnce,
    ],
  );

  // Handle voice recording send
  const handleVoiceSend = useCallback(
    async (blob: Blob, _duration: number) => {
      setIsRecording(false);
      // Preserve the actual mime type from the recorder
      const ext = blob.type.includes("ogg") ? "ogg" : "webm";
      const file = new File([blob], `voice-message.${ext}`, {
        type: blob.type || "audio/webm",
      });
      await handleFileUpload(file, "audio");
    },
    [handleFileUpload],
  );

  // Send files from preview screen — upload each and send
  const handlePreviewSend = useCallback(
    async (
      files: Array<{
        file: File;
        type: "image" | "video" | "audio" | "document";
        previewUrl: string;
      }>,
      caption: string,
    ) => {
      setPreviewFiles([]);
      files.forEach((f) => URL.revokeObjectURL(f.previewUrl));

      for (const f of files) {
        await handleFileUpload(f.file, f.type, caption);
      }
    },
    [handleFileUpload],
  );

  // Stop typing and clear input when conversation changes
  useEffect(() => {
    setInputValue("");
    setOfflineTextVisible(true);
    setViewOnce(false);
    setMediaViewerIndex(null);
    setReplyingTo(null);
    setPreviewFiles((prev) => {
      prev.forEach((f) => URL.revokeObjectURL(f.previewUrl));
      return [];
    });
    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      isTypingRef.current = false;
    };
  }, [activeConversation?.id]);

  if (!activeConversation) {
    return (
      <main className="flex-1 flex flex-col min-w-0 h-full relative overflow-hidden bg-bg">
        {/* Empty State — hidden on mobile */}
        <div
          className="chat-empty-state w-full hidden md:flex"
          aria-hidden="false"
        >
          <div className="chat-empty-actions">
            <button
              type="button"
              className="chat-empty-action"
              onClick={() => onOpenNewContact?.()}
            >
              <div className="chat-empty-action-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                  <line x1="19" y1="8" x2="19" y2="14" />
                  <line x1="22" y1="11" x2="16" y2="11" />
                </svg>
              </div>
              <span>New contact</span>
            </button>
            <button
              type="button"
              className="chat-empty-action"
              onClick={() => onOpenNewGroup?.()}
            >
              <div className="chat-empty-action-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <span>New group</span>
            </button>
            <button
              type="button"
              className="chat-empty-action"
              onClick={() =>
                navigate({ to: "/settings", search: { section: "privacy" } })
              }
            >
              <div className="chat-empty-action-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <span>Privacy</span>
            </button>
          </div>
          {/* End-to-end encryption notice */}
          <p className="mt-8 flex items-center gap-1.5 text-[12px] text-text-secondary select-none">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-3.5 h-3.5 shrink-0"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Your messages are{" "}
            <a href="#" className="text-accent hover:underline">
              end-to-end encrypted.
            </a>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main
      className="flex-1 flex flex-col min-w-0 h-full relative overflow-hidden bg-bg"
      style={{
        ...(chatSettings.wallpaperColor
          ? { backgroundColor: chatSettings.wallpaperColor }
          : {}),
        ...(chatSettings.doodlesEnabled && chatSettings.wallpaperColor
          ? {
              backgroundImage: DOODLE_BG_IMAGE,
              backgroundSize: "200px 200px",
            }
          : {}),
      }}
    >
      {/* Right Side Panels */}
      {activeConversation?.type === "group" ? (
        <GroupInfoPanel
          isOpen={isContactInfoOpen}
          onClose={handleCloseContactInfo}
          groupConversationId={activeConversation.id}
          groupName={contactName}
          groupInitials={contactInitials}
          groupGradient={contactGradient}
          groupAvatar={contactAvatarUrl}
          mediaCount={
            activeMessages.filter(
              (m) =>
                m.mediaType === "image" ||
                m.mediaType === "video" ||
                m.mediaType === "document",
            ).length
          }
          starredCount={0}
          onSearch={undefined}
          onClearChat={() => {
            setIsContactInfoOpen(false);
            setActiveModal("clear-chat");
          }}
          onDeleteChat={() => {
            setIsContactInfoOpen(false);
            setActiveModal("delete-chat");
          }}
        />
      ) : (
        <ContactProfilePanel
          isOpen={isContactInfoOpen}
          onClose={handleCloseContactInfo}
          onEditClick={handleOpenEditContact}
          contactName={contactName}
          contactInitials={contactInitials}
          contactGradient={contactGradient}
          contactAvatarUrl={contactAvatarUrl}
          mediaCount={
            activeMessages.filter(
              (m) =>
                m.mediaType === "image" ||
                m.mediaType === "video" ||
                m.mediaType === "document",
            ).length
          }
          starredCount={0}
          onAudioCall={() => {
            const target = activeConversation?.participants.find(
              (p) => p !== user?.id,
            );
            if (target) void webrtc.startCall(target, false);
          }}
          onVideoCall={() => {
            const target = activeConversation?.participants.find(
              (p) => p !== user?.id,
            );
            if (target) void webrtc.startCall(target, true);
          }}
          onClearChat={() => {
            setIsContactInfoOpen(false);
            setActiveModal("clear-chat");
          }}
          onDeleteChat={() => {
            setIsContactInfoOpen(false);
            setActiveModal("delete-chat");
          }}
          onBlockContact={() => {
            toast.showToast("Contact blocked", "info");
          }}
          onReportContact={() => {
            toast.showToast("Contact reported", "info");
          }}
          onAddToFavorites={() => {
            toast.showToast("Added to favorites", "info");
          }}
        />
      )}
      <EditContactPanel
        isOpen={isEditContactOpen}
        onClose={handleCloseEditContact}
        contactName={contactName}
        contactInitials={contactInitials}
        contactGradient={contactGradient}
        contactAvatarUrl={contactAvatarUrl}
        contactFirstName={activeConversation?.firstName}
        contactLastName={activeConversation?.lastName}
        contactPhone={activeConversation?.phone}
      />

      {/* Chat Header */}
      <div className="chat-header z-[75]">
        <div
          className="flex items-center gap-3 md:gap-4 cursor-pointer hover:bg-input/50 p-1.5 md:p-2 -ml-1.5 md:-ml-2 rounded-xl transition-colors"
          onClick={handleOpenContactInfo}
        >
          {/* Mobile back button */}
          {onMobileBack && (
            <button
              type="button"
              className="md:hidden w-9 h-9 rounded-full flex items-center justify-center text-text-secondary hover:text-text-main hover:bg-input transition-colors shrink-0 -mr-1"
              onClick={(e) => {
                e.stopPropagation();
                onMobileBack();
              }}
              aria-label="Back to conversations"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <div className="relative inline-block">
            {contactAvatarUrl ? (
              <img
                src={contactAvatarUrl}
                alt={contactName}
                className="w-10 h-10 md:w-[42px] md:h-[42px] rounded-full object-cover shrink-0"
              />
            ) : (
              <div
                className="w-10 h-10 md:w-[42px] md:h-[42px] rounded-full flex items-center justify-center font-bold text-[13px] md:text-[14px] text-white shrink-0"
                style={{ background: contactGradient }}
              >
                {contactInitials}
              </div>
            )}
            {isContactOnline && (
              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-success border-2 border-bg box-content"></span>
            )}
          </div>

          <div
            className="flex-1 min-w-0"
            onMouseEnter={() => {
              if (!isContactOnline && !isContactTyping) {
                if (offlineTimerRef.current)
                  clearTimeout(offlineTimerRef.current);
                offlineTimerRef.current = setTimeout(() => {
                  setOfflineTextVisible(false);
                }, 2000);
              }
            }}
            onMouseLeave={() => {
              if (offlineTimerRef.current)
                clearTimeout(offlineTimerRef.current);
              if (!offlineTextVisible) setOfflineTextVisible(true);
            }}
          >
            <h2
              className={`font-semibold text-text-main leading-tight truncate transition-all duration-300 ease-in-out ${
                !isContactOnline && !isContactTyping && !offlineTextVisible
                  ? "text-[17px] md:text-[18px] translate-y-[2px]"
                  : "text-[15px] md:text-[16px]"
              }`}
            >
              {contactName}
            </h2>
            {liveConv?.isMuted && !isContactTyping && (
              <div className="flex items-center gap-1 text-[11px] md:text-[12px] text-text-secondary mt-0.5">
                <BellOff className="w-3 h-3" />
                <span>Muted</span>
              </div>
            )}
            {isContactTyping ? (
              <div className="flex items-center gap-1.5 text-[11px] md:text-[12px] text-accent mt-0.5 transition-all duration-300 ease-in-out">
                <span className="flex gap-0.5">
                  <span
                    className="w-1 h-1 rounded-full bg-accent animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  />
                  <span
                    className="w-1 h-1 rounded-full bg-accent animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  />
                  <span
                    className="w-1 h-1 rounded-full bg-accent animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  />
                </span>
                typing...
              </div>
            ) : isContactOnline ? (
              <div className="hidden md:flex items-center gap-1.5 text-[11px] md:text-[12px] text-success mt-0.5 transition-all duration-300 ease-in-out">
                Online
              </div>
            ) : (
              <div
                className={`hidden md:flex items-center text-[11px] md:text-[12px] text-text-secondary mt-0.5 transition-all duration-300 ease-in-out overflow-hidden ${
                  offlineTextVisible
                    ? "max-h-6 opacity-100"
                    : "max-h-0 opacity-0"
                }`}
              >
                Offline
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 md:gap-2">
          {/* Call Dropdown Wrapper */}
          <div className="relative" ref={callMenuRef}>
            <button
              className="chat-call-btn"
              onClick={() => setIsCallMenuOpen(!isCallMenuOpen)}
            >
              <Video />
              <span className="call-text">Call</span>
              <ChevronDown className="call-chevron" />
            </button>
            {isCallMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-card border border-border/80 rounded-xl shadow-xl py-3 z-[80] animate-in fade-in slide-in-from-top-2">
                {/* Contact header */}
                <div className="px-4 py-2 flex items-center gap-3 mb-3">
                  {contactAvatarUrl ? (
                    <img
                      src={contactAvatarUrl}
                      alt={contactName}
                      className="w-9 h-9 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-[11px] text-white shrink-0"
                      style={{ background: contactGradient }}
                    >
                      {contactInitials}
                    </div>
                  )}
                  <span className="text-[14px] font-semibold text-text-main truncate">
                    {contactName}
                  </span>
                </div>
                {/* Voice / Video large accent buttons */}
                <div className="grid grid-cols-2 gap-3 px-4 pb-3">
                  <button
                    className="flex flex-row items-center justify-center gap-2.5 py-3 px-3 bg-accent hover:brightness-110 text-white rounded-2xl transition-all"
                    onClick={() => {
                      setIsCallMenuOpen(false);
                      const target = activeConversation?.participants.find(
                        (p) => p !== user?.id,
                      );
                      if (target) void webrtc.startCall(target, false);
                    }}
                  >
                    <Phone className="w-5 h-5 shrink-0" />
                    <span className="text-[13px] font-semibold">Voice</span>
                  </button>
                  <button
                    className="flex flex-row items-center justify-center gap-2.5 py-3 px-3 bg-accent hover:brightness-110 text-white rounded-2xl transition-all"
                    onClick={() => {
                      setIsCallMenuOpen(false);
                      const target = activeConversation?.participants.find(
                        (p) => p !== user?.id,
                      );
                      if (target) void webrtc.startCall(target, true);
                    }}
                  >
                    <Video className="w-5 h-5 shrink-0" />
                    <span className="text-[13px] font-semibold">Video</span>
                  </button>
                </div>
                <div className="w-full h-px bg-border/50 mb-1" />
                <button className="w-full flex items-center gap-3 px-4 py-2.5 text-[13.5px] text-text-main hover:bg-input/80 transition-colors">
                  <Users2 className="w-[18px] h-[18px] text-text-secondary" />{" "}
                  New group call
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-2.5 text-[13.5px] text-text-main hover:bg-input/80 transition-colors">
                  <Link2 className="w-[18px] h-[18px] text-text-secondary" />{" "}
                  Send call link
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-2.5 text-[13.5px] text-text-main hover:bg-input/80 transition-colors">
                  <Calendar className="w-[18px] h-[18px] text-text-secondary" />{" "}
                  Schedule a call
                </button>
              </div>
            )}
          </div>

          <button className="hidden md:flex w-9 h-9 rounded-full items-center justify-center text-text-secondary hover:text-text-main hover:bg-input transition-colors">
            <Search className="w-5 h-5" />
          </button>

          {/* More Options Dropdown Wrapper */}
          <div className="relative" ref={moreMenuRef}>
            <button
              className="w-9 h-9 rounded-full flex items-center justify-center text-text-secondary hover:text-text-main hover:bg-input transition-colors"
              onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
            >
              <MoreVertical className="w-5 h-5" />
            </button>
            {isMoreMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-card border border-border/80 rounded-xl shadow-xl py-2 z-[80] animate-in fade-in slide-in-from-top-2">
                <button
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-[13.5px] text-text-main hover:bg-input/80 transition-colors"
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    handleOpenContactInfo();
                  }}
                >
                  <Search className="w-4 h-4 text-text-secondary" /> Contact
                  info
                </button>
                <button
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-[13.5px] text-text-main hover:bg-input/80 transition-colors"
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    setIsSelectMode(true);
                  }}
                >
                  <CheckSquare className="w-4 h-4 text-text-secondary" /> Select
                  messages
                </button>
                <button
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-[13.5px] text-text-main hover:bg-input/80 transition-colors"
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    setActiveModal("mute-notifications");
                  }}
                >
                  <BellOff className="w-4 h-4 text-text-secondary" />
                  {liveConv?.isMuted
                    ? "Unmute notifications"
                    : "Mute notifications"}
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-2.5 text-[13.5px] text-text-main hover:bg-input/80 transition-colors">
                  <Timer className="w-4 h-4 text-text-secondary" /> Disappearing
                  messages
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-2.5 text-[13.5px] text-text-main hover:bg-input/80 transition-colors">
                  <Star className="w-4 h-4 text-text-secondary" /> Add to
                  favorites
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-2.5 text-[13.5px] text-text-main hover:bg-input/80 transition-colors">
                  <CheckSquare className="w-4 h-4 text-text-secondary" /> Add to
                  list
                </button>
                <button
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-[13.5px] text-text-main hover:bg-input/80 transition-colors"
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    if (onMobileBack) {
                      onMobileBack();
                    } else {
                      setActiveConversation(null);
                    }
                  }}
                >
                  <X className="w-4 h-4 text-text-secondary" /> Close chat
                </button>
                <div className="w-full h-px bg-border/50 my-1"></div>
                <button className="w-full flex items-center gap-3 px-4 py-2.5 text-[13.5px] text-text-main hover:bg-input/80 transition-colors">
                  <AlertTriangle className="w-4 h-4 text-text-secondary" />{" "}
                  Report
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-2.5 text-[13.5px] text-text-main hover:bg-input/80 transition-colors">
                  <ShieldAlert className="w-4 h-4 text-text-secondary" /> Block
                </button>
                <div className="w-full h-px bg-border/50 my-1"></div>
                <button
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-[13.5px] text-text-main hover:bg-input/80 transition-colors"
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    setActiveModal("clear-chat");
                  }}
                >
                  <Trash2 className="w-4 h-4 text-text-secondary" /> Clear chat
                </button>
                <button
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-[13.5px] text-danger hover:bg-danger/10 transition-colors font-medium"
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    setActiveModal("delete-chat");
                  }}
                >
                  <Trash2 className="w-4 h-4" /> Delete chat
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div
        ref={messagesContainerRef}
        className={`flex-1 min-h-0 overflow-y-auto px-4 md:px-8 flex flex-col pt-6 pb-4 scrollbar-thin scrollbar-thumb-border hover:scrollbar-thumb-toggle-off ${isSelectMode ? "select-mode" : ""}`}
      >
        {messagesLoading ? (
          <div
            className="flex flex-col gap-3 py-2"
            aria-busy="true"
            aria-label="Loading messages"
          >
            {/* Skeleton rows: alternating received / sent to mimic a real conversation */}
            {[
              { sent: false, widths: ["w-48", "w-32"] },
              { sent: true, widths: ["w-56"] },
              { sent: false, widths: ["w-64", "w-40"] },
              { sent: true, widths: ["w-40", "w-52"] },
              { sent: false, widths: ["w-36"] },
              { sent: true, widths: ["w-60"] },
              { sent: false, widths: ["w-44", "w-28"] },
              { sent: true, widths: ["w-52", "w-36"] },
            ].map((row, i) => (
              <div
                key={i}
                className={`flex items-end gap-2 mb-1 ${row.sent ? "self-end flex-row-reverse" : "self-start"}`}
              >
                {/* Avatar circle */}
                <div className="w-8 h-8 rounded-full bg-border/60 animate-pulse shrink-0" />
                {/* Bubble */}
                <div
                  className={`flex flex-col gap-1.5 rounded-2xl px-4 py-3 ${
                    row.sent
                      ? "rounded-br-sm bg-accent/20"
                      : "rounded-bl-sm bg-card border border-border/50"
                  } animate-pulse`}
                >
                  {row.widths.map((w, j) => (
                    <div
                      key={j}
                      className={`h-3 rounded-full bg-border/70 ${w}`}
                    />
                  ))}
                  {/* Timestamp bar */}
                  <div className="h-2 w-10 rounded-full bg-border/50 self-end mt-0.5" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {groupMessagesByDate(activeMessages).map(([label, msgs]) => (
              <div key={label} className="flex flex-col">
                {/* Date Separator */}
                <div className="flex items-center justify-center my-6">
                  <span className="bg-input/70 text-text-secondary text-[11px] font-medium uppercase tracking-[1px] px-3 py-1 rounded-lg">
                    {label}
                  </span>
                </div>

                {msgs.map((msg) => {
                  const isGroup = activeConversation?.type === "group";
                  return (
                    <ChatMessage
                      key={msg.id}
                      id={msg.id}
                      text={msg.text}
                      time={msg.timestamp}
                      isSent={msg.isMe}
                      isGroupChat={isGroup}
                      senderName={!msg.isMe ? msg.senderName : undefined}
                      status={msg.status}
                      mediaUrl={msg.mediaUrl}
                      mediaType={msg.mediaType}
                      mediaDuration={msg.mediaDuration}
                      mediaFileName={msg.mediaFileName}
                      isUploading={msg.isUploading}
                      viewOnce={msg.viewOnce}
                      viewedAt={msg.viewedAt}
                      contactInitials={
                        msg.isMe
                          ? myInitials
                          : isGroup && msg.senderInitials
                            ? msg.senderInitials
                            : contactInitials
                      }
                      contactGradient={
                        msg.isMe
                          ? myGradient
                          : isGroup && msg.senderGradient
                            ? msg.senderGradient
                            : contactGradient
                      }
                      contactAvatarUrl={
                        msg.isMe
                          ? myAvatarUrl
                          : isGroup && msg.senderAvatarUrl !== undefined
                            ? msg.senderAvatarUrl
                            : contactAvatarUrl
                      }
                      isSelectMode={isSelectMode}
                      isSelected={selectedMessages.includes(msg.id)}
                      onToggleSelect={() => toggleMessageSelection(msg.id)}
                      onCopy={() => handleCopyMessage(msg.text)}
                      onEnterSelectMode={(reason) =>
                        handleEnterSelectMode(msg.id, reason)
                      }
                      reactions={reactions[msg.id]}
                      onReaction={(emoji) => reactToMessage(msg.id, emoji)}
                      currentUserId={user?.id}
                      onViewOnceOpen={() => markViewOnceOpened(msg.id)}
                      onOpenMedia={() => {
                        const idx = allMedia.findIndex(
                          (m) => m.messageId === msg.id,
                        );
                        if (idx >= 0) setMediaViewerIndex(idx);
                      }}
                      onReply={() => {
                        setReplyingTo({
                          messageId: msg.id,
                          senderName: msg.isMe
                            ? "You"
                            : msg.senderName || contactName,
                          text: msg.text,
                          mediaType: msg.mediaType,
                          mediaUrl: msg.mediaUrl,
                        });
                        setTimeout(() => inputRef.current?.focus(), 50);
                      }}
                      linkPreview={msg.linkPreview}
                      statusReply={msg.statusReply}
                      quotedReply={msg.quotedReply}
                      onScrollToMessage={handleScrollToMessage}
                    />
                  );
                })}
              </div>
            ))}

            {/* Typing indicator bubble */}
            <div aria-live="polite" aria-atomic="true">
              {isContactTyping && (
                <div className="flex items-end mb-4 self-start">
                  <div
                    className="px-4 py-3 bg-card border border-border/50 rounded-2xl rounded-bl-sm shadow-sm flex items-center gap-[6px]"
                    aria-label="Contact is typing"
                    role="status"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full bg-accent/70 animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <span
                      className="w-2.5 h-2.5 rounded-full bg-accent/70 animate-bounce"
                      style={{ animationDelay: "160ms" }}
                    />
                    <span
                      className="w-2.5 h-2.5 rounded-full bg-accent/70 animate-bounce"
                      style={{ animationDelay: "320ms" }}
                    />
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} className="shrink-0" />
      </div>

      {/* Selection Action Bar */}
      <div
        className={`selection-bar ${isSelectMode ? "visible" : ""}`}
        aria-hidden={!isSelectMode}
      >
        <button
          className="selection-bar-cancel"
          onClick={() => {
            setIsSelectMode(false);
            setSelectModeReason("select");
            setSelectedMessages([]);
          }}
          aria-label="Cancel selection"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-5 h-5"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <span className="selection-bar-count">
          {selectedMessages.length} selected
        </span>
        <div className="selection-bar-actions">
          {selectModeReason !== "delete" && (
            <>
              <button
                className="selection-action-btn"
                data-sel-action="copy"
                aria-label="Copy"
                disabled={selectedMessages.length === 0}
                onClick={handleCopySelected}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-5 h-5"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              </button>
              <button
                className="selection-action-btn"
                data-sel-action="star"
                aria-label="Star"
                disabled={selectedMessages.length === 0}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-5 h-5"
                >
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </button>
            </>
          )}
          <button
            className="selection-action-btn selection-action-btn--delete text-danger hover:bg-danger/10 transition-colors"
            data-sel-action="delete"
            aria-label="Delete selected"
            disabled={selectedMessages.length === 0}
            onClick={() => setActiveModal("delete-messages")}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14H6L5 6" />
              <path d="M10 11v6" />
              <path d="M14 11v6" />
              <path d="M9 6V4h6v2" />
            </svg>
          </button>
          {selectModeReason !== "delete" && (
            <>
              <button
                className="selection-action-btn"
                data-sel-action="forward"
                aria-label="Forward"
                disabled={selectedMessages.length === 0}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-5 h-5"
                >
                  <polyline points="15 17 20 12 15 7" />
                  <path d="M4 18v-2a4 4 0 0 1 4-4h12" />
                </svg>
              </button>
              <button
                className="selection-action-btn"
                data-sel-action="download"
                aria-label="Download"
                disabled={selectedMessages.length === 0}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-5 h-5"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Scroll to bottom FAB */}
      {showScrollBtn && (
        <button
          type="button"
          onClick={scrollToBottom}
          className="absolute bottom-[72px] right-4 z-20 w-10 h-10 rounded-full bg-card border border-border/50 shadow-lg flex items-center justify-center text-text-secondary hover:text-text-main hover:bg-input transition-all"
          aria-label="Scroll to latest message"
        >
          <ChevronDown className="w-5 h-5" />
        </button>
      )}

      {/* Chat Input Area */}
      <div className="shrink-0 z-20 px-3 pb-2 md:px-4 md:pb-2 pt-2">
        {/* Link preview above input */}
        {(linkPreview || isLoadingPreview) && !isRecording && (
          <div className="mb-2 ml-1">
            {isLoadingPreview && !linkPreview && (
              <div className="flex items-center gap-2 text-xs text-text-secondary px-3 py-2 bg-input rounded-xl border border-border max-w-[280px]">
                <div className="w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin shrink-0" />
                Loading preview…
              </div>
            )}
            {linkPreview && (
              <LinkPreviewCard
                preview={linkPreview}
                onDismiss={() => {
                  setLinkPreview(null);
                  linkPreviewDismissed.current = true;
                }}
              />
            )}
          </div>
        )}
        {isRecording ? (
          <VoiceRecorder
            onSend={handleVoiceSend}
            onCancel={() => setIsRecording(false)}
            viewOnce={viewOnce}
            onToggleViewOnce={() => setViewOnce((v) => !v)}
          />
        ) : (
          <div
            className={`flex flex-col bg-input/80 backdrop-blur-md border border-border/50 shadow-lg overflow-hidden transition-all duration-150 ${replyingTo ? "rounded-3xl" : "rounded-full"}`}
          >
            {/* Reply preview bar */}
            {replyingTo && (
              <div className="flex items-center gap-2 px-3 pt-2 pb-1.5 border-b border-border/40">
                <div className="flex-1 min-w-0 flex flex-col border-l-4 border-accent pl-2">
                  <span className="text-[11px] font-semibold text-accent truncate">
                    {replyingTo.senderName}
                  </span>
                  <span className="text-[12px] text-text-secondary truncate">
                    {replyingTo.mediaType === "image"
                      ? "📷 Photo"
                      : replyingTo.mediaType === "video"
                        ? "🎬 Video"
                        : replyingTo.mediaType === "audio"
                          ? "🎤 Voice message"
                          : replyingTo.mediaType === "document"
                            ? "📄 Document"
                            : replyingTo.text}
                  </span>
                </div>
                <button
                  type="button"
                  aria-label="Cancel reply"
                  className="w-7 h-7 rounded-full flex items-center justify-center text-text-secondary hover:text-text-main hover:bg-input transition-colors shrink-0"
                  onClick={() => setReplyingTo(null)}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            <div className="flex items-center p-1.5">
              {/* + button: opens attachment menu */}
              <div className="relative">
                <button
                  className={`w-10 h-10 md:w-11 md:h-11 rounded-full flex items-center justify-center shrink-0 transition-all ${
                    isAttachmentMenuOpen
                      ? "bg-accent text-white rotate-45"
                      : "bg-accent text-white md:bg-transparent md:text-text-secondary hover:brightness-110 md:hover:bg-card md:hover:text-text-main"
                  }`}
                  aria-label="Add attachment"
                  onClick={() => setIsAttachmentMenuOpen(!isAttachmentMenuOpen)}
                >
                  {isAttachmentMenuOpen ? (
                    <X className="w-[22px] h-[22px]" />
                  ) : (
                    <Plus className="w-[22px] h-[22px]" />
                  )}
                </button>
                {isAttachmentMenuOpen && (
                  <AttachmentMenu
                    onClose={() => setIsAttachmentMenuOpen(false)}
                    onSelectFile={handleFileSelected}
                    onOpenCamera={() => setIsCameraOpen(true)}
                  />
                )}
              </div>

              {/* Emoji: always on desktop; on mobile only when input is empty */}
              <div
                className={`relative mr-1 ${inputValue ? "hidden md:flex" : "flex"}`}
              >
                <button
                  className="w-11 h-11 rounded-full flex items-center justify-center text-text-secondary shrink-0 hover:bg-card hover:text-text-main transition-colors"
                  aria-label="Emoji"
                  onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
                >
                  <Smile className="w-[22px] h-[22px]" />
                </button>
                {isEmojiPickerOpen && (
                  <EmojiPicker
                    position="top"
                    align="left"
                    onSelect={(emoji) => {
                      setInputValue((prev) => prev + emoji);
                      setIsEmojiPickerOpen(false);
                    }}
                    onClose={() => setIsEmojiPickerOpen(false)}
                  />
                )}
              </div>

              <input
                ref={inputRef}
                type="text"
                placeholder="Write a message..."
                value={inputValue}
                spellCheck={chatSettings.spellCheck}
                className="flex-1 bg-transparent border-none outline-none text-[14px] text-text-main placeholder:text-text-secondary px-2"
                onChange={(e) => {
                  const val = applyEmojiReplace(
                    e.target.value,
                    chatSettings.emojiReplace,
                  );
                  setInputValue(val);
                  handleTypingEmit();
                }}
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    !e.shiftKey &&
                    chatSettings.enterToSend
                  ) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />

              <div className="flex items-center gap-1.5 ml-2">
                {/* Mic: only when input is empty */}
                <button
                  className={`w-11 h-11 rounded-full flex items-center justify-center text-text-secondary shrink-0 hover:bg-card hover:text-text-main transition-colors ${inputValue ? "hidden" : "flex"}`}
                  aria-label="Voice note"
                  onClick={() => setIsRecording(true)}
                >
                  <Mic className="w-[22px] h-[22px]" />
                </button>
                {/* Send: only when input has text */}
                <button
                  className={`w-11 h-11 rounded-full bg-accent flex items-center justify-center text-white shrink-0 hover:brightness-110 shadow-md transition-all ${inputValue ? "flex" : "hidden"}`}
                  aria-label="Send message"
                  onClick={handleSend}
                >
                  <Send className="w-[22px] h-[22px] ml-0.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Hidden input for "add more" in preview */}
      <input
        ref={addMoreInputRef}
        type="file"
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar"
        className="hidden"
        onChange={handleAddMoreChange}
      />

      {/* Media Preview Screen */}
      {previewFiles.length > 0 && (
        <MediaPreviewScreen
          files={previewFiles}
          viewOnce={viewOnce}
          onToggleViewOnce={() => setViewOnce((v) => !v)}
          onSend={handlePreviewSend}
          onClose={() => {
            previewFiles.forEach((f) => URL.revokeObjectURL(f.previewUrl));
            setPreviewFiles([]);
          }}
          onAddMore={handleAddMoreFiles}
        />
      )}

      {/* Media Gallery Viewer */}
      {mediaViewerIndex !== null && allMedia.length > 0 && (
        <MediaViewer
          items={allMedia}
          initialIndex={mediaViewerIndex}
          contactName={contactName}
          onClose={() => setMediaViewerIndex(null)}
        />
      )}

      {/* Camera Modal */}
      {isCameraOpen && (
        <CameraModal
          onClose={() => setIsCameraOpen(false)}
          onCapture={(file, type) => {
            setIsCameraOpen(false);
            handleFileSelected(file, type);
          }}
        />
      )}

      {/* Confirmation Modals */}
      <DeleteChoiceModal
        isOpen={activeModal === "delete-messages"}
        count={selectedMessages.length}
        hasOwnMessages={selectedMessages.some((id) =>
          activeMessages.find((m) => m.id === id && m.isMe),
        )}
        onDeleteForMe={() => {
          const ids = [...selectedMessages];
          void handleAnimatedDelete(
            ids,
            () => deleteForMe(ids),
            "Messages hidden",
          );
        }}
        onDeleteForEveryone={() => {
          const ids = [...selectedMessages];
          const ownIds = ids.filter((id) =>
            activeMessages.find((m) => m.id === id && m.isMe),
          );
          const otherIds = ids.filter(
            (id) => !activeMessages.find((m) => m.id === id && m.isMe),
          );
          void handleAnimatedDelete(
            ids,
            () => {
              if (ownIds.length > 0) deleteForEveryone(ownIds);
              if (otherIds.length > 0) deleteForMe(otherIds);
            },
            "Messages deleted",
          );
        }}
        onCancel={() => setActiveModal(null)}
      />
      <ConfirmModal
        isOpen={activeModal === "clear-chat"}
        title="Clear chat?"
        description="All messages in this conversation will be permanently deleted. This cannot be undone."
        confirmText="Clear chat"
        onConfirm={() => {
          clearMessages();
          setActiveModal(null);
          toast.showToast("Chat cleared", "success");
        }}
        onCancel={() => setActiveModal(null)}
      />
      <ConfirmModal
        isOpen={activeModal === "delete-chat"}
        title="Delete chat?"
        description="This contact and all messages will be permanently removed. This cannot be undone."
        confirmText="Delete chat"
        onConfirm={() => {
          deleteConversation();
          setActiveModal(null);
          toast.showToast("Chat deleted", "success");
        }}
        onCancel={() => setActiveModal(null)}
      />
      <MuteConversationModal
        isOpen={activeModal === "mute-notifications"}
        conversationName={contactName}
        isMuted={liveConv?.isMuted ?? false}
        onCancel={() => setActiveModal(null)}
        onMute={(duration: MuteDuration) => {
          if (activeConversation)
            muteConversation(activeConversation.id, duration);
          setActiveModal(null);
          toast.showToast("Notifications muted", "success");
        }}
        onUnmute={() => {
          if (activeConversation) unmuteConversation(activeConversation.id);
          setActiveModal(null);
          toast.showToast("Notifications unmuted", "success");
        }}
      />
    </main>
  );
}
