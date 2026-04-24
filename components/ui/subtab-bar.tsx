"use client";

import { cn } from "@/lib/utils/cn";

/** A single tab definition for SubTabBar */
export interface SubTab<T extends string = string> {
  id: T;
  label: string;
  /** Optional badge count – shown as a small bubble next to the label */
  count?: number;
}

interface SubTabBarProps<T extends string> {
  tabs: SubTab<T>[];
  active: T;
  onChange: (id: T) => void;
  /** CSS color value for the active indicator and text. Defaults to brand orange */
  accentColor?: string;
  className?: string;
}

/**
 * Underline-style segmented tab bar.
 * Drop-in replacement for the pill/chip pattern — cleaner, more legible.
 */
export function SubTabBar<T extends string>({
  tabs,
  active,
  onChange,
  accentColor = "var(--color-brand)",
  className,
}: SubTabBarProps<T>) {
  return (
    <div
      role="tablist"
      className={cn(
        "flex border-b border-[var(--color-border)] overflow-x-auto scrollbar-none",
        className
      )}
    >
      {tabs.map(({ id, label, count }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(id)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 px-4 py-2.5",
              "text-sm font-medium whitespace-nowrap",
              "border-b-2 -mb-px transition-all duration-[var(--transition-fast)]",
              isActive
                ? "border-current text-[var(--color-text-primary)]"
                : "border-transparent text-[var(--color-text-secondary)]",
              !isActive && "hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-strong)]"
            )}
            style={isActive ? { color: accentColor, borderColor: accentColor } : undefined}
          >
            {label}
            {count != null && (
              <span
                className={cn(
                  "min-w-[18px] text-center text-[10px] font-semibold px-1 py-px rounded-sm tabular-nums",
                  isActive
                    ? "text-white"
                    : "bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]"
                )}
                style={isActive ? { backgroundColor: accentColor } : undefined}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
