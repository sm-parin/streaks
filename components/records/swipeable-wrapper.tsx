"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";

interface SwipeableWrapperProps {
  onSwipeRight?: () => void;
  onSwipeLeft?: () => void;
  /** Label shown in the right-swipe reveal (mobile) */
  rightLabel?: string;
  /** Label shown in the left-swipe reveal (mobile) */
  leftLabel?: string;
  rightIcon?: React.ReactNode;
  leftIcon?: React.ReactNode;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
}

/** Minimum px the user must drag before the action fires */
const THRESHOLD = 64;

/**
 * Touch-swipe wrapper.
 * - Swipe right → `onSwipeRight`
 * - Swipe left  → `onSwipeLeft`
 * Desktop hover actions are NOT rendered here; they belong inside the child
 * card so they participate in the card's own layout and don't overlap content.
 */
export function SwipeableWrapper({
  onSwipeRight,
  onSwipeLeft,
  rightLabel = "Done",
  leftLabel  = "Delete",
  rightIcon,
  leftIcon,
  disabled,
  children,
  className,
}: SwipeableWrapperProps) {
  const startX   = useRef(0);
  const dragging = useRef(false);
  const [deltaX, setDeltaX] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;
    startX.current   = e.touches[0].clientX;
    dragging.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!dragging.current || disabled) return;
    const dx = e.touches[0].clientX - startX.current;
    const clamped = Math.max(
      onSwipeLeft  ? -120 : 0,
      Math.min(onSwipeRight ? 120 : 0, dx)
    );
    setDeltaX(clamped);
  };

  const handleTouchEnd = () => {
    if (!dragging.current || disabled) return;
    dragging.current = false;
    if      (deltaX >=  THRESHOLD && onSwipeRight) onSwipeRight();
    else if (deltaX <= -THRESHOLD && onSwipeLeft)  onSwipeLeft();
    setDeltaX(0);
  };

  const rightProgress = Math.min(1, deltaX / THRESHOLD);
  const leftProgress  = Math.min(1, -deltaX / THRESHOLD);

  return (
    <div
      className={cn("relative overflow-hidden rounded-lg", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Swipe-right background (complete / primary action) */}
      {onSwipeRight && (
        <div
          className="absolute inset-y-0 left-0 flex items-center gap-2 px-4 rounded-lg bg-[var(--priority-5)] text-white text-sm font-semibold"
          style={{ opacity: rightProgress, width: `${Math.max(0, deltaX)}px` }}
          aria-hidden="true"
        >
          {rightIcon}
          {rightProgress > 0.6 && <span>{rightLabel}</span>}
        </div>
      )}

      {/* Swipe-left background (delete / secondary action) */}
      {onSwipeLeft && (
        <div
          className="absolute inset-y-0 right-0 flex items-center justify-end gap-2 px-4 rounded-lg bg-[var(--priority-1)] text-white text-sm font-semibold"
          style={{ opacity: leftProgress, width: `${Math.max(0, -deltaX)}px` }}
          aria-hidden="true"
        >
          {leftProgress > 0.6 && <span>{leftLabel}</span>}
          {leftIcon}
        </div>
      )}

      {/* Sliding card */}
      <div
        style={{
          transform:  `translateX(${deltaX}px)`,
          transition: dragging.current ? "none" : "transform 200ms ease",
        }}
      >
        {children}
      </div>
    </div>
  );
}
