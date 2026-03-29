import { useState } from "react";
import { BellOff } from "lucide-react";

export type MuteDuration = "8h" | "1w" | "always";

interface MuteConversationModalProps {
  isOpen: boolean;
  conversationName: string;
  isMuted: boolean;
  onCancel: () => void;
  onMute: (duration: MuteDuration) => void;
  onUnmute: () => void;
}

const DURATION_OPTIONS: { value: MuteDuration; label: string }[] = [
  { value: "8h", label: "For 8 hours" },
  { value: "1w", label: "For 1 week" },
  { value: "always", label: "Until I turn it back on" },
];

export function MuteConversationModal({
  isOpen,
  conversationName,
  isMuted,
  onCancel,
  onMute,
  onUnmute,
}: MuteConversationModalProps) {
  const [selected, setSelected] = useState<MuteDuration>("8h");

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="w-full max-w-sm mx-4 bg-bg-main rounded-2xl shadow-xl border border-border overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
          <div className="w-9 h-9 rounded-full bg-accent/15 flex items-center justify-center">
            <BellOff className="w-4.5 h-4.5 text-accent" />
          </div>
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-text-main leading-tight">
              Mute Notifications
            </p>
            <p className="text-[12px] text-text-secondary truncate">
              {conversationName}
            </p>
          </div>
        </div>

        {/* Body */}
        {isMuted ? (
          <div className="px-5 py-5">
            <p className="text-[14px] text-text-secondary">
              Notifications for this conversation are currently muted.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-1 px-5 py-4">
            {DURATION_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex items-center gap-3 py-2.5 cursor-pointer select-none"
              >
                {/* Custom radio */}
                <span
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                    selected === opt.value
                      ? "border-accent"
                      : "border-[var(--color-border)]"
                  }`}
                  aria-hidden="true"
                >
                  {selected === opt.value && (
                    <span className="w-2.5 h-2.5 rounded-full bg-accent" />
                  )}
                </span>
                <input
                  type="radio"
                  name="mute-duration"
                  value={opt.value}
                  checked={selected === opt.value}
                  onChange={() => setSelected(opt.value)}
                  className="sr-only"
                />
                <span className="text-[14px] text-text-main">{opt.label}</span>
              </label>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-[14px] font-medium text-text-secondary hover:text-text-main hover:bg-input transition-colors"
          >
            Cancel
          </button>
          {isMuted ? (
            <button
              type="button"
              onClick={onUnmute}
              className="px-4 py-2 rounded-lg text-[14px] font-semibold bg-accent text-white hover:bg-accent/90 transition-colors"
            >
              Unmute
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onMute(selected)}
              className="px-4 py-2 rounded-lg text-[14px] font-semibold bg-accent text-white hover:bg-accent/90 transition-colors"
            >
              Mute
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
