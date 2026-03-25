import { Link, useLocation } from "@tanstack/react-router";
import {
  MessageSquare,
  Phone,
  Users2,
  Megaphone,
  Star,
  Archive,
  CircleDashed,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useChat } from "../../contexts/ChatContext";

export function VerticalNav() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { mobileInChat, conversations } = useChat();

  // Compute total unread messages across all conversations
  const totalUnread = conversations.reduce(
    (sum, c) => sum + (c.unreadCount || 0),
    0,
  );

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
    { icon: Megaphone, path: "/channels", label: "Channels" },
    { icon: Star, path: "/favorites", label: "Favorites" },
    { icon: Archive, path: "/archive", label: "Archive" },
  ];

  // Mobile nav (5-item WhatsApp-style)
  const mobileNavLinks = [
    { icon: MessageSquare, path: "/", label: "Chats" },
    { icon: Phone, path: "/calls", label: "Calls" },
    { icon: CircleDashed, path: "/status", label: "Status" },
    { icon: Users2, path: "/community", label: "Community" },
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
      <nav className="hidden md:flex flex-col w-[64px] min-w-[64px] h-screen fixed left-0 top-0 bottom-0 bg-card border-r border-border py-3 items-center justify-between z-10 shrink-0">
        {/* Top icons */}
        <div className="flex flex-col gap-1 w-full items-center">
          {desktopNavLinks.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.path);
            const showBadge = link.path === "/" && totalUnread > 0;
            return (
              <Link
                key={link.path}
                to={link.path}
                title={link.label}
                className={`w-11 h-11 rounded-md flex items-center justify-center relative transition-[color,background-color] duration-[150ms] cursor-pointer no-underline border-none ${
                  active
                    ? "text-accent bg-accent/10"
                    : "text-text-secondary hover:text-text-main hover:bg-input"
                }`}
              >
                <Icon size={22} strokeWidth={active ? 2.5 : 2} />
                {showBadge && (
                  <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-accent text-white text-[10px] font-bold px-1 shadow-sm">
                    {totalUnread > 99 ? "99+" : totalUnread}
                  </span>
                )}
                {active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-accent rounded-r-full" />
                )}
              </Link>
            );
          })}
        </div>

        {/* Bottom icons */}
        <div className="flex flex-col gap-1 w-full items-center">
          <Link to="/settings" search={{ section: undefined }} title="Profile">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt="Profile"
                className="w-10 h-10 rounded-full object-cover cursor-pointer border-2 border-transparent hover:border-accent transition-colors"
              />
            ) : (
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
            )}
          </Link>
        </div>
      </nav>

      {/* --- MOBILE BOTTOM NAVIGATION --- */}
      {!mobileInChat && (
        <nav
          className="md:hidden fixed bottom-0 left-0 right-0 h-[64px] border-t border-border z-50 flex items-center justify-around px-2"
          style={{ backgroundColor: "#131c2e" }}
        >
          {mobileNavLinks.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.path);
            const showBadge = link.path === "/" && totalUnread > 0;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors relative ${
                  active
                    ? "text-accent"
                    : "text-text-secondary hover:text-text-main"
                }`}
              >
                <div className="relative">
                  <Icon
                    size={active ? 24 : 22}
                    strokeWidth={active ? 2.5 : 2}
                  />
                  {showBadge && (
                    <span className="absolute -top-1.5 -right-2.5 inline-flex items-center justify-center min-w-[16px] h-[16px] rounded-full bg-accent text-white text-[9px] font-bold px-1 shadow-sm">
                      {totalUnread > 99 ? "99+" : totalUnread}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium">{link.label}</span>
              </Link>
            );
          })}
          {/* Profile Tab on Mobile */}
          <Link
            to="/settings"
            search={{ section: undefined }}
            className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
              isActive("/settings")
                ? "text-accent"
                : "text-text-secondary hover:text-text-main"
            }`}
          >
            <div
              className={`rounded-full p-[2px] ${isActive("/settings") ? "border-2 border-accent" : ""}`}
            >
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt="Profile"
                  className="w-6 h-6 rounded-full object-cover"
                />
              ) : (
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
              )}
            </div>
            <span className="text-[10px] font-medium">You</span>
          </Link>
        </nav>
      )}
    </>
  );
}
