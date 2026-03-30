import {
  createFileRoute,
  Outlet,
  redirect,
  useNavigate,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { VerticalNav } from "../components/layout/VerticalNav";
import { ChatProvider, useChat } from "../contexts/ChatContext";
import { useAuth } from "../contexts/AuthContext";
import { CallScreen } from "../components/chat/CallScreen";
import { IncomingCallBanner } from "../components/chat/IncomingCallBanner";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: ({ context, location }) => {
    // While checkAuth is still in flight, let the component handle the
    // loading state rather than redirecting prematurely.
    if (context.auth.isLoading) return;
    if (!context.auth.isAuthenticated) {
      throw redirect({
        to: "/login",
        search: {
          redirect: location.href,
        },
      });
    }
  },
  component: AuthenticatedLayout,
});

function LayoutContent() {
  const { mobileInChat, conversations, webrtc } = useChat();
  const { user } = useAuth();

  // Derive contact info from conversations using the callContactId
  const callConv = conversations.find(
    (c) =>
      webrtc.callContactId && c.participants.includes(webrtc.callContactId),
  );
  const contactName = callConv?.name ?? webrtc.incomingCall?.fromName ?? "";
  const contactInitials = callConv?.initials ?? "";
  const contactGradient =
    callConv?.gradient ?? "linear-gradient(135deg,#2563EB,#7C3AED)";
  const contactAvatarUrl = callConv?.avatar ?? null;

  // Current user info
  const myInitials = user?.displayName
    ? user.displayName
        .split(" ")
        .map((w: string) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "";
  const myGradient =
    user?.avatarGradient ?? "linear-gradient(135deg,#2563EB,#7C3AED)";
  const myAvatarUrl = user?.avatarUrl ?? null;

  return (
    <div className="flex h-full w-full overflow-hidden bg-bg">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-accent focus:text-white focus:px-4 focus:py-2 focus:rounded"
      >
        Skip to main content
      </a>
      <VerticalNav />
      <main
        id="main-content"
        className={`flex-1 h-full relative overflow-hidden md:pl-[60px] md:pb-0 ${mobileInChat ? "" : "pb-[64px]"}`}
      >
        <Outlet />
      </main>

      {/* Global incoming call banner — visible across the whole app */}
      {webrtc.incomingCall && webrtc.status === "incoming" && (
        <IncomingCallBanner
          data={webrtc.incomingCall}
          onAnswer={() => void webrtc.answerCall()}
          onReject={webrtc.rejectCall}
        />
      )}

      {/* Global call screen — fixed full-viewport overlay */}
      <CallScreen
        status={webrtc.status}
        contactName={contactName}
        contactInitials={contactInitials}
        contactGradient={contactGradient}
        contactAvatarUrl={contactAvatarUrl}
        contactPhone={callConv?.phone}
        localInitials={myInitials}
        localGradient={myGradient}
        localAvatarUrl={myAvatarUrl}
        localStream={webrtc.localStream}
        remoteStream={webrtc.remoteStream}
        isMuted={webrtc.isMuted}
        isCameraOff={webrtc.isCameraOff}
        isScreenSharing={webrtc.isScreenSharing}
        remoteIsScreenSharing={webrtc.remoteIsScreenSharing}
        callWithVideo={webrtc.callWithVideo}
        onEndCall={webrtc.endCall}
        onToggleMute={webrtc.toggleMute}
        onToggleCamera={webrtc.toggleCamera}
        onToggleScreenShare={() => void webrtc.toggleScreenShare()}
        onRetry={webrtc.retryCall}
      />
    </div>
  );
}

function AuthenticatedLayout() {
  const { isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate({
        to: "/login",
        search: { redirect: window.location.pathname },
      });
    }
  }, [isLoading, isAuthenticated, navigate]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-bg">
        <span className="w-8 h-8 rounded-full border-4 border-accent border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <ChatProvider>
      <LayoutContent />
    </ChatProvider>
  );
}
