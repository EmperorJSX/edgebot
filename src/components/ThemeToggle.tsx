"use client";

// Light/dark toggle. The no-flash script in layout.tsx sets the initial .dark
// class before hydration; this component reads it on mount and flips it. The
// choice persists in localStorage; with no stored choice the script follows
// prefers-color-scheme.

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export const THEME_KEY = "edgebot-theme";

export default function ThemeToggle() {
  const [dark, setDark] = useState<boolean | null>(null);

  useEffect(() => {
    // Mounted gate: the class is set pre-hydration by the layout script, so it
    // can only be read here; SSR renders the invisible placeholder below.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem(THEME_KEY, next ? "dark" : "light");
    } catch {
      // private mode: theme still flips for the session
    }
  };

  return (
    <button
      type="button"
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggle}
      className="text-muted transition-colors hover:text-fg"
    >
      {/* Render a placeholder until mounted so SSR markup never mismatches. */}
      {dark === null ? (
        <Moon size={18} className="opacity-0" />
      ) : dark ? (
        <Sun size={18} />
      ) : (
        <Moon size={18} />
      )}
    </button>
  );
}
