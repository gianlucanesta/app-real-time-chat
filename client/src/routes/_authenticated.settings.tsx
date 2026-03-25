import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useCallback, useEffect } from "react";
import {
  Grid,
  User,
  Bell,
  Shield,
  Lock,
  LogOut,
  Camera,
  Mail,
  Phone,
  Briefcase,
  HelpCircle,
  Search,
  Keyboard,
  ChevronRight,
  ChevronLeft,
  MessageSquare,
  Globe,
  Type,
  Eye,
  ImageUp,
  Trash2,
  Check,
  Loader2,
  Video,
  X,
} from "lucide-react";
import { useClickOutside } from "../hooks/useClickOutside";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { useSettings } from "../contexts/SettingsContext";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select } from "../components/ui/select";
import { apiFetch, normalizeUser, getAccessToken } from "../lib/api";
import { VideoVoiceSettings } from "../components/settings/VideoVoiceSettings";
import { NotificationSettings } from "../components/settings/NotificationSettings";
import { ChatSettings } from "../components/settings/ChatSettings";
import { PrivacySettings } from "../components/settings/PrivacySettings";
import type { User as UserType } from "../types";

const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "it", label: "Italiano \u2014 coming soon", disabled: true },
  { value: "es", label: "Espa\u00f1ol \u2014 coming soon", disabled: true },
  { value: "fr", label: "Fran\u00e7ais \u2014 coming soon", disabled: true },
  { value: "de", label: "Deutsch \u2014 coming soon", disabled: true },
];

const TEXT_SIZE_OPTIONS = [
  { value: "75", label: "75%" },
  { value: "90", label: "90%" },
  { value: "100", label: "100% (default)" },
  { value: "110", label: "110%" },
  { value: "125", label: "125%" },
  { value: "150", label: "150%" },
];

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsRoot,
  validateSearch: (search: Record<string, unknown>) => ({
    section: typeof search.section === "string" ? search.section : undefined,
  }),
});

// Settings nav items
const NAV_ITEMS = [
  {
    id: "general",
    icon: Grid,
    label: "General",
    description: "Startup and shutdown",
  },
  {
    id: "profile",
    icon: User,
    label: "Profile",
    description: "Name, profile picture, username",
  },
  {
    id: "account",
    icon: Lock,
    label: "Account",
    description: "Security notifications, account info",
  },
  {
    id: "privacy",
    icon: Shield,
    label: "Privacy",
    description: "Blocked contacts, disappearing messages",
  },
  {
    id: "chat",
    icon: MessageSquare,
    label: "Chat",
    description: "Theme, wallpapers, chat settings",
  },
  {
    id: "video",
    icon: Video,
    label: "Video & Voice",
    description: "Camera, microphone and speakers",
  },
  {
    id: "notifications",
    icon: Bell,
    label: "Notifications",
    description: "Messages, groups, sounds",
  },
  {
    id: "keyboard",
    icon: Keyboard,
    label: "Keyboard Shortcuts",
    description: "Quick actions",
  },
  {
    id: "help",
    icon: HelpCircle,
    label: "Help & Feedback",
    description: "Help center, contact us, privacy policy",
  },
];

