import {
  Edit,
  Search,
  MoreVertical,
  Users,
  MessageSquare,
  CheckSquare,
  Check,
  CheckCheck,
  LogOut,
  ChevronDown,
  Lock,
  Plus,
  Mic,
  Camera,
  Video,
  Timer,
  RotateCcw,
  Ban,
  X,
  BellOff,
  Trash2,
  Archive,
  Star,
  Pin,
  List,
  ShieldBan,
} from "lucide-react";
import { useState, useMemo, useRef, useEffect } from "react";
import { useClickOutside } from "../../hooks/useClickOutside";
import { useChat } from "../../contexts/ChatContext";
import { SidebarSkeleton } from "../ui/Skeleton";
import { NewChatPanel } from "./NewChatPanel";
import { NewContactPanel } from "./NewContactPanel";
import { NewGroupPanel } from "./NewGroupPanel";
import { MuteConversationModal, type MuteDuration } from "./MuteConversationModal";

interface SidebarProps {
  onOpenNewChat?: () => void;
  isNewContactOpen?: boolean;
  onOpenNewContact?: () => void;
  onCloseNewContact?: () => void;
  isNewGroupOpen?: boolean;
  onOpenNewGroup?: () => void;
  onCloseNewGroup?: () => void;
}

function SidebarStatus({
  status,
}: {
  status: "sending" | "sent" | "delivered" | "read";
}) {
  if (status === "sending") {
    return (
      <span className="shrink-0 inline-flex items-center text-text-secondary">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-3 h-3 animate-spin"
        >
          <circle
            cx="12"
            cy="12"
            r="10"
            strokeDasharray="31.4"
            strokeDashoffset="10"
          />
        </svg>
      </span>
    );
  }
  if (status === "sent") {
    return (
      <span className="shrink-0 inline-flex items-center text-text-secondary">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-3 h-3"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </span>
    );
  }
  if (status === "delivered") {
    return (
      <span className="shrink-0 inline-flex items-center text-text-secondary">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-3 h-3"
        >
          <polyline points="18 7 9.5 17 5 12" />
          <polyline points="23 7 14.5 17 12 14" />
        </svg>
      </span>
    );
  }
  // read
  return (
    <span className="shrink-0 inline-flex items-center text-accent">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-3 h-3"
      >
        <polyline points="18 7 9.5 17 5 12" />
        <polyline points="23 7 14.5 17 12 14" />
      </svg>
    </span>
  );
}

