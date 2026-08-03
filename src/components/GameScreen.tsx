"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ListOrdered, LogOut, Settings2 } from "lucide-react";

import { LineCircles } from "@/components/LineCircles";
import { LineProgress } from "@/components/LineProgress";
import { ResultOverlay, type ResultPlayer } from "@/components/ResultOverlay";
import { SubwayMap } from "@/components/SubwayMap";
import { ViewSettingsPanel } from "@/components/ViewSettingsPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import {
  DEFAULT_VIEW,
  MULTI_MODE_INFO,
  type GameSettings,
  type MultiMode,
  type ViewSettings,
} from "@/lib/game";
import type { MapEngineHandle } from "@/lib/mapEngine";
import { countStations, REGIONS, resolveStationIds } from "@/lib/regions";
import type { Claim, Player } from "@/lib/room";
import { claimStation, endGame, setScore } from "@/lib/room";
import { readHighScore, writeHighScore } from "@/lib/storage";
import { useCountdown } from "@/lib/useCountdown";
import { cn, formatClock } from "@/lib/utils";

export type MultiContext = {
  mode: MultiMode;
  code: string;
  me: Player;
  players: Player[];
  claims: Claim[];
  /** 서버 시각 기준 (로컬 시계 오차를 이미 뺀 값). */
  startsAt: number;
  endsAt: number;
  isHost: boolean;
};

type Toast = { kind: "correct" | "wrong" | "duplicate" | "warning"; text: string };

type Answer = { id: string; lines: string[] };

