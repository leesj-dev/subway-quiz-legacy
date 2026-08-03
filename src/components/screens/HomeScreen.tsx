"use client";

import { ChevronRight, Users, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function HomeScreen({
  onSingle,
  onMulti,
  multiDisabled,
}: {
  onSingle: () => void;
  onMulti: () => void;
  multiDisabled?: boolean;
}) {
  return (
    <div className="mx-auto flex min-h-[100svh] w-full max-w-lg flex-col justify-center px-5 py-10">
      <header className="animate-rise-in">
        <p className="text-[11px] font-bold tracking-[0.22em] text-muted-foreground uppercase">
          Subway Quiz
        </p>
        <h1 className="mt-1.5 text-[clamp(2rem,8vw,2.75rem)] leading-[1.1] font-bold tracking-tight">
          지하철 노선도
          <br />
          퀴즈
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          노선을 고르고 그 노선에 있는 역 이름을 적어 넣습니다.
          <br />
          수도권 655역, 부산 147역.
        </p>
      </header>

      <RouteRule className="my-8" />

      <div
        className="flex flex-col gap-2.5 animate-rise-in"
        style={{ animationDelay: "80ms" }}
      >
        <ModeCard
          icon={<User className="size-5" />}
          title="싱글플레이"
          blurb="혼자 제한시간 안에 최대한 많이."
          onClick={onSingle}
        />
        <ModeCard
          icon={<Users className="size-5" />}
          title="멀티플레이"
          blurb={
            multiDisabled
              ? "서버 설정이 없어 지금은 쓸 수 없습니다."
              : "방을 만들거나 코드로 참가해 겨룹니다."
          }
          onClick={onMulti}
          disabled={multiDisabled}
        />
      </div>
    </div>
  );
}

/** 노선도에서 따온 장식. 얇은 선 위에 역 표식이 놓인 형태. */
function RouteRule({ className }: { className?: string }) {
  return (
    <div className={cn("relative h-3", className)} aria-hidden>
      <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border" />
      <div className="absolute inset-y-0 flex w-full items-center justify-between">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <span
            key={i}
            className={cn(
              "block rounded-full bg-border",
              i === 2 ? "size-2 bg-foreground/70" : "size-1.5",
            )}
          />
        ))}
      </div>
    </div>
  );
}

function ModeCard({
  icon,
  title,
  blurb,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  title: string;
  blurb: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "group flex items-center gap-4 rounded-lg border bg-card p-4 text-left shadow-xs",
        "transition-[background-color,border-color,transform] hover:border-foreground/25 hover:bg-accent",
        "active:translate-y-px disabled:pointer-events-none disabled:opacity-50",
      )}
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-bold">{title}</span>
        <span className="mt-0.5 block text-[13px] text-muted-foreground">{blurb}</span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}

export function ScreenShell({
  title,
  onBack,
  children,
  footer,
}: {
  title: React.ReactNode;
  onBack?: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-[100svh] w-full max-w-lg flex-col px-5 py-6">
      <header className="mb-5 flex items-center gap-3">
        {onBack ? (
          <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2">
            ← 뒤로
          </Button>
        ) : null}
        <h1 className="text-lg font-bold tracking-tight">{title}</h1>
      </header>

      <div className="flex-1 animate-rise-in">{children}</div>

      {footer ? (
        <div className="sticky bottom-0 mt-6 -mx-5 border-t bg-background/85 px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
          {footer}
        </div>
      ) : null}
    </div>
  );
}
