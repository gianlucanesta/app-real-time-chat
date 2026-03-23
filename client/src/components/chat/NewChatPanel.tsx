import { ArrowLeft, Search, Users, UserPlus } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { apiFetch } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";
import { useChat, type Conversation } from "../../contexts/ChatContext";

interface SearchUser {
  id: string;
  display_name: string;
  initials: string;
  avatar_gradient: string;
  email?: string;
}

interface NewChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenNewContact: () => void;
}

export function NewChatPanel({
  isOpen,
  onClose,
  onOpenNewContact,
}: NewChatPanelProps) {
  const { user } = useAuth();
  const { addOrUpdateConversation, setActiveConversation } = useChat();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchUser[]>([]);
  const [status, setStatus] = useState<"idle" | "searching" | "empty">("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setStatus("idle");
      return;
    }
    setStatus("searching");
    timerRef.current = setTimeout(async () => {
      try {
        const data = await apiFetch<{ users: SearchUser[] }>(
          `/users/search?q=${encodeURIComponent(q)}`,
        );
        // Filter out the current user (safety net)
        const filtered = (data.users || []).filter((u) => u.id !== user?.id);
        setResults(filtered);
        setStatus(filtered.length ? "idle" : "empty");
      } catch {
        setResults([]);
        setStatus("empty");
      }
    }, 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setResults([]);
      setStatus("idle");
    }
  }, [isOpen]);

  const handleSelectUser = (u: SearchUser) => {
    if (!user) return;
    const convId = [user.id, u.id].sort().join("___");
    const conv: Conversation = {
      id: convId,
      type: "direct",
      name: u.display_name,
      gradient: u.avatar_gradient || "linear-gradient(135deg,#2563EB,#7C3AED)",
      initials: u.initials,
      lastMessage: "",
      lastMessageTime: undefined,
      unreadCount: 0,
      isOnline: false,
      participants: [user.id, u.id],
    };
    addOrUpdateConversation(conv);
    setActiveConversation(conv);
    onClose();
  };

  return (
    <div
      className={`absolute inset-0 z-20 bg-bg md:bg-card flex flex-col transition-transform duration-200 ease-in-out ${isOpen ? "translate-x-0" : "translate-x-full"}`}
      aria-hidden={!isOpen}
    >
      <div className="flex items-center gap-3 p-4 border-b border-border bg-card shrink-0 h-[64px]">
        <button
          className="w-9 h-9 rounded-full flex items-center justify-center text-text-secondary hover:text-text-main hover:bg-input transition-colors"
          onClick={onClose}
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2>New chat</h2>
      </div>

      <div className="px-4 py-3">
        <div className="flex items-center bg-input rounded-full h-9 px-3 border border-transparent focus-within:border-accent">
          <Search className="w-4 h-4 text-text-secondary shrink-0 mr-2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or number"
            className="flex-1 bg-transparent border-none outline-none text-[13px] text-text-main placeholder:text-text-secondary"
          />
        </div>
      </div>

      <div className="flex flex-col shrink-0">
        <button className="flex items-center gap-4 px-4 py-3 bg-transparent border-none cursor-pointer text-text-main text-base text-left hover:bg-input transition-colors">
          <div className="w-11 h-11 rounded-full bg-accent flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-white" />
          </div>
          New group
        </button>
        <button
          className="flex items-center gap-4 px-4 py-3 bg-transparent border-none cursor-pointer text-text-main text-base text-left hover:bg-input transition-colors"
          onClick={onOpenNewContact}
        >
          <div className="w-11 h-11 rounded-full bg-accent flex items-center justify-center shrink-0">
            <UserPlus className="w-5 h-5 text-white" />
          </div>
          New contact
        </button>
        <button className="flex items-center gap-4 px-4 py-3 bg-transparent border-none cursor-pointer text-text-main text-base text-left hover:bg-input transition-colors">
          <div className="w-11 h-11 rounded-full bg-accent flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-white" />
          </div>
          New community
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-border hover:scrollbar-thumb-toggle-off">
        <div className="px-4 pt-3 pb-2 text-xs text-text-secondary uppercase tracking-wider font-semibold shrink-0">
          {query.trim().length >= 2
            ? "Search results"
            : "Contacts on Ephemeral"}
        </div>

        {status === "searching" && (
          <div className="flex flex-col items-center justify-center py-10 text-text-secondary text-[13px] gap-2">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5 animate-spin"
            >
              <line x1="12" y1="2" x2="12" y2="6" />
              <line x1="12" y1="18" x2="12" y2="22" />
              <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
              <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
              <line x1="2" y1="12" x2="6" y2="12" />
              <line x1="18" y1="12" x2="22" y2="12" />
              <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
              <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
            </svg>
            Searching...
          </div>
        )}

        {status === "idle" && query.trim().length < 2 && (
          <div className="flex flex-col items-center justify-center py-10 text-text-secondary text-[13px] gap-2">
            <Search className="w-6 h-6" />
            <p className="text-center">
              Type at least 2 characters
              <br />
              to search for people
            </p>
          </div>
        )}

        {status === "empty" && (
          <div className="flex flex-col items-center justify-center py-10 text-text-secondary text-[13px] gap-2">
            <Search className="w-6 h-6" />
            <p>No users found</p>
          </div>
        )}

        {results.map((u) => (
          <div
            key={u.id}
            onClick={() => handleSelectUser(u)}
            className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-input/50 transition-colors"
          >
            <div className="relative inline-block shrink-0">
              <div
                className="w-[42px] h-[42px] rounded-full flex items-center justify-center font-bold text-[13px] text-white"
                style={{
                  background:
                    u.avatar_gradient ||
                    "linear-gradient(135deg,#2563EB,#7C3AED)",
                }}
              >
                {u.initials}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-[14px] text-text-main truncate">
                {u.display_name}
              </div>
              {u.email && (
                <div className="text-[13px] text-text-secondary truncate">
                  {u.email}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
