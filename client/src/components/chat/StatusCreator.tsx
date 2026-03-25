import { useState, useRef } from "react";
import {
  ArrowLeft,
  Send,
  Image as ImageIcon,
  Type,
  Palette,
  X,
} from "lucide-react";

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClose = () => {
    setMode(initialMode || "choose");
    setText("");
    setGradientIdx(0);
    setMediaPreview(null);
    setCaption("");
    onClose();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith("video/");
    setMediaType(isVideo ? "video" : "image");

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

  const handlePublishMedia = () => {
    if (!mediaPreview) return;
    onPublish({
      mediaType,
      mediaUrl: mediaPreview,
      caption: caption.trim() || undefined,
    });
    handleClose();
  };

  if (!isOpen) return null;

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
            <div className="flex items-center justify-between p-4 border-t border-border bg-card">
              {/* Gradient picker */}
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-text-secondary mr-1" />
                {TEXT_GRADIENTS.map((g, i) => (
                  <button
                    key={i}
                    className={`w-6 h-6 rounded-full shrink-0 transition-all ${i === gradientIdx ? "ring-2 ring-accent ring-offset-2 ring-offset-card scale-110" : "hover:scale-105"}`}
                    style={{ background: g }}
                    onClick={() => setGradientIdx(i)}
                  />
                ))}
              </div>
              <button
                className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-white hover:bg-accent/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                disabled={!text.trim()}
                onClick={handlePublishText}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </>
        )}

        {/* ── Media mode ── */}
        {mode === "media" && (
          <>
            <div className="flex items-center gap-3 p-4 border-b border-border h-[64px] shrink-0">
              <button
                className="w-9 h-9 rounded-full flex items-center justify-center text-text-secondary hover:text-text-main hover:bg-input transition-colors"
                onClick={() => {
                  setMediaPreview(null);
                  initialMode === "media" ? handleClose() : setMode("choose");
                }}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h2 className="text-[17px] font-semibold text-text-main">
                {mediaType === "video" ? "Video" : "Photo"} status
              </h2>
              {mediaPreview && (
                <button
                  className="ml-auto w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:text-text-main hover:bg-input transition-colors"
                  onClick={() => setMediaPreview(null)}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Preview */}
            <div className="flex-1 flex items-center justify-center bg-black/40 overflow-hidden">
              {mediaPreview ? (
                mediaType === "video" ? (
                  <video
                    src={mediaPreview}
                    className="max-w-full max-h-full object-contain"
                    controls
                  />
                ) : (
                  <img
                    src={mediaPreview}
                    alt="Preview"
                    className="max-w-full max-h-full object-contain"
                  />
                )
              ) : (
                <div className="flex flex-col items-center gap-4 text-text-secondary">
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

            {/* Caption + send */}
            {mediaPreview && (
              <div className="flex items-center gap-3 p-4 border-t border-border bg-card">
                <input
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Add a caption..."
                  className="flex-1 bg-input rounded-lg px-4 py-2.5 text-[14px] text-text-main placeholder:text-text-secondary outline-none border border-border focus:border-accent transition-colors"
                  maxLength={500}
                />
                <button
                  className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-white hover:bg-accent/90 transition-colors"
                  onClick={handlePublishMedia}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            )}
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
