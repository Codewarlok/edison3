import { useEffect, useState } from "preact/hooks";

const THEME_STORAGE_KEY = "edison-theme";
const LIGHT_THEME = "edison-light";
const DARK_THEME = "edison-dark";

type Theme = typeof LIGHT_THEME | typeof DARK_THEME;

function getPreferredTheme(): Theme {
  if (typeof localStorage !== "undefined") {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === LIGHT_THEME || saved === DARK_THEME) {
      return saved;
    }
  }

  if (globalThis.matchMedia?.("(prefers-color-scheme: dark)").matches) {
    return DARK_THEME;
  }

  return LIGHT_THEME;
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(THEME_STORAGE_KEY, theme);
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(LIGHT_THEME);

  useEffect(() => {
    const preferred = getPreferredTheme();
    setTheme(preferred);
    applyTheme(preferred);
  }, []);

  const toggleTheme = () => {
    const nextTheme: Theme = theme === DARK_THEME ? LIGHT_THEME : DARK_THEME;
    setTheme(nextTheme);
    applyTheme(nextTheme);
  };

  return (
    <button
      type="button"
      aria-label="Cambiar tema"
      class="rounded-lg border border-base-300 bg-base-100 px-3 py-2 text-sm font-medium shadow-sm hover:bg-base-200"
      onClick={toggleTheme}
    >
      {theme === DARK_THEME ? "☀️ Claro" : "🌙 Oscuro"}
    </button>
  );
}
