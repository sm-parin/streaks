"use client";

import { useState } from "react";

interface Point {
  label: string;
  value: number; // 0.0 – 1.0
}

interface Props {
  points: Point[];
}

const W = 600;
const H = 200;
const PAD_LEFT = 38;  // room for Y-axis labels
const PAD_RIGHT = 12;
const PAD_TOP = 12;
const PAD_BOTTOM = 32; // room for X-axis labels

const GRAPH_W = W - PAD_LEFT - PAD_RIGHT;
const GRAPH_H = H - PAD_TOP - PAD_BOTTOM;

const Y_TICKS = [0, 0.25, 0.5, 0.75, 1];
const BRAND = "#F07F13";

function toX(index: number, total: number): number {
  if (total <= 1) return PAD_LEFT + GRAPH_W / 2;
  return PAD_LEFT + (index / (total - 1)) * GRAPH_W;
}

function toY(value: number): number {
  return PAD_TOP + (1 - value) * GRAPH_H;
}

export function LineGraph({ points }: Props) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; label: string; pct: string } | null>(null);

  if (points.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm text-[var(--color-text-secondary)]">No data for this period.</p>
      </div>
    );
  }

  const polylinePoints = points
    .map((p, i) => `${toX(i, points.length)},${toY(p.value)}`)
    .join(" ");

  // Thin out X labels if too many points
  const maxLabels = 12;
  const step = points.length <= maxLabels ? 1 : Math.ceil(points.length / maxLabels);

  return (
    <div className="relative w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        style={{ overflow: "visible", display: "block" }}
        aria-label="Completion rate over time"
      >
        {/* ── Horizontal grid lines + Y labels ── */}
        {Y_TICKS.map((tick) => {
          const y = toY(tick);
          return (
            <g key={tick}>
              <line
                x1={PAD_LEFT} y1={y} x2={PAD_LEFT + GRAPH_W} y2={y}
                stroke="var(--color-border)"
                strokeWidth={1}
                strokeDasharray={tick === 0 ? "0" : "4 4"}
              />
              <text
                x={PAD_LEFT - 5} y={y + 4}
                textAnchor="end"
                fontSize={10}
                fill="var(--color-text-disabled)"
              >
                {Math.round(tick * 100)}%
              </text>
            </g>
          );
        })}

        {/* ── X labels ── */}
        {points.map((p, i) => {
          if (i % step !== 0 && i !== points.length - 1) return null;
          const x = toX(i, points.length);
          return (
            <text
              key={i}
              x={x} y={H - 6}
              textAnchor="middle"
              fontSize={9}
              fill="var(--color-text-disabled)"
            >
              {p.label}
            </text>
          );
        })}

        {/* ── Data polyline ── */}
        <polyline
          points={polylinePoints}
          fill="none"
          stroke={BRAND}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* ── Data points + hover areas ── */}
        {points.map((p, i) => {
          const cx = toX(i, points.length);
          const cy = toY(p.value);
          return (
            <g key={i}>
              <circle cx={cx} cy={cy} r={4} fill={BRAND} />
              {/* Invisible larger hit area for touch */}
              <circle
                cx={cx} cy={cy} r={14}
                fill="transparent"
                onMouseEnter={() => setTooltip({ x: cx, y: cy, label: p.label, pct: `${Math.round(p.value * 100)}%` })}
                onMouseLeave={() => setTooltip(null)}
                onTouchStart={() => setTooltip({ x: cx, y: cy, label: p.label, pct: `${Math.round(p.value * 100)}%` })}
                onTouchEnd={() => setTooltip(null)}
                style={{ cursor: "pointer" }}
              />
              {/* SVG tooltip (shows when hovering) */}
              {tooltip && tooltip.x === cx && tooltip.y === cy && (
                <g>
                  <rect
                    x={cx - 28} y={cy - 34}
                    width={56} height={20}
                    rx={4}
                    fill="var(--color-surface-raised)"
                    stroke="var(--color-border)"
                    strokeWidth={1}
                  />
                  <text
                    x={cx} y={cy - 20}
                    textAnchor="middle"
                    fontSize={10}
                    fill="var(--color-text-primary)"
                    fontWeight="600"
                  >
                    {tooltip.pct}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
