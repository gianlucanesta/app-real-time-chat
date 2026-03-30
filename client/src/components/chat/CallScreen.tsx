import {
  Video,
  Mic,
  MonitorUp,
  PhoneOff,
  MicOff,
  VideoOff,
  MonitorOff,
  RotateCw,
  Copy,
  Check,
  UserPlus,
  ChevronRight,
  Users,
  X,
} from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import type { CallStatus } from "../../hooks/useWebRTC";
import type { TypedSocket } from "../../hooks/useSocket";

function generateCallLinkId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const seg = (len: number) =>
    Array.from(
      { length: len },
      () => chars[Math.floor(Math.random() * chars.length)],
    ).join("");
  return `${seg(3)}-${seg(4)}-${seg(3)}`;
}

interface CallScreenProps {
  status: CallStatus;
  contactName: string;
  contactInitials: string;
  contactGradient: string;
  contactAvatarUrl?: string | null;
  localInitials: string;
  localGradient: string;
  localAvatarUrl?: string | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isCameraOff: boolean;
  isScreenSharing: boolean;
  remoteIsScreenSharing: boolean;
  callWithVideo: boolean;
  onEndCall: () => void;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  onRetry: () => void;
  onAddPeople?: () => void;
  contactPhone?: string;
  callRoomId?: string;
  socket?: TypedSocket | null;
}

