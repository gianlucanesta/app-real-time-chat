import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Check } from "lucide-react";

interface EditMessageModalProps {
  isOpen: boolean;
  messageText: string;
  messageTime: string;
  onSave: (newText: string) => void;
  onClose: () => void;
}

export function EditMessageModal({
  isOpen,
  messageText,
  messageTime,
  onSave,
  onClose,
}: EditMessageModalProps) {
  const [text, setText] = useState(messageText);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setText(messageText);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, messageText]);

  if (!isOpen) return null;

  const handleSave = () => {
    const trimmed = text.trim();
    if (trimmed && trimmed !== messageText) {
      onSave(trimmed);
    }
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border/50">
          <button
            type="button"
            onClick={onClose}
            className="text-text-secondary hover:text-text-main transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-[15px] font-semibold text-text-main">
            Edit message
          </h2>
        </div>

        {/* Message preview */}
        <div className="px-5 py-6 flex justify-end">
          <div className="bg-accent/90 text-white rounded-2xl rounded-br-sm px-4 py-2 max-w-[75%] shadow-sm">
            <p className="text-[14px] leading-relaxed break-words">
              {messageText}
            </p>
            <div className="flex items-center justify-end gap-1 mt-0.5">
              <span className="text-[11px] text-white/70">{messageTime}</span>
            </div>
          </div>
        </div>

        {/* Edit input */}
        <div className="px-4 pb-4 flex items-center gap-3">
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={4096}
            className="flex-1 bg-input border border-border/50 rounded-full px-4 py-2.5 text-[14px] text-text-main placeholder-text-secondary outline-none focus:border-accent transition-colors"
            placeholder="Edit message..."
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={!text.trim() || text.trim() === messageText}
            className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-white hover:bg-accent/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            aria-label="Save edit"
          >
            <Check className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
