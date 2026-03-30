import {
  Search,
  Archive,
  ArchiveRestore,
  Check,
  Star,
  List,
  ShieldBan,
  Trash2,
  ChevronDown,
  BellOff,
} from "lucide-react";
import { useState, useMemo, useRef, useEffect } from "react";
import { useChat } from "../../contexts/ChatContext";
import type { Conversation } from "../../contexts/ChatContext";
import {
  MuteConversationModal,
  type MuteDuration,
} from "./MuteConversationModal";

interface ArchiveSidebarProps {
  onSelectChat?: (conv: Conversation) => void;
}

export function ArchiveSidebar({ onSelectChat }: ArchiveSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [openConvMenuId, setOpenConvMenuId] = useState<string | null>(null);
  const [mutingConvId, setMutingConvId] = useState<string | null>(null);
  const convMenuRef = useRef<HTMLDivElement | null>(null);

  const {
    conversations,
    conversationsLoading,
    markAsUnread,
    clearConversationById,
    unmuteConversation,
    unarchiveConversation,
    addToFavorites,
    removeFromFavorites,
    blockConversationUser,
    deleteConversationById,
  } = useChat();

  useEffect(() => {
    if (!openConvMenuId) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        convMenuRef.current &&
        !convMenuRef.current.contains(e.target as Node)
      ) {
        setOpenConvMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openConvMenuId]);

  // Filter only archived conversations
  const archivedConversations = useMemo(() => {
    let list = conversations.filter((c) => c.isArchived);

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((c) => c.name.toLowerCase().includes(q));
    }

    // Sort by last message timestamp (most recent first)
    list.sort((a, b) => {
      const ta = a.lastMessageTimestamp
        ? new Date(a.lastMessageTimestamp).getTime()
        : 0;
      const tb = b.lastMessageTimestamp
        ? new Date(b.lastMessageTimestamp).getTime()
        : 0;
      return tb - ta;
    });

    return list;
  }, [conversations, searchQuery]);

  return (
    <aside className="w-full md:w-[var(--width-sidebar)] md:min-w-[var(--width-sidebar)] bg-card flex flex-col border-r border-border h-full relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 h-[72px] shrink-0">
        <div className="flex items-center gap-2">
          <Archive className="w-5 h-5 text-accent" />
          <h1 className="text-2xl md:text-xl font-bold text-text-main">
            Archived
          </h1>
        </div>
      </div>

      {/* Description */}
      <div className="px-4 pb-3">
        <p className="text-[12px] text-text-secondary leading-relaxed">
          These chats stay archived when new messages are received. To change
          this option, go to Settings &gt; Chat on your phone.
        </p>
      </div>

      {/* Search Input */}
      <div className="px-4 pb-3">
        <div className="flex items-center bg-input/80 rounded-lg h-9 px-3 border border-border/50 focus-within:border-accent/50 transition-colors">
          <Search className="w-4 h-4 text-text-secondary shrink-0 mr-2" />
          <input
            type="text"
            placeholder="Search archived chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-[13px] text-text-main placeholder:text-text-secondary"
          />
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-border hover:scrollbar-thumb-toggle-off">
        {conversationsLoading && archivedConversations.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-text-secondary text-[13px] gap-2">
            <div className="w-5 h-5 border-2 border-text-secondary border-t-transparent rounded-full animate-spin" />
            <p>Loading...</p>
          </div>
        )}
        {!conversationsLoading && archivedConversations.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-text-secondary text-[13px] gap-2">
            <Archive className="w-8 h-8 text-text-secondary/50" />
            <p>
              {searchQuery.trim()
                ? "No archived chats found"
                : "No archived chats"}
            </p>
          </div>
        )}
        {archivedConversations.map((chat) => (
          <div
            key={chat.id}
            role="button"
            tabIndex={0}
            onClick={() => onSelectChat?.(chat)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelectChat?.(chat);
              }
            }}
            className="group flex items-center gap-3 px-4 py-3.5 md:py-3 cursor-pointer transition-colors relative hover:bg-input/50"
          >
            {/* Avatar */}
            <div className="relative inline-block shrink-0">
              {chat.avatar ? (
                <img
                  src={chat.avatar}
                  alt={chat.name}
                  className="w-[48px] h-[48px] min-w-[48px] md:w-[42px] md:h-[42px] md:min-w-[42px] rounded-full object-cover"
                />
              ) : (
                <div
                  className="w-[48px] h-[48px] min-w-[48px] md:w-[42px] md:h-[42px] md:min-w-[42px] rounded-full flex items-center justify-center font-bold text-[14px] md:text-[13px] text-white"
                  style={{ background: chat.gradient }}
                >
                  {chat.initials}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0 py-0.5">
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <span className="font-semibold text-[14px] text-text-main whitespace-nowrap overflow-hidden text-ellipsis">
                  {chat.name}
                </span>
                <div className="flex items-center gap-1 shrink-0 relative">
                  <span
                    className={`text-[11px] whitespace-nowrap ${chat.unreadCount > 0 ? "text-accent font-medium" : "text-text-secondary"} ${openConvMenuId === chat.id ? "opacity-0" : ""}`}
                  >
                    {chat.lastMessageTime}
                  </span>
                  <div
                    ref={openConvMenuId === chat.id ? convMenuRef : null}
                    className="relative"
                  >
                    <span
                      tabIndex={0}
                      aria-label="Conversation options"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.stopPropagation();
                          setOpenConvMenuId((prev) =>
                            prev === chat.id ? null : chat.id,
                          );
                        }
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenConvMenuId((prev) =>
                          prev === chat.id ? null : chat.id,
                        );
                      }}
                      className={`w-5 h-5 flex items-center justify-center rounded-full text-text-secondary hover:text-text-main cursor-pointer transition-opacity ${
                        openConvMenuId === chat.id
                          ? "opacity-100"
                          : "opacity-0 group-hover:opacity-100"
                      }`}
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </span>
                    {openConvMenuId === chat.id && (
                      <div className="absolute right-0 top-full mt-1 w-56 bg-card border border-border/80 rounded-xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2">
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            unarchiveConversation(chat.id);
                            setOpenConvMenuId(null);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-text-main hover:bg-input/80 transition-colors cursor-pointer"
                        >
                          <ArchiveRestore className="w-4 h-4 text-text-secondary" />{" "}
                          Unarchive chat
                        </div>
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            void markAsUnread([chat.id]);
                            setOpenConvMenuId(null);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-text-main hover:bg-input/80 transition-colors cursor-pointer"
                        >
                          <Check className="w-4 h-4 text-text-secondary" /> Mark
                          as unread
                        </div>
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            if (chat.isFavorite) removeFromFavorites(chat.id);
                            else addToFavorites(chat.id);
                            setOpenConvMenuId(null);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-text-main hover:bg-input/80 transition-colors cursor-pointer"
                        >
                          <Star className="w-4 h-4 text-text-secondary" />{" "}
                          {chat.isFavorite
                            ? "Remove from favorites"
                            : "Add to favorites"}
                        </div>
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenConvMenuId(null);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-text-main hover:bg-input/80 transition-colors cursor-pointer"
                        >
                          <List className="w-4 h-4 text-text-secondary" /> Add
                          to list
                        </div>
                        <div className="w-full h-px bg-border/50 my-1" />
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            void blockConversationUser(chat.id);
                            setOpenConvMenuId(null);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-danger hover:bg-danger/10 transition-colors cursor-pointer"
                        >
                          <ShieldBan className="w-4 h-4" /> Block
                        </div>
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            clearConversationById(chat.id);
                            setOpenConvMenuId(null);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-danger hover:bg-danger/10 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" /> Clear chat
                        </div>
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteConversationById(chat.id);
                            setOpenConvMenuId(null);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-danger hover:bg-danger/10 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" /> Delete chat
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1 min-w-0 overflow-hidden">
                  <span
                    className={`text-[13px] whitespace-nowrap overflow-hidden text-ellipsis ${chat.unreadCount > 0 ? "text-text-main font-medium" : "text-text-secondary"}`}
                  >
                    {chat.lastMessage || ""}
                  </span>
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  {chat.isMuted && (
                    <BellOff className="w-3.5 h-3.5 text-text-secondary/60" />
                  )}
                  {chat.unreadCount > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[20px] h-5 rounded-full bg-accent text-white text-[11px] font-bold px-1.5">
                      {chat.unreadCount > 99 ? "99+" : chat.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Mute Modal */}
      {mutingConvId && (
        <MuteConversationModal
          onMute={(d: MuteDuration) => {
            // Not used in archive but keeping for consistency
            setMutingConvId(null);
          }}
          onClose={() => setMutingConvId(null)}
        />
      )}
    </aside>
  );
}
