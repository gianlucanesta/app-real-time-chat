import { useState } from "react";
import {
  X,
  Users,
  ArrowRight,
  Megaphone,
  UserPlus,
  Camera,
} from "lucide-react";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import { apiFetch } from "../../lib/api";

interface CreateCommunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

type Step = "welcome" | "form";

export function CreateCommunityModal({
  isOpen,
  onClose,
  onCreated,
}: CreateCommunityModalProps) {
  const [step, setStep] = useState<Step>("welcome");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const trapRef = useFocusTrap<HTMLDivElement>(isOpen);

  const canCreate = name.trim().length > 0;

  const handleClose = () => {
    setStep("welcome");
    setName("");
    setDescription("");
    onClose();
  };

  const handleCreate = async () => {
    if (!canCreate || isSaving) return;
    setIsSaving(true);
    try {
      await apiFetch("/communities", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
        }),
      });
      handleClose();
      onCreated();
    } catch (err) {
      console.error("Failed to create community:", err);
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
      {step === "welcome" ? (
        /* ── Step 1: Welcome / Info ── */
        <div className="w-full max-w-[440px] bg-card rounded-2xl p-8 shadow-2xl text-center animate-in fade-in zoom-in-95">
          {/* Community icon */}
          <div className="w-20 h-20 rounded-full bg-accent/15 flex items-center justify-center mx-auto mb-6">
            <Users className="w-10 h-10 text-accent" />
          </div>

          <h2 className="text-xl font-bold text-text-main mb-2">
            New Community
          </h2>
          <p className="text-text-secondary text-[14px] mb-6 leading-relaxed">
            Bring members together in topic-based groups, with announcements
            that reach everyone.
          </p>

          {/* Info bullets */}
          <div className="text-left space-y-5 mb-8">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                <Megaphone className="w-4 h-4 text-accent" />
              </div>
              <div>
                <p className="font-semibold text-text-main text-[14px]">
                  Send announcements
                </p>
                <p className="text-text-secondary text-[13px] leading-relaxed">
                  Post important updates to all community members at once.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                <Users className="w-4 h-4 text-accent" />
              </div>
              <div>
                <p className="font-semibold text-text-main text-[14px]">
                  Organize with groups
                </p>
                <p className="text-text-secondary text-[13px] leading-relaxed">
                  Create topic-based groups within your community for focused
                  discussions.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                <UserPlus className="w-4 h-4 text-accent" />
              </div>
              <div>
                <p className="font-semibold text-text-main text-[14px]">
                  Easily add members
                </p>
                <p className="text-text-secondary text-[13px] leading-relaxed">
                  Invite people from your contacts and manage members with admin
                  controls.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="flex-1 py-3 rounded-xl text-[14px] font-medium text-text-secondary hover:bg-input transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => setStep("form")}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[14px] font-medium bg-accent text-white hover:brightness-110 transition-all"
            >
              Get Started
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* ── Step 2: Creation Form ── */
        <div className="w-full max-w-[440px] bg-card rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 px-6 py-4 border-b border-border">
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:bg-input transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold text-text-main flex-1">
              New Community
            </h2>
          </div>

          <div className="p-6 space-y-5">
            {/* Icon placeholder */}
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-full bg-input border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-accent transition-colors">
                <Camera className="w-7 h-7 text-text-secondary" />
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-[13px] font-medium text-text-secondary mb-1.5">
                Community name
              </label>
              <input
                type="text"
                placeholder="e.g. Building Residents, Football Team..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                autoFocus
                className="w-full bg-input border border-border rounded-lg px-4 py-3 text-text-main text-[14px] placeholder:text-text-secondary/60 outline-none focus:border-accent transition-colors"
              />
              <p className="text-[11px] text-text-secondary mt-1 text-right">
                {name.length}/100
              </p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-[13px] font-medium text-text-secondary mb-1.5">
                Description{" "}
                <span className="text-text-secondary/50">(optional)</span>
              </label>
              <textarea
                placeholder="What is this community about?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={2048}
                rows={3}
                className="w-full bg-input border border-border rounded-lg px-4 py-3 text-text-main text-[14px] placeholder:text-text-secondary/60 outline-none focus:border-accent transition-colors resize-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-border flex gap-3">
            <button
              onClick={() => setStep("welcome")}
              className="flex-1 py-3 rounded-xl text-[14px] font-medium text-text-secondary hover:bg-input transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleCreate}
              disabled={!canCreate || isSaving}
              className="flex-1 py-3 rounded-xl text-[14px] font-medium bg-accent text-white hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? "Creating..." : "Create Community"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
