import { useState, useEffect, useRef, useCallback } from "react";
import { Video, Mic, Volume2, Play } from "lucide-react";
import { Select } from "../ui/select";
import { Label } from "../ui/label";

const STORAGE_KEYS = {
  camera: "ephemeral-camera-id",
  mic: "ephemeral-mic-id",
  speaker: "ephemeral-speaker-id",
} as const;

interface DeviceInfo {
  deviceId: string;
  label: string;
}

export function VideoVoiceSettings() {
  const [cameras, setCameras] = useState<DeviceInfo[]>([]);
  const [mics, setMics] = useState<DeviceInfo[]>([]);
  const [speakers, setSpeakers] = useState<DeviceInfo[]>([]);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const [selectedCamera, setSelectedCamera] = useState(
    () => localStorage.getItem(STORAGE_KEYS.camera) || "",
  );
  const [selectedMic, setSelectedMic] = useState(
    () => localStorage.getItem(STORAGE_KEYS.mic) || "",
  );
  const [selectedSpeaker, setSelectedSpeaker] = useState(
    () => localStorage.getItem(STORAGE_KEYS.speaker) || "",
  );

  const previewRef = useRef<HTMLVideoElement>(null);
  const previewStreamRef = useRef<MediaStream | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number>(0);

  // ── Enumerate devices ──────────────────────────────────────────────────
  const enumerateDevices = useCallback(async () => {
    try {
      // Brief permission request to get labeled device names
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      stream.getTracks().forEach((t) => t.stop());

      const devices = await navigator.mediaDevices.enumerateDevices();

      setCameras(
        devices
          .filter((d) => d.kind === "videoinput")
          .map((d, i) => ({
            deviceId: d.deviceId,
            label: d.label || `Camera ${i + 1}`,
          })),
      );
      setMics(
        devices
          .filter((d) => d.kind === "audioinput")
          .map((d, i) => ({
            deviceId: d.deviceId,
            label: d.label || `Microphone ${i + 1}`,
          })),
      );
      setSpeakers(
        devices
          .filter((d) => d.kind === "audiooutput")
          .map((d, i) => ({
            deviceId: d.deviceId,
            label: d.label || `Speaker ${i + 1}`,
          })),
      );
      setPermissionDenied(false);
    } catch {
      setPermissionDenied(true);
    }
  }, []);

  useEffect(() => {
    enumerateDevices();
    navigator.mediaDevices.addEventListener("devicechange", enumerateDevices);
    return () => {
      navigator.mediaDevices.removeEventListener(
        "devicechange",
        enumerateDevices,
      );
    };
  }, [enumerateDevices]);

  // ── Auto-select first device if nothing saved ─────────────────────────
  useEffect(() => {
    if (!selectedCamera && cameras.length > 0) {
      handleCameraChange(cameras[0].deviceId);
    }
  }, [cameras]);

  useEffect(() => {
    if (!selectedMic && mics.length > 0) {
      handleMicChange(mics[0].deviceId);
    }
  }, [mics]);

  useEffect(() => {
    if (!selectedSpeaker && speakers.length > 0) {
      handleSpeakerChange(speakers[0].deviceId);
    }
  }, [speakers]);

  // ── Camera preview ────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    const startPreview = async () => {
      // Stop previous preview
      previewStreamRef.current?.getTracks().forEach((t) => t.stop());

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: selectedCamera
            ? { deviceId: { ideal: selectedCamera } }
            : true,
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        previewStreamRef.current = stream;
        if (previewRef.current) {
          previewRef.current.srcObject = stream;
        }
      } catch {
        /* Camera unavailable */
      }
    };

    if (cameras.length > 0) startPreview();

    return () => {
      cancelled = true;
    };
  }, [selectedCamera, cameras.length]);

  // ── Cleanup preview on unmount ────────────────────────────────────────
  useEffect(() => {
    return () => {
      previewStreamRef.current?.getTracks().forEach((t) => t.stop());
      previewStreamRef.current = null;
      micStreamRef.current?.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
      audioCtxRef.current?.close();
      audioCtxRef.current = null;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // ── Microphone level meter ────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | null = null;
    let ctx: AudioContext | null = null;

    const start = async () => {
      // Cleanup previous
      micStreamRef.current?.getTracks().forEach((t) => t.stop());
      audioCtxRef.current?.close();

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: selectedMic ? { deviceId: { ideal: selectedMic } } : true,
          video: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        micStreamRef.current = stream;

        ctx = new AudioContext();
        audioCtxRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);

        const data = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          if (cancelled) return;
          analyser.getByteFrequencyData(data);
          const avg = data.reduce((a, b) => a + b, 0) / data.length;
          setAudioLevel(Math.min(100, avg * 1.5));
          animFrameRef.current = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        /* Mic unavailable */
      }
    };

    if (mics.length > 0) start();

    return () => {
      cancelled = true;
      cancelAnimationFrame(animFrameRef.current);
      stream?.getTracks().forEach((t) => t.stop());
      ctx?.close();
    };
  }, [selectedMic, mics.length]);

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleCameraChange = (id: string) => {
    setSelectedCamera(id);
    localStorage.setItem(STORAGE_KEYS.camera, id);
  };

  const handleMicChange = (id: string) => {
    setSelectedMic(id);
    localStorage.setItem(STORAGE_KEYS.mic, id);
  };

  const handleSpeakerChange = (id: string) => {
    setSelectedSpeaker(id);
    localStorage.setItem(STORAGE_KEYS.speaker, id);
  };

  const testSpeaker = useCallback(() => {
    try {
      const ctx = new AudioContext();
      const oscillator = ctx.createOscillator();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(440, ctx.currentTime);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.8);
      setTimeout(() => ctx.close(), 1200);
    } catch {
      /* Audio context not supported */
    }
  }, []);

  // ── Derived option lists ──────────────────────────────────────────────
  const cameraOptions = cameras.map((c) => ({
    value: c.deviceId,
    label: c.label,
  }));
  const micOptions = mics.map((m) => ({
    value: m.deviceId,
    label: m.label,
  }));
  const speakerOptions = speakers.map((s) => ({
    value: s.deviceId,
    label: s.label,
  }));

  if (permissionDenied) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-text-secondary gap-3 px-8 text-center">
        <Video className="w-10 h-10 opacity-30" />
        <p className="text-[15px] font-medium text-text-main">
          Permission Required
        </p>
        <p className="text-[13px]">
          Camera and microphone access is needed to configure devices. Please
          allow access in your browser settings and reload.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-7">
      {/* ── Camera ────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2.5">
        <Label className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.6px]">
          Camera
        </Label>

        {/* Camera preview */}
        <div className="relative w-full aspect-video bg-black/60 rounded-xl overflow-hidden">
          <video
            ref={previewRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{ transform: "scaleX(-1)" }}
          />
          {cameras.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-text-secondary text-[13px]">
              No camera detected
            </div>
          )}
        </div>

        <Select
          options={cameraOptions}
          value={selectedCamera}
          onChange={handleCameraChange}
          icon={<Video className="w-[17px] h-[17px]" />}
        />
      </div>

      {/* ── Microphone ────────────────────────────────────────── */}
      <div className="flex flex-col gap-2.5">
        <Label className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.6px]">
          Microphone
        </Label>

        <Select
          options={micOptions}
          value={selectedMic}
          onChange={handleMicChange}
          icon={<Mic className="w-[17px] h-[17px]" />}
        />

        {/* Audio level meter */}
        <div className="flex items-center gap-3">
          <Mic className="w-4 h-4 text-text-secondary shrink-0" />
          <div className="flex-1 h-2 bg-input rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-75"
              style={{
                width: `${audioLevel}%`,
                background:
                  audioLevel > 70
                    ? "var(--color-danger)"
                    : audioLevel > 40
                      ? "#eab308"
                      : "#22c55e",
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Speakers ──────────────────────────────────────────── */}
      <div className="flex flex-col gap-2.5">
        <Label className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.6px]">
          Speakers
        </Label>

        {speakerOptions.length > 0 ? (
          <Select
            options={speakerOptions}
            value={selectedSpeaker}
            onChange={handleSpeakerChange}
            icon={<Volume2 className="w-[17px] h-[17px]" />}
          />
        ) : (
          <p className="text-[13px] text-text-secondary">
            Speaker selection is not supported in this browser.
          </p>
        )}

        <button
          type="button"
          onClick={testSpeaker}
          className="self-start flex items-center gap-2 px-4 py-2 rounded-lg bg-input border border-border text-[13px] font-medium text-text-main hover:bg-input/80 transition-colors"
        >
          <Play className="w-4 h-4" />
          Test Speakers
        </button>
      </div>
    </div>
  );
}
