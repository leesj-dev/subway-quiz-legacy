"use client";

import { Crown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type ResultPlayer = {
  id: string;
  name: string;
  color: string;
  score: number;
  isMe: boolean;
};

export function ResultOverlay({
  solved,
  total,
  highScore,
  players,
  onReplay,
  replayLabel = "다시 하기",
  onHome,
}: {
  solved: number;
  total: number;
  highScore?: number | null;
  players?: ResultPlayer[];
  onReplay?: () => void;
  replayLabel?: string;
  onHome: () => void;
}) {
  const complete = total > 0 && solved >= total;
  const ranked = players ? [...players].sort((a, b) => b.score - a.score) : null;
  const topScore = ranked?.[0]?.score ?? 0;

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-background/70 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-sm animate-rise-in p-6">
        <p className="text-[11px] font-bold tracking-[0.18em] text-muted-foreground uppercase">
          {complete ? "Complete" : "Time up"}
        </p>

        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="tnum text-5xl leading-none font-bold tracking-tight">
            {solved}
          </span>
          <span className="tnum text-lg text-muted-foreground">/ {total}</span>
        </div>

        {highScore != null ? (
          <p className="mt-2 text-xs text-muted-foreground">
            최고기록 <span className="tnum font-bold text-foreground">{highScore}</span>
            {solved >= highScore && solved > 0 ? (
              <span className="ml-1.5 font-bold text-[var(--success)]">신기록!</span>
            ) : null}
          </p>
        ) : null}

        {ranked ? (
          <ul className="mt-5 flex flex-col gap-1.5 border-t pt-4">
            {ranked.map((p) => {
              const winning = p.score === topScore && topScore > 0;
              return (
                <li
                  key={p.id}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2 py-1.5",
                    p.isMe && "bg-accent",
                  )}
                >
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: p.color }}
                  />
                  <span className="min-w-0 flex-1 truncate text-sm font-bold">
                    {p.name}
                    {p.isMe ? (
                      <span className="ml-1 text-xs font-normal text-muted-foreground">
                        (나)
                      </span>
                    ) : null}
                  </span>
                  {winning ? (
                    <Crown className="size-3.5 text-[var(--warning)]" />
                  ) : null}
                  <span className="tnum text-sm font-bold">{p.score}</span>
                </li>
              );
            })}
          </ul>
        ) : null}

        <div className="mt-6 flex gap-2">
          {onReplay ? (
            <Button className="flex-1" onClick={onReplay}>
              {replayLabel}
            </Button>
          ) : null}
          <Button variant="outline" className="flex-1" onClick={onHome}>
            처음으로
          </Button>
        </div>
      </Card>
    </div>
  );
}
