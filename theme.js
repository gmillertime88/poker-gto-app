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

  const selectors = document.querySelectorAll("[data-theme-select]");
  selectors.forEach((select) => {
    if (select.value !== safeTheme) {
      select.value = safeTheme;
    }
  });
}

function initThemeSelector() {
  const initialTheme = getStoredTheme();
  applyTheme(initialTheme);

  const selectors = document.querySelectorAll("[data-theme-select]");
  selectors.forEach((select) => {
    select.addEventListener("change", (event) => {
      applyTheme(event.target.value);
    });
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initThemeSelector);
} else {
  initThemeSelector();
}
