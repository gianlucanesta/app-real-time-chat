import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useCallback } from "react";
import { Mail, Lock, Eye, EyeOff, ChevronDown } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import EphemeralBrand from "../components/ui/EphemeralBrand";
import { DottedGlowBackground } from "../components/ui/dotted-glow-background";
import { useAuth } from "../contexts/AuthContext";
import { apiFetch } from "../lib/api";
import type { AuthResponse } from "../types";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3001/api";
const GOOGLE_AUTH_URL = `${API_BASE}/auth/google`;
const FACEBOOK_AUTH_URL = `${API_BASE}/auth/facebook`;
const MICROSOFT_AUTH_URL = `${API_BASE}/auth/microsoft`;
const GITHUB_AUTH_URL = `${API_BASE}/auth/github`;

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [keepLoggedIn, setKeepLoggedIn] = useState(false);
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [socialExpanded, setSocialExpanded] = useState(false);
  const [emailShake, setEmailShake] = useState(false);
  const [formShake, setFormShake] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [emailNotVerified, setEmailNotVerified] = useState(false);
  const emailErrorKey = useRef(0);
  const errorKey = useRef(0);

  const navigate = useNavigate();
  const { login } = useAuth();

  const triggerShake = useCallback((setter: (v: boolean) => void) => {
    setter(true);
    setTimeout(() => setter(false), 500);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setEmailNotVerified(false);
    setIsLoading(true);

    try {
      const data = await apiFetch<AuthResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      login(data);
      setLoginSuccess(true);
      setTimeout(() => {
        navigate({ to: "/" });
      }, 1800);
    } catch (err: any) {
      // Check if the error response contains emailNotVerified flag
      if (err.message?.includes("verify your email")) {
        setEmailNotVerified(true);
      }
      errorKey.current += 1;
      setError(err.message || "Failed to login");
      triggerShake(setFormShake);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 overflow-y-auto auth-page-glow relative">
      <DottedGlowBackground
        className="pointer-events-none"
        colorLightVar="--color-text-secondary"
        colorDarkVar="--color-text-secondary"
        glowColorLightVar="--color-accent"
        glowColorDarkVar="--color-accent"
        gap={18}
        radius={1.5}
        opacity={0.6}
        speedMin={0.3}
        speedMax={1.2}
      />
      <div className="min-h-full flex flex-col items-center justify-center py-8 px-4 sm:px-5 bg-bg text-text-main font-sans">
        {loginSuccess && (
          <div className="fixed inset-0 z-50 flex items-center justify-center success-modal-overlay">
            <div className="bg-card rounded-2xl px-10 py-10 flex flex-col items-center gap-5 success-modal-card border border-border shadow-2xl">
              <svg
                className="w-[84px] h-[84px]"
                viewBox="0 0 52 52"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle
                  cx="26"
                  cy="26"
                  r="24"
                  stroke="var(--color-success)"
                  strokeWidth="2"
                  className="check-circle"
                />
                <path
                  d="M14 27l8 8 16-16"
                  stroke="var(--color-success)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="check-mark"
                />
              </svg>
              <div className="text-center">
                <p className="text-[20px] font-bold text-text-main">
                  Welcome back!
                </p>
                <p className="text-[13px] text-text-secondary mt-1.5">
                  Signing you in...
                </p>
              </div>
            </div>
          </div>
        )}
        <div
          className={`w-full max-w-[440px] bg-card rounded-[16px] px-6 sm:px-8 py-8 sm:py-10 relative z-10 flex flex-col${formShake ? " field-shake" : ""}`}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <EphemeralBrand />
            <h1 className="text-xl md:text-2xl font-bold text-text-main mb-1">
              Welcome Back
            </h1>
            <p className="text-[14px] text-text-secondary">
              Experience the next era of messaging
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Email */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="email">EMAIL</Label>
              </div>
              <div className={emailShake ? "field-shake" : ""}>
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
                      emailErrorKey.current += 1;
                      setEmailError("Please enter a valid email address.");
                      triggerShake(setEmailShake);
                    } else {
                      setEmailError("");
                    }
                  }}
                  autoComplete="email"
                  error={!!emailError}
                  required
                />
              </div>
              {emailError && (
                <p
                  key={emailErrorKey.current}
                  className="error-msg text-[13px] text-danger font-medium mt-1"
                >
                  {emailError}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="password">PASSWORD</Label>
                <Link
                  to="/forgot-password"
                  className="text-[12px] font-medium text-accent hover:text-accent-hover p-2 -m-2 inline-block relative z-10"
                >
                  Forgot?
                </Link>
              </div>
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                icon={<Lock className="w-5 h-5" />}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="flex items-center justify-center hover:text-text-main transition-colors"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="w-[18px] h-[18px]" />
                    ) : (
                      <Eye className="w-[18px] h-[18px]" />
                    )}
                  </button>
                }
              />
            </div>

            {/* Keep me logged in */}
            <label className="flex items-center gap-2 cursor-pointer group mt-1">
              <div className="relative flex items-center justify-center w-4 h-4 border border-border rounded-[4px] bg-transparent overflow-hidden">
                <input
                  type="checkbox"
                  checked={keepLoggedIn}
                  onChange={(e) => setKeepLoggedIn(e.target.checked)}
                  className="peer w-4 h-4 opacity-0 absolute cursor-pointer"
                />
                <div className="absolute inset-0 bg-accent hidden peer-checked:block" />
                <svg
                  className="w-3 h-3 text-white hidden peer-checked:block absolute pointer-events-none"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <span className="text-[14px] text-text-secondary group-hover:text-text-main transition-colors">
                Keep me logged in
              </span>
            </label>

            {error && (
              <div
                key={errorKey.current}
                className="error-msg fade-in-down flex items-start gap-2 rounded-md bg-danger/10 border border-danger/30 px-3 py-2.5 text-danger text-sm mt-1"
              >
                <svg
                  className="w-4 h-4 mt-0.5 shrink-0"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                    clipRule="evenodd"
                  />
                </svg>
                <div className="flex flex-col gap-1">
                  <span>{error}</span>
                  {emailNotVerified && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await apiFetch("/auth/resend-verification", {
                            method: "POST",
                            body: JSON.stringify({ email }),
                          });
                          setError(
                            "Verification email resent! Check your inbox.",
                          );
                          setEmailNotVerified(false);
                        } catch {}
                      }}
                      className="text-accent hover:text-accent-hover text-[13px] font-medium text-left"
                    >
                      Resend verification email
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              className="mt-2 w-full"
              disabled={isLoading || !!emailError || loginSuccess}
            >
              {isLoading ? "Signing In..." : "Sign In →"}
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 text-text-secondary text-[11px] font-medium uppercase tracking-[1px] my-6 before:flex-1 before:h-px before:bg-border after:flex-1 after:h-px after:bg-border">
            <span>Or continue with</span>
          </div>

          {/* Social buttons */}
          <div className="flex flex-col gap-3">
            <Button
              variant="social"
              className="w-full text-[14px] font-medium h-[40px]"
              onClick={() => {
                window.location.href = GOOGLE_AUTH_URL;
              }}
            >
              <svg viewBox="0 0 24 24" className="w-[20px] h-[20px]">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Google
            </Button>
            <Button
              variant="social"
              className="w-full text-[14px] font-medium h-[40px]"
              onClick={() => {
                window.location.href = MICROSOFT_AUTH_URL;
              }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="#00A4EF"
                className="w-[20px] h-[20px]"
              >
                <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zM24 11.4H12.6V0H24v11.4z" />
              </svg>
              Microsoft
            </Button>

            {/* More options expand/collapse */}
            <button
              type="button"
              onClick={() => setSocialExpanded(!socialExpanded)}
              className="flex items-center justify-center gap-1.5 text-[13px] text-text-secondary hover:text-text-main transition-colors py-1.5"
              aria-expanded={socialExpanded}
            >
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${
                  socialExpanded ? "rotate-180" : ""
                }`}
              />
              <span>{socialExpanded ? "Less options" : "More options"}</span>
            </button>

            {/* Extra social buttons */}
            <div
              className={`flex flex-col gap-3 overflow-hidden transition-all duration-300 ${
                socialExpanded
                  ? "max-h-[200px] opacity-100"
                  : "max-h-0 opacity-0"
              }`}
            >
              <Button
                variant="social"
                className="w-full text-[14px] font-medium h-[40px]"
                onClick={() => {
                  window.location.href = GITHUB_AUTH_URL;
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-[20px] h-[20px]"
                >
                  <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
                </svg>
                GitHub
              </Button>
              <Button
                variant="social"
                className="w-full text-[14px] font-medium h-[40px]"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-[20px] h-[20px]"
                >
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1 0-5.78 2.92 2.92 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 3 15.57 6.33 6.33 0 0 0 9.37 22a6.33 6.33 0 0 0 6.37-6.23V9.34a8.16 8.16 0 0 0 4.85 1.58V7.5a4.85 4.85 0 0 1-1-.81z" />
                </svg>
                TikTok
              </Button>
              <Button
                variant="social"
                className="w-full text-[14px] font-medium h-[40px]"
                onClick={() => {
                  window.location.href = FACEBOOK_AUTH_URL;
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="#1877F2"
                  className="w-[20px] h-[20px]"
                >
                  <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073c0 6.026 4.388 11.018 10.125 11.927v-8.437H7.078v-3.49h3.047V9.41c0-3.026 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.971H15.83c-1.491 0-1.956.93-1.956 1.886v2.267h3.328l-.532 3.49h-2.796v8.437C19.612 23.09 24 18.1 24 12.073z" />
                </svg>
                Meta
              </Button>
            </div>
          </div>

          {/* Footer Toggle */}
          <div className="text-center mt-6 text-[14px] text-text-secondary">
            Don't have an account?{" "}
            <Link
              to="/signup"
              className="text-accent font-medium hover:text-accent-hover p-2 -m-2 inline-block relative z-10"
            >
              Create one
            </Link>
          </div>
        </div>

        {/* Page Footer */}
        <footer className="flex justify-center gap-4 sm:gap-5 text-[12px] text-text-secondary mt-6 pb-4 w-full">
          <Link
            to="/privacy-policy"
            className="hover:text-text-main transition-colors p-2 -m-2"
          >
            Privacy Policy
          </Link>
          <Link
            to="/terms-of-service"
            className="hover:text-text-main transition-colors p-2 -m-2"
          >
            Terms of Service
          </Link>
          <Link
            to="/support"
            className="hover:text-text-main transition-colors p-2 -m-2"
          >
            Support
          </Link>
        </footer>
      </div>
    </div>
  );
}
