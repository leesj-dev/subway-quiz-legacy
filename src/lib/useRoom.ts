"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getSupabase } from "@/lib/supabase";
import type { Claim, Player, Room } from "@/lib/room";

export type RoomState = {
  room: Room | null;
  players: Player[];
  claims: Claim[];
  connected: boolean;
  /** 첫 조회가 끝났는지. room === null 이 "아직 로딩"인지 "없는 방"인지 가른다. */
  loaded: boolean;
};

/**
 * 방 하나를 실시간으로 따라간다.
 *
 * postgres_changes 로 rooms / players / claims 를 각각 구독하고,
 * 구독이 붙는 순간 한 번 전체를 다시 읽어 그 사이에 놓친 변경을 메운다.
 */
export function useRoom(code: string | null): RoomState {
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [connected, setConnected] = useState(false);
  // 어느 방을 다 읽었는지. 방을 옮기는 순간 이전 방 데이터가 잠깐 비치는 걸 막는다.
  const [loadedCode, setLoadedCode] = useState<string | null>(null);

  const refetch = useCallback(async (roomCode: string) => {
    const supabase = getSupabase();
    const [roomRes, playerRes, claimRes] = await Promise.all([
      supabase.from("rooms").select("*").eq("code", roomCode).maybeSingle(),
      supabase.from("players").select("*").eq("room_code", roomCode).order("joined_at"),
      supabase.from("claims").select("*").eq("room_code", roomCode),
    ]);
    setRoom((roomRes.data as Room | null) ?? null);
    setPlayers((playerRes.data as Player[] | null) ?? []);
    setClaims((claimRes.data as Claim[] | null) ?? []);
    setLoadedCode(roomCode);
  }, []);

  const refetchRef = useRef(refetch);
  useEffect(() => {
    refetchRef.current = refetch;
  });

  useEffect(() => {
    if (!code) return;

    const supabase = getSupabase();
    let cancelled = false;
    let syncedOnce = false;

    const channel = supabase
      .channel(`room-${code}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rooms", filter: `code=eq.${code}` },
        (payload) => {
          if (payload.eventType === "DELETE") setRoom(null);
          else setRoom(payload.new as Room);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "players",
          filter: `room_code=eq.${code}`,
        },
        (payload) => {
          setPlayers((prev) => {
            if (payload.eventType === "DELETE") {
              const gone = (payload.old as Partial<Player>).id;
              return prev.filter((p) => p.id !== gone);
            }
            const next = payload.new as Player;
            const i = prev.findIndex((p) => p.id === next.id);
            if (i === -1) return [...prev, next];
            const copy = prev.slice();
            copy[i] = next;
            return copy;
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "claims",
          filter: `room_code=eq.${code}`,
        },
        (payload) => {
          const next = payload.new as Claim;
          setClaims((prev) =>
            prev.some((c) => c.station === next.station) ? prev : [...prev, next],
          );
        },
      )
      .subscribe((status) => {
        if (cancelled) return;
        setConnected(status === "SUBSCRIBED");
        // 구독 직전에 일어난 변경을 놓치지 않도록 붙자마자 한 번 동기화한다.
        // 실시간이 막힌 환경이라도 방 상태는 보여야 하니 실패했을 때도 한 번은 읽는다.
        if (status === "SUBSCRIBED" || !syncedOnce) {
          syncedOnce = true;
          void refetchRef.current(code);
        }
      });

    return () => {
      cancelled = true;
      setConnected(false);
      void supabase.removeChannel(channel);
    };
  }, [code, refetch]);

  const ready = code !== null && loadedCode === code;
  return {
    room: ready ? room : null,
    players: ready ? players : [],
    claims: ready ? claims : [],
    connected: ready && connected,
    loaded: ready,
  };
}
