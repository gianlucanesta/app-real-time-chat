import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";
import { setAccessToken } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";

export const Route = createFileRoute("/oauth-callback")({
  component: OAuthCallbackPage,
});

function OAuthCallbackPage() {
  const navigate = useNavigate();
  const { checkAuth, isAuthenticated } = useAuth();
  const [authAttempted, setAuthAttempted] = useState(false);

  // Step 1: set the token and kick off the auth check.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get("accessToken");
    const error = params.get("error");

    if (error || !accessToken) {
      navigate({ to: "/login", search: { error: error ?? "oauth_failed" } as any });
      return;
    }

    setAccessToken(accessToken);
    checkAuth().finally(() => setAuthAttempted(true));
  }, []);

  // Step 2: once checkAuth() resolves and React has re-rendered with the new
  // auth state, navigate to the correct destination.  Doing the navigation
  // here (rather than in a .then()) avoids a race where the router's
  // beforeLoad guard reads stale context before the state update is applied.
  useEffect(() => {
    if (!authAttempted) return;
    if (isAuthenticated) {
      navigate({ to: "/" });
    } else {
      navigate({ to: "/login", search: { error: "oauth_failed" } as any });
    }
  }, [authAttempted, isAuthenticated, navigate]);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-bg text-text-main">
      <div className="flex flex-col items-center gap-5">
        <div className="w-12 h-12 bg-accent rounded-md flex items-center justify-center text-white">
          <MessageSquare className="w-7 h-7 fill-current" />
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-[14px] text-text-secondary">Signing you in…</p>
        </div>
      </div>
    </div>
  );
}
