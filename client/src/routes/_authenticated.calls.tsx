import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CallsSidebar } from "../components/chat/CallsSidebar";
import { CallInfoPanel } from "../components/chat/CallInfoPanel";
import { StartCallModal } from "../components/chat/StartCallModal";
import { CallLinkModal } from "../components/chat/CallLinkModal";
import { DialpadPanel } from "../components/chat/DialpadPanel";
import { AddToFavoritesModal } from "../components/chat/AddToFavoritesModal";
import {
  ScheduleCallModal,
  type ScheduledCall,
  SCHEDULED_CALL_PREFIX,
  type ScheduledCallPayload,
} from "../components/chat/ScheduleCallModal";
import { useChat } from "../contexts/ChatContext";
import { useAuth } from "../contexts/AuthContext";
import type { CallGroup, CallRecord } from "../types";

export const Route = createFileRoute("/_authenticated/calls")({
  component: CallsPage,
});

/* ── Build demo call records from real conversations ───── */

function buildCallGroupsFromConversations(
  conversations: {
    id: string;
    name: string;
    avatar?: string;
    gradient: string;
    initials: string;
    participants: string[];
  }[],
  currentUserId: string,
): CallGroup[] {
  const now = Date.now();
  const day = 86_400_000;
  const groups: CallGroup[] = [];

  // Generate realistic-looking call history from conversations
  const callTemplates: {
    dayOffset: number;
    hour: number;
    minute: number;
    direction: "incoming" | "outgoing";
    callType: "voice" | "video";
    result:
      | "accepted"
      | "missed"
      | "declined"
      | "no_answer"
      | "accepted_elsewhere";
    duration?: number;
  }[] = [
    {
      dayOffset: 0,
      hour: 14,
      minute: 32,
      direction: "incoming",
      callType: "voice",
      result: "accepted",
      duration: 245,
    },
    {
      dayOffset: 0,
      hour: 10,
      minute: 15,
      direction: "outgoing",
      callType: "video",
      result: "accepted",
      duration: 892,
    },
    {
      dayOffset: 1,
      hour: 18,
      minute: 41,
      direction: "incoming",
      callType: "voice",
      result: "accepted_elsewhere",
    },
    {
      dayOffset: 1,
      hour: 9,
      minute: 5,
      direction: "outgoing",
      callType: "voice",
      result: "no_answer",
    },
    {
      dayOffset: 2,
      hour: 20,
      minute: 12,
      direction: "outgoing",
      callType: "video",
      result: "accepted",
      duration: 1520,
    },
    {
      dayOffset: 2,
      hour: 16,
      minute: 30,
      direction: "incoming",
      callType: "voice",
      result: "missed",
    },
    {
      dayOffset: 3,
      hour: 11,
      minute: 22,
      direction: "incoming",
      callType: "voice",
      result: "accepted",
      duration: 67,
    },
    {
      dayOffset: 4,
      hour: 15,
      minute: 45,
      direction: "outgoing",
      callType: "video",
      result: "declined",
    },
    {
      dayOffset: 5,
      hour: 13,
      minute: 8,
      direction: "incoming",
      callType: "voice",
      result: "accepted",
      duration: 412,
    },
    {
      dayOffset: 6,
      hour: 17,
      minute: 55,
      direction: "outgoing",
      callType: "voice",
      result: "accepted",
      duration: 180,
    },
    {
      dayOffset: 7,
      hour: 8,
      minute: 30,
      direction: "incoming",
      callType: "video",
      result: "missed",
    },
    {
      dayOffset: 10,
      hour: 19,
      minute: 15,
      direction: "outgoing",
      callType: "voice",
      result: "accepted",
      duration: 95,
    },
    {
      dayOffset: 12,
      hour: 12,
      minute: 0,
      direction: "incoming",
      callType: "voice",
      result: "accepted",
      duration: 320,
    },
  ];

  // Take up to 6 conversations for demo data
  const subset = conversations.slice(0, Math.min(6, conversations.length));

  subset.forEach((conv, idx) => {
    // Each conversation gets 1-3 calls
    const numCalls = Math.min(3, callTemplates.length - idx * 2);
    const calls: CallRecord[] = [];
    const otherId =
      conv.participants.find((p) => p !== currentUserId) ||
      conv.participants[0] ||
      conv.id;

    for (let j = 0; j < numCalls && idx * 2 + j < callTemplates.length; j++) {
      const tpl = callTemplates[idx * 2 + j];
      const ts = new Date(now - tpl.dayOffset * day);
      ts.setHours(tpl.hour, tpl.minute, 0, 0);

      // Only include calls from the last 24 hours
      if (now - ts.getTime() > day) continue;

      calls.push({
        id: `call-${conv.id}-${j}`,
        contactId: otherId,
        contactName: conv.name,
        contactAvatar: conv.avatar || null,
        contactGradient: conv.gradient,
        contactInitials: conv.initials,
        direction: tpl.direction,
        callType: tpl.callType,
        result: tpl.result,
        timestamp: ts.toISOString(),
        duration: tpl.duration,
      });
    }

    if (calls.length > 0) {
      // Sort calls by timestamp descending
      calls.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );

      groups.push({
        contactId: otherId,
        contactName: conv.name,
        contactAvatar: conv.avatar || null,
        contactGradient: conv.gradient,
        contactInitials: conv.initials,
        calls,
        lastCall: calls[0],
        count: calls.length,
      });
    }
  });

  // Sort groups by most recent call
  groups.sort(
    (a, b) =>
      new Date(b.lastCall.timestamp).getTime() -
      new Date(a.lastCall.timestamp).getTime(),
  );

  return groups;
}