function SettingsPage() {
  const { section: initialSection } = Route.useSearch();
  const { user, updateUser, logout } = useAuth();
  useTheme();
  const navigate = useNavigate();

  // Mobile: null = hub, string = active section
  const [mobileSection, setMobileSection] = useState<string | null>(
    initialSection ?? null,
  );
  const [navSearch, setNavSearch] = useState("");

  // Text size from settings context
  const { settings, updateSetting } = useSettings();
  const textSize = settings.textSize;
  const setTextSize = useCallback(
    (v: number) => {
      updateSetting("textSize", v);
      document.documentElement.style.fontSize = `${v}%`;
    },
    [updateSetting],
  );

  useEffect(() => {
    document.documentElement.style.fontSize = `${textSize}%`;
  }, [textSize]);

  // Profile form state
  const [firstName] = useState(user?.firstName || "");
  const [lastName] = useState(user?.lastName || "");
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [role, setRole] = useState(user?.role || "");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const initialValuesRef = useRef({
    displayName: user?.displayName || "",
    phone: user?.phone || "",
    role: user?.role || "",
  });
  const avatarMenuRef = useClickOutside<HTMLDivElement>(
    useCallback(() => setAvatarMenuOpen(false), []),
  );

  const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3001/api";

  const initials =
    user?.displayName
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase() || "U";
  const avatarGradient =
    user?.avatarGradient || "linear-gradient(135deg, #6366f1, #a855f7)";

  const handleLogout = () => {
    logout();
    navigate({ to: "/login" });
  };

  const handleAvatarUpload = async (file: File) => {
    if (!user) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const token = getAccessToken();
      const res = await fetch(`${API_BASE}/upload`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json();
      const data = await apiFetch<{ user: UserType }>(`/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({ avatarUrl: url }),
      });
      updateUser(normalizeUser(data.user as any));
      setAvatarPreview(null);
    } catch (err) {
      console.error("Avatar upload failed:", err);
    }
  };

  const handleAvatarRemove = async () => {
    if (!user) return;
    try {
      const currentUrl = user.avatarUrl;
      if (currentUrl) {
        const token = getAccessToken();
        await fetch(`${API_BASE}/upload`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ url: currentUrl }),
        }).catch(() => {});
      }
      const data = await apiFetch<{ user: UserType }>(`/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({ avatarUrl: "" }),
      });
      updateUser(normalizeUser(data.user as any));
      setAvatarPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      console.error("Avatar remove failed:", err);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleAvatarUpload(file);
  };

  const handleCameraOpen = async () => {
    setCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setCameraOpen(false);
    }
  };

  const handleCameraCapture = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob)
          handleAvatarUpload(
            new File([blob], "camera-photo.jpg", { type: "image/jpeg" }),
          );
      },
      "image/jpeg",
      0.9,
    );
    handleCameraClose();
  };

  const handleCameraClose = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOpen(false);
  };

  // Auto-save profile fields with debounce
  useEffect(() => {
    const {
      displayName: initDN,
      phone: initPh,
      role: initR,
    } = initialValuesRef.current;
    if (displayName === initDN && phone === initPh && role === initR) return;

    clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      if (!user) return;
      setAutoSaveStatus("saving");
      try {
        const data = await apiFetch<{ user: UserType }>(`/users/${user.id}`, {
          method: "PATCH",
          body: JSON.stringify({ displayName, phone, role }),
        });
        updateUser(normalizeUser(data.user as any));
        initialValuesRef.current = { displayName, phone, role };
        setAutoSaveStatus("saved");
        setTimeout(() => setAutoSaveStatus("idle"), 2500);
      } catch {
        setAutoSaveStatus("error");
        setTimeout(() => setAutoSaveStatus("idle"), 3500);
      }
    }, 800);
    return () => clearTimeout(saveTimeoutRef.current);
  }, [displayName, phone, role]);

  // ── Shared: General section content ──────────────────────────────────────
  function GeneralSection() {
    return (
      <div className="flex flex-col gap-5 px-4 py-5">
        {/* Language */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.6px]">
            Language
          </Label>
          <Select
            options={LANGUAGE_OPTIONS}
            value="en"
            onChange={() => {}}
            icon={<Globe className="w-[17px] h-[17px]" />}
          />
        </div>

        {/* Text Size */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.6px]">
            Text Size
          </Label>
          <Select
            options={TEXT_SIZE_OPTIONS}
            value={String(textSize)}
            onChange={(v) => setTextSize(Number(v))}
            icon={<Type className="w-[17px] h-[17px]" />}
          />
        </div>
      </div>
    );
  }

  // ── Shared: Account section content ──────────────────────────────────────
  function AccountSection() {
    const currentAvatar = avatarPreview || user?.avatarUrl;
    return (
      <div className="flex flex-col">
        {/* Avatar */}
        <div className="flex flex-col items-center pt-8 pb-6">
          <div className="relative" ref={avatarMenuRef}>
            {currentAvatar ? (
              <img
                src={currentAvatar}
                alt="Avatar"
                className="w-28 h-28 rounded-full object-cover border-2 border-border"
              />
            ) : (
              <div
                className="w-28 h-28 rounded-full flex items-center justify-center font-bold text-[32px] text-white border-2 border-border"
                style={{ background: avatarGradient }}
              >
                {initials}
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => {
                handleAvatarChange(e);
                setAvatarMenuOpen(false);
              }}
              className="hidden"
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="user"
              onChange={(e) => {
                handleAvatarChange(e);
                setAvatarMenuOpen(false);
              }}
              className="hidden"
            />
            <button
              onClick={() => setAvatarMenuOpen((v) => !v)}
              className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-accent text-white text-[12px] font-medium shadow-md hover:bg-accent/90 transition-colors z-10"
            >
              <Camera className="w-3.5 h-3.5" />
              Edit
            </button>

            {/* Dropdown menu */}
            {avatarMenuOpen && (
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-5 w-52 bg-card rounded-xl border border-border shadow-lg z-50 overflow-hidden">
                <button
                  onClick={() => {
                    if (currentAvatar) setViewerOpen(true);
                    setAvatarMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-[13px] hover:bg-input/60 transition-colors ${currentAvatar ? "text-text-main" : "text-text-secondary/50 cursor-not-allowed"}`}
                  disabled={!currentAvatar}
                >
                  <Eye className="w-4 h-4 text-text-secondary" />
                  Visualize Image
                </button>
                <button
                  onClick={() => {
                    handleCameraOpen();
                    setAvatarMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-[13px] text-text-main hover:bg-input/60 transition-colors"
                >
                  <Video className="w-4 h-4 text-text-secondary" />
                  Take a Photo
                </button>
                <button
                  onClick={() => {
                    fileInputRef.current?.click();
                    setAvatarMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-[13px] text-text-main hover:bg-input/60 transition-colors"
                >
                  <ImageUp className="w-4 h-4 text-text-secondary" />
                  Upload Image
                </button>
                <button
                  onClick={() => {
                    if (currentAvatar) handleAvatarRemove();
                    setAvatarMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-[13px] hover:bg-input/60 transition-colors ${currentAvatar ? "text-text-main" : "text-text-secondary/50 cursor-not-allowed"}`}
                  disabled={!currentAvatar}
                >
                  <Trash2 className="w-4 h-4 text-text-secondary" />
                  Delete Image
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-border" />

        {/* Form */}
        <div className="flex flex-col gap-4 px-4 py-5">
          {/* First Name (read-only, derived) */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.6px]">
              First Name
            </Label>
            <Input
              value={firstName}
              readOnly
              disabled
              icon={<User className="w-[17px] h-[17px] text-text-secondary" />}
              className="h-11 bg-input/40 border-border/40 opacity-70 cursor-not-allowed text-[14px]"
            />
          </div>
          {/* Last Name (read-only, derived) */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.6px]">
              Last Name
            </Label>
            <Input
              value={lastName}
              readOnly
              disabled
              icon={<User className="w-[17px] h-[17px] text-text-secondary" />}
              className="h-11 bg-input/40 border-border/40 opacity-70 cursor-not-allowed text-[14px]"
            />
          </div>
          {/* Display Name */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.6px]">
              Display Name
            </Label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              icon={<User className="w-[17px] h-[17px] text-text-secondary" />}
              className="h-11 bg-input/60 border-border/50 text-[14px]"
            />
          </div>
          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.6px]">
              Email
            </Label>
            <Input
              type="email"
              value={user?.email || ""}
              readOnly
              disabled
              icon={<Mail className="w-[17px] h-[17px] text-text-secondary" />}
              className="h-11 bg-input/40 border-border/40 opacity-70 cursor-not-allowed text-[14px]"
            />
          </div>
          {/* Phone */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.6px]">
              Phone
            </Label>
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              icon={<Phone className="w-[17px] h-[17px] text-text-secondary" />}
              className="h-11 bg-input/60 border-border/50 text-[14px]"
            />
          </div>
          {/* Role */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.6px]">
              Role
            </Label>
            <Input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              icon={
                <Briefcase className="w-[17px] h-[17px] text-text-secondary" />
              }
              className="h-11 bg-input/60 border-border/50 text-[14px]"
            />
          </div>

          {/* Auto-save status */}
          <div className="h-8 flex items-center justify-center">
            {autoSaveStatus === "saving" && (
              <div className="flex items-center gap-2 text-[13px] text-text-secondary animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </div>
            )}
            {autoSaveStatus === "saved" && (
              <div className="flex items-center gap-2 text-[13px] text-success animate-in fade-in duration-300">
                <Check className="w-4 h-4" />
                <span>Changes saved</span>
              </div>
            )}
            {autoSaveStatus === "error" && (
              <div className="flex items-center gap-2 text-[13px] text-danger animate-in fade-in duration-300">
                <HelpCircle className="w-4 h-4" />
                <span>Failed to save changes</span>
              </div>
            )}
          </div>
        </div>

        {/* Fullscreen image viewer */}
        {viewerOpen && currentAvatar && (
          <div
            className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
            onClick={() => setViewerOpen(false)}
          >
            <button
              className="absolute top-5 right-5 text-white/70 hover:text-white transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setViewerOpen(false);
              }}
            >
              <X className="w-7 h-7" />
            </button>
            <img
              src={currentAvatar}
              alt="Avatar preview"
              className="max-w-[85vw] max-h-[85vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}

        {/* Camera capture overlay */}
        {cameraOpen && (
          <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center gap-6">
            <button
              className="absolute top-5 right-5 text-white/70 hover:text-white transition-colors"
              onClick={handleCameraClose}
            >
              <X className="w-7 h-7" />
            </button>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-[85vw] max-w-md aspect-square object-cover rounded-2xl"
            />
            <button
              onClick={handleCameraCapture}
              className="w-16 h-16 rounded-full bg-white border-4 border-white/30 hover:bg-white/90 transition-colors"
              aria-label="Capture photo"
            />
          </div>
        )}
      </div>
    );
  }

  // ── Stub section for unimplemented items ──────────────────────────────────
  function StubSection({ label }: { label: string }) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-text-secondary gap-3 px-8 text-center">
        <Lock className="w-10 h-10 opacity-30" />
        <p className="text-[15px] font-medium text-text-main">{label}</p>
        <p className="text-[13px]">This section is coming soon.</p>
      </div>
    );
  }

  function renderSectionContent(id: string) {
    if (id === "general") return <GeneralSection />;
    if (id === "profile") return <AccountSection />;
    if (id === "chat") return <ChatSettings />;
    if (id === "video") return <VideoVoiceSettings />;
    if (id === "notifications") return <NotificationSettings />;
    if (id === "privacy") return <PrivacySettings />;
    const item = NAV_ITEMS.find((n) => n.id === id);
    return <StubSection label={item?.label || id} />;
  }

  // Filtered nav items for search
  const filteredNav = NAV_ITEMS.filter((item) =>
    item.label.toLowerCase().includes(navSearch.toLowerCase()),
  );

  // ── MOBILE RENDER ─────────────────────────────────────────────────────────
  // Hub
  if (mobileSection === null) {
    return (
      <div className="md:hidden flex flex-col h-full bg-bg text-text-main overflow-y-auto">
        {/* Avatar hero */}
        <div className="flex flex-col items-center pt-10 pb-6 px-4">
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt="Profile"
              className="w-20 h-20 rounded-full object-cover shadow-lg"
            />
          ) : (
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center font-bold text-[26px] text-white shadow-lg"
              style={{ background: avatarGradient }}
            >
              {initials}
            </div>
          )}
        </div>

        {/* Search */}
        <div className="px-4 pb-4">
          <div className="relative">
            <Search className="w-4 h-4 text-text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search settings"
              value={navSearch}
              onChange={(e) => setNavSearch(e.target.value)}
              className="w-full h-10 pl-9 pr-3 rounded-xl bg-input border border-border text-[13px] text-text-main placeholder:text-text-secondary focus:outline-none focus:border-accent transition-colors"
            />
          </div>
        </div>

        {/* Nav list card */}
        <div className="px-4 pb-4">
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            {filteredNav.map((item, i) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setMobileSection(item.id)}
                  className={`w-full flex items-center gap-3.5 px-4 py-4 text-left transition-colors hover:bg-input/60 active:bg-input ${i < filteredNav.length - 1 ? "border-b border-border" : ""}`}
                >
                  <Icon className="w-[18px] h-[18px] text-text-secondary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="block text-[14px] font-medium text-text-main">
                      {item.label}
                    </span>
                    <span className="block text-[12px] text-text-secondary truncate">
                      {item.description}
                    </span>
                  </div>
                  {item.badge && (
                    <span className="w-1.5 h-1.5 rounded-full bg-danger mr-1" />
                  )}
                  <ChevronRight className="w-4 h-4 text-text-secondary" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Logout */}
        <div className="px-4 pb-8">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 h-12 rounded-2xl bg-card border border-border text-danger font-medium text-[14px] hover:bg-danger/5 active:bg-danger/10 transition-colors"
          >
            <LogOut className="w-[17px] h-[17px]" />
            Logout
          </button>
        </div>
      </div>
    );
  }

  // Mobile section view (with back button)
  const currentNavItem = NAV_ITEMS.find((n) => n.id === mobileSection);
  return (
    <div className="md:hidden flex flex-col h-full bg-bg text-text-main overflow-y-auto">
      {/* Section header */}
      <div className="flex items-center gap-3 px-4 h-14 shrink-0 border-b border-border bg-card">
        <button
          onClick={() => setMobileSection(null)}
          className="flex items-center gap-1 text-accent text-[14px] font-medium"
          aria-label="Back"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>{currentNavItem?.label}</span>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {renderSectionContent(mobileSection)}
      </div>
    </div>
  );
}

