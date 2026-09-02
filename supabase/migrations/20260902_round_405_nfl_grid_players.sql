-- Round 405: the NFL answer key as a table the page can read.
-- scripts/data/nflGridPlayers.json is the committed derivation (see
-- scripts/genNflGridData.mjs for every rule); this table is that file loaded
-- row for row, one row per player keyed on gsis_id or a name plus birth date
-- key, and scripts/simNflGridData.mjs section 6 holds the table to the file.
-- RLS on with a public read policy, the same shape as nba_player_stats.
-- Applied through the Supabase MCP on 2026-09-02; kept here as the record.
create table if not exists public.nfl_grid_players (
  id text primary key,
  name text not null,
  display_name text not null,
  name_norm text not null,
  teams text[] not null,
  first_season integer not null,
  last_season integer not null,
  pos text[] not null default '{}',
  college text,
  draft_year integer,
  draft_round integer,
  draft_pick integer,
  undrafted boolean not null default false,
  pass4k integer not null default 0,
  rush1k integer not null default 0,
  rec1k integer not null default 0,
  sb_wins integer not null default 0,
  dup boolean not null default false
);
create index if not exists nfl_grid_players_name_norm_idx on public.nfl_grid_players (name_norm);
create index if not exists nfl_grid_players_display_idx on public.nfl_grid_players (display_name);
alter table public.nfl_grid_players enable row level security;
drop policy if exists "Allow public read" on public.nfl_grid_players;
create policy "Allow public read" on public.nfl_grid_players for select to public using (true);
