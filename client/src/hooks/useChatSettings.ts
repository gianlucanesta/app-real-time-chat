import { useState, useEffect, useCallback } from "react";

// ── Emoji shortcodes map ────────────────────────────────────────────────
const EMOJI_MAP: Record<string, string> = {
  ":)": "😊",
  ":-)": "😊",
  ":(": "😞",
  ":-(": "😞",
  ";)": "😉",
  ";-)": "😉",
  ":D": "😃",
  ":-D": "😃",
  ":P": "😛",
  ":-P": "😛",
  ":p": "😛",
  ":-p": "😛",
  "XD": "😆",
  "xD": "😆",
  "<3": "❤️",
  "</3": "💔",
  ":o": "😮",
  ":O": "😮",
  ":-o": "😮",
  ":-O": "😮",
  "B)": "😎",
  "B-)": "😎",
  ":/": "😕",
  ":-/": "😕",
  ":'(": "😢",
  ":*(": "😢",
  ":*": "😘",
  ":-*": "😘",
  "^_^": "😊",
  "-_-": "😑",
  "o_O": "😳",
  "O_o": "😳",
  ">:(": "😡",
  ">:-(": "😡",
  ":fire:": "🔥",
  ":heart:": "❤️",
  ":thumbsup:": "👍",
  ":thumbsdown:": "👎",
  ":clap:": "👏",
  ":ok:": "👌",
  ":wave:": "👋",
  ":pray:": "🙏",
  ":100:": "💯",
  ":star:": "⭐",
  ":sun:": "☀️",
  ":moon:": "🌙",
  ":cloud:": "☁️",
  ":rain:": "🌧️",
  ":snow:": "❄️",
  ":coffee:": "☕",
  ":pizza:": "🍕",
  ":cake:": "🎂",
  ":beer:": "🍺",
  ":tada:": "🎉",
  ":gift:": "🎁",
  ":music:": "🎵",
  ":skull:": "💀",
  ":ghost:": "👻",
  ":rocket:": "🚀",
  ":check:": "✅",
  ":x:": "❌",
  ":warning:": "⚠️",
  ":bulb:": "💡",
  ":cry:": "😭",
  ":angry:": "😡",
  ":cool:": "😎",
  ":lol:": "😂",
  ":wink:": "😉",
  ":thinking:": "🤔",
  ":shrug:": "🤷",
  ":facepalm:": "🤦",
  ":eyes:": "👀",
  ":poop:": "💩",
  ":unicorn:": "🦄",
};

/** Build a regex that matches any emoji shortcode as a standalone token. */
const EMOJI_PATTERN = new RegExp(
  "(?:^|(?<=\\s))(" +
    Object.keys(EMOJI_MAP)
      .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("|") +
    ")(?=$|\\s)",
  "g",
);

export interface ChatSettingsState {
  wallpaper: string;
  wallpaperColor: string;
  doodlesEnabled: boolean;
  mediaQuality: string;
  autoDownloadPhotos: boolean;
  autoDownloadAudio: boolean;
  autoDownloadVideo: boolean;
  autoDownloadDocs: boolean;
  spellCheck: boolean;
  emojiReplace: boolean;
  enterToSend: boolean;
}

const WALLPAPER_COLORS: Record<string, string> = {
  default: "",
  "slate-900": "#0f172a",
  "blue-950": "#172554",
  "sky-900": "#0c4a6e",
  "teal-900": "#134e4a",
  "emerald-900": "#064e3b",
  "green-900": "#14532d",
  "indigo-950": "#1e1b4b",
  "violet-950": "#2e1065",
  "purple-950": "#3b0764",
  "zinc-800": "#27272a",
  "stone-800": "#292524",
  "amber-900": "#78350f",
  "orange-900": "#7c2d12",
  "red-950": "#450a0a",
  "rose-950": "#4c0519",
  "cyan-900": "#164e63",
  "blue-900": "#1e3a5f",
  "gray-900": "#111827",
  "neutral-900": "#171717",
  "warm-dark": "#1c1917",
  "cool-dark": "#0f1729",
  midnight: "#0a0e1a",
  "deep-teal": "#0d3b3b",
};

