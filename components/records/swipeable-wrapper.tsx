"use client";

import { useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils/cn";

// â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
/** px to drag before entering the reveal stage */
const REVEAL_THRESHOLD = 64;
/** additional px from the reveal anchor to confirm the action */
const CONFIRM_THRESHOLD = 64;
/** ms in reveal state before auto-reset */
const RESET_TIMEOUT = 2000;
/** spring easing â€” overshoots slightly for a physical feel */
const SPRING = "transform 250ms cubic-bezier(0.34, 1.56, 0.64, 1)";

// â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
 * Stage 1 â€” Reveal: drag â‰¥ REVEAL_THRESHOLD â†’ card snaps to locked position,
 *   action hint shown. Auto-resets after 2 s of inactivity.
 * Stage 2 â€” Confirm: from reveal, drag an additional â‰¥ CONFIRM_THRESHOLD
 *   in the same direction â†’ action fires.
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
  // â”€â”€ React render state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [pos, setPos] = useState(0);
  const [phase, setPhase] = useState<SwipePhase>("idle");
  const [useSpring, setUseSpring] = useState(false);

  // â”€â”€ Mutable refs (read inside event handlers without stale closures) â”€â”€â”€â”€â”€â”€â”€
  const phaseRef    = useRef<SwipePhase>("idle");
  const startXRef   = useRef(0);
  const dragging    = useRef(false);
  const anchorXRef  = useRef(0); // X position when reveal was entered
  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  // true = this drag started AFTER the card entered reveal; eligible to confirm on release
  const newDragAfterReveal = useRef(false);
  // true = processMove was called at least once during the current drag
  const hasMoved = useRef(false);
  // peak extra distance during the second drag â€” checked on release to decide confirm
  const peakExtra = useRef(0);

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

  // â”€â”€ Timer helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ Action confirm â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const doConfirm = (dir: "right" | "left") => {
    clearTimer();
    phaseRef.current = "idle";
    setPhase("idle");
    setPos(0);
    setUseSpring(true);
    if (dir === "right") cbRight.current?.();
    else cbLeft.current?.();
  };

  // â”€â”€ Core move logic (reads only from refs + stable setters) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const processMove = (currentX: number) => {
    hasMoved.current = true;
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
        newDragAfterReveal.current = false; // same drag entered reveal; cannot confirm yet
        startTimer();
      } else if (clamped <= -REVEAL_THRESHOLD && canLeft.current) {
        anchorXRef.current  = currentX;
        phaseRef.current    = "revealing-left";
        setPhase("revealing-left");
        setPos(-REVEAL_THRESHOLD);
        setUseSpring(true);
        newDragAfterReveal.current = false;
        startTimer();
      }
    } else if (p === "revealing-right") {
      startTimer();
      const extra = currentX - anchorXRef.current;
      if (newDragAfterReveal.current) {
        peakExtra.current = Math.max(peakExtra.current, extra);
        setPos(Math.min(120, REVEAL_THRESHOLD + Math.max(0, extra)));
        setUseSpring(false);
      }
      if (extra < -REVEAL_THRESHOLD) doSpringReset();
    } else if (p === "revealing-left") {
      startTimer();
      const extra = currentX - anchorXRef.current;
      if (newDragAfterReveal.current) {
        peakExtra.current = Math.min(peakExtra.current, extra);
        setPos(Math.max(-120, -REVEAL_THRESHOLD + Math.min(0, extra)));
        setUseSpring(false);
      }
      if (extra > REVEAL_THRESHOLD) doSpringReset();
    }
  };

  // â”€â”€ Drag start / end â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const startDrag = (x: number) => {
    if (disabled) return;
    setUseSpring(false);
    startXRef.current = x;
    dragging.current  = true;
    hasMoved.current  = false;
    peakExtra.current = 0;
    // If already in reveal, this new drag is eligible to confirm
    if (phaseRef.current !== "idle") {
      anchorXRef.current = x;
      newDragAfterReveal.current = true;
      startTimer();
    }
  };

  const endDrag = () => {
    if (!dragging.current) return;
    dragging.current = false;

    if (phaseRef.current === "idle") {
      setPos(0);
      setUseSpring(true);
      return;
    }

    if (!hasMoved.current) {
      // Pure tap â€” onClick handlers on reveal/card divs handle it
      return;
    }

    // Second swipe released â€” confirm if threshold was reached
    if (newDragAfterReveal.current) {
      if (phaseRef.current === "revealing-right" && peakExtra.current >= CONFIRM_THRESHOLD) {
        doConfirm("right"); return;
      }
      if (phaseRef.current === "revealing-left" && peakExtra.current <= -CONFIRM_THRESHOLD) {
        doConfirm("left"); return;
      }
    }

    // Threshold not reached â†’ spring back to locked reveal position
    const snapTo = phaseRef.current === "revealing-right" ? REVEAL_THRESHOLD : -REVEAL_THRESHOLD;
    setPos(snapTo);
    setUseSpring(true);
  };

  // â”€â”€ Refs for use inside useEffect (always current) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const processMoveRef = useRef(processMove);
  const endDragRef     = useRef(endDrag);
  processMoveRef.current = processMove;
  endDragRef.current     = endDrag;

  // â”€â”€ Document-level mouse events â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ Derived render values â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const isRight      = phase === "revealing-right";
  const isLeft       = phase === "revealing-left";
  const rightOpacity = isRight ? 1 : Math.min(1, pos / REVEAL_THRESHOLD);
  const leftOpacity  = isLeft  ? 1 : Math.min(1, -pos / REVEAL_THRESHOLD);
  const rightWidth   = Math.max(0, pos);
  const leftWidth    = Math.max(0, -pos);

  return (
    <div
      className={cn("relative overflow-hidden rounded-r-lg select-none", className)}
      style={{ cursor: "grab", border: "1px solid var(--color-border)", marginRight: "2px" }}
      onTouchStart={(e) => startDrag(e.touches[0].clientX)}
      onTouchMove={(e)  => { if (dragging.current) processMove(e.touches[0].clientX); }}
      onTouchEnd={endDrag}
      onMouseDown={(e) => {
        startDrag(e.clientX);
        document.body.style.cursor     = "grabbing";
        document.body.style.userSelect = "none";
      }}
    >
      {/* â”€â”€ Right action reveal (green) â€” tap to confirm â”€â”€ */}
      {onSwipeRight && (
        <div
          role="button"
          aria-label={rightLabel}
          onClick={(e) => { e.stopPropagation(); if (phase === "revealing-right") doConfirm("right"); }}
          className="absolute inset-y-0 left-0 flex flex-col items-center justify-center overflow-hidden text-white"
          style={{
            backgroundColor: "#22C55E",
            opacity: rightOpacity,
            width: `${rightWidth}px`,
            minWidth: 0,
            gap: "4px",
            cursor: isRight ? "pointer" : "default",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "22px", height: "22px" }}>{rightIcon}</div>
          {(rightOpacity > 0.6 || isRight) && (
            <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.04em", whiteSpace: "nowrap" }}>{rightLabel}</span>
          )}
        </div>
      )}

      {/* â”€â”€ Left action reveal (red) â€” tap to confirm â”€â”€ */}
      {onSwipeLeft && (
        <div
          role="button"
          aria-label={leftLabel}
          onClick={(e) => { e.stopPropagation(); if (phase === "revealing-left") doConfirm("left"); }}
          className="absolute inset-y-0 right-0 flex flex-col items-center justify-center overflow-hidden text-white"
          style={{
            backgroundColor: "#EF4444",
            opacity: leftOpacity,
            width: `${leftWidth}px`,
            minWidth: 0,
            gap: "4px",
            cursor: isLeft ? "pointer" : "default",
          }}
        >
          {(leftOpacity > 0.6 || isLeft) && (
            <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.04em", whiteSpace: "nowrap" }}>{leftLabel}</span>
          )}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "22px", height: "22px" }}>{leftIcon}</div>
        </div>
      )}

      {/* â”€â”€ Sliding card â€” tap body to cancel when revealed â”€â”€ */}
      <div
        onClickCapture={(e) => {
          if (phase !== "idle") { e.stopPropagation(); doSpringReset(); }
        }}
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
