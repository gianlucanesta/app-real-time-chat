import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CircleDashed, Lock } from "lucide-react";
import { StatusSidebar } from "../components/chat/StatusSidebar";
import { StatusViewer } from "../components/chat/StatusViewer";
import { StatusPrivacyPanel } from "../components/chat/StatusPrivacyPanel";
import { useAuth } from "../contexts/AuthContext";
import { useChat } from "../contexts/ChatContext";
import type {
  ContactStatus,
  MyStatus,
  StatusItem,
  StatusPrivacy,
} from "../types";

export const Route = createFileRoute("/_authenticated/status")({
  component: StatusPage,
});

/* ── Build demo status data from conversations ───────────── */

function buildDemoStatuses(
  conversations: {
    id: string;
    name: string;
    avatar?: string;
    gradient: string;
    initials: string;
    participants: string[];
  }[],
): ContactStatus[] {
  const now = Date.now();
  const hour = 3_600_000;

  const statusTexts = [
    "Enjoying the weekend! 🌟",
    "Working from home today 💻",
    "Beautiful sunset 🌅",
    "Coffee time ☕",
    "Gym done! 💪",
  ];

  const textGradients = [
    "linear-gradient(135deg, #667eea, #764ba2)",
    "linear-gradient(135deg, #f093fb, #f5576c)",
    "linear-gradient(135deg, #4facfe, #00f2fe)",
    "linear-gradient(135deg, #43e97b, #38f9d7)",
    "linear-gradient(135deg, #fa709a, #fee140)",
  ];

  const subset = conversations
    .filter((c) => c.name)
    .slice(0, Math.min(5, conversations.length));

  return subset.map((conv, idx) => {
    const itemCount = idx === 0 ? 3 : idx < 3 ? 2 : 1;
    const items: StatusItem[] = [];

    for (let i = 0; i < itemCount; i++) {
      const ts = new Date(now - (idx * 3 + i) * hour);
      items.push({
        id: `status-${conv.id}-${i}`,
        mediaType: "text",
        text: statusTexts[(idx + i) % statusTexts.length],
        textBgGradient: textGradients[(idx + i) % textGradients.length],
        timestamp: ts.toISOString(),
        viewed: idx > 2, // first 3 contacts have unviewed status
      });
    }

    items.sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
    const allViewed = items.every((it) => it.viewed);

    return {
      contactId: conv.participants[0] || conv.id,
      contactName: conv.name,
      contactAvatar: conv.avatar || null,
      contactGradient: conv.gradient,
      contactInitials: conv.initials,
      items,
      lastUpdated: items[items.length - 1].timestamp,
      allViewed,
    };
  });
}

/* ── Page Component ──────────────────────────────────────── */

function StatusPage() {
  const { user } = useAuth();
  const { conversations } = useChat();

  // State
  const [viewingStatus, setViewingStatus] = useState<ContactStatus | null>(
    null,
  );
  const [viewingMyStatus, setViewingMyStatus] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [privacy, setPrivacy] = useState<StatusPrivacy>("contacts");

  // My status (demo: empty by default)
  const [myStatus] = useState<MyStatus>({ items: [] });

  // Recent statuses from conversations
  const recentStatuses = useMemo(
    () => buildDemoStatuses(conversations),
    [conversations],
  );

  // User info
  const userInitials =
    user?.displayName
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase() || "U";

  const handleViewContactStatus = (cs: ContactStatus) => {
    setViewingStatus(cs);
    setViewingMyStatus(false);
  };

  const handleCloseViewer = () => {
    setViewingStatus(null);
    setViewingMyStatus(false);
  };

  return (
    <div className="h-screen max-h-screen flex overflow-hidden font-sans bg-bg text-text-main">
      {/* Left: Status sidebar */}
      <StatusSidebar
        myStatus={myStatus}
        recentStatuses={recentStatuses}
        userAvatar={user?.avatarUrl}
        userGradient={
          user?.avatarGradient || "linear-gradient(135deg, #6366f1, #a855f7)"
        }
        userInitials={userInitials}
        onOpenNewStatusPhoto={() => {
          /* TODO: open photo picker */
        }}
        onOpenNewStatusText={() => {
          /* TODO: open text status creator */
        }}
        onViewContactStatus={handleViewContactStatus}
        onOpenPrivacy={() => setIsPrivacyOpen(true)}
      />

      {/* Right: Empty state */}
      <div className="hidden md:flex flex-1 min-w-0 h-full overflow-hidden">
        <div className="flex-1 flex flex-col items-center justify-center bg-bg min-h-0 relative">
          <div className="flex flex-col items-center gap-4 text-text-secondary px-6">
            <CircleDashed className="w-16 h-16 opacity-20" strokeWidth={1.5} />
            <h2 className="text-[20px] font-semibold text-text-main">
              Share status updates
            </h2>
            <p className="text-[14px] text-center leading-relaxed max-w-sm">
              Share photos, videos and text that disappear after 24 hours.
            </p>
          </div>

          {/* Footer */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
            <p className="text-[11.5px] text-text-secondary flex items-center gap-1.5">
              <Lock className="w-3 h-3 shrink-0" />
              Your status updates are end-to-end encrypted.
            </p>
          </div>
        </div>
      </div>

      {/* Status privacy — desktop: centered modal / mobile: full-screen */}
      <StatusPrivacyPanel
        isOpen={isPrivacyOpen}
        onClose={() => setIsPrivacyOpen(false)}
        privacy={privacy}
        onChangePrivacy={setPrivacy}
      />

      {/* Full-screen status viewer overlay */}
      {viewingStatus && (
        <StatusViewer
          contactStatus={viewingStatus}
          isMyStatus={viewingMyStatus}
          userName={user?.displayName}
          userAvatar={user?.avatarUrl}
          userGradient={user?.avatarGradient}
          userInitials={userInitials}
          onClose={handleCloseViewer}
        />
      )}
    </div>
  );
}
