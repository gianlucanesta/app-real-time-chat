import { Plus, MoreVertical, Image, Type, Lock } from "lucide-react";
import { useState } from "react";
import { useClickOutside } from "../../hooks/useClickOutside";
import type { ContactStatus, MyStatus } from "../../types";

/* ── Helpers ─────────────────────────────────────────────── */

function formatStatusTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const oneDay = 86_400_000;

  if (diff < oneDay && now.getDate() === d.getDate()) {
    return `Today at ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  }
  if (diff < 2 * oneDay && now.getDate() - d.getDate() === 1) {
    return `Yesterday at ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  }
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/* ── Component ───────────────────────────────────────────── */

interface StatusSidebarProps {
  myStatus: MyStatus;
  recentStatuses: ContactStatus[];
  userAvatar?: string | null;
  userGradient: string;
  userInitials: string;
  onOpenMyStatus: () => void;
  onOpenNewStatusPhoto: () => void;
  onOpenNewStatusText: () => void;
  onViewContactStatus: (status: ContactStatus) => void;
  onOpenPrivacy: () => void;
}

export function StatusSidebar({
  myStatus,
  recentStatuses,
  userAvatar,
  userGradient,
  userInitials,
  onOpenMyStatus,
  onOpenNewStatusPhoto,
  onOpenNewStatusText,
  onViewContactStatus,
  onOpenPrivacy,
}: StatusSidebarProps) {
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
  const [isDotsMenuOpen, setIsDotsMenuOpen] = useState(false);

  const plusMenuRef = useClickOutside<HTMLDivElement>(() =>
    setIsPlusMenuOpen(false),
  );
  const dotsMenuRef = useClickOutside<HTMLDivElement>(() =>
    setIsDotsMenuOpen(false),
  );

  const hasMyStatus = myStatus.items.length > 0;

  return (
    <aside className="w-full md:w-[var(--width-sidebar)] md:min-w-[var(--width-sidebar)] bg-card flex flex-col border-r border-border h-full relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 h-[72px] shrink-0">
        <h1 className="text-2xl md:text-xl font-bold text-text-main">Status</h1>
        <div className="flex gap-1">
          {/* + New Status */}
          <div className="relative" ref={plusMenuRef}>
            <button
              onClick={() => setIsPlusMenuOpen(!isPlusMenuOpen)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:text-text-main hover:bg-input transition-colors"
              title="New status"
            >
              <Plus className="w-4 h-4" />
            </button>
            {isPlusMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-card border border-border/80 rounded-xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2">
                <button
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-[13.5px] text-text-main hover:bg-input/80 transition-colors"
                  onClick={() => {
                    setIsPlusMenuOpen(false);
                    onOpenNewStatusPhoto();
                  }}
                >
                  <Image className="w-4 h-4 text-text-secondary" />
                  Photos & videos
                </button>
                <button
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-[13.5px] text-text-main hover:bg-input/80 transition-colors"
                  onClick={() => {
                    setIsPlusMenuOpen(false);
                    onOpenNewStatusText();
                  }}
                >
                  <Type className="w-4 h-4 text-text-secondary" />
                  Text
                </button>
              </div>
            )}
          </div>

          {/* ⋮ Menu */}
          <div className="relative" ref={dotsMenuRef}>
            <button
              className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:text-text-main hover:bg-input transition-colors"
              onClick={() => setIsDotsMenuOpen(!isDotsMenuOpen)}
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {isDotsMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-card border border-border/80 rounded-xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2">
                <button
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-[13.5px] text-text-main hover:bg-input/80 transition-colors"
                  onClick={() => {
                    setIsDotsMenuOpen(false);
                    onOpenPrivacy();
                  }}
                >
                  <Lock className="w-4 h-4 text-text-secondary" />
                  Status privacy
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-border hover:scrollbar-thumb-toggle-off">
        {/* My Status */}
        <button
          className="flex items-center gap-3 px-4 py-3.5 w-full hover:bg-input/50 transition-colors text-left"
          onClick={onOpenMyStatus}
        >
          <div className="relative inline-block shrink-0">
            {userAvatar ? (
              <img
                src={userAvatar}
                alt="My status"
                className={`w-[46px] h-[46px] rounded-full object-cover ${hasMyStatus ? "ring-2 ring-accent ring-offset-2 ring-offset-card" : ""}`}
              />
            ) : (
              <div
                className={`w-[46px] h-[46px] rounded-full flex items-center justify-center text-white text-sm font-semibold ${hasMyStatus ? "ring-2 ring-accent ring-offset-2 ring-offset-card" : ""}`}
                style={{
                  background:
                    userGradient || "linear-gradient(135deg, #6366f1, #a855f7)",
                }}
              >
                {userInitials}
              </div>
            )}
            {/* Green plus badge */}
            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-accent flex items-center justify-center border-2 border-card">
              <Plus className="w-3 h-3 text-white" strokeWidth={3} />
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-text-main">
              My status
            </p>
            <p className="text-[12.5px] text-text-secondary truncate">
              {hasMyStatus
                ? `Updated ${formatStatusTime(myStatus.lastUpdated!)}`
                : "Click to add a status update"}
            </p>
          </div>
        </button>

        {/* Divider */}
        <div className="mx-4 my-2 h-px bg-border/50" />

        {/* Recent Section */}
        <div className="px-4 pt-1 pb-1">
          <h2 className="text-[12px] font-semibold text-text-secondary uppercase tracking-wider">
            Recent
          </h2>
        </div>

        {recentStatuses.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-text-secondary text-[13px] gap-2">
            <p>No recent status updates</p>
          </div>
        )}

        {recentStatuses.map((cs) => (
          <button
            key={cs.contactId}
            className="flex items-center gap-3 px-4 py-3.5 md:py-3 w-full hover:bg-input/50 transition-colors text-left"
            onClick={() => onViewContactStatus(cs)}
          >
            {/* Avatar with ring */}
            <div className="relative inline-block shrink-0">
              {cs.contactAvatar ? (
                <img
                  src={cs.contactAvatar}
                  alt={cs.contactName}
                  className={`w-[46px] h-[46px] rounded-full object-cover ring-2 ring-offset-2 ring-offset-card ${
                    cs.allViewed ? "ring-text-secondary/40" : "ring-accent"
                  }`}
                />
              ) : (
                <div
                  className={`w-[46px] h-[46px] rounded-full flex items-center justify-center text-white text-sm font-semibold ring-2 ring-offset-2 ring-offset-card ${
                    cs.allViewed ? "ring-text-secondary/40" : "ring-accent"
                  }`}
                  style={{
                    background:
                      cs.contactGradient ||
                      "linear-gradient(135deg, #6366f1, #a855f7)",
                  }}
                >
                  {cs.contactInitials}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-text-main truncate">
                {cs.contactName}
              </p>
              <p className="text-[12.5px] text-text-secondary truncate">
                {formatStatusTime(cs.lastUpdated)}
              </p>
            </div>
          </button>
        ))}

        {/* Footer encryption notice */}
        <div className="px-4 py-4 mt-2">
          <p className="text-[11.5px] text-text-secondary flex items-center gap-1.5">
            <Lock className="w-3 h-3 shrink-0" />
            Your status updates are{" "}
            <span className="text-accent font-medium cursor-pointer hover:underline">
              end-to-end encrypted
            </span>
          </p>
        </div>
      </div>
    </aside>
  );
}
