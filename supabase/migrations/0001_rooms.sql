-- 지하철 노선도 퀴즈 멀티플레이
--
-- 로그인이 없다. 플레이어 신원은 브라우저가 만든 uuid 하나뿐이고,
-- 방은 6자리 알파벳 코드를 아는 사람만 찾을 수 있다.
-- 그래서 RLS는 "코드를 알면 참여할 수 있다" 수준으로만 잠근다.

create table if not exists public.rooms (
  code          text primary key check (code ~ '^[A-Z]{6}$'),
  host_id       uuid        not null,
  mode          text        not null default 'territory'
                            check (mode in ('territory', 'versus')),
  region        text        not null default 'seoul'
                            check (region in ('seoul', 'busan')),
  lines         text[]      not null default '{}',
  duration_min  int         not null default 10 check (duration_min between 1 and 99),
  show_marks    boolean     not null default true,
  status        text        not null default 'lobby'
                            check (status in ('lobby', 'playing', 'ended')),
  started_at    timestamptz,
  ends_at       timestamptz,
  created_at    timestamptz not null default now()
);

create table if not exists public.players (
  id         uuid        primary key,
  room_code  text        not null references public.rooms(code) on delete cascade,
  name       text        not null check (char_length(name) between 1 and 12),
  color      text        not null,
  score      int         not null default 0,
  is_host    boolean     not null default false,
  joined_at  timestamptz not null default now()
);

create index if not exists players_room_idx on public.players (room_code);

-- 땅따먹기: (방, 역)에 primary key를 걸어 두면 먼저 들어온 insert만 살아남는다.
-- 동점 판정을 애플리케이션이 하지 않아도 되는 게 핵심.
create table if not exists public.claims (
  room_code  text        not null references public.rooms(code) on delete cascade,
  station    text        not null,
  player_id  uuid        not null,
  lines      text[]      not null default '{}',
  created_at timestamptz not null default now(),
  primary key (room_code, station)
);

create index if not exists claims_room_idx on public.claims (room_code);

alter table public.rooms   enable row level security;
alter table public.players enable row level security;
alter table public.claims  enable row level security;

-- 익명 플레이 전제. 방 코드를 모르면 조회할 일이 없고, 남의 방을 지울 수는 없게 둔다.
drop policy if exists rooms_read   on public.rooms;
drop policy if exists rooms_write  on public.rooms;
drop policy if exists rooms_update on public.rooms;
drop policy if exists rooms_delete on public.rooms;
create policy rooms_read   on public.rooms for select using (true);
create policy rooms_write  on public.rooms for insert with check (true);
create policy rooms_update on public.rooms for update using (true) with check (true);
create policy rooms_delete on public.rooms for delete using (true);

drop policy if exists players_read   on public.players;
drop policy if exists players_write  on public.players;
drop policy if exists players_update on public.players;
drop policy if exists players_delete on public.players;
create policy players_read   on public.players for select using (true);
create policy players_write  on public.players for insert with check (true);
create policy players_update on public.players for update using (true) with check (true);
create policy players_delete on public.players for delete using (true);

drop policy if exists claims_read   on public.claims;
drop policy if exists claims_write  on public.claims;
drop policy if exists claims_delete on public.claims;
create policy claims_read   on public.claims for select using (true);
create policy claims_write  on public.claims for insert with check (true);
-- 같은 방에서 한 판 더 할 때 방장이 판을 비운다. update는 없다 —
-- 한 번 차지한 역의 주인이 바뀔 길을 아예 만들지 않는다.
create policy claims_delete on public.claims for delete using (true);

-- Realtime 구독 대상
alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.players;
alter publication supabase_realtime add table public.claims;

-- 클라이언트 시계가 틀어져도 남은 시간이 어긋나지 않도록 서버 시각을 한 번 받아 보정한다.
create or replace function public.server_now()
returns timestamptz
language sql
stable
as $$ select now() $$;

-- 방은 오래 살아 있을 이유가 없다. 방을 새로 만들 때 묵은 방을 같이 치운다.
create or replace function public.create_room(
  p_code         text,
  p_host_id      uuid,
  p_host_name    text,
  p_host_color   text,
  p_region       text,
  p_lines        text[],
  p_duration_min int,
  p_show_marks   boolean
)
returns public.rooms
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room public.rooms;
begin
  delete from public.rooms where created_at < now() - interval '6 hours';

  insert into public.rooms (code, host_id, region, lines, duration_min, show_marks)
  values (p_code, p_host_id, p_region, p_lines, p_duration_min, p_show_marks)
  returning * into v_room;

  insert into public.players (id, room_code, name, color, is_host)
  values (p_host_id, p_code, p_host_name, p_host_color, true);

  return v_room;
end;
$$;

grant execute on function public.server_now() to anon, authenticated;
grant execute on function public.create_room(
  text, uuid, text, text, text, text[], int, boolean
) to anon, authenticated;
