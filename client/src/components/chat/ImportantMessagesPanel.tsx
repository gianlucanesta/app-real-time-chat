import { ChevronLeft, Star, Check, CheckCheck } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";

interface StarredMessage {
  _id: string;
  sender: string;
  senderDisplayName?: string | null;
  senderInitials?: string | null;
  senderGradient?: string | null;
  senderAvatarUrl?: string | null;
  text: string;
  mediaType?: "image" | "video" | "audio" | "document" | null;
  mediaUrl?: string | null;
  mediaFileName?: string | null;
  status: string;
  createdAt: string;
}

interface ImportantMessagesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
  contactName: string;
  onUnstar?: (messageId: string) => void;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function dateSeparatorLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffMs = today.getTime() - msgDay.getTime();
  const diffDays = Math.round(diffMs / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function StatusIcon({ status }: { status: string }) {
  if (status === "read") {
    return <CheckCheck className="w-3.5 h-3.5 text-accent" />;
  }
  if (status === "delivered") {
    return <CheckCheck className="w-3.5 h-3.5 text-text-secondary" />;
  }
  return <Check className="w-3.5 h-3.5 text-text-secondary" />;
}

export function ImportantMessagesPanel({
  isOpen,
  onClose,
  conversationId,
  contactName,
  onUnstar,
}: ImportantMessagesPanelProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<StarredMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchStarred = useCallback(async () => {
    if (!conversationId) return;
    setLoading(true);
    try {
      const data = await apiFetch<{ messages: StarredMessage[] }>(
        `/messages/${conversationId}/starred`,
      );
      setMessages(data.messages);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    if (isOpen) {
      void fetchStarred();
    }
  }, [isOpen, fetchStarred]);

  // Group messages by date
  const grouped: [string, StarredMessage[]][] = [];
  let currentLabel = "";
  for (const msg of messages) {
    const label = dateSeparatorLabel(msg.createdAt);
    if (label !== currentLabel) {
      currentLabel = label;
      grouped.push([label, [msg]]);
    } else {
      grouped[grouped.length - 1][1].push(msg);
    }
  }

  const handleUnstar = (messageId: string) => {
    onUnstar?.(messageId);
    setMessages((prev) => prev.filter((m) => m._id !== messageId));
  };

  return (
    <div
      className={`absolute inset-0 z-[85] bg-bg flex flex-col transition-transform duration-200 ease-in-out ${isOpen ? "translate-x-0" : "translate-x-full"}`}
      aria-hidden={!isOpen}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-accent text-white shadow-md">
        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
          aria-label="Back"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex flex-col">
          <span className="font-semibold text-sm">Important messages</span>
          <span className="text-xs text-white/70">
            {messages.length} message{messages.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-border">
        {loading && messages.length === 0 && (
          <div className="flex items-center justify-center py-12 text-text-secondary text-sm">
            Loading...
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <Star className="w-12 h-12 text-text-secondary/30 mb-3" />
            <p className="text-text-secondary text-sm">
              No important messages yet
            </p>
            <p className="text-text-secondary/60 text-xs mt-1">
              Tap and hold on a message, then tap "Important" to mark it
            </p>
          </div>
        )}

        {grouped.map(([label, msgs]) => (
          <div key={label}>
            {/* Date separator */}
            <div className="flex justify-center py-3">
              <span className="bg-card text-text-secondary text-xs px-3 py-1 rounded-full shadow-sm border border-border/50">
                {label}
              </span>
            </div>

            {/* Messages */}
            {msgs.map((msg) => {
              const isMe = msg.sender === user?.id;
              const senderLabel = isMe ? "You" : (msg.senderDisplayName ?? contactName);
              const receiverLabel = isMe ? contactName : "You";

              return (
                <div
                  key={msg._id}
                  className="px-4 py-2 hover:bg-input/50 transition-colors group"
                >
                  {/* Sender > Receiver line */}
                  <div className="flex items-center gap-1.5 mb-1">
                    {/* Sender avatar */}
                    {msg.senderAvatarUrl ? (
                      <img
                        src={msg.senderAvatarUrl}
                        alt={senderLabel}
                        className="w-5 h-5 rounded-full object-cover"
                      />
                    ) : (
                      <div
                        className="w-5 h-5 rounded-full text-[8px] font-bold flex items-center justify-center text-white"
                        style={{
                          background:
                            msg.senderGradient ??
                            "linear-gradient(135deg,#2563EB,#7C3AED)",
                        }}
                      >
                        {msg.senderInitials ?? senderLabel.charAt(0)}
                      </div>
                    )}
                    <span className="text-xs font-semibold text-accent">
                      {senderLabel}
                    </span>
                    <span className="text-xs text-text-secondary">›</span>
                    <span className="text-xs font-semibold text-accent">
                      {receiverLabel}
                    </span>
                  </div>

                  {/* Message bubble */}
                  <div
                    className={`rounded-lg px-3 py-2 text-sm max-w-full ${
                      isMe
                        ? "bg-sent-bubble text-sent-text"
                        : "bg-received-bubble text-received-text"
                    }`}
                  >
                    {/* Media indicator */}
                    {msg.mediaType && msg.mediaType !== "document" && msg.mediaUrl && (
                      <div className="mb-1">
                        {msg.mediaType === "image" && (
                          <img
                            src={msg.mediaUrl}
                            alt="Media"
                            className="max-h-40 rounded object-cover"
                          />
                        )}
                        {msg.mediaType === "video" && (
                          <video
                            src={msg.mediaUrl}
                            className="max-h-40 rounded"
                            controls
                          />
                        )}
                        {msg.mediaType === "audio" && (
                          <audio src={msg.mediaUrl} controls className="w-full" />
                        )}
                      </div>
                    )}
                    {msg.mediaType === "document" && msg.mediaFileName && (
                      <div className="flex items-center gap-2 mb-1 text-xs text-text-secondary">
                        📄 {msg.mediaFileName}
                      </div>
                    )}

                    {msg.text && <p className="break-words">{msg.text}</p>}

                    {/* Footer: star + time + status */}
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />
                      <span className="text-[11px] text-text-secondary">
                        {formatTime(msg.createdAt)}
                      </span>
                      {isMe && <StatusIcon status={msg.status} />}
                    </div>
                  </div>

                  {/* Unstar button (visible on hover) */}
                  {onUnstar && (
                    <button
                      type="button"
                      onClick={() => handleUnstar(msg._id)}
                      className="mt-1 text-xs text-text-secondary hover:text-amber-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      Unstar message
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
