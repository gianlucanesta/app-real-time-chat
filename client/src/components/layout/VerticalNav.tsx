import { Link, useLocation } from "@tanstack/react-router";
import {
  MessageSquare,
  Phone,
  Users2,
  Newspaper,
  Users,
  Star,
  Archive,
  Settings,
  CircleDashed,
  Sun,
  Moon,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";

export function VerticalNav() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // A helper function to determine if a route is active
  const isActive = (path: string) => {
    if (path === "/") {
      return pathname.startsWith("/chat") || pathname === "/";
    }
    return pathname.startsWith(path);
  };

  // Desktop nav (full set)
  const desktopNavLinks = [
    { icon: MessageSquare, path: "/", label: "Chats" },
    { icon: Phone, path: "/calls", label: "Calls" },
    { icon: CircleDashed, path: "/status", label: "Status" },
    { icon: Users, path: "/contacts", label: "Contacts" },
    { icon: Star, path: "/favorites", label: "Favorites" },
    { icon: Archive, path: "/archive", label: "Archive" },
  ];

  // Mobile nav (5-item WhatsApp-style)
  const mobileNavLinks = [
    { icon: MessageSquare, path: "/", label: "Chats" },
    { icon: Phone, path: "/calls", label: "Calls" },
    { icon: Users2, path: "/community", label: "Community" },
    { icon: Newspaper, path: "/updates", label: "Updates" },
  ];

  const profileInitials =
    user?.displayName
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase() || "U";

  return (
    <>
      {/* --- DESKTOP VERTICAL NAVIGATION --- */}
      <nav className="hidden md:flex flex-col w-[60px] h-screen fixed left-0 top-0 bottom-0 bg-bg border-r border-border py-4 items-center justify-between z-50">
        {/* Top icons */}
        <div className="flex flex-col gap-6 w-full items-center">
          {desktopNavLinks.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                title={link.label}
                className={`p-3 rounded-xl transition-all relative ${
                  active
                    ? "text-accent bg-accent/10"
                    : "text-text-secondary hover:text-text-main hover:bg-card"
                }`}
              >
                <Icon size={24} strokeWidth={active ? 2.5 : 2} />
                {active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-accent rounded-r-full" />
                )}
              </Link>
            );
          })}
        </div>

        {/* Bottom icons */}
        <div className="flex flex-col gap-6 w-full items-center">
          <button
            onClick={toggleTheme}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="p-3 rounded-xl transition-all text-text-secondary hover:text-text-main hover:bg-card"
          >
            {theme === "dark" ? <Sun size={24} /> : <Moon size={24} />}
          </button>

          <Link
            to="/settings"
            title="Settings"
            className={`p-3 rounded-xl transition-all ${
              isActive("/settings")
                ? "text-accent bg-accent/10"
                : "text-text-secondary hover:text-text-main hover:bg-card"
            }`}
          >
            <Settings size={24} />
          </Link>

          <Link to="/settings" title="Profile">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold cursor-pointer border-2 border-transparent hover:border-accent transition-colors"
              style={{
                background:
                  user?.avatarGradient ||
                  "linear-gradient(135deg, #6366f1, #a855f7)",
              }}
            >
              {profileInitials}
            </div>
          </Link>
        </div>
      </nav>

      {/* --- MOBILE BOTTOM NAVIGATION --- */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-[64px] bg-bg border-t border-border z-50 flex items-center justify-around px-2">
        {mobileNavLinks.map((link) => {
          const Icon = link.icon;
          const active = isActive(link.path);
          return (
            <Link
              key={link.path}
              to={link.path}
              className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
                active
                  ? "text-accent"
                  : "text-text-secondary hover:text-text-main"
              }`}
            >
              <Icon size={active ? 24 : 22} strokeWidth={active ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{link.label}</span>
            </Link>
          );
        })}
        {/* Theme Toggle on Mobile */}
        <button
          onClick={toggleTheme}
          className="flex flex-col items-center justify-center w-full h-full gap-1 transition-colors text-text-secondary hover:text-text-main"
        >
          {theme === "dark" ? <Sun size={22} /> : <Moon size={22} />}
          <span className="text-[10px] font-medium">{theme === "dark" ? "Light" : "Dark"}</span>
        </button>

        {/* Profile Tab on Mobile */}
        <Link
          to="/settings"
          className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
            isActive("/settings")
              ? "text-accent"
              : "text-text-secondary hover:text-text-main"
          }`}
        >
          <div
            className={`rounded-full p-[2px] ${isActive("/settings") ? "border-2 border-accent" : ""}`}
          >
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-semibold"
              style={{
                background:
                  user?.avatarGradient ||
                  "linear-gradient(135deg, #6366f1, #a855f7)",
              }}
            >
              {profileInitials}
            </div>
          </div>
          <span className="text-[10px] font-medium">You</span>
        </Link>
      </nav>
    </>
  );
}
