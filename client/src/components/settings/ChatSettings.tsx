import { useState, useCallback } from "react";
import {
  Sun,
  Moon,
  Monitor,
  ChevronRight,
  ChevronLeft,
  Image,
  ImagePlus,
  Check,
  RotateCcw,
} from "lucide-react";
import { useTheme } from "../../contexts/ThemeContext";
import { useSettings } from "../../contexts/SettingsContext";

// ── Toggle switch (matching Notification style, blue) ───────────────────
function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-[26px] w-[46px] shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
        checked ? "bg-[#2563eb]" : "bg-[var(--color-border)]"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-[22px] w-[22px] rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? "translate-x-[20px]" : "translate-x-0"
        }`}
      />
    </button>
  );
}

// ── Wallpaper color palette ─────────────────────────────────────────────
const WALLPAPERS = [
  { id: "default", color: "", label: "Default" },
  { id: "slate-900", color: "#0f172a", label: "Slate" },
  { id: "blue-950", color: "#172554", label: "Navy" },
  { id: "sky-900", color: "#0c4a6e", label: "Sky" },
  { id: "teal-900", color: "#134e4a", label: "Teal" },
  { id: "emerald-900", color: "#064e3b", label: "Emerald" },
  { id: "green-900", color: "#14532d", label: "Forest" },
  { id: "indigo-950", color: "#1e1b4b", label: "Indigo" },
  { id: "violet-950", color: "#2e1065", label: "Violet" },
  { id: "purple-950", color: "#3b0764", label: "Purple" },
  { id: "zinc-800", color: "#27272a", label: "Zinc" },
  { id: "stone-800", color: "#292524", label: "Stone" },
  { id: "amber-900", color: "#78350f", label: "Amber" },
  { id: "orange-900", color: "#7c2d12", label: "Orange" },
  { id: "red-950", color: "#450a0a", label: "Red" },
  { id: "rose-950", color: "#4c0519", label: "Rose" },
  { id: "cyan-900", color: "#164e63", label: "Cyan" },
  { id: "blue-900", color: "#1e3a5f", label: "Ocean" },
  { id: "gray-900", color: "#111827", label: "Charcoal" },
  { id: "neutral-900", color: "#171717", label: "Neutral" },
  { id: "warm-dark", color: "#1c1917", label: "Warm Dark" },
  { id: "cool-dark", color: "#0f1729", label: "Cool Dark" },
  { id: "midnight", color: "#0a0e1a", label: "Midnight" },
  { id: "deep-teal", color: "#0d3b3b", label: "Deep Teal" },
] as const;

// ── Doodle SVG pattern (chat-style icons as CSS background) ─────────────
const DOODLE_PATTERN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Cdefs%3E%3Cstyle%3E.d%7Bfill:none;stroke:rgba(255,255,255,0.06);stroke-width:1;stroke-linecap:round;stroke-linejoin:round%7D%3C/style%3E%3C/defs%3E%3Cpath class='d' d='M15 15h12v9H15z'/%3E%3Ccircle class='d' cx='21' cy='19' r='2'/%3E%3Cpath class='d' d='M55 12l5 8h-10z'/%3E%3Cpath class='d' d='M95 10c3 0 5 2 5 5v6c0 3-2 5-5 5h-3l-4 3v-3h-1c-3 0-5-2-5-5v-6c0-3 2-5 5-5z'/%3E%3Ccircle class='d' cx='140' cy='18' r='8'/%3E%3Cpath class='d' d='M140 14v8M136 18h8'/%3E%3Cpath class='d' d='M175 10v16l4-4 4 4V10'/%3E%3Cpath class='d' d='M18 55a8 8 0 1 1 0 16 8 8 0 0 1 0-16'/%3E%3Cpath class='d' d='M18 60v4l2 2'/%3E%3Cpath class='d' d='M55 50h14v14H55zM59 54h6M59 58h4'/%3E%3Cpath class='d' d='M95 55l4-4 4 4-4 4z'/%3E%3Cpath class='d' d='M135 50l3 14h4l3-14'/%3E%3Cpath class='d' d='M178 50a5 5 0 0 0-10 0c0 6 10 10 10 16a5 5 0 0 1-10 0'/%3E%3Ccircle class='d' cx='18' cy='100' r='6'/%3E%3Cpath class='d' d='M14 100h8M18 96v8'/%3E%3Cpath class='d' d='M50 95h8l-2 10h-4z'/%3E%3Cpath class='d' d='M54 92h0'/%3E%3Cpath class='d' d='M88 95h14M88 100h10M88 105h12'/%3E%3Cpath class='d' d='M138 92l-6 8h12l-6 8'/%3E%3Cpath class='d' d='M170 95c0-3 4-3 4 0s-4 3-4 6 4 3 4 0'/%3E%3Cpath class='d' d='M15 140h10a3 3 0 0 1 0 6h-6v6'/%3E%3Cpath class='d' d='M50 138v12h12'/%3E%3Cpath class='d' d='M90 140h4v-4h4v4h4v4h-4v4h-4v-4h-4z'/%3E%3Ccircle class='d' cx='138' cy='145' r='7'/%3E%3Cpath class='d' d='M134 149l-2 3M142 149l2 3M138 152v3'/%3E%3Cpath class='d' d='M172 138l8 6-8 6'/%3E%3Cpath class='d' d='M12 180h16M12 185h12M12 190h14'/%3E%3Ccircle class='d' cx='55' cy='185' r='5'/%3E%3Cpath class='d' d='M53 183l4 4M57 183l-4 4'/%3E%3Cpath class='d' d='M88 178v12l6-3 6 3v-12'/%3E%3Cpath class='d' d='M130 180h12v8h-12z'/%3E%3Ccircle class='d' cx='136' cy='184' r='1.5'/%3E%3Cpath class='d' d='M170 180a5 5 0 0 1 10 0v8a5 5 0 0 1-10 0z'/%3E%3C/svg%3E")`;

