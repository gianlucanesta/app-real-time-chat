import {
  Smile,
  SmilePlus,
  Reply,
  Copy,
  Forward,
  Pin,
  Star,
  CheckSquare,
  AlertTriangle,
  Trash2,
  Info,
  ChevronDown,
  Timer,
  CircleDot,
  X,
  FileText,
  Download,
} from "lucide-react";
import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { useClickOutside } from "../../hooks/useClickOutside";
import { AudioPlayer } from "./AudioPlayer";
import { EmojiPicker } from "./EmojiPicker";
import { TranscribeButton } from "./TranscribeButton";
import type { Reaction } from "../../contexts/ChatContext";
import type { LinkPreview } from "../../types";
import { LinkPreviewCard } from "./LinkPreviewCard";
import { parseScheduledCallMessage } from "./ScheduleCallModal";
import { ScheduledCallCard } from "./ScheduledCallCard";

interface ChatMessageProps {
  id: string;
  text: string;
  time: string;
  isSent: boolean;
  isGroupChat?: boolean;
  senderName?: string;
  contactInitials?: string;
  contactGradient?: string;
  contactAvatarUrl?: string | null;
  mediaUrl?: string | null;
  mediaType?: "image" | "video" | "audio" | "document" | null;
  mediaDuration?: number | null;
  mediaFileName?: string | null;
  viewOnce?: boolean;
  viewedAt?: string | null;
  status?: "sending" | "sent" | "delivered" | "read";
  isSelectMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  onCopy?: () => void;
  onReply?: () => void;
  onEnterSelectMode?: (reason?: "select" | "delete") => void;
  reactions?: Reaction[];
  onReaction?: (emoji: string) => void;
  currentUserId?: string;
  onViewOnceOpen?: () => void;
  onOpenMedia?: () => void;
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
  quotedReply?: {
    messageId: string;
    senderName: string;
    text: string;
    mediaType?: "image" | "video" | "audio" | "document" | null;
    mediaUrl?: string | null;
  } | null;
  onScrollToMessage?: (messageId: string) => void;
}

const EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

