import { useState, useEffect, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CallsSidebar } from "../components/chat/CallsSidebar";
import { CallInfoPanel } from "../components/chat/CallInfoPanel";
import { useChat } from "../contexts/ChatContext";
import type { CallGroup, CallRecord } from "../types";

export const Route = createFileRoute("/_authenticated/calls")({
  component: CallsPage,
});

/* ── Build demo call records from real conversations ───── */

function buildCallGroupsFromConversations(
  conversations: { id: string; name: string; avatar?: string; gradient: string; initials: string; participants: string[] }[],
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
    result: "accepted" | "missed" | "declined" | "no_answer" | "accepted_elsewhere";
    duration?: number;
  }[] = [
    { dayOffset: 0, hour: 14, minute: 32, direction: "incoming", callType: "voice", result: "accepted", duration: 245 },
    { dayOffset: 0, hour: 10, minute: 15, direction: "outgoing", callType: "video", result: "accepted", duration: 892 },
    { dayOffset: 1, hour: 18, minute: 41, direction: "incoming", callType: "voice", result: "accepted_elsewhere" },
    { dayOffset: 1, hour: 9, minute: 5, direction: "outgoing", callType: "voice", result: "no_answer" },
    { dayOffset: 2, hour: 20, minute: 12, direction: "outgoing", callType: "video", result: "accepted", duration: 1520 },
    { dayOffset: 2, hour: 16, minute: 30, direction: "incoming", callType: "voice", result: "missed" },
    { dayOffset: 3, hour: 11, minute: 22, direction: "incoming", callType: "voice", result: "accepted", duration: 67 },
    { dayOffset: 4, hour: 15, minute: 45, direction: "outgoing", callType: "video", result: "declined" },
    { dayOffset: 5, hour: 13, minute: 8, direction: "incoming", callType: "voice", result: "accepted", duration: 412 },
    { dayOffset: 6, hour: 17, minute: 55, direction: "outgoing", callType: "voice", result: "accepted", duration: 180 },
    { dayOffset: 7, hour: 8, minute: 30, direction: "incoming", callType: "video", result: "missed" },
    { dayOffset: 10, hour: 19, minute: 15, direction: "outgoing", callType: "voice", result: "accepted", duration: 95 },
    { dayOffset: 12, hour: 12, minute: 0, direction: "incoming", callType: "voice", result: "accepted", duration: 320 },
  ];

  // Take up to 6 conversations for demo data
  const subset = conversations.slice(0, Math.min(6, conversations.length));

  subset.forEach((conv, idx) => {
    // Each conversation gets 1-3 calls
    const numCalls = Math.min(3, callTemplates.length - idx * 2);
    const calls: CallRecord[] = [];

    for (let j = 0; j < numCalls && idx * 2 + j < callTemplates.length; j++) {
      const tpl = callTemplates[idx * 2 + j];
      const ts = new Date(now - tpl.dayOffset * day);
      ts.setHours(tpl.hour, tpl.minute, 0, 0);

      calls.push({
        id: `call-${conv.id}-${j}`,
        contactId: conv.participants[0] || conv.id,
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
      calls.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      groups.push({
        contactId: conv.participants[0] || conv.id,
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
  const { conversations, webrtc } = useChat();
  const [selectedGroup, setSelectedGroup] = useState<CallGroup | null>(null);
  const [mobileShowDetail, setMobileShowDetail] = useState(false);

  // Build call groups from conversations
  const callGroups = useMemo(
    () => buildCallGroupsFromConversations(conversations),
    [conversations],
  );

  // First 2 groups act as favorites
  const favorites = useMemo(() => callGroups.slice(0, 2), [callGroups]);
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

  return (
    <div className="h-screen max-h-screen flex overflow-hidden font-sans bg-bg text-text-main">
      {/* Left: Call list */}
      <div
        className={`${mobileShowDetail ? "hidden" : "flex"} md:flex w-full md:w-auto`}
      >
        <CallsSidebar
          callGroups={recent}
          favorites={favorites}
          selectedCallGroup={selectedGroup}
          onSelectCallGroup={handleSelectGroup}
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
        />
      </div>
    </div>
  );
}
