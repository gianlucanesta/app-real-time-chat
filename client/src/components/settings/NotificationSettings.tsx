import { useState, useEffect, useCallback } from "react";
import {
  Bell,
  MessageSquare,
  Users,
  Activity,
  Phone,
  ChevronRight,
  ChevronLeft,
  Play,
} from "lucide-react";
import { Select } from "../ui/select";
import { Label } from "../ui/label";
import { useSettings } from "../../contexts/SettingsContext";
import { TONE_OPTIONS, previewTone } from "../../lib/notificationTones";

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
        checked ? "bg-accent" : "bg-[var(--color-border)]"
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

// ── Category config ─────────────────────────────────────────────────────
type CategoryId = "messages" | "groups" | "status" | "calls";

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

// ── Row component shared across sub-screens ─────────────────────────────
function SettingRow({
  label,
  description,
  children,
  border = true,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
  border?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-4 px-4 py-4 ${
        border ? "border-b border-border" : ""
      }`}
    >
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-[14px] font-medium text-text-main">{label}</span>
        {description && (
          <span className="text-[12px] text-text-secondary">{description}</span>
        )}
      </div>
      {children}
    </div>
  );
}

// ── Sub-screen: Messages / Groups / Status ──────────────────────────────
function CategorySubScreen({
  cat,
  onBack,
}: {
  cat: CategoryConfig;
  onBack: () => void;
}) {
  const { settings, updateSetting } = useSettings();

  type OnKey = "notifMessages" | "notifGroups" | "notifStatus";
  type ReactKey =
    | "notifMessagesReactions"
    | "notifGroupsReactions"
    | "notifStatusReactions";
  type ToneKey = "notifMessagesTone" | "notifGroupsTone" | "notifStatusTone";

  const onKey = `notif${cat.label}` as OnKey;
  const reactKey = `notif${cat.label}Reactions` as ReactKey;
  const toneKey = `notif${cat.label}Tone` as ToneKey;

  const isOn = settings[onKey];
  const hasReactions = settings[reactKey];
  const tone = settings[toneKey];

  return (
    <div className="flex flex-col animate-in slide-in-from-right-4 duration-200">
      {/* Sub-screen header */}
      <div className="flex items-center gap-2 px-2 py-3 border-b border-border">
        <button
          type="button"
          onClick={onBack}
          className="w-9 h-9 rounded-full flex items-center justify-center text-text-secondary hover:text-text-main hover:bg-input transition-colors"
          aria-label="Back"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-[15px] font-semibold text-text-main">
          {cat.label}
        </span>
      </div>

      <SettingRow label="Show notifications">
        <Toggle
          checked={isOn}
          onChange={(v) => updateSetting(onKey, v)}
          label={`Toggle ${cat.label} notifications`}
        />
      </SettingRow>

      <SettingRow label="Show reaction notifications">
        <Toggle
          checked={hasReactions}
          onChange={(v) => updateSetting(reactKey, v)}
          label={`Toggle ${cat.label} reaction notifications`}
        />
      </SettingRow>

      {/* Tone select */}
      <div className="flex flex-col gap-2 px-4 py-4">
        <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.6px]">
          Notification tone
        </span>
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <Select
              options={TONE_OPTIONS}
              value={tone}
              onChange={(v) => {
                updateSetting(toneKey, v);
                previewTone(v);
              }}
              icon={
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-[17px] h-[17px]"
                >
                  <path d="M9 18V5l12-2v13" />
                  <circle cx="6" cy="18" r="3" />
                  <circle cx="18" cy="16" r="3" />
                </svg>
              }
            />
          </div>
          <button
            type="button"
            aria-label="Preview tone"
            onClick={() => previewTone(tone)}
            className="w-9 h-9 rounded-full flex items-center justify-center text-accent border border-accent/30 hover:bg-accent/10 transition-colors shrink-0"
          >
            <Play className="w-4 h-4 fill-accent" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Sub-screen: Calls ───────────────────────────────────────────────────
function CallsSubScreen({ onBack }: { onBack: () => void }) {
  const { settings, updateSetting } = useSettings();

  return (
    <div className="flex flex-col animate-in slide-in-from-right-4 duration-200">
      <div className="flex items-center gap-2 px-2 py-3 border-b border-border">
        <button
          type="button"
          onClick={onBack}
          className="w-9 h-9 rounded-full flex items-center justify-center text-text-secondary hover:text-text-main hover:bg-input transition-colors"
          aria-label="Back"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-[15px] font-semibold text-text-main">Calls</span>
      </div>

      <SettingRow label="Show notifications for incoming calls">
        <Toggle
          checked={settings.notifCallsIncoming}
          onChange={(v) => updateSetting("notifCallsIncoming", v)}
          label="Toggle incoming call notifications"
        />
      </SettingRow>

      <SettingRow label="Play sounds for incoming calls" border={false}>
        <Toggle
          checked={settings.notifCallsSound}
          onChange={(v) => updateSetting("notifCallsSound", v)}
          label="Toggle incoming call sounds"
        />
      </SettingRow>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────
export function NotificationSettings() {
  const { settings, updateSetting } = useSettings();

  const [permissionState, setPermissionState] =
    useState<NotificationPermission>("default");

  // null = main screen, else = open sub-screen
  const [activeSubScreen, setActiveSubScreen] = useState<CategoryId | null>(
    null,
  );

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

  // ── Sub-screen routing ────────────────────────────────────────────────
  if (activeSubScreen === "calls") {
    return <CallsSubScreen onBack={() => setActiveSubScreen(null)} />;
  }
  if (activeSubScreen) {
    const cat = CATEGORIES.find((c) => c.id === activeSubScreen)!;
    return (
      <CategorySubScreen cat={cat} onBack={() => setActiveSubScreen(null)} />
    );
  }

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

  // ── Category status label ─────────────────────────────────────────────
  const catStatus = (id: CategoryId): string => {
    const map: Record<CategoryId, keyof typeof settings> = {
      messages: "notifMessages",
      groups: "notifGroups",
      status: "notifStatus",
      calls: "notifCalls",
    };
    return settings[map[id]] ? "On" : "Off";
  };

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

      {/* ── Category rows → navigate to sub-screen ───────────── */}
      <div className="flex flex-col border-b border-border">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveSubScreen(cat.id)}
              className="w-full flex items-center gap-3.5 px-4 py-3.5 hover:bg-input/50 transition-colors"
            >
              <Icon className="w-[18px] h-[18px] text-text-secondary shrink-0" />
              <div className="flex-1 text-left min-w-0">
                <span className="block text-[14px] font-medium text-text-main">
                  {cat.label}
                </span>
                <span className="block text-[12px] text-text-secondary">
                  {catStatus(cat.id)}
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-text-secondary shrink-0" />
            </button>
          );
        })}
      </div>

      {/* ── Show Previews toggle ─────────────────────────────── */}
      <SettingRow
        label="Show Previews"
        description="Show message text preview in notification banners."
      >
        <Toggle
          checked={settings.notifPreview}
          onChange={(v) => updateSetting("notifPreview", v)}
          label="Show previews"
        />
      </SettingRow>

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
