"use client";
import { X, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type SortDir = "asc" | "desc";

interface SearchFilterBarProps {
  search: string;
  onSearchChange: (v: string) => void;
  showGoals: boolean;
  onToggleGoals: () => void;
  goalSort: SortDir;
  onToggleGoalSort: () => void;
  showActivities: boolean;
  onToggleActivities: () => void;
  activitySort: SortDir;
  onToggleActivitySort: () => void;
  className?: string;
}

export function SearchFilterBar({
  search, onSearchChange,
  showGoals, onToggleGoals, goalSort, onToggleGoalSort,
  showActivities, onToggleActivities, activitySort, onToggleActivitySort,
  className,
}: SearchFilterBarProps) {
  return (
    <div className={cn("flex items-center gap-2 mb-4", className)}>
      {/* Search */}
      <div className="relative flex-1 min-w-0">
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search…"
          className="w-full pl-3 pr-8 py-2 text-sm bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-[var(--radius-md)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]"
        />
        {search && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Goals pill + sort */}
      <div className="flex items-stretch rounded-[var(--radius-md)] border overflow-hidden shrink-0"
        style={{ borderColor: showGoals ? "#F07F13" : "var(--color-border)" }}>
        <button
          onClick={onToggleGoals}
          className={cn(
            "px-2.5 py-1.5 text-xs font-medium transition-colors",
            showGoals ? "bg-orange-500 text-white" : "bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]"
          )}
        >
          Goals
        </button>
        <button
          onClick={onToggleGoalSort}
          className={cn(
            "px-1.5 border-l transition-colors",
            showGoals ? "border-orange-400 bg-orange-500 text-white" : "border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]"
          )}
          aria-label={`Sort goals ${goalSort === "asc" ? "descending" : "ascending"}`}
        >
          {goalSort === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
        </button>
      </div>

      {/* Activities pill + sort */}
      <div className="flex items-stretch rounded-[var(--radius-md)] border overflow-hidden shrink-0"
        style={{ borderColor: showActivities ? "#22C55E" : "var(--color-border)" }}>
        <button
          onClick={onToggleActivities}
          className={cn(
            "px-2.5 py-1.5 text-xs font-medium transition-colors",
            showActivities ? "bg-green-500 text-white" : "bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]"
          )}
        >
          Activities
        </button>
        <button
          onClick={onToggleActivitySort}
          className={cn(
            "px-1.5 border-l transition-colors",
            showActivities ? "border-green-400 bg-green-500 text-white" : "border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]"
          )}
          aria-label={`Sort activities ${activitySort === "asc" ? "descending" : "ascending"}`}
        >
          {activitySort === "asc" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
        </button>
      </div>
    </div>
  );
}
