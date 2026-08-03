import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * 멀티플레이는 Supabase가 있어야 돌아간다. 없으면 싱글플레이만 열어 두고
 * 멀티 버튼을 잠근다 — 환경변수 없이도 앱 자체는 뜨게 하는 게 목적.
 */
export const isMultiplayerConfigured = Boolean(url && key);

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!url || !key) {
    throw new Error(
      "멀티플레이를 쓰려면 NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 가 필요합니다.",
    );
  }
  client ??= createClient(url, key, {
    auth: { persistSession: false },
    realtime: { params: { eventsPerSecond: 20 } },
  });
  return client;
}
