import { useState, useRef, useEffect, useCallback } from "react";
import { X, RotateCcw, Check, SwitchCamera } from "lucide-react";

interface CameraModalProps {
  onClose: () => void;
  onCapture: (file: File, type: "image" | "video") => void;
}

const VIDEO_LIMIT_SECONDS = 5;

export function CameraModal({ onClose, onCapture }: CameraModalProps) {
  const [mode, setMode] = useState<"photo" | "video">("photo");
  const [isRecording, setIsRecording] = useState(false);
  const [countdown, setCountdown] = useState(VIDEO_LIMIT_SECONDS);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<"image" | "video">("image");
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    stopStream();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setError(null);
    } catch {
      setError("Camera access denied or not available.");
    }
  }, [facingMode, stopStream]);

  // start/restart camera whenever facingMode or mode changes (and no preview shown)
  useEffect(() => {
    if (!previewUrl) {
      startCamera();
    }
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [startCamera, previewUrl, facingMode]);

  // cleanup on unmount
  useEffect(() => {
    return () => {
      stopStream();
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [stopStream]);

  /* ─── Photo ─────────────────────────────────────────────── */
  const takePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // mirror if front-facing camera
    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(videoRef.current, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        setCapturedBlob(blob);
        setPreviewType("image");
        setPreviewUrl(URL.createObjectURL(blob));
        stopStream();
      },
      "image/jpeg",
      0.92,
    );
  };

  /* ─── Video recording ────────────────────────────────────── */
  const stopRecording = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
  }, []);

  const startRecording = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];

    // prefer common codec, fall back to default
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
      ? "video/webm;codecs=vp8,opus"
      : "video/webm";

    const recorder = new MediaRecorder(streamRef.current, { mimeType });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      setCapturedBlob(blob);
      setPreviewType("video");
      setPreviewUrl(URL.createObjectURL(blob));
      setIsRecording(false);
      setCountdown(VIDEO_LIMIT_SECONDS);
      stopStream();
    };

    recorderRef.current = recorder;
    recorder.start();
    setIsRecording(true);
    setCountdown(VIDEO_LIMIT_SECONDS);

    let remaining = VIDEO_LIMIT_SECONDS;
    countdownRef.current = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
      if (remaining <= 0) {
        stopRecording();
      }
    }, 1000);
  };

  /* ─── Confirm / Retake ───────────────────────────────────── */
  const handleConfirm = () => {
    if (!capturedBlob) return;
    const ext = previewType === "image" ? "jpg" : "webm";
    const mime = previewType === "image" ? "image/jpeg" : "video/webm";
    const file = new File([capturedBlob], `camera-${Date.now()}.${ext}`, {
      type: mime,
    });
    onCapture(file, previewType);
  };

  const handleRetake = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setCapturedBlob(null);
    // useEffect will restart camera
  };

  const handleClose = () => {
    if (isRecording) stopRecording();
    stopStream();
    onClose();
  };

  /* ─── Render ─────────────────────────────────────────────── */
  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/70 to-transparent">
        <button
          onClick={handleClose}
          className="w-9 h-9 rounded-full flex items-center justify-center text-white hover:bg-white/15 transition-colors"
          aria-label="Close camera"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Mode toggle — hidden while previewing */}
        {!previewUrl && (
          <div className="flex items-center gap-1 bg-black/40 rounded-full p-1">
            <button
              onClick={() => {
                if (isRecording) stopRecording();
                setMode("photo");
              }}
              className={`px-4 py-1 rounded-full text-sm font-medium transition-colors ${
                mode === "photo"
                  ? "bg-white text-black"
                  : "text-white/70 hover:text-white"
              }`}
            >
              Photo
            </button>
            <button
              onClick={() => {
                if (isRecording) stopRecording();
                setMode("video");
              }}
              className={`px-4 py-1 rounded-full text-sm font-medium transition-colors ${
                mode === "video"
                  ? "bg-white text-black"
                  : "text-white/70 hover:text-white"
              }`}
            >
              Video
            </button>
          </div>
        )}

        {/* Flip camera — hidden while previewing */}
        {!previewUrl ? (
          <button
            onClick={() =>
              setFacingMode((prev) =>
                prev === "user" ? "environment" : "user",
              )
            }
            className="w-9 h-9 rounded-full flex items-center justify-center text-white hover:bg-white/15 transition-colors"
            aria-label="Flip camera"
          >
            <SwitchCamera className="w-5 h-5" />
          </button>
        ) : (
          <div className="w-9" />
        )}
      </div>

      {/* Live feed / Preview */}
      {previewUrl ? (
        <div className="flex-1 flex items-center justify-center bg-black">
          {previewType === "image" ? (
            <img
              src={previewUrl}
              alt="Captured photo"
              className="max-w-full max-h-full object-contain"
            />
          ) : (
            <video
              src={previewUrl}
              controls
              autoPlay
              loop
              playsInline
              className="max-w-full max-h-full object-contain"
            />
          )}
        </div>
      ) : (
        <div className="flex-1 relative overflow-hidden bg-black flex items-center justify-center">
          {error ? (
            <div className="text-center text-white/60 px-8">
              <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
                <X className="w-8 h-8" />
              </div>
              <p className="text-sm">{error}</p>
            </div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
              style={{
                transform: facingMode === "user" ? "scaleX(-1)" : "none",
              }}
            />
          )}

          {/* Recording indicator */}
          {isRecording && (
            <div className="absolute top-16 inset-x-0 flex justify-center pointer-events-none">
              <span className="inline-flex items-center gap-2 bg-black/60 text-white text-sm font-semibold px-4 py-1.5 rounded-full">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                {countdown}s
              </span>
            </div>
          )}
        </div>
      )}

      {/* Bottom controls */}
      <div className="absolute bottom-0 left-0 right-0 pb-10 pt-6 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-center gap-10">
        {previewUrl ? (
          /* Preview controls */
          <>
            <button
              onClick={handleRetake}
              className="w-14 h-14 rounded-full bg-white/10 border border-white/30 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
              aria-label="Retake"
            >
              <RotateCcw className="w-6 h-6" />
            </button>

            <button
              onClick={handleConfirm}
              className="w-16 h-16 rounded-full bg-accent flex items-center justify-center shadow-xl hover:brightness-110 transition-all"
              aria-label="Send"
            >
              <Check className="w-7 h-7 text-white" />
            </button>
          </>
        ) : (
          /* Capture controls */
          <>
            {/* Spacer left */}
            <div className="w-12 h-12" />

            {mode === "photo" ? (
              /* Shutter button */
              <button
                onClick={takePhoto}
                disabled={!!error}
                className="w-18 h-18 rounded-full border-4 border-white/60 bg-white disabled:opacity-40 hover:scale-95 transition-transform shadow-xl"
                style={{ width: "4.5rem", height: "4.5rem" }}
                aria-label="Take photo"
              />
            ) : (
              /* Record button */
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={!!error}
                className={`flex items-center justify-center shadow-xl transition-all disabled:opacity-40 ${
                  isRecording
                    ? "w-16 h-16 rounded-xl bg-red-500 hover:bg-red-600"
                    : "w-18 h-18 rounded-full border-4 border-white/60 bg-red-500 hover:scale-95"
                }`}
                style={{ width: "4.5rem", height: "4.5rem" }}
                aria-label={isRecording ? "Stop recording" : "Start recording"}
              >
                {isRecording && (
                  <span className="w-5 h-5 rounded bg-white block" />
                )}
              </button>
            )}

            {/* Spacer right */}
            <div className="w-12 h-12" />
          </>
        )}
      </div>
    </div>
  );
}
