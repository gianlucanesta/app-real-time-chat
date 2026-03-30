import { useState, useMemo } from "react";
import { X, Phone, Video, Search } from "lucide-react";
import { useChat, type Conversation } from "../../contexts/ChatContext";

interface StartCallModalProps {
  open: boolean;
  onClose: () => void;
  onStartCall: (contactId: string, withVideo: boolean) => void;
}

export function StartCallModal({
  open,
  onClose,
  onStartCall,
}: StartCallModalProps) {
  const { conversations } = useChat();
  const [search, setSearch] = useState("");
  const [callType, setCallType] = useState<"voice" | "video">("video");

  // Filter to direct conversations only and apply search
  const contacts = useMemo(() => {
    const direct = conversations.filter((c) => c.type === "direct");
    if (!search.trim()) return direct;
    const q = search.toLowerCase();
    return direct.filter((c) => c.name.toLowerCase().includes(q));
  }, [conversations, search]);

  if (!open) return null;

  const handleSelect = (conv: Conversation) => {
    const target = conv.participants.find((p) => p !== ""); // will be matched in parent
    if (target) {
      onStartCall(target, callType === "video");
      onClose();
      setSearch("");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-[16px] font-semibold text-text-main">
            Start a call
          </h2>
          <button
            onClick={onClose}
            title="Close"
            className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:text-text-main hover:bg-input transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Call type toggle */}
        <div className="flex items-center gap-2 px-5 pt-4 pb-2">
          <span className="text-[13px] text-text-secondary mr-2">
            Call type:
          </span>
          <button
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
              callType === "video"
                ? "bg-accent text-white"
                : "bg-input text-text-secondary hover:text-text-main"
            }`}
            onClick={() => setCallType("video")}
          >
            <Video className="w-4 h-4" />
            Video
          </button>
          <button
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
              callType === "voice"
                ? "bg-accent text-white"
                : "bg-input text-text-secondary hover:text-text-main"
            }`}
            onClick={() => setCallType("voice")}
          >
            <Phone className="w-4 h-4" />
            Voice
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-input border border-border">
            <Search className="w-4 h-4 text-text-secondary shrink-0" />
            <input
              type="text"
              placeholder="Search contacts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-[14px] text-text-main placeholder:text-text-secondary outline-none"
            />
          </div>
        </div>

        {/* Contact list */}
        <div className="flex-1 overflow-y-auto px-2 pb-4 scrollbar-thin scrollbar-thumb-border">
          {contacts.length === 0 ? (
            <p className="text-center text-[13px] text-text-secondary py-8">
              No contacts found
            </p>
          ) : (
            contacts.map((conv) => (
              <button
                key={conv.id}
                onClick={() => handleSelect(conv)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-input/80 transition-colors"
              >
                {conv.avatar ? (
                  <img
                    src={conv.avatar}
                    alt={conv.name}
                    className="w-10 h-10 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0"
                    style={{
                      background:
                        conv.gradient ||
                        "linear-gradient(135deg, #6366f1, #a855f7)",
                    }}
                  >
                    {conv.initials}
                  </div>
                )}
                <div className="flex-1 text-left min-w-0">
                  <p className="text-[14px] font-medium text-text-main truncate">
                    {conv.name}
                  </p>
                  {conv.isOnline && (
                    <p className="text-[12px] text-accent">Online</p>
                  )}
                </div>
                <div className="flex items-center gap-1 text-text-secondary">
                  {callType === "video" ? (
                    <Video className="w-4 h-4" />
                  ) : (
                    <Phone className="w-4 h-4" />
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