function readSettings(): ChatSettingsState {
  const wallpaper = localStorage.getItem("ephemeral-chat-wallpaper") ?? "default";
  return {
    wallpaper,
    wallpaperColor: WALLPAPER_COLORS[wallpaper] ?? "",
    doodlesEnabled: localStorage.getItem("ephemeral-chat-doodles") !== "false",
    mediaQuality: localStorage.getItem("ephemeral-media-quality") ?? "standard",
    autoDownloadPhotos: localStorage.getItem("ephemeral-auto-dl-photos") !== "false",
    autoDownloadAudio: localStorage.getItem("ephemeral-auto-dl-audio") !== "false",
    autoDownloadVideo: localStorage.getItem("ephemeral-auto-dl-video") !== "false",
    autoDownloadDocs: localStorage.getItem("ephemeral-auto-dl-docs") !== "false",
    spellCheck: localStorage.getItem("ephemeral-spell-check") !== "false",
    emojiReplace: localStorage.getItem("ephemeral-emoji-replace") !== "false",
    enterToSend: localStorage.getItem("ephemeral-enter-to-send") !== "false",
  };
}

/**
 * Hook that reads chat settings from localStorage and re-reads
 * whenever the ChatSettings component dispatches a change event.
 */
export function useChatSettings(): ChatSettingsState {
  const [settings, setSettings] = useState<ChatSettingsState>(readSettings);

  useEffect(() => {
    const handler = () => setSettings(readSettings());
    window.addEventListener("chat-settings-changed", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("chat-settings-changed", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  return settings;
}

/**
 * Apply emoji replacement to text input value.
 * Returns the transformed string (only if emojiReplace is enabled).
 */
export function applyEmojiReplace(text: string, enabled: boolean): string {
  if (!enabled) return text;
  return text.replace(EMOJI_PATTERN, (match) => EMOJI_MAP[match] ?? match);
}

/** Doodle pattern as CSS background-image value. */
export const DOODLE_BG_IMAGE = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Cdefs%3E%3Cstyle%3E.d%7Bfill:none;stroke:rgba(255,255,255,0.06);stroke-width:1;stroke-linecap:round;stroke-linejoin:round%7D%3C/style%3E%3C/defs%3E%3Cpath class='d' d='M15 15h12v9H15z'/%3E%3Ccircle class='d' cx='21' cy='19' r='2'/%3E%3Cpath class='d' d='M55 12l5 8h-10z'/%3E%3Cpath class='d' d='M95 10c3 0 5 2 5 5v6c0 3-2 5-5 5h-3l-4 3v-3h-1c-3 0-5-2-5-5v-6c0-3 2-5 5-5z'/%3E%3Ccircle class='d' cx='140' cy='18' r='8'/%3E%3Cpath class='d' d='M140 14v8M136 18h8'/%3E%3Cpath class='d' d='M175 10v16l4-4 4 4V10'/%3E%3Cpath class='d' d='M18 55a8 8 0 1 1 0 16 8 8 0 0 1 0-16'/%3E%3Cpath class='d' d='M18 60v4l2 2'/%3E%3Cpath class='d' d='M55 50h14v14H55zM59 54h6M59 58h4'/%3E%3Cpath class='d' d='M95 55l4-4 4 4-4 4z'/%3E%3Cpath class='d' d='M135 50l3 14h4l3-14'/%3E%3Cpath class='d' d='M178 50a5 5 0 0 0-10 0c0 6 10 10 10 16a5 5 0 0 1-10 0'/%3E%3Ccircle class='d' cx='18' cy='100' r='6'/%3E%3Cpath class='d' d='M14 100h8M18 96v8'/%3E%3Cpath class='d' d='M50 95h8l-2 10h-4z'/%3E%3Cpath class='d' d='M54 92h0'/%3E%3Cpath class='d' d='M88 95h14M88 100h10M88 105h12'/%3E%3Cpath class='d' d='M138 92l-6 8h12l-6 8'/%3E%3Cpath class='d' d='M170 95c0-3 4-3 4 0s-4 3-4 6 4 3 4 0'/%3E%3Cpath class='d' d='M15 140h10a3 3 0 0 1 0 6h-6v6'/%3E%3Cpath class='d' d='M50 138v12h12'/%3E%3Cpath class='d' d='M90 140h4v-4h4v4h4v4h-4v4h-4v-4h-4z'/%3E%3Ccircle class='d' cx='138' cy='145' r='7'/%3E%3Cpath class='d' d='M134 149l-2 3M142 149l2 3M138 152v3'/%3E%3Cpath class='d' d='M172 138l8 6-8 6'/%3E%3Cpath class='d' d='M12 180h16M12 185h12M12 190h14'/%3E%3Ccircle class='d' cx='55' cy='185' r='5'/%3E%3Cpath class='d' d='M53 183l4 4M57 183l-4 4'/%3E%3Cpath class='d' d='M88 178v12l6-3 6 3v-12'/%3E%3Cpath class='d' d='M130 180h12v8h-12z'/%3E%3Ccircle class='d' cx='136' cy='184' r='1.5'/%3E%3Cpath class='d' d='M170 180a5 5 0 0 1 10 0v8a5 5 0 0 1-10 0z'/%3E%3C/svg%3E")`;
