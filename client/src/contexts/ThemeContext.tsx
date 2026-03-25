import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useSettings } from "./SettingsContext";

type Theme = "dark" | "light";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { settings, updateSetting } = useSettings();

  const [theme, setTheme] = useState<Theme>(() => {
    // Immediate read from localStorage for flicker-free boot
    const stored = localStorage.getItem("ephemeral_theme");
    return stored === "light" ? "light" : "dark";
  });

  // Sync when SettingsContext reloads from API
  useEffect(() => {
    const apiTheme = settings.theme === "light" ? "light" : "dark";
    if (apiTheme !== theme) setTheme(apiTheme);
  }, [settings.theme]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    localStorage.setItem("ephemeral_theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    updateSetting("theme", next);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
