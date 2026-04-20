"use client";

import { useEffect, useCallback } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Accessible modal dialog with backdrop, keyboard dismiss (Escape),
 * body scroll lock, and slide-up animation.
 *
 * On mobile it anchors to the bottom (sheet style); on larger screens
 * it centres in the viewport.
 */
export function Dialog({ open, onClose, title, children, className }: DialogProps) {
  /** Lock body scroll while the dialog is open */
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  /** Dismiss on Escape key */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "dialog-title" : undefined}
      className="fixed inset-0 z-[400] flex items-end sm:items-center justify-center p-4 sm:p-6"
    >
      {/** Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/** Panel */}
      <div
        className={cn(
          "relative w-full max-w-md",
          "bg-[var(--color-surface-raised)] rounded-[var(--radius-2xl)]",
          "shadow-[var(--shadow-lg)] animate-slide-up",
          className
        )}
      >
        {/** Header row (optional) */}
        {title && (
          <div className="flex items-center justify-between px-5 pt-5 pb-0">
            <h2
              id="dialog-title"
              className="text-base font-semibold text-[var(--color-text-primary)]"
            >
              {title}
            </h2>
            <button
              onClick={onClose}
              className={cn(
                "p-1.5 rounded-[var(--radius-sm)]",
                "hover:bg-[var(--color-bg-secondary)]",
                "text-[var(--color-text-secondary)] transition-colors"
              )}
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/** Content */}
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
