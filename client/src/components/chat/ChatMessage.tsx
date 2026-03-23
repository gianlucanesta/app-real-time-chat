import {
  Smile,
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
} from "lucide-react";
import { useState, useRef, useCallback, useMemo } from "react";
import { useClickOutside } from "../../hooks/useClickOutside";
import { AudioPlayer } from "./AudioPlayer";
import { EmojiPicker } from "./EmojiPicker";
import type { Reaction } from "../../contexts/ChatContext";

interface ChatMessageProps {
  id: string;
  text: string;
  time: string;
  isSent: boolean;
  contactInitials?: string;
  contactGradient?: string;
  mediaUrl?: string | null;
  mediaType?: "image" | "video" | "audio" | null;
  mediaDuration?: number | null;
  viewOnce?: boolean;
  viewedAt?: string | null;
  status?: "sending" | "sent" | "delivered" | "read";
  isSelectMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  onCopy?: () => void;
  onEnterSelectMode?: (reason?: "select" | "delete") => void;
  reactions?: Reaction[];
  onReaction?: (emoji: string) => void;
  currentUserId?: string;
  onViewOnceOpen?: () => void;
  onOpenMedia?: () => void;
}

const EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

export function ChatMessage({
  id,
  text,
  time,
  isSent,
  contactInitials,
  contactGradient,
  mediaUrl,
  mediaType,
  mediaDuration,
  viewOnce,
  viewedAt,
  status,
  isSelectMode = false,
  isSelected = false,
  onToggleSelect,
  onCopy,
  onEnterSelectMode,
  reactions,
  onReaction,
  onViewOnceOpen,
  onOpenMedia,
  currentUserId,
}: ChatMessageProps) {
  const [isReactionMenuOpen, setIsReactionMenuOpen] = useState(false);
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
  const [menuDirection, setMenuDirection] = useState<"down" | "up">("down");
  const [viewOnceConsumed, setViewOnceConsumed] = useState(false);
  const [showViewOnceViewer, setShowViewOnceViewer] = useState(false);
  const chevronRef = useRef<HTMLButtonElement>(null);
  const viewOnceMarkedRef = useRef(false);
  const [showReactionPanel, setShowReactionPanel] = useState(false);
  const [reactionFilterEmoji, setReactionFilterEmoji] = useState<string | null>(
    null,
  );
  const reactionDetailRef = useRef<HTMLDivElement>(null);
  useClickOutside(reactionDetailRef, () => setShowReactionPanel(false));

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
          : "Message";

  const reactionMenuRef = useClickOutside<HTMLDivElement>(() =>
    setIsReactionMenuOpen(false),
  );
  const contextMenuRef = useClickOutside<HTMLDivElement>(() =>
    setIsContextMenuOpen(false),
  );

  return (
    <div
      className={`flex flex-col mb-4 group relative ${isSelectMode ? "w-full max-w-full cursor-pointer rounded-md p-1 " + (isSelected ? "bg-accent/10" : "") : isSent ? "items-end self-end max-w-[75%]" : "items-start max-w-[75%]"}`}
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

        <div
          ref={contextMenuRef}
          className={`relative flex flex-col ${isSelectMode && isSent ? "items-end ml-auto" : ""}`}
        >
          {/* Bubble wrapper — relative so smile centers on bubble height only */}
          <div className="relative">
            {/* Message Bubble */}
            <div
              className={`group/bubble relative ${
                isMediaBubble
                  ? `rounded-2xl overflow-hidden shadow-sm ${isSent ? "rounded-br-sm" : "rounded-bl-sm"}`
                  : `pr-8 px-4 py-3 text-[14px] leading-relaxed break-words shadow-sm rounded-2xl overflow-hidden ${
                      isSent
                        ? "text-white rounded-br-sm"
                        : "bg-card border border-border/50 text-text-main rounded-bl-sm"
                    }`
              }`}
              style={
                isSent && !isMediaBubble
                  ? { background: "linear-gradient(135deg, #2563EB, #3B82F6)" }
                  : undefined
              }
            >
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
                      className="cursor-pointer"
                      onClick={
                        viewOnce && !isSent && !viewedAt && !viewOnceConsumed
                          ? handleViewOnceMediaClick
                          : handleMediaClick
                      }
                    >
                      <img
                        src={mediaUrl}
                        alt=""
                        className="w-[300px] h-[200px] object-cover"
                        loading="lazy"
                      />
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
                        className="w-full max-w-[320px]"
                        preload="metadata"
                      />
                      {/* Play overlay */}
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
                    </div>
                  )}
                  {mediaUrl && mediaType === "audio" && (
                    <div className="min-w-[280px] w-full">
                      <AudioPlayer
                        src={mediaUrl}
                        duration={mediaDuration ?? undefined}
                        isSent={isSent}
                        contactInitials={contactInitials}
                        contactGradient={contactGradient}
                        onFinish={
                          viewOnce && !isSent
                            ? handleViewOnceAudioFinish
                            : undefined
                        }
                      />
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
              {/* Inline text for non-media bubbles */}
              {text && !isViewOnceHidden && !isMediaBubble && (
                <span>{text}</span>
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
                        const rect = chevronRef.current.getBoundingClientRect();
                        const spaceBelow = window.innerHeight - rect.bottom;
                        setMenuDirection(spaceBelow > 320 ? "down" : "up");
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
                        const rect = chevronRef.current.getBoundingClientRect();
                        const spaceBelow = window.innerHeight - rect.bottom;
                        setMenuDirection(spaceBelow > 320 ? "down" : "up");
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
                          className="w-8 h-8 rounded-full hover:bg-input flex items-center justify-center text-xl transition-transform hover:scale-125"
                          onClick={() => {
                            onReaction?.(emoji);
                            setIsReactionMenuOpen(false);
                          }}
                        >
                          {emoji}
                        </button>
                      ))}
                      <div className="relative">
                        <button
                          className="w-8 h-8 rounded-full hover:bg-input flex items-center justify-center text-text-secondary transition-colors"
                          onClick={() =>
                            setShowFullEmojiPicker(!showFullEmojiPicker)
                          }
                        >
                          <span className="text-[18px] leading-none">+</span>
                        </button>
                        {showFullEmojiPicker && (
                          <EmojiPicker
                            position="bottom"
                            align={isSent ? "right" : "left"}
                            onSelect={(emoji) => {
                              onReaction?.(emoji);
                              setShowFullEmojiPicker(false);
                              setIsReactionMenuOpen(false);
                            }}
                            onClose={() => setShowFullEmojiPicker(false)}
                          />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Context Menu — positioned relative to bubble wrapper */}
            {!isSelectMode && isContextMenuOpen && (
              <div
                className={`absolute ${
                  menuDirection === "down"
                    ? "top-full mt-1"
                    : "bottom-full mb-1"
                } w-48 bg-card border border-border/80 rounded-xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 ${
                  isSent ? "right-0" : "left-0"
                }`}
              >
                <button className="w-full flex items-center gap-3 px-4 py-2 text-[13px] text-text-main hover:bg-input/80 transition-colors">
                  <Info className="w-4 h-4 text-text-secondary" /> Message info
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-2 text-[13px] text-text-main hover:bg-input/80 transition-colors">
                  <Reply className="w-4 h-4 text-text-secondary" /> Reply
                </button>
                <button
                  className="w-full flex items-center gap-3 px-4 py-2 text-[13px] text-text-main hover:bg-input/80 transition-colors"
                  onClick={() => {
                    onCopy?.();
                    setIsContextMenuOpen(false);
                  }}
                >
                  <Copy className="w-4 h-4 text-text-secondary" /> Copy
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-2 text-[13px] text-text-main hover:bg-input/80 transition-colors">
                  <Forward className="w-4 h-4 text-text-secondary" /> Forward
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-2 text-[13px] text-text-main hover:bg-input/80 transition-colors">
                  <Pin className="w-4 h-4 text-text-secondary" /> Pin
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-2 text-[13px] text-text-main hover:bg-input/80 transition-colors">
                  <Star className="w-4 h-4 text-text-secondary" /> Star
                </button>
                <button
                  className="w-full flex items-center gap-3 px-4 py-2 text-[13px] text-text-main hover:bg-input/80 transition-colors"
                  onClick={() => {
                    onEnterSelectMode?.();
                    setIsContextMenuOpen(false);
                  }}
                >
                  <CheckSquare className="w-4 h-4 text-text-secondary" /> Select
                </button>
                {!isSent && (
                  <button className="w-full flex items-center gap-3 px-4 py-2 text-[13px] text-text-main hover:bg-input/80 transition-colors">
                    <AlertTriangle className="w-4 h-4 text-text-secondary" />{" "}
                    Report
                  </button>
                )}
                <div className="w-full h-px bg-border/50 my-1"></div>
                <button
                  className="w-full flex items-center gap-3 px-4 py-2 text-[13px] text-danger hover:bg-danger/10 transition-colors font-medium"
                  onClick={() => {
                    onEnterSelectMode?.("delete");
                    setIsContextMenuOpen(false);
                  }}
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              </div>
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
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-card border border-border/50 text-[12px] hover:bg-input/80 transition-colors shadow-sm"
                  onClick={() => {
                    setReactionFilterEmoji(null);
                    setShowReactionPanel(true);
                  }}
                >
                  {emoji}
                  {users.length > 1 && (
                    <span className="text-text-secondary text-[10px]">
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
                    {reactions!.length === 1 ? "reazione" : "reazioni"}
                  </div>

                  {/* Emoji filter tabs */}
                  <div className="flex items-center gap-1 px-3 pb-2 border-b border-border/50">
                    <div className="relative">
                      <button
                        className={`px-2 py-1 rounded-full text-[16px] transition-colors text-text-secondary hover:bg-input/60`}
                        onClick={() =>
                          setShowPanelEmojiPicker(!showPanelEmojiPicker)
                        }
                        title="Aggiungi reazione"
                      >
                        😊
                      </button>
                      {showPanelEmojiPicker && (
                        <EmojiPicker
                          position="bottom"
                          align={isSent ? "right" : "left"}
                          onSelect={(emoji) => {
                            onReaction?.(emoji);
                            setShowPanelEmojiPicker(false);
                          }}
                          onClose={() => setShowPanelEmojiPicker(false)}
                        />
                      )}
                    </div>
                    {Object.entries(groupedReactions).map(([emoji, users]) => (
                      <button
                        key={emoji}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[13px] transition-colors ${
                          reactionFilterEmoji === emoji
                            ? "bg-primary/20 text-primary"
                            : "text-text-secondary hover:bg-input/60"
                        }`}
                        onClick={() => setReactionFilterEmoji(emoji)}
                      >
                        {emoji}
                        <span className="text-[11px]">{users.length}</span>
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
                                ? "Tu"
                                : u.displayName}
                            </div>
                            {u.userId === currentUserId && (
                              <div className="text-[11px] text-text-secondary">
                                Clicca per rimuovere
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
              alt=""
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
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            onClick={handleViewOnceViewerClose}
          >
            <X className="w-6 h-6" />
          </button>
          <p className="text-white/50 text-xs mt-4">
            View once — closes after viewing
          </p>
        </div>
      )}
    </div>
  );
}
