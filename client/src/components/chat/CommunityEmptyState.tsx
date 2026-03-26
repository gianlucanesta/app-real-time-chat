import { Users } from "lucide-react";

export function CommunityEmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-bg gap-4">
      <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center">
        <Users className="w-10 h-10 text-accent" />
      </div>
      <h2 className="text-2xl font-bold text-text-main">Communities</h2>
      <p className="text-text-secondary text-center max-w-sm leading-relaxed">
        Bring members together in topic-based groups and send announcements to
        everyone easily.
      </p>
    </div>
  );
}
