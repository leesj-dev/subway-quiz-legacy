"use client";

import type { GameSettings } from "@/lib/game";
import { linesToMask, REGIONS } from "@/lib/regions";

/**
 * 최고기록은 판 구성이 같을 때만 비교할 수 있다.
 * 호선을 몇 개 끄고 친 기록과 전 노선 기록을 같은 칸에 넣으면 의미가 없어서
 * (지역, 켠 호선, 제한시간)을 키에 함께 넣는다.
 */
function key(settings: GameSettings) {
  const mask = linesToMask(REGIONS[settings.region], settings.lines);
  return `sq:hs:${settings.region}:${mask}:${settings.minutes}`;
}

export function readHighScore(settings: GameSettings): number {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(key(settings));
  return raw ? (Number(raw) || 0) : 0;
}

export function writeHighScore(settings: GameSettings, score: number): number {
  if (typeof window === "undefined") return score;
  const best = Math.max(readHighScore(settings), score);
  window.localStorage.setItem(key(settings), String(best));
  return best;
}

const PLAYER_ID_KEY = "sq:playerId";
const PLAYER_NAME_KEY = "sq:playerName";

/**
 * 로그인이 없으므로 브라우저마다 uuid 하나로 신원을 대신한다.
 *
 * 탭이 살아 있는 동안에는 절대 바뀌면 안 된다. useSyncExternalStore가 렌더마다
 * 이 값을 읽는데, 다른 탭이 localStorage를 건드렸다고 신원이 갈아엎히면
 * 게임 도중에 방장 자격을 잃는다. 그래서 한 번 읽고 메모리에 붙들어 둔다.
 */
let cachedPlayerId: string | null = null;

export function getPlayerId(): string {
  if (cachedPlayerId) return cachedPlayerId;
  let id = window.localStorage.getItem(PLAYER_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(PLAYER_ID_KEY, id);
  }
  cachedPlayerId = id;
  return id;
}

export function readPlayerName(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(PLAYER_NAME_KEY);
}

export function writePlayerName(name: string) {
  window.localStorage.setItem(PLAYER_NAME_KEY, name);
}
