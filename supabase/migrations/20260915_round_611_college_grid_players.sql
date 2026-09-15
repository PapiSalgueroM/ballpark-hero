-- Round 611: the College Grid answer key as a table the page can read.
-- scripts/data/collegeGridPlayers.json is the committed derivation (see
-- scripts/genCollegeGridData.mjs for every rule); this table is that file
-- loaded row for row, one row per entry: an NFL career from the NFL key (id is
-- its gsis_id or name plus birth date key), a draft row that joined no career
-- (id draft:YEAR-PICK) or a Heisman winner that joined neither (id heisman:YEAR).
-- src/lib/collegeGrid.ts judges every guess against it in the browser.
-- RLS on with a public read policy, the same shape as nfl_grid_players.
-- APPLIED 2026-09-15 through the Supabase MCP: the table exists with RLS on and the
-- public read policy, loaded as described below, and get_advisors was run after it.
create table if not exists public.college_grid_players (
  id text primary key,
  display_name text not null,
  name_norm text not null,
  colleges text[] not null default '{}',
  colleges_agreed text[] not null default '{}',
  groups text[] not null default '{}',
  best_pick integer,
  first_round boolean,
  undrafted boolean not null default false,
  heisman_year integer,
  first_season integer,
  seasons integer not null default 0,
  dup boolean not null default false
);
create index if not exists college_grid_players_name_norm_idx on public.college_grid_players (name_norm);
create index if not exists college_grid_players_display_idx on public.college_grid_players (display_name);
alter table public.college_grid_players enable row level security;
drop policy if exists "Allow public read" on public.college_grid_players;
create policy "Allow public read" on public.college_grid_players for select to public using (true);

-- LOADING THE ROWS (the Round 405 way: the database pulls the committed file
-- itself, so no write policy is opened and no row passes through a chat).
-- Only after the commit that holds scripts/data/collegeGridPlayers.json is on
-- GitHub. Two separate execute_sql calls through the Supabase MCP:
--
-- 1. Queue the fetch of the file at that commit and note the request id:
--
--   select net.http_get(
--     url := 'https://raw.githubusercontent.com/PapiSalgueroM/ballpark-hero/<COMMIT_SHA>/scripts/data/collegeGridPlayers.json',
--     timeout_milliseconds := 120000
--   ) as request_id;
--
-- 2. When net._http_response holds that id with status 200, load every row in
--    one transaction. The file is columnar (columns names the order); the
--    guard on columns makes a file of any other shape insert nothing.
--
--   begin;
--   truncate public.college_grid_players;
--   insert into public.college_grid_players
--     (id, display_name, name_norm, colleges, colleges_agreed, groups, best_pick,
--      first_round, undrafted, heisman_year, first_season, seasons, dup)
--   select r->>0, r->>1, r->>3,
--     array(select jsonb_array_elements_text(r->4)),
--     array(select jsonb_array_elements_text(r->5)),
--     array(select jsonb_array_elements_text(r->6)),
--     (r->>7)::integer, (r->>8)::boolean, (r->>9)::boolean, (r->>10)::integer,
--     (r->>11)::integer, (r->>12)::integer, (r->>13)::boolean
--   from net._http_response h,
--     jsonb_array_elements(h.content::jsonb->'rows') r
--   where h.id = <REQUEST_ID> and h.status_code = 200
--     and h.content::jsonb->'columns' = '["id","display_name","name","name_norm","colleges","colleges_agreed","groups","best_pick","first_round","undrafted","heisman_year","first_season","seasons","dup","proof"]'::jsonb;
--   select count(*) from public.college_grid_players;
--   commit;
--
--    Commit only when the count equals the file's row count (35,611 on
--    2026-09-15); otherwise roll back. Then run get_advisors.
