import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { VerticalNav } from "../components/layout/VerticalNav";
import { ChatProvider } from "../contexts/ChatContext";
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

function AuthenticatedLayout() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-bg">
        <span className="w-8 h-8 rounded-full border-4 border-accent border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <ChatProvider>
      <div className="flex h-screen w-full overflow-hidden bg-bg">
        <VerticalNav />
        <main className="flex-1 h-full relative md:pl-[60px] pb-[64px] md:pb-0">
          <Outlet />
        </main>
      </div>
    </ChatProvider>
  );
}
