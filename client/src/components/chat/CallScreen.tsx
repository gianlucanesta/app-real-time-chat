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
import { useState, useEffect, useRef, useCallback } from "react";
import type { CallStatus } from "../../hooks/useWebRTC";

interface CallScreenProps {
  status: CallStatus;
  contactName: string;
  contactInitials: string;
  contactGradient: string;
  contactAvatarUrl?: string | null;
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
  contactAvatarUrl,
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

  // ── Draggable PiP state ───────────────────────────────────────────────
  const [pipOffset, setPipOffset] = useState({ x: 0, y: 0 });
  const [pipExpanded, setPipExpanded] = useState(false);
  const dragRef = useRef({
    active: false,
    startMouse: { x: 0, y: 0 },
    startOffset: { x: 0, y: 0 },
  });

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

  // Reset PiP when a new call starts
  useEffect(() => {
    if (status === "calling" || status === "connecting") {
      setPipOffset({ x: 0, y: 0 });
      setPipExpanded(false);
    }
  }, [status]);

  // Attach local stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Attach remote stream — element is always in DOM so audio always plays
  useEffect(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
    // Route audio to the user's preferred speaker
    const speakerId = localStorage.getItem("ephemeral-speaker-id");
    if (
      speakerId &&
      remoteVideoRef.current &&
      "setSinkId" in remoteVideoRef.current
    ) {
      (remoteVideoRef.current as any).setSinkId(speakerId).catch(() => {});
    }
  }, [remoteStream]);

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // ── PiP drag handlers ─────────────────────────────────────────────────
  const handlePipPointerDown = useCallback(
    (e: React.PointerEvent) => {
      dragRef.current = {
        active: true,
        startMouse: { x: e.clientX, y: e.clientY },
        startOffset: { ...pipOffset },
      };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      e.preventDefault();
    },
    [pipOffset],
  );

  const handlePipPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current.active) return;
    setPipOffset({
      x:
        dragRef.current.startOffset.x +
        (e.clientX - dragRef.current.startMouse.x),
      y:
        dragRef.current.startOffset.y +
        (e.clientY - dragRef.current.startMouse.y),
    });
  }, []);

  const handlePipPointerUp = useCallback(() => {
    dragRef.current.active = false;
  }, []);

  const handlePipDoubleClick = useCallback(() => {
    setPipExpanded((prev) => !prev);
  }, []);

  if (!isOpen) return null;

  const hasRemoteVideo =
    remoteStream && remoteStream.getVideoTracks().length > 0;
  const showRemoteVideo = hasRemoteVideo && status === "connected";
  const showLocalPip = localStream && callWithVideo;

  return (
    <div className="call-screen open" role="dialog" aria-label="Active call">
      {/* Video / Avatar area */}
      <div className="call-screen-content">
        {/* Remote video — always in DOM so remote audio plays even on voice calls */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="call-remote-video"
          style={{
            opacity: showRemoteVideo ? 1 : 0,
            pointerEvents: showRemoteVideo ? "auto" : "none",
          }}
        />

        {/* Avatar / status fallback (voice call or pre-connect) */}
        {!showRemoteVideo && (
          <>
            {contactAvatarUrl ? (
              <img
                src={contactAvatarUrl}
                alt={contactName}
                className="call-avatar rounded-full object-cover"
              />
            ) : (
              <div
                className="call-avatar"
                style={{ background: contactGradient }}
              >
                {contactInitials}
              </div>
            )}
            <div className="call-name">{contactName}</div>

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

        {/* Local video PiP — draggable & double-click to expand */}
        {showLocalPip && (
          <div
            className={`call-local-pip${pipExpanded ? " call-local-pip--expanded" : ""}`}
            style={{
              transform: `translate(${pipOffset.x}px, ${pipOffset.y}px)`,
              cursor: dragRef.current.active ? "grabbing" : "grab",
            }}
            onPointerDown={handlePipPointerDown}
            onPointerMove={handlePipPointerMove}
            onPointerUp={handlePipPointerUp}
            onDoubleClick={handlePipDoubleClick}
          >
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
