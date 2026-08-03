import { REGIONS, type RegionId } from "@/lib/regions";

/** 방장이 고르는 멀티플레이 규칙. */
export type MultiMode = "territory" | "versus";

export const MULTI_MODE_INFO: Record<
  MultiMode,
  { label: string; blurb: string }
> = {
  territory: {
    label: "땅따먹기",
    blurb: "같은 노선도를 두고 먼저 입력한 사람이 그 역을 차지합니다.",
  },
  versus: {
    label: "대결",
    blurb: "각자 노선도를 채우고 제한시간 안에 더 많이 맞힌 사람이 이깁니다.",
  },
};

export type GameSettings = {
  region: RegionId;
  /** 켜 둔 호선. 기본값은 전부. */
  lines: string[];
  minutes: number;
  showMarks: boolean;
};

/** 게임 중에도 바꿀 수 있는, 점수와 무관한 보기 설정. */
export type ViewSettings = {
  /** 선택하지 않은 노선의 투명도(0~100). */
  dim: number;
  transferColors: boolean;
  zoomOnSelect: boolean;
};

export const DEFAULT_VIEW: ViewSettings = {
  dim: 30,
  transferColors: true,
  zoomOnSelect: true,
};

export function defaultSettings(region: RegionId = "seoul"): GameSettings {
  return {
    region,
    lines: REGIONS[region].lines.map((l) => l.id),
    minutes: REGIONS[region].defaultMinutes,
    showMarks: true,
  };
}

/** 무채색 UI 위에서 서로 구분되고, 노선도 위에 얹어도 읽히는 색들. */
export const PLAYER_COLORS = [
  "#e11d48",
  "#2563eb",
  "#16a34a",
  "#d97706",
  "#7c3aed",
  "#0891b2",
] as const;

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // I, O 제외 — 1/0과 헷갈린다

export function randomRoomCode() {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

export function randomPlayerName() {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 9000;
  return `승객${1000 + n}`;
}
