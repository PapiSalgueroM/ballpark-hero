-- Round 667: Alisson's Internacional seasons for the career quiz.
--
-- A player reported on 2026-09-21 from /career: "Alisson played for
-- Internacional before going to Roma. Career quiz says he played for only 2
-- teams and started at Roma, which is wrong." He is right. Both pool entries
-- for him ('Alisson', a0000001-0000-0000-0000-000000000040, and 'Alisson
-- Becker', a0000001-0000-0000-0000-000000000066) open at Roma 2016-2017.
--
-- Sources, both in this project's own tables, which is where every other row
-- of career_seasons comes from:
--   public.player_market_values, name_folded 'alisson', position Goalkeeper:
--     2015 Sport Club Internacional, 57 matches, 5,000,000 USD, age 22
--     2016 Sport Club Internacional, 28 matches, 8,000,000 USD, age 23
--   public.soccer_player_club_stints, 'Alisson', Goalkeeper:
--     Sport Club Internacional, 2015 to 2016, 2 seasons
-- Seasons before 2015 have no row in either table and are NOT invented here;
-- his first team years at Internacional began earlier than 2015 and adding
-- them is owed to a round with an external source. Brazilian seasons are
-- calendar years and the pool already writes them that way (Adriano 2000,
-- Robinho 2002), so these are '2015' and '2016'.
--
-- Fail closed: every expectation about the current rows is checked before a
-- single write, and the whole block rolls back if any of them is off. The
-- 'Alisson' entry already has no rows at sort_order 0 and 1 (its rows start
-- at 2, a gap this fills); the 'Alisson Becker' entry's nine rows sit at 0 to
-- 8 and are moved to 2 to 10 first.
--
-- The two entries are the same man twice, which is its own defect. They are
-- both kept here because useCareerGame picks the daily by index into the
-- name ordered pool, so removing one moves every player's puzzle; that
-- deduplication is owed to a round that migrates the index.

do $migration$
declare
  a_id constant uuid := 'a0000001-0000-0000-0000-000000000040';
  b_id constant uuid := 'a0000001-0000-0000-0000-000000000066';
  n integer;
begin
  -- Expectations about the world before we touch it.
  select count(*) into n from public.career_players where id = a_id and player_name = 'Alisson';
  if n <> 1 then raise exception 'expected the Alisson entry at %, found % rows', a_id, n; end if;
  select count(*) into n from public.career_players where id = b_id and player_name = 'Alisson Becker';
  if n <> 1 then raise exception 'expected the Alisson Becker entry at %, found % rows', b_id, n; end if;

  select count(*) into n from public.career_seasons where player_id in (a_id, b_id) and club ilike '%Internacional%';
  if n <> 0 then raise exception 'Internacional rows already present (%), refusing to add them twice', n; end if;

  select count(*) into n from public.career_seasons where player_id = a_id and sort_order in (0, 1);
  if n <> 0 then raise exception 'the Alisson entry already has rows at sort_order 0 or 1 (%)', n; end if;
  select count(*) into n from public.career_seasons where player_id = a_id and sort_order = 2 and club = 'Roma' and season = '2016-2017';
  if n <> 1 then raise exception 'the Alisson entry does not open at Roma 2016-2017 at sort_order 2 as expected'; end if;

  select count(*) into n from public.career_seasons where player_id = b_id;
  if n <> 9 then raise exception 'expected 9 rows on the Alisson Becker entry, found %', n; end if;
  select count(*) into n from public.career_seasons where player_id = b_id and sort_order = 0 and club = 'Roma' and season = '2016-2017';
  if n <> 1 then raise exception 'the Alisson Becker entry does not open at Roma 2016-2017 at sort_order 0 as expected'; end if;

  -- Make room on the Becker entry: 8 down to 0 so no two rows collide on the way.
  update public.career_seasons set sort_order = sort_order + 2 where player_id = b_id;

  insert into public.career_seasons (id, player_id, season, club, goals, assists, appearances, market_value, sort_order)
  values
    (gen_random_uuid(), a_id, '2015', 'Internacional', 0, 0, 57, 5, 0),
    (gen_random_uuid(), a_id, '2016', 'Internacional', 0, 0, 28, 8, 1),
    (gen_random_uuid(), b_id, '2015', 'Internacional', 0, 0, 57, 5, 0),
    (gen_random_uuid(), b_id, '2016', 'Internacional', 0, 0, 28, 8, 1);

  -- Prove the shape we promised.
  select count(*) into n from public.career_seasons where player_id = a_id;
  if n <> 11 then raise exception 'Alisson should have 11 rows now, has %', n; end if;
  select count(*) into n from public.career_seasons where player_id = b_id;
  if n <> 11 then raise exception 'Alisson Becker should have 11 rows now, has %', n; end if;
  select count(*) into n from (select player_id, sort_order from public.career_seasons where player_id in (a_id, b_id) group by 1, 2 having count(*) > 1) d;
  if n <> 0 then raise exception '% duplicate sort_order values after the insert', n; end if;
  raise notice 'Alisson: Internacional 2015 and 2016 added to both entries, 11 rows each';
end
$migration$;
