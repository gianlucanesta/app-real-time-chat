import { useState, useMemo, useCallback } from "react";
import {
  X,
  Video,
  Phone,
  ChevronUp,
  ChevronDown,
  Search,
  Send,
} from "lucide-react";
import { useChat } from "../../contexts/ChatContext";
import { useAuth } from "../../contexts/AuthContext";

interface ScheduleCallModalProps {
  open: boolean;
  onClose: () => void;
  onSchedule: (scheduled: ScheduledCall) => void;
}

export interface ScheduledCall {
  id: string;
  name: string;
  description: string;
  startDate: string; // ISO
  endDate: string; // ISO
  callType: "video" | "voice";
  participants: string[]; // user IDs
}

/** Marker prefix for scheduled-call invite messages. */
export const SCHEDULED_CALL_PREFIX = "📅[SCHEDULED_CALL]";

export interface ScheduledCallPayload {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  callType: "video" | "voice";
  organizerName: string;
  participantCount: number;
}

/** Try to parse a scheduled-call payload from a message text. */
export function parseScheduledCallMessage(
  text: string,
): ScheduledCallPayload | null {
  if (!text.startsWith(SCHEDULED_CALL_PREFIX)) return null;
  try {
    return JSON.parse(text.slice(SCHEDULED_CALL_PREFIX.length));
  } catch {
    return null;
  }
}

