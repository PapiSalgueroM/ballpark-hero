-- READ ONLY probe queries used for the Round 613 Soccer Grid label map (2026-09-15). SELECT only.
-- Project flawuiqbvjobmkfkauhw. Deployed soccer-grid-validate v23 (updated 2026-09-07).

-- 1. Tier per board (client classifyPuzzleDifficulty: type narrowness, easy < 2.5 <= normal < 4 <= hard) and
--    the deployed parseCriterion routing, per class. Reproduces 470 / 193 / 47.
with p as (select puzzle_id, sort_order, rows_json, cols_json from soccer_grid_puzzles),
attrs as (select puzzle_id, (e->>'label') label, (e->>'type') typ, 'r' side from p, jsonb_array_elements(rows_json) e
          union all select puzzle_id, (e->>'label'), (e->>'type'), 'c' from p, jsonb_array_elements(cols_json) e),
nar as (select *, case when typ in ('club','league','position','nationality') then 1
                       when typ in ('misc','award','champions_league','world_cup') then 3 else 2 end n from attrs),
score as (select r.puzzle_id, avg(r.n + c.n) s from nar r join nar c on c.puzzle_id = r.puzzle_id and r.side = 'r' and c.side = 'c' group by r.puzzle_id),
tier as (select puzzle_id, case when s < 2.5 then 'easy' when s < 4 then 'normal' else 'hard' end tier from score),
k as (select a.*, t.tier, case
  when trim(label) ~* '^played for\s+' then 'club'
  when trim(label) ~* '^played in\s+' then 'league'
  when trim(label) ~* 'goalkeeper|\(GK\)|defender|\(DEF\)|midfield|\(MID\)|forward|striker|winger|\(FWD\)' then 'position'
  when trim(label) ~* '^(1970|1974|1978|1982|1986|1990|1994|1998|2002|2006|2010|2014|2018|2022|2026)\s+world cup winner$' then 'wc'
  when trim(label) ~* 'world cup|champions league|ballon|golden boot|golden glove|100\+?\s*caps|winner|\mwon\M|champion|title|trophy|top scorer' then 'honour'
  else 'nationality' end kind from attrs a join tier t using (puzzle_id))
select kind, tier, count(distinct label) labels, count(*) slots, count(distinct puzzle_id) boards from k group by 1, 2 order by 1, 2;

-- 2. Stored club strings each "Played for X" label accepts under clubMatches (substring both ways + 5 aliases).
with p as (select rows_json, cols_json from soccer_grid_puzzles),
attrs as (select e->>'label' label from p, jsonb_array_elements(rows_json) e union all select e->>'label' from p, jsonb_array_elements(cols_json) e),
lab as (select distinct label, trim(regexp_replace(regexp_replace(lower(public.unaccent(regexp_replace(label, '^played for\s+', '', 'i'))), '[^a-z0-9 ]+', ' ', 'g'), '\s+', ' ', 'g')) b
        from attrs where label ~* '^played for\s+'),
al(b, a) as (values ('psg','paris saint germain'),('bayer leverkusen','bayer 04 leverkusen'),('celta vigo','celta de vigo'),('rennes','stade rennais fc'),('la galaxy','los angeles galaxy')),
clubs as (select club, count(distinct name_folded) names from soccer_player_club_stints group by club),
parts as (select club, names, trim(regexp_replace(regexp_replace(lower(public.unaccent(part)), '[^a-z0-9 ]+', ' ', 'g'), '\s+', ' ', 'g')) a from clubs, regexp_split_to_table(club, ' / ') part),
m as (select distinct lab.label, parts.club, parts.names from lab join parts on parts.a <> '' and (parts.a = lab.b or strpos(parts.a, lab.b) > 0 or strpos(lab.b, parts.a) > 0
      or exists (select 1 from al where al.b = lab.b and al.a = parts.a)))
select lab.label, count(m.club) nclubs, string_agg(m.club || ' ' || m.names, ' | ' order by m.names desc) clubs from lab left join m using (label) group by lab.label order by 1;

-- 3. The stints table is player_market_values capped at rank 500 per position per year (so "career complete" is never true).
select year, count(*) rows_n, max(rank) max_rank from player_market_values where year in (2004, 2010, 2023, 2026) group by year;
select position, count(*) filter (where y = 2022) y2022, count(*) filter (where y = 2023) y2023, count(*) filter (where y = 2026) y2026
from (select generate_series(first_year, last_year) y, position from soccer_player_club_stints) t where position ilike '%midfield%' group by position;

-- 4. Cached data-pass confirmations of a World Cup winner where the typed name merely CONTAINS a squad mononym.
select cache_key, verdict->>'fullName' from ai_validation_cache where game = 'soccer-grid'
  and cache_key in ('cristiano ronaldo|1994 world cup winner|forward (fwd)', 'thomas muller|1994 world cup winner|forward (fwd)',
                    'ram|2010 world cup winner|defender (def)', 'pirl|2006 world cup winner|midfielder (mid)', 'stefa|1990 world cup winner|defender (def)',
                    'romario|1994 world cup winner|defender (def)', 'adel taarabt|played for rangers|midfielder (mid)');

-- 5. game_completions per ISO week (no tier column exists).
select to_char(completed_on, 'IYYY-"W"IW') wk, count(*) n, count(*) filter (where score >= 900) wins
from game_completions where game = 'soccer-grid' and completed_on >= '2026-07-01' group by 1 order by 1;
