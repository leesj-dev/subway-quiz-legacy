"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

import { GameScreen, type MultiContext } from "@/components/GameScreen";
import { SetupPanel } from "@/components/SetupPanel";
import { HomeScreen, ScreenShell } from "@/components/screens/HomeScreen";
import { LobbyScreen } from "@/components/screens/LobbyScreen";
import { MultiEntryScreen } from "@/components/screens/MultiEntryScreen";
import { Button } from "@/components/ui/button";
import {
  defaultSettings,
  randomPlayerName,
  type GameSettings,
  type MultiMode,
} from "@/lib/game";
import {
  closeRoom,
  createRoom,
  joinRoom,
  leaveRoom,
  measureClockOffset,
  resetRoom,
  RoomError,
  startGame,
  updateRoom,
  type Room,
} from "@/lib/room";
import { getPlayerId, readPlayerName, writePlayerName } from "@/lib/storage";
import { isMultiplayerConfigured } from "@/lib/supabase";
import { useRoom } from "@/lib/useRoom";

/** 방에 들어가 있지 않을 때의 화면. 방에 들어가면 방 상태가 화면을 정한다. */
type Stage = "home" | "setup" | "multi" | "solo";

const settingsOf = (room: Room): GameSettings => ({
  region: room.region,
  lines: room.lines,
  minutes: room.duration_min,
  showMarks: room.show_marks,
});

// ── 브라우저에만 있는 값들 ────────────────────────────────────────────────
// 서버 렌더에는 없고 클라이언트에서만 읽히므로 useSyncExternalStore로 가져온다.
// (한 번 정해지면 바뀌지 않아서 구독은 비워 둔다.)
const noSubscribe = () => () => {};

let cachedName: string | null = null;
const storedName = () => (cachedName ??= readPlayerName() ?? randomPlayerName());

let cachedCode: string | null = null;
const codeFromUrl = () =>
  (cachedCode ??=
    new URLSearchParams(window.location.search)
      .get("code")
      ?.toUpperCase()
      .replace(/[^A-Z]/g, "")
      .slice(0, 6) ?? "");

