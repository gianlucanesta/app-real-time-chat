import {
  Search,
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Video,
  UserPlus,
} from "lucide-react";
import { useState, useMemo } from "react";
import type { CallGroup } from "../../types";

/* ── Helpers ─────────────────────────────────────────────── */

function formatCallDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const oneDay = 86_400_000;

  if (diff < oneDay && now.getDate() === d.getDate()) return "Today";
  if (diff < 2 * oneDay && now.getDate() - d.getDate() === 1)
    return "Yesterday";

  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  if (diff < 7 * oneDay) return dayNames[d.getDay()];

  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function CallDirectionIcon({
  direction,
  result,
}: {
  direction: "incoming" | "outgoing";
  result: string;
}) {
  if (result === "missed" || result === "declined" || result === "no_answer") {
    return <PhoneMissed className="w-3.5 h-3.5 text-danger" />;
  }
  if (direction === "incoming") {
    return <PhoneIncoming className="w-3.5 h-3.5 text-accent" />;
  }
  return <PhoneOutgoing className="w-3.5 h-3.5 text-accent" />;
}

function callStatusText(group: CallGroup): { text: string; isMissed: boolean } {
  const { lastCall, count } = group;
  const isMissed =
    lastCall.result === "missed" ||
    lastCall.result === "declined" ||
    lastCall.result === "no_answer";

  let label = lastCall.direction === "incoming" ? "Incoming" : "Outgoing";
  if (isMissed) label = "Missed";

  const suffix = count > 1 ? ` (${count})` : "";
  return { text: `${label}${suffix}`, isMissed };
}

/* ── Component ───────────────────────────────────────────── */

interface CallsSidebarProps {
  callGroups: CallGroup[];
  favorites: CallGroup[];
  selectedCallGroup: CallGroup | null;
  onSelectCallGroup: (group: CallGroup) => void;
  onNewCall?: () => void;
}

export function CallsSidebar({
  callGroups,
  favorites,
  selectedCallGroup,
  onSelectCallGroup,
  onNewCall,
}: CallsSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return callGroups;
    return callGroups.filter((g) => g.contactName.toLowerCase().includes(q));
  }, [callGroups, searchQuery]);

  const filteredFavorites = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return favorites;
    return favorites.filter((g) => g.contactName.toLowerCase().includes(q));
  }, [favorites, searchQuery]);

  return (
    <aside className="w-full md:w-[var(--width-sidebar)] md:min-w-[var(--width-sidebar)] bg-card flex flex-col border-r border-border h-full relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 h-[72px] shrink-0">
        <h1 className="text-2xl md:text-xl font-bold text-text-main">Calls</h1>
        <button
          onClick={onNewCall}
          className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:text-text-main hover:bg-input transition-colors"
          title="New call"
        >
          <Phone className="w-4 h-4" />
        </button>
      </div>

      {/* Search */}
      <div className="px-4 pb-3">
        <div className="flex items-center bg-input/80 rounded-lg h-9 px-3 border border-border/50 focus-within:border-accent/50 transition-colors">
          <Search className="w-4 h-4 text-text-secondary shrink-0 mr-2" />
          <input
            type="text"
            placeholder="Search a name or number"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-[13px] text-text-main placeholder:text-text-secondary"
          />
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-border hover:scrollbar-thumb-toggle-off">
        {/* Favorites Section */}
        <div className="px-4 pt-2 pb-1">
          <h2 className="text-[12px] font-semibold text-text-secondary uppercase tracking-wider">
            Favorites
          </h2>
        </div>

        {filteredFavorites.length === 0 && (
          <button
            className="flex items-center gap-3 px-4 py-3 w-full hover:bg-input/50 transition-colors"
            onClick={onNewCall}
          >
            <div className="w-10 h-10 rounded-full bg-accent/15 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-accent" />
            </div>
            <span className="text-[13.5px] text-text-main font-medium">
              Add favorite
            </span>
          </button>
        )}

        {filteredFavorites.map((group) => (
          <CallEntry
            key={`fav-${group.contactId}`}
            group={group}
            isSelected={selectedCallGroup?.contactId === group.contactId}
            onSelect={() => onSelectCallGroup(group)}
          />
        ))}

        {/* Divider */}
        <div className="mx-4 my-2 h-px bg-border/50" />

        {/* Recent Section */}
        <div className="px-4 pt-1 pb-1">
          <h2 className="text-[12px] font-semibold text-text-secondary uppercase tracking-wider">
            Recent
          </h2>
        </div>

        {filteredGroups.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-text-secondary text-[13px] gap-2">
            <Phone className="w-5 h-5" />
            <p>{searchQuery.trim() ? "No calls found" : "No recent calls"}</p>
          </div>
        )}

        {filteredGroups.map((group) => (
          <CallEntry
            key={group.contactId + group.lastCall.timestamp}
            group={group}
            isSelected={selectedCallGroup?.contactId === group.contactId}
            onSelect={() => onSelectCallGroup(group)}
          />
        ))}
      </div>
    </aside>
  );
}

/* ── Single call entry row ───────────────────────────────── */

function CallEntry({
  group,
  isSelected,
  onSelect,
}: {
  group: CallGroup;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const { lastCall } = group;
  const { text: statusText, isMissed } = callStatusText(group);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={`group flex items-center gap-3 px-4 py-3.5 md:py-3 cursor-pointer transition-colors relative ${
        isSelected
          ? "bg-accent/15 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3px] before:bg-accent before:rounded-r-full"
          : "hover:bg-input/50"
      }`}
    >
      {/* Avatar */}
      <div className="relative inline-block shrink-0">
        {lastCall.contactAvatar ? (
          <img
            src={lastCall.contactAvatar}
            alt={group.contactName}
            className="w-[46px] h-[46px] rounded-full object-cover"
          />
        ) : (
          <div
            className="w-[46px] h-[46px] rounded-full flex items-center justify-center text-white text-sm font-semibold"
            style={{
              background:
                group.contactGradient ||
                "linear-gradient(135deg, #6366f1, #a855f7)",
            }}
          >
            {group.contactInitials}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-[14px] font-semibold text-text-main truncate">
            {group.contactName}
          </span>
          <span className="text-[11px] text-text-secondary whitespace-nowrap ml-2">
            {formatCallDate(lastCall.timestamp)}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <CallDirectionIcon
            direction={lastCall.direction}
            result={lastCall.result}
          />
          <span
            className={`text-[12.5px] truncate ${
              isMissed ? "text-danger" : "text-text-secondary"
            }`}
          >
            {statusText}
          </span>
        </div>
      </div>

      {/* Quick call button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
        }}
        className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:text-accent hover:bg-accent/10 transition-colors opacity-0 group-hover:opacity-100"
        title={lastCall.callType === "video" ? "Video call" : "Voice call"}
      >
        {lastCall.callType === "video" ? (
          <Video className="w-4 h-4" />
        ) : (
          <Phone className="w-4 h-4" />
        )}
      </button>
    </div>
  );
}
