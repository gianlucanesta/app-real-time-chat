/**
 * Animated skeleton placeholder for loading states.
 * Renders a pulsing rounded rectangle.
 */
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-input/60 ${className}`}
      aria-hidden="true"
    />
  );
}

/**
 * Skeleton representation of a single conversation row.
 */
export function ConversationSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5" aria-hidden="true">
      <Skeleton className="w-[48px] h-[48px] md:w-[42px] md:h-[42px] rounded-full shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-3 w-10" />
        </div>
        <Skeleton className="h-3 w-44" />
      </div>
    </div>
  );
}

/**
 * A list of skeleton conversation rows shown while data is loading.
 */
export function SidebarSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div role="status" aria-label="Loading conversations">
      <span className="sr-only">Loading conversations…</span>
      {Array.from({ length: count }, (_, i) => (
        <ConversationSkeleton key={i} />
      ))}
    </div>
  );
}