export function ChatMessage({
  id,
  text,
  time,
  isSent,
  isGroupChat = false,
  senderName,
  contactInitials,
  contactGradient,
  contactAvatarUrl,
  mediaUrl,
  mediaType,
  mediaDuration,
  mediaFileName,
  viewOnce,
  viewedAt,
  status,
  isSelectMode = false,
  isSelected = false,
  onToggleSelect,
  onCopy,
  onReply,
  onEnterSelectMode,
  reactions,
  onReaction,
  onViewOnceOpen,
  onOpenMedia,
  currentUserId,
  linkPreview,
  isUploading,
  statusReply,
  quotedReply,
  onScrollToMessage,
}: ChatMessageProps) {
  const [isReactionMenuOpen, setIsReactionMenuOpen] = useState(false);
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const contextMenuPortalRef = useRef<HTMLDivElement>(null);
  const [showFullEmojiPicker, setShowFullEmojiPicker] = useState(false);
  const [_showPanelEmojiPicker, setShowPanelEmojiPicker] = useState(false);
  const [viewOnceConsumed, setViewOnceConsumed] = useState(false);
  const [showViewOnceViewer, setShowViewOnceViewer] = useState(false);
  const chevronRef = useRef<HTMLButtonElement>(null);
  const viewOnceMarkedRef = useRef(false);
  const [showReactionPanel, setShowReactionPanel] = useState(false);
  const [reactionFilterEmoji, setReactionFilterEmoji] = useState<string | null>(
    null,
  );
  const reactionDetailRef = useClickOutside<HTMLDivElement>(() => {
    setShowReactionPanel(false);
    setShowPanelEmojiPicker(false);
  });

  // Group reactions by emoji: { "❤️": [{ userId, displayName }, ...], ... }
  const groupedReactions = useMemo(() => {
    if (!reactions || reactions.length === 0) return {};
    const map: Record<string, { userId: string; displayName: string }[]> = {};
    for (const r of reactions) {
      (map[r.emoji] ??= []).push({
        userId: r.userId,
        displayName: r.displayName,
      });
    }
    return map;
  }, [reactions]);

  // Determine if view-once content should be hidden
  const isViewOnceHidden =
    viewOnce &&
    (isSent || // Sender always sees placeholder
      (!isSent && (viewOnceConsumed || !!viewedAt))); // Receiver: after consuming or server-confirmed

  // Whether bubble is a borderless media bubble (image/video fills it entirely)
  const isMediaBubble =
    !!mediaUrl &&
    (mediaType === "image" || mediaType === "video") &&
    !isViewOnceHidden;

  // Detect scheduled call invite messages
  const scheduledCallPayload = useMemo(
    () => (text ? parseScheduledCallMessage(text) : null),
    [text],
  );

  // ── View-once handlers ──
  // Mark opened on server (fires only once)
  const fireViewOnceOpen = useCallback(() => {
    if (!viewOnceMarkedRef.current) {
      viewOnceMarkedRef.current = true;
      onViewOnceOpen?.();
    }
  }, [onViewOnceOpen]);

  // Image/Video view-once: click opens full-screen viewer
  const handleViewOnceMediaClick = useCallback(() => {
    if (viewOnce && !isSent && !viewedAt && !viewOnceConsumed) {
      setShowViewOnceViewer(true);
    }
  }, [viewOnce, isSent, viewedAt, viewOnceConsumed]);

  // View-once viewer close → consume AND mark opened on server
  const handleViewOnceViewerClose = useCallback(() => {
    setShowViewOnceViewer(false);
    if (viewOnce && !isSent) {
      setViewOnceConsumed(true);
      fireViewOnceOpen();
    }
  }, [viewOnce, isSent, fireViewOnceOpen]);

  // View-once audio finished → consume AND mark opened
  const handleViewOnceAudioFinish = useCallback(() => {
    if (viewOnce && !isSent) {
      setViewOnceConsumed(true);
      fireViewOnceOpen();
    }
  }, [viewOnce, isSent, fireViewOnceOpen]);

  // Normal media click → open gallery viewer
  const handleMediaClick = useCallback(() => {
    onOpenMedia?.();
  }, [onOpenMedia]);

  const viewOnceLabel =
    mediaType === "audio"
      ? "Voice message"
      : mediaType === "video"
        ? "Video"
        : mediaType === "image"
          ? "Photo"
          : mediaType === "document"
            ? "Document"
            : "Message";

  const reactionMenuRef = useClickOutside<HTMLDivElement>(() => {
    setIsReactionMenuOpen(false);
  });
  const contextMenuRef = useClickOutside<HTMLDivElement>(
    () => setIsContextMenuOpen(false),
    contextMenuPortalRef,
  );

  // Compute fixed position for context menu so it's never clipped
  const MENU_WIDTH = 192; // w-48 = 12rem = 192px
  const MENU_HEIGHT_EST = isSent ? 370 : 400; // approximate menu height
  const MENU_MARGIN = 8;

  const computeMenuPosition = useCallback(
    (trigger: HTMLElement) => {
      const rect = trigger.getBoundingClientRect();
      // Use the parent bubble for horizontal alignment
      const bubble = trigger.closest(
        '[class*="group/bubble"]',
      ) as HTMLElement | null;
      const bubbleRect = bubble?.getBoundingClientRect() ?? rect;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // Vertical: anchor at chevron top so it overlaps the bubble (WhatsApp-style)
      let top: number;
      const spaceBelow = vh - rect.top;
      const spaceAbove = rect.bottom;
      if (spaceBelow >= MENU_HEIGHT_EST + MENU_MARGIN) {
        top = rect.top;
      } else if (spaceAbove >= MENU_HEIGHT_EST + MENU_MARGIN) {
        top = rect.bottom - MENU_HEIGHT_EST;
      } else {
        top = Math.max(
          MENU_MARGIN,
          Math.min(vh - MENU_HEIGHT_EST - MENU_MARGIN, rect.top),
        );
      }

      // Horizontal: align to bubble edge
      let left: number;
      if (isSent) {
        left = bubbleRect.right - MENU_WIDTH;
      } else {
        left = bubbleRect.left;
      }
      // Clamp horizontally
      left = Math.max(
        MENU_MARGIN,
        Math.min(vw - MENU_WIDTH - MENU_MARGIN, left),
      );

      setMenuStyle({ top, left });
    },
    [isSent],
  );

  // Close context menu on scroll (the menu is fixed and would float away)
  useEffect(() => {
    if (!isContextMenuOpen) return;
    const handleScroll = () => setIsContextMenuOpen(false);
    window.addEventListener("scroll", handleScroll, true);
    return () => window.removeEventListener("scroll", handleScroll, true);
  }, [isContextMenuOpen]);

  return (
    <div
      className={`flex flex-col mb-4 group relative ${isSelectMode ? "w-full max-w-full cursor-pointer rounded-md p-1 " + (isSelected ? "bg-accent/10" : "") : isSent ? "items-end self-end max-w-[82.5%]" : "items-start max-w-[82.5%]"}`}
      onClick={isSelectMode ? onToggleSelect : undefined}
      data-id={id}
    >
      <div
        className={`relative w-full flex ${isSelectMode ? (isSent ? "flex-row justify-start" : "flex-row") : isSent ? "flex-col items-end" : "items-end mt-1"} ${isSelectMode && !isSent ? "gap-3" : ""}`}
      >
        {/* Checkbox for Select Mode */}
        {isSelectMode && (
          <button
            type="button"
            className={`w-6 h-6 min-w-[24px] rounded-full border-2 flex items-center justify-center shrink-0 self-end mb-1.5 p-0 transition-colors ${isSelected ? "bg-accent border-accent" : "border-text-secondary bg-transparent"} ${isSent ? "mr-3" : ""}`}
            aria-label={isSelected ? "Deselect message" : "Select message"}
          >
            {isSelected && (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-3 h-3 block"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </button>
        )}

        {/* Avatar for received messages — removed */}

        {/* Avatar for received messages in group chats */}
        {isGroupChat && !isSent && !isSelectMode && (
          <div className="w-8 h-8 min-w-[32px] rounded-full shrink-0 mr-2 self-end mb-1 overflow-hidden">
            {contactAvatarUrl ? (
              <img
                src={contactAvatarUrl}
                alt={senderName || ""}
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-[11px] font-semibold text-white"
                style={{
                  background:
                    contactGradient ||
                    "linear-gradient(135deg,#2563EB,#7C3AED)",
                }}
              >
                {contactInitials || "?"}
              </div>
            )}
          </div>
        )}

        <div
          ref={contextMenuRef}
          className={`relative flex flex-col ${isSelectMode && isSent ? "items-end ml-auto" : ""}`}
        >
          {/* Bubble wrapper — relative so smile centers on bubble height only */}
          <div className="relative">
            {/* Message Bubble */}
            <div
              className={`group/bubble relative ${
                isMediaBubble ||
                statusReply ||
                !!quotedReply ||
                !!scheduledCallPayload
                  ? `rounded-2xl overflow-hidden shadow-sm ${isSent ? "rounded-br-sm" : "rounded-bl-sm"} ${(!isMediaBubble && (statusReply || scheduledCallPayload) && !isSent) || (!isMediaBubble && quotedReply && !isSent) ? "border border-border/50" : ""}`
                  : `pr-8 px-4 py-3 text-[14px] leading-relaxed break-words shadow-sm rounded-2xl overflow-hidden ${
                      isSent
                        ? "text-white rounded-br-sm"
                        : "bg-card border border-border/50 text-text-main rounded-bl-sm"
                    }`
              }`}
              style={
                isSent &&
                !isMediaBubble &&
                !statusReply &&
                !quotedReply &&
                !scheduledCallPayload
                  ? { background: "linear-gradient(135deg, #2563EB, #3B82F6)" }
                  : isSent &&
                      (!!quotedReply || !!scheduledCallPayload) &&
                      !isMediaBubble
                    ? {
                        background: "linear-gradient(135deg, #2563EB, #3B82F6)",
                      }
                    : undefined
              }
            >
              {/* Sender name for group received messages */}
              {isGroupChat && !isSent && senderName && (
                <div
                  className={`text-[12px] font-semibold truncate ${
                    isMediaBubble
                      ? "absolute top-0 left-0 right-0 z-10 px-3 pt-2 pb-4 bg-gradient-to-b from-black/50 to-transparent text-white rounded-t-2xl"
                      : statusReply || quotedReply || scheduledCallPayload
                        ? "text-accent px-3 pt-2 pb-0"
                        : "text-accent mb-1"
                  }`}
                >
                  {senderName}
                </div>
              )}
              {/* Media content or view-once placeholder */}
              {isViewOnceHidden ? (
                <div className="flex items-center gap-2 py-1">
                  {isSent && viewedAt ? (
                    <>
                      <CircleDot className="w-5 h-5 opacity-70" />
                      <span className="text-sm opacity-90">Opened</span>
                    </>
                  ) : (
                    <>
                      <Timer className="w-5 h-5 opacity-70" />
                      <span className="text-sm opacity-90">
                        {viewOnceLabel}
                      </span>
                    </>
                  )}
                </div>
              ) : (
                <>
                  {mediaUrl && mediaType === "image" && (
                    <div
                      className="relative cursor-pointer"
                      onClick={
                        viewOnce && !isSent && !viewedAt && !viewOnceConsumed
                          ? handleViewOnceMediaClick
                          : handleMediaClick
                      }
                    >
                      <img
                        src={mediaUrl}
                        alt={mediaFileName || "Shared image"}
                        className={`w-[330px] h-[220px] object-cover${isUploading ? " opacity-60" : ""}`}
                        loading="lazy"
                      />
                      {isUploading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <div className="w-9 h-9 border-[3px] border-white/80 border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                    </div>
                  )}
                  {mediaUrl && mediaType === "video" && (
                    <div
                      className="relative cursor-pointer"
                      onClick={
                        viewOnce && !isSent && !viewedAt && !viewOnceConsumed
                          ? handleViewOnceMediaClick
                          : handleMediaClick
                      }
                    >
                      <video
                        src={mediaUrl}
                        className="w-full max-w-[352px]"
                        preload="metadata"
                      />
                      {/* Play overlay (hidden while uploading) */}
                      {!isUploading && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm">
                            <svg
                              viewBox="0 0 24 24"
                              fill="white"
                              className="w-6 h-6 ml-0.5"
                            >
                              <polygon points="5,3 19,12 5,21" />
                            </svg>
                          </div>
                        </div>
                      )}
                      {isUploading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                          <div className="w-9 h-9 border-[3px] border-white/80 border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                    </div>
                  )}
                  {(mediaUrl || isUploading) && mediaType === "audio" && (
                    <div className="min-w-[308px] w-full relative overflow-hidden">
                      {mediaUrl && (
                        <AudioPlayer
                          src={mediaUrl}
                          duration={mediaDuration ?? undefined}
                          isSent={isSent}
                          contactInitials={contactInitials}
                          contactGradient={contactGradient}
                          contactAvatarUrl={contactAvatarUrl}
                          onFinish={
                            viewOnce && !isSent
                              ? handleViewOnceAudioFinish
                              : undefined
                          }
                        />
                      )}
                      {!isSent && mediaUrl && (
                        <TranscribeButton messageId={id} audioUrl={mediaUrl} />
                      )}
                      {isUploading && !mediaUrl && (
                        <div
                          className={`flex items-center gap-3 px-3 py-3 rounded-xl min-w-[240px] ${
                            isSent ? "bg-blue-700/20" : "bg-input"
                          }`}
                        >
                          <div className="w-8 h-8 border-[3px] border-accent border-t-transparent rounded-full animate-spin shrink-0" />
                          <span
                            className={`text-sm ${isSent ? "text-blue-100" : "text-text-secondary"}`}
                          >
                            Uploading audio…
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  {(mediaUrl || isUploading) && mediaType === "document" && (
                    <div
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl min-w-[242px] max-w-[308px] ${
                        isSent
                          ? "bg-blue-700/30 text-white"
                          : "bg-input text-text-main"
                      }`}
                    >
                      <span className="w-9 h-9 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
                        {isUploading ? (
                          <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <FileText className="w-5 h-5 text-blue-400" />
                        )}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-medium truncate">
                          {mediaFileName || "Document"}
                        </span>
                        <span
                          className={`block text-xs mt-0.5 ${
                            isSent ? "text-blue-200" : "text-text-secondary"
                          }`}
                        >
                          {isUploading ? "Uploading…" : "Open document"}
                        </span>
                      </span>
                      {!isUploading && mediaUrl && (
                        <a
                          href={mediaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Download ${mediaFileName || "document"}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Download
                            aria-hidden="true"
                            className={`w-4 h-4 shrink-0 ${
                              isSent ? "text-blue-200" : "text-text-secondary"
                            }`}
                          />
                        </a>
                      )}
                    </div>
                  )}
                </>
              )}
              {/* Caption below media */}
              {text && !isViewOnceHidden && isMediaBubble && (
                <div
                  className={`px-3 py-2 text-[14px] leading-relaxed ${isSent ? "text-white" : "text-text-main"}`}
                  style={
                    isSent
                      ? {
                          background:
                            "linear-gradient(135deg, #2563EB, #3B82F6)",
                        }
                      : { background: "var(--card)" }
                  }
                >
                  <span>{text}</span>
                </div>
              )}
              {/* Scheduled call invite card */}
              {scheduledCallPayload &&
                !isMediaBubble &&
                !statusReply &&
                !quotedReply && (
                  <ScheduledCallCard
                    payload={scheduledCallPayload}
                    isSent={isSent}
                  />
                )}
              {/* Inline text for non-media bubbles */}
              {text &&
                !scheduledCallPayload &&
                !isViewOnceHidden &&
                !isMediaBubble &&
                !statusReply &&
                !quotedReply && (
                  <>
                    <span>{text}</span>
                  </>
                )}

              {/* Quoted reply — compact preview bar + text */}
              {quotedReply && !isMediaBubble && (
                <div className="flex flex-col min-w-[220px] max-w-[308px]">
                  {/* Quote bar */}
                  <div
                    role={onScrollToMessage ? "button" : undefined}
                    tabIndex={onScrollToMessage ? 0 : undefined}
                    aria-label={
                      onScrollToMessage ? "Jump to original message" : undefined
                    }
                    onClick={
                      onScrollToMessage
                        ? (e) => {
                            e.stopPropagation();
                            onScrollToMessage(quotedReply.messageId);
                          }
                        : undefined
                    }
                    onKeyDown={
                      onScrollToMessage
                        ? (e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.stopPropagation();
                              onScrollToMessage(quotedReply.messageId);
                            }
                          }
                        : undefined
                    }
                    className={`flex gap-2 mx-2 mt-2 mb-1 rounded-lg overflow-hidden border-l-4 ${
                      isSent
                        ? "border-white/60 bg-white/15"
                        : "border-accent bg-input/60"
                    }${onScrollToMessage ? " cursor-pointer hover:brightness-110 transition-all" : ""}`}
                  >
                    {quotedReply.mediaType === "image" &&
                      quotedReply.mediaUrl && (
                        <img
                          src={quotedReply.mediaUrl}
                          alt=""
                          className="w-12 h-12 object-cover shrink-0"
                        />
                      )}
                    <div className="flex flex-col justify-center px-2 py-1.5 min-w-0">
                      <span
                        className={`text-[11px] font-semibold truncate ${
                          isSent ? "text-white/90" : "text-accent"
                        }`}
                      >
                        {quotedReply.senderName}
                      </span>
                      <span
                        className={`text-[12px] truncate ${
                          isSent ? "text-white/70" : "text-text-secondary"
                        }`}
                      >
                        {quotedReply.mediaType === "image"
                          ? "📷 Photo"
                          : quotedReply.mediaType === "video"
                            ? "🎬 Video"
                            : quotedReply.mediaType === "audio"
                              ? "🎤 Voice message"
                              : quotedReply.mediaType === "document"
                                ? "📄 Document"
                                : quotedReply.text}
                      </span>
                    </div>
                  </div>
                  {/* Reply text */}
                  {text && (
                    <div
                      className={`pl-4 pr-10 py-2 pb-3 text-[14px] leading-relaxed break-words ${isSent ? "text-white" : "text-text-main"}`}
                    >
                      <span>{text}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Status reply — media-card style */}
              {statusReply && (
                <div className="flex flex-col min-w-[242px] max-w-[308px]">
                  {/* Status card */}
                  <div className="relative">
                    <p className="absolute top-3 left-4 right-4 z-10 text-[12px] font-semibold drop-shadow text-white/90 truncate">
                      {statusReply.senderName}&apos;s status
                    </p>
                    {statusReply.mediaType === "text" ? (
                      <div
                        className="w-full h-[198px] flex items-center justify-center text-white text-[17px] font-medium text-center px-8"
                        style={{
                          background:
                            statusReply.textBgGradient ||
                            "linear-gradient(135deg,#6366f1,#a855f7)",
                        }}
                      >
                        <span className="line-clamp-4">{statusReply.text}</span>
                      </div>
                    ) : statusReply.mediaUrl ? (
                      <div className="w-full h-[198px] overflow-hidden bg-black/10">
                        {statusReply.mediaType === "image" ? (
                          <img
                            src={statusReply.mediaUrl}
                            alt="status"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <video
                            src={statusReply.mediaUrl}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                    ) : null}
                    {statusReply.caption && (
                      <p className="absolute bottom-3 left-4 right-4 text-[11px] text-white/80 truncate drop-shadow">
                        {statusReply.caption}
                      </p>
                    )}
                  </div>
                  {/* Reply text */}
                  {text && (
                    <div
                      className={`pl-4 pr-10 py-3 text-[14px] leading-relaxed ${isSent ? "text-white" : "text-text-main"}`}
                      style={
                        isSent
                          ? {
                              background:
                                "linear-gradient(135deg, #2563EB, #3B82F6)",
                            }
                          : { background: "var(--card)" }
                      }
                    >
                      <span>{text}</span>
                    </div>
                  )}
                </div>
              )}
              {/* Link preview card — only for non-media bubbles */}
              {linkPreview && !isMediaBubble && (
                <div className="mt-1.5">
                  <LinkPreviewCard preview={linkPreview} isSent={isSent} />
                </div>
              )}
              {/* Chevron — overlaid on media or at right edge for text */}
              {!isSelectMode &&
                (isMediaBubble ? (
                  <button
                    ref={chevronRef}
                    type="button"
                    aria-label="Message options"
                    className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover/bubble:opacity-100 transition-opacity bg-black/40 text-white/90 hover:text-white z-10"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isContextMenuOpen && chevronRef.current) {
                        computeMenuPosition(chevronRef.current);
                      }
                      setIsContextMenuOpen(!isContextMenuOpen);
                      setIsReactionMenuOpen(false);
                    }}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    ref={chevronRef}
                    type="button"
                    aria-label="Message options"
                    className={`absolute inset-y-0 right-0 w-8 flex items-center justify-center opacity-0 group-hover/bubble:opacity-100 transition-opacity backdrop-blur-sm ${
                      isSent
                        ? "bg-gradient-to-l from-blue-600/60 to-transparent text-white/90 hover:text-white"
                        : "bg-gradient-to-l from-card/80 to-transparent text-text-secondary hover:text-text-main"
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isContextMenuOpen && chevronRef.current) {
                        computeMenuPosition(chevronRef.current);
                      }
                      setIsContextMenuOpen(!isContextMenuOpen);
                      setIsReactionMenuOpen(false);
                    }}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                ))}
            </div>

            {/* Smile — outside bubble, vertically centered on bubble height */}
            {!isSelectMode && (
              <div
                className={`absolute inset-y-0 ${isSent ? "right-full w-10" : "left-full w-10"} hidden group-hover:flex items-center justify-center z-10`}
              >
                <div className="relative" ref={reactionMenuRef}>
                  <button
                    type="button"
                    aria-label="React to message"
                    className="w-7 h-7 rounded-full flex items-center justify-center text-text-secondary hover:text-text-main transition-colors"
                    onClick={() => {
                      setIsReactionMenuOpen(!isReactionMenuOpen);
                      setIsContextMenuOpen(false);
                    }}
                  >
                    <Smile className="w-5 h-5" />
                  </button>
                  {/* Reaction Popup */}
                  {isReactionMenuOpen && (
                    <div
                      className={`absolute top-full lg:bottom-full lg:top-auto mt-2 lg:mt-0 lg:mb-2 ${isSent ? "right-0" : "left-0"} p-2 bg-card border border-border/80 shadow-xl rounded-full flex items-center gap-1 z-50 transition-all duration-200 ease-out animate-in fade-in zoom-in-95`}
                    >
                      {EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          aria-label={`React with ${emoji}`}
                          className="w-8 h-8 rounded-full hover:bg-input flex items-center justify-center text-xl transition-transform hover:scale-125"
                          onClick={() => {
                            onReaction?.(emoji);
                            setIsReactionMenuOpen(false);
                          }}
                        >
                          {emoji}
                        </button>
                      ))}
                      <button
                        type="button"
                        aria-label="More reactions"
                        className="w-8 h-8 rounded-full hover:bg-input flex items-center justify-center text-text-secondary transition-colors"
                        onClick={() => {
                          setIsReactionMenuOpen(false);
                          setShowFullEmojiPicker(true);
                        }}
                      >
                        <span
                          className="text-[18px] leading-none"
                          aria-hidden="true"
                        >
                          +
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Context Menu — rendered via portal with fixed positioning */}
            {!isSelectMode &&
              isContextMenuOpen &&
              createPortal(
                <div
                  ref={contextMenuPortalRef}
                  className="fixed w-48 bg-card border border-border/80 rounded-xl shadow-xl py-2 z-[9999] animate-in fade-in zoom-in-95"
                  style={menuStyle}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    className="w-full flex items-center gap-3 px-4 py-2 text-[13px] text-text-main hover:bg-input/80 transition-colors"
                  >
                    <Info
                      className="w-4 h-4 text-text-secondary"
                      aria-hidden="true"
                    />{" "}
                    Message info
                  </button>
                  <button
                    type="button"
                    className="w-full flex items-center gap-3 px-4 py-2 text-[13px] text-text-main hover:bg-input/80 transition-colors"
                    onClick={() => {
                      onReply?.();
                      setIsContextMenuOpen(false);
                    }}
                  >
                    <Reply
                      className="w-4 h-4 text-text-secondary"
                      aria-hidden="true"
                    />{" "}
                    Reply
                  </button>
                  {text && (
                    <button
                      type="button"
                      className="w-full flex items-center gap-3 px-4 py-2 text-[13px] text-text-main hover:bg-input/80 transition-colors"
                      onClick={() => {
                        onCopy?.();
                        setIsContextMenuOpen(false);
                      }}
                    >
                      <Copy
                        className="w-4 h-4 text-text-secondary"
                        aria-hidden="true"
                      />{" "}
                      Copy
                    </button>
                  )}
                  <button
                    type="button"
                    className="w-full flex items-center gap-3 px-4 py-2 text-[13px] text-text-main hover:bg-input/80 transition-colors"
                  >
                    <Forward
                      className="w-4 h-4 text-text-secondary"
                      aria-hidden="true"
                    />{" "}
                    Forward
                  </button>
                  <button
                    type="button"
                    className="w-full flex items-center gap-3 px-4 py-2 text-[13px] text-text-main hover:bg-input/80 transition-colors"
                  >
                    <Pin
                      className="w-4 h-4 text-text-secondary"
                      aria-hidden="true"
                    />{" "}
                    Pin
                  </button>
                  <button
                    type="button"
                    className="w-full flex items-center gap-3 px-4 py-2 text-[13px] text-text-main hover:bg-input/80 transition-colors"
                  >
                    <Star
                      className="w-4 h-4 text-text-secondary"
                      aria-hidden="true"
                    />{" "}
                    Star
                  </button>
                  <button
                    type="button"
                    className="w-full flex items-center gap-3 px-4 py-2 text-[13px] text-text-main hover:bg-input/80 transition-colors"
                    onClick={() => {
                      onEnterSelectMode?.();
                      setIsContextMenuOpen(false);
                    }}
                  >
                    <CheckSquare
                      className="w-4 h-4 text-text-secondary"
                      aria-hidden="true"
                    />{" "}
                    Select
                  </button>
                  {!isSent && (
                    <button
                      type="button"
                      className="w-full flex items-center gap-3 px-4 py-2 text-[13px] text-text-main hover:bg-input/80 transition-colors"
                    >
                      <AlertTriangle
                        className="w-4 h-4 text-text-secondary"
                        aria-hidden="true"
                      />{" "}
                      Report
                    </button>
                  )}
                  <div className="w-full h-px bg-border/50 my-1"></div>
                  <button
                    type="button"
                    className="w-full flex items-center gap-3 px-4 py-2 text-[13px] text-danger hover:bg-danger/10 transition-colors font-medium"
                    onClick={() => {
                      onEnterSelectMode?.("delete");
                      setIsContextMenuOpen(false);
                    }}
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" /> Delete
                  </button>
                </div>,
                document.body,
              )}
          </div>

          {/* Reaction strip — overlaps bottom of bubble */}
          {Object.keys(groupedReactions).length > 0 && (
            <div
              className={`relative flex items-center gap-1 -mt-2.5 z-10 ${isSent ? "justify-end mr-1" : "ml-1"}`}
            >
              {Object.entries(groupedReactions).map(([emoji, users]) => (
                <button
                  key={emoji}
                  type="button"
                  aria-label={`${emoji} reaction${users.length > 1 ? `, ${users.length} people` : ""}`}
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-card border border-border/50 text-[12px] hover:bg-input/80 transition-colors shadow-sm"
                  onClick={() => {
                    setReactionFilterEmoji(null);
                    setShowReactionPanel(true);
                  }}
                >
                  {emoji}
                  {users.length > 1 && (
                    <span
                      className="text-text-secondary text-[10px]"
                      aria-hidden="true"
                    >
                      {users.length}
                    </span>
                  )}
                </button>
              ))}

              {/* WhatsApp-style reaction detail panel */}
              {showReactionPanel && (
                <div
                  ref={reactionDetailRef}
                  className={`absolute ${isSent ? "right-0" : "left-0"} bottom-full mb-2 w-[260px] bg-card border border-border/80 shadow-2xl rounded-xl z-50 animate-in fade-in zoom-in-95 duration-150 overflow-hidden`}
                >
                  {/* Header */}
                  <div className="px-4 pt-3 pb-2 text-[13px] font-semibold text-text-main">
                    {reactions!.length}{" "}
                    {reactions!.length === 1 ? "reaction" : "reactions"}
                  </div>

                  {/* Emoji filter tabs */}
                  <div className="flex items-center gap-1 px-3 pb-2 border-b border-border/50">
                    <button
                      type="button"
                      aria-label="Add reaction"
                      className={`px-2 py-1 rounded-full transition-colors text-text-secondary hover:text-text-main hover:bg-input/60`}
                      onClick={() => {
                        setShowReactionPanel(false);
                        setShowPanelEmojiPicker(false);
                        setShowFullEmojiPicker(true);
                      }}
                    >
                      <SmilePlus className="w-[18px] h-[18px]" />
                    </button>
                    {Object.entries(groupedReactions).map(([emoji, users]) => (
                      <button
                        key={emoji}
                        type="button"
                        aria-label={`Filter by ${emoji}, ${users.length} ${users.length === 1 ? "person" : "people"}`}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[13px] transition-colors ${
                          reactionFilterEmoji === emoji
                            ? "bg-primary/20 text-primary"
                            : "text-text-secondary hover:bg-input/60"
                        }`}
                        onClick={() => setReactionFilterEmoji(emoji)}
                      >
                        {emoji}
                        <span className="text-[11px]" aria-hidden="true">
                          {users.length}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* User list */}
                  <div className="max-h-[200px] overflow-y-auto py-1">
                    {(() => {
                      const filtered = reactionFilterEmoji
                        ? (groupedReactions[reactionFilterEmoji] || []).map(
                            (u) => ({ ...u, emoji: reactionFilterEmoji }),
                          )
                        : reactions!.map((r) => ({
                            userId: r.userId,
                            displayName: r.displayName,
                            emoji: r.emoji,
                          }));
                      return filtered.map((u) => (
                        <div
                          key={`${u.userId}-${u.emoji}`}
                          className={`flex items-center gap-3 px-4 py-2 ${
                            u.userId === currentUserId
                              ? "cursor-pointer hover:bg-input/40"
                              : ""
                          } transition-colors`}
                          onClick={() => {
                            if (u.userId === currentUserId) {
                              onReaction?.(u.emoji);
                              // Close panel if no reactions left after removal
                              const remaining = reactions!.length - 1;
                              if (remaining <= 0) setShowReactionPanel(false);
                            }
                          }}
                        >
                          {/* Avatar */}
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold text-white flex-shrink-0"
                            style={{
                              background:
                                "linear-gradient(135deg, var(--color-primary), var(--color-accent))",
                            }}
                          >
                            {u.displayName
                              .split(" ")
                              .map((w) => w[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                          {/* Name + subtitle */}
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-medium text-text-main truncate">
                              {u.userId === currentUserId
                                ? "You"
                                : u.displayName}
                            </div>
                            {u.userId === currentUserId && (
                              <div className="text-[11px] text-text-secondary">
                                Tap to remove
                              </div>
                            )}
                          </div>
                          {/* Emoji on right */}
                          <span className="text-xl flex-shrink-0">
                            {u.emoji}
                          </span>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Standalone full emoji picker — rendered at message level */}
          {showFullEmojiPicker && (
            <div
              className={`relative z-[70] ${isSent ? "flex justify-end mr-1" : "ml-1"}`}
            >
              <EmojiPicker
                position="top"
                align={isSent ? "right" : "left"}
                onSelect={(emoji) => {
                  onReaction?.(emoji);
                  setShowFullEmojiPicker(false);
                }}
                onClose={() => setShowFullEmojiPicker(false)}
              />
            </div>
          )}

          {/* Time and Status */}
          <div
            className={`text-[11px] text-text-secondary mt-1 flex items-center gap-1 ${isSent ? "justify-end mr-1" : "ml-1"}`}
          >
            {time}
            {isSent && status === "sending" && (
              <span
                className="text-text-secondary flex items-center"
                aria-label="Sending"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-3.5 h-3.5 animate-spin"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    strokeDasharray="31.4"
                    strokeDashoffset="10"
                  />
                </svg>
              </span>
            )}
            {isSent && status === "sent" && (
              <span
                className="text-text-secondary flex items-center"
                aria-label="Sent"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-3.5 h-3.5"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
            )}
            {isSent && status === "delivered" && (
              <span
                className="text-text-secondary flex items-center"
                aria-label="Delivered"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-3.5 h-3.5"
                >
                  <polyline points="18 7 9.5 17 5 12" />
                  <polyline points="23 7 14.5 17 12 14" />
                </svg>
              </span>
            )}
            {isSent && status === "read" && (
              <span className="text-accent flex items-center" aria-label="Read">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-3.5 h-3.5"
                >
                  <polyline points="18 7 9.5 17 5 12" />
                  <polyline points="23 7 14.5 17 12 14" />
                </svg>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* View-once full-screen viewer (image or video) */}
      {showViewOnceViewer && mediaUrl && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center"
          onClick={handleViewOnceViewerClose}
        >
          {mediaType === "image" && (
            <img
              src={mediaUrl}
              alt={mediaFileName || "View-once media"}
              className="max-w-[90vw] max-h-[80vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          )}
          {mediaType === "video" && (
            <video
              src={mediaUrl}
              controls
              autoPlay
              className="max-w-[90vw] max-h-[80vh] rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          )}
          <button
            type="button"
            aria-label="Close viewer"
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            onClick={handleViewOnceViewerClose}
          >
            <X className="w-6 h-6" aria-hidden="true" />
          </button>
          <p className="text-white/50 text-xs mt-4">
            View once — closes after viewing
          </p>
        </div>
      )}
    </div>
  );
}
