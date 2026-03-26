import { useState, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CommunitySidebar } from "../components/chat/CommunitySidebar";
import { CommunityEmptyState } from "../components/chat/CommunityEmptyState";
import { CommunityDetail } from "../components/chat/CommunityDetail";
import { CreateCommunityModal } from "../components/chat/CreateCommunityModal";
import { apiFetch } from "../lib/api";
import type { Community } from "../types";

export const Route = createFileRoute("/_authenticated/community")({
  component: CommunityPage,
});

function CommunityPage() {
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(
    null,
  );
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const triggerRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
    // If a community was selected, refresh it
    if (selectedCommunity) {
      apiFetch<{ community: Community }>(`/communities/${selectedCommunity.id}`)
        .then(({ community }) => setSelectedCommunity(community))
        .catch(() => setSelectedCommunity(null));
    }
  }, [selectedCommunity]);

  return (
    <div className="h-full flex overflow-hidden font-sans bg-bg text-text-main">
      {/* Sidebar */}
      <div
        className={`${selectedCommunity ? "hidden" : "flex"} md:flex w-full md:w-auto`}
      >
        <CommunitySidebar
          key={refreshKey}
          selectedCommunity={selectedCommunity}
          onSelectCommunity={setSelectedCommunity}
          onCreateCommunity={() => setIsCreateOpen(true)}
        />
      </div>

      {/* Main content area */}
      <div
        className={`${selectedCommunity ? "flex" : "hidden"} md:flex flex-1 min-w-0 h-full overflow-hidden`}
      >
        {selectedCommunity ? (
          <CommunityDetail
            community={selectedCommunity}
            onBack={() => setSelectedCommunity(null)}
            onUpdated={triggerRefresh}
          />
        ) : (
          <CommunityEmptyState />
        )}
      </div>

      {/* Create Community Modal */}
      <CreateCommunityModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={triggerRefresh}
      />
    </div>
  );
}