export function GameScreen({
  settings,
  multi,
  onExit,
  onReplay,
}: {
  settings: GameSettings;
  multi?: MultiContext;
  onExit: () => void;
  onReplay?: () => void;
}) {
  const region = REGIONS[settings.region];
  const playableLines = useMemo(
    () => region.lines.filter((l) => settings.lines.includes(l.id)),
    [region, settings.lines],
  );
  const total = useMemo(
    () => countStations(region, settings.lines),
    [region, settings.lines],
  );

  const [engine, setEngine] = useState<MapEngineHandle | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [view, setView] = useState<ViewSettings>(DEFAULT_VIEW);
  const [localAnswers, setLocalAnswers] = useState<Answer[]>([]);
  const [toast, setToast] = useState<Toast | null>(null);
  const [ended, setEnded] = useState(false);
  const [sheet, setSheet] = useState<"none" | "view" | "progress">("none");

  const inputRef = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  const isTerritory = multi?.mode === "territory";

  // ── 진행 상황 ────────────────────────────────────────────────────────────
  // 땅따먹기에서는 서버의 claims가 곧 내 답안지다. 나머지 모드는 로컬로 센다.
  const myAnswers: Answer[] = useMemo(() => {
    if (!isTerritory || !multi) return localAnswers;
    return multi.claims
      .filter((c) => c.player_id === multi.me.id)
      .map((c) => ({ id: c.station, lines: c.lines }));
  }, [isTerritory, multi, localAnswers]);

  const solvedByLine = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const line of playableLines) counts[line.id] = 0;
    for (const answer of myAnswers) {
      for (const line of answer.lines) {
        if (line in counts) counts[line] += 1;
      }
    }
    return counts;
  }, [myAnswers, playableLines]);

  const solved = myAnswers.length;

  // ── 타이머 ───────────────────────────────────────────────────────────────
  // 싱글은 노선도가 다 뜬 순간부터 잰다. 로딩 시간을 뺏기지 않도록.
  const [soloEndsAt, setSoloEndsAt] = useState<number | null>(null);
  const handleEngineReady = useCallback(
    (next: MapEngineHandle) => {
      setEngine(next);
      if (!multi) setSoloEndsAt(Date.now() + settings.minutes * 60_000);
    },
    [multi, settings.minutes],
  );

  const endsAt = multi ? multi.endsAt : soloEndsAt;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!multi) return;
    const id = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(id);
  }, [multi]);

  const starting = Boolean(multi && now < multi.startsAt);

  // ── 지도 반영 ────────────────────────────────────────────────────────────
  useEffect(() => {
    engine?.setMarksVisible(settings.showMarks);
  }, [engine, settings.showMarks]);

  useEffect(() => {
    engine?.setDimOpacity(view.dim);
  }, [engine, view.dim]);

  useEffect(() => {
    engine?.setTransferColors(view.transferColors);
  }, [engine, view.transferColors]);

  useEffect(() => {
    engine?.setZoomOnSelect(view.zoomOnSelect);
  }, [engine, view.zoomOnSelect]);

  useEffect(() => {
    engine?.selectLine(selected);
  }, [engine, selected]);

  // 땅따먹기: 누가 차지했든 그 사람 색으로 노선도에 찍는다.
  const paintedRef = useRef(new Set<string>());
  useEffect(() => {
    if (!engine || !isTerritory || !multi) return;
    const colorOf = new Map(multi.players.map((p) => [p.id, p.color]));
    for (const claim of multi.claims) {
      if (paintedRef.current.has(claim.station)) continue;
      paintedRef.current.add(claim.station);
      engine.reveal(claim.station, colorOf.get(claim.player_id) ?? "#525252");
    }
  }, [engine, isTerritory, multi]);

  // 대결: 상대 화면에 내 점수만 실시간으로 흘려보낸다.
  useEffect(() => {
    if (!multi || multi.mode !== "versus") return;
    const id = window.setTimeout(() => void setScore(multi.me.id, solved), 400);
    return () => window.clearTimeout(id);
  }, [multi, solved]);

  // ── 종료 처리 ────────────────────────────────────────────────────────────
  const [highScore, setHighScore] = useState(() =>
    multi ? 0 : readHighScore(settings),
  );

  const endedRef = useRef(false);
  const solvedRef = useRef(solved);
  useEffect(() => {
    solvedRef.current = solved;
  });

  const finish = useCallback(() => {
    if (endedRef.current || !engine) return;
    endedRef.current = true;
    setEnded(true);
    setSelected(null);
    engine.revealMissed();
    if (multi) {
      if (multi.isHost) void endGame(multi.code);
    } else {
      setHighScore(writeHighScore(settings, solvedRef.current));
    }
  }, [engine, multi, settings]);

  const remaining = useCountdown(ended ? null : endsAt, finish);
  const playing = Boolean(engine) && !ended && !starting;

  // 판이 다 차면 시간이 남아도 끝난다.
  // 땅따먹기는 내 몫이 아니라 '남은 역이 없는지'로 따져야 한다.
  const filled = isTerritory && multi ? multi.claims.length : solved;
  useEffect(() => {
    if (playing && total > 0 && filled >= total) finish();
  }, [playing, filled, total, finish]);

  // ── 정답 처리 ────────────────────────────────────────────────────────────
  const flash = useCallback((next: Toast) => {
    window.clearTimeout(toastTimer.current);
    setToast(null);
    // 같은 팝업이 연속으로 뜰 때 애니메이션이 다시 돌도록 한 프레임 비운다.
    requestAnimationFrame(() => {
      setToast(next);
      toastTimer.current = window.setTimeout(() => setToast(null), 1800);
    });
  }, []);

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const submit = useCallback(
    async (raw: string) => {
      if (!engine || !playing) return;
      if (!raw.trim()) return;
      if (!selected) {
        flash({ kind: "warning", text: "노선 선택" });
        return;
      }

      const hit = engine.findStation(
        resolveStationIds(region, raw, selected),
        selected,
      );
      if (!hit) {
        flash({ kind: "wrong", text: "오답" });
        return;
      }
      if (hit.revealed) {
        flash({
          kind: "duplicate",
          text: isTerritory ? "이미 차지됨" : "이미 제출",
        });
        return;
      }

      if (isTerritory && multi) {
        const result = await claimStation({
          code: multi.code,
          station: hit.id,
          playerId: multi.me.id,
          lines: hit.lines,
        });
        if (result === "won") {
          paintedRef.current.add(hit.id);
          engine.reveal(hit.id, multi.me.color);
          flash({ kind: "correct", text: "차지!" });
        } else {
          flash({ kind: "duplicate", text: "한발 늦음" });
        }
        return;
      }

      engine.reveal(hit.id);
      setLocalAnswers((prev) => [...prev, { id: hit.id, lines: hit.lines }]);
      flash({ kind: "correct", text: "정답" });
    },
    [engine, playing, selected, region, flash, isTerritory, multi],
  );

  /** 입력칸을 읽고 비운 뒤 채점한다. */
  const commit = useCallback(() => {
    const input = inputRef.current;
    if (!input) return;
    const value = input.value;
    input.value = "";
    // Enter가 한글 조합을 끝내면서 input 이벤트를 한 번 더 흘린다.
    // 그 이벤트가 방금 지운 글자를 되돌려 놓으므로 다음 틱에 한 번 더 비운다.
    setTimeout(() => {
      if (inputRef.current) inputRef.current.value = "";
    }, 0);
    void submit(value);
  }, [submit]);

  const resultPlayers: ResultPlayer[] | undefined = multi
    ? multi.players.map((p) => ({
        id: p.id,
        name: p.name,
        color: p.color,
        score: isTerritory
          ? multi.claims.filter((c) => c.player_id === p.id).length
          : p.id === multi.me.id
            ? solved
            : p.score,
        isMe: p.id === multi.me.id,
      }))
    : undefined;

  const clock = formatClock(remaining);
  const urgent = !ended && remaining <= 30;

  const scoreBlock = (
    <div className="flex items-baseline gap-1">
      <span className="tnum text-2xl leading-none font-bold lg:text-3xl">{solved}</span>
      <span className="tnum text-sm text-muted-foreground">/ {total}</span>
    </div>
  );

  const opponents = multi?.players.filter((p) => p.id !== multi.me.id) ?? [];

  return (
    <div className="flex h-[100svh] flex-col gap-2 overflow-hidden p-2 lg:flex-row lg:gap-3 lg:p-3">
      {/* ── 왼쪽 패널 (모바일에서는 상단 바) ───────────────────────────── */}
      <aside className="flex shrink-0 items-center gap-2 lg:w-[286px] lg:flex-col lg:items-stretch lg:gap-3 lg:overflow-y-auto lg:pr-0.5 lg:scrollbar-thin">
        <Card className="flex items-center gap-3 p-2.5 lg:flex-col lg:items-stretch lg:gap-2 lg:p-4">
          <div className="hidden items-center justify-between lg:flex">
            <h1 className="text-sm font-bold tracking-tight">
              {region.label} 도시철도 QUIZ
            </h1>
            {multi ? (
              <Badge variant="secondary">{MULTI_MODE_INFO[multi.mode].label}</Badge>
            ) : null}
          </div>

          <div
            className={cn(
              "tnum text-3xl leading-none font-bold tracking-tight tabular-nums lg:text-center lg:text-[3.25rem]",
              urgent && "text-destructive",
            )}
          >
            {clock}
          </div>

          <div className="ml-auto flex items-center gap-3 lg:ml-0 lg:justify-center">
            <span className="hidden text-[11px] font-bold tracking-[0.14em] text-muted-foreground uppercase lg:inline">
              Score
            </span>
            {scoreBlock}
          </div>
        </Card>

        {/* 상대 점수 */}
        {opponents.length > 0 ? (
          <Card className="hidden p-3 lg:block">
            <p className="mb-2 text-[11px] font-bold tracking-[0.14em] text-muted-foreground uppercase">
              상대
            </p>
            <ul className="flex flex-col gap-1.5">
              {opponents.map((p) => (
                <li key={p.id} className="flex items-center gap-2 text-sm">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: p.color }}
                  />
                  <span className="min-w-0 flex-1 truncate font-bold">{p.name}</span>
                  <span className="tnum font-bold">
                    {isTerritory
                      ? multi!.claims.filter((c) => c.player_id === p.id).length
                      : p.score}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}

        <Card className="hidden p-4 lg:block">
          <ViewSettingsPanel value={view} onChange={setView} />
        </Card>

        <div className="hidden lg:mt-auto lg:block">
          <Button variant="outline" className="w-full" onClick={onExit}>
            <LogOut className="size-4" />
            {multi ? "방 나가기" : "그만두기"}
          </Button>
        </div>

        {/* 모바일 전용 액션 */}
        <div className="flex gap-1 lg:hidden">
          <Button
            variant="outline"
            size="icon"
            aria-label="보기 설정"
            onClick={() => setSheet("view")}
          >
            <Settings2 className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="호선별 진행도"
            onClick={() => setSheet("progress")}
          >
            <ListOrdered className="size-4" />
          </Button>
          <Button variant="outline" size="icon" aria-label="나가기" onClick={onExit}>
            <LogOut className="size-4" />
          </Button>
        </div>
      </aside>

      {/* ── 노선도 + 입력 ────────────────────────────────────────────────── */}
      <main className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
        <SubwayMap
          key={`${settings.region}:${settings.lines.join(",")}`}
          region={region}
          enabledLines={settings.lines}
          onReady={handleEngineReady}
          className="min-h-0 flex-1"
        />

        <LineCircles
          lines={playableLines}
          selected={selected}
          disabled={!playing}
          onSelect={setSelected}
        />

        {/*
          입력 줄은 3칸 그리드다. 맨 오른쪽 칸은 정답/오답 팝업 자리로 늘 비워 둔다 —
          띄울 때만 자리를 만들면 입력칸이 들썩이고, 위로 띄우면 노선 버튼을 가린다.
        */}
        <form
          className="mx-auto grid w-full max-w-lg grid-cols-[minmax(0,1fr)_auto_4.75rem] items-center gap-2 sm:grid-cols-[minmax(0,1fr)_auto_6.5rem]"
          onSubmit={(e) => {
            e.preventDefault();
            commit();
          }}
        >
          {/*
            값을 리액트가 들고 있지 않는 이유: 한글 조합 중에 value를 되돌려 쓰면
            IME가 글자를 다시 밀어 넣어 입력칸이 비워지지 않는다. ref로 읽고 지운다.
          */}
          <Input
            ref={inputRef}
            defaultValue=""
            onKeyDown={(e) => {
              // 조합 중(마지막 글자가 아직 완성 전)인 Enter는 브라우저가 폼 제출로
              // 넘기지 않는다. 한글로 치면 늘 그 상태라 직접 처리해야 한다.
              if (e.key !== "Enter") return;
              e.preventDefault();
              commit();
            }}
            disabled={!playing}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            placeholder={selected ? `${selected}의 역명` : "노선을 먼저 선택하세요"}
            aria-label="역명 입력"
          />
          <Button type="submit" disabled={!playing} className="px-5">
            제출
          </Button>

          <div aria-live="polite" className="min-w-0">
            {toast ? (
              <span
                className={cn(
                  "block animate-pop-in truncate rounded-full px-2 py-1 text-center",
                  "text-[12px] font-bold sm:text-[13px]",
                  toast.kind === "correct" &&
                    "bg-[var(--success)]/15 text-[var(--success)]",
                  toast.kind === "wrong" && "bg-destructive/15 text-destructive",
                  (toast.kind === "duplicate" || toast.kind === "warning") &&
                    "bg-[var(--warning)]/18 text-[var(--warning)]",
                )}
              >
                {toast.text}
              </span>
            ) : null}
          </div>
        </form>
      </main>

      {/* ── 호선별 진행도 ────────────────────────────────────────────────── */}
      <aside className="hidden w-[218px] shrink-0 xl:block">
        <Card className="h-full overflow-y-auto p-3 scrollbar-thin">
          <p className="mb-2.5 text-[11px] font-bold tracking-[0.14em] text-muted-foreground uppercase">
            호선별
          </p>
          <LineProgress lines={playableLines} solvedByLine={solvedByLine} />
        </Card>
      </aside>

      <Sheet
        open={sheet === "view"}
        onOpenChange={() => setSheet("none")}
        title="보기 설정"
      >
        <ViewSettingsPanel value={view} onChange={setView} />
      </Sheet>

      <Sheet
        open={sheet === "progress"}
        onOpenChange={() => setSheet("none")}
        title="호선별 진행도"
      >
        <LineProgress lines={playableLines} solvedByLine={solvedByLine} compact />
      </Sheet>

      {starting && multi ? (
        <div className="fixed inset-0 z-40 grid place-items-center bg-background/80 backdrop-blur-sm">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              {MULTI_MODE_INFO[multi.mode].label} · {region.label}
            </p>
            <p className="tnum mt-2 text-7xl font-bold tabular-nums">
              {Math.max(1, Math.ceil((multi.startsAt - now) / 1000))}
            </p>
          </div>
        </div>
      ) : null}

      {ended ? (
        <ResultOverlay
          solved={solved}
          total={total}
          highScore={multi ? null : highScore}
          players={resultPlayers}
          onReplay={onReplay}
          replayLabel={multi ? "같은 방에서 한 판 더" : "다시 하기"}
          onHome={onExit}
        />
      ) : null}
    </div>
  );
}
