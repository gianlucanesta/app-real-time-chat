import { useState, useEffect, useCallback } from "react";
import {
  Bell,
  MessageSquare,
  Users,
  Activity,
  Phone,
  ChevronRight,
} from "lucide-react";
import { Select } from "../ui/select";
import { Label } from "../ui/label";
import { useSettings } from "../../contexts/SettingsContext";

// ── Toggle switch ───────────────────────────────────────────────────────
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

// ── Banner / Badge option lists ─────────────────────────────────────────
const BANNER_OPTIONS = [
  { value: "always", label: "Always" },
  { value: "when-inactive", label: "When app is inactive" },
  { value: "never", label: "Never" },
];

const BADGE_OPTIONS = [
  { value: "always", label: "Always" },
  { value: "when-inactive", label: "When app is inactive" },
  { value: "never", label: "Never" },
];

// ── Category row ────────────────────────────────────────────────────────
type CategoryId = "messages" | "groups" | "status" | "calls";

/** Maps CategoryId → the corresponding key in UserSettings. */
const CATEGORY_SETTINGS_KEY: Record<CategoryId, "notifMessages" | "notifGroups" | "notifStatus" | "notifCalls"> = {
  messages: "notifMessages",
  groups: "notifGroups",
  status: "notifStatus",
  calls: "notifCalls",
};

interface CategoryConfig {
  id: CategoryId;
  icon: typeof MessageSquare;
  label: string;
}

const CATEGORIES: CategoryConfig[] = [
  { id: "messages", icon: MessageSquare, label: "Messages" },
  { id: "groups", icon: Users, label: "Groups" },
  { id: "status", icon: Activity, label: "Status" },
  { id: "calls", icon: Phone, label: "Calls" },
];

// ── Main component ──────────────────────────────────────────────────────
export function NotificationSettings() {
  const { settings, updateSetting } = useSettings();

  const [permissionState, setPermissionState] =
    useState<NotificationPermission>("default");

  // ── Expand panel state (per-category advanced) ────────────────────────
  const [expandedCat, setExpandedCat] = useState<CategoryId | null>(null);

  // ── Check browser permission ──────────────────────────────────────────
  useEffect(() => {
    if ("Notification" in window) {
      setPermissionState(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) return;
    const result = await Notification.requestPermission();
    setPermissionState(result);
  }, []);

  // ── Permission banner ─────────────────────────────────────────────────
  if (permissionState === "denied") {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-text-secondary gap-3 px-8 text-center">
        <Bell className="w-10 h-10 opacity-30" />
        <p className="text-[15px] font-medium text-text-main">
          Notifications Blocked
        </p>
        <p className="text-[13px]">
          Browser notifications are blocked. Please allow notifications in your
          browser settings and reload the page.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0">
      {/* Permission prompt */}
      {permissionState === "default" && (
        <div className="flex items-center justify-between gap-4 px-4 py-3 mb-2 bg-accent/10 rounded-xl border border-accent/20">
          <div className="flex flex-col gap-0.5">
            <span className="text-[13px] font-medium text-text-main">
              Enable desktop notifications
            </span>
            <span className="text-[12px] text-text-secondary">
              Get notified about new messages and calls
            </span>
          </div>
          <button
            type="button"
            onClick={requestPermission}
            className="shrink-0 px-4 py-1.5 rounded-lg bg-accent text-white text-[13px] font-medium hover:bg-accent/90 transition-colors"
          >
            Allow
          </button>
        </div>
      )}

      {/* ── Banner mode ──────────────────────────────────────── */}
      <div className="flex flex-col gap-1.5 px-4 py-4 border-b border-border">
        <Label className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.6px]">
          Show Notification Banners
        </Label>
        <Select
          options={BANNER_OPTIONS}
          value={settings.notifBanner}
          onChange={(v) => updateSetting("notifBanner", v)}
          icon={<Bell className="w-[17px] h-[17px]" />}
        />
      </div>

      {/* ── Badge mode ───────────────────────────────────────── */}
      <div className="flex flex-col gap-1.5 px-4 py-4 border-b border-border">
        <Label className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.6px]">
          Show Notification Badge on App Bar
        </Label>
        <Select
          options={BADGE_OPTIONS}
          value={settings.notifBadge}
          onChange={(v) => updateSetting("notifBadge", v)}
          icon={<Bell className="w-[17px] h-[17px]" />}
        />
      </div>

      {/* ── Category toggles ─────────────────────────────────── */}
      <div className="flex flex-col border-b border-border">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const settingsKey = CATEGORY_SETTINGS_KEY[cat.id];
          const isOn = settings[settingsKey];
          const isExpanded = expandedCat === cat.id;

          return (
            <div key={cat.id}>
              <button
                type="button"
                onClick={() => setExpandedCat(isExpanded ? null : cat.id)}
                className="w-full flex items-center gap-3.5 px-4 py-3.5 hover:bg-input/50 transition-colors"
              >
                <Icon className="w-[18px] h-[18px] text-text-secondary shrink-0" />
                <div className="flex-1 text-left min-w-0">
                  <span className="block text-[14px] font-medium text-text-main">
                    {cat.label}
                  </span>
                  <span className="block text-[12px] text-text-secondary">
                    {isOn ? "On" : "Off"}
                  </span>
                </div>
                <ChevronRight
                  className={`w-4 h-4 text-text-secondary transition-transform ${
                    isExpanded ? "rotate-90" : ""
                  }`}
                />
              </button>

              {/* Expanded sub-panel */}
              {isExpanded && (
                <div className="px-4 pb-4 pl-12 flex flex-col gap-3 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] text-text-main">
                      Enable {cat.label.toLowerCase()} notifications
                    </span>
                    <Toggle
                      checked={isOn}
                      onChange={(v) => updateSetting(settingsKey, v)}
                      label={`Toggle ${cat.label} notifications`}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Show Previews toggle ─────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 px-4 py-4 border-b border-border">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-[14px] font-medium text-text-main">
            Show Previews
          </span>
          <span className="text-[12px] text-text-secondary">
            Show message text preview in notification banners.
          </span>
        </div>
        <Toggle
          checked={settings.notifPreview}
          onChange={(v) => updateSetting("notifPreview", v)}
          label="Show previews"
        />
      </div>

      {/* ── Send sound toggle ────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 px-4 py-4">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-[14px] font-medium text-text-main">
            Play Sound on Sent Messages
          </span>
          <span className="text-[12px] text-text-secondary">
            Play a sound when you send a message.
          </span>
        </div>
        <Toggle
          checked={settings.notifSendSound}
          onChange={(v) => updateSetting("notifSendSound", v)}
          label="Play sound on sent messages"
        />
      </div>
    </div>
  );
}
