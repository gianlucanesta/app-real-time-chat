import { useState, useCallback } from "react";
import { X, Link2, Copy, Check } from "lucide-react";

interface CallLinkModalProps {
  open: boolean;
  onClose: () => void;
}

function generateCallLinkId(): string {
  // Generate a URL-safe unique ID
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const segments = [3, 4, 3]; // e.g. abc-d1e2-f3g
  return segments
    .map((len) =>
      Array.from({ length: len }, () =>
        chars[Math.floor(Math.random() * chars.length)],
      ).join(""),
    )
    .join("-");
}

export function CallLinkModal({ open, onClose }: CallLinkModalProps) {
  const [linkId] = useState(() => generateCallLinkId());
  const [copied, setCopied] = useState(false);

  const callLink = `${window.location.origin}/call/${linkId}`;

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(callLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = callLink;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [callLink]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-[16px] font-semibold text-text-main">
            New call link
          </h2>
          <button
            onClick={onClose}
            title="Close"
            className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:text-text-main hover:bg-input transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-6 flex flex-col items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center">
            <Link2 className="w-8 h-8 text-accent" />
          </div>

          <div className="text-center">
            <p className="text-[14px] text-text-main mb-1">
              Share this link to invite others to your call
            </p>
            <p className="text-[12px] text-text-secondary">
              Anyone with the link can join, even as a guest
            </p>
          </div>

          {/* Link display */}
          <div className="w-full flex items-center gap-2 p-3 rounded-xl bg-input border border-border">
            <Link2 className="w-4 h-4 text-accent shrink-0" />
            <span className="flex-1 text-[13px] text-text-main truncate font-mono">
              {callLink}
            </span>
            <button
              onClick={handleCopy}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
                copied
                  ? "bg-green-500/10 text-green-400"
                  : "bg-accent/10 text-accent hover:bg-accent/20"
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-[14px] font-medium text-text-secondary bg-input hover:bg-input/80 transition-colors"
          >
            Close
          </button>
          <button
            onClick={handleCopy}
            className="flex-1 py-2.5 rounded-xl text-[14px] font-medium text-white bg-accent hover:brightness-110 transition-all"
          >
            Copy link
          </button>
        </div>
      </div>
    </div>
  );
}
