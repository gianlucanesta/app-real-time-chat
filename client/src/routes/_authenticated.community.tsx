import { createFileRoute } from "@tanstack/react-router";
import { Users } from "lucide-react";

export const Route = createFileRoute("/_authenticated/community")({
  component: CommunityPage,
});

function CommunityPage() {
  return (
    <div className="h-full flex overflow-hidden font-sans bg-bg text-text-main">
      {/* Sidebar */}
      <div className="flex w-full md:w-[360px] md:min-w-[360px] flex-col border-r border-border h-full">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h1 className="text-xl font-semibold">Community</h1>
          <button className="w-9 h-9 rounded-md flex items-center justify-center text-text-secondary hover:text-text-main hover:bg-input transition-colors">
            <Users size={20} />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <p className="text-text-secondary text-sm text-center">
            Community feature coming soon.
          </p>
        </div>
      </div>

      {/* Main content area */}
      <div className="hidden md:flex flex-1 min-w-0 h-full overflow-hidden items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center px-6">
          <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center">
            <Users size={32} className="text-accent" />
          </div>
          <h2 className="text-2xl font-semibold">Create community</h2>
          <p className="text-text-secondary max-w-md">
            Bring members together in topic-based groups and send announcements
            to everyone easily.
          </p>
        </div>
      </div>
    </div>
  );
}
