import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ChannelsSidebar } from "../components/chat/ChannelsSidebar";
import { ChannelEmptyState } from "../components/chat/ChannelEmptyState";
import type { Channel } from "../types";

export const Route = createFileRoute("/_authenticated/channels")({
  component: ChannelsPage,
});

function ChannelsPage() {
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);

  return (
    <div className="h-full flex overflow-hidden font-sans bg-bg text-text-main">
      {/* Sidebar */}
      <div className="flex w-full md:w-auto">
        <ChannelsSidebar
          selectedChannel={selectedChannel}
          onSelectChannel={setSelectedChannel}
        />
      </div>

      {/* Main content area */}
      <div className="hidden md:flex flex-1 min-w-0 h-full overflow-hidden">
        <ChannelEmptyState />
      </div>
    </div>
  );
}
