import { useState, useMemo, useCallback } from "react";
import {
  X,
  Video,
  Phone,
  ChevronDown,
  Search,
  Send,
  ArrowLeft,
  ArrowRight,
  CalendarClock,
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

  // Step: "details" = fill call info, "contacts" = pick who to send to
  const [step, setStep] = useState<"details" | "contacts">("details");

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

  const [callName, setCallName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(formatDateForInput(defaultStart));
  const [startTime, setStartTime] = useState(formatTimeForInput(defaultStart));
  const [endDate, setEndDate] = useState(formatDateForInput(defaultEnd));
  const [endTime, setEndTime] = useState(formatTimeForInput(defaultEnd));
  const [showEndTime, setShowEndTime] = useState(true);
  const [callType, setCallType] = useState<"video" | "voice">("video");
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>(
    [],
  );
  const [participantSearch, setParticipantSearch] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Direct conversations as potential contacts
  const contacts = useMemo(() => {
    const direct = conversations.filter((c) => c.type === "direct");
    if (!participantSearch.trim()) return direct;
    const q = participantSearch.toLowerCase();
    return direct.filter((c) => c.name.toLowerCase().includes(q));
  }, [conversations, participantSearch]);

  const toggleParticipant = useCallback((participantId: string) => {
    setSelectedParticipants((prev) =>
      prev.includes(participantId)
        ? prev.filter((id) => id !== participantId)
        : [...prev, participantId],
    );
  }, []);

  const validateDetails = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!callName.trim()) {
      newErrors.name = "Call name is required";
    }

    const start = new Date(`${startDate}T${startTime}`);
    const end = new Date(`${endDate}T${endTime}`);

    if (isNaN(start.getTime())) {
      newErrors.startDate = "Invalid start date/time";
    }
    if (showEndTime && isNaN(end.getTime())) {
      newErrors.endDate = "Invalid end date/time";
    }
    if (showEndTime && end <= start) {
      newErrors.endDate = "End time must be after start time";
    }
    if (start < new Date()) {
      newErrors.startDate = "Start time must be in the future";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [callName, startDate, startTime, endDate, endTime, showEndTime]);

  const handleGoToContacts = useCallback(() => {
    if (!validateDetails()) return;
    setStep("contacts");
    setParticipantSearch("");
  }, [validateDetails]);

  const handleSubmit = useCallback(() => {
    if (selectedParticipants.length === 0) return;

    const start = new Date(`${startDate}T${startTime}`);
    const end = showEndTime
      ? new Date(`${endDate}T${endTime}`)
      : new Date(start.getTime() + 60 * 60 * 1000);

    const scheduled: ScheduledCall = {
      id: crypto.randomUUID(),
      name: callName.trim(),
      description: description.trim(),
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      callType,
      participants: selectedParticipants,
    };

    onSchedule(scheduled);
    onClose();
    // Reset form
    setCallName("");
    setDescription("");
    setSelectedParticipants([]);
    setErrors({});
    setStep("details");
  }, [
    startDate,
    startTime,
    endDate,
    endTime,
    showEndTime,
    callName,
    description,
    callType,
    selectedParticipants,
    onSchedule,
    onClose,
  ]);

  const handleClose = useCallback(() => {
    onClose();
    setStep("details");
    setCallName("");
    setDescription("");
    setSelectedParticipants([]);
    setErrors({});
  }, [onClose]);

  // Auto-set call name hint
  const nameHint = useMemo(() => {
    if (user?.displayName) return `${user.displayName}'s call`;
    return "My call";
  }, [user]);

  // Selected participants display names for bottom bar
  const selectedNames = useMemo(() => {
    return selectedParticipants
      .map((pid) => {
        const conv = conversations.find((c) => {
          const other = c.participants.find((p) => p !== user?.id);
          return other === pid;
        });
        return conv?.name || pid;
      })
      .join(", ");
  }, [selectedParticipants, conversations, user]);

  if (!open) return null;

  // ── Step 2: Contact Picker (WhatsApp "Send to" style) ──
  if (step === "contacts") {
    return (
      <div
        className="fixed inset-0 z-[500] flex items-center justify-center bg-black/50"
        onClick={(e) => {
          if (e.target === e.currentTarget) handleClose();
        }}
      >
        <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
            <button
              onClick={() => setStep("details")}
              title="Back"
              className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:text-text-main hover:bg-input transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1 min-w-0">
              <h2 className="text-[16px] font-semibold text-text-main">
                Send to
              </h2>
              <p className="text-[12px] text-text-secondary truncate">
                {callName || nameHint}
              </p>
            </div>
            <button
              onClick={handleClose}
              title="Close"
              className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:text-text-main hover:bg-input transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search bar */}
          <div className="px-4 py-2 border-b border-border">
            <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-input border border-border">
              <Search className="w-4 h-4 text-text-secondary shrink-0" />
              <input
                type="text"
                placeholder="Search a name or number"
                value={participantSearch}
                onChange={(e) => setParticipantSearch(e.target.value)}
                className="flex-1 bg-transparent text-[14px] text-text-main placeholder:text-text-secondary outline-none"
              />
            </div>
          </div>

          {/* Contact list */}
          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-border">
            <p className="px-5 pt-3 pb-2 text-[12px] text-text-secondary font-medium uppercase tracking-wider">
              Recent chats
            </p>
            {contacts.map((conv) => {
              const pid = conv.participants.find((p) => p !== user?.id);
              if (!pid) return null;
              const isSelected = selectedParticipants.includes(pid);
              return (
                <button
                  key={conv.id}
                  onClick={() => toggleParticipant(pid)}
                  className={`w-full flex items-center gap-3 px-5 py-3 hover:bg-input/50 transition-colors`}
                >
                  {/* Checkbox */}
                  <div
                    className={`w-[22px] h-[22px] rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                      isSelected
                        ? "bg-accent border-accent"
                        : "border-text-secondary/40"
                    }`}
                  >
                    {isSelected && (
                      <svg
                        className="w-3.5 h-3.5 text-white"
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
                  {/* Name + last message */}
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-[14px] font-medium text-text-main truncate">
                      {conv.name}
                    </p>
                    {conv.lastMessage && (
                      <p className="text-[12px] text-text-secondary truncate">
                        {conv.lastMessage}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
            {contacts.length === 0 && (
              <p className="px-5 py-8 text-center text-[13px] text-text-secondary">
                No contacts found
              </p>
            )}
          </div>

          {/* Bottom bar — selected contacts + send button */}
          {selectedParticipants.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 border-t border-border bg-card">
              <p className="flex-1 text-[13px] text-text-main truncate min-w-0">
                {selectedNames}
              </p>
              <button
                onClick={handleSubmit}
                title="Send"
                className="w-11 h-11 rounded-full bg-accent flex items-center justify-center text-white hover:brightness-110 transition-all shrink-0 shadow-lg"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Step 1: Call Details ──
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
          <div className="flex items-center gap-1 text-[11px] text-text-secondary">
            <CalendarClock className="w-3.5 h-3.5" />
            Step 1 of 2
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 scrollbar-thin scrollbar-thumb-border">
          {/* Call name */}
          <div>
            <label className="text-[12px] text-text-secondary block mb-1">
              Call name
            </label>
            <input
              type="text"
              value={callName}
              onChange={(e) => setCallName(e.target.value)}
              placeholder={nameHint}
              className="w-full px-3 py-2.5 rounded-lg bg-input border border-border text-[14px] text-text-main placeholder:text-text-secondary/60 outline-none focus:border-accent transition-colors"
            />
            {errors.name && (
              <p className="text-[12px] text-danger mt-1">{errors.name}</p>
            )}
          </div>

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

          {/* Start date/time */}
          <div>
            <label className="text-[12px] text-text-secondary block mb-1">
              Start date & time
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                title="Start date"
                className="flex-1 px-3 py-2.5 rounded-lg bg-input border border-border text-[14px] text-text-main outline-none focus:border-accent transition-colors"
              />
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                title="Start time"
                className="w-[120px] px-3 py-2.5 rounded-lg bg-input border border-border text-[14px] text-text-main outline-none focus:border-accent transition-colors"
              />
            </div>
            {errors.startDate && (
              <p className="text-[12px] text-danger mt-1">{errors.startDate}</p>
            )}
          </div>

          {/* End date/time */}
          {showEndTime && (
            <div>
              <label className="text-[12px] text-text-secondary block mb-1">
                End date & time
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  title="End date"
                  className="flex-1 px-3 py-2.5 rounded-lg bg-input border border-border text-[14px] text-text-main outline-none focus:border-accent transition-colors"
                />
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  title="End time"
                  className="w-[120px] px-3 py-2.5 rounded-lg bg-input border border-border text-[14px] text-text-main outline-none focus:border-accent transition-colors"
                />
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
        </div>

        {/* Next button */}
        <div className="px-5 pb-5 pt-3 border-t border-border">
          <button
            onClick={handleGoToContacts}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[14px] font-semibold text-white bg-accent hover:brightness-110 transition-all"
          >
            Choose contacts
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
