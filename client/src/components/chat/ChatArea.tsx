import {
  Search,
  Video,
  Phone,
  MoreVertical,
  Paperclip,
  Smile,
  Mic,
  Send,
  CheckSquare,
  BellOff,
  Timer,
  Star,
  AlertTriangle,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { useClickOutside } from "../../hooks/useClickOutside";
import { ContactProfilePanel } from "./ContactProfilePanel";
import { EditContactPanel } from "./EditContactPanel";
import { ChatMessage } from "./ChatMessage";
import { CallScreen } from "./CallScreen";
import { ConfirmModal } from "./ConfirmModal";
import { useChat } from "../../contexts/ChatContext";

export function ChatArea() {
  const { activeConversation, activeMessages, sendMessage } = useChat();

  const [isContactInfoOpen, setIsContactInfoOpen] = useState(false);
  const [isEditContactOpen, setIsEditContactOpen] = useState(false);

  // Dropdowns
  const [isCallMenuOpen, setIsCallMenuOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  const callMenuRef = useClickOutside<HTMLDivElement>(() =>
    setIsCallMenuOpen(false),
  );
  const moreMenuRef = useClickOutside<HTMLDivElement>(() =>
    setIsMoreMenuOpen(false),
  );

  const handleOpenContactInfo = () => setIsContactInfoOpen(true);
  const handleCloseContactInfo = () => setIsContactInfoOpen(false);

  const handleOpenEditContact = () => setIsEditContactOpen(true);
  const handleCloseEditContact = () => setIsEditContactOpen(false);

  // Select Mode State
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);

  const toggleMessageSelection = (id: string) => {
    setSelectedMessages((prev) =>
      prev.includes(id) ? prev.filter((msgId) => msgId !== id) : [...prev, id],
    );
  };

  // Call & Modal State
  const [isCallScreenOpen, setIsCallScreenOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<
    "delete-messages" | "clear-chat" | "delete-chat" | null
  >(null);

  const contactName = activeConversation?.name || "";
  const contactInitials = activeConversation?.initials || "";
  const contactGradient = activeConversation?.gradient || "";

  if (!activeConversation) {
    return (
      <main className="flex-1 flex flex-col min-w-0 h-full relative overflow-hidden bg-bg">
        {/* Empty State — centered via CSS class */}
        <div className="chat-empty-state w-full" aria-hidden="false">
          <div className="chat-empty-actions">
            <button type="button" className="chat-empty-action">
              <div className="chat-empty-action-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                  <line x1="19" y1="8" x2="19" y2="14" />
                  <line x1="22" y1="11" x2="16" y2="11" />
                </svg>
              </div>
              <span>New contact</span>
            </button>
            <button type="button" className="chat-empty-action">
              <div className="chat-empty-action-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <span>New group</span>
            </button>
            <button type="button" className="chat-empty-action">
              <div className="chat-empty-action-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <span>Privacy</span>
            </button>
          </div>
          {/* End-to-end encryption notice */}
          <p className="mt-8 flex items-center gap-1.5 text-[12px] text-text-secondary select-none">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-3.5 h-3.5 shrink-0"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Your messages are{" "}
            <a href="#" className="text-accent hover:underline">
              end-to-end encrypted.
            </a>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col min-w-0 h-full relative overflow-hidden bg-bg">
      {/* Right Side Panels */}
      <ContactProfilePanel
        isOpen={isContactInfoOpen}
        onClose={handleCloseContactInfo}
        onEditClick={handleOpenEditContact}
        contactName={contactName}
        contactInitials={contactInitials}
        contactGradient={contactGradient}
      />
      <EditContactPanel
        isOpen={isEditContactOpen}
        onClose={handleCloseEditContact}
        contactName={contactName}
        contactInitials={contactInitials}
        contactGradient={contactGradient}
      />

      {/* Chat Header */}
      <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-border h-[72px] shrink-0 bg-bg md:bg-transparent z-10">
        <div
          className="flex items-center gap-3 md:gap-4 cursor-pointer hover:bg-input/50 p-1.5 md:p-2 -ml-1.5 md:-ml-2 rounded-xl transition-colors"
          onClick={handleOpenContactInfo}
        >
          <div className="relative inline-block">
            <div
              className="w-10 h-10 md:w-[42px] md:h-[42px] rounded-full flex items-center justify-center font-bold text-[13px] md:text-[14px] text-white shrink-0"
              style={{ background: contactGradient }}
            >
              {contactInitials}
            </div>
            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-success border-2 border-bg box-content"></span>
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="text-[15px] md:text-[16px] font-semibold text-text-main leading-tight truncate">
              {contactName}
            </h2>
            {activeConversation?.isOnline && (
              <div className="flex items-center gap-1.5 text-[11px] md:text-[12px] text-success mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-success"></span>
                Online
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 md:gap-2">
          <button className="hidden md:flex w-9 h-9 rounded-full items-center justify-center text-text-secondary hover:text-text-main hover:bg-input transition-colors">
            <Search className="w-5 h-5" />
          </button>

          {/* Call Dropdown Wrapper */}
          <div className="relative" ref={callMenuRef}>
            <button
              className="chat-call-btn w-9 h-9 md:w-auto md:h-9 md:px-4 rounded-full flex items-center justify-center md:justify-center gap-2 text-text-secondary md:bg-accent md:text-white hover:text-text-main hover:bg-input md:hover:bg-accent hover:brightness-110 transition-colors shadow-sm"
              onClick={() => setIsCallMenuOpen(!isCallMenuOpen)}
            >
              <Phone className="w-5 h-5 md:w-4 md:h-4" />
              <span className="hidden md:inline font-medium text-[13.5px]">
                Call
              </span>
            </button>
            {isCallMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-card border border-border/80 rounded-xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="px-4 py-3 flex items-center gap-3 border-b border-border/50 mb-1">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-[10px] text-white shrink-0"
                    style={{ background: contactGradient }}
                  >
                    {contactInitials}
                  </div>
                  <span className="text-[14px] font-semibold text-text-main truncate">
                    {contactName}
                  </span>
                </div>
                <button
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-[13.5px] text-text-main hover:bg-input/80 transition-colors"
                  onClick={() => {
                    setIsCallMenuOpen(false);
                    setIsCallScreenOpen(true);
                  }}
                >
                  <Phone className="w-[18px] h-[18px] text-text-secondary" />{" "}
                  Voice
                </button>
                <button
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-[13.5px] text-text-main hover:bg-input/80 transition-colors"
                  onClick={() => {
                    setIsCallMenuOpen(false);
                    setIsCallScreenOpen(true);
                  }}
                >
                  <Video className="w-[18px] h-[18px] text-text-secondary" />{" "}
                  Video
                </button>
              </div>
            )}
          </div>

          {/* More Options Dropdown Wrapper */}
          <div className="relative" ref={moreMenuRef}>
            <button
              className="w-9 h-9 rounded-full flex items-center justify-center text-text-secondary hover:text-text-main hover:bg-input transition-colors"
              onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
            >
              <MoreVertical className="w-5 h-5" />
            </button>
            {isMoreMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-card border border-border/80 rounded-xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2">
                <button
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-[13.5px] text-text-main hover:bg-input/80 transition-colors"
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    handleOpenContactInfo();
                  }}
                >
                  <Search className="w-4 h-4 text-text-secondary" /> Contact
                  info
                </button>
                <button
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-[13.5px] text-text-main hover:bg-input/80 transition-colors"
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    setIsSelectMode(true);
                  }}
                >
                  <CheckSquare className="w-4 h-4 text-text-secondary" /> Select
                  messages
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-2.5 text-[13.5px] text-text-main hover:bg-input/80 transition-colors">
                  <BellOff className="w-4 h-4 text-text-secondary" /> Mute
                  notifications
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-2.5 text-[13.5px] text-text-main hover:bg-input/80 transition-colors">
                  <Timer className="w-4 h-4 text-text-secondary" /> Disappearing
                  messages
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-2.5 text-[13.5px] text-text-main hover:bg-input/80 transition-colors">
                  <Star className="w-4 h-4 text-text-secondary" /> Add to
                  favorites
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-2.5 text-[13.5px] text-text-main hover:bg-input/80 transition-colors">
                  <CheckSquare className="w-4 h-4 text-text-secondary" /> Add to
                  list
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-2.5 text-[13.5px] text-text-main hover:bg-input/80 transition-colors">
                  <Trash2 className="w-4 h-4 text-text-secondary" /> Close chat
                </button>
                <div className="w-full h-px bg-border/50 my-1"></div>
                <button className="w-full flex items-center gap-3 px-4 py-2.5 text-[13.5px] text-text-main hover:bg-input/80 transition-colors">
                  <AlertTriangle className="w-4 h-4 text-text-secondary" />{" "}
                  Report
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-2.5 text-[13.5px] text-text-main hover:bg-input/80 transition-colors">
                  <ShieldAlert className="w-4 h-4 text-text-secondary" /> Block
                </button>
                <div className="w-full h-px bg-border/50 my-1"></div>
                <button
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-[13.5px] text-text-main hover:bg-input/80 transition-colors"
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    setActiveModal("clear-chat");
                  }}
                >
                  <Trash2 className="w-4 h-4 text-text-secondary" /> Clear chat
                </button>
                <button
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-[13.5px] text-danger hover:bg-danger/10 transition-colors font-medium"
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    setActiveModal("delete-chat");
                  }}
                >
                  <Trash2 className="w-4 h-4" /> Delete chat
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div
        className={`flex-1 overflow-y-auto px-4 md:px-8 flex flex-col pt-6 pb-2 md:pb-4 scrollbar-thin scrollbar-thumb-border hover:scrollbar-thumb-toggle-off ${isSelectMode ? "select-mode" : ""}`}
      >
        {/* Date Separator */}
        <div className="flex items-center justify-center gap-4 my-6">
          <div className="w-12 h-px bg-border"></div>
          <span className="text-[11px] font-medium text-text-secondary uppercase tracking-[1px]">
            TODAY
          </span>
          <div className="w-12 h-px bg-border"></div>
        </div>

        {activeMessages.map((msg) => (
          <ChatMessage
            key={msg.id}
            id={msg.id}
            text={msg.text}
            time={msg.timestamp}
            isSent={msg.isMe}
            status={msg.status}
            contactInitials={!msg.isMe ? contactInitials : undefined}
            contactGradient={!msg.isMe ? contactGradient : undefined}
            isSelectMode={isSelectMode}
            isSelected={selectedMessages.includes(msg.id)}
            onToggleSelect={() => toggleMessageSelection(msg.id)}
          />
        ))}

        {/* Temporary check for typing indicator (when another user type feature is mocked) */}
      </div>

      {/* Selection Action Bar */}
      <div
        className={`selection-bar ${isSelectMode ? "visible" : ""}`}
        aria-hidden={!isSelectMode}
      >
        <button
          className="selection-bar-cancel"
          onClick={() => {
            setIsSelectMode(false);
            setSelectedMessages([]);
          }}
          aria-label="Cancel selection"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-5 h-5"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <span className="selection-bar-count">
          {selectedMessages.length} selected
        </span>
        <div className="selection-bar-actions">
          <button
            className="selection-action-btn"
            data-sel-action="copy"
            aria-label="Copy"
            disabled={selectedMessages.length === 0}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5"
            >
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          </button>
          <button
            className="selection-action-btn"
            data-sel-action="star"
            aria-label="Star"
            disabled={selectedMessages.length === 0}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </button>
          <button
            className="selection-action-btn selection-action-btn--delete text-danger hover:bg-danger/10 transition-colors"
            data-sel-action="delete"
            aria-label="Delete selected"
            disabled={selectedMessages.length === 0}
            onClick={() => setActiveModal("delete-messages")}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14H6L5 6" />
              <path d="M10 11v6" />
              <path d="M14 11v6" />
              <path d="M9 6V4h6v2" />
            </svg>
          </button>
          <button
            className="selection-action-btn"
            data-sel-action="forward"
            aria-label="Forward"
            disabled={selectedMessages.length === 0}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5"
            >
              <polyline points="15 17 20 12 15 7" />
              <path d="M4 18v-2a4 4 0 0 1 4-4h12" />
            </svg>
          </button>
          <button
            className="selection-action-btn"
            data-sel-action="download"
            aria-label="Download"
            disabled={selectedMessages.length === 0}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
        </div>
      </div>

      {/* Chat Input Area */}
      <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 bg-gradient-to-t from-bg via-bg to-transparent">
        <div className="flex flex-col">
          <div className="flex items-center bg-input/80 backdrop-blur-md rounded-full border border-border/50 p-1.5 shadow-lg">
            <button
              className="w-10 h-10 rounded-full flex items-center justify-center text-text-secondary shrink-0 hover:bg-card hover:text-text-main transition-colors"
              aria-label="Add attachment"
            >
              <Paperclip className="w-[18px] h-[18px]" />
            </button>
            <button
              className="w-10 h-10 rounded-full flex items-center justify-center text-text-secondary shrink-0 hover:bg-card hover:text-text-main transition-colors mr-1"
              aria-label="Emoji"
            >
              <Smile className="w-[18px] h-[18px]" />
            </button>

            <input
              type="text"
              placeholder="Type your message..."
              className="flex-1 bg-transparent border-none outline-none text-[14px] text-text-main placeholder:text-text-secondary px-2"
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  !e.shiftKey &&
                  e.currentTarget.value.trim() !== ""
                ) {
                  e.preventDefault();
                  sendMessage(e.currentTarget.value.trim());
                  e.currentTarget.value = "";
                }
              }}
            />

            <div className="flex items-center gap-1.5 ml-2">
              <button
                className="w-10 h-10 rounded-full flex items-center justify-center text-text-secondary shrink-0 hover:bg-card hover:text-text-main transition-colors"
                aria-label="Voice note"
              >
                <Mic className="w-[18px] h-[18px]" />
              </button>
              <button
                className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-white shrink-0 hover:brightness-110 shadow-md transition-all"
                aria-label="Send message"
              >
                <Send className="w-[18px] h-[18px] ml-0.5" />
              </button>
            </div>
          </div>
          <div className="text-center text-[10px] text-text-secondary mt-2 hidden md:block">
            Enter to send, Shift + Enter for new line
          </div>
        </div>
      </div>

      {/* Call Screen Overlay */}
      <CallScreen
        isOpen={isCallScreenOpen}
        contactName={contactName}
        contactInitials={contactInitials}
        onEndCall={() => setIsCallScreenOpen(false)}
      />

      {/* Confirmation Modals */}
      <ConfirmModal
        isOpen={activeModal === "delete-messages"}
        title="Delete messages?"
        description="This action cannot be undone."
        confirmText="Delete"
        onConfirm={() => {
          setActiveModal(null);
          setIsSelectMode(false);
          setSelectedMessages([]);
        }}
        onCancel={() => setActiveModal(null)}
      />
      <ConfirmModal
        isOpen={activeModal === "clear-chat"}
        title="Clear chat?"
        description="All messages in this conversation will be permanently deleted. This cannot be undone."
        confirmText="Clear chat"
        onConfirm={() => setActiveModal(null)}
        onCancel={() => setActiveModal(null)}
      />
      <ConfirmModal
        isOpen={activeModal === "delete-chat"}
        title="Delete chat?"
        description="This contact and all messages will be permanently removed. This cannot be undone."
        confirmText="Delete chat"
        onConfirm={() => setActiveModal(null)}
        onCancel={() => setActiveModal(null)}
      />
    </main>
  );
}
