import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex flex-col justify-center items-center text-center flex-1 gap-6 px-4">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-bold tracking-tight">Ephemeral</h1>
        <p className="text-lg text-fd-muted-foreground max-w-lg">
          A full-stack real-time chat application with ephemeral messages,
          WebRTC calls, and WhatsApp-like stories — built with React, Socket.io,
          and a polyglot persistence backend.
        </p>
      </div>
      <div className="flex gap-3">
        <Link
          href="/docs"
          className="px-5 py-2.5 rounded-lg bg-fd-primary text-fd-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity"
        >
          Read the Docs
        </Link>
        <a
          href="https://github.com/gianlucaromeo/app-real-time-chat"
          target="_blank"
          rel="noopener noreferrer"
          className="px-5 py-2.5 rounded-lg border border-fd-border font-medium text-sm hover:bg-fd-muted transition-colors"
        >
          GitHub
        </a>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 max-w-2xl w-full text-left">
        <div className="p-4 rounded-lg border border-fd-border">
          <h3 className="font-semibold mb-1">Ephemeral Messages</h3>
          <p className="text-sm text-fd-muted-foreground">
            All messages auto-expire after 24h via MongoDB TTL indexes and Redis
            keyspace events.
          </p>
        </div>
        <div className="p-4 rounded-lg border border-fd-border">
          <h3 className="font-semibold mb-1">Real-Time</h3>
          <p className="text-sm text-fd-muted-foreground">
            Socket.io for instant messaging, typing indicators, presence, and
            delivery receipts.
          </p>
        </div>
        <div className="p-4 rounded-lg border border-fd-border">
          <h3 className="font-semibold mb-1">WebRTC Calls</h3>
          <p className="text-sm text-fd-muted-foreground">
            Peer-to-peer voice and video calls with screen sharing and ICE
            restart logic.
          </p>
        </div>
      </div>
    </div>
  );
}
