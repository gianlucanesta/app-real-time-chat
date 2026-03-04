/**
 * @param {Function} fn
 * @param {number} delay – milliseconds
 * @returns {Function}
 */
export function debounce(fn, delay = 250) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/** @param {string} email */
export function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/** @param {string} phone – empty string is considered valid (field is optional) */
export function validatePhone(phone) {
  return phone === "" || /^[\+]?[\d\s\-\(\)]{7,20}$/.test(phone.trim());
}

/**
 * @param {string} password
 * @returns {string|null} error message or null if valid
 */
export function validatePasswordStrength(password) {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/\d/.test(password)) return "Password must contain at least one number.";
  return null;
}

/**
 * Mark a form input as invalid and show an error message.
 * @param {HTMLInputElement} inputEl
 * @param {string} message
 */
export function markError(inputEl, message) {
  const wrapper = inputEl.closest(".input-wrapper");
  if (wrapper) wrapper.classList.add("input-error");

  const group = inputEl.closest(".form-group");
  if (!group) return;

  let errEl = group.querySelector(".field-error");
  if (!errEl) {
    errEl = document.createElement("span");
    errEl.className = "field-error";
    errEl.setAttribute("role", "alert");
    group.appendChild(errEl);
  }
  errEl.textContent = message;
  inputEl.setAttribute("aria-invalid", "true");
}

/**
 * Clear the validation error state from a form input.
 * @param {HTMLInputElement} inputEl
 */
export function clearError(inputEl) {
  const wrapper = inputEl.closest(".input-wrapper");
  if (wrapper) wrapper.classList.remove("input-error");

  const group = inputEl.closest(".form-group");
  if (!group) return;

  const errEl = group.querySelector(".field-error");
  if (errEl) errEl.textContent = "";
  inputEl.removeAttribute("aria-invalid");
}
