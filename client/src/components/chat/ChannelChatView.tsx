import { useState, useEffect, useRef, useCallback } from "react";
import { Megaphone, Send, ChevronLeft, Users, LogOut } from "lucide-react";
import { apiFetch } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";
import type { Channel, ChannelMessage } from "../../types";

interface ChannelChatViewProps {
  channel: Channel;
  onBack?: () => void;
  onUnfollow?: (channelId: string) => void;
}

/** Format a date for message group separators. */
function dateSeparatorLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round(
    (today.getTime() - msgDay.getTime()) / 86_400_000,
  );
  if (diffDays === 0) return "TODAY";
  if (diffDays === 1) return "YESTERDAY";
  return d
    .toLocaleDateString(undefined, {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
    .toUpperCase();
}

/** Group messages by day. */
function groupByDate(
  messages: ChannelMessage[],
): [string, ChannelMessage[]][] {
  const groups: [string, ChannelMessage[]][] = [];
  let currentLabel = "";
  for (const msg of messages) {
    const label = dateSeparatorLabel(msg.created_at);
    if (label !== currentLabel) {
      currentLabel = label;
      groups.push([label, [msg]]);
    } else {
      groups[groups.length - 1][1].push(msg);
    }
  }
  return groups;
}

export function ChannelChatView({
  channel,
  onBack,
  onUnfollow,
}: ChannelChatViewProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChannelMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isOwner = user?.id === channel.owner_id;

  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiFetch<{ messages: ChannelMessage[] }>(
        `/channels/${channel.id}/messages`,
      );
      setMessages(data.messages);
    } catch (err) {
      console.error("Failed to fetch channel messages:", err);
    } finally {
      setLoading(false);
    }
  }, [channel.id]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text || sending) return;
    try {
      setSending(true);
      const data = await apiFetch<{ message: ChannelMessage }>(
        `/channels/${channel.id}/messages`,
        {
          method: "POST",
          body: JSON.stringify({ content: text }),
        },
      );
      setMessages((prev) => [...prev, data.message]);
      setInputValue("");
    } catch (err) {
      console.error("Failed to send channel message:", err);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });

  const formatFollowers = (count: number): string => {
    if (count >= 1_000_000)
      return `${(count / 1_000_000).toFixed(1)}M followers`;
    if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K followers`;
    return `${count} follower${count !== 1 ? "s" : ""}`;
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-bg overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-4 h-[64px] border-b border-border bg-card shrink-0">
        {/* Back button (mobile) */}
        {onBack && (
          <button
            onClick={onBack}
            aria-label="Back"
            className="w-9 h-9 rounded-full flex items-center justify-center text-text-secondary hover:bg-input hover:text-text-main transition-colors md:hidden"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        {/* Channel avatar */}
        <div className="w-10 h-10 rounded-full bg-accent/15 flex items-center justify-center shrink-0">
          {channel.avatar_url ? (
            <img
              src={channel.avatar_url}
              alt={channel.name}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <Megaphone className="w-5 h-5 text-accent" />
          )}
        </div>

        {/* Channel name + follower count */}
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-text-main text-[15px] truncate">
            {channel.name}
          </h2>
          <p className="text-[12px] text-text-secondary flex items-center gap-1">
            <Users className="w-3 h-3" />
            {formatFollowers(channel.follower_count)}
          </p>
        </div>

        {/* Unfollow button (for non-owners who follow) */}
        {channel.is_following && !isOwner && onUnfollow && (
          <button
            onClick={() => onUnfollow(channel.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-text-secondary hover:text-danger hover:bg-danger/10 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Unfollow
          </button>
        )}
      </div>

      {/* ── Channel info banner ── */}
      <div className="px-6 py-4 bg-card/50 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-accent/15 flex items-center justify-center shrink-0">
            {channel.avatar_url ? (
              <img
                src={channel.avatar_url}
                alt={channel.name}
                className="w-14 h-14 rounded-full object-cover"
              />
            ) : (
              <Megaphone className="w-7 h-7 text-accent" />
            )}
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-text-main text-[16px]">
              {channel.name}
            </h3>
            <p className="text-[13px] text-text-secondary leading-relaxed mt-0.5">
              {channel.description}
            </p>
            {channel.owner_display_name && (
              <p className="text-[12px] text-text-secondary mt-1">
                Created by {channel.owner_display_name}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Messages Area ── */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 md:px-8 flex flex-col pt-4 pb-4 scrollbar-thin">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <span className="w-6 h-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 py-12">
            <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center">
              <Megaphone className="w-8 h-8 text-accent" />
            </div>
            <p className="text-text-secondary text-[14px]">
              {isOwner
                ? "No messages yet. Start posting content to your followers!"
                : "No messages yet in this channel."}
            </p>
          </div>
        ) : (
          groupByDate(messages).map(([label, msgs]) => (
            <div key={label} className="flex flex-col">
              {/* Date Separator */}
              <div className="flex items-center justify-center my-4">
                <span className="bg-input/70 text-text-secondary text-[11px] font-medium uppercase tracking-[1px] px-3 py-1 rounded-lg">
                  {label}
                </span>
              </div>

              {msgs.map((msg) => (
                <div key={msg.id} className="flex flex-col mb-3">
                  {/* Channel message bubble (always left-aligned like a broadcast) */}
                  <div className="max-w-[85%] md:max-w-[65%]">
                    <div className="bg-card border border-border/50 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                      {/* Author name */}
                      <p className="text-[12px] font-semibold text-accent mb-1">
                        {msg.author_display_name || channel.name}
                      </p>

                      {/* Media if any */}
                      {msg.media_url && (
                        <div className="mb-2 rounded-lg overflow-hidden">
                          <img
                            src={msg.media_url}
                            alt="Channel media"
                            className="w-full max-h-[300px] object-cover rounded-lg"
                          />
                        </div>
                      )}

                      {/* Content */}
                      {msg.content && (
                        <p className="text-text-main text-[14px] leading-relaxed whitespace-pre-wrap break-words">
                          {msg.content}
                        </p>
                      )}

                      {/* Time */}
                      <p className="text-[11px] text-text-secondary mt-1.5 text-right">
                        {formatTime(msg.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
        <div ref={messagesEndRef} className="shrink-0" />
      </div>

      {/* ── Input Area (only for channel owner) ── */}
      {isOwner && (
        <div className="shrink-0 px-3 pb-2 md:px-4 md:pb-2 pt-2">
          <div className="flex items-center bg-input/80 backdrop-blur-md border border-border/50 shadow-lg rounded-full p-1.5">
            <input
              type="text"
              placeholder="Write a message to your followers..."
              value={inputValue}
              className="flex-1 bg-transparent border-none outline-none text-[14px] text-text-main placeholder:text-text-secondary px-4"
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || sending}
              className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-all ${
                inputValue.trim()
                  ? "bg-accent text-white hover:brightness-110 shadow-md"
                  : "text-text-secondary"
              }`}
              aria-label="Send message"
            >
              <Send className="w-[20px] h-[20px] ml-0.5" />
            </button>
          </div>
        </div>
      )}

      {/* Read-only notice for non-owners */}
      {!isOwner && channel.is_following && (
        <div className="shrink-0 px-4 py-3 text-center border-t border-border bg-card/50">
          <p className="text-[13px] text-text-secondary">
            Only the channel admin can send messages
          </p>
        </div>
      )}
    </div>
  );
}
