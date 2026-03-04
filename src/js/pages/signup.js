import { signup } from "../auth.js";
import { showToast } from "../ui/toast.js";
import { initTogglePassword } from "../ui/toggle-password.js";
import {
  validateEmail,
  validatePhone,
  validatePasswordStrength,
  markError,
  clearError,
} from "../utils.js";

export function initSignupPage() {
  const form = document.getElementById("signup-form");
  const emailEl = document.getElementById("email");
  const phoneEl = document.getElementById("phone");
  const passEl = document.getElementById("password");
  const termsEl = form?.querySelector('input[name="terms"]');
  const submitEl = form?.querySelector('button[type="submit"]');
  if (!form || !emailEl || !passEl) return;

  initTogglePassword();

  // Submit button enabled only when terms are accepted
  function updateSubmitState() {
    if (submitEl) submitEl.disabled = !termsEl?.checked;
  }
  if (termsEl) {
    termsEl.addEventListener("change", updateSubmitState);
    updateSubmitState();
  }

  // Inline validation on blur
  emailEl.addEventListener("blur", () => {
    if (emailEl.value && !validateEmail(emailEl.value)) {
      markError(emailEl, "Please enter a valid email address.");
    } else {
      clearError(emailEl);
    }
  });
  phoneEl?.addEventListener("blur", () => {
    if (phoneEl.value && !validatePhone(phoneEl.value)) {
      markError(phoneEl, "Please enter a valid phone number.");
    } else {
      clearError(phoneEl);
    }
  });
  passEl.addEventListener("blur", () => {
    const err = validatePasswordStrength(passEl.value);
    if (err) markError(passEl, err);
    else clearError(passEl);
  });

  // Clear errors on focus
  [emailEl, phoneEl, passEl].forEach((el) =>
    el?.addEventListener("focus", () => clearError(el)),
  );

  // Social buttons → info toast (no demo signup flow)
  document.querySelectorAll(".social-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      showToast("Social sign-up is not available in demo mode.", "info");
    });
  });

  // Form submit
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    _handleSignup({ emailEl, phoneEl, passEl, termsEl });
  });
}

function _handleSignup({ emailEl, phoneEl, passEl, termsEl }) {
  let valid = true;

  if (!validateEmail(emailEl.value)) {
    markError(emailEl, "Please enter a valid email address.");
    valid = false;
  }
  if (phoneEl?.value && !validatePhone(phoneEl.value)) {
    markError(phoneEl, "Please enter a valid phone number.");
    valid = false;
  }
  const pwdErr = validatePasswordStrength(passEl.value);
  if (pwdErr) {
    markError(passEl, pwdErr);
    valid = false;
  }
  if (!termsEl?.checked) {
    showToast("You must accept the Terms of Service to continue.", "warning");
    valid = false;
  }
  if (!valid) return;

  // Use the email prefix as a display name if the user didn't provide one
  const displayName = emailEl.value.split("@")[0];

  const result = signup({
    email: emailEl.value,
    phone: phoneEl?.value || "",
    password: passEl.value,
    displayName,
  });

  if (!result.ok) {
    showToast(result.error, "error");
    markError(emailEl, result.error);
    return;
  }

  showToast("Account created! Redirecting to sign in…", "success");
  setTimeout(() => window.location.replace("index.html"), 1200);
}
