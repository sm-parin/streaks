"use client";

import { useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils/cn";

// ── Constants ─────────────────────────────────────────────────────────────────
/** px to drag before entering the reveal stage */
const REVEAL_THRESHOLD = 64;
/** additional px from the reveal anchor to confirm the action */
const CONFIRM_THRESHOLD = 64;
/** ms in reveal state before auto-reset */
const RESET_TIMEOUT = 2000;
/** spring easing — overshoots slightly for a physical feel */
const SPRING = "transform 250ms cubic-bezier(0.34, 1.56, 0.64, 1)";

// ── Types ─────────────────────────────────────────────────────────────────────
type SwipePhase = "idle" | "revealing-right" | "revealing-left";

interface SwipeableWrapperProps {
  onSwipeRight?: () => void;
  onSwipeLeft?: () => void;
  rightLabel?: string;
  leftLabel?: string;
  rightIcon?: React.ReactNode;
  leftIcon?: React.ReactNode;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
}

/**
 * Two-stage swipe wrapper with auto-reset and full mouse drag support.
 *
 * Stage 1 — Reveal: drag ≥ REVEAL_THRESHOLD → card snaps to locked position,
 *   action hint shown. Auto-resets after 2 s of inactivity.
 * Stage 2 — Confirm: from reveal, drag an additional ≥ CONFIRM_THRESHOLD
 *   in the same direction → action fires.
 *
 * Works identically on touch and mouse (desktop drag).
 */
export function SwipeableWrapper({
  onSwipeRight,
  onSwipeLeft,
  rightLabel = "Done",
  leftLabel = "Delete",
  rightIcon,
  leftIcon,
  disabled,
  children,
  className,
}: SwipeableWrapperProps) {
  // ── React render state ────────────────────────────────────────────────────
  const [pos, setPos] = useState(0);
  const [phase, setPhase] = useState<SwipePhase>("idle");
  const [useSpring, setUseSpring] = useState(false);

  // ── Mutable refs (read inside event handlers without stale closures) ───────
  const phaseRef    = useRef<SwipePhase>("idle");
  const startXRef   = useRef(0);
  const dragging    = useRef(false);
  const anchorXRef  = useRef(0); // X position when reveal was entered
  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Prop refs so callbacks inside useEffect always see the latest version
  const cbRight  = useRef(onSwipeRight);
  const cbLeft   = useRef(onSwipeLeft);
  const canRight = useRef(!!onSwipeRight);
  const canLeft  = useRef(!!onSwipeLeft);

  // Sync prop refs on every render (no hooks needed, just ref mutation)
  cbRight.current  = onSwipeRight;
  cbLeft.current   = onSwipeLeft;
  canRight.current = !!onSwipeRight;
  canLeft.current  = !!onSwipeLeft;

  // ── Timer helpers ─────────────────────────────────────────────────────────
  const clearTimer = () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  };

  const doSpringReset = () => {
    clearTimer();
    phaseRef.current = "idle";
    setPhase("idle");
    setPos(0);
    setUseSpring(true);
  };

  const startTimer = () => {
    clearTimer();
    timerRef.current = setTimeout(doSpringReset, RESET_TIMEOUT);
  };

  // ── Action confirm ────────────────────────────────────────────────────────
  const doConfirm = (dir: "right" | "left") => {
    clearTimer();
    phaseRef.current = "idle";
    setPhase("idle");
    setPos(0);
    setUseSpring(true);
    if (dir === "right") cbRight.current?.();
    else cbLeft.current?.();
  };

  // ── Core move logic (reads only from refs + stable setters) ──────────────
  const processMove = (currentX: number) => {
    const p = phaseRef.current;

    if (p === "idle") {
      const dx = currentX - startXRef.current;
      const clamped = Math.max(
        canLeft.current ? -120 : 0,
        Math.min(canRight.current ? 120 : 0, dx),
      );
      setPos(clamped);
      setUseSpring(false);

      if (clamped >= REVEAL_THRESHOLD && canRight.current) {
        anchorXRef.current  = currentX;
        phaseRef.current    = "revealing-right";
        setPhase("revealing-right");
        setPos(REVEAL_THRESHOLD);
        setUseSpring(true);   // spring-snap into locked position
        startTimer();
      } else if (clamped <= -REVEAL_THRESHOLD && canLeft.current) {
        anchorXRef.current  = currentX;
        phaseRef.current    = "revealing-left";
        setPhase("revealing-left");
        setPos(-REVEAL_THRESHOLD);
        setUseSpring(true);
        startTimer();
      }
    } else if (p === "revealing-right") {
      startTimer(); // any movement resets the 2 s timer
      const extra = currentX - anchorXRef.current;
      if (extra >= CONFIRM_THRESHOLD)    doConfirm("right");
      else if (extra < -REVEAL_THRESHOLD) doSpringReset();
    } else if (p === "revealing-left") {
      startTimer();
      const extra = currentX - anchorXRef.current;
      if (extra <= -CONFIRM_THRESHOLD)   doConfirm("left");
      else if (extra > REVEAL_THRESHOLD) doSpringReset();
    }
  };

  // ── Drag start / end ──────────────────────────────────────────────────────
  const startDrag = (x: number) => {
    if (disabled) return;
    setUseSpring(false);
    startXRef.current = x;
    dragging.current  = true;
    // If already in reveal, update anchor so second swipe starts from here
    if (phaseRef.current !== "idle") {
      anchorXRef.current = x;
      startTimer();
    }
  };

  const endDrag = () => {
    if (!dragging.current) return;
    dragging.current = false;
    // If didn't reach reveal: spring back to 0
    if (phaseRef.current === "idle") {
      setPos(0);
      setUseSpring(true);
    }
    // If in reveal: stay locked; auto-reset timer is already running
  };

  // ── Refs for use inside useEffect (always current) ────────────────────────
  const processMoveRef = useRef(processMove);
  const endDragRef     = useRef(endDrag);
  processMoveRef.current = processMove;
  endDragRef.current     = endDrag;

  // ── Document-level mouse events ───────────────────────────────────────────
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (dragging.current) processMoveRef.current(e.clientX);
    };
    const onUp = () => {
      if (!dragging.current) return;
      endDragRef.current();
      document.body.style.cursor     = "";
      document.body.style.userSelect = "";
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup",   onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup",   onUp);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount
  useEffect(() => () => {
    clearTimer();
    document.body.style.cursor     = "";
    document.body.style.userSelect = "";
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived render values ─────────────────────────────────────────────────
  const isRight      = phase === "revealing-right";
  const isLeft       = phase === "revealing-left";
  const rightOpacity = isRight ? 1 : Math.min(1, pos / REVEAL_THRESHOLD);
  const leftOpacity  = isLeft  ? 1 : Math.min(1, -pos / REVEAL_THRESHOLD);
  const rightWidth   = isRight ? REVEAL_THRESHOLD : Math.max(0, pos);
  const leftWidth    = isLeft  ? REVEAL_THRESHOLD : Math.max(0, -pos);

  return (
    <div
      className={cn("relative overflow-hidden rounded-lg select-none", className)}
      style={{ cursor: "grab" }}
      onTouchStart={(e) => startDrag(e.touches[0].clientX)}
      onTouchMove={(e)  => { if (dragging.current) processMove(e.touches[0].clientX); }}
      onTouchEnd={endDrag}
      onMouseDown={(e) => {
        startDrag(e.clientX);
        document.body.style.cursor     = "grabbing";
        document.body.style.userSelect = "none";
      }}
    >
      {/* ── Right action reveal (green) ── */}
      {onSwipeRight && (
        <div
          aria-hidden="true"
          className="absolute inset-y-0 left-0 flex items-center gap-2 px-4 text-white text-sm font-semibold overflow-hidden"
          style={{
            backgroundColor: "#22C55E",
            borderRadius: "var(--radius-lg)",
            opacity: rightOpacity,
            width: `${rightWidth}px`,
          }}
        >
          {rightIcon}
          {(rightOpacity > 0.6 || isRight) && <span>{rightLabel}</span>}
        </div>
      )}

      {/* ── Left action reveal (red) ── */}
      {onSwipeLeft && (
        <div
          aria-hidden="true"
          className="absolute inset-y-0 right-0 flex items-center justify-end gap-2 px-4 text-white text-sm font-semibold overflow-hidden"
          style={{
            backgroundColor: "#EF4444",
            borderRadius: "var(--radius-lg)",
            opacity: leftOpacity,
            width: `${leftWidth}px`,
          }}
        >
          {(leftOpacity > 0.6 || isLeft) && <span>{leftLabel}</span>}
          {leftIcon}
        </div>
      )}

      {/* ── Sliding card ── */}
      <div
        style={{
          transform:  `translateX(${pos}px)`,
          transition: useSpring ? SPRING : "none",
          willChange: "transform",
        }}
      >
        {children}
      </div>
    </div>
  );
}
