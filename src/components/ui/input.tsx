import * as React from "react";

import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "h-10 w-full min-w-0 rounded-md border bg-card px-3 text-sm font-medium shadow-xs",
        "transition-[color,box-shadow,border-color] outline-none",
        "placeholder:font-normal placeholder:text-muted-foreground",
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
