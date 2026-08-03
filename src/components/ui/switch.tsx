"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export function Switch({
  checked,
  onCheckedChange,
  disabled,
  className,
  "aria-label": ariaLabel,
}: {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-transparent p-0.5",
        "transition-colors outline-none disabled:cursor-not-allowed disabled:opacity-45",
        checked ? "bg-primary" : "bg-input dark:bg-secondary",
        className,
      )}
    >
      <span
        className={cn(
          "pointer-events-none block size-5 rounded-full bg-card shadow-sm ring-0",
          "transition-transform duration-200",
          checked ? "translate-x-5" : "translate-x-0",
        )}
      />
    </button>
  );
}
