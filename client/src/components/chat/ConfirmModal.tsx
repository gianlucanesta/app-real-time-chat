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
  onCancel
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className={`modal-overlay ${isOpen ? "open" : ""}`} aria-hidden={!isOpen} role="dialog" aria-labelledby="confirm-modal-title">
      <div className="modal-card confirm-modal-card">
        <div className="confirm-modal-icon confirm-modal-icon--danger mb-4">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14H6L5 6" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
            <path d="M9 6V4h6v2" />
          </svg>
        </div>
        <h2 className="confirm-modal-title text-xl font-bold text-text-main mb-2" id="confirm-modal-title">{title}</h2>
        <p className="confirm-modal-body text-text-secondary text-[15px] mb-6">{description}</p>
        <div className="modal-actions flex justify-end gap-3">
          <button 
            className="px-4 py-2 rounded-lg font-medium text-text-main hover:bg-input transition-colors" 
            onClick={onCancel}
          >
            {cancelText}
          </button>
          <button 
            className="px-4 py-2 rounded-lg font-medium bg-danger text-white hover:brightness-110 transition-all" 
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
