let container = null;

function getContainer() {
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.setAttribute("role", "status");
    container.setAttribute("aria-live", "polite");
    container.setAttribute("aria-atomic", "false");
    container.style.cssText = [
      "position:fixed",
      "bottom:24px",
      "right:24px",
      "z-index:9999",
      "display:flex",
      "flex-direction:column",
      "gap:8px",
      "pointer-events:none",
    ].join(";");
    document.body.appendChild(container);
  }
  return container;
}

const TYPE_STYLES = {
  info: { bg: "#1A2332", border: "#1E293B", text: "#F1F5F9" },
  success: { bg: "#14532D", border: "#22C55E", text: "#F1F5F9" },
  error: { bg: "#450A0A", border: "#EF4444", text: "#F1F5F9" },
  warning: { bg: "#422006", border: "#F59E0B", text: "#F1F5F9" },
};

/**
 * Display a toast notification.
 * @param {string} message
 * @param {'info'|'success'|'error'|'warning'} type
 * @param {number} duration – ms before auto-dismiss
 */
export function showToast(message, type = "info", duration = 3000) {
  const c = getContainer();
  const styles = TYPE_STYLES[type] || TYPE_STYLES.info;

  const toast = document.createElement("div");
  toast.style.cssText = [
    `background:${styles.bg}`,
    `border:1px solid ${styles.border}`,
    `color:${styles.text}`,
    "padding:12px 16px",
    "border-radius:8px",
    "font-size:14px",
    "max-width:320px",
    "pointer-events:all",
    "box-shadow:0 4px 12px rgba(0,0,0,0.3)",
    "opacity:0",
    "transform:translateY(8px)",
    "transition:opacity 150ms ease,transform 150ms ease",
  ].join(";");
  toast.textContent = message;
  c.appendChild(toast);

  // Trigger entrance animation
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      toast.style.opacity = "1";
      toast.style.transform = "translateY(0)";
    });
  });

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(8px)";
    setTimeout(() => toast.remove(), 160);
  }, duration);
}
