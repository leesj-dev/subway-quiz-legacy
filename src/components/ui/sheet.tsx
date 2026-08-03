"use client";

import * as React from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * 모바일에서 좁은 화면에 다 못 넣는 패널(설정 / 호선별 진행도)을 담는 바텀 시트.
 * 데스크톱에서는 같은 내용이 사이드 패널에 그대로 보이므로 시트를 쓰지 않는다.
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        type="button"
        aria-label="닫기"
        onClick={() => onOpenChange(false)}
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative max-h-[82svh] overflow-y-auto overscroll-contain rounded-t-xl border-t",
          "bg-card p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl",
          "scrollbar-thin animate-rise-in",
        )}
      >
        <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-border" />
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold">{title}</h2>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="닫기"
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
