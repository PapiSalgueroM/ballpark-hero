// Generates the P1-P6 pzzad resync SQL files.
// Small tables: from pzzad-resync/_*_flawu.json (written by hand from MCP pulls).
// Large tables (career_seasons, footle): read straight from the saved MCP
// tool-result files on disk, so the bulk never passes through the model context.
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const DIR = path.join(ROOT, 'pzzad-resync');

const TR = 'C:/Users/antho/.claude/projects/C--Users-antho-OneDrive-Documents-ballpark-hero/234762c8-96e7-4202-9f04-22451091fb86/tool-results';
const CAREER_SEASONS_FILE = path.join(TR, 'mcp-supabase-execute_sql-1781596598122.txt');
const FOOTLE_FILE = path.join(TR, 'mcp-supabase-execute_sql-1781596599715.txt');

// Extract the `d` array from a saved execute_sql tool-result file.
function readToolResult(p) {
  const outer = JSON.parse(fs.readFileSync(p, 'utf8'));
  const res = outer.result;
  const open = res.indexOf('[{');
  const close = res.lastIndexOf(']');
  const arr = JSON.parse(res.slice(open, close + 1));
  return arr[0].d;
}
const readJson = (name) => JSON.parse(fs.readFileSync(path.join(DIR, name), 'utf8'));

