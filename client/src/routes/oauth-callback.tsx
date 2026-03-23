import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { MessageSquare } from "lucide-react";
import { setAccessToken } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";

export const Route = createFileRoute("/oauth-callback")({
  component: OAuthCallbackPage,
});

function OAuthCallbackPage() {
  const navigate = useNavigate();
  const { checkAuth } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get("accessToken");
    const error = params.get("error");

    if (error || !accessToken) {
      navigate({ to: "/login", search: { error: "google_failed" } as any });
      return;
    }

    setAccessToken(accessToken);
    checkAuth().then(() => {
      navigate({ to: "/" });
    });
  }, []);

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
