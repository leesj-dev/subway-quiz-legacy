"use client";

import { memo } from "react";

import type { LineMeta } from "@/lib/data/generated";
import { LineSymbol } from "@/components/LineSymbol";
import { cn } from "@/lib/utils";

/**
 * 호선별로 몇 개 맞혔는지. 기존 버전의 우측 레일을 그대로 옮기되
 * 숫자만 있던 자리에 얇은 진행 막대를 깔아 한눈에 읽히게 했다.
 * (LineCircles와 같은 이유로 memo — 매초 다시 그릴 내용이 아니다.)
 */
export const LineProgress = memo(function LineProgress({
  lines,
  solvedByLine,
  className,
  compact,
}: {
  lines: LineMeta[];
  solvedByLine: Record<string, number>;
  className?: string;
  compact?: boolean;
}) {
  return (
    <ul className={cn("flex flex-col gap-1", className)}>
      {lines.map((line) => {
        const solved = solvedByLine[line.id] ?? 0;
        const pct = Math.round((solved / line.stationCount) * 100);
        const done = solved >= line.stationCount;
        return (
          <li key={line.id} className="flex items-center gap-2">
            <span className={cn("shrink-0", compact ? "size-5" : "size-[1.35rem]")}>
              <LineSymbol line={line} />
            </span>

            <span className="relative h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
              <span
                className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-300"
                style={{ width: `${pct}%`, backgroundColor: line.color }}
              />
            </span>

            <span
              className={cn(
                "tnum shrink-0 text-right text-[11px] leading-none tabular-nums",
                done ? "font-bold text-[var(--success)]" : "text-muted-foreground",
              )}
            >
              <b className={cn("font-bold", !done && "text-foreground")}>{solved}</b>
              <span className="mx-px opacity-50">/</span>
              {line.stationCount}
            </span>
          </li>
        );
      })}
    </ul>
  );
});