function formatDateForInput(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatTimeForInput(date: Date): string {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

export function ScheduleCallModal({
  open,
  onClose,
  onSchedule,
}: ScheduleCallModalProps) {
  const { conversations } = useChat();
  const { user } = useAuth();

  // Defaults: start = now rounded up to next 30min, end = start + 30min
  const now = new Date();
  const roundedMinutes = Math.ceil(now.getMinutes() / 30) * 30;
  const defaultStart = new Date(now);
  defaultStart.setMinutes(roundedMinutes, 0, 0);
  if (roundedMinutes >= 60) {
    defaultStart.setHours(defaultStart.getHours() + 1);
    defaultStart.setMinutes(0);
  }
  const defaultEnd = new Date(defaultStart.getTime() + 30 * 60 * 1000);

  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(formatDateForInput(defaultStart));
  const [startTime, setStartTime] = useState(formatTimeForInput(defaultStart));
  const [endDate, setEndDate] = useState(formatDateForInput(defaultEnd));
  const [endTime, setEndTime] = useState(formatTimeForInput(defaultEnd));
  const [showEndTime, setShowEndTime] = useState(true);
  const [callType, setCallType] = useState<"video" | "voice">("video");

  // Selected participants stored as user IDs (the other user in a direct conv)
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>(
    [],
  );
  const [participantSearch, setParticipantSearch] = useState("");
  const [showParticipantPicker, setShowParticipantPicker] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Only direct conversations as potential contacts (never groups)
  const directConversations = useMemo(
    () => conversations.filter((c) => c.type === "direct"),
    [conversations],
  );

  // Filtered contacts for the search dropdown
  const filteredContacts = useMemo(() => {
    if (!participantSearch.trim()) return directConversations;
    const q = participantSearch.toLowerCase();
    return directConversations.filter((c) =>
      c.name.toLowerCase().includes(q),
    );
  }, [directConversations, participantSearch]);

  // Helper: get the other user's ID from a direct conversation
  const getOtherUserId = useCallback(
    (conv: { participants: string[] }) => {
      return conv.participants.find((p) => p !== user?.id) ?? "";
    },
    [user?.id],
  );

  // Helper: resolve a participant user ID to a display name
  const getParticipantName = useCallback(
    (userId: string): string => {
      const conv = directConversations.find((c) =>
        c.participants.includes(userId) && c.participants.some((p) => p !== user?.id && p === userId),
      );
      return conv?.name ?? userId;
    },
    [directConversations, user?.id],
  );



  const toggleParticipant = useCallback((userId: string) => {
    setSelectedParticipants((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  }, []);

  const removeParticipant = useCallback((userId: string) => {
    setSelectedParticipants((prev) => prev.filter((id) => id !== userId));
  }, []);

  const handleSubmit = useCallback(() => {
    const newErrors: Record<string, string> = {};

    const start = new Date(`${startDate}T${startTime}`);
    const end = showEndTime
      ? new Date(`${endDate}T${endTime}`)
      : new Date(start.getTime() + 60 * 60 * 1000);

    if (isNaN(start.getTime())) {
      newErrors.startDate = "Invalid start date/time";
    }
    if (showEndTime && isNaN(end.getTime())) {
      newErrors.endDate = "Invalid end date/time";
    }
    if (showEndTime && end <= start) {
      newErrors.endDate = "End time must be after start time";
    }

    if (selectedParticipants.length === 0) {
      newErrors.participants = "Select at least one participant";
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    // Build a call name from participants if not explicitly set
    const participantNames = selectedParticipants
      .map((pid) => getParticipantName(pid))
      .join(", ");
    const callName = participantNames || "Scheduled call";

    const scheduled: ScheduledCall = {
      id: crypto.randomUUID(),
      name: callName,
      description: description.trim(),
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      callType,
      participants: selectedParticipants,
    };

    onSchedule(scheduled);
    onClose();
    // Reset form
    setDescription("");
    setSelectedParticipants([]);
    setErrors({});
    setShowParticipantPicker(false);
    setParticipantSearch("");
  }, [
    startDate,
    startTime,
    endDate,
    endTime,
    showEndTime,
    description,
    callType,
    selectedParticipants,
    getParticipantName,
    onSchedule,
    onClose,
  ]);

  const handleClose = useCallback(() => {
    onClose();
    setDescription("");
    setSelectedParticipants([]);
    setErrors({});
    setShowParticipantPicker(false);
    setParticipantSearch("");
  }, [onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <button
              onClick={handleClose}
              title="Close"
              className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:text-text-main hover:bg-input transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-[16px] font-semibold text-text-main">
              Schedule call
            </h2>
          </div>
        </div>

        {/* Scrollable Form */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 scrollbar-thin scrollbar-thumb-border">
          {/* Description */}
          <div>
            <label className="text-[12px] text-text-secondary block mb-1">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (optional)"
              rows={2}
              className="w-full px-3 py-2.5 rounded-lg bg-input border border-border text-[14px] text-text-main placeholder:text-text-secondary/60 outline-none focus:border-accent transition-colors resize-none"
            />
          </div>

          {/* Start date & time */}
          <div>
            <label className="text-[12px] text-text-secondary block mb-1">
              Start date & time
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  title="Start date"
                  className="w-full px-3 py-2.5 rounded-lg bg-input border border-border text-[14px] text-text-main outline-none focus:border-accent transition-colors"
                />
              </div>
              <div className="relative">
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  title="Start time"
                  className="w-[120px] px-3 py-2.5 rounded-lg bg-input border border-border text-[14px] text-text-main outline-none focus:border-accent transition-colors"
                />
              </div>
            </div>
            {errors.startDate && (
              <p className="text-[12px] text-danger mt-1">{errors.startDate}</p>
            )}
          </div>

          {/* End date & time */}
          {showEndTime && (
            <div>
              <label className="text-[12px] text-text-secondary block mb-1">
                End date & time
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    title="End date"
                    className="w-full px-3 py-2.5 rounded-lg bg-input border border-border text-[14px] text-text-main outline-none focus:border-accent transition-colors"
                  />
                </div>
                <div className="relative">
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    title="End time"
                    className="w-[120px] px-3 py-2.5 rounded-lg bg-input border border-border text-[14px] text-text-main outline-none focus:border-accent transition-colors"
                  />
                </div>
              </div>
              {errors.endDate && (
                <p className="text-[12px] text-danger mt-1">{errors.endDate}</p>
              )}
            </div>
          )}

          {/* Toggle end time */}
          <button
            onClick={() => setShowEndTime(!showEndTime)}
            className="text-[13px] text-accent hover:underline"
          >
            {showEndTime ? "× Remove end time" : "+ Add end time"}
          </button>

          {/* Call type */}
          <div>
            <label className="text-[12px] text-text-secondary block mb-2">
              Call type
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setCallType("video")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium transition-colors border ${
                  callType === "video"
                    ? "bg-accent text-white border-accent"
                    : "bg-input text-text-secondary border-border hover:border-accent/50"
                }`}
              >
                <Video className="w-4 h-4" />
                Video
              </button>
              <button
                onClick={() => setCallType("voice")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium transition-colors border ${
                  callType === "voice"
                    ? "bg-accent text-white border-accent"
                    : "bg-input text-text-secondary border-border hover:border-accent/50"
                }`}
              >
                <Phone className="w-4 h-4" />
                Voice
              </button>
            </div>
          </div>

          {/* ── Participants section ── */}
          <div>
            <label className="text-[12px] text-text-secondary block mb-2">
              Participants
            </label>

            {/* Selected participant pills */}
            {selectedParticipants.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {selectedParticipants.map((pid) => (
                  <span
                    key={pid}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-accent/15 text-accent text-[12px] font-medium border border-accent/30"
                  >
                    {getParticipantName(pid)}
                    <button
                      onClick={() => removeParticipant(pid)}
                      className="w-3.5 h-3.5 rounded-full flex items-center justify-center hover:bg-accent/20 transition-colors"
                      title={`Remove ${getParticipantName(pid)}`}
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {errors.participants && (
              <p className="text-[12px] text-danger mb-2">
                {errors.participants}
              </p>
            )}

            {/* Add participants toggle */}
            <button
              onClick={() => setShowParticipantPicker(!showParticipantPicker)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-input border border-border text-[14px] text-text-secondary hover:border-accent/50 transition-colors"
            >
              <span>Add participants...</span>
              {showParticipantPicker ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {/* Contact picker dropdown */}
            {showParticipantPicker && (
              <div className="mt-2 rounded-lg border border-border bg-card overflow-hidden">
                {/* Search bar */}
                <div className="px-3 py-2 border-b border-border">
                  <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-input border border-border">
                    <Search className="w-3.5 h-3.5 text-text-secondary shrink-0" />
                    <input
                      type="text"
                      placeholder="Search..."
                      value={participantSearch}
                      onChange={(e) => setParticipantSearch(e.target.value)}
                      className="flex-1 bg-transparent text-[13px] text-text-main placeholder:text-text-secondary outline-none"
                    />
                  </div>
                </div>

                {/* Contact list */}
                <div className="max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-border">
                  {filteredContacts.map((conv) => {
                    const otherUserId = getOtherUserId(conv);
                    if (!otherUserId) return null;
                    const isSelected = selectedParticipants.includes(otherUserId);

                    return (
                      <button
                        key={conv.id}
                        onClick={() => toggleParticipant(otherUserId)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-input/50 transition-colors"
                      >
                        {/* Avatar */}
                        {conv.avatar ? (
                          <img
                            src={conv.avatar}
                            alt={conv.name}
                            className="w-9 h-9 rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[12px] font-semibold shrink-0"
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
                        <p className="flex-1 text-[13px] font-medium text-text-main truncate text-left">
                          {conv.name}
                        </p>

                        {/* Checkbox */}
                        <div
                          className={`w-[20px] h-[20px] rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? "bg-accent border-accent"
                              : "border-text-secondary/40"
                          }`}
                        >
                          {isSelected && (
                            <svg
                              className="w-3 h-3 text-white"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth="3"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </div>
                      </button>
                    );
                  })}
                  {filteredContacts.length === 0 && (
                    <p className="px-4 py-6 text-center text-[13px] text-text-secondary">
                      No contacts found
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Schedule call button */}
        <div className="px-5 pb-5 pt-3 border-t border-border">
          <button
            onClick={handleSubmit}
            disabled={selectedParticipants.length === 0}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[14px] font-semibold text-white bg-accent hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
            Schedule call
          </button>
        </div>
      </div>
    </div>
  );
}
