import { useState, useEffect, useRef } from "react";
import { Search, Plus, Users } from "lucide-react";
import { apiFetch } from "../../lib/api";
import type { Community } from "../../types";

interface CommunitySidebarProps {
  selectedCommunity: Community | null;
  onSelectCommunity: (community: Community | null) => void;
  onCreateCommunity: () => void;
}

export function CommunitySidebar({
  selectedCommunity,
  onSelectCommunity,
  onCreateCommunity,
}: CommunitySidebarProps) {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const fetchCommunities = async () => {
    try {
      setLoading(true);
      const data = await apiFetch<{ communities: Community[] }>("/communities");
      setCommunities(data.communities);
    } catch (err) {
      console.error("Failed to fetch communities:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommunities();
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

  const filtered = isSearchMode
    ? communities.filter((c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : communities;

  const formatMembers = (count: number): string => {
    if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K members`;
    return `${count} member${count !== 1 ? "s" : ""}`;
  };

  const formatTime = (iso?: string | null) => {
    if (!iso) return "";
    return new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <aside className="w-full md:w-[340px] lg:w-[380px] h-full flex flex-col border-r border-border bg-card shrink-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-[64px] border-b border-border shrink-0">
        <h1 className="text-xl font-bold text-text-main">Communities</h1>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="w-9 h-9 rounded-full flex items-center justify-center text-text-secondary hover:bg-input hover:text-text-main transition-colors"
            aria-label="Community options"
          >
            <Plus className="w-5 h-5" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-52 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
              <button
                className="w-full flex items-center gap-3 px-4 py-3 text-[14px] text-text-main hover:bg-input transition-colors"
                onClick={() => {
                  setMenuOpen(false);
                  onCreateCommunity();
                }}
              >
                <Users className="w-4 h-4 text-text-secondary" />
                New Community
              </button>
              <button
                className="w-full flex items-center gap-3 px-4 py-3 text-[14px] text-text-main hover:bg-input transition-colors"
                onClick={() => {
                  setMenuOpen(false);
                  setIsSearchMode(true);
                }}
              >
                <Search className="w-4 h-4 text-text-secondary" />
                Search Communities
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Subtitle */}
      <div className="px-4 pt-4 pb-2">
        <p className="text-text-secondary text-[13px] leading-relaxed">
          Bring members together in topic-based groups
        </p>
      </div>

      {/* Search */}
      {isSearchMode && (
        <div className="px-4 py-2">
          <div className="relative flex items-center bg-input border border-border rounded-lg h-[38px] px-3 focus-within:border-accent transition-colors">
            <Search className="min-w-[16px] w-4 h-4 text-text-secondary mr-2" />
            <input
              type="text"
              placeholder="Search communities..."
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
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Community list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-2 py-2">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <span className="w-6 h-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center mb-3">
              <Users className="w-7 h-7 text-accent" />
            </div>
            <p className="text-text-secondary text-[14px]">
              {isSearchMode
                ? "No communities found"
                : "No communities yet. Create one to get started!"}
            </p>
          </div>
        ) : (
          filtered.map((community) => (
            <div
              key={community.id}
              className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                selectedCommunity?.id === community.id
                  ? "bg-accent/10"
                  : "hover:bg-input"
              }`}
              onClick={() => onSelectCommunity(community)}
            >
              {/* Community icon */}
              <div className="w-12 h-12 rounded-full bg-accent/15 flex items-center justify-center shrink-0">
                {community.icon_url ? (
                  <img
                    src={community.icon_url}
                    alt={community.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <Users className="w-6 h-6 text-accent" />
                )}
              </div>

              {/* Community info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-text-main text-[14px] truncate">
                    {community.name}
                  </p>
                  {community.last_announcement_at && (
                    <span className="text-[11px] text-text-secondary ml-2 shrink-0">
                      {formatTime(community.last_announcement_at)}
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-text-secondary truncate">
                  {community.last_announcement ||
                    formatMembers(community.member_count)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Bottom: New Community shortcut */}
      <div className="px-4 py-3 border-t border-border">
        <button
          onClick={onCreateCommunity}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[14px] font-medium text-accent hover:bg-accent/10 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Community
        </button>
      </div>
    </aside>
  );
}

/** Imperative handle so parent can trigger a refresh */
export type CommunitySidebarRefresh = () => void;
