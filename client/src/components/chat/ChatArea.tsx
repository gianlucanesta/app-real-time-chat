import {
  Search,
  Video,
  Phone,
  MoreVertical,
  Plus,
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
  ChevronLeft,
  ChevronDown,
  Users2,
  Link2,
  Calendar,
} from "lucide-react";
import { useState, useRef, useCallback, useEffect } from "react";
import { useClickOutside } from "../../hooks/useClickOutside";
import { ContactProfilePanel } from "./ContactProfilePanel";
import { EditContactPanel } from "./EditContactPanel";
import { ChatMessage } from "./ChatMessage";
import { CallScreen } from "./CallScreen";
import { ConfirmModal } from "./ConfirmModal";
import { useChat, type Message } from "../../contexts/ChatContext";
import { useToast } from "../../contexts/ToastContext";

/** Return a human-friendly date label for a message group separator. */
function dateSeparatorLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffMs = today.getTime() - msgDay.getTime();
  const diffDays = Math.round(diffMs / 86_400_000);
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

/** Group messages by day, returning [label, messages][] pairs. */
function groupMessagesByDate(messages: Message[]): [string, Message[]][] {
  const groups: [string, Message[]][] = [];
  let currentLabel = "";
  for (const msg of messages) {
    const label = dateSeparatorLabel(msg.rawTimestamp);
    if (label !== currentLabel) {
      currentLabel = label;
      groups.push([label, [msg]]);
    } else {
      groups[groups.length - 1][1].push(msg);
    }
  }
  return groups;
}

interface ChatAreaProps {
  onMobileBack?: () => void;
}

