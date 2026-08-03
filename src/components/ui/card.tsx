import * as React from "react";

import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-card text-card-foreground shadow-xs",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-1 p-5 pb-3", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3
      className={cn("text-base font-bold tracking-tight", className)}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      className={cn("text-[13px] leading-relaxed text-muted-foreground", className)}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("p-5 pt-0", className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("flex items-center gap-2 p-5 pt-0", className)} {...props} />
  );
}

/** 설정 화면에서 반복되는 "제목 + 설명 + 컨트롤" 한 줄. */
export function SettingRow({
  label,
  hint,
  control,
  className,
}: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  control: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-4 py-2.5", className)}>
      <div className="min-w-0">
        <div className="text-sm font-bold">{label}</div>
        {hint ? (
          <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>
        ) : null}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}