export function CallScreen({
  status,
  contactName,
  contactInitials,
  contactGradient,
  contactAvatarUrl,
  localInitials,
  localGradient,
  localAvatarUrl,
  localStream,
  remoteStream,
  isMuted,
  isCameraOff,
  isScreenSharing,
  remoteIsScreenSharing,
  callWithVideo,
  onEndCall,
  onToggleMute,
  onToggleCamera,
  onToggleScreenShare,
  onRetry,
  onAddPeople,
  contactPhone,
  callRoomId,
  socket,
}: CallScreenProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  remoteStreamRef.current = remoteStream;
  const localStreamRef = useRef<MediaStream | null>(null);
  localStreamRef.current = localStream;
  const [timer, setTimer] = useState(0);
  const [remoteCameraOff, setRemoteCameraOff] = useState(false);

  // ── Call sidebar state ────────────────────────────────────────────────
  const [callLinkId, setCallLinkId] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ── Draggable PiP state ───────────────────────────────────────────────
  const [pipOffset, setPipOffset] = useState({ x: 0, y: 0 });
  const [pipExpanded, setPipExpanded] = useState(false);
  const dragRef = useRef({
    active: false,
    startMouse: { x: 0, y: 0 },
    startOffset: { x: 0, y: 0 },
  });
  const didDragRef = useRef(false);
  const [isSwapped, setIsSwapped] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const controlsTimerRef = useRef<number | undefined>(undefined);
  const clickTimerRef = useRef<number | undefined>(undefined);
  const remoteVideoPipRef = useRef<HTMLVideoElement>(null);

  // ── Screen share zoom / pan state ────────────────────────────────────
  const SHARE_ZOOM_MIN = 1;
  const SHARE_ZOOM_MAX = 4;
  const [shareZoom, setShareZoom] = useState(1);
  const [sharePan, setSharePan] = useState({ x: 0, y: 0 });
  const [showZoomBadge, setShowZoomBadge] = useState(false);
  const shareZoomRef = useRef(1);
  const sharePanRef = useRef({ x: 0, y: 0 });
  const shareContainerRef = useRef<HTMLDivElement>(null);
  const sharePanActive = useRef(false);
  const sharePanStart = useRef({ mx: 0, my: 0, px: 0, py: 0 });
  const zoomBadgeTimerRef = useRef<number | undefined>(undefined);

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

  // Generate call link when call starts (use the actual room ID if available)
  useEffect(() => {
    if (status === "calling" || status === "connecting") {
      setCallLinkId(callRoomId || generateCallLinkId());
      setLinkCopied(false);
      setSidebarOpen(false);
    }
  }, [status, callRoomId]);

  // Join the call link room so visitors on the invite link can find us
  useEffect(() => {
    if (!socket || !callLinkId || !isOpen) return;
    // Don't re-join if this is already the route-based room
    if (callRoomId && callLinkId === callRoomId) return;
    socket.emit("call:join-room", { roomId: callLinkId });
    return () => {
      socket.emit("call:leave-room", { roomId: callLinkId });
    };
  }, [socket, callLinkId, isOpen, callRoomId]);

  // Track remote video track mute/unmute to detect when remote user toggles camera
  useEffect(() => {
    if (!remoteStream) {
      setRemoteCameraOff(false);
      return;
    }
    const videoTrack = remoteStream.getVideoTracks()[0];
    if (!videoTrack) {
      setRemoteCameraOff(true);
      return;
    }
    // Initial state: track.muted reflects whether media is flowing
    // track.enabled reflects local intent — for remote tracks, muted is what matters
    setRemoteCameraOff(videoTrack.muted || !videoTrack.enabled);
    const onMute = () => setRemoteCameraOff(true);
    const onUnmute = () => setRemoteCameraOff(false);
    videoTrack.addEventListener("mute", onMute);
    videoTrack.addEventListener("unmute", onUnmute);
    return () => {
      videoTrack.removeEventListener("mute", onMute);
      videoTrack.removeEventListener("unmute", onUnmute);
    };
  }, [remoteStream]);

  // Callback ref for local video: attaches stream the instant the element mounts
  const localVideoCallback = useCallback((el: HTMLVideoElement | null) => {
    localVideoRef.current = el;
    if (el && localStreamRef.current) {
      el.srcObject = localStreamRef.current;
    }
  }, []);

  // Also react to localStream changes after mount
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, status]);

  // ── Controls auto-hide ────────────────────────────────────────────
  const showControls = useCallback(() => {
    setControlsVisible(true);
    window.clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = window.setTimeout(() => {
      setControlsVisible(false);
    }, 3000);
  }, []);

  useEffect(() => {
    if (isOpen) {
      showControls();
    } else {
      window.clearTimeout(controlsTimerRef.current);
      window.clearTimeout(clickTimerRef.current);
      setControlsVisible(true);
      setIsSwapped(false);
    }
    return () => {
      window.clearTimeout(controlsTimerRef.current);
      window.clearTimeout(clickTimerRef.current);
    };
  }, [isOpen, showControls]);

  // ── Remote pip video stream & audio routing ─────────────────────────
  useEffect(() => {
    const el = remoteVideoPipRef.current;
    if (!el) return;
    if (isSwapped && remoteStream) {
      el.srcObject = remoteStream;
      el.play().catch(() => {});
      const speakerId = localStorage.getItem("ephemeral-speaker-id");
      if (speakerId && "setSinkId" in el) {
        (el as any).setSinkId(speakerId).catch(() => {});
      }
    } else {
      el.srcObject = null;
    }
  }, [isSwapped, remoteStream]);

  // Mute main remote video when it is in the background (swap active)
  useEffect(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = isSwapped;
    }
  }, [isSwapped]);

  /** Attach stream to a <video> element and start playback. */
  const attachStream = useCallback(
    (el: HTMLVideoElement, stream: MediaStream | null) => {
      if (stream) {
        if (el.srcObject !== stream) {
          console.log(
            "[call-screen] attaching remoteStream, tracks:",
            stream
              .getTracks()
              .map((t) => `${t.kind}:${t.readyState}:muted=${t.muted}`)
              .join(", "),
          );
          el.srcObject = stream;
        }
        el.play().catch((err) =>
          console.warn("[call-screen] play() rejected:", err.message),
        );
      } else {
        el.srcObject = null;
      }
      const speakerId = localStorage.getItem("ephemeral-speaker-id");
      if (speakerId && "setSinkId" in el) {
        (el as any).setSinkId(speakerId).catch(() => {});
      }
    },
    [],
  );

  // Callback ref: fires the instant the <video> element enters the DOM,
  // so the stream is attached even if the component mounts after ontrack.
  const remoteVideoCallback = useCallback(
    (el: HTMLVideoElement | null) => {
      remoteVideoRef.current = el;
      if (el) {
        console.log(
          "[call-screen] remoteVideo ref attached, remoteStream:",
          !!remoteStreamRef.current,
        );
        attachStream(el, remoteStreamRef.current);
      }
    },
    [attachStream],
  );

  // Also react to remoteStream / status changes AFTER the element is mounted.
  useEffect(() => {
    const el = remoteVideoRef.current;
    if (!el) return;
    attachStream(el, remoteStream);
  }, [remoteStream, status, attachStream]);

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
      didDragRef.current = false;
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
    const dx = e.clientX - dragRef.current.startMouse.x;
    const dy = e.clientY - dragRef.current.startMouse.y;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) didDragRef.current = true;
    setPipOffset({
      x: dragRef.current.startOffset.x + dx,
      y: dragRef.current.startOffset.y + dy,
    });
  }, []);

  const handlePipPointerUp = useCallback(() => {
    dragRef.current.active = false;
    // Clamp PiP within the call screen bounds
    const mainEl = document.querySelector(".call-screen-main");
    if (!mainEl) return;
    const rect = mainEl.getBoundingClientRect();
    const isExp = pipExpanded;
    const isMobile = window.innerWidth < 768;
    const pipW = isExp ? (isMobile ? 220 : 320) : isMobile ? 110 : 160;
    const pipH = isExp ? (isMobile ? 165 : 240) : isMobile ? 82 : 120;
    const defaultRight = isMobile ? 12 : 20;
    const defaultBottom = isMobile ? 140 : 120;
    const anchorLeft = rect.right - defaultRight - pipW;
    const anchorTop = rect.bottom - defaultBottom - pipH;
    setPipOffset((prev) => {
      const actualLeft = anchorLeft + prev.x;
      const actualTop = anchorTop + prev.y;
      let clampedX = prev.x;
      let clampedY = prev.y;
      if (actualLeft < rect.left) clampedX = prev.x + (rect.left - actualLeft);
      if (actualTop < rect.top) clampedY = prev.y + (rect.top - actualTop);
      if (actualLeft + pipW > rect.right)
        clampedX = prev.x - (actualLeft + pipW - rect.right);
      if (actualTop + pipH > rect.bottom)
        clampedY = prev.y - (actualTop + pipH - rect.bottom);
      if (clampedX === prev.x && clampedY === prev.y) return prev;
      return { x: clampedX, y: clampedY };
    });
  }, [pipExpanded]);

  const handlePipDoubleClick = useCallback(() => {
    window.clearTimeout(clickTimerRef.current);
    setPipExpanded((prev) => !prev);
  }, []);

  const handlePipClick = useCallback(() => {
    if (didDragRef.current) return;
    window.clearTimeout(clickTimerRef.current);
    clickTimerRef.current = window.setTimeout(() => {
      if (callWithVideo && localStream) {
        setIsSwapped((prev) => !prev);
        setPipOffset({ x: 0, y: 0 });
      }
    }, 220);
  }, [callWithVideo, localStream]);

  // ── Screen share zoom / pan ─────────────────────────────────────────
  // Keep refs in sync with state so native wheel handler has fresh values.
  shareZoomRef.current = shareZoom;
  sharePanRef.current = sharePan;

  // Reset zoom/pan when remote screen share ends.
  useEffect(() => {
    if (!remoteIsScreenSharing) {
      setShareZoom(1);
      setSharePan({ x: 0, y: 0 });
      setShowZoomBadge(false);
      window.clearTimeout(zoomBadgeTimerRef.current);
    }
  }, [remoteIsScreenSharing]);

  const flashZoomBadge = useCallback(() => {
    setShowZoomBadge(true);
    window.clearTimeout(zoomBadgeTimerRef.current);
    zoomBadgeTimerRef.current = window.setTimeout(
      () => setShowZoomBadge(false),
      1500,
    );
  }, []);

  // Native (non-passive) wheel listener so we can call preventDefault.
  useEffect(() => {
    const el = shareContainerRef.current;
    if (!el || !remoteIsScreenSharing) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;

      const oldZoom = shareZoomRef.current;
      // Exponential feel: each tick ≈ 10% zoom change.
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      const newZoom = Math.min(
        SHARE_ZOOM_MAX,
        Math.max(SHARE_ZOOM_MIN, oldZoom * factor),
      );
      if (Math.abs(newZoom - oldZoom) < 0.001) return;

      // Zoom centred on cursor position.
      const { x: px, y: py } = sharePanRef.current;
      const ratio = newZoom / oldZoom;
      const newPanX = cx - (cx - px) * ratio;
      const newPanY = cy - (cy - py) * ratio;
      const clamped = {
        x: Math.min(0, Math.max(rect.width * (1 - newZoom), newPanX)),
        y: Math.min(0, Math.max(rect.height * (1 - newZoom), newPanY)),
      };

      setShareZoom(newZoom);
      setSharePan(clamped);
      // Also update refs immediately so rapid wheel events stay accurate.
      shareZoomRef.current = newZoom;
      sharePanRef.current = clamped;

      setShowZoomBadge(true);
      window.clearTimeout(zoomBadgeTimerRef.current);
      zoomBadgeTimerRef.current = window.setTimeout(
        () => setShowZoomBadge(false),
        1500,
      );
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [remoteIsScreenSharing]);

  const handleSharePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (shareZoomRef.current <= SHARE_ZOOM_MIN) return;
      sharePanActive.current = true;
      sharePanStart.current = {
        mx: e.clientX,
        my: e.clientY,
        px: sharePanRef.current.x,
        py: sharePanRef.current.y,
      };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      e.preventDefault();
    },
    [],
  );

  const handleSharePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!sharePanActive.current) return;
      const dx = e.clientX - sharePanStart.current.mx;
      const dy = e.clientY - sharePanStart.current.my;
      const el = shareContainerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const zoom = shareZoomRef.current;
      const clamped = {
        x: Math.min(
          0,
          Math.max(rect.width * (1 - zoom), sharePanStart.current.px + dx),
        ),
        y: Math.min(
          0,
          Math.max(rect.height * (1 - zoom), sharePanStart.current.py + dy),
        ),
      };
      setSharePan(clamped);
      sharePanRef.current = clamped;
    },
    [],
  );

  const handleSharePointerUp = useCallback(() => {
    sharePanActive.current = false;
  }, []);

  const handleShareDoubleClick = useCallback(() => {
    setShareZoom(1);
    setSharePan({ x: 0, y: 0 });
    shareZoomRef.current = 1;
    sharePanRef.current = { x: 0, y: 0 };
    flashZoomBadge();
  }, [flashZoomBadge]);

  const handleCopyLink = useCallback(() => {
    const link = `${window.location.origin}/call/${callLinkId}`;
    navigator.clipboard.writeText(link).then(
      () => {
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
      },
      () => {
        // Fallback for insecure contexts
        const ta = document.createElement("textarea");
        ta.value = link;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
      },
    );
  }, [callLinkId]);

  if (!isOpen) return null;

  const callLink = `${window.location.origin}/call/${callLinkId}`;
  const callLinkDisplay =
    callLink.length > 38 ? callLink.slice(0, 38) + "..." : callLink;
  const isWaiting = status === "calling" || status === "connecting";

  const hasRemoteVideo =
    remoteStream && remoteStream.getVideoTracks().length > 0;
  const showRemoteVideo =
    hasRemoteVideo && status === "connected" && !remoteCameraOff;
  const showLocalPip = localStream && callWithVideo;

  return (
    <div
      className="call-screen open"
      role="dialog"
      aria-label="Active call"
      onPointerMove={showControls}
    >
      <div className="call-screen-layout">
        {/* ── Main call area (left) ─────────────────────────────────── */}
        <div className="call-screen-main">
          {/* Video / Avatar area */}
          <div className="call-screen-content">
            {/* Remote video: screen share view (with zoom/pan) or regular camera view */}
            {!isSwapped && remoteIsScreenSharing ? (
              <div
                ref={shareContainerRef}
                className="call-screen-share-wrapper"
                style={{ opacity: showRemoteVideo ? 1 : 0 }}
                onPointerDown={handleSharePointerDown}
                onPointerMove={handleSharePointerMove}
                onPointerUp={handleSharePointerUp}
                onPointerCancel={handleSharePointerUp}
                onDoubleClick={handleShareDoubleClick}
              >
                <video
                  ref={remoteVideoCallback}
                  autoPlay
                  playsInline
                  className="call-screen-share-video"
                  style={{
                    transform: `translate(${sharePan.x}px, ${sharePan.y}px) scale(${shareZoom})`,
                  }}
                />
                {showZoomBadge && (
                  <div className="call-share-zoom-badge">
                    {shareZoom <= SHARE_ZOOM_MIN
                      ? "1×"
                      : `${shareZoom.toFixed(1)}×`}
                  </div>
                )}
                {shareZoom <= SHARE_ZOOM_MIN && (
                  <div className="call-share-zoom-hint">
                    Scroll to zoom · drag to pan · double-click to reset
                  </div>
                )}
              </div>
            ) : (
              /* Regular remote video — always in DOM for audio routing */
              <video
                ref={remoteVideoCallback}
                autoPlay
                playsInline
                className="call-remote-video"
                style={{
                  opacity: !isSwapped && showRemoteVideo ? 1 : 0,
                  pointerEvents:
                    !isSwapped && showRemoteVideo ? "auto" : "none",
                }}
              />
            )}

            {/* Local video in full-screen main area when swapped */}
            {isSwapped && showLocalPip && (
              <video
                ref={localVideoCallback}
                autoPlay
                playsInline
                muted
                className="call-remote-video"
                style={{
                  opacity: isCameraOff ? 0 : 1,
                  transform: "scaleX(-1)",
                }}
              />
            )}
            {isSwapped && showLocalPip && isCameraOff && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {localAvatarUrl ? (
                  <img
                    src={localAvatarUrl}
                    alt="You"
                    className="call-avatar rounded-full object-cover"
                  />
                ) : (
                  <div
                    className="call-avatar"
                    style={{ background: localGradient }}
                  >
                    {localInitials}
                  </div>
                )}
              </div>
            )}

            {/* Waiting state — large centered local preview (calling / connecting, video) */}
            {!isSwapped && isWaiting && callWithVideo && localStream && (
              <>
                <div className="call-waiting-text">
                  Waiting for other participants...
                </div>
                <div className="call-waiting-preview">
                  <video
                    ref={localVideoCallback}
                    autoPlay
                    playsInline
                    muted
                    className="call-waiting-video"
                  />
                </div>
              </>
            )}

            {/* Avatar / status fallback (voice call, pre-connect, or remote camera off) */}
            {!isSwapped &&
              !showRemoteVideo &&
              !(isWaiting && callWithVideo && localStream) && (
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
                  {contactPhone && (
                    <div
                      className="call-status-text"
                      style={{ opacity: 0.6, fontSize: "0.85rem" }}
                    >
                      {contactPhone}
                    </div>
                  )}

                  {status === "calling" && (
                    <div className="call-status-text">Calling...</div>
                  )}
                  {status === "connecting" && (
                    <div className="call-status-text">Connecting...</div>
                  )}
                  {status === "reconnecting" && (
                    <div className="call-status-text">Reconnecting...</div>
                  )}
                  {isWaiting && (
                    <div
                      style={{
                        marginTop: "1rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        maxWidth: "90%",
                        background: "rgba(255,255,255,0.08)",
                        borderRadius: "0.5rem",
                        padding: "0.4rem 0.75rem",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.8rem",
                          opacity: 0.7,
                          flex: 1,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          color: "#fff",
                        }}
                      >
                        {callLinkDisplay}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        aria-label="Copy call link"
                        style={{
                          flexShrink: 0,
                          color: "white",
                          opacity: 0.8,
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          display: "flex",
                        }}
                      >
                        {linkCopied ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  )}
                  {status === "failed" && (
                    <div className="call-status-text call-status-failed">
                      Connection failed. Network may not support P2P calls.
                    </div>
                  )}
                  {status === "connected" && remoteCameraOff && (
                    <div
                      className="call-status-text"
                      style={{ opacity: 0.6, fontSize: "0.85rem" }}
                    >
                      Camera off
                    </div>
                  )}
                  {status === "connected" &&
                    !hasRemoteVideo &&
                    !remoteCameraOff && (
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

            {/* PiP — shows local (default) or remote (swapped); draggable & click-to-swap */}
            {showLocalPip && !isWaiting && (
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
                onClick={handlePipClick}
              >
                {isSwapped ? (
                  showRemoteVideo ? (
                    <video
                      ref={remoteVideoPipRef}
                      autoPlay
                      playsInline
                      className="call-local-video"
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: "inherit",
                        overflow: "hidden",
                      }}
                    >
                      {contactAvatarUrl ? (
                        <img
                          src={contactAvatarUrl}
                          alt={contactName}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: "100%",
                            height: "100%",
                            background: contactGradient,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#fff",
                            fontSize: pipExpanded ? "2rem" : "1rem",
                            fontWeight: 600,
                          }}
                        >
                          {contactInitials}
                        </div>
                      )}
                    </div>
                  )
                ) : isCameraOff ? (
                  <div
                    className="call-local-avatar"
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "inherit",
                      overflow: "hidden",
                    }}
                  >
                    {localAvatarUrl ? (
                      <img
                        src={localAvatarUrl}
                        alt="You"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          background: localGradient,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#fff",
                          fontSize: pipExpanded ? "2rem" : "1rem",
                          fontWeight: 600,
                        }}
                      >
                        {localInitials}
                      </div>
                    )}
                  </div>
                ) : (
                  <video
                    ref={localVideoCallback}
                    autoPlay
                    playsInline
                    muted
                    className="call-local-video"
                  />
                )}
              </div>
            )}

            {status === "connected" && (
              <div className="call-timer">{formatTimer(timer)}</div>
            )}
          </div>

          {/* Bottom action bar */}
          <div
            className="call-screen-bar"
            style={{
              opacity: controlsVisible ? 1 : 0,
              pointerEvents: controlsVisible ? "auto" : "none",
              transition: "opacity 0.4s ease",
            }}
          >
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
                style={
                  isScreenSharing ? { background: "var(--color-accent)" } : {}
                }
              >
                {isScreenSharing ? (
                  <MonitorOff className="w-6 h-6" />
                ) : (
                  <MonitorUp className="w-6 h-6" />
                )}
              </button>
            )}

            {/* Participants / toggle sidebar */}
            <button
              type="button"
              className="call-bar-btn"
              aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
              style={{ display: "flex", alignItems: "center", gap: "2px" }}
              onClick={() => setSidebarOpen((prev) => !prev)}
            >
              <Users className="w-5 h-5" />
              <ChevronRight className="w-3 h-3" style={{ opacity: 0.6 }} />
            </button>

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
        {/* end call-screen-main */}

        {/* ── Right sidebar (toggleable) ──────────────────────────── */}
        <aside
          className={`call-sidebar${sidebarOpen ? " call-sidebar--open" : ""}`}
        >
          {/* Close button */}
          <button
            type="button"
            className="call-sidebar-close-btn"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Contact avatar */}
          <div className="call-sidebar-avatar-wrap">
            {contactAvatarUrl ? (
              <img
                src={contactAvatarUrl}
                alt={contactName}
                className="call-sidebar-avatar rounded-full object-cover"
              />
            ) : (
              <div className="call-sidebar-avatar call-sidebar-avatar--group">
                <Users className="w-8 h-8" />
              </div>
            )}
          </div>

          {/* Call title */}
          <h2 className="call-sidebar-title">
            {contactPhone
              ? `Call from ${contactPhone}`
              : `Call with ${contactName}`}
          </h2>
          <p className="call-sidebar-subtitle">Call link</p>

          {/* Link share description */}
          <p className="call-sidebar-desc">
            Anyone with Ephemeral can use this link to join the call. Share only
            with people you trust.
          </p>

          {/* Call link field */}
          <div className="call-sidebar-link-row">
            <span className="call-sidebar-link-text">{callLinkDisplay}</span>
            <button
              type="button"
              onClick={handleCopyLink}
              className="call-sidebar-copy-btn"
              title="Copy link"
            >
              {linkCopied ? (
                <Check className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Add people */}
          <button
            type="button"
            className="call-sidebar-add-people"
            onClick={handleCopyLink}
          >
            <UserPlus className="w-5 h-5 call-sidebar-add-icon" />
            <span className="call-sidebar-add-label">Add people</span>
            <ChevronRight className="w-5 h-5 call-sidebar-add-chevron" />
          </button>
        </aside>
      </div>
      {/* end call-screen-layout */}
    </div>
  );
}
