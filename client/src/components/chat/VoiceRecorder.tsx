import { useState, useRef, useCallback, useEffect } from "react";
import { Trash2, Send, Pause, Mic, Timer } from "lucide-react";

interface VoiceRecorderProps {
  onSend: (blob: Blob, duration: number) => void;
  onCancel: () => void;
  viewOnce: boolean;
  onToggleViewOnce: () => void;
}

const BAR_COUNT = 48;

export function VoiceRecorder({
  onSend,
  onCancel,
  viewOnce,
  onToggleViewOnce,
}: VoiceRecorderProps) {
  const [isPaused, setIsPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [bars, setBars] = useState<number[]>(() => Array(BAR_COUNT).fill(3));

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(
    undefined,
  );
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number>(0);

  // Waveform drawing extracted so it can be restarted on resume
  const startWaveformLoop = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const draw = () => {
      if (!analyserRef.current) return;
      analyserRef.current.getByteFrequencyData(dataArray);

      const step = Math.max(1, Math.floor(dataArray.length / BAR_COUNT));
      const newBars: number[] = [];
      for (let i = 0; i < BAR_COUNT; i++) {
        let sum = 0;
        for (let j = 0; j < step; j++) {
          const idx = i * step + j;
          if (idx < dataArray.length) {
            sum += dataArray[idx];
          }
        }
        const avg = sum / step; // 0–255
        // Scale to 3–32 px with a power curve for more dynamic feel
        newBars.push(Math.max(3, Math.pow(avg / 255, 0.7) * 32));
      }
      setBars(newBars);
      animFrameRef.current = requestAnimationFrame(draw);
    };
    draw();
  }, []);

  // Full teardown — releases mic, AudioContext, timers
  const teardown = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = undefined as unknown as ReturnType<typeof setInterval>;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    }
    const rec = mediaRecorderRef.current;
    if (rec && rec.state !== "inactive") {
      try {
        rec.stop();
      } catch {
        /* already stopped */
      }
    }
    mediaRecorderRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    analyserRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
  }, []);

  // ── Start recording on mount ──
  useEffect(() => {
    let disposed = false;

    const init = async () => {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (err) {
        console.error("[voice] mic denied:", err);
        if (!disposed) onCancel();
        return;
      }

      // If component was unmounted while we awaited, release immediately
      if (disposed) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      // Verify the track is actually live
      const track = stream.getAudioTracks()[0];
      if (!track || track.readyState !== "live") {
        console.error("[voice] audio track not live:", track?.readyState);
        stream.getTracks().forEach((t) => t.stop());
        if (!disposed) onCancel();
        return;
      }

      streamRef.current = stream;

      // AudioContext for analyser
      const audioCtx = new AudioContext();
      if (audioCtx.state === "suspended") await audioCtx.resume();
      audioCtxRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.6;
      analyser.minDecibels = -80;
      analyser.maxDecibels = -10;
      source.connect(analyser);
      analyserRef.current = analyser;

      // MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")
          ? "audio/ogg;codecs=opus"
          : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.start(200);

      // Elapsed timer
      timerRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);

      // Start live waveform
      startWaveformLoop();
    };

    init();

    // Cleanup: MUST fully release mic so Strict Mode re-mount gets a fresh stream
    return () => {
      disposed = true;
      teardown();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Pause / Resume ──
  const handlePause = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;

    if (isPaused) {
      recorder.resume();
      timerRef.current = setInterval(() => setElapsed((p) => p + 1), 1000);
      startWaveformLoop();
    } else {
      recorder.pause();
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    }
    setIsPaused(!isPaused);
  }, [isPaused, startWaveformLoop]);

  // ── Cancel ──
  const handleCancel = useCallback(() => {
    teardown();
    onCancel();
  }, [teardown, onCancel]);

  // ── Send ──
  // CRITICAL: stop recorder first, wait for onstop to fire (so last data is flushed),
  // THEN release the stream. Otherwise the blob will be empty.
  const handleSend = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;

    const duration = elapsed;

    // Stop timers & animation, but NOT the stream yet
    if (timerRef.current) clearInterval(timerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    recorder.onstop = () => {
      const mimeType = recorder.mimeType || "audio/webm";
      const blob = new Blob(chunksRef.current, { type: mimeType });

      // NOW release stream & AudioContext (after data is safely captured)
      streamRef.current?.getTracks().forEach((t) => t.stop());
      audioCtxRef.current?.close().catch(() => {});

      onSend(blob, duration);
    };

    recorder.stop();
  }, [elapsed, onSend]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    return `${m}:${(s % 60).toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center bg-input/80 backdrop-blur-md rounded-full border border-border/50 p-1.5 shadow-lg gap-2">
      {/* Delete */}
      <button
        type="button"
        onClick={handleCancel}
        className="w-11 h-11 rounded-full flex items-center justify-center text-text-secondary hover:bg-card hover:text-text-main transition-colors shrink-0"
        aria-label="Cancel recording"
      >
        <Trash2 className="w-[22px] h-[22px]" />
      </button>

      {/* Indicator + timer + waveform */}
      <div className="flex items-center gap-2 flex-1 px-1 overflow-hidden">
        <span
          className={`w-2.5 h-2.5 rounded-full shrink-0 ${isPaused ? "bg-yellow-400" : "bg-red-500 animate-pulse"}`}
        />
        <span className="text-sm font-mono text-text-main min-w-[36px]">
          {formatTime(elapsed)}
        </span>

        <div className="flex-1 flex items-center justify-center gap-[1.5px] h-8 overflow-hidden">
          {bars.map((h, i) => (
            <div
              key={i}
              className="w-[2.5px] rounded-full bg-accent/70 transition-[height] duration-75"
              style={{ height: `${h}px` }}
            />
          ))}
        </div>
      </div>

      {/* Pause / Resume */}
      <button
        type="button"
        onClick={handlePause}
        className="w-11 h-11 rounded-full flex items-center justify-center text-text-secondary hover:bg-card hover:text-text-main transition-colors shrink-0"
        aria-label={isPaused ? "Resume" : "Pause"}
      >
        {isPaused ? (
          <Mic className="w-[22px] h-[22px] text-red-400" />
        ) : (
          <Pause className="w-[22px] h-[22px]" />
        )}
      </button>

      {/* View Once Toggle */}
      <button
        type="button"
        onClick={onToggleViewOnce}
        className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-colors ${
          viewOnce
            ? "text-accent bg-accent/15"
            : "text-text-secondary hover:bg-card hover:text-text-main"
        }`}
        aria-label={viewOnce ? "Disable view once" : "Enable view once"}
      >
        <Timer className="w-[22px] h-[22px]" />
      </button>

      {/* Send */}
      <button
        type="button"
        onClick={handleSend}
        className="w-11 h-11 rounded-full bg-accent flex items-center justify-center text-white shrink-0 hover:brightness-110 shadow-md transition-all"
        aria-label="Send voice message"
      >
        <Send className="w-[22px] h-[22px] ml-0.5" />
      </button>
    </div>
  );
}
