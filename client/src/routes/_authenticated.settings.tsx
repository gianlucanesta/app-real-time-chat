import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useRef } from "react";
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
  ShieldCheck,
  HelpCircle,
  Search,
  Keyboard,
  ChevronRight,
  ChevronLeft,
  MessageSquare,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { apiFetch } from "../lib/api";
import type { User as UserType } from "../types";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsRoot,
});

// Settings nav items
const NAV_ITEMS = [
  { id: "general", icon: Grid, label: "General" },
  { id: "account", icon: User, label: "Account" },
  { id: "privacy", icon: Shield, label: "Privacy" },
  { id: "chat", icon: MessageSquare, label: "Chat" },
  { id: "notifications", icon: Bell, label: "Notifications", badge: true },
  { id: "security", icon: Lock, label: "Security" },
  { id: "keyboard", icon: Keyboard, label: "Keyboard Shortcuts" },
  { id: "help", icon: HelpCircle, label: "Help & Support" },
];

function SettingsPage() {
  const { user, login, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  // Mobile: null = hub, string = active section
  const [mobileSection, setMobileSection] = useState<string | null>(null);
  // Desktop: always shows sidebar; tracks which section is selected
  const [desktopSection, setDesktopSection] = useState<string>("general");
  const [navSearch, setNavSearch] = useState("");

  // Profile form state
  const nameParts = (user?.displayName || "").split(" ");
  const [firstName] = useState(nameParts[0] || "");
  const [lastName] = useState(nameParts.slice(1).join(" ") || "");
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [role, setRole] = useState(user?.role || "");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState({ text: "", type: "" });
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    setSaveMessage({ text: "", type: "" });
    try {
      const data = await apiFetch<{ user: UserType }>(`/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({ displayName, phone, role }),
      });
      const keepLoggedIn = !!localStorage.getItem("ephemeral_remember");
      const accessToken =
        localStorage.getItem("accessToken") ||
        sessionStorage.getItem("accessToken") ||
        "";
      const refreshToken =
        localStorage.getItem("refreshToken") ||
        sessionStorage.getItem("refreshToken") ||
        "";
      login({ user: data.user, accessToken, refreshToken }, keepLoggedIn);
      setSaveMessage({
        text: "Profile updated successfully.",
        type: "success",
      });
    } catch (err: any) {
      setSaveMessage({
        text: err.message || "Failed to update profile",
        type: "error",
      });
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage({ text: "", type: "" }), 3000);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  // ── Shared: General section content ──────────────────────────────────────
  function GeneralSection() {
    return (
      <div className="flex flex-col">
        {/* Avatar */}
        <div className="flex flex-col items-center pt-6 pb-5">
          <div className="relative">
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt="Avatar"
                className="w-20 h-20 rounded-full object-cover"
              />
            ) : (
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center font-bold text-[26px] text-white"
                style={{ background: avatarGradient }}
              >
                {initials}
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 w-7 h-7 bg-accent rounded-full flex items-center justify-center border-2 border-card"
              aria-label="Change avatar"
            >
              <Camera className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
          <div className="flex gap-3 mt-4">
            <Button
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="h-9 px-5 rounded-lg text-[13px]"
            >
              Change Photo
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setAvatarPreview(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="h-9 px-5 rounded-lg text-[13px]"
            >
              Remove
            </Button>
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

          {/* Save */}
          <div className="flex items-center gap-3 pt-2">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="h-10 px-6 rounded-lg font-medium flex-1 md:flex-none"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
            {saveMessage.text && (
              <div
                className={`flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg ${
                  saveMessage.type === "error"
                    ? "bg-danger/10 text-danger"
                    : "bg-success/10 text-success"
                }`}
              >
                {saveMessage.type === "error" ? (
                  <HelpCircle className="w-3.5 h-3.5" />
                ) : (
                  <ShieldCheck className="w-3.5 h-3.5" />
                )}
                {saveMessage.text}
              </div>
            )}
          </div>
        </div>
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
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center font-bold text-[26px] text-white shadow-lg"
            style={{ background: avatarGradient }}
          >
            {initials}
          </div>
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
                  <span className="flex-1 text-[14px] font-medium text-text-main">
                    {item.label}
                  </span>
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
  const { user, login, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [desktopSection, setDesktopSection] = useState<string>("general");
  const [navSearch, setNavSearch] = useState("");

  const nameParts = (user?.displayName || "").split(" ");
  const [firstName] = useState(nameParts[0] || "");
  const [lastName] = useState(nameParts.slice(1).join(" ") || "");
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [role, setRole] = useState(user?.role || "");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState({ text: "", type: "" });
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    setSaveMessage({ text: "", type: "" });
    try {
      const data = await apiFetch<{ user: UserType }>(`/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({ displayName, phone, role }),
      });
      const keepLoggedIn = !!localStorage.getItem("ephemeral_remember");
      const accessToken =
        localStorage.getItem("accessToken") ||
        sessionStorage.getItem("accessToken") ||
        "";
      const refreshToken =
        localStorage.getItem("refreshToken") ||
        sessionStorage.getItem("refreshToken") ||
        "";
      login({ user: data.user, accessToken, refreshToken }, keepLoggedIn);
      setSaveMessage({
        text: "Profile updated successfully.",
        type: "success",
      });
    } catch (err: any) {
      setSaveMessage({
        text: err.message || "Failed to update profile",
        type: "error",
      });
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage({ text: "", type: "" }), 3000);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const filteredNav = NAV_ITEMS.filter((item) =>
    item.label.toLowerCase().includes(navSearch.toLowerCase()),
  );

  return (
    <div className="hidden md:flex h-full bg-bg text-text-main overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="w-[280px] min-w-[280px] bg-card border-r border-border flex flex-col shrink-0">
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
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge && (
                  <span className="w-1.5 h-1.5 rounded-full bg-danger" />
                )}
                <ChevronRight className="w-3.5 h-3.5 opacity-50" />
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-border flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-[12px] text-white shrink-0"
            style={{ background: avatarGradient }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold text-text-main truncate">
              {user?.displayName || "User"}
            </div>
            <div className="text-[11px] text-text-secondary truncate">
              {user?.email}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-text-secondary hover:text-danger hover:bg-danger/10 transition-colors"
            aria-label="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Desktop main */}
      <main className="flex-1 min-w-0 overflow-y-auto px-10 py-8">
        <div className="max-w-[640px] mx-auto">
          {desktopSection === "general" ? (
            <>
              <h1 className="text-[22px] font-bold text-text-main mb-6">
                General Settings
              </h1>

              {/* Profile card */}
              <div className="bg-card rounded-2xl border border-border p-6 flex items-center gap-6 mb-8">
                <div className="relative shrink-0">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Avatar"
                      className="w-20 h-20 rounded-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-20 h-20 rounded-full flex items-center justify-center font-bold text-[26px] text-white"
                      style={{ background: avatarGradient }}
                    >
                      {initials}
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 w-7 h-7 bg-accent rounded-full flex items-center justify-center border-2 border-card"
                    aria-label="Change avatar"
                  >
                    <Camera className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>
                <div className="flex flex-col gap-3">
                  <div className="text-[18px] font-bold text-text-main">
                    {displayName || user?.displayName || "User"}
                  </div>
                  <div className="flex gap-3">
                    <Button
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-9 px-4 rounded-lg"
                    >
                      Change Photo
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setAvatarPreview(null);
                        if (fileInputRef.current)
                          fileInputRef.current.value = "";
                      }}
                      className="h-9 px-4 rounded-lg"
                    >
                      Remove
                    </Button>
                  </div>
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

              <div className="flex items-center gap-3 mt-8">
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="h-10 px-6 rounded-lg"
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
                <Button
                  variant="outline"
                  asChild
                  className="h-10 px-6 rounded-lg border-border text-text-main"
                >
                  <Link to="/">Cancel</Link>
                </Button>
                {saveMessage.text && (
                  <div
                    className={`flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg ${saveMessage.type === "error" ? "bg-danger/10 text-danger" : "bg-success/10 text-success"}`}
                  >
                    {saveMessage.type === "error" ? (
                      <HelpCircle className="w-3.5 h-3.5" />
                    ) : (
                      <ShieldCheck className="w-3.5 h-3.5" />
                    )}
                    {saveMessage.text}
                  </div>
                )}
              </div>
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
