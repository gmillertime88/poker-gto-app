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

function initAppChrome() {
  initThemeSelector();
  initHamburgerMenus();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAppChrome);
} else {
  initAppChrome();
}
