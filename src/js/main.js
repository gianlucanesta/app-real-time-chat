import { initTheme } from "./theme.js";
import { guardRoute } from "./router.js";
import { initLoginPage } from "./pages/login.js";
import { initSignupPage } from "./pages/signup.js";
import { initChatPage } from "./pages/chat.js";
import { initSettingsPage } from "./pages/settings.js";

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
