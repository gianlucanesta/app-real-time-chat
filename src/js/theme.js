const THEME_KEY = "ephemeral_theme";

/**
 * Apply saved theme on page load and wire the theme-toggle button.
 */
export function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "light") {
    document.documentElement.classList.add("light");
  }

  const btn = document.querySelector(".theme-toggle");
  if (btn) {
    btn.addEventListener("click", toggleTheme);
  }
}

export function toggleTheme() {
  const isLight = document.documentElement.classList.toggle("light");
  localStorage.setItem(THEME_KEY, isLight ? "light" : "dark");
}
