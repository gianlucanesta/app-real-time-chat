import { CalendarClock, Users, Video, Phone } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
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

  return `${dateLabel}, at ${startTime} - ${endTime}`;
}

export function ScheduledCallCard({
  payload,
  isSent,
  onJoin,
}: ScheduledCallCardProps) {
  const isVideo = payload.callType === "video";
  const navigate = useNavigate();

  const handleJoin = () => {
    if (onJoin) {
      onJoin();
    } else {
      void navigate({ to: "/call/$id", params: { id: payload.id } });
    }
  };

  return (
    <div className="min-w-[260px] max-w-[308px]">
      {/* Card body */}
      <div
        className={`rounded-xl overflow-hidden ${
          isSent ? "" : "border border-border"
        }`}
      >
        {/* Top section — accent-tinted background */}
        <div
          className={`px-4 py-3.5 ${
            isSent
              ? "bg-white/10"
              : "bg-accent/8 border-b border-border"
          }`}
        >
          <div className="flex items-start gap-3">
            {/* Calendar icon — blue accent */}
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                isSent ? "bg-white/15" : "bg-accent/15"
              }`}
            >
              <CalendarClock
                className={`w-5 h-5 ${
                  isSent ? "text-white/90" : "text-accent"
                }`}
              />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              {/* Title: "Call by [name]" */}
              <p
                className={`text-[14px] font-semibold leading-tight ${
                  isSent ? "text-white" : "text-text-main"
                }`}
              >
                Call by {payload.organizerName}
              </p>

              {/* Date/time */}
              <p
                className={`text-[12px] mt-1 ${
                  isSent ? "text-white/70" : "text-text-secondary"
                }`}
              >
                {formatCallDate(payload.startDate, payload.endDate)}
              </p>

              {/* Call type */}
              <div className="flex items-center gap-1.5 mt-1">
                {isVideo ? (
                  <Video
                    className={`w-3.5 h-3.5 ${
                      isSent ? "text-white/60" : "text-text-secondary"
                    }`}
                  />
                ) : (
                  <Phone
                    className={`w-3.5 h-3.5 ${
                      isSent ? "text-white/60" : "text-text-secondary"
                    }`}
                  />
                )}
                <span
                  className={`text-[12px] ${
                    isSent ? "text-white/70" : "text-text-secondary"
                  }`}
                >
                  Ephemeral {isVideo ? "Video call" : "Voice call"}
                </span>
              </div>

              {/* Participants count */}
              <div className="flex items-center gap-1.5 mt-1">
                <Users
                  className={`w-3.5 h-3.5 ${
                    isSent ? "text-white/60" : "text-text-secondary"
                  }`}
                />
                <span
                  className={`text-[12px] ${
                    isSent ? "text-white/60" : "text-text-secondary"
                  }`}
                >
                  Participants: {payload.participantCount}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* "Join the call" action link — blue accent */}
        <button
          onClick={handleJoin}
          className={`w-full px-4 py-2.5 text-center text-[13px] font-semibold transition-colors ${
            isSent
              ? "text-white/90 hover:bg-white/10 bg-white/5"
              : "text-accent hover:bg-accent/5 bg-card"
          }`}
        >
          Join the call
        </button>
      </div>
    </div>
  );
}
