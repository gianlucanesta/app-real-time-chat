import { useState } from "react";
import {
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  FileText,
  Trash2,
  AlertTriangle,
  X,
} from "lucide-react";
import { useSettings } from "../../contexts/SettingsContext";
import { useAuth } from "../../contexts/AuthContext";
import { apiFetch } from "../../lib/api";
import { useNavigate } from "@tanstack/react-router";

// ── Toggle ──────────────────────────────────────────────────────────────
function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-[26px] w-[46px] shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
        checked ? "bg-[#2563eb]" : "bg-[var(--color-border)]"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-[22px] w-[22px] rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? "translate-x-[20px]" : "translate-x-0"
        }`}
      />
    </button>
  );
}

// ── Sub-views ───────────────────────────────────────────────────────────
type SubView = null | "security" | "request-info" | "delete";

const CONFIRMATION_TEXT = "yes I'm sure, I want to delete my account";

// ── Main component ──────────────────────────────────────────────────────
export function AccountSettings() {
  const { settings, updateSetting } = useSettings();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [subView, setSubView] = useState<SubView>(null);

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Report request state
  const [reportRequested, setReportRequested] = useState(false);
  const [channelReportRequested, setChannelReportRequested] = useState(false);

  // ── Delete account handler ────────────────────────────────────────────
  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      await apiFetch("/users/me", { method: "DELETE" });
      logout();
      navigate({ to: "/login" });
    } catch {
      setDeleting(false);
    }
  }

  // ── Report request handlers ───────────────────────────────────────────
  async function handleRequestReport() {
    try {
      await apiFetch("/users/me/report", { method: "POST" });
      setReportRequested(true);
    } catch {
      /* silent */
    }
  }

  async function handleRequestChannelReport() {
    try {
      await apiFetch("/users/me/report/channels", { method: "POST" });
      setChannelReportRequested(true);
    } catch {
      /* silent */
    }
  }

  // ── Delete confirmation modal ─────────────────────────────────────────
  if (showDeleteModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-bg rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden border border-border">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="text-[16px] font-semibold text-text-main">
              Delete My Account
            </h2>
            <button
              type="button"
              onClick={() => {
                setShowDeleteModal(false);
                setDeleteInput("");
              }}
              className="p-1 rounded-full hover:bg-input/50 transition-colors"
            >
              <X className="w-5 h-5 text-text-secondary" />
            </button>
          </div>

          {/* Body */}
          <div className="px-5 py-5 space-y-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-red-500/10">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-[14px] font-medium text-red-500">
                  This action is permanent
                </p>
                <p className="text-[13px] text-text-secondary mt-1 leading-snug">
                  All your messages, contacts, settings, and media will be
                  permanently deleted and cannot be recovered.
                </p>
              </div>
            </div>

            <div>
              <p className="text-[13px] text-text-secondary mb-2">
                To confirm, type:{" "}
                <span className="font-mono text-text-main font-medium">
                  {CONFIRMATION_TEXT}
                </span>
              </p>
              <input
                type="text"
                value={deleteInput}
                onChange={(e) => setDeleteInput(e.target.value)}
                placeholder="Type the confirmation text..."
                className="w-full px-4 py-2.5 bg-input rounded-lg text-[14px] text-text-main placeholder:text-text-secondary outline-none border border-border focus:border-accent transition-colors"
                autoFocus
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-border">
            <button
              type="button"
              onClick={() => {
                setShowDeleteModal(false);
                setDeleteInput("");
              }}
              className="px-4 py-2 rounded-lg text-[14px] font-medium text-text-secondary hover:bg-input/50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={deleteInput !== CONFIRMATION_TEXT || deleting}
              onClick={handleDeleteAccount}
              className="px-4 py-2 rounded-lg text-[14px] font-medium text-white bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {deleting ? "Deleting..." : "Delete My Account"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Security sub-view ─────────────────────────────────────────────────
  if (subView === "security") {
    return (
      <div className="flex flex-col h-full">
        <button
          type="button"
          onClick={() => setSubView(null)}
          className="flex items-center gap-2 px-4 py-3.5 border-b border-border text-accent text-[14px] font-medium hover:bg-input/30 transition-colors shrink-0"
        >
          <ChevronLeft className="w-5 h-5" />
          Security
        </button>

        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-border px-4 py-6 space-y-6">
          {/* Encryption notice */}
          <div className="flex flex-col items-center text-center px-4 py-6 gap-3">
            <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center">
              <ShieldCheck className="w-8 h-8 text-accent" />
            </div>
            <h3 className="text-[15px] font-semibold text-text-main">
              End-to-End Encryption
            </h3>
            <p className="text-[13px] text-text-secondary leading-relaxed max-w-sm">
              Messages and calls are secured with end-to-end encryption. Only
              you and the person you communicate with can read or listen to them.
              Not even Ephemeral can access them.
            </p>
          </div>

          {/* What's encrypted */}
          <div>
            <p className="text-[11.5px] font-semibold text-text-secondary uppercase tracking-wider px-2 pb-2">
              Encrypted by default
            </p>
            <div className="space-y-0.5">
              {[
                "Text and voice messages",
                "Audio and video calls",
                "Photos, videos, and documents",
                "Location sharing",
                "Status updates",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 px-2 py-2.5"
                >
                  <ShieldCheck className="w-4 h-4 text-green-500 shrink-0" />
                  <p className="text-[13.5px] text-text-main">{item}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Security notifications toggle */}
          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between px-2 py-3">
              <div className="flex-1 min-w-0 pr-4">
                <p className="text-[14px] font-medium text-text-main">
                  Security notifications
                </p>
                <p className="text-[12.5px] text-text-secondary mt-1 leading-snug">
                  Get notified when a contact's security code changes.
                  Notifications will appear in your chats.
                </p>
              </div>
              <Toggle
                checked={settings.securityNotifications}
                onChange={(v) => updateSetting("securityNotifications", v)}
                label="Security notifications"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Request Account Info sub-view ─────────────────────────────────────
  if (subView === "request-info") {
    return (
      <div className="flex flex-col h-full">
        <button
          type="button"
          onClick={() => setSubView(null)}
          className="flex items-center gap-2 px-4 py-3.5 border-b border-border text-accent text-[14px] font-medium hover:bg-input/30 transition-colors shrink-0"
        >
          <ChevronLeft className="w-5 h-5" />
          Request Account Info
        </button>

        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-border px-4 py-6 space-y-6">
          {/* Account info section */}
          <div>
            <div className="flex items-start gap-3 px-2 py-3">
              <FileText className="w-5 h-5 text-accent shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-medium text-text-main">
                  Account Info
                </p>
                <p className="text-[12.5px] text-text-secondary mt-1 leading-snug">
                  Create a report of your Ephemeral account information and
                  settings, which you can access or port to another app. This
                  report does not include your messages.
                </p>
              </div>
            </div>
            <div className="px-2 pt-2">
              <button
                type="button"
                onClick={handleRequestReport}
                disabled={reportRequested}
                className="px-4 py-2.5 rounded-lg text-[14px] font-medium text-accent border border-accent hover:bg-accent/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {reportRequested ? "Request Submitted" : "Request Report"}
              </button>
            </div>
          </div>

          <div className="border-t border-border" />

          {/* Channel activity section */}
          <div>
            <div className="flex items-start gap-3 px-2 py-3">
              <FileText className="w-5 h-5 text-accent shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-medium text-text-main">
                  Channel Activity
                </p>
                <p className="text-[12.5px] text-text-secondary mt-1 leading-snug">
                  Request a report with details about your channel activity,
                  including channels you follow, channels you manage, and
                  related metadata.
                </p>
              </div>
            </div>
            <div className="px-2 pt-2">
              <button
                type="button"
                onClick={handleRequestChannelReport}
                disabled={channelReportRequested}
                className="px-4 py-2.5 rounded-lg text-[14px] font-medium text-accent border border-accent hover:bg-accent/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {channelReportRequested
                  ? "Request Submitted"
                  : "Request Report"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Main Account view ─────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-border">
        {/* Security row */}
        <button
          className="flex items-center gap-3 w-full px-4 py-4 hover:bg-input/50 transition-colors text-left"
          onClick={() => setSubView("security")}
        >
          <ShieldCheck className="w-5 h-5 text-accent shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-medium text-text-main">Security</p>
            <p className="text-[12.5px] text-text-secondary mt-0.5">
              End-to-end encryption, security notifications
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-text-secondary shrink-0" />
        </button>

        <div className="mx-4 border-b border-border" />

        {/* Request Account Info row */}
        <button
          className="flex items-center gap-3 w-full px-4 py-4 hover:bg-input/50 transition-colors text-left"
          onClick={() => setSubView("request-info")}
        >
          <FileText className="w-5 h-5 text-accent shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-medium text-text-main">
              Request Account Info
            </p>
            <p className="text-[12.5px] text-text-secondary mt-0.5">
              Export your account information and settings
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-text-secondary shrink-0" />
        </button>

        <div className="mx-4 border-b border-border" />

        {/* Delete My Account row */}
        <button
          className="flex items-center gap-3 w-full px-4 py-4 hover:bg-input/50 transition-colors text-left"
          onClick={() => setShowDeleteModal(true)}
        >
          <Trash2 className="w-5 h-5 text-red-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-medium text-red-500">
              Delete My Account
            </p>
            <p className="text-[12.5px] text-text-secondary mt-0.5">
              Permanently delete your account and all data
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-text-secondary shrink-0" />
        </button>
      </div>
    </div>
  );
}
