"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

interface ThemeToggleProps {
  className?: string;
}

export default function ThemeToggle({ className = "" }: ThemeToggleProps) {
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);

  useEffect(() => {
    // Determine initial theme on client mount
    const root = document.documentElement;
    const initialTheme = root.classList.contains("dark") ? "dark" : "light";
    setTheme(initialTheme);
  }, []);

  const toggleTheme = () => {
    const root = document.documentElement;
    if (theme === "light") {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setTheme("dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setTheme("light");
    }
  };

  // Prevent rendering empty spaces/jumpiness on server-side initial load
  if (theme === null) {
    return (
      <div className={`w-[120px] h-10 rounded-xl border border-zinc-200 bg-white/50 animate-pulse ${className}`} />
    );
  }

  return (
    <button
      onClick={toggleTheme}
      type="button"
      className={`px-3 py-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-50 transition-all duration-200 shadow-sm flex items-center justify-center gap-2 cursor-pointer select-none ${className}`}
      aria-label="Toggle theme"
    >
      {theme === "light" ? (
        <>
          <Moon className="w-4 h-4 shrink-0" />
          <span className="text-xs font-semibold">Dark Mode</span>
        </>
      ) : (
        <>
          <Sun className="w-4 h-4 shrink-0 text-amber-500" />
          <span className="text-xs font-semibold">Light Mode</span>
        </>
      )}
    </button>
  );
}
