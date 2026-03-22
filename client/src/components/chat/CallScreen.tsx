import {
  Video,
  Mic,
  MonitorUp,
  PhoneOff,
  MicOff,
  VideoOff,
  MonitorOff,
  RotateCw,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import type { CallStatus } from "../../hooks/useWebRTC";

interface CallScreenProps {
  status: CallStatus;
  contactName: string;
  contactInitials: string;
  contactGradient: string;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isCameraOff: boolean;
  isScreenSharing: boolean;
  callWithVideo: boolean;
  onEndCall: () => void;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  onRetry: () => void;
}

export function CallScreen({
  status,
  contactName,
  contactInitials,
  contactGradient,
  localStream,
  remoteStream,
  isMuted,
  isCameraOff,
  isScreenSharing,
  callWithVideo,
  onEndCall,
  onToggleMute,
  onToggleCamera,
  onToggleScreenShare,
  onRetry,
}: CallScreenProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [timer, setTimer] = useState(0);

  const isOpen =
    status === "calling" ||
    status === "connecting" ||
    status === "connected" ||
    status === "reconnecting" ||
    status === "failed";

  // Timer — runs only when connected
  useEffect(() => {
    let interval: number;
    if (status === "connected") {
      interval = window.setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    }
    if (status === "idle" || status === "ended") {
      setTimer(0);
    }
    return () => window.clearInterval(interval);
  }, [status]);

  // Attach local stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Attach remote stream
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  if (!isOpen) return null;

  const hasRemoteVideo =
    remoteStream && remoteStream.getVideoTracks().length > 0;
  const showLocalPip = localStream && callWithVideo;

  return (
    <div className="call-screen open" role="dialog" aria-label="Active call">
      {/* Video / Avatar area */}
      <div className="call-screen-content">
        {/* Remote video (full area) */}
        {hasRemoteVideo && status === "connected" ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="call-remote-video"
          />
        ) : (
          <>
            <div
              className="call-avatar"
              style={{ background: contactGradient }}
            >
              {contactInitials}
            </div>
            <div className="call-name">{contactName}</div>

            {/* Status text */}
            {status === "calling" && (
              <div className="call-status-text">Calling...</div>
            )}
            {status === "connecting" && (
              <div className="call-status-text">Connecting...</div>
            )}
            {status === "reconnecting" && (
              <div className="call-status-text">Reconnecting...</div>
            )}
            {status === "failed" && (
              <div className="call-status-text call-status-failed">
                Connection failed. Network may not support P2P calls.
              </div>
            )}
            {status === "connected" && !hasRemoteVideo && (
              <div className="call-waveform" aria-hidden="true">
                <span></span>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
              </div>
            )}
          </>
        )}

        {/* Local video PiP */}
        {showLocalPip && (
          <div className="call-local-pip">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="call-local-video"
            />
          </div>
        )}

        {status === "connected" && (
          <div className="call-timer">{formatTimer(timer)}</div>
        )}
      </div>

      {/* Bottom action bar */}
      <div className="call-screen-bar">
        {/* Camera (only for video calls) */}
        {callWithVideo && (
          <button
            type="button"
            className="call-bar-btn"
            data-active={!isCameraOff}
            onClick={onToggleCamera}
            aria-label="Toggle camera"
            style={isCameraOff ? { background: "var(--color-danger)" } : {}}
          >
            {!isCameraOff ? (
              <Video className="w-6 h-6" />
            ) : (
              <VideoOff className="w-6 h-6" />
            )}
          </button>
        )}

        {/* Mic */}
        <button
          type="button"
          className="call-bar-btn"
          data-active={!isMuted}
          onClick={onToggleMute}
          aria-label="Toggle microphone"
          style={isMuted ? { background: "var(--color-danger)" } : {}}
        >
          {!isMuted ? (
            <Mic className="w-6 h-6" />
          ) : (
            <MicOff className="w-6 h-6" />
          )}
        </button>

        {/* Screen Share */}
        {callWithVideo && (
          <button
            type="button"
            className="call-bar-btn"
            onClick={onToggleScreenShare}
            aria-label="Share screen"
            style={isScreenSharing ? { background: "var(--color-accent)" } : {}}
          >
            {isScreenSharing ? (
              <MonitorOff className="w-6 h-6" />
            ) : (
              <MonitorUp className="w-6 h-6" />
            )}
          </button>
        )}

        {/* Retry button (failed state) */}
        {status === "failed" && (
          <button
            type="button"
            className="call-bar-btn"
            onClick={onRetry}
            aria-label="Retry call"
            style={{ background: "var(--color-accent)" }}
          >
            <RotateCw className="w-6 h-6" />
          </button>
        )}

        {/* End call */}
        <button
          type="button"
          className="call-end-btn"
          onClick={onEndCall}
          aria-label="End call"
        >
          <PhoneOff className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
