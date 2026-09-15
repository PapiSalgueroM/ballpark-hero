-- READ ONLY probes behind the Round 613 contract (2026-09-15). SELECT only, project flawuiqbvjobmkfkauhw.
-- No edge function was invoked. Readings are recorded next to each query.

-- 1. Club label identity derived from data (label exact, soccer_club_puzzles full_name when exactly one row
--    names the label, world_cup_players club spelling co-occurring with a stints club for the same folded
--    name and overlapping year, n >= 3 and share >= 0.3).
--    Reading: 101 single labels, 99 resolved; unresolved Santos (2 puzzle rows) and England at a World Cup;
--    low coverage Grêmio (only the 1 name 'Grêmio', the 166 name 'Grêmio Foot-Ball Porto Alegrense' unreachable);
--    compound: 'Inter' in 'both AC Milan and Inter' ambiguous; no WC spelling maps to two targets.
with labs as (
  select regexp_replace(e->>'label', '^\s*played for\s+', '', 'i') lab, count(*) slots
  from soccer_grid_puzzles p, lateral (select jsonb_array_elements(p.rows_json) e union all select jsonb_array_elements(p.cols_json)) x
  where (e->>'label') ~* '^\s*played for\s+' group by 1),
parts0 as (select lab, slots, case when lab ~* '^both .+ and .+$' then 'both' when lab ~* '^.+ or .+$' then 'either' else 'single' end shape from labs),
lparts as (
  select lab, slots, shape, trim(p) part from parts0, regexp_split_to_table(regexp_replace(lab, '^both\s+', '', 'i'), '\s+(and|or)\s+') p where shape <> 'single'
  union all select lab, slots, shape, lab from parts0 where shape = 'single'),
fold as (select *, trim(regexp_replace(lower(public.unaccent(part)), '[^a-z0-9]+', ' ', 'g')) pf from lparts),
cp as (select full_name, trim(regexp_replace(lower(public.unaccent(nm)), '[^a-z0-9]+', ' ', 'g')) nf from soccer_club_puzzles, unnest(common_names || full_name) nm),
cpu as (select f.lab, f.part, count(distinct cp.full_name) nrows, min(cp.full_name) fname from fold f join cp on cp.nf = f.pf group by 1,2),
names as (
  select f.lab, f.part, f.pf nf, 'label' via from fold f
  union select f.lab, f.part, trim(regexp_replace(lower(public.unaccent(cpu.fname)), '[^a-z0-9]+', ' ', 'g')), 'puzzle' from fold f join cpu on cpu.lab=f.lab and cpu.part=f.part and cpu.nrows=1),
sc as (select part s, trim(regexp_replace(lower(public.unaccent(part)), '[^a-z0-9]+', ' ', 'g')) sf from soccer_player_club_stints, regexp_split_to_table(club, ' / ') part group by 1),
wc as (select trim(regexp_replace(lower(public.unaccent(w.club)), '[^a-z0-9]+', ' ', 'g')) wf, st.club sclub, count(distinct w.player_name) n
       from world_cup_players w join soccer_player_club_stints st on st.name_folded = trim(regexp_replace(lower(public.unaccent(w.player_name)), '[^a-z0-9]+', ' ', 'g'))
         and st.first_year <= w.world_cup_year and st.last_year >= w.world_cup_year - 1
       where w.world_cup_year >= 2006 and w.club is not null and st.club not like '% / %' group by 1,2),
wct as (select wf, sum(n) tot from wc group by 1)
select n.lab, n.part, sc.s, 'exact:' || n.via src from names n join sc on sc.sf = n.nf
union select n.lab, n.part, wc.sclub, 'wc:' || n.via || ' ' || wc.n || '/' || wct.tot from names n join wc on wc.wf = n.nf join wct using (wf)
where wc.n >= 3 and wc.n::numeric / wct.tot >= 0.3 order by 1;

-- 2. Nationality spelling derived from co-occurrence (WC nationality vs stints nationality, same folded name).
--    Reading: Ivory Coast to Cote d'Ivoire 59/59, Bosnia and Herzegovina to Bosnia-Herzegovina 29/29,
--    Turkey to Türkiye 21/21, Serbia and Montenegro to Serbia 19/19, Curaçao to Curacao 5/5.
--    South Korea does not co-occur (name order differs: stints 'heung min son'); token-set equality with
--    'Korea, South' settles it.

-- 3. Cache replay bands for WC-year rows (pg_trgm similarity >= 0.5 as the near test).
--    Reading: data YES 104 = exact 67, unique surname 30, guess has extra tokens 4, near 3;
--    data NO 159 = near 22, no squad member near 137; AI rows on WC labels 8.

-- 4. Cache composition, game soccer-grid, 640 rows: data_confirm 361, data_refuse club 64 (7 since v23 on
--    2026-09-07), data_refuse nationality route 7 (0 since v23), data_refuse WC 159 (41 since v23),
--    ai_confirm 33, ai_refuse 16.

-- 5. Identity: player_market_values has age on all 141,916 rows; 545 folded names span more than one birth
--    year cluster (spread > 2), 338 of them with one nationality (Round 489's guard misses those).
--    stints person_key is null on 80,577 of 80,586 rows.

-- 6. Logs, 24h to 2026-09-15 ~06Z: 169 soccer-grid-validate calls, 7 'ai refused 429 DAY' lines (first 15:59Z).
