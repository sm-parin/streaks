"use client";
import { useState, useEffect, useRef } from "react";
import { X, Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useTags } from "@/lib/hooks/use-tags";

interface Props {
  selectedTagIds: string[];
  onChange: (ids: string[]) => void;
}

export function TagSelector({ selectedTagIds, onChange }: Props) {
  const { tags, isLoading } = useTags();
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  const filteredTags = searchQuery.trim()
    ? tags.filter((t) => t.name.toLowerCase().includes(searchQuery.trim().toLowerCase()))
    : tags;

  const selectedTags = tags.filter((t) => selectedTagIds.includes(t.id));

  const toggle = (id: string) => {
    onChange(
      selectedTagIds.includes(id)
        ? selectedTagIds.filter((x) => x !== id)
        : [...selectedTagIds, id]
    );
  };

  const remove = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedTagIds.filter((x) => x !== id));
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Selected pills */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selectedTags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
              style={{ backgroundColor: tag.color }}
            >
              {tag.name}
              <button
                type="button"
                onClick={(e) => remove(tag.id, e)}
                className="hover:opacity-70 transition-opacity"
                aria-label={`Remove ${tag.name}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") { setIsOpen(false); setSearchQuery(""); }
          }}
          placeholder={isLoading ? "Loading tags…" : "Search tags…"}
          disabled={isLoading}
          className={cn(
            "w-full px-3 py-2 pr-8 text-sm rounded-[var(--radius-md)] border border-[var(--color-border)]",
            "bg-[var(--color-bg)] text-[var(--color-text-primary)]",
            "placeholder:text-[var(--color-text-disabled)]",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]",
            "disabled:opacity-50"
          )}
        />
        <ChevronDown
          className={cn(
            "absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-text-secondary)] pointer-events-none transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          className={cn(
            "absolute z-50 left-0 right-0 mt-1 rounded-[var(--radius-md)] border border-[var(--color-border)]",
            "bg-[var(--color-surface-raised)] shadow-lg overflow-y-auto"
          )}
          style={{ maxHeight: "200px" }}
        >
          {filteredTags.length === 0 ? (
            <p className="px-3 py-3 text-xs text-[var(--color-text-secondary)] text-center">
              {searchQuery ? "No matching tags" : "No tags yet"}
            </p>
          ) : (
            filteredTags.map((tag) => {
              const selected = selectedTagIds.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggle(tag.id)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors",
                    selected
                      ? "bg-[var(--color-brand)]/10 text-[var(--color-text-primary)]"
                      : "hover:bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
                  )}
                >
                  {/* Colour swatch */}
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span className="flex-1 truncate">{tag.name}</span>
                  {selected && (
                    <Check className="w-3.5 h-3.5 text-[var(--color-brand)] shrink-0" />
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
