"use client";

import { Minus, Plus } from "lucide-react";

import { LineSymbol } from "@/components/LineSymbol";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { SettingRow } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import type { GameSettings } from "@/lib/game";
import { countStations, REGIONS, type RegionId } from "@/lib/regions";
import { cn } from "@/lib/utils";

/**
 * 싱글/멀티가 함께 쓰는 판 설정.
 * 멀티에서는 방장만 만질 수 있고 참가자에게는 readOnly로 같은 화면을 보여준다.
 */
export function SetupPanel({
  settings,
  onChange,
  readOnly,
}: {
  settings: GameSettings;
  onChange: (next: GameSettings) => void;
  readOnly?: boolean;
}) {
  const region = REGIONS[settings.region];
  const total = countStations(region, settings.lines);
  const enabled = new Set(settings.lines);

  const setRegion = (next: RegionId) => {
    if (next === settings.region) return;
    // 호선 목록이 지역마다 다르므로 지역을 바꾸면 전부 켠 상태로 되돌린다.
    onChange({
      ...settings,
      region: next,
      lines: REGIONS[next].lines.map((l) => l.id),
      minutes: Math.min(settings.minutes, REGIONS[next].maxMinutes),
    });
  };

  const toggleLine = (id: string) => {
    const next = enabled.has(id)
      ? settings.lines.filter((l) => l !== id)
      : [...settings.lines, id];
    onChange({ ...settings, lines: next });
  };

  const setMinutes = (value: number) => {
    const clamped = Math.min(region.maxMinutes, Math.max(1, Math.round(value) || 1));
    onChange({ ...settings, minutes: clamped });
  };

  return (
    <div className={cn("flex flex-col gap-6", readOnly && "pointer-events-none")}>
      <section>
        <SectionLabel>지역</SectionLabel>
        <Segmented
          value={settings.region}
          onChange={setRegion}
          options={[
            { value: "seoul", label: "수도권" },
            { value: "busan", label: "부산" },
          ]}
        />
      </section>

      <section>
        <div className="mb-2 flex items-end justify-between gap-3">
          <SectionLabel className="mb-0">
            호선
            <span className="ml-2 font-normal text-muted-foreground">
              {settings.lines.length}개 · 총{" "}
              <span className="tnum font-bold text-foreground">{total}</span>역
            </span>
          </SectionLabel>
          {!readOnly ? (
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  onChange({ ...settings, lines: region.lines.map((l) => l.id) })
                }
              >
                전체
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onChange({ ...settings, lines: [] })}
              >
                해제
              </Button>
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-[repeat(auto-fill,minmax(6.5rem,1fr))] gap-1.5">
          {region.lines.map((line) => {
            const on = enabled.has(line.id);
            return (
              <button
                key={line.id}
                type="button"
                aria-pressed={on}
                onClick={() => toggleLine(line.id)}
                className={cn(
                  "flex items-center gap-2 rounded-md border px-2 py-1.5 text-left transition-colors",
                  on
                    ? "border-foreground/25 bg-card shadow-xs"
                    : "border-dashed bg-transparent text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "size-5 shrink-0 transition-opacity",
                    on ? "opacity-100" : "opacity-35",
                  )}
                >
                  <LineSymbol line={line} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] leading-tight font-bold">
                    {line.id}
                  </span>
                  <span className="tnum block text-[10px] leading-tight opacity-60">
                    {line.stationCount}역
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {settings.lines.length === 0 ? (
          <p className="mt-2 text-xs text-destructive">
            최소 한 개 호선은 켜야 시작할 수 있습니다.
          </p>
        ) : null}
      </section>

      <section className="divide-y">
        <SettingRow
          label="제한시간"
          hint={`1 ~ ${region.maxMinutes}분`}
          control={
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="1분 줄이기"
                onClick={() => setMinutes(settings.minutes - 1)}
              >
                <Minus className="size-3.5" />
              </Button>
              <Input
                value={settings.minutes}
                inputMode="numeric"
                aria-label="제한시간(분)"
                onChange={(e) => setMinutes(Number(e.target.value.replace(/\D/g, "")))}
                className="tnum h-8 w-14 px-0 text-center text-base font-bold"
              />
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="1분 늘리기"
                onClick={() => setMinutes(settings.minutes + 1)}
              >
                <Plus className="size-3.5" />
              </Button>
              <span className="ml-0.5 text-xs text-muted-foreground">분</span>
            </div>
          }
        />
        <SettingRow
          label="역 눈금 표시"
          hint="역 위치를 알려 주는 표식입니다."
          control={
            <Switch
              checked={settings.showMarks}
              aria-label="역 눈금 표시"
              onCheckedChange={(v) => onChange({ ...settings, showMarks: v })}
            />
          }
        />
      </section>
    </div>
  );
}

function SectionLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h3
      className={cn(
        "mb-2 text-[11px] font-bold tracking-[0.14em] text-muted-foreground uppercase",
        className,
      )}
    >
      {children}
    </h3>
  );
}
