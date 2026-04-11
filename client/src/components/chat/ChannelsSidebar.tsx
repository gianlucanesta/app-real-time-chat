import { useState, useEffect, useRef } from "react";
import { Search, Plus, Megaphone } from "lucide-react";
import { apiFetch } from "../../lib/api";
import { CreateChannelModal } from "./CreateChannelModal";
import type { Channel } from "../../types";

interface ChannelsSidebarProps {
  selectedChannel: Channel | null;
  onSelectChannel: (channel: Channel | null) => void;
}

export function ChannelsSidebar({
  selectedChannel,
  onSelectChannel,
}: ChannelsSidebarProps) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const fetchChannels = async (search?: string) => {
    try {
      setLoading(true);
      const query = search ? `?search=${encodeURIComponent(search)}` : "";
      const data = await apiFetch<{ channels: Channel[] }>(`/channels${query}`);
      setChannels(data.channels);
    } catch (err) {
      console.error("Failed to fetch channels:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChannels();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  // Debounced search
  useEffect(() => {
    if (!isSearchMode) return;
    const timer = setTimeout(() => {
      fetchChannels(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, isSearchMode]);

  const handleFollow = async (channelId: string) => {
    try {
      await apiFetch(`/channels/${channelId}/follow`, { method: "POST" });
      fetchChannels(isSearchMode ? searchQuery : undefined);
    } catch (err) {
      console.error("Failed to follow channel:", err);
    }
  };

  const handleUnfollow = async (channelId: string) => {
    try {
      await apiFetch(`/channels/${channelId}/follow`, { method: "DELETE" });
      fetchChannels(isSearchMode ? searchQuery : undefined);
    } catch (err) {
      console.error("Failed to unfollow channel:", err);
    }
  };

  const formatFollowers = (count: number): string => {
    if (count >= 1_000_000)
      return `${(count / 1_000_000).toFixed(1)}M followers`;
    if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K followers`;
    return `${count} follower${count !== 1 ? "s" : ""}`;
  };

  const formatTimeAgo = (dateStr: string): string => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "now";
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d`;
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  };

  // Split channels into followed and suggested
  const followedChannels = channels.filter((c) => c.is_following);
  const suggestedChannels = channels.filter((c) => !c.is_following);

  return (
    <>
      <aside className="w-full md:w-[var(--width-sidebar)] md:min-w-[var(--width-sidebar)] h-full flex flex-col border-r border-border bg-card shrink-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-[64px] border-b border-border shrink-0">
          <h1 className="text-xl font-bold text-text-main">Channels</h1>

          {/* + button with dropdown menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="w-9 h-9 rounded-full flex items-center justify-center text-text-secondary hover:bg-input hover:text-text-main transition-colors"
              aria-label="Channel options"
            >
              <Plus className="w-5 h-5" />
            </button>

            {/* Dropdown menu */}
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                <button
                  className="w-full flex items-center gap-3 px-4 py-3 text-[14px] text-text-main hover:bg-input transition-colors"
                  onClick={() => {
                    setMenuOpen(false);
                    setIsCreateOpen(true);
                  }}
                >
                  <Megaphone className="w-4 h-4 text-text-secondary" />
                  Create Channel
                </button>
                <button
                  className="w-full flex items-center gap-3 px-4 py-3 text-[14px] text-text-main hover:bg-input transition-colors"
                  onClick={() => {
                    setMenuOpen(false);
                    setIsSearchMode(true);
                  }}
                >
                  <Search className="w-4 h-4 text-text-secondary" />
                  Find Channels
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Search bar (shown in search mode) */}
        {isSearchMode && (
          <div className="px-4 py-2">
            <div className="relative flex items-center bg-input border border-border rounded-lg h-[38px] px-3 focus-within:border-accent transition-colors">
              <Search className="min-w-[16px] w-4 h-4 text-text-secondary mr-2" />
              <input
                type="text"
                placeholder="Search channels..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="flex-1 bg-transparent border-none outline-none text-text-main text-[13px] placeholder:text-text-secondary h-full"
              />
              <button
                className="text-[12px] text-accent hover:text-accent-hover ml-2"
                onClick={() => {
                  setIsSearchMode(false);
                  setSearchQuery("");
                  fetchChannels();
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Channel list */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-2 py-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <span className="w-6 h-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
            </div>
          ) : channels.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center mb-3">
                <Megaphone className="w-7 h-7 text-accent" />
              </div>
              <p className="text-text-secondary text-[14px]">
                {isSearchMode
                  ? "No channels found"
                  : "No channels yet. Create one to get started!"}
              </p>
            </div>
          ) : (
            <>
              {/* ── Followed Channels (chat-like list) ── */}
              {followedChannels.length > 0 && (
                <>
                  {followedChannels.map((channel) => (
                    <div
                      key={channel.id}
                      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                        selectedChannel?.id === channel.id
                          ? "bg-accent/10"
                          : "hover:bg-input"
                      }`}
                      onClick={() => onSelectChannel(channel)}
                    >
                      {/* Channel avatar */}
                      <div className="w-12 h-12 rounded-full bg-accent/15 flex items-center justify-center shrink-0">
                        {channel.avatar_url ? (
                          <img
                            src={channel.avatar_url}
                            alt={channel.name}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <Megaphone className="w-6 h-6 text-accent" />
                        )}
                      </div>

                      {/* Channel info with last message preview */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-text-main text-[14px] truncate">
                            {channel.name}
                          </p>
                          {channel.last_message_at && (
                            <span className="text-[11px] text-text-secondary shrink-0 ml-2">
                              {formatTimeAgo(channel.last_message_at)}
                            </span>
                          )}
                        </div>
                        <p className="text-[12px] text-text-secondary truncate mt-0.5">
                          {channel.last_message || channel.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* ── Suggested Channels ("Find channels to follow") ── */}
              {suggestedChannels.length > 0 && (
                <>
                  <div className="px-2 pt-4 pb-2">
                    <p className="text-text-secondary text-[13px] font-semibold uppercase tracking-wide">
                      Find channels to follow
                    </p>
                  </div>

                  {suggestedChannels.map((channel) => (
                    <div
                      key={channel.id}
                      className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-input transition-colors"
                      onClick={() => onSelectChannel(channel)}
                    >
                      {/* Channel avatar */}
                      <div className="w-12 h-12 rounded-full bg-accent/15 flex items-center justify-center shrink-0">
                        {channel.avatar_url ? (
                          <img
                            src={channel.avatar_url}
                            alt={channel.name}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <Megaphone className="w-6 h-6 text-accent" />
                        )}
                      </div>

                      {/* Channel info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-text-main text-[14px] truncate">
                          {channel.name}
                        </p>
                        <p className="text-[12px] text-text-secondary truncate">
                          {formatFollowers(channel.follower_count)}
                        </p>
                      </div>

                      {/* Follow button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFollow(channel.id);
                        }}
                        className="px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all shrink-0 bg-accent text-white hover:brightness-110"
                      >
                        Follow
                      </button>
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </div>

        {/* Bottom: Create Channel shortcut */}
        <div className="px-4 py-3 border-t border-border">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[14px] font-medium text-accent hover:bg-accent/10 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Channel
          </button>
        </div>
      </aside>

      {/* Create Channel Modal */}
      <CreateChannelModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={() => fetchChannels(isSearchMode ? searchQuery : undefined)}
      />
    </>
  );
}
