import { Phone, PhoneOff, Video } from "lucide-react";
import type { IncomingCallData } from "../../hooks/useWebRTC";

interface IncomingCallBannerProps {
  data: IncomingCallData;
  onAnswer: () => void;
  onReject: () => void;
}

export function IncomingCallBanner({
  data,
  onAnswer,
  onReject,
}: IncomingCallBannerProps) {
  return (
    <div className="incoming-call-banner" role="alert" aria-live="assertive">
      <div className="incoming-call-info">
        <div className="incoming-call-icon-ring">
          {data.withVideo ? (
            <Video className="w-5 h-5" />
          ) : (
            <Phone className="w-5 h-5" />
          )}
        </div>
        <div className="incoming-call-text">
          <span className="incoming-call-name">{data.fromName}</span>
          <span className="incoming-call-label">
            Incoming {data.withVideo ? "video" : "voice"} call...
          </span>
        </div>
      </div>
      <div className="incoming-call-actions">
        <button
          type="button"
          className="incoming-call-reject"
          onClick={onReject}
          aria-label="Reject call"
        >
          <PhoneOff className="w-5 h-5" />
        </button>
        <button
          type="button"
          className="incoming-call-accept"
          onClick={onAnswer}
          aria-label="Accept call"
        >
          <Phone className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
