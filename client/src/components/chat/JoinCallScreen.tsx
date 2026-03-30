import { useState, useRef, useEffect, useCallback } from "react";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneCall,
  Copy,
  Check,
  Link2,
  Loader2,
} from "lucide-react";

interface JoinCallScreenProps {
  roomId: string;
  displayName: string;
  avatarUrl?: string | null;
  initials: string;
  gradient: string;
  /** Whether a peer is already in the room and waiting */
  peerWaiting: boolean;
  /** Whether we are currently connecting/in a call */
  isInCall: boolean;
  onJoin: (withVideo: boolean) => void;
}

export function JoinCallScreen({
  roomId,
  displayName,
  avatarUrl,
  initials,
  gradient,
  peerWaiting,
  isInCall,
  onJoin,
}: JoinCallScreenProps) {
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [copied, setCopied] = useState(false);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const callLink = `${window.location.origin}/call/${roomId}`;

  // Start camera preview
  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;

    async function getPreview() {
      try {
        const micId = localStorage.getItem("ephemeral-mic-id");
        const camId = localStorage.getItem("ephemeral-camera-id");
        stream = await navigator.mediaDevices.getUserMedia({
          video: camId ? { deviceId: { ideal: camId } } : true,
          audio: micId ? { deviceId: { ideal: micId } } : true,
        });
        if (!cancelled) {
          setPreviewStream(stream);
        } else {
          stream.getTracks().forEach((t) => t.stop());
        }
      } catch {
        // User denied or no camera
      }
    }

    void getPreview();
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
      setPreviewStream(null);
    };
  }, []);

  // Attach preview stream to video element
  useEffect(() => {
    if (videoRef.current && previewStream) {
      videoRef.current.srcObject = previewStream;
    }
  }, [previewStream]);

  // Toggle camera preview
  useEffect(() => {
    previewStream?.getVideoTracks().forEach((t) => {
      t.enabled = cameraOn;
    });
  }, [cameraOn, previewStream]);

  // Toggle mic preview
  useEffect(() => {
    previewStream?.getAudioTracks().forEach((t) => {
      t.enabled = micOn;
    });
  }, [micOn, previewStream]);

  // Cleanup preview stream when joining
  const handleJoin = useCallback(() => {
    // Stop preview before joining (WebRTC will acquire its own stream)
    previewStream?.getTracks().forEach((t) => t.stop());
    setPreviewStream(null);
    // Save mic/camera preference for the actual call
    if (!micOn) localStorage.setItem("ephemeral-join-muted", "1");
    else localStorage.removeItem("ephemeral-join-muted");
    onJoin(cameraOn);
  }, [cameraOn, micOn, onJoin, previewStream]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(callLink);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = callLink;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [callLink]);

  if (isInCall) return null; // CallScreen overlay handles the active call

  return (
    <div className="join-call-page">
      <div className="join-call-container">
        {/* Video preview */}
        <div className="join-call-preview">
          {cameraOn && previewStream ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="join-call-video"
            />
          ) : (
            <div className="join-call-no-video">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="join-call-avatar-img"
                />
              ) : (
                <div
                  className="join-call-avatar"
                  style={{ background: gradient }}
                >
                  {initials}
                </div>
              )}
            </div>
          )}

          {/* Preview controls */}
          <div className="join-call-preview-controls">
            <button
              onClick={() => setMicOn((p) => !p)}
              className={`join-call-toggle ${!micOn ? "off" : ""}`}
              title={micOn ? "Mute microphone" : "Unmute microphone"}
            >
              {micOn ? (
                <Mic className="w-5 h-5" />
              ) : (
                <MicOff className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={() => setCameraOn((p) => !p)}
              className={`join-call-toggle ${!cameraOn ? "off" : ""}`}
              title={cameraOn ? "Turn off camera" : "Turn on camera"}
            >
              {cameraOn ? (
                <Video className="w-5 h-5" />
              ) : (
                <VideoOff className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Right panel - info & join */}
        <div className="join-call-info">
          <h1 className="join-call-title">Ready to join?</h1>
          <p className="join-call-subtitle">
            {peerWaiting
              ? "Someone is waiting in this call"
              : "No one else is here yet"}
          </p>

          <button
            onClick={handleJoin}
            className="join-call-btn"
            disabled={isInCall}
          >
            <PhoneCall className="w-5 h-5" />
            Join now
          </button>

          {/* Share link */}
          <div className="join-call-share">
            <p className="join-call-share-label">
              Or share this link to invite others
            </p>
            <div className="join-call-link-box">
              <Link2 className="w-4 h-4 text-accent shrink-0" />
              <span className="join-call-link-text">{callLink}</span>
              <button
                onClick={handleCopy}
                className={`join-call-copy-btn ${copied ? "copied" : ""}`}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>

          {peerWaiting && (
            <div className="join-call-waiting-badge">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>1 person waiting</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
