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
  const { mobileInChat } = useChat();
  return (
    <div className="flex h-screen w-full overflow-hidden bg-bg">
      <VerticalNav />
      <main
        className={`flex-1 h-full relative md:pl-[60px] md:pb-0 ${mobileInChat ? "" : "pb-[64px]"}`}
      >
        <Outlet />
      </main>
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
