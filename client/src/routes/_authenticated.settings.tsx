import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { Grid, User, Bell, Shield, Lock, LogOut, Camera, Mail, Phone, Briefcase, Settings2, ShieldCheck, HelpCircle, Search, Volume2, MapPin, FileText, Keyboard, ChevronDown } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { apiFetch } from "../lib/api";
import type { User as UserType } from "../types";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { user, login, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  // Form state
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [role, setRole] = useState(user?.role || "");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [volume, setVolume] = useState(75);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState({ text: "", type: "" });
  const [navSearch, setNavSearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const accessToken = localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken") || "";
      const refreshToken = localStorage.getItem("refreshToken") || sessionStorage.getItem("refreshToken") || "";
      
      login({ user: data.user, accessToken, refreshToken }, keepLoggedIn);
      setSaveMessage({ text: "Profile updated successfully.", type: "success" });
    } catch (err: any) {
      setSaveMessage({ text: err.message || "Failed to update profile", type: "error" });
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

  const handleRemoveAvatar = () => {
    setAvatarPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const initials = user?.displayName ? user.displayName.substring(0, 2).toUpperCase() : "GN";
  const userRole = user?.role || "Member";
  const avatarGradient = user?.avatarGradient || "linear-gradient(135deg, #2563EB, #7C3AED)";

  return (
    <div className="h-full flex flex-col md:flex-row bg-bg text-text-main overflow-hidden">
      
      {/* Settings Navigation Sidebar */}
      <aside className="w-full md:w-[var(--width-settings-sidebar)] md:min-w-[280px] bg-bg flex flex-col p-4 md:p-6 border-b md:border-b-0 md:border-r border-border shrink-0">
        {/* Logo Header (Hidden on Mobile since VerticalNav is the shell now) */}
        <div className="hidden md:flex items-center gap-3 mb-8">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center shrink-0 text-white shadow-md shadow-accent/20">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <span className="font-bold text-lg text-text-main tracking-wide">Settings</span>
        </div>
        
        <h2 className="text-xl font-bold md:hidden mb-4">Settings</h2>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="w-4 h-4 text-text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search settings"
            value={navSearch}
            onChange={(e) => setNavSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-lg bg-input border border-border text-[13px] text-text-main placeholder:text-text-secondary focus:outline-none focus:border-accent transition-colors"
          />
        </div>

        <nav className="flex flex-col md:flex-col gap-0 md:gap-1.5 overflow-x-auto md:overflow-y-auto scrollbar-none pb-2 md:pb-0">
          <Link to="/settings" className="flex items-center gap-3 px-4 md:px-3.5 py-3.5 md:py-2.5 bg-input md:bg-accent/10 md:rounded-lg text-[14px] font-medium transition-colors text-accent border-b border-border md:border-b-0 rounded-t-xl md:rounded-t-lg first:rounded-t-xl shrink-0">
            <Grid className="w-4 h-4" />
            <span className="flex-1">General</span>
            <ChevronDown className="w-4 h-4 -rotate-90 md:hidden text-text-secondary" />
          </Link>
          {[
            { icon: User, label: "Account" },
            { icon: Bell, label: "Notifications", badge: true },
            { icon: Shield, label: "Privacy" },
            { icon: Lock, label: "Security" },
            { icon: Keyboard, label: "Keyboard Shortcuts" },
            { icon: HelpCircle, label: "Help & Support" },
          ].map((item, i, arr) => {
            const Icon = item.icon;
            return (
              <a key={item.label} href="#" className={`flex items-center gap-3 px-4 md:px-3.5 py-3.5 md:py-2.5 bg-input md:bg-transparent md:rounded-lg text-[14px] font-medium transition-colors text-text-secondary hover:bg-input hover:text-text-main border-b border-border md:border-b-0 ${i === arr.length - 1 ? 'rounded-b-xl border-b-0' : ''} shrink-0 relative`}>
                <Icon className="w-4 h-4" />
                <span className="flex-1">{item.label}</span>
                {item.badge && <span className="absolute right-10 md:right-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-danger"></span>}
                <ChevronDown className="w-4 h-4 -rotate-90 md:hidden text-text-secondary" />
              </a>
            );
          })}
        </nav>

        <div className="hidden md:flex mt-auto pt-6 border-t border-border items-center gap-3">
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-[13px] text-white shrink-0 shadow-sm"
            style={{ background: avatarGradient }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[14px] font-semibold text-text-main whitespace-nowrap overflow-hidden text-ellipsis">{user?.displayName || "User"}</div>
            <div className="text-[12px] text-text-secondary truncate">{user?.email}</div>
          </div>
          <button onClick={handleLogout} className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-text-secondary hover:text-danger hover:bg-danger/10 transition-colors" aria-label="Logout">
            <LogOut className="w-[18px] h-[18px]" />
          </button>
        </div>
      </aside>

      {/* Settings Main Content */}
      <main className="flex-1 min-w-0 overflow-y-auto scrollbar-thin px-4 md:px-12 py-6 md:py-10">
        <div className="max-w-[700px] w-full mx-auto pb-8">
          
          <div className="mb-8">
            <h1 className="text-[24px] md:text-[28px] font-bold text-text-main mb-1.5">General Settings</h1>
            <p className="text-[14px] text-text-secondary">Manage your profile information and preferences</p>
          </div>

          {/* Profile Card */}
          <div className="p-6 bg-card rounded-2xl border border-border flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-8 hover:border-border/80 transition-colors shadow-sm">
            <div className="relative shrink-0">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Avatar preview"
                  className="w-20 h-20 md:w-24 md:h-24 rounded-full object-cover shadow-lg"
                />
              ) : (
                <div 
                  className="w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center font-bold text-[28px] text-white shadow-lg"
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
                className="absolute bottom-0 right-0 w-8 h-8 bg-accent rounded-full flex items-center justify-center border-[3px] border-card cursor-pointer hover:scale-105 active:scale-95 transition-transform" 
                aria-label="Change avatar"
              >
                <Camera className="w-4 h-4 text-white" />
              </button>
            </div>
            <div className="flex flex-col gap-1.5 flex-1">
              <div className="text-[18px] md:text-[20px] font-bold text-text-main">{displayName || "Gianluca Nesta"}</div>
              <div className="text-[14px] text-text-secondary mb-3">{userRole}</div>
              <div className="flex gap-3">
                <Button size="sm" className="h-9 px-4 rounded-full text-[13px] font-medium shadow-sm" onClick={() => fileInputRef.current?.click()}>Change Photo</Button>
                <Button size="sm" variant="outline" className="h-9 px-4 rounded-full text-[13px] font-medium border-border hover:bg-input text-text-secondary hover:text-text-main" onClick={handleRemoveAvatar}>Remove</Button>
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="displayName" className="text-[12px] font-semibold text-text-secondary uppercase tracking-[0.5px]">Display Name</Label>
              <Input 
                id="displayName" 
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                icon={<User className="w-[18px] h-[18px] text-text-secondary" />} 
                className="h-11 bg-input/50 focus:bg-input rounded-xl border-border/50 text-[14px]"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="email" className="text-[12px] font-semibold text-text-secondary uppercase tracking-[0.5px]">Email Address</Label>
              <Input 
                id="email" 
                type="email" 
                value={user?.email || ""} 
                readOnly
                disabled
                className="h-11 bg-input/20 border-border/30 text-[14px] opacity-70 cursor-not-allowed"
                icon={<Mail className="w-[18px] h-[18px] text-text-secondary" />} 
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="phone" className="text-[12px] font-semibold text-text-secondary uppercase tracking-[0.5px]">Phone Number</Label>
              <Input 
                id="phone" 
                type="tel" 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                icon={<Phone className="w-[18px] h-[18px] text-text-secondary" />} 
                className="h-11 bg-input/50 focus:bg-input rounded-xl border-border/50 text-[14px]"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="role" className="text-[12px] font-semibold text-text-secondary uppercase tracking-[0.5px]">Role</Label>
              <Input 
                id="role" 
                type="text" 
                value={role}
                onChange={(e) => setRole(e.target.value)}
                icon={<Briefcase className="w-[18px] h-[18px] text-text-secondary" />} 
                className="h-11 bg-input/50 focus:bg-input rounded-xl border-border/50 text-[14px]"
              />
            </div>
            <div className="flex flex-col gap-2 md:col-span-2">
              <Label htmlFor="bio" className="text-[12px] font-semibold text-text-secondary uppercase tracking-[0.5px]">Bio</Label>
              <textarea 
                id="bio" 
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Write something about yourself..."
                rows={3}
                className="w-full px-3 py-2.5 rounded-xl bg-input/50 border border-border/50 text-[14px] text-text-main placeholder:text-text-secondary focus:outline-none focus:border-accent focus:bg-input transition-colors resize-none"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="location" className="text-[12px] font-semibold text-text-secondary uppercase tracking-[0.5px]">Location</Label>
              <Input 
                id="location" 
                type="text" 
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="City, Country"
                icon={<MapPin className="w-[18px] h-[18px] text-text-secondary" />} 
                className="h-11 bg-input/50 focus:bg-input rounded-xl border-border/50 text-[14px]"
              />
            </div>
          </div>

          {/* Preferences Section */}
          <div className="mt-12 bg-card rounded-2xl border border-border overflow-hidden">
            <div className="flex items-center gap-2 px-6 py-4 bg-input/30 border-b border-border text-text-main">
              <Settings2 className="w-[18px] h-[18px] text-accent" />
              <h2 className="text-[15px] font-semibold">Preferences</h2>
            </div>

            <div className="flex flex-col divide-y divide-border">
              <div className="flex items-center justify-between px-6 py-4 hover:bg-input/20 transition-colors">
                <div>
                  <div className="font-medium text-text-main text-[14px]">Online Status</div>
                  <div className="text-[13px] text-text-secondary mt-0.5">Show others when you are active</div>
                </div>
                <label className="relative flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-11 h-6 bg-toggle-off peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                </label>
              </div>

              <div className="flex items-center justify-between px-6 py-4 hover:bg-input/20 transition-colors">
                <div>
                  <div className="font-medium text-text-main text-[14px]">Read Receipts</div>
                  <div className="text-[13px] text-text-secondary mt-0.5">Let others know when you've read messages</div>
                </div>
                <label className="relative flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-11 h-6 bg-toggle-off peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                </label>
              </div>

              <div className="flex items-center justify-between px-6 py-4 hover:bg-input/20 transition-colors">
                <div>
                  <div className="font-medium text-text-main text-[14px]">Dark Mode</div>
                  <div className="text-[13px] text-text-secondary mt-0.5">Switch between light and dark themes</div>
                </div>
                <label className="relative flex items-center cursor-pointer">
                  <input type="checkbox" checked={theme === "dark"} onChange={toggleTheme} className="sr-only peer" />
                  <div className="w-11 h-6 bg-toggle-off peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                </label>
              </div>

              {/* Volume Slider */}
              <div className="flex flex-col gap-2 px-6 py-4 hover:bg-input/20 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-text-main text-[14px]">Notification Volume</div>
                    <div className="text-[13px] text-text-secondary mt-0.5">Adjust notification sound volume</div>
                  </div>
                  <span className="text-[14px] text-accent font-semibold">{volume}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-accent bg-border"
                  style={{
                    background: `linear-gradient(to right, var(--color-accent) 0%, var(--color-accent) ${volume}%, var(--color-border) ${volume}%, var(--color-border) 100%)`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 mt-10">
            <Button onClick={handleSave} disabled={isSaving} className="h-11 px-6 rounded-full font-medium shadow-md hover:shadow-lg transition-all">
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
            <Button variant="outline" asChild className="h-11 px-6 rounded-full font-medium border-border hover:bg-input text-text-main">
              <Link to="/">Cancel</Link>
            </Button>
            
            {saveMessage.text && (
              <div className={`flex items-center gap-2 ml-4 text-[13px] font-medium px-3 py-1.5 rounded-full ${
                saveMessage.type === 'error' ? 'bg-danger/10 text-danger' : 'bg-success/10 text-success'
              }`}>
                {saveMessage.type === 'error' ? <HelpCircle className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                {saveMessage.text}
              </div>
            )}
          </div>
          
          {/* Mobile Logout Button (Visible only on small screens since Sidebar footer hides) */}
          <div className="mt-12 md:hidden pt-8 border-t border-border">
             <Button variant="outline" onClick={handleLogout} className="w-full h-11 rounded-full text-danger border-danger/20 hover:bg-danger/10 font-medium">
                <LogOut className="w-[18px] h-[18px] mr-2" />
                Sign Out
             </Button>
          </div>

        </div>
      </main>
    </div>
  );
}
