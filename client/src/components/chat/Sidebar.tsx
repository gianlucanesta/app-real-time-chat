import {
  Edit,
  Search,
  MoreVertical,
  Users,
  MessageSquare,
  CheckSquare,
  Check,
  LogOut,
  ChevronDown,
  Lock,
} from "lucide-react";
import { useState } from "react";
import { useClickOutside } from "../../hooks/useClickOutside";
import { useChat } from "../../contexts/ChatContext";
import { NewChatPanel } from "./NewChatPanel";
import { NewContactPanel } from "./NewContactPanel";

export function Sidebar() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [isNewContactOpen, setIsNewContactOpen] = useState(false);

  const menuRef = useClickOutside<HTMLDivElement>(() => setIsMenuOpen(false));

  const filters = ["All", "Unread", "Favorites"];
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const filterMenuRef = useClickOutside<HTMLDivElement>(() =>
    setIsFilterMenuOpen(false),
  );

  const {
    conversations,
    activeConversation,
    setActiveConversation,
    addOrUpdateConversation,
  } = useChat();

  return (
    <aside className="w-full md:w-[var(--width-sidebar)] md:min-w-[var(--width-sidebar)] bg-bg md:bg-card flex flex-col border-r border-border h-full relative overflow-hidden">
      {/* Slide-in Panels */}
      <NewChatPanel
        isOpen={isNewChatOpen}
        onClose={() => setIsNewChatOpen(false)}
        onOpenNewContact={() => setIsNewContactOpen(true)}
      />
      <NewContactPanel
        isOpen={isNewContactOpen}
        onClose={() => setIsNewContactOpen(false)}
        onContactSaved={(conv) => {
          addOrUpdateConversation(conv);
          setActiveConversation(conv);
          setIsNewContactOpen(false);
          setIsNewChatOpen(false);
        }}
      />

      {/* Sidebar Header */}
      <div className="flex items-center justify-between p-4 h-[72px] shrink-0">
        <h1 className="text-xl font-bold text-text-main">Chat</h1>
        <div className="flex gap-1">
          <button
            onClick={() => setIsNewChatOpen(true)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:text-text-main hover:bg-input transition-colors"
          >
            <Edit className="w-4 h-4" />
          </button>
          <div className="relative" ref={menuRef}>
            <button
              className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:text-text-main hover:bg-input transition-colors"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {isMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-card border border-border/80 rounded-xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2">
                <button className="w-full flex items-center gap-3 px-4 py-2.5 text-[13.5px] text-text-main hover:bg-input/80 transition-colors">
                  <Users className="w-4 h-4 text-text-secondary" /> New group
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-2.5 text-[13.5px] text-text-main hover:bg-input/80 transition-colors">
                  <MessageSquare className="w-4 h-4 text-text-secondary" />{" "}
                  Important messages
                </button>
                <div className="w-full h-px bg-border/50 my-1"></div>
                <button className="w-full flex items-center gap-3 px-4 py-2.5 text-[13.5px] text-text-main hover:bg-input/80 transition-colors">
                  <CheckSquare className="w-4 h-4 text-text-secondary" /> Select
                  chat
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-2.5 text-[13.5px] text-text-main hover:bg-input/80 transition-colors">
                  <Check className="w-4 h-4 text-text-secondary" /> Mark all as
                  read
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

      {/* Search Input */}
      <div className="px-4 pb-3">
        <div className="flex items-center bg-input/80 rounded-lg h-9 px-3 border border-border/50 focus-within:border-accent/50 transition-colors">
          <Search className="w-4 h-4 text-text-secondary shrink-0 mr-2" />
          <input
            type="text"
            placeholder="Search conversations..."
            className="flex-1 bg-transparent border-none outline-none text-[13px] text-text-main placeholder:text-text-secondary"
          />
        </div>
      </div>

      {/* Filter Chips */}
      <div className="px-4 pb-3 flex items-center gap-2 overflow-x-auto scrollbar-none">
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
        {/* More filters dropdown */}
        <div className="relative shrink-0" ref={filterMenuRef}>
          <button
            onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
            className="w-8 h-[30px] rounded-full flex items-center justify-center bg-input/60 text-text-secondary hover:text-text-main hover:bg-input transition-colors"
            aria-label="More filters"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          {isFilterMenuOpen && (
            <div className="absolute left-0 top-full mt-2 w-40 bg-card border border-border/80 rounded-xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2">
              {["Groups", "Archived", "Muted"].map((opt) => (
                <button
                  key={opt}
                  onClick={() => {
                    setActiveFilter(opt);
                    setIsFilterMenuOpen(false);
                  }}
                  className={`w-full flex items-center px-4 py-2.5 text-[13px] transition-colors ${
                    activeFilter === opt
                      ? "text-accent font-medium"
                      : "text-text-main hover:bg-input/80"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-border hover:scrollbar-thumb-toggle-off">
        {conversations.map((chat) => (
          <div
            key={chat.id}
            onClick={() => setActiveConversation(chat)}
            className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors relative ${
              activeConversation?.id === chat.id
                ? "bg-accent/5 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-accent before:rounded-r-full"
                : "hover:bg-input/50"
            }`}
          >
            <div className="relative inline-block shrink-0">
              <div
                className="w-[42px] h-[42px] rounded-full flex items-center justify-center font-bold text-[13px] text-white"
                style={{ background: chat.gradient }}
              >
                {chat.initials}
              </div>
              {chat.isOnline && (
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-success border-2 border-bg md:border-card box-content"></span>
              )}
            </div>

            <div className="flex-1 min-w-0 py-0.5">
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <span className="font-semibold text-[14px] text-text-main whitespace-nowrap overflow-hidden text-ellipsis">
                  {chat.name}
                </span>
                <span
                  className={`text-[11px] whitespace-nowrap shrink-0 ${chat.unreadCount > 0 ? "text-accent font-medium" : "text-text-secondary"}`}
                >
                  {chat.lastMessageTime}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                {chat.isTyping ? (
                  <span className="text-[13px] text-accent italic whitespace-nowrap overflow-hidden text-ellipsis">
                    typing...
                  </span>
                ) : (
                  <span
                    className={`text-[13px] whitespace-nowrap overflow-hidden text-ellipsis ${chat.unreadCount > 0 ? "text-text-main font-medium" : "text-text-secondary"}`}
                  >
                    {chat.lastMessage}
                  </span>
                )}
                {chat.unreadCount > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-accent text-white text-[10px] font-bold px-1.5 shrink-0">
                    {chat.unreadCount}
                  </span>
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
    </aside>
  );
}
