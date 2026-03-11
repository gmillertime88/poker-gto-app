const THEME_STORAGE_KEY = "millerTimePokerTheme";
const ALLOWED_THEMES = new Set(["dark", "light"]);

function getStoredTheme() {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored && ALLOWED_THEMES.has(stored)) {
      return stored;
    }
  } catch (error) {
    // Ignore storage access issues and fall back to default.
  }
  return "dark";
}

function applyTheme(theme) {
  const safeTheme = ALLOWED_THEMES.has(theme) ? theme : "dark";
  document.documentElement.setAttribute("data-theme", safeTheme);

  try {
    localStorage.setItem(THEME_STORAGE_KEY, safeTheme);
  } catch (error) {
    // Ignore storage access issues.
  }

  const toggles = document.querySelectorAll("[data-theme-toggle]");
  toggles.forEach((toggle) => {
    const shouldBeChecked = safeTheme === "light";
    if (toggle.checked !== shouldBeChecked) {
      toggle.checked = shouldBeChecked;
    }
  });
}

function initThemeSelector() {
  const initialTheme = getStoredTheme();
  applyTheme(initialTheme);

  const toggles = document.querySelectorAll("[data-theme-toggle]");
  toggles.forEach((toggle) => {
    toggle.addEventListener("change", (event) => {
      applyTheme(event.target.checked ? "light" : "dark");
    });
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initThemeSelector);
} else {
  initThemeSelector();
}
