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
    <div className={cn("space-y-2 mb-4", className)}>
      {/* Search row */}
      <div className="relative">
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Searchâ€¦"
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

      {/* Filter row: < sort > [ Goals ] [ Activities ] < sort > */}
      <div className="flex items-center gap-1.5">
        {/* Goals sort */}
        <button
          onClick={onToggleGoalSort}
          className={cn(
            "p-1.5 rounded-[var(--radius-sm)] border transition-colors shrink-0",
            showGoals
              ? "border-orange-400 bg-orange-500 text-white"
              : "border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]"
          )}
          aria-label={`Sort goals ${goalSort === "asc" ? "descending" : "ascending"}`}
        >
          {goalSort === "asc" ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
        </button>

        {/* Goals pill */}
        <button
          onClick={onToggleGoals}
          className={cn(
            "flex-1 py-1.5 text-xs font-semibold rounded-[var(--radius-md)] border transition-colors",
            showGoals
              ? "bg-orange-500 border-orange-500 text-white"
              : "bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text-secondary)]"
          )}
        >
          Goals
        </button>

        {/* Activities pill */}
        <button
          onClick={onToggleActivities}
          className={cn(
            "flex-1 py-1.5 text-xs font-semibold rounded-[var(--radius-md)] border transition-colors",
            showActivities
              ? "bg-green-500 border-green-500 text-white"
              : "bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text-secondary)]"
          )}
        >
          Activities
        </button>

        {/* Activities sort */}
        <button
          onClick={onToggleActivitySort}
          className={cn(
            "p-1.5 rounded-[var(--radius-sm)] border transition-colors shrink-0",
            showActivities
              ? "border-green-400 bg-green-500 text-white"
              : "border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]"
          )}
          aria-label={`Sort activities ${activitySort === "asc" ? "descending" : "ascending"}`}
        >
          {activitySort === "asc" ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}