export default function Page() {
  const [stage, setStage] = useState<Stage>("home");
  const [runId, setRunId] = useState(0);

  const playerId = useSyncExternalStore(noSubscribe, getPlayerId, () => null);
  const initialCode = useSyncExternalStore(noSubscribe, codeFromUrl, () => "");
  const defaultName = useSyncExternalStore(noSubscribe, storedName, () => "");

  const [soloSettings, setSoloSettings] = useState<GameSettings>(() =>
    defaultSettings(),
  );

  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const playerName = nameDraft ?? defaultName;

  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [clockOffset, setClockOffset] = useState(0);
  const [busy, setBusy] = useState<"create" | "join" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { room, players, claims, connected, loaded } = useRoom(roomCode);
  const isHost = Boolean(room && playerId && room.host_id === playerId);
  const me = players.find((p) => p.id === playerId) ?? null;

  // 방장이 설정을 만지는 동안 실시간 왕복을 기다리지 않도록 로컬 사본을 먼저 움직인다.
  const [hostDraft, setHostDraft] = useState<GameSettings | null>(null);
  const pushTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!isMultiplayerConfigured || stage !== "multi") return;
    void measureClockOffset().then(setClockOffset);
  }, [stage]);

  const goHome = useCallback(() => {
    setRoomCode(null);
    setHostDraft(null);
    setStage("home");
  }, []);

  const pushSettings = useCallback(
    (next: GameSettings) => {
      if (!roomCode) return;
      setHostDraft(next);
      window.clearTimeout(pushTimer.current);
      pushTimer.current = window.setTimeout(() => {
        void updateRoom(roomCode, {
          region: next.region,
          lines: next.lines,
          duration_min: next.minutes,
          show_marks: next.showMarks,
        }).catch(() => setError("설정을 저장하지 못했습니다."));
      }, 220);
    },
    [roomCode],
  );

  const handleCreate = useCallback(async () => {
    if (!playerId) return;
    setBusy("create");
    setError(null);
    try {
      const name = playerName.trim() || randomPlayerName();
      writePlayerName(name);
      const base = defaultSettings();
      const created = await createRoom({
        playerId,
        playerName: name,
        region: base.region,
        lines: base.lines,
        minutes: base.minutes,
        showMarks: base.showMarks,
      });
      setHostDraft(settingsOf(created));
      setRoomCode(created.code);
    } catch (e) {
      setError(e instanceof RoomError ? e.message : "방을 만들지 못했습니다.");
    } finally {
      setBusy(null);
    }
  }, [playerId, playerName]);

  const handleJoin = useCallback(
    async (code: string) => {
      if (!playerId) return;
      setBusy("join");
      setError(null);
      try {
        const name = playerName.trim() || randomPlayerName();
        writePlayerName(name);
        await joinRoom({ code, playerId, playerName: name });
        setHostDraft(null);
        setRoomCode(code.toUpperCase());
      } catch (e) {
        setError(e instanceof RoomError ? e.message : "참가하지 못했습니다.");
      } finally {
        setBusy(null);
      }
    },
    [playerId, playerName],
  );

  const handleLeave = useCallback(() => {
    const code = roomCode;
    const hosting = isHost;
    goHome();
    if (!code || !playerId) return;
    // 나가는 길이라 실패해도 되돌릴 게 없다.
    void (hosting ? closeRoom(code) : leaveRoom(playerId)).catch(() => {});
  }, [roomCode, isHost, playerId, goHome]);

  // ── 방에 들어가 있는 동안 ────────────────────────────────────────────────
  if (roomCode) {
    if (!loaded || !playerId) return <Waiting />;

    if (!room || !me) {
      return (
        <Notice
          title="방이 닫혔습니다"
          body="방장이 방을 나갔거나 시간이 지나 사라졌습니다."
          onHome={goHome}
        />
      );
    }

    const lobbySettings = (isHost ? hostDraft : null) ?? settingsOf(room);

    if (room.status === "lobby") {
      return (
        <LobbyScreen
          code={room.code}
          players={players}
          meId={playerId}
          isHost={isHost}
          mode={room.mode}
          settings={lobbySettings}
          connected={connected}
          starting={busy === "create"}
          onModeChange={(mode: MultiMode) => void updateRoom(room.code, { mode })}
          onSettingsChange={pushSettings}
          onStart={async () => {
            // 디바운스로 아직 안 나간 설정이 있을 수 있으니 시작 전에 확실히 밀어 넣는다.
            window.clearTimeout(pushTimer.current);
            await updateRoom(room.code, {
              region: lobbySettings.region,
              lines: lobbySettings.lines,
              duration_min: lobbySettings.minutes,
              show_marks: lobbySettings.showMarks,
            });
            await startGame(room.code, lobbySettings.minutes);
          }}
          onLeave={handleLeave}
        />
      );
    }

    if (!room.started_at || !room.ends_at) return <Waiting />;

    const multi: MultiContext = {
      mode: room.mode,
      code: room.code,
      me,
      players,
      claims,
      // 서버 시각을 이 기기의 시계로 옮긴다.
      startsAt: new Date(room.started_at).getTime() - clockOffset,
      endsAt: new Date(room.ends_at).getTime() - clockOffset,
      isHost,
    };

    return (
      <GameScreen
        key={`${room.code}:${room.started_at}`}
        settings={settingsOf(room)}
        multi={multi}
        onExit={handleLeave}
        onReplay={isHost ? () => void resetRoom(room.code) : undefined}
      />
    );
  }

  // ── 방 밖 ────────────────────────────────────────────────────────────────
  if (stage === "setup") {
    return (
      <ScreenShell
        title="싱글플레이"
        onBack={() => setStage("home")}
        footer={
          <Button
            size="lg"
            className="w-full"
            disabled={soloSettings.lines.length === 0}
            onClick={() => {
              setRunId((n) => n + 1);
              setStage("solo");
            }}
          >
            시작
          </Button>
        }
      >
        <SetupPanel settings={soloSettings} onChange={setSoloSettings} />
      </ScreenShell>
    );
  }

  if (stage === "solo") {
    return (
      <GameScreen
        key={`solo:${runId}`}
        settings={soloSettings}
        onExit={() => setStage("home")}
        onReplay={() => setRunId((n) => n + 1)}
      />
    );
  }

  if (stage === "multi") {
    return (
      <MultiEntryScreen
        name={playerName}
        initialCode={initialCode}
        onNameChange={setNameDraft}
        onCreate={handleCreate}
        onJoin={handleJoin}
        busy={busy}
        error={error}
        onBack={() => setStage("home")}
      />
    );
  }

  return (
    <>
      <HomeScreen
        onSingle={() => setStage("setup")}
        onMulti={() => {
          setError(null);
          setStage("multi");
        }}
        multiDisabled={!isMultiplayerConfigured}
      />
      {error ? (
        <p
          role="alert"
          className="fixed inset-x-0 bottom-4 mx-auto w-fit rounded-full bg-destructive px-4 py-1.5 text-sm font-bold text-destructive-foreground"
        >
          {error}
        </p>
      ) : null}
    </>
  );
}

function Waiting() {
  return (
    <div className="grid min-h-[100svh] place-items-center text-sm text-muted-foreground">
      불러오는 중…
    </div>
  );
}

function Notice({
  title,
  body,
  onHome,
}: {
  title: string;
  body: string;
  onHome: () => void;
}) {
  return (
    <div className="grid min-h-[100svh] place-items-center px-6 text-center">
      <div className="animate-rise-in">
        <h1 className="text-lg font-bold">{title}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
        <Button className="mt-5" onClick={onHome}>
          처음으로
        </Button>
      </div>
    </div>
  );
}
