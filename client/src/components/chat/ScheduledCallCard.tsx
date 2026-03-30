import { CalendarClock, Users, Video, Phone } from "lucide-react";
import type { ScheduledCallPayload } from "./ScheduleCallModal";

interface ScheduledCallCardProps {
  payload: ScheduledCallPayload;
  isSent: boolean;
  onJoin?: () => void;
}

function formatCallDate(isoStart: string, isoEnd: string): string {
  const start = new Date(isoStart);
  const end = new Date(isoEnd);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isToday = start.toDateString() === today.toDateString();
  const isTomorrow = start.toDateString() === tomorrow.toDateString();

  const dateLabel = isToday
    ? "Today"
    : isTomorrow
      ? "Tomorrow"
      : start.toLocaleDateString(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric",
        });

  const startTime = start.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const endTime = end.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `${dateLabel}, ${startTime} - ${endTime}`;
}

export function ScheduledCallCard({
  payload,
  isSent,
  onJoin,
}: ScheduledCallCardProps) {
  const CallIcon = payload.callType === "video" ? Video : Phone;

  return (
    <div className="min-w-[260px] max-w-[308px]">
      {/* Card body */}
      <div
        className={`rounded-xl overflow-hidden border ${
          isSent ? "border-white/20" : "border-border"
        }`}
      >
        {/* Top section — dark teal background like WhatsApp */}
        <div className={`px-4 py-3 ${isSent ? "bg-white/10" : "bg-accent/10"}`}>
          <div className="flex items-start gap-3">
            {/* Calendar icon */}
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                isSent ? "bg-white/15" : "bg-accent/15"
              }`}
            >
              <CalendarClock
                className={`w-5 h-5 ${isSent ? "text-white/90" : "text-accent"}`}
              />
            </div>
            {/* Info */}
            <div className="flex-1 min-w-0">
              <p
                className={`text-[14px] font-semibold leading-tight ${
                  isSent ? "text-white" : "text-text-main"
                }`}
              >
                {payload.organizerName}&apos;s call
              </p>
              <p
                className={`text-[12px] mt-0.5 ${
                  isSent ? "text-white/70" : "text-text-secondary"
                }`}
              >
                {formatCallDate(payload.startDate, payload.endDate)}
              </p>
              <p
                className={`text-[12px] mt-0.5 ${
                  isSent ? "text-white/70" : "text-text-secondary"
                }`}
              >
                {payload.callType === "video" ? "Video call" : "Voice call"}
              </p>
              <div className="flex items-center gap-1 mt-1">
                <Users
                  className={`w-3.5 h-3.5 ${isSent ? "text-white/60" : "text-text-secondary"}`}
                />
                <span
                  className={`text-[11px] ${
                    isSent ? "text-white/60" : "text-text-secondary"
                  }`}
                >
                  Participants: {payload.participantCount}
                </span>
              </div>
            </div>
            {/* Call type icon */}
            <CallIcon
              className={`w-4 h-4 shrink-0 mt-1 ${
                isSent ? "text-white/50" : "text-text-secondary/50"
              }`}
            />
          </div>
        </div>

        {/* Join link */}
        <button
          onClick={onJoin}
          className={`w-full px-4 py-2.5 text-center text-[13px] font-medium transition-colors ${
            isSent
              ? "text-white/90 hover:bg-white/10"
              : "text-accent hover:bg-accent/5"
          }`}
        >
          Join the call
        </button>
      </div>
    </div>
  );
}
