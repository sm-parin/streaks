"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, RotateCcw, SlidersHorizontal } from "lucide-react";

export type FilterMode = "Today" | "Daily" | "Weekly" | "Monthly" | "Yearly";

export interface FilterState {
  mode: FilterMode;
  day: number;
  month: number;
  year: number;
}

interface Props {
  value: FilterState;
  onChange: (state: FilterState) => void;
}

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"] as const;
const MODE_OPTIONS: FilterMode[] = ["Today", "Daily", "Weekly", "Monthly", "Yearly"];

function daysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate(); // month is 1-based
}

function clampDay(day: number, month: number, year: number): number {
  return Math.min(day, daysInMonth(month, year));
}

function todayParts(): { day: number; month: number; year: number } {
  const d = new Date();
  return { day: d.getDate(), month: d.getMonth() + 1, year: d.getFullYear() };
}

/** Returns true if the given date is strictly after today */
function isAfterToday(day: number, month: number, year: number): boolean {
  const t = todayParts();
  if (year !== t.year) return year > t.year;
  if (month !== t.month) return month > t.month;
  return day > t.day;
}

export function MilestoneFilterBar({ value, onChange }: Props) {
  const [modeOpen, setModeOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const currentYear = new Date().getFullYear();

  // Close mode popover on outside click
  useEffect(() => {
    if (!modeOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setModeOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [modeOpen]);

  const navigate = (dir: -1 | 1) => {
    let { mode, day, month, year } = value;

    if (mode === "Today") return;

    if (mode === "Daily") {
      const d = new Date(year, month - 1, day);
      d.setDate(d.getDate() + dir);
      const next = { mode, day: d.getDate(), month: d.getMonth() + 1, year: d.getFullYear() };
      if (dir === 1 && isAfterToday(next.day, next.month, next.year)) return;
      onChange(next);
      return;
    }

    if (mode === "Weekly") {
      const d = new Date(year, month - 1, day);
      d.setDate(d.getDate() + dir * 7);
      const next = { mode, day: d.getDate(), month: d.getMonth() + 1, year: d.getFullYear() };
      if (dir === 1 && isAfterToday(next.day, next.month, next.year)) return;
      onChange(next);
      return;
    }

    if (mode === "Monthly") {
      let nm = month + dir;
      let ny = year;
      if (nm < 1) { nm = 12; ny -= 1; }
      if (nm > 12) { nm = 1; ny += 1; }
      const nd = clampDay(day, nm, ny);
      const next = { mode, day: nd, month: nm, year: ny };
      if (dir === 1 && isAfterToday(nd, nm, ny)) return;
      onChange(next);
      return;
    }

    if (mode === "Yearly") {
      const ny = year + dir;
      if (ny > currentYear) return;
      onChange({ mode, day, month, year: ny });
    }
  };

  const resetToToday = () => {
    const t = todayParts();
    onChange({ mode: value.mode, ...t });
  };

  const selectMode = (mode: FilterMode) => {
    const t = todayParts();
    onChange({ mode, day: t.day, month: t.month, year: t.year });
    setModeOpen(false);
  };

  const dayDisabled  = value.mode !== "Daily";
  const monthDisabled = value.mode === "Today" || value.mode === "Yearly";
  const yearDisabled  = value.mode === "Today";

  const selectClass = (disabled: boolean) =>
    `border border-[var(--color-border)] rounded-lg text-xs py-1 px-1.5 bg-[var(--color-bg)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-brand)] ${
      disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
    }`;

  const btnClass = "flex items-center justify-center w-7 h-7 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-raised)] transition-colors";

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {/* ◄ Navigate back */}
      <button
        onClick={() => navigate(-1)}
        disabled={value.mode === "Today"}
        className={btnClass + (value.mode === "Today" ? " opacity-30 cursor-not-allowed" : "")}
        aria-label="Navigate back"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* Day dropdown */}
      <select
        value={value.day}
        disabled={dayDisabled}
        className={selectClass(dayDisabled)}
        onChange={(e) => {
          const nd = Number(e.target.value);
          if (!isAfterToday(nd, value.month, value.year)) onChange({ ...value, day: nd });
        }}
      >
        {Array.from({ length: daysInMonth(value.month, value.year) }, (_, i) => i + 1).map((d) => (
          <option key={d} value={d}>{String(d).padStart(2, "0")}</option>
        ))}
      </select>

      {/* Month dropdown */}
      <select
        value={value.month}
        disabled={monthDisabled}
        className={selectClass(monthDisabled)}
        onChange={(e) => {
          const nm = Number(e.target.value);
          const nd = clampDay(value.day, nm, value.year);
          if (!isAfterToday(nd, nm, value.year)) onChange({ ...value, month: nm, day: nd });
        }}
      >
        {MONTH_NAMES.map((name, i) => (
          <option key={i + 1} value={i + 1}>{name}</option>
        ))}
      </select>

      {/* Year dropdown */}
      <select
        value={value.year}
        disabled={yearDisabled}
        className={selectClass(yearDisabled)}
        onChange={(e) => {
          const ny = Number(e.target.value);
          const nd = clampDay(value.day, value.month, ny);
          if (!isAfterToday(nd, value.month, ny)) onChange({ ...value, year: ny, day: nd });
        }}
      >
        {Array.from({ length: 4 }, (_, i) => currentYear - 3 + i).map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>

      {/* ► Navigate forward */}
      <button
        onClick={() => navigate(1)}
        disabled={value.mode === "Today"}
        className={btnClass + (value.mode === "Today" ? " opacity-30 cursor-not-allowed" : "")}
        aria-label="Navigate forward"
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      {/* Reset to today */}
      <button onClick={resetToToday} className={btnClass} aria-label="Reset to today">
        <RotateCcw className="w-3.5 h-3.5" />
      </button>

      {/* Mode picker */}
      <div className="relative ml-auto" ref={menuRef}>
        <button
          onClick={() => setModeOpen((o) => !o)}
          className={btnClass + " gap-1 px-2 w-auto text-xs font-medium"}
          aria-label="Select mode"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>{value.mode}</span>
        </button>
        {modeOpen && (
          <div className="absolute right-0 top-full mt-1 z-50 min-w-[110px] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] shadow-xl py-1">
            {MODE_OPTIONS.map((m) => (
              <button
                key={m}
                onClick={() => selectMode(m)}
                className={`w-full text-left px-3 py-2 text-xs hover:bg-[var(--color-bg-secondary)] transition-colors ${
                  value.mode === m ? "text-[var(--color-brand)] font-semibold" : "text-[var(--color-text-primary)]"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
