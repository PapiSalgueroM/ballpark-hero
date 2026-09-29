-- Round 661 fix (2026-09-28), NOT APPLIED by the builder: for the lead to
-- read and apply through the Supabase MCP.
--
-- public.ucl_top_scorers_by_season holds one season row per season (70 rows,
-- 1955-56 to 2024-25) and only the first name when two or more players
-- finished level at the top. The List Quiz puzzle "Champions League Season
-- Top Scorers" reads those rows and promises every player who finished a
-- season as top scorer, so every joint top scorer after the first name, and
-- the whole 2025-26 season, were marked "not on the list" (Mbappe, Raphinha,
-- Yorke, Rivaldo, Papin, Platini and more).
--
-- This adds 24 rows. Each is on uefa.com's own page for that season
-- (https://www.uefa.com/uefachampionsleague/history/seasons/<year>/, where
-- the year is the season's first for 2006-07 and earlier and its second from
-- 2007-08 on) AND on one independent source, RSSSF's season by season list
-- (https://www.rsssf.org/ec/ec1tops.html) or, for Yorke, Planet Football.
-- The sources for every row, and the names one of the two gives and the
-- other does not (left out, with the reason), are in
-- scripts/data/triviaFactsVerified2026-09.json under listQuizUclTopScorers.
-- src/lib/listQuiz.ts carries the same rows as UCL_TOP_SCORER_SUPPLEMENT so
-- the game is right before this runs; after it runs each name arrives twice
-- and the quiz folds the pair. scripts/simTriviaFacts.mjs section 8 fails if
-- this file and that list ever disagree.
--
-- Seasons are written here with a hyphen and stored with the en dash the
-- other 70 rows use, built with chr(8211) so the character is not typed into
-- the repo. Goals are the count both sources give; Eusebio's 1964-65 is NULL
-- because uefa.com gives 6 and RSSSF 9, and neither is picked over the other.
--
-- Not touched: the rows already there. Some rest on one of the two sources
-- only (Kovacevic 1963-64, Piepenburg 1966-67, Hagi 1987-88 and Koeman
-- 1993-94 are on RSSSF's list and not on uefa.com's page, and several early
-- goal counts differ); that is recorded in the record for a later round, not
-- changed here.
--
-- Fail closed: every expectation about the current rows is checked before a
-- single write, and the whole block rolls back if any of them is off.

do $migration$
declare
  dash constant text := chr(8211);
  n integer;
  max_id integer;
  seq text;
begin
  create temp table ucl_new (
    ord integer primary key,
    season text not null,
    player text not null,
    club text not null,
    goals integer
  ) on commit drop;

  insert into ucl_new (ord, season, player, club, goals) values
    (1,  '1963-64',   'Sandro Mazzola',        'Inter Milan',         7),
    (2,  '1964-65',   'Eusébio',               'Benfica',             null),
    (3,  '1966-67',   'Paul Van Himst',        'Anderlecht',          6),
    (4,  '1971-72',   'Silvester Takač',       'Standard Liège',      5),
    (5,  '1971-72',   'Lou Macari',            'Celtic',              5),
    (6,  '1971-72',   'Antal Dunai',           'Újpesti Dózsa',       5),
    (7,  '1974-75',   'Eduard Markarov',       'Ararat Yerevan',      5),
    (8,  '1976-77',   'Franco Cucinotta',      'Zürich',              5),
    (9,  '1980-81',   'Graeme Souness',        'Liverpool',           6),
    (10, '1980-81',   'Karl-Heinz Rummenigge', 'Bayern Munich',       6),
    (11, '1984-85',   'Michel Platini',        'Juventus',            7),
    (12, '1987-88',   'Míchel',                'Real Madrid',         4),
    (13, '1989-90',   'Jean-Pierre Papin',     'Marseille',           6),
    (14, '1990-91',   'Jean-Pierre Papin',     'Marseille',           6),
    (15, '1991-92',   'Jean-Pierre Papin',     'Marseille',           7),
    (16, '1993-94',   'Wynton Rufer',          'Werder Bremen',       8),
    (17, '1998-99',   'Dwight Yorke',          'Manchester United',   8),
    (18, '1999-2000', 'Rivaldo',               'Barcelona',           10),
    (19, '1999-2000', 'Raúl',                  'Real Madrid',         10),
    (20, '2014-15',   'Lionel Messi',          'Barcelona',           10),
    (21, '2014-15',   'Cristiano Ronaldo',     'Real Madrid',         10),
    (22, '2023-24',   'Kylian Mbappé',         'Paris Saint-Germain', 8),
    (23, '2024-25',   'Raphinha',              'Barcelona',           13),
    (24, '2025-26',   'Kylian Mbappé',         'Real Madrid',         15);

  -- Expectations about the world before we touch it.
  select count(*) into n from public.ucl_top_scorers_by_season;
  if n <> 144 then raise exception 'expected 144 rows in ucl_top_scorers_by_season, found %', n; end if;

  select count(*) into n from public.ucl_top_scorers_by_season where season ~ '^[0-9]{4}.[0-9]{2,4}$';
  if n <> 70 then raise exception 'expected 70 season shaped rows, found %', n; end if;

  select count(*) into n from public.ucl_top_scorers_by_season where season = '2024' || dash || '25' and player = 'Serhou Guirassy';
  if n <> 1 then raise exception 'the 2024-25 row is not Serhou Guirassy as expected (found %)', n; end if;

  select count(*) into n from public.ucl_top_scorers_by_season where season like '2025%';
  if n <> 0 then raise exception '2025-26 rows already present (%), refusing to add them twice', n; end if;

  -- Every season a new row joins must already have exactly one row, the first name.
  select count(*) into n from (
    select distinct v.season from ucl_new v
    where v.season <> '2025-26'
      and (select count(*) from public.ucl_top_scorers_by_season t where t.season = replace(v.season, '-', dash)) <> 1
  ) s;
  if n <> 0 then raise exception '% seasons do not hold exactly one row before the insert', n; end if;

  -- None of the new rows may already be there.
  select count(*) into n from ucl_new v
    join public.ucl_top_scorers_by_season t on t.season = replace(v.season, '-', dash) and t.player = v.player;
  if n <> 0 then raise exception '% of the new rows are already present, refusing to add them twice', n; end if;

  -- Ids are given explicitly above the current top, and the sequence (if the
  -- column has one) is moved past them so a later default cannot collide.
  select coalesce(max(id), 0) into max_id from public.ucl_top_scorers_by_season;
  insert into public.ucl_top_scorers_by_season (id, season, player, club, goals)
    select max_id + v.ord, replace(v.season, '-', dash), v.player, v.club, v.goals
    from ucl_new v order by v.ord;
  seq := pg_get_serial_sequence('public.ucl_top_scorers_by_season', 'id');
  if seq is not null then
    perform setval(seq, (select max(id) from public.ucl_top_scorers_by_season));
  end if;

  -- Prove the shape we promised.
  select count(*) into n from public.ucl_top_scorers_by_season;
  if n <> 168 then raise exception 'expected 168 rows after the insert, found %', n; end if;
  select count(*) into n from public.ucl_top_scorers_by_season where season ~ '^[0-9]{4}.[0-9]{2,4}$';
  if n <> 94 then raise exception 'expected 94 season shaped rows after the insert, found %', n; end if;
  select count(distinct season) into n from public.ucl_top_scorers_by_season where season ~ '^[0-9]{4}.[0-9]{2,4}$';
  if n <> 71 then raise exception 'expected 71 seasons (1955-56 to 2025-26), found %', n; end if;
  raise notice 'ucl_top_scorers_by_season: 24 joint and 2025-26 top scorer rows added, 94 season rows over 71 seasons';
end
$migration$;
