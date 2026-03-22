interface DeleteChoiceModalProps {
  isOpen: boolean;
  count: number;
  hasOwnMessages: boolean;
  onDeleteForMe: () => void;
  onDeleteForEveryone: () => void;
  onCancel: () => void;
}

export function DeleteChoiceModal({
  isOpen,
  count,
  hasOwnMessages,
  onDeleteForMe,
  onDeleteForEveryone,
  onCancel,
}: DeleteChoiceModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[1000] p-4"
      role="dialog"
      aria-labelledby="delete-choice-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
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
          id="delete-choice-title"
        >
          Delete {count === 1 ? "message" : `${count} messages`}?
        </h2>
        <p className="text-text-secondary text-[14px] leading-relaxed mb-7">
          Choose how you want to delete{" "}
          {count === 1 ? "this message" : "these messages"}.
        </p>

        <div className="flex flex-col gap-3">
          {hasOwnMessages && (
            <button
              className="w-full px-5 py-3 rounded-xl font-medium text-[14px] bg-danger text-white hover:brightness-110 transition-all shadow-sm"
              onClick={onDeleteForEveryone}
            >
              Delete for everyone
            </button>
          )}
          <button
            className="w-full px-5 py-3 rounded-xl font-medium text-[14px] border border-danger text-danger hover:bg-danger/10 transition-colors"
            onClick={onDeleteForMe}
          >
            Delete for me
          </button>
          <button
            className="w-full px-5 py-3 rounded-xl font-medium text-[14px] text-text-main border border-border hover:bg-input transition-colors"
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
