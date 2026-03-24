import { useState } from "react";
import { Globe } from "lucide-react";
import type { LinkPreview } from "../../types";

interface LinkPreviewCardProps {
  preview: LinkPreview;
  isSent?: boolean;
  /** Show close button — used in the compose area before sending */
  onDismiss?: () => void;
}

export function LinkPreviewCard({
  preview,
  isSent = false,
  onDismiss,
}: LinkPreviewCardProps) {
  const [imgError, setImgError] = useState(false);

  const displayHost = (() => {
    try {
      return new URL(preview.url).hostname.replace(/^www\./, "");
    } catch {
      return preview.url;
    }
  })();

  return (
    <a
      href={preview.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => {
        // Don't navigate when clicking the dismiss button
        if ((e.target as HTMLElement).closest("[data-dismiss]")) {
          e.preventDefault();
        }
      }}
      className={`relative block rounded-xl overflow-hidden no-underline transition-opacity hover:opacity-90 ${
        isSent
          ? "bg-blue-700/40 border border-blue-500/30"
          : "bg-input border border-border"
      }`}
      style={{ maxWidth: 280 }}
    >
      {/* Dismiss button — only shown in compose area */}
      {onDismiss && (
        <button
          data-dismiss
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDismiss();
          }}
          className="absolute top-1.5 right-1.5 z-10 w-6 h-6 rounded-full flex items-center justify-center bg-black/30 hover:bg-black/50 text-white transition-colors"
          aria-label="Dismiss link preview"
        >
          <svg
            viewBox="0 0 24 24"
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
          </svg>
        </button>
      )}

      {/* Image */}
      {preview.image && !imgError && (
        <div className="w-full h-32 overflow-hidden bg-black/20">
          <img
            src={preview.image}
            alt={preview.title ?? "Link preview"}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        </div>
      )}

      {/* Text content */}
      <div className="px-3 py-2.5 flex flex-col gap-1">
        {/* Site name / host */}
        <div
          className={`flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide ${
            isSent ? "text-blue-200" : "text-text-secondary"
          }`}
        >
          <Globe className="w-3 h-3 shrink-0" />
          <span className="truncate">{preview.siteName ?? displayHost}</span>
        </div>

        {/* Title */}
        {preview.title && (
          <span
            className={`text-[13px] font-semibold leading-snug line-clamp-2 ${
              isSent ? "text-white" : "text-text-main"
            }`}
          >
            {preview.title}
          </span>
        )}

        {/* Description */}
        {preview.description && (
          <span
            className={`text-[12px] leading-relaxed line-clamp-2 ${
              isSent ? "text-blue-100/80" : "text-text-secondary"
            }`}
          >
            {preview.description}
          </span>
        )}
      </div>
    </a>
  );
}
