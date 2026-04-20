"use client";

import { cn } from "@/lib/utils/cn";
import { DAY_NAMES_SHORT } from "@/lib/utils/date";
import type { DayOfWeek } from "@/lib/types";

/** Ordered week starting on Sunday (JS convention) */
const ALL_DAYS: DayOfWeek[] = [0, 1, 2, 3, 4, 5, 6];

interface DayPickerProps {
  selected: DayOfWeek[];
  onChange: (days: DayOfWeek[]) => void;
  /** Applies an error ring when true */
  hasError?: boolean;
}

/**
 * Compact day-of-week multi-selector.
 * Renders seven pill buttons (SunΓÇôSat) that toggle individual days.
 * Selected days are highlighted with the brand colour.
 */
export function DayPicker({ selected, onChange, hasError }: DayPickerProps) {
  const toggle = (day: DayOfWeek) => {
    if (selected.includes(day)) {
      onChange(selected.filter((d) => d !== day));
    } else {
      onChange([...selected, day].sort((a, b) => a - b));
    }
  };

  return (
    <div
      role="group"
      aria-label="Select scheduled days"
      className={cn(
        "flex gap-1.5 flex-wrap",
        hasError && "ring-1 ring-[var(--color-error)] rounded-[var(--radius-md)] p-1"
      )}
    >
      {ALL_DAYS.map((day) => {
        const isSelected = selected.includes(day);
        return (
          <button
            key={day}
            type="button"
            onClick={() => toggle(day)}
            aria-pressed={isSelected}
            aria-label={DAY_NAMES_SHORT[day]}
            className={cn(
              "w-9 h-9 rounded-[var(--radius-full)] text-xs font-semibold",
              "transition-all duration-[var(--transition-fast)]",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-brand)] focus-visible:outline-offset-2",
              isSelected
                ? "bg-[var(--color-brand)] text-white shadow-[var(--shadow-xs)]"
                : "bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]"
            )}
          >
            {DAY_NAMES_SHORT[day]}
          </button>
        );
      })}
    </div>
  );
}
