"use client";

import { getSupabase } from "@/lib/supabase";
import { PLAYER_COLORS, randomRoomCode, type MultiMode } from "@/lib/game";
import type { RegionId } from "@/lib/regions";

export type Room = {
  code: string;
  host_id: string;
  mode: MultiMode;
  region: RegionId;
  lines: string[];
  duration_min: number;
  show_marks: boolean;
  status: "lobby" | "playing" | "ended";
  started_at: string | null;
  ends_at: string | null;
};

export type Player = {
  id: string;
  room_code: string;
  name: string;
  color: string;
  score: number;
  is_host: boolean;
  joined_at: string;
};

export type Claim = {
  room_code: string;
  station: string;
  player_id: string;
  lines: string[];
};

export class RoomError extends Error {}

/** 방 코드 충돌은 거의 없지만, 나면 조용히 다시 뽑는다. */
export async function createRoom(input: {
  playerId: string;
  playerName: string;
  region: RegionId;
  lines: string[];
  minutes: number;
  showMarks: boolean;
}): Promise<Room> {
  const supabase = getSupabase();

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomRoomCode();
    const { data, error } = await supabase.rpc("create_room", {
      p_code: code,
      p_host_id: input.playerId,
      p_host_name: input.playerName,
      p_host_color: PLAYER_COLORS[0],
      p_region: input.region,
      p_lines: input.lines,
      p_duration_min: input.minutes,
      p_show_marks: input.showMarks,
    });

    if (!error) return data as Room;
    if (error.code !== "23505") {
      throw new RoomError(`방을 만들지 못했습니다. (${error.message})`);
    }
  }
  throw new RoomError("방 코드를 만들지 못했습니다. 잠시 후 다시 시도해 주세요.");
}

export async function joinRoom(input: {
  code: string;
  playerId: string;
  playerName: string;
}): Promise<{ room: Room; players: Player[] }> {
  const supabase = getSupabase();
  const code = input.code.trim().toUpperCase();

  const { data: room, error } = await supabase
    .from("rooms")
    .select("*")
    .eq("code", code)
    .maybeSingle();

  if (error) throw new RoomError(`방을 찾지 못했습니다. (${error.message})`);
  if (!room) throw new RoomError("그런 코드의 방이 없습니다.");
  if (room.status !== "lobby") throw new RoomError("이미 시작한 방입니다.");

  const { data: players } = await supabase
    .from("players")
    .select("*")
    .eq("room_code", code)
    .order("joined_at");

  const existing = players ?? [];
  if (existing.length >= PLAYER_COLORS.length) {
    throw new RoomError("방이 가득 찼습니다.");
  }

  const alreadyIn = existing.some((p) => p.id === input.playerId);
  if (!alreadyIn) {
    const taken = new Set(existing.map((p) => p.color));
    const color = PLAYER_COLORS.find((c) => !taken.has(c)) ?? PLAYER_COLORS[0];
    const { error: joinError } = await supabase.from("players").insert({
      id: input.playerId,
      room_code: code,
      name: input.playerName,
      color,
      is_host: false,
    });
    if (joinError) throw new RoomError(`참가하지 못했습니다. (${joinError.message})`);
  }

  return { room: room as Room, players: existing as Player[] };
}

export async function updateRoom(code: string, patch: Partial<Room>) {
  const { error } = await getSupabase().from("rooms").update(patch).eq("code", code);
  if (error) throw new RoomError(error.message);
}

/**
 * 시작 신호. 3초 뒤부터 시간이 흐르게 잡아 둔다 —
 * 그래야 양쪽이 노선도를 다 띄운 뒤에 동시에 출발한다.
 */
const LEAD_IN_MS = 3_000;

export async function startGame(code: string, minutes: number) {
  const supabase = getSupabase();
  const { data: now } = await supabase.rpc("server_now");
  const startsAt = (now ? new Date(now as string).getTime() : Date.now()) + LEAD_IN_MS;

  const { error } = await supabase
    .from("rooms")
    .update({
      status: "playing",
      started_at: new Date(startsAt).toISOString(),
      ends_at: new Date(startsAt + minutes * 60_000).toISOString(),
    })
    .eq("code", code);
  if (error) throw new RoomError(error.message);
}

export async function endGame(code: string) {
  await getSupabase().from("rooms").update({ status: "ended" }).eq("code", code);
}

/** 같은 방에서 한 판 더. 차지 기록과 점수를 비우고 대기실로 되돌린다. */
export async function resetRoom(code: string) {
  const supabase = getSupabase();
  await supabase.from("claims").delete().eq("room_code", code);
  await supabase.from("players").update({ score: 0 }).eq("room_code", code);
  await supabase
    .from("rooms")
    .update({ status: "lobby", started_at: null, ends_at: null })
    .eq("code", code);
}

/**
 * 땅따먹기의 승부는 여기서 갈린다.
 * (room_code, station)이 primary key라 두 명이 동시에 넣으면 한 쪽만 성공한다.
 * 23505(중복 키)를 "졌다"로 읽는다.
 */
export async function claimStation(input: {
  code: string;
  station: string;
  playerId: string;
  lines: string[];
}): Promise<"won" | "taken"> {
  const { error } = await getSupabase().from("claims").insert({
    room_code: input.code,
    station: input.station,
    player_id: input.playerId,
    lines: input.lines,
  });
  if (!error) return "won";
  if (error.code === "23505") return "taken";
  throw new RoomError(error.message);
}

export async function setScore(playerId: string, score: number) {
  await getSupabase().from("players").update({ score }).eq("id", playerId);
}

export async function leaveRoom(playerId: string) {
  await getSupabase().from("players").delete().eq("id", playerId);
}

/** 방장이 나가면 방도 닫는다. 참가자는 방이 사라진 걸 보고 처음 화면으로 돌아간다. */
export async function closeRoom(code: string) {
  await getSupabase().from("rooms").delete().eq("code", code);
}

/** 클라이언트 시계 오차 보정용. (서버시각 − 로컬시각) ms */
export async function measureClockOffset(): Promise<number> {
  try {
    const before = Date.now();
    const { data } = await getSupabase().rpc("server_now");
    if (!data) return 0;
    const rtt = Date.now() - before;
    return new Date(data as string).getTime() - (before + rtt / 2);
  } catch {
    return 0;
  }
}
