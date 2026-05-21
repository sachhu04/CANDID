"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      aria-pressed={isDark}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="relative grid h-10 w-[76px] grid-cols-2 items-center rounded-full border border-zinc-200 bg-zinc-100 p-1 text-zinc-500 shadow-inner outline-none transition focus-visible:ring-2 focus-visible:ring-zinc-950 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:focus-visible:ring-white"
    >
      <span
        className={`absolute top-1 h-8 w-8 rounded-full bg-white shadow-sm shadow-zinc-950/15 transition-transform duration-300 dark:bg-zinc-950 ${
          isDark ? "translate-x-9" : "translate-x-0"
        }`}
      />
      <span className={`relative z-10 grid place-items-center transition ${isDark ? "text-zinc-500" : "text-amber-600"}`}>
        <Sun className="h-4 w-4" />
      </span>
      <span className={`relative z-10 grid place-items-center transition ${isDark ? "text-sky-300" : "text-zinc-500"}`}>
        <Moon className="h-4 w-4" />
      </span>
    </button>
  );
}
