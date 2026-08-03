import {
  BUSAN_ALIASES,
  BUSAN_LINES,
  BUSAN_STATION_MASKS,
  SEOUL_ALIASES,
  SEOUL_LINES,
  SEOUL_STATION_MASKS,
  type LineMeta,
} from "@/lib/data/generated";

export type RegionId = "seoul" | "busan";

export type Region = {
  id: RegionId;
  label: string;
  mapUrl: string;
  lines: LineMeta[];
  stationMasks: number[];
  /** 입력 편의를 위한 별칭. 정규화된 입력 → SVG 안의 역 id. */
  aliases: Record<string, string>;
  /** 제한시간 상한(분). */
  maxMinutes: number;
  defaultMinutes: number;
};

/** 생성 스크립트가 알 수 없는, 손으로 넣는 별칭. */
const MANUAL_ALIASES: Record<RegionId, Record<string, string>> = {
  seoul: { 총신대입구: "이수" },
  busan: {},
};

export const REGIONS: Record<RegionId, Region> = {
  seoul: {
    id: "seoul",
    label: "수도권",
    mapUrl: "/maps/seoul.svg",
    lines: SEOUL_LINES,
    stationMasks: SEOUL_STATION_MASKS,
    aliases: { ...SEOUL_ALIASES, ...MANUAL_ALIASES.seoul },
    maxMinutes: 99,
    defaultMinutes: 90,
  },
  busan: {
    id: "busan",
    label: "부산",
    mapUrl: "/maps/busan.svg",
    lines: BUSAN_LINES,
    stationMasks: BUSAN_STATION_MASKS,
    aliases: { ...BUSAN_ALIASES, ...MANUAL_ALIASES.busan },
    maxMinutes: 60,
    defaultMinutes: 20,
  },
};

export const REGION_IDS: RegionId[] = ["seoul", "busan"];

/** 켠 호선들을 비트마스크로. */
export function linesToMask(region: Region, enabled: readonly string[]): number {
  const set = new Set(enabled);
  return region.lines.reduce(
    (acc, line, i) => (set.has(line.id) ? acc | (1 << i) : acc),
    0,
  );
}

/**
 * 켠 호선에 속한 역의 개수.
 * 환승역은 여러 호선에 걸쳐 있어도 한 번만 센다 — 그래서 호선별 개수의 합과 다르다.
 */
export function countStations(region: Region, enabled: readonly string[]): number {
  const mask = linesToMask(region, enabled);
  if (mask === 0) return 0;
  let n = 0;
  for (const m of region.stationMasks) if (m & mask) n++;
  return n;
}

/** 사용자 입력을 SVG 역 id 후보들로 바꾼다. 앞쪽 후보부터 시도한다. */
export function resolveStationIds(
  region: Region,
  rawInput: string,
  line: string,
): string[] {
  const input = rawInput.trim().replace(/\s+/g, "");
  if (!input) return [];
  const canonical = region.aliases[input] ?? input;
  // 같은 역명이 두 호선에 있으면 SVG id가 `역명_호선`이다. 붙인 쪽을 먼저 본다.
  return [`${canonical}_${line}`, canonical];
}