export function ChatArea({ onMobileBack }: ChatAreaProps) {
  const {
    conversations,
    activeConversation,
    activeMessages,
    sendMessage,
    typingUsers,
    socket,
    deleteMessages,
    clearMessages,
  } = useChat();
  const toast = useToast();

  // Derive live typing state from the conversations array (activeConversation is a stale copy)
  const isContactTyping =
    conversations.find((c) => c.id === activeConversation?.id)?.isTyping ??
    false;

  const [isContactInfoOpen, setIsContactInfoOpen] = useState(false);
  const [isEditContactOpen, setIsEditContactOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

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

  // Reactions state: messageId -> emoji -> count
  const [reactions, setReactions] = useState<
    Record<string, Record<string, number>>
  >({});

  const handleCopyMessage = useCallback(
    (text: string) => {
      navigator.clipboard
        .writeText(text)
        .then(() => toast.showToast("Message copied!", "success"));
    },
    [toast],
  );

  const handleDeleteMessage = useCallback(
    (id: string) => {
      deleteMessages([id]);
      setSelectedMessages((prev) => prev.filter((m) => m !== id));
    },
    [deleteMessages],
  );

  const handleReaction = useCallback((msgId: string, emoji: string) => {
    setReactions((prev) => {
      const msgReactions = { ...(prev[msgId] || {}) };
      if (msgReactions[emoji]) {
        msgReactions[emoji] -= 1;
        if (msgReactions[emoji] <= 0) delete msgReactions[emoji];
      } else {
        msgReactions[emoji] = 1;
      }
      return { ...prev, [msgId]: msgReactions };
    });
  }, []);

  const handleEnterSelectMode = useCallback((msgId: string) => {
    setIsSelectMode(true);
    setSelectedMessages([msgId]);
  }, []);

  const handleCopySelected = useCallback(() => {
    const texts = activeMessages
      .filter((m) => selectedMessages.includes(m.id))
      .map((m) => m.text)
      .join("\n");
    navigator.clipboard.writeText(texts).then(() => {
      toast.showToast(
        `${selectedMessages.length} message(s) copied!`,
        "success",
      );
      setIsSelectMode(false);
      setSelectedMessages([]);
    });
  }, [activeMessages, selectedMessages, toast]);

  // Call & Modal State
  const [isCallScreenOpen, setIsCallScreenOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<
    "delete-messages" | "clear-chat" | "delete-chat" | null
  >(null);

  const contactName = activeConversation?.name || "";
  const contactInitials = activeConversation?.initials || "";
  const contactGradient = activeConversation?.gradient || "";

  // Scroll-to-bottom logic
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevConvIdRef = useRef<string | undefined>();

  useEffect(() => {
    if (!messagesEndRef.current || !activeMessages.length) return;
    const isConvSwitch = prevConvIdRef.current !== activeConversation?.id;
    prevConvIdRef.current = activeConversation?.id;
    messagesEndRef.current.scrollIntoView({
      behavior: isConvSwitch ? "instant" : "smooth",
    });
  }, [activeMessages, activeConversation?.id]);

  // Scroll to bottom when typing indicator appears
  useEffect(() => {
    if (isContactTyping && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [isContactTyping]);

  // Typing emit logic
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  const handleTypingEmit = useCallback(() => {
    if (!activeConversation || !socket) return;
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit("typing:start", activeConversation.id);
    }
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      isTypingRef.current = false;
      socket.emit("typing:stop", activeConversation.id);
    }, 2000);
  }, [activeConversation, socket]);

  const handleSend = useCallback(() => {
    if (!inputValue.trim()) return;
    sendMessage(inputValue.trim());
    setInputValue("");
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    if (isTypingRef.current && activeConversation && socket) {
      isTypingRef.current = false;
      socket.emit("typing:stop", activeConversation.id);
    }
  }, [inputValue, sendMessage, activeConversation, socket]);

  // Stop typing and clear input when conversation changes
  useEffect(() => {
    setInputValue("");
    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      isTypingRef.current = false;
    };
  }, [activeConversation?.id]);

  if (!activeConversation) {
    return (
      <main className="flex-1 flex flex-col min-w-0 h-full relative overflow-hidden bg-bg">
        {/* Empty State — hidden on mobile */}
        <div
          className="chat-empty-state w-full hidden md:flex"
          aria-hidden="false"
        >
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
      <div className="chat-header z-10">
        <div
          className="flex items-center gap-3 md:gap-4 cursor-pointer hover:bg-input/50 p-1.5 md:p-2 -ml-1.5 md:-ml-2 rounded-xl transition-colors"
          onClick={handleOpenContactInfo}
        >
          {/* Mobile back button */}
          {onMobileBack && (
            <button
              type="button"
              className="md:hidden w-9 h-9 rounded-full flex items-center justify-center text-text-secondary hover:text-text-main hover:bg-input transition-colors shrink-0 -mr-1"
              onClick={(e) => {
                e.stopPropagation();
                onMobileBack();
              }}
              aria-label="Back to conversations"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
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
            {isContactTyping ? (
              <div className="flex items-center gap-1.5 text-[11px] md:text-[12px] text-accent mt-0.5">
                <span className="flex gap-0.5">
                  <span
                    className="w-1 h-1 rounded-full bg-accent animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  />
                  <span
                    className="w-1 h-1 rounded-full bg-accent animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  />
                  <span
                    className="w-1 h-1 rounded-full bg-accent animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  />
                </span>
                typing...
              </div>
            ) : activeConversation?.isOnline ? (
              <div className="hidden md:flex items-center gap-1.5 text-[11px] md:text-[12px] text-success mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-success"></span>
                Online
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-1 md:gap-2">
          {/* Call Dropdown Wrapper */}
          <div className="relative" ref={callMenuRef}>
            <button
              className="chat-call-btn"
              onClick={() => setIsCallMenuOpen(!isCallMenuOpen)}
            >
              <Video />
              <span className="call-text">Call</span>
              <ChevronDown className="call-chevron" />
            </button>
            {isCallMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-card border border-border/80 rounded-xl shadow-xl py-3 z-50 animate-in fade-in slide-in-from-top-2">
                {/* Contact header */}
                <div className="px-4 py-2 flex items-center gap-3 mb-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-[11px] text-white shrink-0"
                    style={{ background: contactGradient }}
                  >
                    {contactInitials}
                  </div>
                  <span className="text-[14px] font-semibold text-text-main truncate">
                    {contactName}
                  </span>
                </div>
                {/* Voice / Video large accent buttons */}
                <div className="grid grid-cols-2 gap-3 px-4 pb-3">
                  <button
                    className="flex flex-row items-center justify-center gap-2.5 py-3 px-3 bg-accent hover:brightness-110 text-white rounded-2xl transition-all"
                    onClick={() => {
                      setIsCallMenuOpen(false);
                      setIsCallScreenOpen(true);
                    }}
                  >
                    <Phone className="w-5 h-5 shrink-0" />
                    <span className="text-[13px] font-semibold">Voice</span>
                  </button>
                  <button
                    className="flex flex-row items-center justify-center gap-2.5 py-3 px-3 bg-accent hover:brightness-110 text-white rounded-2xl transition-all"
                    onClick={() => {
                      setIsCallMenuOpen(false);
                      setIsCallScreenOpen(true);
                    }}
                  >
                    <Video className="w-5 h-5 shrink-0" />
                    <span className="text-[13px] font-semibold">Video</span>
                  </button>
                </div>
                <div className="w-full h-px bg-border/50 mb-1" />
                <button className="w-full flex items-center gap-3 px-4 py-2.5 text-[13.5px] text-text-main hover:bg-input/80 transition-colors">
                  <Users2 className="w-[18px] h-[18px] text-text-secondary" />{" "}
                  New group call
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-2.5 text-[13.5px] text-text-main hover:bg-input/80 transition-colors">
                  <Link2 className="w-[18px] h-[18px] text-text-secondary" />{" "}
                  Send call link
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-2.5 text-[13.5px] text-text-main hover:bg-input/80 transition-colors">
                  <Calendar className="w-[18px] h-[18px] text-text-secondary" />{" "}
                  Schedule a call
                </button>
              </div>
            )}
          </div>

          <button className="hidden md:flex w-9 h-9 rounded-full items-center justify-center text-text-secondary hover:text-text-main hover:bg-input transition-colors">
            <Search className="w-5 h-5" />
          </button>

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
        className={`flex-1 overflow-y-auto px-4 md:px-8 flex flex-col pt-6 pb-28 md:pb-32 scrollbar-thin scrollbar-thumb-border hover:scrollbar-thumb-toggle-off ${isSelectMode ? "select-mode" : ""}`}
      >
        {groupMessagesByDate(activeMessages).map(([label, msgs]) => (
          <div key={label} className="flex flex-col">
            {/* Date Separator */}
            <div className="flex items-center justify-center my-6">
              <span className="bg-input/70 text-text-secondary text-[11px] font-medium uppercase tracking-[1px] px-3 py-1 rounded-lg">
                {label}
              </span>
            </div>

            {msgs.map((msg) => (
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
                onCopy={() => handleCopyMessage(msg.text)}
                onDelete={() => handleDeleteMessage(msg.id)}
                onEnterSelectMode={() => handleEnterSelectMode(msg.id)}
                reactions={reactions[msg.id]}
                onReaction={(emoji) => handleReaction(msg.id, emoji)}
              />
            ))}
          </div>
        ))}

        {/* Typing indicator bubble */}
        {isContactTyping && (
          <div className="flex items-end mb-4 self-start">
            <div
              className="px-4 py-3 bg-card border border-border/50 rounded-2xl rounded-bl-sm shadow-sm flex items-center gap-[6px]"
              aria-label="Contact is typing"
            >
              <span
                className="w-2.5 h-2.5 rounded-full bg-accent/70 animate-bounce"
                style={{ animationDelay: "0ms" }}
              />
              <span
                className="w-2.5 h-2.5 rounded-full bg-accent/70 animate-bounce"
                style={{ animationDelay: "160ms" }}
              />
              <span
                className="w-2.5 h-2.5 rounded-full bg-accent/70 animate-bounce"
                style={{ animationDelay: "320ms" }}
              />
            </div>
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} className="shrink-0" />
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
            onClick={handleCopySelected}
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
      <div className="absolute bottom-0 left-0 right-0 px-3 pb-2 md:px-4 md:pb-2 pt-12 bg-gradient-to-t from-bg via-bg to-transparent">
        <div className="flex items-center bg-input/80 backdrop-blur-md rounded-full border border-border/50 p-1.5 shadow-lg">
          {/* + button: blue circle on mobile, plain on desktop */}
          <button
            className="w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center bg-accent text-white md:bg-transparent md:text-text-secondary shrink-0 hover:brightness-110 md:hover:bg-card md:hover:text-text-main transition-colors"
            aria-label="Add attachment"
          >
            <Plus className="w-[18px] h-[18px]" />
          </button>

          {/* Emoji: always on desktop; on mobile only when input is empty */}
          <button
            className={`w-10 h-10 rounded-full flex items-center justify-center text-text-secondary shrink-0 hover:bg-card hover:text-text-main transition-colors mr-1 ${inputValue ? "hidden md:flex" : "flex"}`}
            aria-label="Emoji"
          >
            <Smile className="w-[18px] h-[18px]" />
          </button>

          <input
            type="text"
            placeholder="Write a message..."
            value={inputValue}
            className="flex-1 bg-transparent border-none outline-none text-[14px] text-text-main placeholder:text-text-secondary px-2"
            onChange={(e) => {
              setInputValue(e.target.value);
              handleTypingEmit();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />

          <div className="flex items-center gap-1.5 ml-2">
            {/* Mic: only when input is empty */}
            <button
              className={`w-10 h-10 rounded-full flex items-center justify-center text-text-secondary shrink-0 hover:bg-card hover:text-text-main transition-colors ${inputValue ? "hidden" : "flex"}`}
              aria-label="Voice note"
            >
              <Mic className="w-[18px] h-[18px]" />
            </button>
            {/* Send: only when input has text */}
            <button
              className={`w-10 h-10 rounded-full bg-accent flex items-center justify-center text-white shrink-0 hover:brightness-110 shadow-md transition-all ${inputValue ? "flex" : "hidden"}`}
              aria-label="Send message"
              onClick={handleSend}
            >
              <Send className="w-[18px] h-[18px] ml-0.5" />
            </button>
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
        description={`Delete ${selectedMessages.length} selected message(s)? This action cannot be undone.`}
        confirmText="Delete"
        onConfirm={() => {
          deleteMessages(selectedMessages);
          setActiveModal(null);
          setIsSelectMode(false);
          setSelectedMessages([]);
          toast.showToast("Messages deleted", "success");
        }}
        onCancel={() => setActiveModal(null)}
      />
      <ConfirmModal
        isOpen={activeModal === "clear-chat"}
        title="Clear chat?"
        description="All messages in this conversation will be permanently deleted. This cannot be undone."
        confirmText="Clear chat"
        onConfirm={() => {
          clearMessages();
          setActiveModal(null);
          toast.showToast("Chat cleared", "success");
        }}
        onCancel={() => setActiveModal(null)}
      />
      <ConfirmModal
        isOpen={activeModal === "delete-chat"}
        title="Delete chat?"
        description="This contact and all messages will be permanently removed. This cannot be undone."
        confirmText="Delete chat"
        onConfirm={() => {
          // TODO: API call DELETE /api/contacts/:id + clear messages
          setActiveModal(null);
          toast.showToast("Chat deleted", "success");
        }}
        onCancel={() => setActiveModal(null)}
      />
    </main>
  );
}
