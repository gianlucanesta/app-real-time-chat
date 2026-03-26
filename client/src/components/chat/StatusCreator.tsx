import { useState, useRef, useEffect } from "react";
import {
  ArrowLeft,
  Send,
  Image as ImageIcon,
  Type,
  Palette,
  X,
  Loader2,
  Pencil,
  Smile,
  Wand2,
  Plus,
  Check,
} from "lucide-react";
import { getAccessToken } from "../../../src/lib/api";
import { EmojiPicker } from "./EmojiPicker";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3001/api";

type CreatorMode = "choose" | "text" | "media";

interface StatusCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  onPublish: (status: {
    mediaType: "text" | "image" | "video";
    text?: string;
    textBgGradient?: string;
    mediaUrl?: string;
    caption?: string;
  }) => void;
  /** If set, skip "choose" and go straight to this mode */
  initialMode?: "text" | "media";
}

const TEXT_GRADIENTS = [
  "linear-gradient(135deg, #667eea, #764ba2)",
  "linear-gradient(135deg, #f093fb, #f5576c)",
  "linear-gradient(135deg, #4facfe, #00f2fe)",
  "linear-gradient(135deg, #43e97b, #38f9d7)",
  "linear-gradient(135deg, #fa709a, #fee140)",
  "linear-gradient(135deg, #a18cd1, #fbc2eb)",
  "linear-gradient(135deg, #ffecd2, #fcb69f)",
  "linear-gradient(135deg, #ff9a9e, #fecfef)",
  "linear-gradient(135deg, #2563eb, #7c3aed)",
  "linear-gradient(135deg, #0f172a, #1e293b)",
];

type MediaTool = "none" | "draw" | "text" | "emoji" | "filter";

interface TextOverlay {
  id: number;
  text: string;
  color: string;
}
interface EmojiOverlay {
  id: number;
  emoji: string;
}

const DRAW_COLORS = [
  "#ffffff",
  "#000000",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#3b82f6",
  "#a855f7",
  "#ec4899",
];
const TEXT_COLORS = [
  "#ffffff",
  "#ffdd59",
  "#ff6b6b",
  "#48dbfb",
  "#ff9ff3",
  "#54a0ff",
];
const CSS_FILTERS = [
  "none",
  "grayscale(100%)",
  "sepia(80%)",
  "saturate(200%) contrast(1.1)",
  "brightness(1.15) contrast(0.9)",
  "hue-rotate(200deg) saturate(120%)",
  "brightness(0.85) contrast(1.2)",
];
const FILTER_NAMES = [
  "Original",
  "B&W",
  "Sepia",
  "Vivid",
  "Fade",
  "Cool",
  "Drama",
];

