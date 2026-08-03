"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export type SegmentedOption<T extends string> = {
  value: T;
  label: React.ReactNode;
};

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  className,
  size = "default",
}: {
  value: T;
  options: readonly SegmentedOption<T>[];
  onChange: (next: T) => void;
  className?: string;
  size?: "default" | "sm";
}) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-grid w-full auto-cols-fr grid-flow-col gap-1 rounded-md bg-muted p-1",
        className,
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "rounded-sm font-bold transition-colors",
              size === "sm" ? "h-7 px-2 text-xs" : "h-9 px-3 text-sm",
              active
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
