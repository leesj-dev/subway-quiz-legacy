"use client";

import type { LineMeta } from "@/lib/data/generated";
import { LineSymbol } from "@/components/LineSymbol";
import { cn } from "@/lib/utils";

/**
 * 노선 선택 줄. 눌러서 켜고, 다시 눌러 끈다.
 * 선택된 것만 또렷하고 나머지는 물러난다 — 노선도 쪽 강조와 같은 언어.
 */
export function LineCircles({
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
        "flex flex-wrap items-center justify-center gap-x-1 gap-y-1.5",
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
              "size-[clamp(1.85rem,4.2vw,2.35rem)] rounded-full transition-[opacity,transform] duration-150",
              "disabled:cursor-not-allowed",
              active
                ? "opacity-100 ring-2 ring-foreground/70 ring-offset-2 ring-offset-background"
                : "opacity-40 hover:opacity-80 active:scale-95",
              disabled && !active && "opacity-25",
            )}
          >
            <LineSymbol line={line} />
          </button>
        );
      })}
    </div>
  );
}
