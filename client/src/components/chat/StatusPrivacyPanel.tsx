import { useState } from "react";
import { ArrowLeft, Search, Check, X } from "lucide-react";
import type { StatusPrivacy } from "../../types";

/* ── Types ──────────────────────────────────────────────── */

export interface PrivacyContact {
  id: string;
  name: string;
  avatar?: string | null;
  gradient: string;
  initials: string;
}

interface StatusPrivacyPanelProps {
  isOpen: boolean;
  onClose: () => void;
  privacy: StatusPrivacy;
  onChangePrivacy: (privacy: StatusPrivacy) => void;
  /** Contacts to choose from when using except / only_share_with */
  contacts: PrivacyContact[];
  /** Currently excluded contact IDs */
  exceptIds: string[];
  onChangeExceptIds: (ids: string[]) => void;
  /** Currently included contact IDs */
  onlyShareIds: string[];
  onChangeOnlyShareIds: (ids: string[]) => void;
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

/* ── Contact Picker ─────────────────────────────────────── */

function ContactPicker({
  title,
  contacts,
  selectedIds,
  onToggle,
  onClose,
  onConfirm,
}: {
  title: string;
  contacts: PrivacyContact[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [search, setSearch] = useState("");

  const filtered = contacts.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border shrink-0 h-[64px]">
        <button
          className="w-9 h-9 rounded-full flex items-center justify-center text-text-secondary hover:text-text-main hover:bg-input transition-colors"
          onClick={onClose}
          aria-label="Back"
        >
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-[17px] font-semibold text-text-main flex-1 truncate">
          {title}
        </h2>
      </div>

      {/* Search */}
      <div className="px-4 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search a name..."
            className="w-full pl-10 pr-4 py-2.5 bg-input rounded-lg text-[14px] text-text-main placeholder:text-text-secondary outline-none border border-border focus:border-accent transition-colors"
          />
        </div>
      </div>

      {/* Label */}
      <div className="px-4 pb-2">
        <p className="text-[12px] font-semibold text-text-secondary uppercase tracking-wider">
          Contacts
        </p>
      </div>

      {/* Contact list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-border">
        {filtered.length === 0 && (
          <p className="px-4 py-8 text-center text-[13px] text-text-secondary">
            No contacts found
          </p>
        )}
        {filtered.map((c) => {
          const selected = selectedIds.includes(c.id);
          return (
            <button
              key={c.id}
              className="flex items-center gap-3 px-4 py-3 w-full hover:bg-input/50 transition-colors text-left"
              onClick={() => onToggle(c.id)}
            >
              {/* Checkbox */}
              <div
                className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                  selected
                    ? "bg-accent border-accent"
                    : "border-text-secondary/50"
                }`}
              >
                {selected && (
                  <Check className="w-3 h-3 text-white" strokeWidth={3} />
                )}
              </div>

              {/* Avatar */}
              {c.avatar ? (
                <img
                  src={c.avatar}
                  alt={c.name}
                  className="w-10 h-10 rounded-full object-cover shrink-0"
                />
              ) : (
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0"
                  style={{ background: c.gradient }}
                >
                  {c.initials}
                </div>
              )}

              {/* Name */}
              <p className="text-[14px] font-medium text-text-main truncate">
                {c.name}
              </p>
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-border shrink-0">
        <p className="text-[13px] text-text-secondary">
          {selectedIds.length} contact{selectedIds.length !== 1 ? "s" : ""}{" "}
          selected
        </p>
        <button
          className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-white hover:bg-accent/90 transition-colors"
          onClick={onConfirm}
        >
          <Check className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

/* ── Privacy Radio List ─────────────────────────────────── */

function PrivacyRadioList({
  privacy,
  onChangePrivacy,
  onClose,
}: {
  privacy: StatusPrivacy;
  onChangePrivacy: (p: StatusPrivacy) => void;
  onClose: () => void;
}) {
  return (
    <>
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

/* ── Main export — renders inline content for the right column ── */

export function StatusPrivacyPanel({
  isOpen,
  onClose,
  privacy,
  onChangePrivacy,
  contacts,
  exceptIds,
  onChangeExceptIds,
  onlyShareIds,
  onChangeOnlyShareIds,
}: StatusPrivacyPanelProps) {
  const [pickerMode, setPickerMode] = useState<"radio" | "except" | "only">(
    "radio",
  );

  if (!isOpen) return null;

  const handleChangePrivacy = (p: StatusPrivacy) => {
    onChangePrivacy(p);
    if (p === "contacts_except") {
      setPickerMode("except");
    } else if (p === "only_share_with") {
      setPickerMode("only");
    } else {
      setPickerMode("radio");
    }
  };

  const handleBackFromPicker = () => {
    setPickerMode("radio");
  };

  const handleConfirmPicker = () => {
    setPickerMode("radio");
  };

  const toggleExcept = (id: string) => {
    onChangeExceptIds(
      exceptIds.includes(id)
        ? exceptIds.filter((x) => x !== id)
        : [...exceptIds, id],
    );
  };

  const toggleOnly = (id: string) => {
    onChangeOnlyShareIds(
      onlyShareIds.includes(id)
        ? onlyShareIds.filter((x) => x !== id)
        : [...onlyShareIds, id],
    );
  };

  const handleClose = () => {
    setPickerMode("radio");
    onClose();
  };

  /* The content to render — same for desktop right column & mobile fullscreen */
  const content =
    pickerMode === "except" ? (
      <ContactPicker
        title="My contacts except..."
        contacts={contacts}
        selectedIds={exceptIds}
        onToggle={toggleExcept}
        onClose={handleBackFromPicker}
        onConfirm={handleConfirmPicker}
      />
    ) : pickerMode === "only" ? (
      <ContactPicker
        title="Share only with..."
        contacts={contacts}
        selectedIds={onlyShareIds}
        onToggle={toggleOnly}
        onClose={handleBackFromPicker}
        onConfirm={handleConfirmPicker}
      />
    ) : (
      <PrivacyRadioList
        privacy={privacy}
        onChangePrivacy={handleChangePrivacy}
        onClose={handleClose}
      />
    );

  return (
    <>
      {/* ── Desktop: inline in right column (rendered by parent) ── */}
      <div className="hidden md:flex flex-col h-full">{content}</div>

      {/* ── Mobile: full-screen overlay ── */}
      <div className="flex md:hidden fixed inset-0 z-50 bg-card flex-col">
        {content}
      </div>
    </>
  );
}
