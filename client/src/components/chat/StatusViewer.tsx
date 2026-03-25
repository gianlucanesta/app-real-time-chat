import { useState, useEffect, useCallback, useRef } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Volume2,
  VolumeX,
  MoreVertical,
  Smile,
  Send,
  Reply,
  Flag,
  BellOff,
} from "lucide-react";
import type { ContactStatus, StatusItem } from "../../types";
import { EmojiPicker } from "./EmojiPicker";
import { useClickOutside } from "../../hooks/useClickOutside";

/* ── Constants ───────────────────────────────────────────── */
const STORY_DURATION = 6000; // 6s per status item

/* ── Component ───────────────────────────────────────────── */

interface StatusViewerProps {
  contactStatus: ContactStatus | null;
  /** For viewing my own status (avatar / name come from user) */
  isMyStatus?: boolean;
  userName?: string;
  userAvatar?: string | null;
  userGradient?: string;
  userInitials?: string;
  onClose: () => void;
  onMarkViewed?: (itemId: string) => void;
  onReply?: (contactId: string, text: string, statusItemId: string) => void;
  onMuteNotifications?: (contactId: string) => void;
  onReport?: (contactId: string) => void;
}

export function StatusViewer({
  contactStatus,
  isMyStatus,
  userName,
  userAvatar,
  userGradient,
  userInitials,
  onClose,
  onMarkViewed,
  onReply,
  onMuteNotifications,
  onReport,
}: StatusViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [replyText, setReplyText] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const replyInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(Date.now());
  const elapsedRef = useRef(0);

  const menuRef = useClickOutside<HTMLDivElement>(() => setShowMenu(false));

  const items = contactStatus?.items ?? [];
  const totalItems = items.length;
  const currentItem: StatusItem | undefined = items[currentIndex];

  const displayName = isMyStatus
    ? (userName ?? "My status")
    : (contactStatus?.contactName ?? "");
  const displayAvatar = isMyStatus ? userAvatar : contactStatus?.contactAvatar;
  const displayGradient = isMyStatus
    ? userGradient
    : contactStatus?.contactGradient;
  const displayInitials = isMyStatus
    ? userInitials
    : contactStatus?.contactInitials;

  /* ── Progress timer ────────────────────────────────────── */
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const goNext = useCallback(() => {
    if (currentIndex < totalItems - 1) {
      setCurrentIndex((i) => i + 1);
      setProgress(0);
      elapsedRef.current = 0;
    } else {
      onClose();
    }
  }, [currentIndex, totalItems, onClose]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
      setProgress(0);
      elapsedRef.current = 0;
    }
  }, [currentIndex]);

  // Start/resume progress timer
  useEffect(() => {
    if (!currentItem || isPaused) return;

    startTimeRef.current = Date.now();
    const tick = 50;

    timerRef.current = setInterval(() => {
      const now = Date.now();
      elapsedRef.current += now - startTimeRef.current;
      startTimeRef.current = now;

      const pct = Math.min((elapsedRef.current / STORY_DURATION) * 100, 100);
      setProgress(pct);

      if (pct >= 100) {
        clearTimer();
        goNext();
      }
    }, tick);

    return clearTimer;
  }, [currentItem, isPaused, currentIndex, clearTimer, goNext]);

  // Reset when index changes
  useEffect(() => {
    elapsedRef.current = 0;
    setProgress(0);
    if (currentItem && !currentItem.viewed) {
      onMarkViewed?.(currentItem.id);
    }
  }, [currentIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pause on hold
  const handlePauseToggle = useCallback(() => {
    setIsPaused((p) => !p);
  }, []);

  // Send reply
  const handleSendReply = useCallback(() => {
    const text = replyText.trim();
    if (!text || !currentItem) return;
    const contactId = contactStatus?.contactId ?? "";
    onReply?.(contactId, text, currentItem.id);
    setReplyText("");
  }, [replyText, currentItem, contactStatus, onReply]);

  // Emoji selection
  const handleEmojiSelect = useCallback((emoji: string) => {
    setReplyText((prev) => prev + emoji);
    setShowEmojiPicker(false);
    replyInputRef.current?.focus();
  }, []);

  // Key navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "Escape") onClose();
      else if (e.key === " ") {
        e.preventDefault();
        handlePauseToggle();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [goNext, goPrev, onClose, handlePauseToggle]);

  if (!contactStatus || totalItems === 0) return null;

  const timestamp = currentItem
    ? new Date(currentItem.timestamp).toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center">
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors z-20"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Left arrow */}
      {currentIndex > 0 && (
        <button
          onClick={goPrev}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors z-20"
        >
          <ChevronLeft className="w-7 h-7" />
        </button>
      )}

      {/* Right arrow */}
      {currentIndex < totalItems - 1 && (
        <button
          onClick={goNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors z-20"
        >
          <ChevronRight className="w-7 h-7" />
        </button>
      )}

      {/* Content area */}
      <div className="relative w-full max-w-lg h-full max-h-[90vh] flex flex-col">
        {/* Progress bars */}
        <div className="flex gap-1 px-4 pt-3 pb-2 z-10">
          {items.map((_, idx) => (
            <div
              key={idx}
              className="flex-1 h-[3px] rounded-full bg-white/25 overflow-hidden"
            >
              <div
                className="h-full bg-white rounded-full transition-[width] duration-75 ease-linear"
                style={{
                  width:
                    idx < currentIndex
                      ? "100%"
                      : idx === currentIndex
                        ? `${progress}%`
                        : "0%",
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-2 z-10">
          {/* Avatar */}
          {displayAvatar ? (
            <img
              src={displayAvatar}
              alt={displayName}
              className="w-9 h-9 rounded-full object-cover"
            />
          ) : (
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold"
              style={{
                background:
                  displayGradient ||
                  "linear-gradient(135deg, #6366f1, #a855f7)",
              }}
            >
              {displayInitials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold text-white truncate">
              {displayName}
            </p>
            <p className="text-[11px] text-white/60">{timestamp}</p>
          </div>
          {/* Controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={handlePauseToggle}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-colors"
            >
              {isPaused ? (
                <Play className="w-4 h-4" />
              ) : (
                <Pause className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-colors"
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => {
                  setShowMenu((v) => !v);
                  setIsPaused(true);
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-colors"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              {showMenu && (
                <div className="absolute right-0 top-full mt-1 w-52 bg-panel border border-border rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      const id = contactStatus?.contactId ?? "";
                      onReport?.(id);
                    }}
                    className="flex items-center gap-3 w-full px-4 py-3 text-[14px] text-text-main hover:bg-input/50 transition-colors"
                  >
                    <Flag className="w-4 h-4 text-text-secondary" />
                    Report
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      const id = contactStatus?.contactId ?? "";
                      onMuteNotifications?.(id);
                    }}
                    className="flex items-center gap-3 w-full px-4 py-3 text-[14px] text-text-main hover:bg-input/50 transition-colors"
                  >
                    <BellOff className="w-4 h-4 text-text-secondary" />
                    Mute notifications
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Media / Content */}
        <div
          className="flex-1 flex items-center justify-center overflow-hidden rounded-lg mx-4 my-2"
          onClick={handlePauseToggle}
        >
          {currentItem?.mediaType === "text" ? (
            <div
              className="w-full h-full flex items-center justify-center p-8 rounded-lg"
              style={{
                background:
                  currentItem.textBgGradient ||
                  "linear-gradient(135deg, #2563eb, #7c3aed)",
              }}
            >
              <p className="text-white text-xl md:text-2xl font-semibold text-center leading-relaxed break-words">
                {currentItem.text}
              </p>
            </div>
          ) : currentItem?.mediaType === "video" ? (
            <video
              src={currentItem.mediaUrl}
              className="max-w-full max-h-full object-contain rounded-lg"
              autoPlay
              muted={isMuted}
              playsInline
              loop={false}
            />
          ) : (
            <img
              src={currentItem?.mediaUrl}
              alt={currentItem?.caption || "Status image"}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          )}
        </div>

        {/* Caption */}
        {currentItem?.caption && (
          <div className="px-6 py-2 z-10">
            <p className="text-white/90 text-[14px] text-center">
              {currentItem.caption}
            </p>
          </div>
        )}

        {/* Reply bar (only for other's statuses) */}
        {!isMyStatus && (
          <div className="relative flex items-center gap-2 px-4 py-3 z-10">
            {/* Emoji picker */}
            {showEmojiPicker && (
              <div className="absolute bottom-full left-2 mb-2">
                <EmojiPicker
                  onSelect={handleEmojiSelect}
                  onClose={() => setShowEmojiPicker(false)}
                  position="top"
                  align="left"
                />
              </div>
            )}
            <button
              onClick={() => {
                setShowEmojiPicker((v) => !v);
                setIsPaused(true);
              }}
              className="w-9 h-9 rounded-full flex items-center justify-center text-white/60 hover:text-white transition-colors shrink-0"
            >
              <Smile className="w-5 h-5" />
            </button>
            <button
              onClick={() => replyInputRef.current?.focus()}
              className="w-9 h-9 rounded-full flex items-center justify-center text-white/60 hover:text-white transition-colors shrink-0"
            >
              <Reply className="w-5 h-5" />
            </button>
            <div className="flex-1 flex items-center bg-white/10 rounded-full h-10 px-4 border border-white/10">
              <input
                ref={replyInputRef}
                type="text"
                placeholder="Write a reply..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSendReply();
                }}
                className="flex-1 bg-transparent border-none outline-none text-[13.5px] text-white placeholder:text-white/40"
                onFocus={() => setIsPaused(true)}
                onBlur={() => {
                  // small delay so click on send button registers before unpausing
                  setTimeout(() => {
                    if (!replyInputRef.current?.matches(":focus"))
                      setIsPaused(false);
                  }, 200);
                }}
              />
            </div>
            <button
              onClick={handleSendReply}
              className="w-9 h-9 rounded-full flex items-center justify-center bg-accent text-white hover:bg-accent-hover transition-colors shrink-0 disabled:opacity-40"
              disabled={!replyText.trim()}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
