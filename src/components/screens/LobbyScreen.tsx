"use client";

import { useState } from "react";
import { Check, Copy, Crown, Loader2 } from "lucide-react";

import { ScreenShell } from "@/components/screens/HomeScreen";
import { SetupPanel } from "@/components/SetupPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { MULTI_MODE_INFO, type GameSettings, type MultiMode } from "@/lib/game";
import type { Player } from "@/lib/room";

/**
 * 대기실. 방장에게는 방식 → 지역 → 호선 → 시간 순서로 그대로 노출하고,
 * 참가자에게는 같은 화면을 읽기 전용으로 보여 준다(무엇이 정해졌는지 알아야 하니까).
 */
export function LobbyScreen({
  code,
  players,
  meId,
  isHost,
  mode,
  settings,
  connected,
  starting,
  onModeChange,
  onSettingsChange,
  onStart,
  onLeave,
}: {
  code: string;
  players: Player[];
  meId: string;
  isHost: boolean;
  mode: MultiMode;
  settings: GameSettings;
  connected: boolean;
  starting: boolean;
  onModeChange: (next: MultiMode) => void;
  onSettingsChange: (next: GameSettings) => void;
  onStart: () => void;
  onLeave: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const canStart = isHost && players.length >= 2 && settings.lines.length > 0;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* 클립보드를 막아 둔 브라우저 — 코드는 화면에 그대로 보인다 */
    }
  };

  return (
    <ScreenShell
      title="대기실"
      onBack={onLeave}
      footer={
        isHost ? (
          <Button className="w-full" size="lg" onClick={onStart} disabled={!canStart}>
            {starting ? <Loader2 className="size-4 animate-spin" /> : null}
            {players.length < 2
              ? "상대를 기다리는 중…"
              : settings.lines.length === 0
                ? "호선을 한 개 이상 켜 주세요"
                : "시작"}
          </Button>
        ) : (
          <p className="py-2 text-center text-sm text-muted-foreground">
            방장이 시작하기를 기다리는 중…
          </p>
        )
      }
    >
      <div className="flex flex-col gap-5">
        <Card className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold tracking-[0.14em] text-muted-foreground uppercase">
                방 코드
              </p>
              <p className="mt-0.5 font-mono text-3xl leading-none font-bold tracking-[0.28em]">
                {code}
              </p>
            </div>
            <Button variant="outline" size="icon" aria-label="코드 복사" onClick={copy}>
              {copied ? (
                <Check className="size-4 text-[var(--success)]" />
              ) : (
                <Copy className="size-4" />
              )}
            </Button>
          </div>

          <ul className="mt-4 flex flex-wrap gap-1.5 border-t pt-3">
            {players.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[13px] font-bold"
              >
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: p.color }}
                />
                {p.name}
                {p.is_host ? (
                  <Crown className="size-3 text-[var(--warning)]" />
                ) : null}
                {p.id === meId ? (
                  <span className="text-xs font-normal text-muted-foreground">나</span>
                ) : null}
              </li>
            ))}
            {!connected ? (
              <li className="flex items-center">
                <Badge variant="warning">연결 중…</Badge>
              </li>
            ) : null}
          </ul>
        </Card>

        <section>
          <h3 className="mb-2 text-[11px] font-bold tracking-[0.14em] text-muted-foreground uppercase">
            방식
          </h3>
          {isHost ? (
            <Segmented
              value={mode}
              onChange={onModeChange}
              options={[
                { value: "territory", label: MULTI_MODE_INFO.territory.label },
                { value: "versus", label: MULTI_MODE_INFO.versus.label },
              ]}
            />
          ) : (
            <div className="rounded-md border bg-card px-3 py-2 text-sm font-bold">
              {MULTI_MODE_INFO[mode].label}
            </div>
          )}
          <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
            {MULTI_MODE_INFO[mode].blurb}
          </p>
        </section>

        <SetupPanel
          settings={settings}
          onChange={onSettingsChange}
          readOnly={!isHost}
        />
      </div>
    </ScreenShell>
  );
}
