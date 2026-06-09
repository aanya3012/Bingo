-- supabase/migrations/001_initial_schema.sql
-- Run this in your Supabase SQL editor or via migration

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── ROOMS ────────────────────────────────────────────────────────────────────
create table public.rooms (
  id                    uuid primary key default uuid_generate_v4(),
  code                  text not null unique,
  host_id               uuid,
  status                text not null default 'waiting'
                          check (status in ('waiting', 'setup', 'playing', 'finished')),
  mode                  text not null default 'classic'
                          check (mode in ('classic', 'quick', 'chaos')),
  max_players           int not null default 8,
  called_numbers        int[] not null default '{}',
  current_turn_player_id uuid,
  winner_id             uuid,
  created_at            timestamptz not null default now()
);

-- ─── PLAYERS ──────────────────────────────────────────────────────────────────
create table public.players (
  id              uuid primary key default uuid_generate_v4(),
  room_id         uuid not null references public.rooms(id) on delete cascade,
  username        text not null,
  avatar_color    text not null default '#e11d48',
  is_ready        boolean not null default false,
  is_host         boolean not null default false,
  board           int[],
  marked_cells    boolean[] not null default '{}',
  bingo_letters   text[] not null default '{}',
  lines_completed int not null default 0,
  is_spectator    boolean not null default false,
  joined_at       timestamptz not null default now()
);

-- ─── MOVES ────────────────────────────────────────────────────────────────────
create table public.moves (
  id             uuid primary key default uuid_generate_v4(),
  room_id        uuid not null references public.rooms(id) on delete cascade,
  player_id      uuid not null references public.players(id) on delete cascade,
  number_called  int not null,
  called_at      timestamptz not null default now()
);

-- ─── MESSAGES ─────────────────────────────────────────────────────────────────
create table public.messages (
  id         uuid primary key default uuid_generate_v4(),
  room_id    uuid not null references public.rooms(id) on delete cascade,
  player_id  uuid references public.players(id) on delete set null,
  content    text not null,
  type       text not null default 'chat'
               check (type in ('chat', 'system', 'event')),
  created_at timestamptz not null default now()
);

-- ─── INDEXES ──────────────────────────────────────────────────────────────────
create index rooms_code_idx on public.rooms(code);
create index players_room_idx on public.players(room_id);
create index moves_room_idx on public.moves(room_id);
create index messages_room_idx on public.messages(room_id);
create index messages_created_idx on public.messages(created_at);

-- ─── ROW LEVEL SECURITY ───────────────────────────────────────────────────────
alter table public.rooms enable row level security;
alter table public.players enable row level security;
alter table public.moves enable row level security;
alter table public.messages enable row level security;

-- Public read/write for all tables (game uses player IDs stored in localStorage)
create policy "Public read rooms" on public.rooms for select using (true);
create policy "Public insert rooms" on public.rooms for insert with check (true);
create policy "Public update rooms" on public.rooms for update using (true);

create policy "Public read players" on public.players for select using (true);
create policy "Public insert players" on public.players for insert with check (true);
create policy "Public update players" on public.players for update using (true);
create policy "Public delete players" on public.players for delete using (true);

create policy "Public read moves" on public.moves for select using (true);
create policy "Public insert moves" on public.moves for insert with check (true);

create policy "Public read messages" on public.messages for select using (true);
create policy "Public insert messages" on public.messages for insert with check (true);

-- ─── REALTIME ─────────────────────────────────────────────────────────────────
-- Enable realtime on all tables
begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime for table rooms, players, moves, messages;
commit;

-- ─── CLEANUP FUNCTION ─────────────────────────────────────────────────────────
-- Auto-delete rooms older than 24 hours (run as a cron job or pg_cron)
create or replace function cleanup_old_rooms()
returns void language plpgsql as $$
begin
  delete from public.rooms
  where created_at < now() - interval '24 hours';
end;
$$;
