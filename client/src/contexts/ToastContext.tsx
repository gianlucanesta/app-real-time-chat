import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";
import type { ReactNode } from "react";

export type ToastType = "info" | "success" | "error" | "warning";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  exiting?: boolean;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach((t) => clearTimeout(t));
    };
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = "info", duration = 3000) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev, { id, message, type }]);

      const exitTimer = setTimeout(() => {
        setToasts((prev) =>
          prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)),
        );
        const removeTimer = setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
          timersRef.current.delete(id);
        }, 200);
        timersRef.current.set(`${id}-remove`, removeTimer);
      }, duration);

      timersRef.current.set(id, exitTimer);
    },
    [],
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast Container */}
      <div
        className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none"
        role="status"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const TYPE_STYLES: Record<
  ToastType,
  { bg: string; border: string }
> = {
  info: { bg: "bg-toast-info-bg", border: "border-border" },
  success: { bg: "bg-toast-success-bg", border: "border-success" },
  error: { bg: "bg-toast-error-bg", border: "border-danger" },
  warning: { bg: "bg-toast-warning-bg", border: "border-warning" },
};

function ToastItem({ toast }: { toast: Toast }) {
  const styles = TYPE_STYLES[toast.type];
  return (
    <div
      className={`pointer-events-auto max-w-[320px] px-4 py-3 rounded-lg text-sm text-text-main border shadow-lg transition-all duration-200
        ${styles.bg} ${styles.border}
        ${toast.exiting ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"}`}
    >
      {toast.message}
    </div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
