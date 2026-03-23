import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, MessageSquare, ArrowLeft } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { apiFetch } from "../lib/api";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await apiFetch("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } catch {
      // Always show success to prevent email enumeration
      setSent(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center p-4 sm:p-5 bg-bg text-text-main font-sans overflow-hidden auth-page-glow relative">
      <div className="w-full max-w-[440px] bg-card rounded-[16px] px-6 sm:px-8 py-8 sm:py-10 relative z-10 flex flex-col mb-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3 md:mb-4">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-accent rounded-md flex items-center justify-center text-white">
              <MessageSquare className="w-6 h-6 md:w-7 md:h-7 fill-current" />
            </div>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-text-main mb-1">
            {sent ? "Check your email" : "Forgot Password"}
          </h1>
          <p className="text-[14px] text-text-secondary">
            {sent
              ? "If an account exists, we sent a reset link."
              : "Enter your email and we'll send you a reset link."}
          </p>
        </div>

        {sent ? (
          <div className="flex flex-col items-center gap-6">
            <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center">
              <Mail className="w-8 h-8 text-accent" />
            </div>
            <p className="text-[14px] text-text-secondary text-center leading-relaxed max-w-[340px]">
              We've sent a password reset link to{" "}
              <strong className="text-text-main">{email}</strong>. The link
              expires in 1 hour.
            </p>
            <p className="text-[13px] text-text-secondary">
              Didn't receive it? Check your spam folder or{" "}
              <button
                onClick={() => setSent(false)}
                className="text-accent hover:text-accent-hover transition-colors font-medium"
              >
                try again
              </button>
            </p>
            <Link
              to="/login"
              className="flex items-center gap-1.5 text-accent hover:text-accent-hover transition-colors font-medium text-[14px]"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Sign In
            </Link>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">EMAIL</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  icon={<Mail className="w-5 h-5" />}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailError("");
                  }}
                  onBlur={() => {
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (email && !emailRegex.test(email)) {
                      setEmailError("Please enter a valid email address.");
                    }
                  }}
                  autoComplete="email"
                  error={!!emailError}
                  required
                />
                {emailError && (
                  <p className="text-[13px] text-danger font-medium mt-1">
                    {emailError}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="mt-2 w-full"
                disabled={isLoading || !!emailError}
              >
                {isLoading ? "Sending..." : "Send Reset Link →"}
              </Button>
            </form>

            <div className="mt-8 text-center">
              <Link
                to="/login"
                className="flex items-center justify-center gap-1.5 text-accent hover:text-accent-hover transition-colors font-medium text-[14px]"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Sign In
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
