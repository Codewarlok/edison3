import { define } from "../utils.ts";
import ThemeToggle from "@/islands/ThemeToggle.tsx";

const themeScript = `(() => {
  const KEY = "edison-theme";
  const LIGHT = "edison-light";
  const DARK = "edison-dark";

  try {
    const saved = localStorage.getItem(KEY);
    if (saved === LIGHT || saved === DARK) {
      document.documentElement.setAttribute("data-theme", saved);
      return;
    }
  } catch (_error) {
    // no-op
  }

  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.setAttribute("data-theme", prefersDark ? DARK : LIGHT);
})();`;

export default define.page(function App({ Component }) {
  return (
    <html lang="es" data-theme="edison-light">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>edison3</title>
        <script>{themeScript}</script>
      </head>
      <body class="bg-base-100 text-base-content transition-colors">
        <div class="fixed right-4 top-4 z-50">
          <ThemeToggle />
        </div>
        <Component />
      </body>
    </html>
  );
});
