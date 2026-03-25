import { useState } from "react";
import { X, Camera } from "lucide-react";
import { useFocusTrap } from "../../hooks/useFocusTrap";

interface CreateChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

type Step = "info" | "form";

export function CreateChannelModal({
  isOpen,
  onClose,
  onCreated,
}: CreateChannelModalProps) {
  const [step, setStep] = useState<Step>("info");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const trapRef = useFocusTrap<HTMLDivElement>(isOpen);

  const canCreate = name.trim().length > 0 && description.trim().length > 0;

  const handleClose = () => {
    setStep("info");
    setName("");
    setDescription("");
    onClose();
  };

  const handleContinue = () => {
    setStep("form");
  };

  const handleCreate = async () => {
    if (!canCreate || isSaving) return;
    setIsSaving(true);
    try {
      const { apiFetch } = await import("../../lib/api");
      await apiFetch("/channels", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
        }),
      });
      handleClose();
      onCreated();
    } catch (err) {
      console.error("Failed to create channel:", err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-overlay backdrop-blur-[4px] z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      ref={trapRef}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") handleClose();
      }}
    >
      {step === "info" ? (
        /* ── Step 1: Info Modal ── */
        <div className="w-full max-w-[440px] bg-card rounded-2xl p-8 shadow-2xl text-center animate-in fade-in zoom-in-95">
          {/* Channel broadcast icon */}
          <div className="w-20 h-20 rounded-full bg-accent/15 flex items-center justify-center mx-auto mb-6">
            <svg
              viewBox="0 0 48 48"
              fill="none"
              className="w-10 h-10 text-accent"
            >
              {/* Broadcast / signal icon */}
              <circle
                cx="24"
                cy="24"
                r="6"
                stroke="currentColor"
                strokeWidth="3"
                fill="currentColor"
              />
              <path
                d="M16 16a12 12 0 0 0 0 16"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M32 16a12 12 0 0 1 0 16"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M10 10a20 20 0 0 0 0 28"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M38 10a20 20 0 0 1 0 28"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          </div>

          <h2 className="text-xl font-bold text-text-main mb-2">
            Create a channel to reach an unlimited number of followers
          </h2>

          {/* Info bullets */}
          <div className="text-left space-y-5 mt-6 mb-8">
            {/* Bullet 1 */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                <svg
                  viewBox="0 0 24 24"
                  className="w-4 h-4 text-accent"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M2 12h20" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-text-main text-[14px]">
                  Anyone can find your channel
                </p>
                <p className="text-text-secondary text-[13px] leading-relaxed">
                  Channels are public, so anyone can find them and view the
                  30-day history.
                </p>
              </div>
            </div>

            {/* Bullet 2 */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                <svg
                  viewBox="0 0 24 24"
                  className="w-4 h-4 text-accent"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-text-main text-[14px]">
                  People see your channel, not you
                </p>
                <p className="text-text-secondary text-[13px] leading-relaxed">
                  Followers cannot see your phone number, profile picture, or
                  your name, but other admins can.
                </p>
              </div>
            </div>

            {/* Bullet 3 */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                <svg
                  viewBox="0 0 24 24"
                  className="w-4 h-4 text-accent"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-text-main text-[14px]">
                  You are responsible for your channel
                </p>
                <p className="text-text-secondary text-[13px] leading-relaxed">
                  Your channel must comply with our{" "}
                  <span className="text-accent cursor-pointer hover:underline">
                    guidelines
                  </span>{" "}
                  and will be reviewed accordingly.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-center gap-3">
            <button
              className="px-5 py-2.5 rounded-xl font-medium text-[14px] text-text-main border border-border hover:bg-input transition-colors"
              onClick={handleClose}
            >
              Close
            </button>
            <button
              className="px-5 py-2.5 rounded-xl font-medium text-[14px] bg-accent text-white hover:brightness-110 transition-all shadow-sm"
              onClick={handleContinue}
            >
              Continue
            </button>
          </div>
        </div>
      ) : (
        /* ── Step 2: Creation Form ── */
        <div className="w-full max-w-[440px] bg-card rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 px-6 py-4 border-b border-border">
            <button
              className="w-9 h-9 rounded-full flex items-center justify-center text-text-secondary hover:bg-input transition-colors"
              onClick={() => setStep("info")}
              aria-label="Back"
            >
              <svg
                viewBox="0 0 24 24"
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 12H5" />
                <path d="m12 19-7-7 7-7" />
              </svg>
            </button>
            <h2 className="text-lg font-semibold text-text-main">
              New Channel
            </h2>
            <button
              className="ml-auto w-9 h-9 rounded-full flex items-center justify-center text-text-secondary hover:bg-input transition-colors"
              onClick={handleClose}
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 px-6 py-6 flex flex-col gap-6">
            {/* Avatar upload placeholder */}
            <div className="flex justify-center">
              <div className="w-[100px] h-[100px] rounded-full bg-input border border-border flex flex-col items-center justify-center cursor-pointer hover:border-accent transition-colors group">
                <Camera className="w-6 h-6 text-text-secondary group-hover:text-accent transition-colors" />
                <span className="text-[10px] text-text-secondary mt-1 text-center leading-tight group-hover:text-accent transition-colors">
                  Add channel
                  <br />
                  image
                </span>
              </div>
            </div>

            {/* Channel name */}
            <div>
              <label className="text-[11px] font-medium uppercase tracking-[1px] text-accent mb-1.5 block">
                Channel name
              </label>
              <div className="relative flex items-center bg-input border border-border rounded-lg h-[44px] px-3 focus-within:border-accent transition-colors">
                <input
                  type="text"
                  placeholder="Channel name"
                  maxLength={100}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none text-text-main text-[14px] placeholder:text-text-secondary h-full"
                />
              </div>
            </div>

            {/* Channel description */}
            <div>
              <label className="text-[11px] font-medium uppercase tracking-[1px] text-accent mb-1.5 block">
                Channel description
              </label>
              <div className="bg-input border border-border rounded-lg p-3 focus-within:border-accent transition-colors">
                <textarea
                  placeholder="Describe the channel explaining its topics and main features."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full bg-transparent border-none outline-none text-text-main text-[14px] placeholder:text-text-secondary resize-none"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-border">
            <button
              disabled={!canCreate || isSaving}
              onClick={handleCreate}
              className={`w-full py-3 rounded-xl font-semibold text-[14px] transition-all ${
                canCreate && !isSaving
                  ? "bg-accent text-white hover:brightness-110 shadow-sm cursor-pointer"
                  : "bg-accent/30 text-white/50 cursor-not-allowed"
              }`}
            >
              {isSaving ? "Creating..." : "Create Channel"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
