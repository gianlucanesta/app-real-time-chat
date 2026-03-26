import { FileText, Image, Camera, Music } from "lucide-react";
import { useRef } from "react";
import { useClickOutside } from "../../hooks/useClickOutside";

interface AttachmentMenuProps {
  onClose: () => void;
  onSelectFile: (
    file: File,
    type: "image" | "video" | "audio" | "document",
  ) => void;
  onOpenCamera: () => void;
}

export function AttachmentMenu({ onClose, onSelectFile, onOpenCamera }: AttachmentMenuProps) {
  const menuRef = useClickOutside<HTMLDivElement>(onClose);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const photoVideoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "image" | "video" | "audio" | "document",
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      // For image/video inputs, detect actual type from mimetype
      let resolvedType = type;
      if (type === "image" && file.type.startsWith("video/")) {
        resolvedType = "video";
      }
      onSelectFile(file, resolvedType);
    }
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="absolute bottom-full left-0 mb-2 w-52 bg-card border border-border/80 rounded-xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-bottom-2"
    >
      {/* Document */}
      <button
        type="button"
        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-text-main hover:bg-input/60 transition-colors"
        onClick={() => documentInputRef.current?.click()}
      >
        <span className="w-8 h-8 rounded-full bg-blue-500/15 flex items-center justify-center">
          <FileText className="w-4 h-4 text-blue-500" />
        </span>
        Document
      </button>
      <input
        ref={documentInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar"
        className="hidden"
        onChange={(e) => handleFileChange(e, "document")}
      />

      {/* Photo & Video */}
      <button
        type="button"
        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-text-main hover:bg-input/60 transition-colors"
        onClick={() => photoVideoInputRef.current?.click()}
      >
        <span className="w-8 h-8 rounded-full bg-violet-500/15 flex items-center justify-center">
          <Image className="w-4 h-4 text-violet-500" />
        </span>
        Photo & Video
      </button>
      <input
        ref={photoVideoInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={(e) => handleFileChange(e, "image")}
      />

      {/* Camera */}
      <button
        type="button"
        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-text-main hover:bg-input/60 transition-colors"
        onClick={() => {
          onClose();
          onOpenCamera();
        }}
      >
        <span className="w-8 h-8 rounded-full bg-rose-500/15 flex items-center justify-center">
          <Camera className="w-4 h-4 text-rose-500" />
        </span>
        Camera
      </button>

      {/* Audio */}
      <button
        type="button"
        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-text-main hover:bg-input/60 transition-colors"
        onClick={() => audioInputRef.current?.click()}
      >
        <span className="w-8 h-8 rounded-full bg-orange-500/15 flex items-center justify-center">
          <Music className="w-4 h-4 text-orange-500" />
        </span>
        Audio
      </button>
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => handleFileChange(e, "audio")}
      />
    </div>
  );
}
