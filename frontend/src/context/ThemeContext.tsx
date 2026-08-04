import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "theme";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

/**
 * 把 <meta name="theme-color"> 指向目前主題的 --canvas。這裡是從 computed style 讀回來，
 * 而不是寫死，如此才不會與 index.css 脫節；index.html 對同樣這兩個顏色帶了字面值，
 * 但那只是為了涵蓋第一次繪製。
 */
function syncThemeColor() {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    return;
  }
  // :root 設定了 `background: var(--canvas)`，所以這就是引擎序列化後的 canvas 顏色——
  // sRGB 顏色會是 rgb()，而在目前的 Chromium 上這些 token 會是 oklch()。
  // 不論哪一種，產生這個字串的瀏覽器就是後來把它解析回去的那一個。
  const canvas = getComputedStyle(document.documentElement).backgroundColor;
  // 沒有 stylesheet 時（jsdom）拿不到可用的顏色——此時保留 index.html 的值，
  // 而不是寫入一個透明色。
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
    // index.html 的 boot script 會設定這個 inline style，它的優先度高於 index.css 裡的
    // `color-scheme: light dark`——因此只切換 class 的話，捲軸、原生 <select> 與自動填入
    // 會一直維持前一個主題的外觀，直到下一次完整重新載入為止。
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
