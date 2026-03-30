import {
  X,
  Phone,
  Video,
  MessageSquare,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  PhoneCall,
  Link2,
  Grid3X3,
  Calendar,
} from "lucide-react";
import type { CallGroup, CallRecord } from "../../types";

/* ── Helpers ─────────────────────────────────────────────── */

function formatDetailDate(iso: string): string {
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

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

function callResultLabel(call: CallRecord): string {
  const dir = call.direction === "incoming" ? "Incoming" : "Outgoing";
  const type = call.callType === "video" ? "video" : "voice";

  if (call.result === "missed")
    return `Missed ${type} call at ${formatTime(call.timestamp)}`;
  if (call.result === "declined")
    return `Declined ${type} call at ${formatTime(call.timestamp)}`;
  if (call.result === "no_answer")
    return `No answer ${type} call at ${formatTime(call.timestamp)}`;
  if (call.result === "accepted_elsewhere")
    return `${dir} ${type} call at ${formatTime(call.timestamp)}`;

  return `${dir} ${type} call at ${formatTime(call.timestamp)}`;
}

function callResultDetail(call: CallRecord): string | null {
  if (call.result === "accepted_elsewhere") return "Accepted on another device";
  if (call.result === "accepted" && call.duration)
    return `Duration: ${formatDuration(call.duration)}`;
  if (call.result === "missed") return "Missed";
  if (call.result === "declined") return "Declined";
  if (call.result === "no_answer") return "No answer";
  return null;
}

function CallIcon({ call }: { call: CallRecord }) {
  const isMissed =
    call.result === "missed" ||
    call.result === "declined" ||
    call.result === "no_answer";

  if (isMissed) return <PhoneMissed className="w-4 h-4 text-danger shrink-0" />;
  if (call.direction === "incoming")
    return <PhoneIncoming className="w-4 h-4 text-accent shrink-0" />;
  return <PhoneOutgoing className="w-4 h-4 text-accent shrink-0" />;
}

/* ── Group calls by date ─────────────────────────────────── */

function groupCallsByDate(
  calls: CallRecord[],
): { label: string; calls: CallRecord[] }[] {
  const map = new Map<string, CallRecord[]>();
  for (const call of calls) {
    const label = formatDetailDate(call.timestamp);
    const arr = map.get(label) || [];
    arr.push(call);
    map.set(label, arr);
  }
  return Array.from(map.entries()).map(([label, calls]) => ({ label, calls }));
}

/* ── Component ───────────────────────────────────────────── */

interface CallInfoPanelProps {
  callGroup: CallGroup | null;
  onClose: () => void;
  onStartChat?: () => void;
  onStartVideoCall?: () => void;
  onStartVoiceCall?: () => void;
  onStartCall?: () => void;
  onNewCallLink?: () => void;
  onCallNumber?: () => void;
  onScheduleCall?: () => void;
}

export function CallInfoPanel({
  callGroup,
  onClose,
  onStartChat,
  onStartVideoCall,
  onStartVoiceCall,
  onStartCall,
  onNewCallLink,
  onCallNumber,
  onScheduleCall,
}: CallInfoPanelProps) {
  if (!callGroup) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-bg min-h-0">
        {/* Action buttons — desktop only */}
        <div className="chat-empty-actions hidden md:flex">
          <button
            type="button"
            className="chat-empty-action"
            onClick={onStartCall}
          >
            <div className="chat-empty-action-icon">
              <PhoneCall className="w-[26px] h-[26px]" />
            </div>
            <span>Start call</span>
          </button>
          <button
            type="button"
            className="chat-empty-action"
            onClick={onNewCallLink}
          >
            <div className="chat-empty-action-icon">
              <Link2 className="w-[26px] h-[26px]" />
            </div>
            <span>New call link</span>
          </button>
          <button
            type="button"
            className="chat-empty-action"
            onClick={onCallNumber}
          >
            <div className="chat-empty-action-icon">
              <Grid3X3 className="w-[26px] h-[26px]" />
            </div>
            <span>Call a number</span>
          </button>
          <button
            type="button"
            className="chat-empty-action"
            onClick={onScheduleCall}
          >
            <div className="chat-empty-action-icon">
              <Calendar className="w-[26px] h-[26px]" />
            </div>
            <span>Schedule call</span>
          </button>
        </div>

        {/* Encryption notice */}
        <p className="mt-8 hidden md:flex items-center gap-1.5 text-[12px] text-text-secondary select-none">
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
          Your calls are end-to-end encrypted.
        </p>

        {/* Mobile fallback — simple text */}
        <div className="flex md:hidden flex-col items-center gap-3 text-text-secondary">
          <Phone className="w-12 h-12 opacity-30" />
          <p className="text-[15px] font-medium">
            Select a call to view details
          </p>
          <p className="text-[13px] opacity-70">
            Your call history will appear here
          </p>
        </div>
      </div>
    );
  }

  const dateGroups = groupCallsByDate(callGroup.calls);

  return (
    <div className="flex-1 flex flex-col bg-bg min-h-0 h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 h-[64px] shrink-0 border-b border-border">
        <h2 className="text-[17px] font-semibold text-text-main">Call info</h2>
        <button
          onClick={onClose}
          title="Close"
          className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:text-text-main hover:bg-input transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Contact Card */}
      <div className="px-6 py-5">
        <div className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border">
          {/* Avatar */}
          {callGroup.contactAvatar ? (
            <img
              src={callGroup.contactAvatar}
              alt={callGroup.contactName}
              className="w-12 h-12 rounded-full object-cover shrink-0"
            />
          ) : (
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-white text-base font-semibold shrink-0"
              style={{
                background:
                  callGroup.contactGradient ||
                  "linear-gradient(135deg, #6366f1, #a855f7)",
              }}
            >
              {callGroup.contactInitials}
            </div>
          )}

          {/* Name */}
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-semibold text-text-main truncate">
              {callGroup.contactName}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={onStartChat}
              className="w-9 h-9 rounded-full flex items-center justify-center text-text-secondary hover:text-accent hover:bg-accent/10 transition-colors"
              title="Message"
            >
              <MessageSquare className="w-[18px] h-[18px]" />
            </button>
            <button
              onClick={onStartVideoCall}
              className="w-9 h-9 rounded-full flex items-center justify-center text-text-secondary hover:text-accent hover:bg-accent/10 transition-colors"
              title="Video call"
            >
              <Video className="w-[18px] h-[18px]" />
            </button>
            <button
              onClick={onStartVoiceCall}
              className="w-9 h-9 rounded-full flex items-center justify-center text-text-secondary hover:text-accent hover:bg-accent/10 transition-colors"
              title="Voice call"
            >
              <Phone className="w-[18px] h-[18px]" />
            </button>
          </div>
        </div>
      </div>

      {/* Call History */}
      <div className="flex-1 overflow-y-auto px-6 pb-6 scrollbar-thin scrollbar-thumb-border hover:scrollbar-thumb-toggle-off">
        {dateGroups.map((group) => (
          <div key={group.label} className="mb-4">
            {/* Date Label */}
            <p className="text-[12px] font-medium text-text-secondary mb-3 pl-1">
              {group.label}
            </p>

            {/* Call entries */}
            {group.calls.map((call) => {
              const detail = callResultDetail(call);
              return (
                <div
                  key={call.id}
                  className="flex items-center gap-3 py-2.5 pl-1"
                >
                  <CallIcon call={call} />
                  <p className="flex-1 text-[13.5px] text-text-main min-w-0 truncate">
                    {callResultLabel(call)}
                  </p>
                  {detail && (
                    <span className="text-[12px] text-text-secondary whitespace-nowrap shrink-0">
                      {detail}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
