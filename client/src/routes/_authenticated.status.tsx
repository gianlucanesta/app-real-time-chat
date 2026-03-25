import { useState, useMemo, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CircleDashed, Lock } from "lucide-react";
import { StatusSidebar } from "../components/chat/StatusSidebar";
import { StatusViewer } from "../components/chat/StatusViewer";
import { StatusPrivacyPanel } from "../components/chat/StatusPrivacyPanel";
import type { PrivacyContact } from "../components/chat/StatusPrivacyPanel";
import { StatusCreator } from "../components/chat/StatusCreator";
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

/* ── Build demo status data from conversations (only < 24h old) ── */

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
  const maxAge = 24 * hour; // 24-hour window

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

  const results: ContactStatus[] = [];

  for (const [idx, conv] of subset.entries()) {
    const itemCount = idx === 0 ? 3 : idx < 3 ? 2 : 1;
    const items: StatusItem[] = [];

    for (let i = 0; i < itemCount; i++) {
      const ts = new Date(now - (idx * 3 + i) * hour);
      // Skip items older than 24h
      if (now - ts.getTime() > maxAge) continue;
      items.push({
        id: `status-${conv.id}-${i}`,
        mediaType: "text",
        text: statusTexts[(idx + i) % statusTexts.length],
        textBgGradient: textGradients[(idx + i) % textGradients.length],
        timestamp: ts.toISOString(),
        viewed: idx > 2,
      });
    }

    if (items.length === 0) continue; // all expired

    items.sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
    const allViewed = items.every((it) => it.viewed);

    results.push({
      contactId: conv.participants[0] || conv.id,
      contactName: conv.name,
      contactAvatar: conv.avatar || null,
      contactGradient: conv.gradient,
      contactInitials: conv.initials,
      items,
      lastUpdated: items[items.length - 1].timestamp,
      allViewed,
    });
  }

  return results;
}

/* ── Build contact list for privacy picker ───────────────── */

function buildPrivacyContacts(
  conversations: {
    id: string;
    name: string;
    avatar?: string;
    gradient: string;
    initials: string;
    participants: string[];
    type: string;
  }[],
): PrivacyContact[] {
  return conversations
    .filter((c) => c.type === "direct" && c.name)
    .map((c) => ({
      id: c.participants[0] || c.id,
      name: c.name,
      avatar: c.avatar || null,
      gradient: c.gradient,
      initials: c.initials,
    }));
}

/* ── Page Component ──────────────────────────────────────── */

function StatusPage() {
  const { user } = useAuth();
  const { conversations } = useChat();

  // Privacy state
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [privacy, setPrivacy] = useState<StatusPrivacy>("contacts");
  const [exceptIds, setExceptIds] = useState<string[]>([]);
  const [onlyShareIds, setOnlyShareIds] = useState<string[]>([]);

  // Creator state
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [creatorMode, setCreatorMode] = useState<"text" | "media" | undefined>(
    undefined,
  );

  // Viewer state
  const [viewingStatus, setViewingStatus] = useState<ContactStatus | null>(
    null,
  );
  const [viewingMyStatus, setViewingMyStatus] = useState(false);

  // My status
  const [myStatus, setMyStatus] = useState<MyStatus>({ items: [] });

  // Recent statuses from conversations (only active < 24h)
  const recentStatuses = useMemo(
    () => buildDemoStatuses(conversations),
    [conversations],
  );

  // Contacts for privacy picker
  const privacyContacts = useMemo(
    () => buildPrivacyContacts(conversations),
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

  const handleOpenCreator = useCallback((mode?: "text" | "media") => {
    setCreatorMode(mode);
    setIsCreatorOpen(true);
  }, []);

  const handlePublishStatus = useCallback(
    (status: {
      mediaType: "text" | "image" | "video";
      text?: string;
      textBgGradient?: string;
      mediaUrl?: string;
      caption?: string;
    }) => {
      const newItem: StatusItem = {
        id: `my-status-${Date.now()}`,
        mediaType: status.mediaType,
        text: status.text,
        textBgGradient: status.textBgGradient,
        mediaUrl: status.mediaUrl,
        caption: status.caption,
        timestamp: new Date().toISOString(),
        viewed: false,
      };
      setMyStatus((prev) => ({
        items: [...prev.items, newItem],
        lastUpdated: newItem.timestamp,
      }));
    },
    [],
  );

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
        onOpenNewStatusPhoto={() => handleOpenCreator("media")}
        onOpenNewStatusText={() => handleOpenCreator("text")}
        onViewContactStatus={handleViewContactStatus}
        onOpenPrivacy={() => setIsPrivacyOpen(true)}
      />

      {/* Right column: desktop only */}
      <div className="hidden md:flex flex-1 min-w-0 h-full overflow-hidden">
        {isPrivacyOpen ? (
          /* ── Privacy settings shown inline in right column ── */
          <div className="flex-1 flex flex-col bg-bg min-h-0 border-l border-border">
            <StatusPrivacyPanel
              isOpen={isPrivacyOpen}
              onClose={() => setIsPrivacyOpen(false)}
              privacy={privacy}
              onChangePrivacy={setPrivacy}
              contacts={privacyContacts}
              exceptIds={exceptIds}
              onChangeExceptIds={setExceptIds}
              onlyShareIds={onlyShareIds}
              onChangeOnlyShareIds={setOnlyShareIds}
            />
          </div>
        ) : (
          /* ── Default empty state ── */
          <div className="flex-1 flex flex-col items-center justify-center bg-bg min-h-0 relative">
            <div className="flex flex-col items-center gap-4 text-text-secondary px-6">
              <CircleDashed
                className="w-16 h-16 opacity-20"
                strokeWidth={1.5}
              />
              <h2 className="text-[20px] font-semibold text-text-main">
                Share status updates
              </h2>
              <p className="text-[14px] text-center leading-relaxed max-w-sm">
                Share photos, videos and text that disappear after 24 hours.
              </p>
            </div>
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
              <p className="text-[11.5px] text-text-secondary flex items-center gap-1.5">
                <Lock className="w-3 h-3 shrink-0" />
                Your status updates are end-to-end encrypted.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Mobile-only: Status privacy full-screen overlay */}
      {isPrivacyOpen && (
        <div className="flex md:hidden fixed inset-0 z-50 bg-card flex-col">
          <StatusPrivacyPanel
            isOpen={isPrivacyOpen}
            onClose={() => setIsPrivacyOpen(false)}
            privacy={privacy}
            onChangePrivacy={setPrivacy}
            contacts={privacyContacts}
            exceptIds={exceptIds}
            onChangeExceptIds={setExceptIds}
            onlyShareIds={onlyShareIds}
            onChangeOnlyShareIds={setOnlyShareIds}
          />
        </div>
      )}

      {/* Status creator overlay */}
      <StatusCreator
        isOpen={isCreatorOpen}
        onClose={() => setIsCreatorOpen(false)}
        onPublish={handlePublishStatus}
        initialMode={creatorMode}
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