const q = (s) => "'" + String(s).replace(/'/g, "''") + "'";
const arrLit = (a) => 'ARRAY[' + a.map(q).join(',') + ']::text[]';
const jb = (v) => q(JSON.stringify(v)) + '::jsonb';
const num = (n) => (n === null || n === undefined ? 'null' : String(n));

function rls(table) {
  return `alter table public.${table} enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = '${table}' and policyname = 'Public read-only') then
    create policy "Public read-only" on public.${table} for select to anon, authenticated using (true);
  end if;
end $$;`;
}

function write(name, sql) {
  fs.writeFileSync(path.join(DIR, name), sql.replace(/\n+$/, '') + '\n', 'utf8');
  const rows = (sql.match(/^\(/gm) || []).length;
  console.log(`${name}: rows=${rows} bytes=${Buffer.byteLength(sql)} hasDDL=${/create table/.test(sql)}`);
}

// ── 01 Footle (player_market_values, top-200 of year 2026) ────────────────────
(() => {
  const rows = readToolResult(FOOTLE_FILE);
  const cols = ['id','rank','player_name','position','age','nationality','club','market_value_usd','matches','year','goals','assists','yellow_cards','red_cards'];
  const vals = rows.map((r) =>
    `(${num(r.id)}, ${num(r.rank)}, ${q(r.player_name)}, ${r.position===null?'null':q(r.position)}, ${num(r.age)}, ${r.nationality===null?'null':q(r.nationality)}, ${r.club===null?'null':q(r.club)}, ${num(r.market_value_usd)}, ${num(r.matches)}, ${num(r.year)}, ${num(r.goals)}, ${num(r.assists)}, ${num(r.yellow_cards)}, ${num(r.red_cards)})`
  );
  const upd = cols.filter((c) => c !== 'id').map((c) => `  ${c} = excluded.${c}`).join(',\n');
  const sql = `create table if not exists public.player_market_values (
  rank             integer,
  player_name      varchar,
  position         varchar,
  age              integer,
  nationality      varchar,
  club             varchar,
  market_value_usd bigint,
  matches          integer,
  year             integer,
  goals            integer,
  assists          integer,
  yellow_cards     integer,
  red_cards        integer,
  id               bigint primary key
);
${rls('player_market_values')}
create index if not exists player_market_values_year_mv_idx on public.player_market_values (year, market_value_usd desc);
insert into public.player_market_values (${cols.join(', ')}) values
${vals.join(',\n')}
on conflict (id) do update set
${upd};`;
  write('P1_footle.sql', sql);
})();

// ── 02 Career (career_players parent, then career_seasons child) ───────────────
(() => {
  const players = readJson('_career_players_flawu.json');
  const seasons = readToolResult(CAREER_SEASONS_FILE);
  const pVals = players.map((p) => `(${q(p.id)}::uuid, ${q(p.player_name)}, ${q(p.nationality)}, ${q(p.position)})`);
  const sVals = seasons.map((s) =>
    `(${q(s.id)}::uuid, ${q(s.player_id)}::uuid, ${q(s.season)}, ${q(s.club)}, ${num(s.goals)}, ${num(s.assists)}, ${num(s.appearances)}, ${num(s.market_value)}, ${num(s.sort_order)})`
  );
  const sql = `create table if not exists public.career_players (
  id          uuid        primary key default gen_random_uuid(),
  player_name text        not null unique,
  nationality text        not null,
  position    text        not null,
  created_at  timestamptz not null default now()
);
${rls('career_players')}
create table if not exists public.career_seasons (
  id           uuid        primary key default gen_random_uuid(),
  player_id    uuid        not null references public.career_players(id) on delete cascade,
  season       text        not null,
  club         text        not null,
  goals        integer     not null,
  assists      integer     not null,
  appearances  integer     not null,
  market_value integer     not null,
  sort_order   smallint    not null,
  created_at   timestamptz not null default now()
);
${rls('career_seasons')}
create index if not exists career_seasons_player_id_idx on public.career_seasons (player_id);
insert into public.career_players (id, player_name, nationality, position) values
${pVals.join(',\n')}
on conflict (id) do update set
  player_name = excluded.player_name,
  nationality = excluded.nationality,
  position    = excluded.position;
insert into public.career_seasons (id, player_id, season, club, goals, assists, appearances, market_value, sort_order) values
${sVals.join(',\n')}
on conflict (id) do update set
  player_id    = excluded.player_id,
  season       = excluded.season,
  club         = excluded.club,
  goals        = excluded.goals,
  assists      = excluded.assists,
  appearances  = excluded.appearances,
  market_value = excluded.market_value,
  sort_order   = excluded.sort_order;`;
  write('P2_career.sql', sql);
})();

// ── 03 Soccer Club (Guess the Soccer Club) ────────────────────────────────────
(() => {
  const rows = readJson('_soccer_club_flawu.json');
  const vals = rows.map((r) =>
    `(${q(r.puzzle_id)}, ${q(r.full_name)}, ${arrLit(r.common_names)}, ${q(r.country)}, ${q(r.league)}, ${q(r.vibe)}, ${q(r.league_hint)}, ${num(r.league_titles)}, ${q(r.kit_colors)}, ${q(r.fun_fact)}, ${num(r.sort_order)})`
  );
  const sql = `create table if not exists public.soccer_club_puzzles (
  id            uuid        primary key default gen_random_uuid(),
  puzzle_id     text        not null unique,
  full_name     text        not null,
  common_names  text[]      not null,
  country       text        not null,
  league        text        not null,
  vibe          text        not null,
  league_hint   text        not null,
  league_titles smallint    not null,
  kit_colors    text        not null,
  fun_fact      text        not null,
  sort_order    smallint    not null,
  created_at    timestamptz not null default now()
);
${rls('soccer_club_puzzles')}
insert into public.soccer_club_puzzles (puzzle_id, full_name, common_names, country, league, vibe, league_hint, league_titles, kit_colors, fun_fact, sort_order) values
${vals.join(',\n')}
on conflict (puzzle_id) do update set
  full_name = excluded.full_name, common_names = excluded.common_names, country = excluded.country,
  league = excluded.league, vibe = excluded.vibe, league_hint = excluded.league_hint,
  league_titles = excluded.league_titles, kit_colors = excluded.kit_colors,
  fun_fact = excluded.fun_fact, sort_order = excluded.sort_order;`;
  write('P3_soccer_club.sql', sql);
})();

// ── 04 Soccer Grid ────────────────────────────────────────────────────────────
(() => {
  const rows = readJson('_soccer_grid_flawu.json');
  const vals = rows.map((r) => `(${q(r.puzzle_id)}, ${jb(r.rows_json)}, ${jb(r.cols_json)}, ${num(r.sort_order)})`);
  const sql = `create table if not exists public.soccer_grid_puzzles (
  id         uuid        primary key default gen_random_uuid(),
  puzzle_id  text        not null unique,
  rows_json  jsonb       not null,
  cols_json  jsonb       not null,
  sort_order smallint    not null,
  created_at timestamptz not null default now()
);
${rls('soccer_grid_puzzles')}
insert into public.soccer_grid_puzzles (puzzle_id, rows_json, cols_json, sort_order) values
${vals.join(',\n')}
on conflict (puzzle_id) do update set
  rows_json = excluded.rows_json, cols_json = excluded.cols_json, sort_order = excluded.sort_order;`;
  write('P4_soccer_grid.sql', sql);
})();

// ── 05 Shirt Number ───────────────────────────────────────────────────────────
(() => {
  const rows = readJson('_shirt_number_flawu.json');
  const vals = rows.map((r) =>
    `(${q(r.id)}::uuid, ${q(r.player_name)}, ${q(r.club)}, ${q(r.league)}, ${q(r.nationality)}, ${num(r.kit_number)}, ${q(r.fun_fact)})`
  );
  const sql = `create table if not exists public.shirt_number_puzzles (
  id          uuid        primary key default gen_random_uuid(),
  player_name text        not null,
  club        text        not null,
  league      text        not null,
  nationality text        not null,
  kit_number  smallint    not null,
  fun_fact    text        not null,
  created_at  timestamptz not null default now()
);
${rls('shirt_number_puzzles')}
insert into public.shirt_number_puzzles (id, player_name, club, league, nationality, kit_number, fun_fact) values
${vals.join(',\n')}
on conflict (id) do update set
  player_name = excluded.player_name, club = excluded.club, league = excluded.league,
  nationality = excluded.nationality, kit_number = excluded.kit_number, fun_fact = excluded.fun_fact;`;
  write('P5_shirt_number.sql', sql);
})();

// ── 06 Transfer Path ──────────────────────────────────────────────────────────
(() => {
  const rows = readJson('_transfer_path_flawu.json');
  const vals = rows.map((r) =>
    `(${q(r.puzzle_id)}, ${q(r.player_a)}, ${q(r.player_b)}, ${num(r.min_steps)}, ${q(r.hint)}, ${num(r.sort_order)})`
  );
  const sql = `create table if not exists public.transfer_path_puzzles (
  id         uuid        primary key default gen_random_uuid(),
  puzzle_id  text        not null unique,
  player_a   text        not null,
  player_b   text        not null,
  min_steps  smallint    not null,
  hint       text        not null,
  sort_order smallint    not null,
  created_at timestamptz not null default now()
);
${rls('transfer_path_puzzles')}
insert into public.transfer_path_puzzles (puzzle_id, player_a, player_b, min_steps, hint, sort_order) values
${vals.join(',\n')}
on conflict (puzzle_id) do update set
  player_a = excluded.player_a, player_b = excluded.player_b, min_steps = excluded.min_steps,
  hint = excluded.hint, sort_order = excluded.sort_order;`;
  write('P6_transfer_path.sql', sql);
})();
