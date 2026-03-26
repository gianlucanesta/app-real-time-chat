import { useState, useMemo, useCallback, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CircleDashed, Lock } from "lucide-react";
import { StatusSidebar } from "../components/chat/StatusSidebar";
import { StatusViewer } from "../components/chat/StatusViewer";
import { StatusPrivacyPanel } from "../components/chat/StatusPrivacyPanel";
import type { PrivacyContact } from "../components/chat/StatusPrivacyPanel";
import { StatusCreator } from "../components/chat/StatusCreator";
import { useAuth } from "../contexts/AuthContext";
import { useChat } from "../contexts/ChatContext";
import { apiFetch } from "../lib/api";
import type {
  ContactStatus,
  MyStatus,
  StatusItem,
  StatusPrivacy,
} from "../types";

export const Route = createFileRoute("/_authenticated/status")({
  component: StatusPage,
});

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
  const {
    conversations,
    sendStatusReplyMessage,
    setActiveConversation,
    addOrUpdateConversation,
  } = useChat();
  const navigate = useNavigate();

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

  // Status data from API
  const [myStatus, setMyStatus] = useState<MyStatus>({ items: [] });
  const [feedStatuses, setFeedStatuses] = useState<ContactStatus[]>([]);
  const [statusLoading, setStatusLoading] = useState(true);

  // Contacts for privacy picker
  const privacyContacts = useMemo(
    () => buildPrivacyContacts(conversations),
    [conversations],
  );

  // Fetch statuses from API on mount
  useEffect(() => {
    const fetchStatuses = async () => {
      try {
        // Fetch my status
        const myData = await apiFetch<{
          status: {
            items: Array<{
              _id: string;
              mediaType: string;
              mediaUrl?: string;
              text?: string;
              textBgGradient?: string;
              caption?: string;
              createdAt: string;
            }>;
            updatedAt?: string;
          } | null;
        }>("/status/me");

        if (myData.status) {
          setMyStatus({
            items: myData.status.items.map((item) => ({
              id: item._id,
              mediaType: item.mediaType as "text" | "image" | "video",
              mediaUrl: item.mediaUrl,
              text: item.text || undefined,
              textBgGradient: item.textBgGradient || undefined,
              caption: item.caption || undefined,
              timestamp: item.createdAt,
              viewed: false,
            })),
            lastUpdated: myData.status.updatedAt,
          });
        }

        // Fetch feed
        const feedData = await apiFetch<{ statuses: ContactStatus[] }>(
          "/status/feed",
        );
        setFeedStatuses(feedData.statuses);
      } catch (err) {
        console.warn("[status] failed to fetch statuses:", err);
      } finally {
        setStatusLoading(false);
      }
    };

    fetchStatuses();

    // Refresh every 60s to pick up new statuses and remove expired ones
    const interval = setInterval(fetchStatuses, 60_000);
    return () => clearInterval(interval);
  }, []);

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

  const handleStatusReply = useCallback(
    (contactId: string, text: string, statusItemId: string) => {
      if (!viewingStatus || !user) return;

      // Find the status item being replied to
      const item = viewingStatus.items.find((i) => i.id === statusItemId);
      if (!item) return;

      // Find existing conversation or build a new one
      let conv = conversations.find(
        (c) => c.type === "direct" && c.participants.includes(contactId),
      );

      if (!conv) {
        const convId = [user.id, contactId].sort().join("___");
        conv = {
          id: convId,
          type: "direct",
          name: viewingStatus.contactName,
          avatar: viewingStatus.contactAvatar ?? undefined,
          gradient:
            viewingStatus.contactGradient ||
            "linear-gradient(135deg, #6366f1, #a855f7)",
          initials: viewingStatus.contactInitials || "??",
          unreadCount: 0,
          isOnline: false,
          participants: [user.id, contactId],
        };
        addOrUpdateConversation(conv);
      }

      sendStatusReplyMessage(contactId, conv!.id, text, {
        mediaType: item.mediaType,
        text: item.text || null,
        textBgGradient: item.textBgGradient || null,
        mediaUrl: item.mediaUrl || null,
        caption: item.caption || null,
        senderName: viewingStatus.contactName,
      });

      // Navigate to chat and open this conversation
      setActiveConversation(conv!);
      void navigate({ to: "/" });

      // Close the viewer
      handleCloseViewer();
    },
    [
      viewingStatus,
      user,
      conversations,
      sendStatusReplyMessage,
      setActiveConversation,
      addOrUpdateConversation,
      navigate,
    ],
  );

  const handleOpenCreator = useCallback((mode?: "text" | "media") => {
    setCreatorMode(mode);
    setIsCreatorOpen(true);
  }, []);

  // Open the viewer for my own statuses
  const handleViewMyStatus = useCallback(() => {
    if (!myStatus.items.length || !user) return;
    const cs: ContactStatus = {
      contactId: user.id,
      contactName: user.displayName || "You",
      contactAvatar: user.avatarUrl || null,
      contactGradient:
        user.avatarGradient || "linear-gradient(135deg, #6366f1, #a855f7)",
      contactInitials: userInitials,
      items: myStatus.items,
      lastUpdated: myStatus.lastUpdated || new Date().toISOString(),
      allViewed: false,
    };
    setViewingStatus(cs);
    setViewingMyStatus(true);
  }, [myStatus, user, userInitials]);

  // Mark a status item as viewed and update allViewed on the feed entry
  const handleMarkViewed = useCallback((itemId: string) => {
    setFeedStatuses((prev) =>
      prev.map((cs) => {
        if (!cs.items.some((i) => i.id === itemId)) return cs;
        const updatedItems = cs.items.map((i) =>
          i.id === itemId ? { ...i, viewed: true } : i,
        );
        return {
          ...cs,
          items: updatedItems,
          allViewed: updatedItems.every((i) => i.viewed),
        };
      }),
    );
  }, []);

  const handlePublishStatus = useCallback(
    async (status: {
      mediaType: "text" | "image" | "video";
      text?: string;
      textBgGradient?: string;
      mediaUrl?: string;
      caption?: string;
    }) => {
      try {
        // POST to status API
        const result = await apiFetch<{
          status: {
            items: Array<{
              _id: string;
              mediaType: string;
              mediaUrl?: string;
              text?: string;
              textBgGradient?: string;
              caption?: string;
              createdAt: string;
            }>;
            updatedAt?: string;
          };
        }>("/status", {
          method: "POST",
          body: JSON.stringify({
            mediaType: status.mediaType,
            mediaUrl: status.mediaUrl,
            text: status.text,
            textBgGradient: status.textBgGradient,
            caption: status.caption,
          }),
        });

        // Update local state from API response
        setMyStatus({
          items: result.status.items.map((item) => ({
            id: item._id,
            mediaType: item.mediaType as "text" | "image" | "video",
            mediaUrl: item.mediaUrl,
            text: item.text || undefined,
            textBgGradient: item.textBgGradient || undefined,
            caption: item.caption || undefined,
            timestamp: item.createdAt,
            viewed: false,
          })),
          lastUpdated: result.status.updatedAt || new Date().toISOString(),
        });
      } catch (err) {
        console.error("[status] failed to publish:", err);
        // Optimistic fallback: add locally even if API fails
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
      }
    },
    [],
  );

  return (
    <div className="h-screen max-h-screen flex overflow-hidden font-sans bg-bg text-text-main">
      {/* Left: Status sidebar */}
      <StatusSidebar
        myStatus={myStatus}
        recentStatuses={feedStatuses}
        loading={statusLoading}
        userAvatar={user?.avatarUrl}
        userGradient={
          user?.avatarGradient || "linear-gradient(135deg, #6366f1, #a855f7)"
        }
        userInitials={userInitials}
        onOpenNewStatusPhoto={() => handleOpenCreator("media")}
        onOpenNewStatusText={() => handleOpenCreator("text")}
        onViewMyStatus={handleViewMyStatus}
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
          onMarkViewed={handleMarkViewed}
          onReply={viewingMyStatus ? undefined : handleStatusReply}
        />
      )}
    </div>
  );
}
