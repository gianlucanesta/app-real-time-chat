import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { apiFetch, getAccessToken } from "../lib/api";

// ── Settings shape ──────────────────────────────────────────────────────

export interface UserSettings {
  theme: string;
  textSize: number;
  notifBanner: string;
  notifBadge: string;
  notifMessages: boolean;
  notifGroups: boolean;
  notifStatus: boolean;
  notifCalls: boolean;
  notifPreview: boolean;
  notifSendSound: boolean;
  cameraId: string;
  micId: string;
  speakerId: string;
  chatWallpaper: string;
  chatDoodles: boolean;
  mediaQuality: string;
  autoDownloadPhotos: boolean;
  autoDownloadAudio: boolean;
  autoDownloadVideo: boolean;
  autoDownloadDocs: boolean;
  spellCheck: boolean;
  emojiReplace: boolean;
  enterToSend: boolean;
  // Privacy
  privacyLastSeen: string;
  privacyOnline: string;
  privacyProfilePhoto: string;
  privacyInfo: string;
  privacyStatus: string;
  privacyReadReceipts: boolean;
  privacyDisappearing: string;
  privacyGroups: string;
  privacyBlockUnknown: boolean;
  privacyProtectIp: boolean;
  privacyDisableLinkPreviews: boolean;
}

const DEFAULTS: UserSettings = {
  theme: "dark",
  textSize: 100,
  notifBanner: "always",
  notifBadge: "always",
  notifMessages: true,
  notifGroups: true,
  notifStatus: true,
  notifCalls: true,
  notifPreview: true,
  notifSendSound: false,
  cameraId: "",
  micId: "",
  speakerId: "",
  chatWallpaper: "",
  chatDoodles: true,
  mediaQuality: "standard",
  autoDownloadPhotos: true,
  autoDownloadAudio: true,
  autoDownloadVideo: true,
  autoDownloadDocs: true,
  spellCheck: true,
  emojiReplace: true,
  enterToSend: true,
  // Privacy
  privacyLastSeen: "everyone",
  privacyOnline: "everyone",
  privacyProfilePhoto: "contacts",
  privacyInfo: "contacts",
  privacyStatus: "contacts",
  privacyReadReceipts: true,
  privacyDisappearing: "off",
  privacyGroups: "contacts_except",
  privacyBlockUnknown: true,
  privacyProtectIp: false,
  privacyDisableLinkPreviews: false,
};

// ── localStorage ↔ settings key mapping ─────────────────────────────────

const LS_MAP: Record<keyof UserSettings, string> = {
  theme: "ephemeral_theme",
  textSize: "ephemeral-text-size",
  notifBanner: "ephemeral-notif-banner",
  notifBadge: "ephemeral-notif-badge",
  notifMessages: "ephemeral-notif-messages",
  notifGroups: "ephemeral-notif-groups",
  notifStatus: "ephemeral-notif-status",
  notifCalls: "ephemeral-notif-calls",
  notifPreview: "ephemeral-notif-preview",
  notifSendSound: "ephemeral-notif-send-sound",
  cameraId: "ephemeral-camera-id",
  micId: "ephemeral-mic-id",
  speakerId: "ephemeral-speaker-id",
  chatWallpaper: "ephemeral-chat-wallpaper",
  chatDoodles: "ephemeral-chat-doodles",
  mediaQuality: "ephemeral-media-quality",
  autoDownloadPhotos: "ephemeral-auto-dl-photos",
  autoDownloadAudio: "ephemeral-auto-dl-audio",
  autoDownloadVideo: "ephemeral-auto-dl-video",
  autoDownloadDocs: "ephemeral-auto-dl-docs",
  spellCheck: "ephemeral-spell-check",
  emojiReplace: "ephemeral-emoji-replace",
  enterToSend: "ephemeral-enter-to-send",
  // Privacy
  privacyLastSeen: "ephemeral-privacy-last-seen",
  privacyOnline: "ephemeral-privacy-online",
  privacyProfilePhoto: "ephemeral-privacy-profile-photo",
  privacyInfo: "ephemeral-privacy-info",
  privacyStatus: "ephemeral-privacy-status",
  privacyReadReceipts: "ephemeral-privacy-read-receipts",
  privacyDisappearing: "ephemeral-privacy-disappearing",
  privacyGroups: "ephemeral-privacy-groups",
  privacyBlockUnknown: "ephemeral-privacy-block-unknown",
  privacyProtectIp: "ephemeral-privacy-protect-ip",
  privacyDisableLinkPreviews: "ephemeral-privacy-disable-link-previews",
};

