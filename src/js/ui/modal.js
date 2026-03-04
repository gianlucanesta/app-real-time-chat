/**
 * Open a modal overlay by id.
 * Adds the `.open` class, updates aria-hidden, and moves focus.
 * @param {string} id – element id of the .modal-overlay
 */
export function openModal(id) {
  const el = document.getElementById(id);
  if (!el) return;

  el.classList.add('open');
  el.setAttribute('aria-hidden', 'false');

  // Move focus to the first interactive element inside the modal
  const focusable = el.querySelector(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  if (focusable) focusable.focus();

  // Close when clicking the backdrop (not the card itself)
  el.addEventListener('click', _overlayClose);
}

/**
 * Close a modal overlay by id.
 * @param {string} id
 */
export function closeModal(id) {
  const el = document.getElementById(id);
  if (!el) return;

  el.classList.remove('open');
  el.setAttribute('aria-hidden', 'true');
  el.removeEventListener('click', _overlayClose);
}

function _overlayClose(e) {
  if (e.target === e.currentTarget) {
    closeModal(e.currentTarget.id);
  }
}
