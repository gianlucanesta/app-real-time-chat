import { useState, useMemo, useCallback } from "react";
import { X, Video, Phone, ChevronDown, Search, Send } from "lucide-react";
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
  const [showParticipantPicker, setShowParticipantPicker] = useState(false);
  const [participantSearch, setParticipantSearch] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Direct conversations as potential participants
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

  const validate = useCallback((): boolean => {
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

  const handleSubmit = useCallback(() => {
    if (!validate()) return;

    const start = new Date(`${startDate}T${startTime}`);
    const end = showEndTime
      ? new Date(`${endDate}T${endTime}`)
      : new Date(start.getTime() + 60 * 60 * 1000); // default 1h if no end

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
  }, [
    validate,
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

  // Auto-set call name hint
  const nameHint = useMemo(() => {
    if (user?.displayName) return `${user.displayName}'s call`;
    return "My call";
  }, [user]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
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

          {/* Participants */}
          <div>
            <label className="text-[12px] text-text-secondary block mb-2">
              Participants
            </label>

            {/* Selected participants badges */}
            {selectedParticipants.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {selectedParticipants.map((pid) => {
                  const conv = conversations.find((c) =>
                    c.participants.includes(pid),
                  );
                  return (
                    <span
                      key={pid}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-accent/10 text-accent text-[12px]"
                    >
                      {conv?.name || pid}
                      <button
                        onClick={() => toggleParticipant(pid)}
                        title="Remove participant"
                        className="hover:text-danger transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            <button
              onClick={() => setShowParticipantPicker(!showParticipantPicker)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-input border border-border text-[14px] text-text-secondary hover:border-accent/50 transition-colors"
            >
              <span>Add participants...</span>
              <ChevronDown
                className={`w-4 h-4 transition-transform ${showParticipantPicker ? "rotate-180" : ""}`}
              />
            </button>

            {showParticipantPicker && (
              <div className="mt-2 border border-border rounded-xl overflow-hidden max-h-[200px] flex flex-col">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-input/50">
                  <Search className="w-4 h-4 text-text-secondary" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={participantSearch}
                    onChange={(e) => setParticipantSearch(e.target.value)}
                    className="flex-1 bg-transparent text-[13px] text-text-main placeholder:text-text-secondary outline-none"
                  />
                </div>
                <div className="overflow-y-auto scrollbar-thin scrollbar-thumb-border">
                  {contacts.map((conv) => {
                    const pid = conv.participants.find((p) => p !== user?.id);
                    if (!pid) return null;
                    const isSelected = selectedParticipants.includes(pid);
                    return (
                      <button
                        key={conv.id}
                        onClick={() => toggleParticipant(pid)}
                        className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-input/80 transition-colors ${isSelected ? "bg-accent/5" : ""}`}
                      >
                        {conv.avatar ? (
                          <img
                            src={conv.avatar}
                            alt={conv.name}
                            className="w-8 h-8 rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
                            style={{
                              background:
                                conv.gradient ||
                                "linear-gradient(135deg, #6366f1, #a855f7)",
                            }}
                          >
                            {conv.initials}
                          </div>
                        )}
                        <span className="flex-1 text-left text-[13px] text-text-main truncate">
                          {conv.name}
                        </span>
                        <div
                          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                            isSelected
                              ? "bg-accent border-accent"
                              : "border-border"
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
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Submit button */}
        <div className="px-5 pb-5 pt-3 border-t border-border">
          <button
            onClick={handleSubmit}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[14px] font-semibold text-white bg-accent hover:brightness-110 transition-all"
          >
            <Send className="w-4 h-4" />
            Schedule call
          </button>
        </div>
      </div>
    </div>
  );
}
