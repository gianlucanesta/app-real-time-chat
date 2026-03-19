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
} from "lucide-react";
import { useState, useRef } from "react";
import { useClickOutside } from "../../hooks/useClickOutside";

interface ChatMessageProps {
  id: string;
  text: string;
  time: string;
  isSent: boolean;
  contactInitials?: string;
  contactGradient?: string;
  status?: "sending" | "sent" | "delivered" | "read";
  isSelectMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  onCopy?: () => void;
  onDelete?: () => void;
  onEnterSelectMode?: () => void;
  reactions?: Record<string, number>;
  onReaction?: (emoji: string) => void;
}

const EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

export function ChatMessage({
  id,
  text,
  time,
  isSent,
  contactInitials,
  contactGradient,
  status,
  isSelectMode = false,
  isSelected = false,
  onToggleSelect,
  onCopy,
  onDelete,
  onEnterSelectMode,
  reactions,
  onReaction,
}: ChatMessageProps) {
  const [isReactionMenuOpen, setIsReactionMenuOpen] = useState(false);
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
  const [menuDirection, setMenuDirection] = useState<"down" | "up">("down");
  const chevronRef = useRef<HTMLButtonElement>(null);

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
              className={`group/bubble relative pr-8 px-4 py-3 text-[14px] leading-relaxed break-words shadow-sm rounded-2xl overflow-hidden ${
                isSent
                  ? "text-white rounded-br-sm"
                  : "bg-card border border-border/50 text-text-main rounded-bl-sm"
              }`}
              style={
                isSent
                  ? { background: "linear-gradient(135deg, #2563EB, #3B82F6)" }
                  : undefined
              }
            >
              {text}
              {!isSelectMode && (
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
              )}
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
                      className={`absolute top-full lg:bottom-full lg:top-auto mt-2 lg:mt-0 lg:mb-2 ${isSent ? "right-0" : "left-0"} p-2 bg-card border border-border/80 shadow-xl rounded-full flex items-center gap-1 animate-in zoom-in-95 z-50`}
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
                      <button
                        className="w-8 h-8 rounded-full hover:bg-input flex items-center justify-center text-text-secondary transition-colors"
                        onClick={() => setIsReactionMenuOpen(false)}
                      >
                        <span className="text-[18px] leading-none">+</span>
                      </button>
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
                    onDelete?.();
                    setIsContextMenuOpen(false);
                  }}
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              </div>
            )}
          </div>

          {/* Reaction strip */}
          {reactions && Object.keys(reactions).length > 0 && (
            <div
              className={`flex items-center gap-1 mt-1 ${isSent ? "justify-end mr-1" : "ml-1"}`}
            >
              {Object.entries(reactions).map(([emoji, count]) => (
                <button
                  key={emoji}
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-card border border-border/50 text-[12px] hover:bg-input/80 transition-colors"
                  onClick={() => onReaction?.(emoji)}
                >
                  {emoji}
                  {count > 1 && (
                    <span className="text-text-secondary text-[10px]">
                      {count}
                    </span>
                  )}
                </button>
              ))}
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
    </div>
  );
}
