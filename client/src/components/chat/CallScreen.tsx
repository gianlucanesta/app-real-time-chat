import { Video, Mic, Smile, Hand, MonitorUp, UserPlus, Type, PhoneOff, ChevronUp, MicOff, VideoOff } from "lucide-react";
import { useState, useEffect } from "react";

interface CallScreenProps {
  isOpen: boolean;
  contactName: string;
  contactInitials: string;
  onEndCall: () => void;
}

export function CallScreen({ isOpen, contactName, contactInitials, onEndCall }: CallScreenProps) {
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    let interval: number;
    if (isOpen) {
      interval = window.setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    } else {
      setTimer(0);
    }
    return () => window.clearInterval(interval);
  }, [isOpen]);

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  if (!isOpen) return null;

  return (
    <div className={`call-screen open`} aria-hidden={!isOpen} role="dialog" aria-label="Active call">
      <div className="call-screen-content">
        <div className="call-avatar" id="call-screen-avatar">{contactInitials}</div>
        <div className="call-name" id="call-screen-name">{contactName}</div>
        
        {/* Animated Waveform */}
        <div className="call-waveform" aria-hidden="true">
          <span></span><span></span><span></span><span></span><span></span>
          <span></span><span></span><span></span><span></span><span></span>
          <span></span><span></span><span></span>
        </div>
        
        <div className="call-timer" id="call-timer">{formatTimer(timer)}</div>
      </div>

      {/* Bottom action bar */}
      <div className="call-screen-bar">
        {/* Camera */}
        <div className="call-bar-group">
          <button
            type="button"
            className={`call-bar-btn call-bar-camera ${!isCameraOn ? 'bg-danger/20 text-danger' : ''}`}
            data-active={isCameraOn}
            onClick={() => setIsCameraOn(!isCameraOn)}
            aria-label="Toggle camera"
          >
            {isCameraOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
          </button>
          <button type="button" className="call-bar-chevron" aria-label="Camera options">
            <ChevronUp className="w-3 h-3" />
          </button>
        </div>

        {/* Mic */}
        <div className="call-bar-group">
          <button
            type="button"
            className={`call-bar-btn call-bar-mic ${!isMicOn ? 'bg-danger/20 text-danger' : ''}`}
            data-active={isMicOn}
            onClick={() => setIsMicOn(!isMicOn)}
            aria-label="Toggle microphone"
          >
            {isMicOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
          </button>
          <button type="button" className="call-bar-chevron" aria-label="Mic options">
            <ChevronUp className="w-3 h-3" />
          </button>
        </div>

        <button type="button" className="call-bar-btn" aria-label="Send reaction">
          <Smile className="w-6 h-6" />
        </button>

        <button type="button" className="call-bar-btn" aria-label="Raise hand">
          <Hand className="w-6 h-6" />
        </button>

        <button type="button" className="call-bar-btn" aria-label="Share screen">
          <MonitorUp className="w-6 h-6" />
        </button>

        <button type="button" className="call-bar-btn" aria-label="Add participant">
          <UserPlus className="w-6 h-6" />
        </button>

        <button type="button" className="call-bar-btn" aria-label="Captions">
          <Type className="w-6 h-6" />
        </button>

        <button
          type="button"
          className="call-end-btn hidden md:flex"
          onClick={onEndCall}
          aria-label="End call"
        >
          <PhoneOff className="w-6 h-6" />
        </button>
      </div>

      {/* Mobile-only: prominent centered end-call button */}
      <div className="call-mobile-end md:hidden">
        <button
          type="button"
          className="call-end-btn call-end-mobile-btn"
          onClick={onEndCall}
          aria-label="End call"
        >
          <PhoneOff className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
