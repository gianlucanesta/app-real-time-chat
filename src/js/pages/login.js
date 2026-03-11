import { apiLogin } from "../auth.js";
import { showToast } from "../ui/toast.js";
import { initTogglePassword } from "../ui/toggle-password.js";
import { validateEmail, markError, clearError } from "../utils.js";

export function initLoginPage() {
  const form = document.getElementById("login-form");
  const emailEl = document.getElementById("email");
  const passEl = document.getElementById("password");
  if (!form || !emailEl || !passEl) return;

  initTogglePassword();

  // Inline validation on blur
  emailEl.addEventListener("blur", () => {
    if (emailEl.value && !validateEmail(emailEl.value)) {
      markError(emailEl, "Please enter a valid email address.");
    } else {
      clearError(emailEl);
    }
  });
  emailEl.addEventListener("focus", () => clearError(emailEl));
  passEl.addEventListener("focus", () => clearError(passEl));

  // Forgot password
  const forgotLink = document.querySelector(".forgot-link");
  if (forgotLink) {
    forgotLink.addEventListener("click", (e) => {
      e.preventDefault();
      showToast("Password reset is not available in demo mode.", "info");
    });
  }

  // Social buttons → demo login
  document.querySelectorAll(".social-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      showToast("Social login is simulated — logging in as demo user.", "info");
      _doSocialLogin();
    });
  });

  // Expand/collapse extra social buttons
  const _expandBtn = document.querySelector(".social-expand-btn");
  const _socialExtra = document.querySelector(".social-extra");
  if (_expandBtn && _socialExtra) {
    _expandBtn.addEventListener("click", () => {
      const expanded = _expandBtn.getAttribute("aria-expanded") === "true";
      _expandBtn.setAttribute("aria-expanded", String(!expanded));
      _socialExtra.classList.toggle("expanded", !expanded);
    });
  }

  // Form submit
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    _handleLogin(emailEl, passEl, form);
  });
}

async function _handleLogin(emailEl, passEl, form) {
  let valid = true;

  if (!validateEmail(emailEl.value)) {
    markError(emailEl, "Please enter a valid email address.");
    valid = false;
  }
  if (!passEl.value.trim()) {
    markError(passEl, "Password is required.");
    valid = false;
  }
  if (!valid) return;

  const submitBtn = form?.querySelector('button[type="submit"]');
  if (submitBtn) submitBtn.disabled = true;

  const result = await apiLogin({
    email: emailEl.value,
    password: passEl.value,
  });

  if (submitBtn) submitBtn.disabled = false;

  if (!result.ok) {
    showToast(result.error, "error");
    markError(passEl, result.error);
    return;
  }

  window.location.replace("chat.html");
}

async function _doSocialLogin() {
  const result = await apiLogin({
    email: "demo@ephemeral.app",
    password: "Demo1234",
  });
  if (result.ok) {
    window.location.replace("chat.html");
  } else {
    showToast("Demo login failed. Please use the form instead.", "error");
  }
}