/* ── Page Component ──────────────────────────────────────── */

function CallsPage() {
  const { conversations, webrtc, sendScheduledCallInvite } = useChat();
  const { user } = useAuth();
  const [selectedGroup, setSelectedGroup] = useState<CallGroup | null>(null);
  const [mobileShowDetail, setMobileShowDetail] = useState(false);

  // Modal states
  const [showStartCall, setShowStartCall] = useState(false);
  const [showCallLink, setShowCallLink] = useState(false);
  const [showDialpad, setShowDialpad] = useState(false);
  const [showScheduleCall, setShowScheduleCall] = useState(false);
  const [showAddFavorites, setShowAddFavorites] = useState(false);

  // Scheduled calls list
  const [_scheduledCalls, setScheduledCalls] = useState<ScheduledCall[]>([]);
  const scheduledTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );
  const endWarningTimersRef = useRef<
    Map<string, ReturnType<typeof setTimeout>>
  >(new Map());
  const endTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  // Build call groups from conversations
  const callGroups = useMemo(
    () => buildCallGroupsFromConversations(conversations, user?.id ?? ""),
    [conversations, user?.id],
  );

  // Favorites: conversations marked as favorite that also have call history
  const favoriteConvIds = useMemo(
    () =>
      new Set(
        conversations
          .filter((c) => c.isFavorite)
          .map((c) => {
            const otherId =
              c.participants.find((p) => p !== user?.id) ||
              c.participants[0] ||
              c.id;
            return otherId;
          }),
      ),
    [conversations, user?.id],
  );

  const favorites = useMemo(() => {
    // Show favorite contacts from call groups, plus build stubs for favorites without call history
    const fromCalls = callGroups.filter((g) =>
      favoriteConvIds.has(g.contactId),
    );
    const fromCallIds = new Set(fromCalls.map((g) => g.contactId));

    // Build entries for favorite conversations that don't have call history yet
    const extraFavs: CallGroup[] = conversations
      .filter((c) => c.isFavorite && !c.isArchived)
      .map((c) => {
        const otherId =
          c.participants.find((p) => p !== user?.id) ||
          c.participants[0] ||
          c.id;
        return { conv: c, otherId };
      })
      .filter(({ otherId }) => !fromCallIds.has(otherId))
      .map(({ conv, otherId }) => ({
        contactId: otherId,
        contactName: conv.name,
        contactAvatar: conv.avatar || null,
        contactGradient: conv.gradient,
        contactInitials: conv.initials,
        calls: [],
        lastCall: {
          id: `stub-${conv.id}`,
          contactId: otherId,
          contactName: conv.name,
          contactAvatar: conv.avatar || null,
          contactGradient: conv.gradient,
          contactInitials: conv.initials,
          direction: "outgoing" as const,
          callType: "voice" as const,
          result: "accepted" as const,
          timestamp: new Date().toISOString(),
        },
        count: 0,
      }));

    return [...fromCalls, ...extraFavs];
  }, [callGroups, favoriteConvIds, conversations, user?.id]);

  const recent = callGroups;

  // On mobile: when selecting a group, show detail
  const handleSelectGroup = (group: CallGroup) => {
    setSelectedGroup(group);
    setMobileShowDetail(true);
  };

  const handleCloseDetail = () => {
    setSelectedGroup(null);
    setMobileShowDetail(false);
  };

  const handleStartVoiceCall = () => {
    if (selectedGroup) {
      void webrtc.startCall(selectedGroup.contactId, false);
    }
  };

  const handleStartVideoCall = () => {
    if (selectedGroup) {
      void webrtc.startCall(selectedGroup.contactId, true);
    }
  };

  // Start call from modal (contact picker)
  const handleStartCallFromModal = useCallback(
    (contactId: string, withVideo: boolean) => {
      void webrtc.startCall(contactId, withVideo);
    },
    [webrtc],
  );

  // Call from dialpad (phone lookup)
  const handleCallFromDialpad = useCallback(
    (userId: string, withVideo: boolean) => {
      void webrtc.startCall(userId, withVideo);
    },
    [webrtc],
  );

  // Schedule call handler — sets up timers for auto-start and end
  const handleScheduleCall = useCallback(
    (scheduled: ScheduledCall) => {
      setScheduledCalls((prev) => [...prev, scheduled]);

      const startMs = new Date(scheduled.startDate).getTime() - Date.now();
      const endMs = new Date(scheduled.endDate).getTime() - Date.now();
      // Warning: 5 min before end
      const warnMs = endMs - 5 * 60 * 1000;

      // Timer to auto-start the call
      if (startMs > 0) {
        const startTimer = setTimeout(() => {
          // Auto-start: call participants
          if (scheduled.participants.length > 0) {
            void webrtc.startCall(
              scheduled.participants[0],
              scheduled.callType === "video",
            );
          }
          scheduledTimersRef.current.delete(scheduled.id);
        }, startMs);
        scheduledTimersRef.current.set(scheduled.id, startTimer);
      }

      // Timer to warn 5 min before end
      if (warnMs > 0) {
        const warnTimer = setTimeout(() => {
          const endTime = new Date(scheduled.endDate).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });
          // Show browser notification as warning
          if (Notification.permission === "granted") {
            new Notification("Scheduled call ending soon", {
              body: `"${scheduled.name}" will end at ${endTime}`,
              icon: "/favicon.ico",
            });
          }
          endWarningTimersRef.current.delete(scheduled.id);
        }, warnMs);
        endWarningTimersRef.current.set(scheduled.id, warnTimer);
      }

      // Send invite message to each participant
      if (user) {
        const payload: ScheduledCallPayload = {
          id: scheduled.id,
          name: scheduled.name,
          description: scheduled.description,
          startDate: scheduled.startDate,
          endDate: scheduled.endDate,
          callType: scheduled.callType,
          organizerName: user.displayName ?? "Unknown",
          participantCount: scheduled.participants.length,
        };
        const msgText = SCHEDULED_CALL_PREFIX + JSON.stringify(payload);
        for (const participantId of scheduled.participants) {
          const convId = [user.id, participantId].sort().join("___");
          sendScheduledCallInvite(convId, msgText);
        }
      }

      // Timer to auto-end the call
      if (endMs > 0) {
        const endTimer = setTimeout(() => {
          // If a call is active, end it
          if (
            webrtc.status === "connected" ||
            webrtc.status === "connecting" ||
            webrtc.status === "calling"
          ) {
            if (Notification.permission === "granted") {
              new Notification("Scheduled call ended", {
                body: `"${scheduled.name}" has ended`,
                icon: "/favicon.ico",
              });
            }
            webrtc.endCall();
          }
          // Remove from scheduled list
          setScheduledCalls((prev) =>
            prev.filter((c) => c.id !== scheduled.id),
          );
          endTimersRef.current.delete(scheduled.id);
        }, endMs);
        endTimersRef.current.set(scheduled.id, endTimer);
      }
    },
    [webrtc, user, sendScheduledCallInvite],
  );

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      scheduledTimersRef.current.forEach((t) => clearTimeout(t));
      endWarningTimersRef.current.forEach((t) => clearTimeout(t));
      endTimersRef.current.forEach((t) => clearTimeout(t));
    };
  }, []);

  // Request notification permission (for scheduled call warnings)
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      void Notification.requestPermission();
    }
  }, []);

  return (
    <div className="h-screen max-h-screen flex overflow-hidden font-sans bg-bg text-text-main">
      {/* Left: Call list */}
      <div
        className={`${mobileShowDetail ? "hidden" : "flex"} md:flex w-full md:w-auto relative`}
      >
        <CallsSidebar
          callGroups={recent}
          favorites={favorites}
          selectedCallGroup={selectedGroup}
          onSelectCallGroup={handleSelectGroup}
          onQuickCall={handleStartCallFromModal}
          onAddFavorite={() => setShowAddFavorites(true)}
        />
        {/* Dialpad overlays the sidebar */}
        <DialpadPanel
          open={showDialpad}
          onClose={() => setShowDialpad(false)}
          onCallUser={handleCallFromDialpad}
        />
      </div>

      {/* Right: Call detail */}
      <div
        className={`${mobileShowDetail ? "flex" : "hidden"} md:flex flex-1 min-w-0 h-full overflow-hidden`}
      >
        <CallInfoPanel
          callGroup={selectedGroup}
          onClose={handleCloseDetail}
          onStartVoiceCall={handleStartVoiceCall}
          onStartVideoCall={handleStartVideoCall}
          onStartCall={() => setShowStartCall(true)}
          onNewCallLink={() => setShowCallLink(true)}
          onCallNumber={() => setShowDialpad(true)}
          onScheduleCall={() => setShowScheduleCall(true)}
        />
      </div>

      {/* Modals */}
      <StartCallModal
        open={showStartCall}
        onClose={() => setShowStartCall(false)}
        onStartCall={handleStartCallFromModal}
      />
      <CallLinkModal
        open={showCallLink}
        onClose={() => setShowCallLink(false)}
      />
      <ScheduleCallModal
        open={showScheduleCall}
        onClose={() => setShowScheduleCall(false)}
        onSchedule={handleScheduleCall}
      />
      <AddToFavoritesModal
        open={showAddFavorites}
        onClose={() => setShowAddFavorites(false)}
      />
    </div>
  );
}