export function StatusCreator({
  isOpen,
  onClose,
  onPublish,
  initialMode,
}: StatusCreatorProps) {
  const [mode, setMode] = useState<CreatorMode>(initialMode || "choose");
  const [text, setText] = useState("");
  const [gradientIdx, setGradientIdx] = useState(0);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [caption, setCaption] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Media tool state ──
  const [activeTool, setActiveTool] = useState<MediaTool>("none");
  const [drawColor, setDrawColor] = useState("#ffffff");
  const [textInput, setTextInput] = useState("");
  const [textColor, setTextColor] = useState("#ffffff");
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [emojiOverlays, setEmojiOverlays] = useState<EmojiOverlay[]>([]);
  const [filterIdx, setFilterIdx] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaAreaRef = useRef<HTMLDivElement>(null);
  const isDrawingActive = useRef(false);
  const lastPtRef = useRef<{ x: number; y: number } | null>(null);
  const overlayIdRef = useRef(0);

  // Sync mode when the creator opens or initialMode changes
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode || "choose");
    }
  }, [isOpen, initialMode]);

  // Init canvas drawing buffer size when media loads
  useEffect(() => {
    if (!mediaPreview || !canvasRef.current || !mediaAreaRef.current) return;
    const { width, height } = mediaAreaRef.current.getBoundingClientRect();
    if (width > 0 && height > 0) {
      canvasRef.current.width = width;
      canvasRef.current.height = height;
    }
  }, [mediaPreview]);

  const handleClose = () => {
    setMode(initialMode || "choose");
    setText("");
    setGradientIdx(0);
    setMediaPreview(null);
    setMediaFile(null);
    setCaption("");
    setActiveTool("none");
    setTextInput("");
    setTextOverlays([]);
    setEmojiOverlays([]);
    setFilterIdx(0);
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    onClose();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith("video/");
    setMediaType(isVideo ? "video" : "image");
    setMediaFile(file);

    const reader = new FileReader();
    reader.onload = () => {
      setMediaPreview(reader.result as string);
      setMode("media");
    };
    reader.readAsDataURL(file);

    // Reset input so same file can be re-selected
    e.target.value = "";
  };

  const handlePublishText = () => {
    if (!text.trim()) return;
    onPublish({
      mediaType: "text",
      text: text.trim(),
      textBgGradient: TEXT_GRADIENTS[gradientIdx],
    });
    handleClose();
  };

  /* ── Drawing helpers ──────────────────────────────── */
  const getCanvasPos = (e: React.MouseEvent | React.TouchEvent) => {
    if (!canvasRef.current) return null;
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX =
      "touches" in e
        ? (e as React.TouchEvent).touches[0].clientX
        : (e as React.MouseEvent).clientX;
    const clientY =
      "touches" in e
        ? (e as React.TouchEvent).touches[0].clientY
        : (e as React.MouseEvent).clientY;
    return {
      x: (clientX - rect.left) * (canvasRef.current.width / rect.width),
      y: (clientY - rect.top) * (canvasRef.current.height / rect.height),
    };
  };

  const handleDrawStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (activeTool !== "draw") return;
    e.preventDefault();
    isDrawingActive.current = true;
    const pt = getCanvasPos(e);
    if (!pt || !canvasRef.current) return;
    lastPtRef.current = pt;
    const ctx = canvasRef.current.getContext("2d")!;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = drawColor;
    ctx.fill();
  };

  const handleDrawMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingActive.current || activeTool !== "draw" || !canvasRef.current)
      return;
    e.preventDefault();
    const pt = getCanvasPos(e);
    if (!pt || !lastPtRef.current) return;
    const ctx = canvasRef.current.getContext("2d")!;
    ctx.beginPath();
    ctx.moveTo(lastPtRef.current.x, lastPtRef.current.y);
    ctx.lineTo(pt.x, pt.y);
    ctx.strokeStyle = drawColor;
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    lastPtRef.current = pt;
  };

  const handleDrawEnd = () => {
    isDrawingActive.current = false;
    lastPtRef.current = null;
  };

  const addTextOverlay = () => {
    if (!textInput.trim()) return;
    setTextOverlays((prev) => [
      ...prev,
      { id: overlayIdRef.current++, text: textInput.trim(), color: textColor },
    ]);
    setTextInput("");
    setActiveTool("none");
  };

  const addEmojiOverlay = (emoji: string) => {
    setEmojiOverlays((prev) => [
      ...prev,
      { id: overlayIdRef.current++, emoji },
    ]);
  };

  /* ── Publish with compositing ────────────────────────── */
  const handlePublishMedia = async () => {
    if (!mediaFile) return;
    setIsUploading(true);
    try {
      let fileToUpload: File = mediaFile;

      // For images, bake filter + drawing + text + emoji onto a canvas
      if (mediaType === "image" && mediaPreview) {
        const img = new Image();
        img.src = mediaPreview;
        await new Promise<void>((resolve) => {
          img.onload = () => resolve();
        });
        const cvs = document.createElement("canvas");
        cvs.width = img.naturalWidth;
        cvs.height = img.naturalHeight;
        const ctx = cvs.getContext("2d")!;

        const filterCss = CSS_FILTERS[filterIdx];
        if (filterCss !== "none") ctx.filter = filterCss;
        ctx.drawImage(img, 0, 0);
        ctx.filter = "none";

        if (canvasRef.current && canvasRef.current.width > 0) {
          ctx.drawImage(canvasRef.current, 0, 0, cvs.width, cvs.height);
        }

        if (textOverlays.length > 0) {
          const fs = Math.max(32, Math.round(cvs.width * 0.065));
          ctx.font = `bold ${fs}px Inter, Arial, sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          const lineH = fs * 1.4;
          const startY =
            cvs.height / 2 - ((textOverlays.length - 1) * lineH) / 2;
          textOverlays.forEach((t, i) => {
            const y = startY + i * lineH;
            ctx.strokeStyle = "rgba(0,0,0,0.7)";
            ctx.lineWidth = fs * 0.12;
            ctx.strokeText(t.text, cvs.width / 2, y);
            ctx.fillStyle = t.color;
            ctx.fillText(t.text, cvs.width / 2, y);
          });
        }

        if (emojiOverlays.length > 0) {
          const es = Math.max(48, Math.round(cvs.width * 0.12));
          ctx.font = `${es}px sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "alphabetic";
          const gap = es * 1.4;
          const totalW = emojiOverlays.length * gap;
          const startX = (cvs.width - totalW) / 2 + gap / 2;
          emojiOverlays.forEach((em, i) => {
            ctx.fillText(em.emoji, startX + i * gap, cvs.height - es * 0.3);
          });
        }

        const blob = await new Promise<Blob>((resolve, reject) =>
          cvs.toBlob(
            (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
            "image/jpeg",
            0.92,
          ),
        );
        fileToUpload = new File(
          [blob],
          mediaFile.name.replace(/\.[^.]+$/, ".jpg"),
          { type: "image/jpeg" },
        );
      }

      const formData = new FormData();
      formData.append("file", fileToUpload);
      const token = getAccessToken();
      const uploadRes = await fetch(`${API_BASE}/upload`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
        body: formData,
      });
      if (!uploadRes.ok) throw new Error("Upload failed");
      const { url } = await uploadRes.json();

      onPublish({
        mediaType,
        mediaUrl: url,
        caption: caption.trim() || undefined,
      });
      handleClose();
    } catch (err) {
      console.error("[StatusCreator] upload error:", err);
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  /* ── Media mode: fullscreen WhatsApp-style ── */
  if (mode === "media") {
    return (
      <div
        className="fixed inset-0 z-50 flex flex-col bg-black select-none"
        onMouseUp={handleDrawEnd}
        onTouchEnd={handleDrawEnd}
      >
        {/* Top toolbar */}
        <div className="flex items-center justify-between px-4 py-3 shrink-0">
          <button
            className="w-10 h-10 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition-colors"
            onClick={() => {
              setMediaPreview(null);
              initialMode === "media" ? handleClose() : setMode("choose");
            }}
          >
            <X className="w-6 h-6" />
          </button>

          {/* Center: tool-specific panel or default 4 icons */}
          {activeTool === "draw" ? (
            <div className="flex items-center gap-1.5 bg-black/50 rounded-full px-3 py-1.5">
              {DRAW_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setDrawColor(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-transform ${
                    drawColor === c
                      ? "border-white scale-125"
                      : "border-white/30 hover:scale-110"
                  }`}
                  style={{ background: c }}
                />
              ))}
            </div>
          ) : activeTool === "filter" ? (
            <span className="text-white/70 text-[13px] font-medium">
              Choose a filter
            </span>
          ) : activeTool === "emoji" ? (
            <span className="text-white/70 text-[13px] font-medium">
              Choose an emoji
            </span>
          ) : (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveTool("draw")}
                className="w-10 h-10 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                title="Draw"
              >
                <Pencil className="w-5 h-5" />
              </button>
              <button
                onClick={() => setActiveTool("text")}
                className="w-10 h-10 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                title="Add text"
              >
                <Type className="w-5 h-5" />
              </button>
              <button
                onClick={() => setActiveTool("emoji")}
                className="w-10 h-10 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                title="Add emoji"
              >
                <Smile className="w-5 h-5" />
              </button>
              <button
                onClick={() => setActiveTool("filter")}
                className="w-10 h-10 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                title="Filters"
              >
                <Wand2 className="w-5 h-5" />
              </button>
            </div>
          )}

          {activeTool !== "none" ? (
            <button
              className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-[13px] font-medium transition-colors"
              onClick={() => setActiveTool("none")}
            >
              Done
            </button>
          ) : (
            <div className="w-16" />
          )}
        </div>

        {/* Media preview area */}
        <div
          ref={mediaAreaRef}
          className="flex-1 relative flex items-center justify-center overflow-hidden px-4 py-2"
        >
          {mediaPreview ? (
            <>
              {mediaType === "video" ? (
                <video
                  src={mediaPreview}
                  className="max-w-full max-h-full object-contain rounded-xl"
                  controls
                />
              ) : (
                <img
                  src={mediaPreview}
                  alt="Preview"
                  className="max-w-full max-h-full object-contain rounded-xl"
                  style={{ filter: CSS_FILTERS[filterIdx] }}
                />
              )}

              {/* Text overlays */}
              {textOverlays.map((t, i) => (
                <div
                  key={t.id}
                  className="absolute inset-x-4 text-center pointer-events-none"
                  style={{
                    top: `calc(50% + ${
                      (i - (textOverlays.length - 1) / 2) * 2.8
                    }rem)`,
                    transform: "translateY(-50%)",
                  }}
                >
                  <p
                    className="text-2xl font-bold drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] whitespace-pre-wrap"
                    style={{ color: t.color }}
                  >
                    {t.text}
                  </p>
                </div>
              ))}

              {/* Emoji overlays */}
              {emojiOverlays.length > 0 && (
                <div className="absolute bottom-4 inset-x-0 flex items-center justify-center gap-1 flex-wrap px-8 pointer-events-none">
                  {emojiOverlays.map((em) => (
                    <span
                      key={em.id}
                      className="text-4xl drop-shadow-lg leading-none"
                    >
                      {em.emoji}
                    </span>
                  ))}
                </div>
              )}

              {/* Drawing canvas overlay */}
              <canvas
                ref={canvasRef}
                className={`absolute inset-0 w-full h-full ${
                  activeTool === "draw"
                    ? "cursor-crosshair z-10"
                    : "pointer-events-none"
                }`}
                onMouseDown={handleDrawStart}
                onMouseMove={handleDrawMove}
                onTouchStart={handleDrawStart}
                onTouchMove={handleDrawMove}
              />
            </>
          ) : (
            <div className="flex flex-col items-center gap-4 text-white/60">
              <ImageIcon className="w-16 h-16 opacity-30" />
              <p className="text-[14px]">Select a photo or video</p>
              <button
                className="px-5 py-2 rounded-lg bg-accent text-white text-[14px] font-medium hover:bg-accent/90 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                Browse files
              </button>
            </div>
          )}
        </div>

        {/* Filter strip */}
        {activeTool === "filter" && mediaPreview && mediaType === "image" && (
          <div className="flex gap-3 px-4 py-3 overflow-x-auto shrink-0 bg-black/70">
            {CSS_FILTERS.map((f, i) => (
              <button
                key={i}
                onClick={() => setFilterIdx(i)}
                className={`flex flex-col items-center gap-1.5 shrink-0 transition-transform ${
                  filterIdx === i ? "scale-110" : "hover:scale-105"
                }`}
              >
                <div
                  className={`w-16 h-16 rounded-xl overflow-hidden ${
                    filterIdx === i
                      ? "ring-2 ring-white"
                      : "ring-1 ring-white/20"
                  }`}
                >
                  <img
                    src={mediaPreview}
                    alt={FILTER_NAMES[i]}
                    className="w-full h-full object-cover"
                    style={{ filter: f }}
                  />
                </div>
                <span className="text-[10px] text-white/70 font-medium">
                  {FILTER_NAMES[i]}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Text input bar */}
        {activeTool === "text" && (
          <div className="flex flex-col gap-2 px-4 py-3 bg-black/80 shrink-0">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Type overlay text..."
                autoFocus
                className="flex-1 bg-white/10 rounded-full px-4 py-2.5 text-[14px] text-white placeholder:text-white/40 outline-none border border-white/15"
                onKeyDown={(e) => {
                  if (e.key === "Enter") addTextOverlay();
                }}
              />
              <button
                className="w-9 h-9 rounded-full bg-accent flex items-center justify-center text-white hover:bg-accent-hover transition-colors disabled:opacity-40"
                disabled={!textInput.trim()}
                onClick={addTextOverlay}
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
            {/* Text color picker */}
            <div className="flex items-center gap-2">
              {TEXT_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setTextColor(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-transform ${
                    textColor === c
                      ? "border-white scale-125"
                      : "border-white/30 hover:scale-110"
                  }`}
                  style={{ background: c }}
                />
              ))}
            </div>
            {/* Existing text overlays with delete */}
            {textOverlays.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {textOverlays.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center gap-1 bg-white/10 rounded-full px-3 py-1"
                  >
                    <span className="text-[12px]" style={{ color: t.color }}>
                      {t.text}
                    </span>
                    <button
                      onClick={() =>
                        setTextOverlays((prev) =>
                          prev.filter((x) => x.id !== t.id),
                        )
                      }
                    >
                      <X className="w-3 h-3 text-white/60 hover:text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Emoji picker panel */}
        {activeTool === "emoji" && (
          <div className="shrink-0 z-20">
            <EmojiPicker
              onSelect={addEmojiOverlay}
              onClose={() => setActiveTool("none")}
              position="bottom"
              align="left"
            />
          </div>
        )}

        {/* Bottom bar (default / no active tool) */}
        {activeTool === "none" && (
          <div className="flex items-center gap-3 px-4 py-4 shrink-0">
            <div className="flex-1 flex items-center gap-3 bg-white/10 rounded-full h-11 px-4 border border-white/15">
              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add a caption..."
                className="flex-1 bg-transparent border-none outline-none text-[13.5px] text-white placeholder:text-white/50"
                maxLength={500}
              />
              <Smile className="w-5 h-5 text-white/50 shrink-0" />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {mediaPreview && (
                <div className="w-11 h-11 rounded-lg overflow-hidden border-2 border-accent shrink-0">
                  {mediaType === "video" ? (
                    <video
                      src={mediaPreview}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img
                      src={mediaPreview}
                      alt="thumb"
                      className="w-full h-full object-cover"
                      style={{ filter: CSS_FILTERS[filterIdx] }}
                    />
                  )}
                </div>
              )}
              <button
                className="w-11 h-11 rounded-lg border-2 border-white/30 flex items-center justify-center text-white/70 hover:text-white hover:border-white/60 transition-colors shrink-0"
                onClick={() => fileInputRef.current?.click()}
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <button
              className="w-12 h-12 rounded-full bg-accent hover:bg-accent-hover flex items-center justify-center text-white shrink-0 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-lg"
              onClick={handlePublishMedia}
              disabled={!mediaPreview || isUploading}
            >
              {isUploading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="relative w-full h-full md:w-[520px] md:h-[600px] md:rounded-2xl bg-card flex flex-col overflow-hidden border border-border shadow-2xl">
        {/* ── Choose mode ── */}
        {mode === "choose" && (
          <>
            <div className="flex items-center gap-3 p-4 border-b border-border h-[64px] shrink-0">
              <button
                className="w-9 h-9 rounded-full flex items-center justify-center text-text-secondary hover:text-text-main hover:bg-input transition-colors"
                onClick={handleClose}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h2 className="text-[17px] font-semibold text-text-main">
                Create status
              </h2>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
              <button
                className="w-full max-w-xs flex items-center gap-4 px-6 py-4 rounded-xl bg-input/60 hover:bg-input transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-12 h-12 rounded-full bg-accent/15 flex items-center justify-center">
                  <ImageIcon className="w-5 h-5 text-accent" />
                </div>
                <div className="text-left">
                  <p className="text-[15px] font-semibold text-text-main">
                    Photos & videos
                  </p>
                  <p className="text-[12.5px] text-text-secondary">
                    Share a photo or video
                  </p>
                </div>
              </button>
              <button
                className="w-full max-w-xs flex items-center gap-4 px-6 py-4 rounded-xl bg-input/60 hover:bg-input transition-colors"
                onClick={() => setMode("text")}
              >
                <div className="w-12 h-12 rounded-full bg-accent/15 flex items-center justify-center">
                  <Type className="w-5 h-5 text-accent" />
                </div>
                <div className="text-left">
                  <p className="text-[15px] font-semibold text-text-main">
                    Text
                  </p>
                  <p className="text-[12.5px] text-text-secondary">
                    Write a text status
                  </p>
                </div>
              </button>
            </div>
          </>
        )}

        {/* ── Text mode ── */}
        {mode === "text" && (
          <>
            <div className="flex items-center gap-3 p-4 border-b border-border h-[64px] shrink-0">
              <button
                className="w-9 h-9 rounded-full flex items-center justify-center text-text-secondary hover:text-text-main hover:bg-input transition-colors"
                onClick={() =>
                  initialMode === "text" ? handleClose() : setMode("choose")
                }
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h2 className="text-[17px] font-semibold text-text-main">
                Text status
              </h2>
            </div>

            {/* Preview */}
            <div
              className="flex-1 flex items-center justify-center px-8 transition-colors duration-300"
              style={{ background: TEXT_GRADIENTS[gradientIdx] }}
            >
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type a status..."
                className="w-full text-center text-white text-[22px] font-semibold bg-transparent resize-none outline-none placeholder:text-white/50 max-h-[200px]"
                rows={3}
                maxLength={700}
                autoFocus
              />
            </div>

            {/* Bottom bar */}
            <div className="flex items-center gap-2 p-4 border-t border-border bg-card">
              {/* Palette icon – fixed left */}
              <Palette className="w-5 h-5 text-text-secondary shrink-0" />

              {/* Gradient circles – scrollable */}
              <div className="flex-1 min-w-0 overflow-x-auto scrollbar-hide">
                <div className="flex items-center gap-2 w-max">
                  {TEXT_GRADIENTS.map((g, i) => (
                    <button
                      key={i}
                      className={`w-7 h-7 rounded-full shrink-0 transition-all ${i === gradientIdx ? "ring-2 ring-accent ring-offset-2 ring-offset-card scale-110" : "hover:scale-105"}`}
                      style={{ background: g }}
                      onClick={() => setGradientIdx(i)}
                    />
                  ))}
                </div>
              </div>

              {/* Send button – fixed right */}
              <button
                className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-white hover:bg-accent/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                disabled={!text.trim()}
                onClick={handlePublishText}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>
    </div>
  );
}
