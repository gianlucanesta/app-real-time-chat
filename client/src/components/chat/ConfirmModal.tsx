import { useFocusTrap } from "../../hooks/useFocusTrap";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  description,
  confirmText = "Delete",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const trapRef = useFocusTrap<HTMLDivElement>(isOpen);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[1000] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      ref={trapRef}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onCancel();
      }}
    >
      <div className="w-full max-w-[380px] bg-card rounded-2xl p-8 shadow-2xl text-center animate-in fade-in zoom-in-95">
        {/* Icon */}
        <div className="w-14 h-14 rounded-full bg-danger/15 flex items-center justify-center mx-auto mb-5">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-7 h-7 text-danger"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14H6L5 6" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
            <path d="M9 6V4h6v2" />
          </svg>
        </div>

        <h2
          className="text-xl font-bold text-text-main mb-2"
          id="confirm-modal-title"
        >
          {title}
        </h2>
        <p className="text-text-secondary text-[14px] leading-relaxed mb-7">
          {description}
        </p>

        <div className="flex items-center justify-center gap-3">
          <button
            className="px-5 py-2.5 rounded-xl font-medium text-[14px] text-text-main border border-border hover:bg-input transition-colors"
            onClick={onCancel}
          >
            {cancelText}
          </button>
          <button
            className="px-5 py-2.5 rounded-xl font-medium text-[14px] bg-danger text-white hover:brightness-110 transition-all shadow-sm"
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
