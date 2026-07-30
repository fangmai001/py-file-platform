import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "theme";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

/**
 * Points <meta name="theme-color"> at the active theme's --canvas. Read back from the
 * computed style instead of hardcoded here so it cannot drift from index.css; index.html
 * carries literal values for the same two colours, but only to cover the first paint.
 */
function syncThemeColor() {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    return;
  }
  // :root sets `background: var(--canvas)`, so this is the canvas colour resolved to rgb().
  const canvas = getComputedStyle(document.documentElement).backgroundColor;
  // Without the stylesheet (jsdom) there is no usable colour - keep index.html's value
  // rather than writing a transparent one.
  if (canvas && canvas !== "transparent" && canvas !== "rgba(0, 0, 0, 0)") {
    meta.content = canvas;
  }
}

function getInitialTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") {
    return stored;
  }
  if (typeof window.matchMedia !== "function") {
    return "light";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    // The boot script in index.html sets this inline style, which outranks the
    // `color-scheme: light dark` in index.css - so toggling the class alone would leave
    // scrollbars, native <select>s and autofill rendering in the previous theme until
    // the next full reload.
    document.documentElement.style.colorScheme = theme;
    syncThemeColor();
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}
