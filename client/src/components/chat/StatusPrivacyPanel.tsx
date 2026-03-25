import { ArrowLeft } from "lucide-react";
import type { StatusPrivacy } from "../../types";

interface StatusPrivacyPanelProps {
  isOpen: boolean;
  onClose: () => void;
  privacy: StatusPrivacy;
  onChangePrivacy: (privacy: StatusPrivacy) => void;
}

const PRIVACY_OPTIONS: {
  value: StatusPrivacy;
  label: string;
  description: string;
}[] = [
  {
    value: "contacts",
    label: "My contacts",
    description: "Share with all your contacts",
  },
  {
    value: "contacts_except",
    label: "My contacts except...",
    description: "Share with your contacts except selected ones",
  },
  {
    value: "only_share_with",
    label: "Share only with...",
    description: "Share only with selected contacts",
  },
];

function PrivacyContent({
  onClose,
  privacy,
  onChangePrivacy,
}: Omit<StatusPrivacyPanelProps, "isOpen">) {
  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border shrink-0 h-[64px]">
        <button
          className="w-9 h-9 rounded-full flex items-center justify-center text-text-secondary hover:text-text-main hover:bg-input transition-colors"
          onClick={onClose}
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-[17px] font-semibold text-text-main">
          Status privacy
        </h2>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-border px-4 py-5">
        <p className="text-[13.5px] text-accent font-medium mb-6 leading-snug">
          Who can see my status updates
        </p>

        <div className="flex flex-col gap-1">
          {PRIVACY_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex items-start gap-3 px-2 py-3.5 rounded-lg cursor-pointer hover:bg-input/50 transition-colors"
            >
              <div className="mt-0.5 shrink-0">
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                    privacy === opt.value
                      ? "border-accent"
                      : "border-text-secondary/50"
                  }`}
                >
                  {privacy === opt.value && (
                    <div className="w-2.5 h-2.5 rounded-full bg-accent" />
                  )}
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-[14px] font-medium text-text-main">
                  {opt.label}
                </p>
                <p className="text-[12.5px] text-text-secondary mt-0.5 leading-snug">
                  {opt.description}
                </p>
              </div>
              <input
                type="radio"
                name="status-privacy"
                value={opt.value}
                checked={privacy === opt.value}
                onChange={() => onChangePrivacy(opt.value)}
                className="sr-only"
              />
            </label>
          ))}
        </div>
      </div>
    </>
  );
}

export function StatusPrivacyPanel({
  isOpen,
  onClose,
  privacy,
  onChangePrivacy,
}: StatusPrivacyPanelProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* ── Desktop: centered modal with backdrop ── */}
      <div className="hidden md:flex fixed inset-0 z-50 items-center justify-center">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />
        {/* Modal */}
        <div className="relative z-10 w-full max-w-md bg-card rounded-2xl shadow-2xl border border-border flex flex-col max-h-[80vh] animate-in fade-in zoom-in-95">
          <PrivacyContent
            onClose={onClose}
            privacy={privacy}
            onChangePrivacy={onChangePrivacy}
          />
        </div>
      </div>

      {/* ── Mobile: full-screen replacement column ── */}
      <div className="flex md:hidden fixed inset-0 z-50 bg-card flex-col">
        <PrivacyContent
          onClose={onClose}
          privacy={privacy}
          onChangePrivacy={onChangePrivacy}
        />
      </div>
    </>
  );
}