export function Sidebar({
  isNewContactOpen: isNewContactOpenProp,
  onOpenNewContact,
  onCloseNewContact,
  isNewGroupOpen: isNewGroupOpenProp,
  onOpenNewGroup,
  onCloseNewGroup,
}: SidebarProps = {}) {
  const [activeFilter, setActiveFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectMenuOpen, setIsSelectMenuOpen] = useState(false);
  const [openConvMenuId, setOpenConvMenuId] = useState<string | null>(null);
  const convMenuRef = useRef<HTMLDivElement | null>(null);

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

  // Panels controlled by parent (ChatIndex) so ChatArea can also open them
  const isNewContactOpen = isNewContactOpenProp ?? false;
  const isNewGroupOpen = isNewGroupOpenProp ?? false;

  const menuRef = useClickOutside<HTMLDivElement>(() => setIsMenuOpen(false));
  const selectMenuRef = useClickOutside<HTMLDivElement>(() =>
    setIsSelectMenuOpen(false),
  );

  const filters = ["All", "Unread", "Favorites"];
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const filterMenuRef = useClickOutside<HTMLDivElement>(() =>
    setIsFilterMenuOpen(false),
  );

  const {
    conversations,
    conversationsLoading,
    activeConversation,
    setActiveConversation,
    addOrUpdateConversation,
    feedStatusUserIds,
    markAllAsRead,
    markAsUnread,
    clearConversationById,
    muteConversation,
    unmuteConversation,
  } = useChat();

  const [mutingConvId, setMutingConvId] = useState<string | null>(null);

  const exitSelectMode = () => {
    setIsSelectMode(false);
    setSelectedIds(new Set());
    setIsSelectMenuOpen(false);
  };

  const handleMarkSelectedAsUnread = () => {
    if (selectedIds.size > 0) {
      void markAsUnread(Array.from(selectedIds));
    }
    exitSelectMode();
  };

  const handleClearSelected = () => {
    selectedIds.forEach((id) => clearConversationById(id));
    exitSelectMode();
  };

  // Filter + search + sort conversations
  const filteredConversations = useMemo(() => {
    let list = [...conversations];

    // Apply filter chip
    if (activeFilter === "Unread") {
      list = list.filter((c) => c.unreadCount > 0);
    } else if (activeFilter === "Groups") {
      list = list.filter((c) => c.type === "group");
    }
    // "Favorites", "Archived", "Muted" — no data yet, show empty
    if (["Favorites", "Archived", "Muted"].includes(activeFilter)) {
      list = [];
    }

    // Apply search
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
  }, [conversations, activeFilter, searchQuery]);

  return (
    <aside className="w-full md:w-[var(--width-sidebar)] md:min-w-[var(--width-sidebar)] bg-card flex flex-col border-r border-border h-full relative overflow-hidden">
      {/* Slide-in Panels */}
      <NewChatPanel
        isOpen={isNewChatOpen}
        onClose={() => setIsNewChatOpen(false)}
        onOpenNewContact={() => onOpenNewContact?.()}
      />
      <NewContactPanel
        isOpen={isNewContactOpen}
        onClose={() => onCloseNewContact?.()}
        onContactSaved={(conv) => {
          addOrUpdateConversation(conv);
          setActiveConversation(conv);
          onCloseNewContact?.();
          setIsNewChatOpen(false);
        }}
      />
      <NewGroupPanel
        isOpen={isNewGroupOpen}
        onClose={() => onCloseNewGroup?.()}
      />

      {/* Sidebar Header */}
      {isSelectMode ? (
        /* ── Select mode header ── */
        <div className="flex items-center px-3 h-[72px] shrink-0 gap-1 border-b border-border/40">
          <button
            onClick={exitSelectMode}
            className="w-9 h-9 rounded-full flex items-center justify-center text-text-secondary hover:text-text-main hover:bg-input transition-colors"
            aria-label="Exit select mode"
          >
            <X className="w-5 h-5" />
          </button>
          <span className="flex-1 px-2 text-[17px] font-semibold text-text-main">
            Selected: {selectedIds.size}
          </span>
          <div className="relative" ref={selectMenuRef}>
            <button
              className="w-9 h-9 rounded-full flex items-center justify-center text-text-secondary hover:text-text-main hover:bg-input transition-colors"
              aria-label="Selection options"
              onClick={() => setIsSelectMenuOpen(!isSelectMenuOpen)}
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {isSelectMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-60 bg-card border border-border/80 rounded-xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2">
                <button
                  onClick={handleMarkSelectedAsUnread}
                  disabled={selectedIds.size === 0}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-[13.5px] text-text-main hover:bg-input/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <CheckCheck className="w-4 h-4 text-accent" /> Mark as unread
                </button>
                <button
                  disabled
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-[13.5px] text-text-main opacity-40 cursor-not-allowed"
                >
                  <BellOff className="w-4 h-4 text-text-secondary" /> Mute
                  notifications
                </button>
                <div className="w-full h-px bg-border/50 my-1"></div>
                <button
                  onClick={handleClearSelected}
                  disabled={selectedIds.size === 0}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-[13.5px] font-medium text-danger hover:bg-danger/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-4 h-4" /> Clear selected chats
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ── Normal header ── */
        <div className="flex items-center justify-between p-4 h-[72px] shrink-0">
          <h1 className="text-2xl md:text-xl font-bold text-text-main">Chat</h1>
          <div className="flex gap-1">
            <button
              onClick={() => setIsNewChatOpen(true)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:text-text-main hover:bg-input transition-colors"
              aria-label="New chat"
            >
              <Edit className="w-4 h-4" />
            </button>
            <div className="relative" ref={menuRef}>
              <button
                className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:text-text-main hover:bg-input transition-colors"
                aria-label="Menu"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              {isMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-card border border-border/80 rounded-xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2">
                  <button
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[13.5px] text-text-main hover:bg-input/80 transition-colors"
                    onClick={() => {
                      onOpenNewGroup?.();
                      setIsMenuOpen(false);
                    }}
                  >
                    <Users className="w-4 h-4 text-text-secondary" /> New group
                  </button>
                  <button className="w-full flex items-center gap-3 px-4 py-2.5 text-[13.5px] text-text-main hover:bg-input/80 transition-colors">
                    <MessageSquare className="w-4 h-4 text-text-secondary" />{" "}
                    Important messages
                  </button>
                  <div className="w-full h-px bg-border/50 my-1"></div>
                  <button
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[13.5px] text-text-main hover:bg-input/80 transition-colors"
                    onClick={() => {
                      setIsSelectMode(true);
                      setIsMenuOpen(false);
                    }}
                  >
                    <CheckSquare className="w-4 h-4 text-text-secondary" />{" "}
                    Select chat
                  </button>
                  <button
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[13.5px] text-text-main hover:bg-input/80 transition-colors"
                    onClick={() => {
                      void markAllAsRead();
                      setIsMenuOpen(false);
                    }}
                  >
                    <Check className="w-4 h-4 text-text-secondary" /> Mark all
                    as read
                  </button>
                  <div className="w-full h-px bg-border/50 my-1"></div>
                  <button className="w-full flex items-center gap-3 px-4 py-2.5 text-[13.5px] font-medium text-danger hover:bg-danger/10 transition-colors">
                    <LogOut className="w-4 h-4" /> Disconnect
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Search Input */}
      <div className="px-4 pb-3">
        <div className="flex items-center bg-input/80 rounded-lg h-9 px-3 border border-border/50 focus-within:border-accent/50 transition-colors">
          <Search className="w-4 h-4 text-text-secondary shrink-0 mr-2" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-[13px] text-text-main placeholder:text-text-secondary"
          />
        </div>
      </div>

      {/* Filter Chips */}
      <div className="px-4 pb-3 flex items-center gap-2">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none flex-1 min-w-0">
          {filters.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-3.5 py-1.5 rounded-full text-[12.5px] font-medium transition-colors whitespace-nowrap ${
                activeFilter === filter
                  ? "bg-accent text-white shadow-sm"
                  : "bg-input/60 text-text-secondary hover:text-text-main hover:bg-input"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
        {/* More filters dropdown — outside the scrollable container */}
        <div className="relative shrink-0" ref={filterMenuRef}>
          <button
            onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
            className="w-8 h-[30px] rounded-full flex items-center justify-center bg-input/60 text-text-secondary hover:text-text-main hover:bg-input transition-colors"
            aria-label="More filters"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          {isFilterMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-44 bg-card border border-border/80 rounded-xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2">
              <button
                onClick={() => {
                  setActiveFilter("Groups");
                  setIsFilterMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-[13px] transition-colors ${
                  activeFilter === "Groups"
                    ? "text-accent font-medium"
                    : "text-text-main hover:bg-input/80"
                }`}
              >
                <Users className="w-4 h-4 text-text-secondary" />
                Groups
              </button>
              <button
                onClick={() => {
                  setIsFilterMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-text-main hover:bg-input/80 transition-colors"
              >
                <Plus className="w-4 h-4 text-text-secondary" />
                New list
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-border hover:scrollbar-thumb-toggle-off">
        {conversationsLoading && conversations.length === 0 && (
          <SidebarSkeleton />
        )}
        {!conversationsLoading && filteredConversations.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-text-secondary text-[13px] gap-2">
            <Search className="w-5 h-5" />
            <p>
              {searchQuery.trim()
                ? "No conversations found"
                : activeFilter !== "All"
                  ? `No ${activeFilter.toLowerCase()} conversations`
                  : "No conversations yet"}
            </p>
          </div>
        )}
        {filteredConversations.map((chat) => (
          <div
            key={chat.id}
            role="button"
            tabIndex={0}
            onClick={() => {
              if (isSelectMode) {
                setSelectedIds((prev) => {
                  const next = new Set(prev);
                  if (next.has(chat.id)) next.delete(chat.id);
                  else next.add(chat.id);
                  return next;
                });
              } else {
                setActiveConversation(chat);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                if (isSelectMode) {
                  setSelectedIds((prev) => {
                    const next = new Set(prev);
                    if (next.has(chat.id)) next.delete(chat.id);
                    else next.add(chat.id);
                    return next;
                  });
                } else {
                  setActiveConversation(chat);
                }
              }
            }}
            className={`group flex items-center gap-3 px-4 py-3.5 md:py-3 cursor-pointer transition-colors relative ${
              isSelectMode
                ? selectedIds.has(chat.id)
                  ? "bg-accent/10"
                  : "hover:bg-input/50"
                : activeConversation?.id === chat.id
                  ? "bg-accent/15 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3px] before:bg-accent before:rounded-r-full"
                  : "hover:bg-input/50"
            }`}
          >
            {/* Select mode checkbox */}
            {isSelectMode && (
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                  selectedIds.has(chat.id)
                    ? "bg-accent border-accent"
                    : "border-border"
                }`}
              >
                {selectedIds.has(chat.id) && (
                  <Check className="w-3 h-3 text-white stroke-[3]" />
                )}
              </div>
            )}
            <div className="relative inline-block shrink-0">
              {(() => {
                const hasStatus =
                  chat.type === "direct" &&
                  chat.participants.some((p) => feedStatusUserIds.has(p));
                return (
                  <div
                    className={`relative inline-block shrink-0${
                      hasStatus
                        ? " ring-2 ring-blue-500 ring-offset-2 ring-offset-card rounded-full"
                        : ""
                    }`}
                  >
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
                    {chat.isOnline && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-success border-2 border-bg md:border-card box-content"></span>
                    )}
                  </div>
                );
              })()}
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
                      <div className="absolute right-0 top-full mt-1 w-52 bg-card border border-border/80 rounded-xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2">
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenConvMenuId(null);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-text-main hover:bg-input/80 transition-colors cursor-pointer"
                        >
                          <Archive className="w-4 h-4 text-text-secondary" />{" "}
                          Archive chat
                        </div>
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setMutingConvId(chat.id);
                            setOpenConvMenuId(null);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-text-main hover:bg-input/80 transition-colors cursor-pointer"
                        >
                          <BellOff className="w-4 h-4 text-text-secondary" />{" "}
                          {chat.isMuted ? "Unmute notifications" : "Mute notifications"}
                        </div>
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenConvMenuId(null);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-text-main hover:bg-input/80 transition-colors cursor-pointer"
                        >
                          <Pin className="w-4 h-4 text-text-secondary" /> Pin
                          chat
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
                          as read
                        </div>
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenConvMenuId(null);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-text-main hover:bg-input/80 transition-colors cursor-pointer"
                        >
                          <Star className="w-4 h-4 text-text-secondary" /> Add
                          to favorites
                        </div>
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenConvMenuId(null);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-text-main hover:bg-input/80 transition-colors cursor-pointer"
                        >
                          <X className="w-4 h-4 text-text-secondary" /> Close
                          chat
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
                {chat.isTyping ? (
                  <span className="text-[13px] text-accent italic whitespace-nowrap overflow-hidden text-ellipsis min-w-0">
                    typing...
                  </span>
                ) : chat.lastReaction ? (
                  <span className="text-[13px] whitespace-nowrap overflow-hidden text-ellipsis text-text-secondary min-w-0">
                    {chat.lastReaction}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 min-w-0 overflow-hidden">
                    {chat.lastMessageIsMine &&
                      chat.lastMessageStatus &&
                      !chat.lastMessageDeleted && (
                        <SidebarStatus status={chat.lastMessageStatus} />
                      )}
                    {chat.lastMessageViewOnce &&
                    chat.lastMessageIsMine &&
                    chat.lastMessageViewedAt ? (
                      <>
                        <RotateCcw className="w-3.5 h-3.5 shrink-0 text-accent" />
                        <span className="text-[13px] whitespace-nowrap text-accent">
                          Opened
                        </span>
                      </>
                    ) : chat.lastMessageViewOnce && chat.lastMessageIsMine ? (
                      <>
                        <Timer className="w-3.5 h-3.5 shrink-0 text-text-secondary" />
                        <span
                          className={`text-[13px] whitespace-nowrap ${chat.unreadCount > 0 ? "text-text-main font-medium" : "text-text-secondary"}`}
                        >
                          {chat.lastMediaType === "audio"
                            ? "Voice message"
                            : chat.lastMediaType === "video"
                              ? "Video"
                              : "Photo"}
                        </span>
                      </>
                    ) : chat.lastMessageViewOnce &&
                      !chat.lastMessageIsMine &&
                      chat.lastMessageViewedAt ? (
                      <>
                        <Timer className="w-3.5 h-3.5 shrink-0 text-accent" />
                        <span className="text-[13px] whitespace-nowrap text-accent">
                          Opened
                        </span>
                      </>
                    ) : chat.lastMessageViewOnce && !chat.lastMessageIsMine ? (
                      <>
                        <Timer className="w-3.5 h-3.5 shrink-0 text-text-secondary" />
                        <span
                          className={`text-[13px] whitespace-nowrap ${chat.unreadCount > 0 ? "text-text-main font-medium" : "text-text-secondary"}`}
                        >
                          {chat.lastMediaType === "audio"
                            ? "Voice message"
                            : chat.lastMediaType === "video"
                              ? "Video"
                              : "Photo"}
                        </span>
                      </>
                    ) : chat.lastMessageDeleted ? (
                      <>
                        <Ban className="w-3.5 h-3.5 shrink-0 text-text-secondary" />
                        <span className="text-[13px] whitespace-nowrap overflow-hidden text-ellipsis text-text-secondary italic">
                          Message deleted
                        </span>
                      </>
                    ) : chat.lastMediaType === "audio" ? (
                      <>
                        <Mic className="w-3.5 h-3.5 shrink-0 text-text-secondary" />
                        <span
                          className={`text-[13px] whitespace-nowrap ${chat.unreadCount > 0 ? "text-text-main font-medium" : "text-text-secondary"}`}
                        >
                          {chat.lastMediaDuration
                            ? `${Math.floor(chat.lastMediaDuration / 60)}:${String(Math.floor(chat.lastMediaDuration % 60)).padStart(2, "0")}`
                            : "0:00"}
                        </span>
                      </>
                    ) : chat.lastMediaType === "image" ? (
                      <>
                        <Camera className="w-3.5 h-3.5 shrink-0 text-text-secondary" />
                        <span
                          className={`text-[13px] whitespace-nowrap overflow-hidden text-ellipsis ${chat.unreadCount > 0 ? "text-text-main font-medium" : "text-text-secondary"}`}
                        >
                          {chat.lastMessage || "Photo"}
                        </span>
                      </>
                    ) : chat.lastMediaType === "video" ? (
                      <>
                        <Video className="w-3.5 h-3.5 shrink-0 text-text-secondary" />
                        <span
                          className={`text-[13px] whitespace-nowrap overflow-hidden text-ellipsis ${chat.unreadCount > 0 ? "text-text-main font-medium" : "text-text-secondary"}`}
                        >
                          {chat.lastMessage || "Video"}
                        </span>
                      </>
                    ) : (
                      <span
                        className={`text-[13px] whitespace-nowrap overflow-hidden text-ellipsis ${chat.unreadCount > 0 ? "text-text-main font-medium" : "text-text-secondary"}`}
                      >
                        {chat.lastMessage}
                      </span>
                    )}
                  </span>
                )}
                {chat.unreadCount > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-accent text-white text-[10px] font-bold px-1.5 shrink-0">
                    {chat.unreadCount}
                  </span>
                )}
                {chat.isMuted && chat.unreadCount === 0 && (
                  <BellOff className="w-3.5 h-3.5 text-text-secondary shrink-0" />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* E2E encrypted notice — visible on mobile at bottom of chat list */}
      <div className="md:hidden shrink-0 flex items-center justify-center gap-1.5 py-3 text-[11px] text-text-secondary select-none">
        <Lock className="w-3 h-3 shrink-0" />
        <span>
          Your messages are{" "}
          <a href="#" className="text-accent hover:underline">
            end-to-end encrypted.
          </a>
        </span>
      </div>
      {/* Bottom spacing for mobile nav bar */}
      <div className="h-[4px] md:hidden shrink-0"></div>

      {/* Mute modal (triggered from per-conversation context menu) */}
      {mutingConvId && (() => {
        const conv = conversations.find((c) => c.id === mutingConvId);
        return (
          <MuteConversationModal
            isOpen={true}
            conversationName={conv?.name ?? ""}
            isMuted={conv?.isMuted ?? false}
            onCancel={() => setMutingConvId(null)}
            onMute={(duration: MuteDuration) => {
              muteConversation(mutingConvId, duration);
              setMutingConvId(null);
            }}
            onUnmute={() => {
              unmuteConversation(mutingConvId);
              setMutingConvId(null);
            }}
          />
        );
      })()}
    </aside>
  );
}
