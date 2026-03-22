import { useState, useRef, useEffect } from "react";
import { X, Send, Smile, Timer, Plus, Trash2, FileText } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

interface PreviewFile {
  file: File;
  type: "image" | "video" | "audio" | "document";
  previewUrl: string;
}

interface MediaPreviewScreenProps {
  files: PreviewFile[];
  viewOnce: boolean;
  onToggleViewOnce: () => void;
  onSend: (files: PreviewFile[], caption: string) => void;
  onClose: () => void;
  onAddMore: (type: "image" | "video" | "audio" | "document") => void;
}

export function MediaPreviewScreen({
  files,
  viewOnce,
  onToggleViewOnce,
  onSend,
  onClose,
  onAddMore,
}: MediaPreviewScreenProps) {
  const [caption, setCaption] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [localFiles, setLocalFiles] = useState<PreviewFile[]>(files);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const [pdfPageCount, setPdfPageCount] = useState<number | null>(null);
  const [pdfError, setPdfError] = useState(false);

  // Sync when new files arrive from parent
  useEffect(() => {
    setLocalFiles(files);
  }, [files]);

  const activeFile = localFiles[activeIndex];

  // Close if all files removed
  useEffect(() => {
    if (localFiles.length === 0) onClose();
  }, [localFiles.length, onClose]);

  // Render first page of PDF onto canvas
  const isPdf =
    activeFile?.type === "document" &&
    activeFile.file.name.toLowerCase().endsWith(".pdf");

  useEffect(() => {
    if (!isPdf || !activeFile) {
      setPdfPageCount(null);
      setPdfError(false);
      return;
    }
    let cancelled = false;

    (async () => {
      try {
        const arrayBuffer = await activeFile.file.arrayBuffer();
        if (cancelled) return;
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        if (cancelled) return;
        setPdfPageCount(pdf.numPages);
        const page = await pdf.getPage(1);
        if (cancelled) return;

        const canvas = pdfCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Scale so the rendered page fits nicely (max ~600px wide)
        const baseViewport = page.getViewport({ scale: 1 });
        const scale = Math.min(
          600 / baseViewport.width,
          800 / baseViewport.height,
        );
        const viewport = page.getViewport({ scale });

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({ canvasContext: ctx, viewport }).promise;
      } catch {
        if (!cancelled) setPdfError(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isPdf, activeFile]);

  const handleDelete = (index: number) => {
    const updated = localFiles.filter((_, i) => i !== index);
    setLocalFiles(updated);
    if (activeIndex >= updated.length) {
      setActiveIndex(Math.max(0, updated.length - 1));
    }
    setDeleteTarget(null);
  };

  const handleSend = () => {
    if (localFiles.length === 0) return;
    onSend(localFiles, caption.trim());
  };

  const isDocument = activeFile?.type === "document";
  const isImage = activeFile?.type === "image";
  const isVideo = activeFile?.type === "video";
  const isAudio = activeFile?.type === "audio";

  // Extract document extension
  const docExt = isDocument
    ? activeFile.file.name.split(".").pop()?.toUpperCase() || "FILE"
    : "";

  if (!activeFile) return null;

  return (
    <div className="absolute inset-0 z-50 bg-bg flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="w-10 h-10 rounded-full flex items-center justify-center text-text-secondary hover:bg-input hover:text-text-main transition-colors"
          aria-label="Close preview"
        >
          <X className="w-6 h-6" />
        </button>
        {isDocument && (
          <div className="flex-1 text-center min-w-0 px-4">
            <p className="text-sm font-medium text-text-main truncate">
              {activeFile.file.name}
            </p>
            <p className="text-xs text-text-secondary">
              {docExt} &middot;{" "}
              {activeFile.file.size < 1024 * 1024
                ? `${(activeFile.file.size / 1024).toFixed(0)} KB`
                : `${(activeFile.file.size / (1024 * 1024)).toFixed(1)} MB`}
            </p>
          </div>
        )}
        <div className="w-10" /> {/* Spacer for symmetry */}
      </div>

      {/* Preview area */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden min-h-0">
        {isImage && (
          <img
            src={activeFile.previewUrl}
            alt="Preview"
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        )}
        {isVideo && (
          <video
            src={activeFile.previewUrl}
            controls
            className="max-w-full max-h-full rounded-lg"
          />
        )}
        {isAudio && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-24 h-24 rounded-full bg-accent/15 flex items-center justify-center">
              <svg
                viewBox="0 0 24 24"
                className="w-12 h-12 text-accent"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path
                  d="M9 18V5l12-2v13"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
            </div>
            <p className="text-sm text-text-main font-medium truncate max-w-[280px]">
              {activeFile.file.name}
            </p>
            <audio
              src={activeFile.previewUrl}
              controls
              className="w-full max-w-[320px]"
            />
          </div>
        )}
        {isDocument && (
          <div className="flex flex-col items-center gap-4 max-h-full overflow-hidden">
            {isPdf && !pdfError ? (
              <>
                <canvas
                  ref={pdfCanvasRef}
                  className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-lg border border-border/30"
                />
                {pdfPageCount !== null && pdfPageCount > 1 && (
                  <p className="text-xs text-text-secondary">
                    Page 1 of {pdfPageCount}
                  </p>
                )}
              </>
            ) : (
              <div className="w-28 h-36 rounded-xl bg-card border border-border/50 shadow-md flex flex-col items-center justify-center gap-2">
                <FileText className="w-12 h-12 text-accent/70" />
                <span className="text-xs font-bold text-accent bg-accent/10 px-2 py-0.5 rounded">
                  {docExt}
                </span>
              </div>
            )}
            <p className="text-sm text-text-main font-medium truncate max-w-[280px]">
              {activeFile.file.name}
            </p>
            <p className="text-xs text-text-secondary">
              {activeFile.file.size < 1024 * 1024
                ? `${(activeFile.file.size / 1024).toFixed(0)} KB`
                : `${(activeFile.file.size / (1024 * 1024)).toFixed(1)} MB`}
            </p>
          </div>
        )}
      </div>

      {/* Caption bar + thumbnail strip + send */}
      <div className="shrink-0 px-4 pb-4 space-y-3">
        {/* Caption input */}
        <div className="flex items-center gap-2 bg-input/80 backdrop-blur-md rounded-full border border-border/50 px-4 py-2">
          <button
            type="button"
            className="shrink-0 text-text-secondary hover:text-text-main transition-colors"
            aria-label="Emoji"
          >
            <Smile className="w-5 h-5" />
          </button>
          <input
            ref={inputRef}
            type="text"
            placeholder="Add a caption..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            className="flex-1 bg-transparent border-none outline-none text-sm text-text-main placeholder:text-text-secondary"
          />
          {/* View-once toggle — only for media, not documents */}
          {!isDocument && (
            <button
              type="button"
              onClick={onToggleViewOnce}
              className={`shrink-0 transition-colors ${
                viewOnce
                  ? "text-accent"
                  : "text-text-secondary hover:text-text-main"
              }`}
              aria-label={viewOnce ? "Disable view once" : "Enable view once"}
            >
              <Timer className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Thumbnail strip + send */}
        <div className="flex items-center gap-3">
          <div className="flex-1 flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
            {localFiles.map((f, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActiveIndex(i)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setDeleteTarget(i);
                }}
                className={`relative shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-colors ${
                  i === activeIndex
                    ? "border-accent"
                    : "border-transparent hover:border-border"
                }`}
              >
                {f.type === "image" ? (
                  <img
                    src={f.previewUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : f.type === "video" ? (
                  <video
                    src={f.previewUrl}
                    className="w-full h-full object-cover"
                    muted
                  />
                ) : (
                  <div className="w-full h-full bg-card flex items-center justify-center">
                    <FileText className="w-6 h-6 text-text-secondary" />
                  </div>
                )}
                {/* Delete button on long-press/right-click */}
                {deleteTarget === i && (
                  <div
                    className="absolute inset-0 bg-black/60 flex items-center justify-center"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(i);
                    }}
                  >
                    <Trash2 className="w-5 h-5 text-white" />
                  </div>
                )}
              </button>
            ))}
            {/* Add more */}
            <button
              type="button"
              onClick={() => {
                // Re-open the same type picker
                const firstType = localFiles[0]?.type || "image";
                onAddMore(firstType);
              }}
              className="shrink-0 w-14 h-14 rounded-lg border-2 border-dashed border-border flex items-center justify-center text-text-secondary hover:text-text-main hover:border-text-secondary transition-colors"
              aria-label="Add more files"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>

          {/* Send button */}
          <button
            type="button"
            onClick={handleSend}
            className="w-14 h-14 rounded-full bg-accent flex items-center justify-center text-white shrink-0 hover:brightness-110 shadow-lg transition-all"
            aria-label="Send"
          >
            <Send className="w-6 h-6 ml-0.5" />
          </button>
        </div>
      </div>

      {/* Delete confirmation overlay */}
      {deleteTarget !== null && (
        <div
          className="absolute inset-0 z-10"
          onClick={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
