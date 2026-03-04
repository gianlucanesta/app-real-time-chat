/**
 * Wire all `.toggle-password` buttons on the current page.
 * Each button must be a sibling inside a `.input-wrapper` that also
 * contains the password `<input>`.
 */
export function initTogglePassword() {
  document.querySelectorAll('.toggle-password').forEach(btn => {
    const wrapper = btn.closest('.input-wrapper');
    if (!wrapper) return;

    const input = wrapper.querySelector('input[type="password"], input[type="text"]');
    if (!input) return;

    btn.addEventListener('click', () => {
      const isShown = input.type === 'text';
      input.type = isShown ? 'password' : 'text';
      btn.setAttribute('aria-pressed', String(!isShown));

      const svg = btn.querySelector('svg');
      if (!svg) return;

      if (isShown) {
        // Eye-open icon (show password)
        svg.innerHTML =
          '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>' +
          '<circle cx="12" cy="12" r="3"/>';
      } else {
        // Eye-off icon (hide password)
        svg.innerHTML =
          '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8' +
          'a18.45 18.45 0 0 1 5.06-5.94"/>' +
          '<path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8' +
          'a18.5 18.5 0 0 1-2.16 3.19"/>' +
          '<line x1="1" y1="1" x2="23" y2="23"/>';
      }
    });
  });
}
