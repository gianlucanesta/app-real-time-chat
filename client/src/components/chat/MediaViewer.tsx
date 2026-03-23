import { useState, useCallback, useEffect } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Star,
  Forward,
  Trash2,
  Smile,
} from "lucide-react";

export interface MediaItem {
  messageId: string;
  url: string;
  type: "image" | "video" | "audio";
  caption?: string;
  time: string;
  isSent: boolean;
}

interface MediaViewerProps {
  items: MediaItem[];
  initialIndex: number;
  contactName: string;
  contactDate?: string;
  onClose: () => void;
}

export function MediaViewer({
  items,
  initialIndex,
  contactName,
  contactDate,
  onClose,
}: MediaViewerProps) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const current = items[activeIndex];

  const goNext = useCallback(() => {
    setActiveIndex((i) => Math.min(i + 1, items.length - 1));
  }, [items.length]);

  const goPrev = useCallback(() => {
    setActiveIndex((i) => Math.max(i - 1, 0));
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, goNext, goPrev]);

  if (!current) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col select-none">
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        {/* Left: contact info */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div>
            <p className="text-white text-sm font-medium">{contactName}</p>
            {contactDate && (
              <p className="text-white/50 text-xs">{contactDate}</p>
            )}
          </div>
        </div>

        {/* Right: action buttons */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="w-9 h-9 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Star className="w-5 h-5" />
          </button>
          <button
            type="button"
            className="w-9 h-9 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Smile className="w-5 h-5" />
          </button>
          <button
            type="button"
            className="w-9 h-9 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Forward className="w-5 h-5" />
          </button>
          <button
            type="button"
            className="w-9 h-9 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ── Main area ── */}
      <div className="flex-1 flex items-center justify-center relative min-h-0 px-4">
        {/* Previous arrow */}
        {activeIndex > 0 && (
          <button
            type="button"
            onClick={goPrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors z-10"
          >
            <ChevronLeft className="w-7 h-7" />
          </button>
        )}

        {/* Content */}
        <div className="max-w-[85vw] max-h-[70vh] flex items-center justify-center">
          {current.type === "image" && (
            <img
              src={current.url}
              alt=""
              className="max-w-full max-h-[70vh] object-contain rounded-lg"
            />
          )}
          {current.type === "video" && (
            <video
              key={current.url}
              src={current.url}
              controls
              autoPlay
              className="max-w-full max-h-[70vh] rounded-lg"
            />
          )}
        </div>

        {/* Next arrow */}
        {activeIndex < items.length - 1 && (
          <button
            type="button"
            onClick={goNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors z-10"
          >
            <ChevronRight className="w-7 h-7" />
          </button>
        )}
      </div>

      {/* ── Caption ── */}
      {current.caption && (
        <div className="px-4 py-2 text-center">
          <p className="text-white/90 text-sm">{current.caption}</p>
        </div>
      )}

      {/* ── Counter ── */}
      {items.length > 1 && (
        <div className="text-center py-1">
          <span className="text-white/50 text-xs">
            {activeIndex + 1} di {items.length}
          </span>
        </div>
      )}

      {/* ── Thumbnail strip ── */}
      {items.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 px-4 py-3 overflow-x-auto shrink-0">
          {items.map((item, idx) => (
            <button
              key={item.messageId}
              type="button"
              onClick={() => setActiveIndex(idx)}
              className={`w-16 h-16 rounded-md overflow-hidden shrink-0 border-2 transition-colors ${
                idx === activeIndex
                  ? "border-green-500"
                  : "border-transparent hover:border-white/30"
              }`}
            >
              {item.type === "image" ? (
                <img
                  src={item.url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-white/10 flex items-center justify-center relative">
                  <video
                    src={item.url}
                    className="w-full h-full object-cover"
                    muted
                    preload="metadata"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4">
                      <polygon points="5,3 19,12 5,21" />
                    </svg>
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
