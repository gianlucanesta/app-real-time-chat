import { X } from "lucide-react";

/**
 * Data object passed when the user selects "Message info"
 * from the context menu on a sent message.
 */
export interface MessageInfoData {
  /** The message text (may be empty for media-only messages). */
  text: string;
  /** Formatted time string, e.g. "16:09". */
  time: string;
  /** ISO timestamp of the message. */
  rawTimestamp: string;
  /** Current delivery/read status. */
  status: "sending" | "sent" | "delivered" | "read";
  /** Whether the message was sent by the current user. */
  isSent: boolean;
  /** Media URL if attached. */
  mediaUrl?: string | null;
  /** Media type if attached. */
  mediaType?: "image" | "video" | "audio" | "document" | null;
  /** Original file name for documents. */
  mediaFileName?: string | null;
}

interface MessageInfoPanelProps {
  /** Controls visibility of the panel. */
  isOpen: boolean;
  /** Close handler. */
  onClose: () => void;
  /** Message data to display. */
  message: MessageInfoData | null;
}

/**
 * Right-side panel that displays delivery information for a sent message.
 *
 * Renders in the same slot as ContactProfilePanel / GroupInfoPanel — it
 * slides in from the right and takes the full width of the right column
 * on desktop.
 */
export function MessageInfoPanel({
  isOpen,
  onClose,
  message,
}: MessageInfoPanelProps) {
  if (!message) return null;

  // Build a human-readable date + time string, e.g. "28/03/2026 at 16:09"
  const formatDateTime = (isoOrRaw: string): string => {
    const d = new Date(isoOrRaw);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${day}/${month}/${year} at ${hours}:${minutes}`;
  };

  const formattedDate = formatDateTime(message.rawTimestamp);

  return (
    <div
      className={`absolute inset-0 z-[80] bg-bg md:bg-card flex flex-col transition-transform duration-200 ease-in-out ${
        isOpen ? "translate-x-0" : "translate-x-full"
      }`}
      aria-hidden={!isOpen}
      role="dialog"
      aria-label="Message info"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-card shrink-0">
        <button
          type="button"
          className="w-10 h-10 rounded-full flex items-center justify-center text-text-secondary hover:text-text-main hover:bg-input transition-colors"
          onClick={onClose}
          aria-label="Close message info"
        >
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-base font-semibold text-text-main">
          Message info
        </h2>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-border bg-bg pb-6">
        {/* Message preview bubble */}
        <div className="px-4 pt-6 pb-4">
          <div className="flex justify-end">
            <div
              className="relative max-w-[85%] rounded-2xl rounded-br-sm overflow-hidden shadow-sm"
              style={{
                background: "linear-gradient(135deg, #2563EB, #3B82F6)",
              }}
            >
              {/* Media preview (image/video only) */}
              {message.mediaUrl &&
                message.mediaType === "image" && (
                  <img
                    src={message.mediaUrl}
                    alt="Message media"
                    className="w-full max-h-[200px] object-cover"
                  />
                )}
              {message.mediaUrl &&
                message.mediaType === "video" && (
                  <video
                    src={message.mediaUrl}
                    className="w-full max-h-[200px] object-cover"
                  />
                )}
              {/* Document preview */}
              {message.mediaUrl &&
                message.mediaType === "document" && (
                  <div className="flex items-center gap-3 px-4 py-3">
                    <span className="w-9 h-9 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-5 h-5 text-blue-300"
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                      </svg>
                    </span>
                    <span className="text-sm font-medium text-white truncate">
                      {message.mediaFileName || "Document"}
                    </span>
                  </div>
                )}
              {/* Text content */}
              {message.text && (
                <div className="px-3 py-2 text-[14px] leading-relaxed text-white">
                  <span>{message.text}</span>
                </div>
              )}
              {/* Timestamp + read ticks inside bubble */}
              <div className="flex items-center justify-end gap-1 px-3 pb-1.5 -mt-0.5">
                <span className="text-[11px] text-blue-200/80">
                  {message.time}
                </span>
                {/* Double check mark (read) */}
                {message.status === "read" && (
                  <span className="text-blue-200 flex items-center">
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
                {message.status === "delivered" && (
                  <span className="text-blue-200/60 flex items-center">
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
                {message.status === "sent" && (
                  <span className="text-blue-200/60 flex items-center">
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
              </div>
            </div>
          </div>
        </div>

        {/* Read status */}
        <div className="bg-card mx-4 rounded-xl border border-border/50 overflow-hidden shadow-sm mb-3">
          <div className="flex items-start gap-4 px-4 py-4">
            {/* Double-check icon in blue */}
            <span className="text-primary flex items-center mt-0.5 shrink-0">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-5 h-5"
              >
                <polyline points="18 7 9.5 17 5 12" />
                <polyline points="23 7 14.5 17 12 14" />
              </svg>
            </span>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-text-main">
                Read
              </span>
              <span className="text-xs text-text-secondary mt-0.5">
                {message.status === "read"
                  ? formattedDate
                  : "—"}
              </span>
            </div>
          </div>
        </div>

        {/* Delivered status */}
        <div className="bg-card mx-4 rounded-xl border border-border/50 overflow-hidden shadow-sm">
          <div className="flex items-start gap-4 px-4 py-4">
            {/* Double-check icon in muted color */}
            <span className="text-primary flex items-center mt-0.5 shrink-0">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-5 h-5"
              >
                <polyline points="18 7 9.5 17 5 12" />
                <polyline points="23 7 14.5 17 12 14" />
              </svg>
            </span>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-text-main">
                Delivered
              </span>
              <span className="text-xs text-text-secondary mt-0.5">
                {message.status === "delivered" || message.status === "read"
                  ? formattedDate
                  : "—"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
