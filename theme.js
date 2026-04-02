// Shared application chrome helpers (theme + mobile menu behavior) used by all pages.
const THEME_STORAGE_KEY = "millerTimePokerTheme";
const ALLOWED_THEMES = new Set(["dark", "light"]);

// Reads the persisted theme, with a safe dark fallback if storage is unavailable.
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

// Applies theme to the root node, persists the choice, and syncs toggle controls.
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

// Wires all theme toggles on the page to the same source of truth.
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

// Closes open hamburger menus on navigation and outside clicks.
function initHamburgerMenus() {
  const menus = document.querySelectorAll(".hamburger-menu");
  menus.forEach((menu) => {
    const links = menu.querySelectorAll("a");
    links.forEach((link) => {
      link.addEventListener("click", () => {
        menu.open = false;
      });
    });
  });

  document.addEventListener("click", (event) => {
    menus.forEach((menu) => {
      if (!menu.open) {
        return;
      }

      if (!menu.contains(event.target)) {
        menu.open = false;
      }
    });
  });
}

// App-level entrypoint for shared non-page-specific UI behavior.
function initAppChrome() {
  initThemeSelector();
  initHamburgerMenus();
}

// Boot immediately when possible, otherwise wait for DOM content.
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAppChrome);
} else {
  initAppChrome();
}
