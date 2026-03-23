import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { MessageSquare, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { apiFetch } from "../lib/api";

export const Route = createFileRoute("/verify-email")({
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (!token) {
      setStatus("error");
      setMessage("Invalid verification link — no token provided.");
      return;
    }

    apiFetch<{ message: string }>(
      `/auth/verify-email?token=${encodeURIComponent(token)}`,
      {
        method: "GET",
      },
    )
      .then((data) => {
        setStatus("success");
        setMessage(data.message);
      })
      .catch((err: any) => {
        setStatus("error");
        setMessage(err.message || "Verification failed.");
      });
  }, []);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center p-4 sm:p-5 bg-bg text-text-main font-sans overflow-hidden auth-page-glow relative">
      <div className="w-full max-w-[440px] bg-card rounded-[16px] px-6 sm:px-8 py-10 relative z-10 flex flex-col items-center text-center mb-8">
        <div className="flex justify-center mb-4">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-accent rounded-md flex items-center justify-center text-white">
            <MessageSquare className="w-6 h-6 md:w-7 md:h-7 fill-current" />
          </div>
        </div>

        {status === "loading" && (
          <>
            <Loader2 className="w-12 h-12 text-accent animate-spin mb-4" />
            <h1 className="text-xl font-bold text-text-main mb-2">
              Verifying your email...
            </h1>
            <p className="text-[14px] text-text-secondary">
              Please wait a moment.
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h1 className="text-xl font-bold text-text-main mb-2">
              Email Verified!
            </h1>
            <p className="text-[14px] text-text-secondary mb-6">{message}</p>
            <Link
              to="/login"
              className="inline-block bg-accent text-white px-6 py-3 rounded-lg font-medium hover:bg-accent-hover transition-colors"
            >
              Sign In
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-16 h-16 bg-danger/10 rounded-full flex items-center justify-center mb-4">
              <XCircle className="w-8 h-8 text-danger" />
            </div>
            <h1 className="text-xl font-bold text-text-main mb-2">
              Verification Failed
            </h1>
            <p className="text-[14px] text-text-secondary mb-6">{message}</p>
            <Link
              to="/login"
              className="text-accent hover:text-accent-hover transition-colors font-medium text-[14px]"
            >
              Back to Sign In
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
