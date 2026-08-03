"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * 네이티브 range를 쓰되 track/thumb만 CSS로 그린다.
 * 채워진 구간은 background gradient로 표현해서 별도 DOM 없이 처리.
 */
export function Slider({
  value,
  min = 0,
  max = 100,
  step = 1,
  onValueChange,
  className,
  "aria-label": ariaLabel,
}: {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onValueChange: (next: number) => void;
  className?: string;
  "aria-label"?: string;
}) {
  const pct = max === min ? 0 : ((value - min) / (max - min)) * 100;

  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      aria-label={ariaLabel}
      onChange={(e) => onValueChange(Number(e.target.value))}
      style={{ "--slider-pct": `${pct}%` } as React.CSSProperties}
      className={cn(
        // 트랙 6px + 썸 16px. 높이를 썸에 맞춰야 줄 안에서 세로 중앙에 온다.
        "block h-4 w-full cursor-pointer appearance-none bg-transparent outline-none",
        // track
        "[&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full",
        "[&::-webkit-slider-runnable-track]:bg-[linear-gradient(to_right,var(--primary)_0,var(--primary)_var(--slider-pct),var(--input)_var(--slider-pct),var(--input)_100%)]",
        "[&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-input",
        "[&::-moz-range-progress]:h-1.5 [&::-moz-range-progress]:rounded-full [&::-moz-range-progress]:bg-primary",
        // thumb — 트랙(6px) 한가운데 오도록 (6 - 16) / 2 = -5px 만큼 끌어올린다
        "[&::-webkit-slider-thumb]:-mt-[5px] [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none",
        "[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary",
        "[&::-webkit-slider-thumb]:bg-card [&::-webkit-slider-thumb]:shadow-sm",
        "[&::-webkit-slider-thumb]:transition-transform [&:active::-webkit-slider-thumb]:scale-110",
        "[&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2",
        "[&::-moz-range-thumb]:border-primary [&::-moz-range-thumb]:bg-card",
        className,
      )}
    />
  );
}