// ── Sub-views ───────────────────────────────────────────────────────────
type SubView = null | "theme" | "wallpaper" | "media-quality" | "auto-download";

// ── Main component ──────────────────────────────────────────────────────
export function ChatSettings() {
  const { theme, toggleTheme } = useTheme();
  const { settings, updateSetting, updateSettings: batchUpdate } = useSettings();
  const [subView, setSubView] = useState<SubView>(null);

  // Helper: update a setting and notify ChatArea
  const setChatSetting = useCallback(
    <K extends keyof typeof settings>(key: K, value: (typeof settings)[K]) => {
      updateSetting(key, value);
      window.dispatchEvent(new CustomEvent("chat-settings-changed"));
    },
    [updateSetting],
  );

  // Convenience aliases
  const wallpaper = settings.chatWallpaper || "default";
  const doodlesEnabled = settings.chatDoodles;
  const mediaQuality = settings.mediaQuality;

  const toggleAutoDownload = useCallback(
    (key: "autoDownloadPhotos" | "autoDownloadAudio" | "autoDownloadVideo" | "autoDownloadDocs") => {
      updateSetting(key, !settings[key]);
    },
    [settings, updateSetting],
  );

  const resetAutoDownload = useCallback(() => {
    batchUpdate({
      autoDownloadPhotos: true,
      autoDownloadAudio: true,
      autoDownloadVideo: true,
      autoDownloadDocs: true,
    });
  }, [batchUpdate]);

  const themeLabel =
    theme === "dark" ? "Dark" : theme === "light" ? "Light" : "System Default";

  // ── Sub-view: Theme ─────────────────────────────────────────────────
  if (subView === "theme") {
    return (
      <div className="flex flex-col gap-0">
        {/* Back header */}
        <button
          type="button"
          onClick={() => setSubView(null)}
          className="flex items-center gap-2 px-4 py-3.5 border-b border-border text-accent text-[14px] font-medium hover:bg-input/30 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          Theme
        </button>

        <div className="flex flex-col gap-1 px-4 py-4">
          {(
            [
              {
                id: "dark",
                label: "Dark",
                desc: "Easy on the eyes in low-light environments",
                icon: Moon,
              },
              {
                id: "light",
                label: "Light",
                desc: "Best for well-lit environments",
                icon: Sun,
              },
            ] as const
          ).map((opt) => {
            const Icon = opt.icon;
            const isActive = theme === opt.id;
            return (
              <button
                type="button"
                key={opt.id}
                onClick={() => {
                  if (theme !== opt.id) toggleTheme();
                }}
                className={`flex items-center gap-3.5 px-4 py-3.5 rounded-xl transition-colors ${
                  isActive
                    ? "bg-accent/10 border border-accent/30"
                    : "hover:bg-input/50 border border-transparent"
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center ${
                    isActive
                      ? "bg-accent text-white"
                      : "bg-input text-text-secondary"
                  }`}
                >
                  <Icon className="w-[18px] h-[18px]" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <span className="block text-[14px] font-medium text-text-main">
                    {opt.label}
                  </span>
                  <span className="block text-[12px] text-text-secondary">
                    {opt.desc}
                  </span>
                </div>
                {isActive && (
                  <Check className="w-5 h-5 text-accent shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Sub-view: Wallpaper ─────────────────────────────────────────────
  if (subView === "wallpaper") {
    const selectedWp = WALLPAPERS.find((w) => w.id === wallpaper) ?? WALLPAPERS[0];
    const previewBg = selectedWp.color || "var(--color-bg)";

    return (
      <div className="flex flex-col gap-0 h-full">
        {/* Back header */}
        <button
          type="button"
          onClick={() => setSubView(null)}
          className="flex items-center gap-2 px-4 py-3.5 border-b border-border text-accent text-[14px] font-medium hover:bg-input/30 transition-colors shrink-0"
        >
          <ChevronLeft className="w-5 h-5" />
          Wallpaper
        </button>

        {/* Desktop: side-by-side layout */}
        <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
          {/* Left: picker */}
          <div className="md:w-[280px] md:min-w-[280px] md:border-r md:border-border flex flex-col overflow-y-auto p-4 gap-4">
            {/* Doodle toggle */}
            <label
              className="flex items-center gap-3 cursor-pointer select-none"
              onClick={() => setChatSetting("chatDoodles", !doodlesEnabled)}
            >
              <div
                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                  doodlesEnabled
                    ? "bg-accent border-accent"
                    : "border-border bg-transparent"
                }`}
              >
                {doodlesEnabled && (
                  <Check className="w-3.5 h-3.5 text-white" />
                )}
              </div>
              <span className="text-[13px] text-accent font-medium">
                Add Chat Doodles
              </span>
            </label>

            {/* Color grid */}
            <div className="grid grid-cols-6 md:grid-cols-3 gap-2.5">
              {WALLPAPERS.map((wp) => {
                const isSelected = wallpaper === wp.id;
                const bgStyle =
                  wp.id === "default"
                    ? {
                        background: "var(--color-bg)",
                        border: "1px dashed var(--color-border)",
                      }
                    : { background: wp.color };

                return (
                  <button
                    key={wp.id}
                    type="button"
                    onClick={() => setChatSetting("chatWallpaper", wp.id)}
                    className={`relative aspect-square rounded-lg transition-all ${
                      isSelected
                        ? "ring-2 ring-accent ring-offset-2 ring-offset-bg scale-[1.05]"
                        : "hover:scale-[1.05] hover:ring-1 hover:ring-border"
                    }`}
                    style={bgStyle}
                    title={wp.label}
                  >
                    {wp.id === "default" && (
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] text-text-secondary font-medium">
                        Default
                      </span>
                    )}
                    {isSelected && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <Check className="w-5 h-5 text-white drop-shadow-md" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: preview (desktop only) */}
          <div className="hidden md:flex flex-1 flex-col items-center justify-center p-6">
            <span className="text-[12px] text-text-secondary font-medium uppercase tracking-wider mb-4">
              Wallpaper Preview
            </span>
            <div
              className="w-full max-w-[480px] h-[340px] rounded-2xl border border-border overflow-hidden relative"
              style={{ backgroundColor: previewBg }}
            >
              {/* Doodle overlay */}
              {doodlesEnabled && (
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{ backgroundImage: DOODLE_PATTERN, backgroundSize: "200px 200px" }}
                />
              )}
              {/* Fake message bubbles */}
              <div className="absolute inset-0 flex flex-col justify-end p-4 gap-2">
                <div className="self-start max-w-[60%] bg-card/90 backdrop-blur-sm rounded-2xl rounded-bl-md px-3.5 py-2 shadow-sm">
                  <p className="text-[13px] text-text-main">
                    Hey, how are you? 👋
                  </p>
                  <span className="text-[10px] text-text-secondary mt-0.5 block text-right">
                    10:30 AM
                  </span>
                </div>
                <div className="self-end max-w-[60%] bg-accent/90 backdrop-blur-sm rounded-2xl rounded-br-md px-3.5 py-2 shadow-sm">
                  <p className="text-[13px] text-white">
                    I'm great, thanks! 😊
                  </p>
                  <span className="text-[10px] text-white/60 mt-0.5 block text-right">
                    10:31 AM
                  </span>
                </div>
                <div className="self-start max-w-[60%] bg-card/90 backdrop-blur-sm rounded-2xl rounded-bl-md px-3.5 py-2 shadow-sm">
                  <p className="text-[13px] text-text-main">
                    Want to catch up later?
                  </p>
                  <span className="text-[10px] text-text-secondary mt-0.5 block text-right">
                    10:32 AM
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Sub-view: Media quality ─────────────────────────────────────────
  if (subView === "media-quality") {
    return (
      <div className="flex flex-col gap-0">
        {/* Back header */}
        <button
          type="button"
          onClick={() => setSubView(null)}
          className="flex items-center gap-2 px-4 py-3.5 border-b border-border text-accent text-[14px] font-medium hover:bg-input/30 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          Media Upload Quality
        </button>

        <div className="flex flex-col gap-1 px-4 py-4">
          {(
            [
              {
                id: "standard",
                label: "Standard Quality",
                desc: "Standard media files take less space and are faster to send.",
              },
              {
                id: "hd",
                label: "HD Quality",
                desc: "HD media files are slower to send. They can be up to 6× larger.",
              },
            ] as const
          ).map((opt) => {
            const isActive = mediaQuality === opt.id;
            return (
              <button
                type="button"
                key={opt.id}
                onClick={() => setChatSetting("mediaQuality", opt.id)}
                className={`flex items-start gap-3.5 px-4 py-4 rounded-xl transition-colors ${
                  isActive
                    ? "bg-accent/10 border border-accent/30"
                    : "hover:bg-input/50 border border-transparent"
                }`}
              >
                <div
                  className={`mt-0.5 w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                    isActive ? "border-accent" : "border-text-secondary"
                  }`}
                >
                  {isActive && (
                    <div className="w-[10px] h-[10px] rounded-full bg-accent" />
                  )}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <span className="block text-[14px] font-medium text-text-main">
                    {opt.label}
                  </span>
                  <span className="block text-[12px] text-text-secondary mt-0.5 leading-relaxed">
                    {opt.desc}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Sub-view: Auto download ─────────────────────────────────────────
  if (subView === "auto-download") {
    return (
      <div className="flex flex-col gap-0">
        {/* Back header */}
        <button
          type="button"
          onClick={() => setSubView(null)}
          className="flex items-center gap-2 px-4 py-3.5 border-b border-border text-accent text-[14px] font-medium hover:bg-input/30 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          Auto Media Download
        </button>

        <div className="flex flex-col">
          {(
            [
              { key: "autoDownloadPhotos" as const, label: "Photos" },
              { key: "autoDownloadAudio" as const, label: "Audio" },
              { key: "autoDownloadVideo" as const, label: "Video" },
              { key: "autoDownloadDocs" as const, label: "Documents" },
            ]
          ).map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between gap-4 px-4 py-4 border-b border-border"
            >
              <span className="text-[14px] font-medium text-text-main">
                {item.label}
              </span>
              <Toggle
                checked={settings[item.key]}
                onChange={() => toggleAutoDownload(item.key)}
                label={`Auto download ${item.label}`}
              />
            </div>
          ))}
        </div>

        {/* Info text */}
        <p className="px-4 py-4 text-[12px] text-text-secondary leading-relaxed border-b border-border">
          Voice messages are always downloaded automatically for an optimal
          communication experience.
        </p>

        {/* Reset */}
        <button
          type="button"
          onClick={resetAutoDownload}
          className="flex items-center gap-3 px-4 py-4 text-text-secondary hover:bg-input/50 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          <span className="text-[14px]">Reset to defaults</span>
        </button>
      </div>
    );
  }

  // ── Main view ───────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-0">
      {/* ─── Display section ─────────────────────────────── */}
      <div className="px-4 pt-4 pb-1">
        <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.6px]">
          Display
        </span>
      </div>

      {/* Theme row */}
      <button
        type="button"
        onClick={() => setSubView("theme")}
        className="flex items-center justify-between gap-4 px-4 py-4 hover:bg-input/50 transition-colors border-b border-border"
      >
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-[14px] font-medium text-text-main">Theme</span>
          <span className="text-[12px] text-text-secondary">{themeLabel}</span>
        </div>
        <ChevronRight className="w-4 h-4 text-text-secondary shrink-0" />
      </button>

      {/* Wallpaper row */}
      <button
        type="button"
        onClick={() => setSubView("wallpaper")}
        className="flex items-center justify-between gap-4 px-4 py-4 hover:bg-input/50 transition-colors border-b border-border"
      >
        <span className="text-[14px] font-medium text-text-main">
          Wallpaper
        </span>
        <ChevronRight className="w-4 h-4 text-text-secondary shrink-0" />
      </button>

      {/* ─── Chat Settings section ───────────────────────── */}
      <div className="px-4 pt-5 pb-1">
        <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.6px]">
          Chat Settings
        </span>
      </div>

      {/* Media upload quality */}
      <button
        type="button"
        onClick={() => setSubView("media-quality")}
        className="flex items-center justify-between gap-4 px-4 py-4 hover:bg-input/50 transition-colors border-b border-border"
      >
        <span className="text-[14px] font-medium text-text-main">
          Media Upload Quality
        </span>
        <ChevronRight className="w-4 h-4 text-text-secondary shrink-0" />
      </button>

      {/* Auto media download */}
      <button
        type="button"
        onClick={() => setSubView("auto-download")}
        className="flex items-center justify-between gap-4 px-4 py-4 hover:bg-input/50 transition-colors border-b border-border"
      >
        <span className="text-[14px] font-medium text-text-main">
          Auto Media Download
        </span>
        <ChevronRight className="w-4 h-4 text-text-secondary shrink-0" />
      </button>

      {/* Spell check */}
      <div className="flex items-center justify-between gap-4 px-4 py-4 border-b border-border">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-[14px] font-medium text-text-main">
            Spell Check
          </span>
          <span className="text-[12px] text-text-secondary">
            Check spelling while typing messages
          </span>
        </div>
        <Toggle
          checked={settings.spellCheck}
          onChange={(v) => setChatSetting("spellCheck", v)}
          label="Spell check"
        />
      </div>

      {/* Emoji replacement */}
      <div className="flex items-center justify-between gap-4 px-4 py-4 border-b border-border">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-[14px] font-medium text-text-main">
            Replace Text with Emoji
          </span>
          <span className="text-[12px] text-text-secondary">
            Emoji will replace specific text as you type
          </span>
        </div>
        <Toggle
          checked={settings.emojiReplace}
          onChange={(v) => setChatSetting("emojiReplace", v)}
          label="Replace text with emoji"
        />
      </div>

      {/* Enter key to send */}
      <div className="flex items-center justify-between gap-4 px-4 py-4">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-[14px] font-medium text-text-main">
            Enter Key to Send
          </span>
          <span className="text-[12px] text-text-secondary">
            Press Enter to send a message
          </span>
        </div>
        <Toggle
          checked={settings.enterToSend}
          onChange={(v) => setChatSetting("enterToSend", v)}
          label="Enter key to send"
        />
      </div>
    </div>
  );
}
