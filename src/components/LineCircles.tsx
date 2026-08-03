"use client";

import { memo } from "react";

import type { LineMeta } from "@/lib/data/generated";
import { LineSymbol } from "@/components/LineSymbol";
import { cn } from "@/lib/utils";

/**
 * 노선 선택 줄. 눌러서 켜고, 다시 눌러 끈다.
 * 선택된 것만 또렷하고 나머지는 물러난다 — 노선도 쪽 강조와 같은 언어.
 *
 * memo로 감싼 이유: 부모는 타이머 때문에 매초 리렌더된다. 24개 심볼 SVG를
 * 그때마다 다시 diff하면 버튼이 눌리지 않은 것처럼 느껴진다.
 */
export const LineCircles = memo(function LineCircles({
  lines,
  selected,
  disabled,
  onSelect,
  className,
}: {
  lines: LineMeta[];
  selected: string | null;
  disabled?: boolean;
  onSelect: (line: string | null) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-center gap-x-0.5 gap-y-1 sm:gap-x-1 sm:gap-y-1.5",
        className,
      )}
    >
      {lines.map((line) => {
        const active = selected === line.id;
        return (
          <button
            key={line.id}
            type="button"
            disabled={disabled}
            aria-pressed={active}
            aria-label={line.id}
            title={line.id}
            onClick={() => onSelect(active ? null : line.id)}
            className={cn(
              // 누를 때 크기를 바꾸지 않는다. 버튼이 손가락/커서 밑에서 줄어들면
              // pointerup이 버튼 밖에서 일어나 클릭이 통째로 씹힌다. 밝기만 낮춘다.
              "size-[clamp(1.6rem,7vw,2.35rem)] rounded-full transition-[opacity,filter] duration-150",
              "touch-manipulation disabled:cursor-not-allowed",
              active
                ? "opacity-100 ring-2 ring-foreground/70 ring-offset-2 ring-offset-background"
                : "opacity-40 hover:opacity-80 active:brightness-90",
              disabled && !active && "opacity-25",
            )}
          >
            <LineSymbol line={line} />
          </button>
        );
      })}
    </div>
  );
});
