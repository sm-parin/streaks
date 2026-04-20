"use client";

import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "./theme-provider";
import { cn } from "@/lib/utils/cn";
import type { Theme } from "@/lib/types";

const OPTIONS: { value: Theme; icon: React.ReactNode; label: string }[] = [
  { value: "light", icon: <Sun className="w-3.5 h-3.5" />, label: "Light" },
  { value: "dark", icon: <Moon className="w-3.5 h-3.5" />, label: "Dark" },
  { value: "system", icon: <Monitor className="w-3.5 h-3.5" />, label: "System" },
];

/**
 * Three-way toggle for Light / Dark / System theme selection.
 * Renders as a compact pill-style segmented control.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div
      role="group"
      aria-label="Theme selection"
      className={cn(
        "inline-flex items-center gap-0.5 p-0.5",
        "bg-[var(--color-bg-secondary)] rounded-[var(--radius-full)]",
        "border border-[var(--color-border)]"
      )}
    >
      {OPTIONS.map(({ value, icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          aria-label={`Switch to ${label} theme`}
          aria-pressed={theme === value}
          className={cn(
            "inline-flex items-center justify-center w-7 h-7 rounded-[var(--radius-full)]",
            "transition-all duration-[var(--transition-fast)]",
            theme === value
              ? "bg-[var(--color-surface-raised)] text-[var(--color-brand)] shadow-[var(--shadow-xs)]"
              : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          )}
        >
          {icon}
        </button>
      ))}
    </div>
  );
}
