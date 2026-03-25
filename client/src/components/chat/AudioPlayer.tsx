import { useEffect, useRef, useState, useCallback } from "react";
import WaveSurfer from "wavesurfer.js";
import { Play, Pause } from "lucide-react";

interface AudioPlayerProps {
  src: string;
  duration?: number;
  isSent: boolean;
  contactInitials?: string;
  contactGradient?: string;
  contactAvatarUrl?: string | null;
  onPlay?: () => void;
  onFinish?: () => void;
}

const SPEEDS = [1, 1.5, 2];

export function AudioPlayer({
  src,
  duration,
  isSent,
  contactInitials,
  contactGradient,
  contactAvatarUrl,
  onPlay,
  onFinish,
}: AudioPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: isSent ? "rgba(255,255,255,0.35)" : "rgba(100,116,139,0.35)",
      progressColor: isSent ? "#ffffff" : "#2563EB",
      cursorWidth: 0,
      barWidth: 3,
      barGap: 2,
      barRadius: 3,
      height: 36,
      normalize: false,
      barMinHeight: 2,
    });

    ws.load(src);

    ws.on("ready", () => {
      setTotalDuration(ws.getDuration());
    });

    ws.on("timeupdate", () => {
      setCurrentTime(ws.getCurrentTime());
      const dur = ws.getDuration();
      if (dur > 0) setProgress(ws.getCurrentTime() / dur);
    });

    ws.on("play", () => {
      setIsPlaying(true);
      onPlay?.();
    });
    ws.on("pause", () => setIsPlaying(false));
    ws.on("finish", () => {
      setIsPlaying(false);
      setCurrentTime(0);
      setProgress(0);
      onFinish?.();
    });

    ws.on("seeking", () => {
      setCurrentTime(ws.getCurrentTime());
      const dur = ws.getDuration();
      if (dur > 0) setProgress(ws.getCurrentTime() / dur);
    });

    wavesurferRef.current = ws;

    return () => {
      ws.destroy();
    };
  }, [src, isSent]);

  const togglePlay = () => {
    wavesurferRef.current?.playPause();
  };

  const cycleSpeed = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const next = SPEEDS[(SPEEDS.indexOf(playbackRate) + 1) % SPEEDS.length];
      setPlaybackRate(next);
      if (wavesurferRef.current) {
        wavesurferRef.current.setPlaybackRate(next);
      }
    },
    [playbackRate],
  );

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const hasInteracted = isPlaying || currentTime > 0;

  /* ── Layout ──
   *  Row:  [ avatar/speed 48px ] [ ▶ icon ] [ waveform (flex-1) ]
   *  Below waveform:                          [ 0:03              ]
   *
   *  • Avatar / speed badge: 48 × 48 circle
   *  • Play icon: plain triangle, no bg circle
   *  • Waveform: block-level div so WaveSurfer canvas renders correctly
   *  • Time label: under the waveform area only
   */

  return (
    <div className="w-full">
      {/* ── Main row ── */}
      <div className="flex items-center gap-2">
        {/* Avatar or Speed badge — 48px */}
        {hasInteracted ? (
          <button
            type="button"
            onClick={cycleSpeed}
            className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 text-xs font-bold transition-all ${
              isSent
                ? "bg-white/20 text-white hover:bg-white/30"
                : "bg-black/8 text-text-main hover:bg-black/12"
            }`}
          >
            {playbackRate}x
          </button>
        ) : contactAvatarUrl ? (
          <img
            src={contactAvatarUrl}
            alt="Contact avatar"
            className="w-12 h-12 rounded-full object-cover shrink-0"
          />
        ) : contactInitials ? (
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 text-sm font-bold text-white"
            style={{ background: contactGradient }}
          >
            {contactInitials}
          </div>
        ) : (
          <div
            className={`w-12 h-12 rounded-full shrink-0 ${
              isSent ? "bg-white/15" : "bg-accent/10"
            }`}
          />
        )}

        {/* Play / Pause — plain icon, no circle bg */}
        <button
          type="button"
          onClick={togglePlay}
          className={`shrink-0 transition-opacity ${
            isSent
              ? "text-white/80 hover:text-white"
              : "text-text-secondary hover:text-text-main"
          }`}
        >
          {isPlaying ? (
            <Pause className="w-6 h-6" />
          ) : (
            <Play className="w-6 h-6" />
          )}
        </button>

        {/* Waveform — flex-1 wrapper with block-level WaveSurfer container */}
        <div className="flex-1 min-w-0">
          <div className="relative" style={{ height: 36 }}>
            <div ref={containerRef} className="absolute inset-0" />
            {/* Scrubber dot */}
            <div
              className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full shadow-md pointer-events-none z-10 ${
                isSent ? "bg-white" : "bg-accent"
              }`}
              style={{ left: `calc(${progress * 100}% - 6px)` }}
            />
          </div>
        </div>
      </div>

      {/* ── Time label — below, aligned under waveform start ── */}
      <div className="flex items-center gap-2">
        {/* Spacer for avatar */}
        <div className="w-12 shrink-0" />
        {/* Spacer for play icon */}
        <div className="w-6 shrink-0" />
        {/* Time text */}
        <span
          className={`text-[11px] font-medium leading-none ${
            isSent ? "text-white/60" : "text-text-secondary"
          }`}
        >
          {hasInteracted ? formatTime(currentTime) : formatTime(totalDuration)}
        </span>
      </div>
    </div>
  );
}