/** Read all settings from localStorage, falling back to defaults. */
function readFromLocalStorage(): UserSettings {
  const s = { ...DEFAULTS };
  for (const [key, lsKey] of Object.entries(LS_MAP) as [keyof UserSettings, string][]) {
    const raw = localStorage.getItem(lsKey);
    if (raw === null) continue;
    const def = DEFAULTS[key];
    if (typeof def === "boolean") {
      (s as any)[key] = raw === "true";
    } else if (typeof def === "number") {
      (s as any)[key] = Number(raw) || def;
    } else {
      (s as any)[key] = raw;
    }
  }
  return s;
}

/** Write a single setting to localStorage. */
function writeToLocalStorage<K extends keyof UserSettings>(
  key: K,
  value: UserSettings[K],
) {
  localStorage.setItem(LS_MAP[key], String(value));
}

/** Write all settings to localStorage. */
function writeAllToLocalStorage(s: UserSettings) {
  for (const [key, lsKey] of Object.entries(LS_MAP) as [keyof UserSettings, string][]) {
    localStorage.setItem(lsKey, String(s[key]));
  }
}

// ── Context ─────────────────────────────────────────────────────────────

interface SettingsContextValue {
  settings: UserSettings;
  updateSetting: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void;
  updateSettings: (partial: Partial<UserSettings>) => void;
  isLoaded: boolean;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

// ── Provider ────────────────────────────────────────────────────────────

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<UserSettings>(readFromLocalStorage);
  const [isLoaded, setIsLoaded] = useState(false);
  const patchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPatchRef = useRef<Partial<UserSettings>>({});
  const isAuthenticatedRef = useRef(false);

  // Flush pending settings to API (debounced)
  const flushToApi = useCallback(() => {
    if (patchTimerRef.current) clearTimeout(patchTimerRef.current);
    patchTimerRef.current = setTimeout(async () => {
      const pending = { ...pendingPatchRef.current };
      pendingPatchRef.current = {};
      if (!Object.keys(pending).length) return;
      if (!getAccessToken()) return;
      try {
        await apiFetch("/users/me/settings", {
          method: "PATCH",
          body: JSON.stringify(pending),
        });
      } catch {
        // Silently fail — localStorage is the fallback
      }
    }, 500);
  }, []);

  // Load settings from API when user authenticates
  const loadFromApi = useCallback(async () => {
    try {
      const data = await apiFetch<{ settings: Record<string, unknown> }>(
        "/users/me/settings",
      );
      if (data.settings && Object.keys(data.settings).length > 0) {
        // Merge API settings over local defaults
        const merged = { ...readFromLocalStorage() };
        for (const [key, value] of Object.entries(data.settings)) {
          if (key in DEFAULTS) {
            (merged as any)[key] = value;
          }
        }
        setSettings(merged);
        writeAllToLocalStorage(merged);
        // Notify cross-component consumers (ThemeContext, useChatSettings)
        window.dispatchEvent(new CustomEvent("settings-loaded"));
        window.dispatchEvent(new CustomEvent("chat-settings-changed"));
      }
      setIsLoaded(true);
    } catch {
      setIsLoaded(true);
    }
  }, []);

  // Watch for auth state changes
  useEffect(() => {
    const checkAuth = () => {
      const hasToken = !!getAccessToken();
      if (hasToken && !isAuthenticatedRef.current) {
        isAuthenticatedRef.current = true;
        loadFromApi();
      } else if (!hasToken && isAuthenticatedRef.current) {
        isAuthenticatedRef.current = false;
        setIsLoaded(false);
      }
    };
    checkAuth();
    // Re-check periodically is not needed; we rely on events
    // Listen for login/logout cookie changes
    const interval = setInterval(checkAuth, 2000);
    return () => clearInterval(interval);
  }, [loadFromApi]);

  const updateSetting = useCallback(
    <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
      setSettings((prev) => {
        if (prev[key] === value) return prev;
        const next = { ...prev, [key]: value };
        writeToLocalStorage(key, value);
        // Queue for API patch
        pendingPatchRef.current[key] = value as any;
        flushToApi();
        return next;
      });
    },
    [flushToApi],
  );

  const updateSettingsBatch = useCallback(
    (partial: Partial<UserSettings>) => {
      setSettings((prev) => {
        const next = { ...prev, ...partial };
        for (const [key, value] of Object.entries(partial) as [keyof UserSettings, any][]) {
          writeToLocalStorage(key, value);
          pendingPatchRef.current[key] = value;
        }
        flushToApi();
        return next;
      });
    },
    [flushToApi],
  );

  return (
    <SettingsContext.Provider
      value={{ settings, updateSetting, updateSettings: updateSettingsBatch, isLoaded }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
