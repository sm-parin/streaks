"use client";

import { cn } from "@/lib/utils/cn";
import { TASK_COLORS } from "@/lib/utils/constants";
import { Check } from "lucide-react";

interface ColorPickerProps {
  selected: string;
  onChange: (color: string) => void;
}

/**
 * Swatch-based colour picker for task colour selection.
 * Shows the preset palette; the active swatch displays a checkmark.
 */
export function ColorPicker({ selected, onChange }: ColorPickerProps) {
  return (
    <div
      role="group"
      aria-label="Select task colour"
      className="flex flex-wrap gap-2"
    >
      {TASK_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          aria-label={`Select colour ${color}`}
          aria-pressed={selected === color}
          className={cn(
            "w-7 h-7 rounded-[var(--radius-full)] flex items-center justify-center",
            "transition-transform duration-[var(--transition-fast)]",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
            selected === color ? "scale-110 ring-2 ring-offset-2 ring-[var(--color-brand)]" : "hover:scale-105"
          )}
          style={{
            backgroundColor: color,
            // @ts-expect-error CSS custom property
            "--tw-ring-color": color,
          }}
        >
          {selected === color && (
            <Check className="w-3.5 h-3.5 text-white drop-shadow" strokeWidth={3} aria-hidden="true" />
          )}
        </button>
      ))}
    </div>
  );
}
