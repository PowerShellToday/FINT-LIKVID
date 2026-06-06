import { createContext, useContext, useEffect, useState } from "react";

export type Theme = "default" | "matrix" | "solarized" | "fint";
export type Mode = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: Theme;
  mode: Mode;
  setTheme: (t: Theme) => void;
  setMode: (m: Mode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyToDOM(theme: Theme, mode: Mode) {
  const html = document.documentElement;
  html.setAttribute("data-theme", theme);
  const isDark =
    mode === "dark" ||
    (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  html.classList.toggle("dark", isDark);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(
    () => (localStorage.getItem("theme-name") as Theme) ?? "default",
  );
  const [mode, setModeState] = useState<Mode>(
    () => (localStorage.getItem("theme-mode") as Mode) ?? "system",
  );

  useEffect(() => {
    applyToDOM(theme, mode);
  }, [theme, mode]);

  useEffect(() => {
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyToDOM(theme, "system");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme, mode]);

  function setTheme(t: Theme) {
    localStorage.setItem("theme-name", t);
    setThemeState(t);
  }

  function setMode(m: Mode) {
    localStorage.setItem("theme-mode", m);
    setModeState(m);
  }

  return (
    <ThemeContext.Provider value={{ theme, mode, setTheme, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
