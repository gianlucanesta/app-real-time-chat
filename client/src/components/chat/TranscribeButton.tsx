import { useState, useCallback } from "react";
import { useTranscription } from "../../contexts/TranscriptionContext";

interface TranscribeButtonProps {
  messageId: string;
  audioUrl: string;
}

/** Session-level cache so a message is never re-transcribed. */
const transcriptionCache = new Map<string, string>();

export function TranscribeButton({
  messageId,
  audioUrl,
}: TranscribeButtonProps) {
  const { transcribe, modelStatus, downloadProgress, transcriptionAvailable } =
    useTranscription();

  const [state, setState] = useState<"idle" | "loading" | "done" | "error">(
    transcriptionCache.has(messageId) ? "done" : "idle",
  );
  const [text, setText] = useState(transcriptionCache.get(messageId) ?? "");

  // Hide button entirely on mobile or CPU-only devices
  if (!transcriptionAvailable) return null;

  const handleClick = useCallback(async () => {
    if (state === "loading") return;

    // Toggle visibility when already transcribed
    if (state === "done") {
      setState("idle");
      return;
    }

    // Re-show cached result
    const cached = transcriptionCache.get(messageId);
    if (cached) {
      setText(cached);
      setState("done");
      return;
    }

    setState("loading");
    try {
      const result = await transcribe(audioUrl);
      transcriptionCache.set(messageId, result);
      setText(result);
      setState("done");
    } catch {
      setState("error");
    }
  }, [state, messageId, audioUrl, transcribe]);

  /* ── Idle: blue "Transcribe" link ─────────────────────────── */
  if (state === "idle") {
    return (
      <button
        type="button"
        onClick={handleClick}
        className="mt-1 text-[13px] font-medium text-blue-400 hover:text-blue-300 transition-colors"
      >
        Transcribe
      </button>
    );
  }

  /* ── Loading: spinner + progress ──────────────────────────── */
  if (state === "loading") {
    const label =
      modelStatus === "loading" && downloadProgress
        ? `Downloading model… ${Math.round(downloadProgress.progress)}%`
        : "Transcribing…";

    return (
      <div className="mt-1 flex items-center gap-2">
        <div className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin shrink-0" />
        <span className="text-[13px] text-blue-400">{label}</span>
      </div>
    );
  }

  /* ── Error: simple message ────────────────────────────────── */
  if (state === "error") {
    return (
      <span className="mt-1 block text-[13px] text-text-secondary italic">
        Transcription is not available
      </span>
    );
  }

  /* ── Done: transcription text + hide toggle ───────────────── */
  return (
    <div className="mt-1.5">
      <p className="text-[13px] text-text-main/80 leading-relaxed whitespace-pre-wrap break-words">
        {text}
      </p>
      <button
        type="button"
        onClick={handleClick}
        className="text-[12px] text-blue-400 hover:text-blue-300 mt-0.5 transition-colors"
      >
        Hide
      </button>
    </div>
  );
}
