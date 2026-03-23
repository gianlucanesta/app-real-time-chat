import { initTheme } from "./theme.js";
import { guardRoute } from "./router.js";
import { initLoginPage } from "./pages/login.js";
import { initSignupPage } from "./pages/signup.js";
import { initChatPage } from "./pages/chat.js";
import { initSettingsPage } from "./pages/settings.js";

/* ── Prevent all zoom (keyboard + touch) ────────────── */
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && (e.key === "+" || e.key === "-" || e.key === "=" || e.key === "0")) {
    e.preventDefault();
  }
});
document.addEventListener("wheel", (e) => { if (e.ctrlKey) e.preventDefault(); }, { passive: false });
document.addEventListener("gesturestart", (e) => e.preventDefault());
document.addEventListener("gesturechange", (e) => e.preventDefault());
document.addEventListener("gestureend", (e) => e.preventDefault());

initTheme();

const page = document.body.dataset.page;

switch (page) {
  case "login":
    initLoginPage();
    break;
  case "signup":
    initSignupPage();
    break;
  case "chat":
    guardRoute();
    initChatPage();
    break;
  case "settings":
    guardRoute();
    initSettingsPage();
    break;
}
