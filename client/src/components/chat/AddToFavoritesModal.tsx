import { useState, useMemo } from "react";
import { X, Search, Heart } from "lucide-react";
import { useChat, type Conversation } from "../../contexts/ChatContext";
import { useAuth } from "../../contexts/AuthContext";

interface AddToFavoritesModalProps {
  open: boolean;
  onClose: () => void;
}

export function AddToFavoritesModal({
  open,
  onClose,
}: AddToFavoritesModalProps) {
  const { conversations, addToFavorites, removeFromFavorites } = useChat();
  const { user: _user } = useAuth();
  const [search, setSearch] = useState("");

  // Filter to direct conversations only and apply search
  const contacts = useMemo(() => {
    const direct = conversations.filter(
      (c) => c.type === "direct" && !c.isArchived,
    );
    if (!search.trim()) return direct;
    const q = search.toLowerCase();
    return direct.filter((c) => c.name.toLowerCase().includes(q));
  }, [conversations, search]);

  if (!open) return null;

  const handleToggle = (conv: Conversation) => {
    if (conv.isFavorite) {
      removeFromFavorites(conv.id);
    } else {
      addToFavorites(conv.id);
    }
  };

  const handleClose = () => {
    setSearch("");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-[16px] font-semibold text-text-main">
            Add to Favorites
          </h2>
          <button
            onClick={handleClose}
            title="Close"
            className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:text-text-main hover:bg-input transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Description */}
        <div className="px-5 pt-3 pb-1">
          <p className="text-[13px] text-text-secondary">
            Add contacts or groups you want. Only you can see who is in your
            favorites.
          </p>
        </div>

        {/* Search */}
        <div className="px-5 py-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-input border border-border focus-within:border-accent/50 transition-colors">
            <Search className="w-4 h-4 text-text-secondary shrink-0" />
            <input
              type="text"
              placeholder="Search a name or number"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-[14px] text-text-main placeholder:text-text-secondary outline-none"
              autoFocus
            />
          </div>
        </div>

        {/* Section label */}
        <div className="px-5 pb-1">
          <span className="text-[12px] font-semibold text-text-secondary uppercase tracking-wider">
            Recent chats
          </span>
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
                onClick={() => handleToggle(conv)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-input/80 transition-colors"
              >
                {/* Checkbox */}
                <div
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                    conv.isFavorite
                      ? "bg-accent border-accent"
                      : "border-text-secondary/40 hover:border-accent/60"
                  }`}
                >
                  {conv.isFavorite && (
                    <svg
                      className="w-3 h-3 text-white"
                      viewBox="0 0 12 12"
                      fill="none"
                    >
                      <path
                        d="M2 6L5 9L10 3"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>

                {/* Avatar */}
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

                {/* Name */}
                <div className="flex-1 text-left min-w-0">
                  <p className="text-[14px] font-medium text-text-main truncate">
                    {conv.name}
                  </p>
                  {conv.isOnline && (
                    <p className="text-[12px] text-accent">Online</p>
                  )}
                </div>

                {/* Heart indicator */}
                {conv.isFavorite && (
                  <Heart className="w-4 h-4 text-accent fill-accent shrink-0" />
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
