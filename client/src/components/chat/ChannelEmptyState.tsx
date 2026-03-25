import { Megaphone } from "lucide-react";

export function ChannelEmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-bg gap-4">
      {/* Icon */}
      <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center">
        <Megaphone className="w-10 h-10 text-accent" />
      </div>

      {/* Heading */}
      <h2 className="text-2xl font-bold text-text-main">
        Suggested Channels
      </h2>

      {/* Description */}
      <p className="text-text-secondary text-center max-w-sm leading-relaxed">
        Entertainment, sports, news, lifestyle, people and more.
        Follow the channels that interest you.
      </p>
    </div>
  );
}
