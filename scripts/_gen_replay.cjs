// One-off generator for the pzzad resync .sql files.
// Connections/Baseball come from repo TS data files (what flawu was seeded from);
// Tennis comes from pzzad-resync/_tennis_flawu.json (pulled read-only from flawu);
// Footle is a static dedupe of pre-existing rows.
// Output: pure SQL, NO comment lines. CREATE TABLE + RLS + idempotent UPSERT.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUTDIR = path.join(ROOT, 'pzzad-resync');
fs.mkdirSync(OUTDIR, { recursive: true });

function loadTsArray(file, constName) {
  const text = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const marker = text.indexOf(constName);
  const eq = text.indexOf('=', marker);
  const arrStart = text.indexOf('[', eq);
  const arrEnd = text.lastIndexOf(']');
  // eslint-disable-next-line no-eval
  return eval('(' + text.slice(arrStart, arrEnd + 1) + ')');
}

const q = (s) => "'" + String(s).replace(/'/g, "''") + "'";
const arrLit = (a) => 'ARRAY[' + a.map(q).join(',') + ']::text[]';

function rlsPolicy(table) {
  return (
`alter table public.${table} enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = '${table}' and policyname = 'Public read-only') then
    create policy "Public read-only" on public.${table} for select to anon, authenticated using (true);
  end if;
end $$;`
  );
}

function write(name, sql) {
  const outPath = path.join(OUTDIR, name);
  fs.writeFileSync(outPath, sql.replace(/\n+$/, '') + '\n', 'utf8');
  const stripped = sql.split('\n').filter((l) => !l.trimStart().startsWith('--')).join('\n');
  const hasComment = sql.split('\n').some((l) => l.trimStart().startsWith('--'));
  const destructive = /\b(delete|truncate|drop)\b/i.test(sql) && !name.includes('footle');
  console.log(`${name}: bytes=${Buffer.byteLength(sql)} commentLines=${hasComment} unexpectedDestructive=${destructive}`);
}

// ── 01 Connections ──────────────────────────────────────────────────────────
(() => {
  const rows = loadTsArray('src/data/connectionsPuzzles.ts', 'connectionsPuzzles');
  const values = rows.map((p, i) => `(${q(p.id)}, ${q(JSON.stringify(p.groups))}::jsonb, ${i})`);
  const sql =
`create table if not exists public.connections_puzzles (
  id          uuid        primary key default gen_random_uuid(),
  puzzle_id   text        not null unique,
  groups_json jsonb       not null,
  sort_order  smallint    not null,
  created_at  timestamptz not null default now()
);
${rlsPolicy('connections_puzzles')}
create index if not exists connections_puzzles_puzzle_id_idx on public.connections_puzzles (puzzle_id);
create index if not exists connections_puzzles_sort_order_idx on public.connections_puzzles (sort_order);
insert into public.connections_puzzles (puzzle_id, groups_json, sort_order) values
${values.join(',\n')}
on conflict (puzzle_id) do update set
  groups_json = excluded.groups_json,
  sort_order  = excluded.sort_order;
`;
  write('01_connections.sql', sql);
})();

// ── 02 Baseball Connections ───────────────────────────────────────────────────
(() => {
  const rows = loadTsArray('src/data/baseballConnectionsPuzzles.ts', 'baseballConnectionsPuzzles');
  const values = rows.map((p, i) => `(${q(p.id)}, ${q(JSON.stringify(p.groups))}::jsonb, ${i})`);
  const sql =
`create table if not exists public.baseball_connections_puzzles (
  id          uuid        primary key default gen_random_uuid(),
  puzzle_id   text        not null unique,
  groups_json jsonb       not null,
  sort_order  smallint    not null,
  created_at  timestamptz not null default now()
);
${rlsPolicy('baseball_connections_puzzles')}
create index if not exists baseball_connections_puzzles_sort_order_idx on public.baseball_connections_puzzles (sort_order);
insert into public.baseball_connections_puzzles (puzzle_id, groups_json, sort_order) values
${values.join(',\n')}
on conflict (puzzle_id) do update set
  groups_json = excluded.groups_json,
  sort_order  = excluded.sort_order;
`;
  write('02_baseball_connections.sql', sql);
})();

// ── 03 Tennis ─────────────────────────────────────────────────────────────────
(() => {
  const rows = JSON.parse(fs.readFileSync(path.join(OUTDIR, '_tennis_flawu.json'), 'utf8'));
  const cols = ['player_name','common_names','vibe_word','nationality_era_hint','tour_hint','slam_count_hint','slam_detail_hint','famous_moment_hint','difficulty'];
  const values = rows.map((r) =>
    `(${q(r.player_name)}, ${arrLit(r.common_names)}, ${q(r.vibe_word)}, ${q(r.nationality_era_hint)}, ${q(r.tour_hint)}, ${q(r.slam_count_hint)}, ${q(r.slam_detail_hint)}, ${q(r.famous_moment_hint)}, ${q(r.difficulty)})`
  );
  const updates = cols.filter((c) => c !== 'player_name').map((c) => `  ${c} = excluded.${c}`).join(',\n');
  const sql =
`create table if not exists public.tennis_players (
  id                   uuid        primary key default gen_random_uuid(),
  player_name          text        not null unique,
  common_names         text[]      not null,
  vibe_word            text        not null,
  nationality_era_hint text        not null,
  tour_hint            text        not null,
  slam_count_hint      text        not null,
  slam_detail_hint     text        not null,
  famous_moment_hint   text        not null,
  difficulty           text        not null,
  created_at           timestamptz not null default now()
);
${rlsPolicy('tennis_players')}
insert into public.tennis_players (${cols.join(', ')}) values
${values.join(',\n')}
on conflict (player_name) do update set
${updates};
`;
  write('03_tennis.sql', sql);
})();

// ── 04 Footle dedupe (player_market_values year 2026) ─────────────────────────
(() => {
  // Mirrors supabase/migrations/20260526000008. Keeps one row per player_name
  // (highest market_value_usd, tie-break ctid). Idempotent. This is the only
  // file that deletes rows — by design, it is a dedupe of existing data.
  const sql =
`delete from public.player_market_values a
using (
  select player_name,
         (array_agg(ctid order by market_value_usd desc nulls last, ctid))[1] as keep_ctid
  from public.player_market_values
  where year = 2026
  group by player_name
) k
where a.year = 2026
  and a.player_name = k.player_name
  and a.ctid <> k.keep_ctid;
`;
  write('04_footle_dedupe.sql', sql);
})();