// ── Desktop wrapper — renders only on md+ screens ─────────────────────────
// We need a separate component to avoid React hook ordering issues
function SettingsPageDesktop() {
  const { section: initialSection } = Route.useSearch();
  const { user, updateUser, logout } = useAuth();
  useTheme();
  const navigate = useNavigate();

  const [desktopSection, setDesktopSection] = useState<string>(
    initialSection ?? "general",
  );
  const [navSearch, setNavSearch] = useState("");

  // Text size from settings context
  const { settings, updateSetting } = useSettings();
  const textSize = settings.textSize;
  const setTextSize = useCallback(
    (v: number) => {
      updateSetting("textSize", v);
      document.documentElement.style.fontSize = `${v}%`;
    },
    [updateSetting],
  );

  useEffect(() => {
    document.documentElement.style.fontSize = `${textSize}%`;
  }, [textSize]);

  const nameParts = (user?.displayName || "").split(" ");
  const [firstName] = useState(nameParts[0] || "");
  const [lastName] = useState(nameParts.slice(1).join(" ") || "");
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [role, setRole] = useState(user?.role || "");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const initialValuesRef = useRef({
    displayName: user?.displayName || "",
    phone: user?.phone || "",
    role: user?.role || "",
  });
  const avatarMenuRef = useClickOutside<HTMLDivElement>(
    useCallback(() => setAvatarMenuOpen(false), []),
  );

  const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3001/api";

  const initials =
    user?.displayName
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase() || "U";
  const avatarGradient =
    user?.avatarGradient || "linear-gradient(135deg, #6366f1, #a855f7)";

  const handleLogout = () => {
    logout();
    navigate({ to: "/login" });
  };

  const handleAvatarUpload = async (file: File) => {
    if (!user) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const token = getAccessToken();
      const res = await fetch(`${API_BASE}/upload`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json();
      const data = await apiFetch<{ user: UserType }>(`/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({ avatarUrl: url }),
      });
      updateUser(normalizeUser(data.user as any));
      setAvatarPreview(null);
    } catch (err) {
      console.error("Avatar upload failed:", err);
    }
  };

  const handleAvatarRemove = async () => {
    if (!user) return;
    try {
      const currentUrl = user.avatarUrl;
      if (currentUrl) {
        const token = getAccessToken();
        await fetch(`${API_BASE}/upload`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ url: currentUrl }),
        }).catch(() => {});
      }
      const data = await apiFetch<{ user: UserType }>(`/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({ avatarUrl: "" }),
      });
      updateUser(normalizeUser(data.user as any));
      setAvatarPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      console.error("Avatar remove failed:", err);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleAvatarUpload(file);
  };

  const handleCameraOpen = async () => {
    setCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setCameraOpen(false);
    }
  };

  const handleCameraCapture = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob)
          handleAvatarUpload(
            new File([blob], "camera-photo.jpg", { type: "image/jpeg" }),
          );
      },
      "image/jpeg",
      0.9,
    );
    handleCameraClose();
  };

  const handleCameraClose = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOpen(false);
  };

  // Auto-save profile fields with debounce
  useEffect(() => {
    const {
      displayName: initDN,
      phone: initPh,
      role: initR,
    } = initialValuesRef.current;
    if (displayName === initDN && phone === initPh && role === initR) return;

    clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      if (!user) return;
      setAutoSaveStatus("saving");
      try {
        const data = await apiFetch<{ user: UserType }>(`/users/${user.id}`, {
          method: "PATCH",
          body: JSON.stringify({ displayName, phone, role }),
        });
        updateUser(normalizeUser(data.user as any));
        initialValuesRef.current = { displayName, phone, role };
        setAutoSaveStatus("saved");
        setTimeout(() => setAutoSaveStatus("idle"), 2500);
      } catch {
        setAutoSaveStatus("error");
        setTimeout(() => setAutoSaveStatus("idle"), 3500);
      }
    }, 800);
    return () => clearTimeout(saveTimeoutRef.current);
  }, [displayName, phone, role]);

  const filteredNav = NAV_ITEMS.filter((item) =>
    item.label.toLowerCase().includes(navSearch.toLowerCase()),
  );

  return (
    <div className="hidden md:flex h-full bg-bg text-text-main overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="w-[var(--width-sidebar)] min-w-[var(--width-sidebar)] bg-card border-r border-border flex flex-col shrink-0">
        <div className="p-5 border-b border-border">
          <div className="relative">
            <Search className="w-4 h-4 text-text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search settings"
              value={navSearch}
              onChange={(e) => setNavSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-xl bg-input border border-border text-[13px] text-text-main placeholder:text-text-secondary focus:outline-none focus:border-accent transition-colors"
            />
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 flex flex-col gap-0.5">
          {filteredNav.map((item) => {
            const Icon = item.icon;
            const active = desktopSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setDesktopSection(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13.5px] font-medium transition-colors relative ${
                  active
                    ? "bg-accent/10 text-accent"
                    : "text-text-secondary hover:bg-input hover:text-text-main"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <div className="flex-1 text-left min-w-0">
                  <span className="block">{item.label}</span>
                  <span
                    className={`block text-[11px] font-normal truncate ${
                      active ? "text-accent/70" : "text-text-secondary/70"
                    }`}
                  >
                    {item.description}
                  </span>
                </div>
                {item.badge && (
                  <span className="w-1.5 h-1.5 rounded-full bg-danger" />
                )}
                <ChevronRight className="w-3.5 h-3.5 opacity-50" />
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 h-10 rounded-lg text-danger text-[13px] font-medium hover:bg-danger/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Desktop main */}
      <main className="flex-1 min-w-0 overflow-y-auto px-10 py-8">
        <div className="max-w-[640px] mx-auto">
          {desktopSection === "general" ? (
            <>
              <h1 className="text-[22px] font-bold text-text-main mb-6">
                General
              </h1>

              <div className="grid grid-cols-2 gap-5">
                {/* Language */}
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.6px]">
                    Language
                  </Label>
                  <Select
                    options={LANGUAGE_OPTIONS}
                    value="en"
                    onChange={() => {}}
                    icon={<Globe className="w-[17px] h-[17px]" />}
                  />
                </div>

                {/* Text Size */}
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.6px]">
                    Text Size
                  </Label>
                  <Select
                    options={TEXT_SIZE_OPTIONS}
                    value={String(textSize)}
                    onChange={(v) => setTextSize(Number(v))}
                    icon={<Type className="w-[17px] h-[17px]" />}
                  />
                </div>
              </div>
            </>
          ) : desktopSection === "profile" ? (
            (() => {
              const currentAvatar = avatarPreview || user?.avatarUrl;
              return (
                <>
                  <h1 className="text-[22px] font-bold text-text-main mb-6">
                    Profile
                  </h1>

                  {/* Profile card */}
                  <div className="bg-card rounded-2xl border border-border p-8 flex flex-col items-center mb-8 relative">
                    <div className="relative" ref={avatarMenuRef}>
                      {avatarPreview || user?.avatarUrl ? (
                        <img
                          src={avatarPreview || user?.avatarUrl || undefined}
                          alt="Avatar"
                          className="w-28 h-28 rounded-full object-cover border-2 border-border"
                        />
                      ) : (
                        <div
                          className="w-28 h-28 rounded-full flex items-center justify-center font-bold text-[32px] text-white border-2 border-border"
                          style={{ background: avatarGradient }}
                        >
                          {initials}
                        </div>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          handleAvatarChange(e);
                          setAvatarMenuOpen(false);
                        }}
                        className="hidden"
                      />
                      <input
                        ref={cameraInputRef}
                        type="file"
                        accept="image/*"
                        capture="user"
                        onChange={(e) => {
                          handleAvatarChange(e);
                          setAvatarMenuOpen(false);
                        }}
                        className="hidden"
                      />
                      <button
                        onClick={() => setAvatarMenuOpen((v) => !v)}
                        className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-accent text-white text-[12px] font-medium shadow-md hover:bg-accent/90 transition-colors z-10"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        Edit
                      </button>

                      {avatarMenuOpen && (
                        <div className="absolute left-1/2 -translate-x-1/2 top-full mt-5 w-52 bg-card rounded-xl border border-border shadow-lg z-50 overflow-hidden">
                          <button
                            disabled={!currentAvatar}
                            onClick={() => {
                              setViewerOpen(true);
                              setAvatarMenuOpen(false);
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-[13px] transition-colors ${currentAvatar ? "text-text-main hover:bg-input/60" : "text-text-secondary/40 cursor-not-allowed"}`}
                          >
                            <Eye className="w-4 h-4 text-text-secondary" />
                            Visualize Image
                          </button>
                          <button
                            onClick={() => {
                              handleCameraOpen();
                              setAvatarMenuOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-[13px] text-text-main hover:bg-input/60 transition-colors"
                          >
                            <Video className="w-4 h-4 text-text-secondary" />
                            Take a Photo
                          </button>
                          <button
                            onClick={() => {
                              fileInputRef.current?.click();
                              setAvatarMenuOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-[13px] text-text-main hover:bg-input/60 transition-colors"
                          >
                            <ImageUp className="w-4 h-4 text-text-secondary" />
                            Upload Image
                          </button>
                          <button
                            disabled={!currentAvatar}
                            onClick={() => {
                              handleAvatarRemove();
                              setAvatarMenuOpen(false);
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-[13px] transition-colors ${currentAvatar ? "text-text-main hover:bg-input/60" : "text-text-secondary/40 cursor-not-allowed"}`}
                          >
                            <Trash2 className="w-4 h-4 text-text-secondary" />
                            Delete Image
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Form */}
                  <div className="grid grid-cols-2 gap-5">
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.6px]">
                        First Name
                      </Label>
                      <Input
                        value={firstName}
                        readOnly
                        disabled
                        icon={
                          <User className="w-[17px] h-[17px] text-text-secondary" />
                        }
                        className="h-11 bg-input/40 border-border/40 opacity-70 cursor-not-allowed text-[14px]"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.6px]">
                        Last Name
                      </Label>
                      <Input
                        value={lastName}
                        readOnly
                        disabled
                        icon={
                          <User className="w-[17px] h-[17px] text-text-secondary" />
                        }
                        className="h-11 bg-input/40 border-border/40 opacity-70 cursor-not-allowed text-[14px]"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.6px]">
                        Display Name
                      </Label>
                      <Input
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        icon={
                          <User className="w-[17px] h-[17px] text-text-secondary" />
                        }
                        className="h-11 bg-input/60 border-border/50 text-[14px]"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.6px]">
                        Email
                      </Label>
                      <Input
                        type="email"
                        value={user?.email || ""}
                        readOnly
                        disabled
                        icon={
                          <Mail className="w-[17px] h-[17px] text-text-secondary" />
                        }
                        className="h-11 bg-input/40 border-border/40 opacity-70 cursor-not-allowed text-[14px]"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.6px]">
                        Phone
                      </Label>
                      <Input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        icon={
                          <Phone className="w-[17px] h-[17px] text-text-secondary" />
                        }
                        className="h-11 bg-input/60 border-border/50 text-[14px]"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.6px]">
                        Role
                      </Label>
                      <Input
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        icon={
                          <Briefcase className="w-[17px] h-[17px] text-text-secondary" />
                        }
                        className="h-11 bg-input/60 border-border/50 text-[14px]"
                      />
                    </div>
                  </div>

                  {/* Auto-save status */}
                  <div className="h-10 mt-6 flex items-center justify-center">
                    {autoSaveStatus === "saving" && (
                      <div className="flex items-center gap-2 text-[13px] text-text-secondary animate-pulse">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving...</span>
                      </div>
                    )}
                    {autoSaveStatus === "saved" && (
                      <div className="flex items-center gap-2 text-[13px] text-success animate-in fade-in duration-300">
                        <Check className="w-4 h-4" />
                        <span>Changes saved</span>
                      </div>
                    )}
                    {autoSaveStatus === "error" && (
                      <div className="flex items-center gap-2 text-[13px] text-danger animate-in fade-in duration-300">
                        <HelpCircle className="w-4 h-4" />
                        <span>Failed to save changes</span>
                      </div>
                    )}
                  </div>

                  {/* Fullscreen image viewer */}
                  {viewerOpen && (avatarPreview || user?.avatarUrl) && (
                    <div
                      className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
                      onClick={() => setViewerOpen(false)}
                    >
                      <button
                        className="absolute top-5 right-5 text-white/70 hover:text-white transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewerOpen(false);
                        }}
                      >
                        <X className="w-7 h-7" />
                      </button>
                      <img
                        src={avatarPreview || user?.avatarUrl || undefined}
                        alt="Avatar preview"
                        className="max-w-[85vw] max-h-[85vh] object-contain rounded-lg"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  )}

                  {/* Camera capture overlay */}
                  {cameraOpen && (
                    <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center">
                      <button
                        className="absolute top-5 right-5 text-white/70 hover:text-white transition-colors"
                        onClick={handleCameraClose}
                      >
                        <X className="w-7 h-7" />
                      </button>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="max-w-[85vw] max-h-[70vh] rounded-lg"
                      />
                      <button
                        onClick={handleCameraCapture}
                        className="mt-6 w-16 h-16 rounded-full border-4 border-white bg-white/20 hover:bg-white/40 transition-colors"
                      />
                    </div>
                  )}
                </>
              );
            })()
          ) : desktopSection === "chat" ? (
            <>
              <h1 className="text-[22px] font-bold text-text-main mb-6">
                Chat
              </h1>
              <ChatSettings />
            </>
          ) : desktopSection === "video" ? (
            <>
              <h1 className="text-[22px] font-bold text-text-main mb-6">
                Video & Voice
              </h1>
              <VideoVoiceSettings />
            </>
          ) : desktopSection === "notifications" ? (
            <>
              <h1 className="text-[22px] font-bold text-text-main mb-6">
                Notifications
              </h1>
              <NotificationSettings />
            </>
          ) : desktopSection === "privacy" ? (
            <>
              <h1 className="text-[22px] font-bold text-text-main mb-6">
                Privacy
              </h1>
              <PrivacySettings />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-text-secondary gap-3">
              <Lock className="w-10 h-10 opacity-30" />
              <p className="text-[15px] font-medium text-text-main">
                {NAV_ITEMS.find((n) => n.id === desktopSection)?.label}
              </p>
              <p className="text-[13px]">This section is coming soon.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function SettingsRoot() {
  return (
    <>
      <SettingsPage />
      <SettingsPageDesktop />
    </>
  );
}
