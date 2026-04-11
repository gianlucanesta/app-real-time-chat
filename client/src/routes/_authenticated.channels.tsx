import { useState, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ChannelsSidebar } from "../components/chat/ChannelsSidebar";
import { ChannelEmptyState } from "../components/chat/ChannelEmptyState";
import { ChannelChatView } from "../components/chat/ChannelChatView";
import { apiFetch } from "../lib/api";
import type { Channel } from "../types";

export const Route = createFileRoute("/_authenticated/channels")({
  component: ChannelsPage,
});

function ChannelsPage() {
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);

  const handleUnfollow = useCallback(
    async (channelId: string) => {
      try {
        await apiFetch(`/channels/${channelId}/follow`, { method: "DELETE" });
        setSelectedChannel(null);
      } catch (err) {
        console.error("Failed to unfollow channel:", err);
      }
    },
    [],
  );

  return (
    <div className="h-full flex overflow-hidden font-sans bg-bg text-text-main">
      {/* Sidebar */}
      <div className={`flex w-full md:w-auto ${selectedChannel ? "hidden md:flex" : "flex"}`}>
        <ChannelsSidebar
          selectedChannel={selectedChannel}
          onSelectChannel={setSelectedChannel}
        />
      </div>

      {/* Main content area */}
      <div className={`flex-1 min-w-0 h-full overflow-hidden ${selectedChannel ? "flex" : "hidden md:flex"}`}>
        {selectedChannel ? (
          <ChannelChatView
            channel={selectedChannel}
            onBack={() => setSelectedChannel(null)}
            onUnfollow={handleUnfollow}
          />
        ) : (
          <ChannelEmptyState />
        )}
      </div>
    </div>
  );
}
