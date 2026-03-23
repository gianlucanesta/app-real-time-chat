import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Lock,
  MessageSquare,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { apiFetch } from "../lib/api";
import { validatePasswordStrength } from "../lib/validation";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<"form" | "success" | "error">("form");
  const [message, setMessage] = useState("");

  const navigate = useNavigate();

  const token = new URLSearchParams(window.location.search).get("token");

  if (!token && status === "form") {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center p-4 sm:p-5 bg-bg text-text-main font-sans overflow-hidden auth-page-glow relative">
        <div className="w-full max-w-[440px] bg-card rounded-[16px] px-6 sm:px-8 py-10 relative z-10 flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 bg-danger/10 rounded-full flex items-center justify-center mb-4">
            <XCircle className="w-8 h-8 text-danger" />
          </div>
          <h1 className="text-xl font-bold text-text-main mb-2">
            Invalid Reset Link
          </h1>
          <p className="text-[14px] text-text-secondary mb-6">
            No reset token provided. Please request a new password reset.
          </p>
          <Link
            to="/forgot-password"
            className="text-accent hover:text-accent-hover transition-colors font-medium text-[14px]"
          >
            Request New Link
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setConfirmError("Passwords do not match");
      return;
    }

    const pwErr = validatePasswordStrength(password);
    if (pwErr) {
      setPasswordError(pwErr);
      return;
    }

    setIsLoading(true);

    try {
      const data = await apiFetch<{ message: string }>("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });
      setStatus("success");
      setMessage(data.message);
    } catch (err: any) {
      setStatus("error");
      setMessage(err.message || "Failed to reset password.");
    } finally {
      setIsLoading(false);
    }
  };

  if (status === "success") {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center p-4 sm:p-5 bg-bg text-text-main font-sans overflow-hidden auth-page-glow relative">
        <div className="w-full max-w-[440px] bg-card rounded-[16px] px-6 sm:px-8 py-10 relative z-10 flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="text-xl font-bold text-text-main mb-2">
            Password Reset!
          </h1>
          <p className="text-[14px] text-text-secondary mb-6">{message}</p>
          <Link
            to="/login"
            className="inline-block bg-accent text-white px-6 py-3 rounded-lg font-medium hover:bg-accent-hover transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center p-4 sm:p-5 bg-bg text-text-main font-sans overflow-hidden auth-page-glow relative">
        <div className="w-full max-w-[440px] bg-card rounded-[16px] px-6 sm:px-8 py-10 relative z-10 flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 bg-danger/10 rounded-full flex items-center justify-center mb-4">
            <XCircle className="w-8 h-8 text-danger" />
          </div>
          <h1 className="text-xl font-bold text-text-main mb-2">
            Reset Failed
          </h1>
          <p className="text-[14px] text-text-secondary mb-6">{message}</p>
          <Link
            to="/forgot-password"
            className="text-accent hover:text-accent-hover transition-colors font-medium text-[14px]"
          >
            Request New Link
          </Link>
        </div>
      </div>
    );
  }

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
            Set New Password
          </h1>
          <p className="text-[14px] text-text-secondary">
            Choose a strong password for your account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* New Password */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">NEW PASSWORD</Label>
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter new password"
              icon={<Lock className="w-5 h-5" />}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setPasswordError("");
                setConfirmError("");
              }}
              onBlur={() => {
                const err = validatePasswordStrength(password);
                setPasswordError(err || "");
              }}
              autoComplete="new-password"
              error={!!passwordError}
              required
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="flex items-center justify-center hover:text-text-main transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-[18px] h-[18px]" />
                  ) : (
                    <Eye className="w-[18px] h-[18px]" />
                  )}
                </button>
              }
            />
            {passwordError && (
              <p className="text-[13px] text-danger font-medium mt-1">
                {passwordError}
              </p>
            )}
          </div>

          {/* Confirm Password */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="confirmPassword">CONFIRM PASSWORD</Label>
            <Input
              id="confirmPassword"
              type={showConfirm ? "text" : "password"}
              placeholder="Confirm new password"
              icon={<Lock className="w-5 h-5" />}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setConfirmError("");
              }}
              onBlur={() => {
                if (confirmPassword && confirmPassword !== password) {
                  setConfirmError("Passwords do not match");
                }
              }}
              autoComplete="new-password"
              error={!!confirmError}
              required
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="flex items-center justify-center hover:text-text-main transition-colors"
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                >
                  {showConfirm ? (
                    <EyeOff className="w-[18px] h-[18px]" />
                  ) : (
                    <Eye className="w-[18px] h-[18px]" />
                  )}
                </button>
              }
            />
            {confirmError && (
              <p className="text-[13px] text-danger font-medium mt-1">
                {confirmError}
              </p>
            )}
          </div>

          {error && <div className="text-danger text-sm mt-1">{error}</div>}

          <Button
            type="submit"
            className="mt-2 w-full"
            disabled={isLoading || !!passwordError || !!confirmError}
          >
            {isLoading ? "Resetting..." : "Reset Password →"}
          </Button>
        </form>

        <div className="mt-8 text-center text-text-secondary text-[13px]">
          Remember your password?{" "}
          <Link
            to="/login"
            className="text-accent hover:text-accent-hover transition-colors font-medium"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
