-- Round 784: the career quiz paths start where the careers started.
--
-- A player reported on 2026-09-21 from /career that Alisson played for
-- Internacional before Roma. Round 667 added his Internacional 2015 and 2016
-- and left the seasons before 2015 owed. This finishes that and audits the
-- first club of the 25 best known players in the pool (highest peak market
-- value) against two sources each. Every row below, its sources and the rule
-- that picked it are in scripts/data/careerFirstClubs.json:
--   added: 28 season rows on 15 players, each prepended to the path
--   changed: Alisson's 2016 Internacional appearances on both of his entries, 28 to 20
-- Assists are null (shown n/a) because only one source counts them, and the
-- market value is 0 (shown n/a) because no second source publishes one.
--
-- Fail closed: every expectation about the current rows is checked before the
-- write it guards, and the whole block rolls back if any of them is off.
-- After applying: node scripts/bakeCareerPlayers.mjs must leave
-- src/data/careerPlayers.ts unchanged except its date stamp, then rerun
-- node scripts/genTransferPathHints.mjs (new clubs and seasons are new links).

do $migration$
declare
  n integer;
  total integer;
begin
  select count(*) into total from public.career_seasons;
  if total <> 3612 then raise exception 'expected 3612 career_seasons rows before this migration, found %', total; end if;

  -- Alisson: 2013 Internacional, 2014 Internacional before 2015 Internacional
  select count(*) into n from public.career_players where id = 'a0000001-0000-0000-0000-000000000040' and player_name = 'Alisson';
  if n <> 1 then raise exception 'Alisson: expected one career_players row at a0000001-0000-0000-0000-000000000040, found %', n; end if;
  select count(*) into n from public.career_seasons where player_id = 'a0000001-0000-0000-0000-000000000040';
  if n <> 11 then raise exception 'Alisson: expected 11 season rows, found %', n; end if;
  select count(*) into n from public.career_seasons where player_id = 'a0000001-0000-0000-0000-000000000040' and sort_order = 0 and season = '2015' and club = 'Internacional';
  if n <> 1 then raise exception 'Alisson: the path no longer opens at 2015 Internacional'; end if;
  select count(*) into n from public.career_seasons where player_id = 'a0000001-0000-0000-0000-000000000040' and (season, club) in (('2013', 'Internacional'), ('2014', 'Internacional'));
  if n <> 0 then raise exception 'Alisson: % of the rows to add are already there', n; end if;
  update public.career_seasons set sort_order = sort_order + 2 where player_id = 'a0000001-0000-0000-0000-000000000040';
  insert into public.career_seasons (player_id, season, club, goals, assists, appearances, market_value, sort_order) values
    ('a0000001-0000-0000-0000-000000000040', '2013', 'Internacional', 0, null, 9, 0, 0),
    ('a0000001-0000-0000-0000-000000000040', '2014', 'Internacional', 0, null, 14, 0, 1);

  -- Alisson Becker: 2013 Internacional, 2014 Internacional before 2015 Internacional
  select count(*) into n from public.career_players where id = 'a0000001-0000-0000-0000-000000000066' and player_name = 'Alisson Becker';
  if n <> 1 then raise exception 'Alisson Becker: expected one career_players row at a0000001-0000-0000-0000-000000000066, found %', n; end if;
  select count(*) into n from public.career_seasons where player_id = 'a0000001-0000-0000-0000-000000000066';
  if n <> 11 then raise exception 'Alisson Becker: expected 11 season rows, found %', n; end if;
  select count(*) into n from public.career_seasons where player_id = 'a0000001-0000-0000-0000-000000000066' and sort_order = 0 and season = '2015' and club = 'Internacional';
  if n <> 1 then raise exception 'Alisson Becker: the path no longer opens at 2015 Internacional'; end if;
  select count(*) into n from public.career_seasons where player_id = 'a0000001-0000-0000-0000-000000000066' and (season, club) in (('2013', 'Internacional'), ('2014', 'Internacional'));
  if n <> 0 then raise exception 'Alisson Becker: % of the rows to add are already there', n; end if;
  update public.career_seasons set sort_order = sort_order + 2 where player_id = 'a0000001-0000-0000-0000-000000000066';
  insert into public.career_seasons (player_id, season, club, goals, assists, appearances, market_value, sort_order) values
    ('a0000001-0000-0000-0000-000000000066', '2013', 'Internacional', 0, null, 9, 0, 0),
    ('a0000001-0000-0000-0000-000000000066', '2014', 'Internacional', 0, null, 14, 0, 1);

  -- Erling Haaland: 2016 Bryne, 2017 Molde, 2018 Molde before 2018-2019 RB Salzburg
  select count(*) into n from public.career_players where id = 'a0000001-0000-0000-0000-000000000006' and player_name = 'Erling Haaland';
  if n <> 1 then raise exception 'Erling Haaland: expected one career_players row at a0000001-0000-0000-0000-000000000006, found %', n; end if;
  select count(*) into n from public.career_seasons where player_id = 'a0000001-0000-0000-0000-000000000006';
  if n <> 7 then raise exception 'Erling Haaland: expected 7 season rows, found %', n; end if;
  select count(*) into n from public.career_seasons where player_id = 'a0000001-0000-0000-0000-000000000006' and sort_order = 0 and season = '2018-2019' and club = 'RB Salzburg';
  if n <> 1 then raise exception 'Erling Haaland: the path no longer opens at 2018-2019 RB Salzburg'; end if;
  select count(*) into n from public.career_seasons where player_id = 'a0000001-0000-0000-0000-000000000006' and (season, club) in (('2016', 'Bryne'), ('2017', 'Molde'), ('2018', 'Molde'));
  if n <> 0 then raise exception 'Erling Haaland: % of the rows to add are already there', n; end if;
  update public.career_seasons set sort_order = sort_order + 3 where player_id = 'a0000001-0000-0000-0000-000000000006';
  insert into public.career_seasons (player_id, season, club, goals, assists, appearances, market_value, sort_order) values
    ('a0000001-0000-0000-0000-000000000006', '2016', 'Bryne', 0, null, 16, 0, 0),
    ('a0000001-0000-0000-0000-000000000006', '2017', 'Molde', 4, null, 20, 0, 1),
    ('a0000001-0000-0000-0000-000000000006', '2018', 'Molde', 16, null, 30, 0, 2);

  -- Mohamed Salah: 2009-2010 Al Mokawloon, 2010-2011 Al Mokawloon, 2011-2012 Al Mokawloon before 2012-2013 Basel
  select count(*) into n from public.career_players where id = 'a0000001-0000-0000-0000-000000000007' and player_name = 'Mohamed Salah';
  if n <> 1 then raise exception 'Mohamed Salah: expected one career_players row at a0000001-0000-0000-0000-000000000007, found %', n; end if;
  select count(*) into n from public.career_seasons where player_id = 'a0000001-0000-0000-0000-000000000007';
  if n <> 13 then raise exception 'Mohamed Salah: expected 13 season rows, found %', n; end if;
  select count(*) into n from public.career_seasons where player_id = 'a0000001-0000-0000-0000-000000000007' and sort_order = 0 and season = '2012-2013' and club = 'Basel';
  if n <> 1 then raise exception 'Mohamed Salah: the path no longer opens at 2012-2013 Basel'; end if;
  select count(*) into n from public.career_seasons where player_id = 'a0000001-0000-0000-0000-000000000007' and (season, club) in (('2009-2010', 'Al Mokawloon'), ('2010-2011', 'Al Mokawloon'), ('2011-2012', 'Al Mokawloon'));
  if n <> 0 then raise exception 'Mohamed Salah: % of the rows to add are already there', n; end if;
  update public.career_seasons set sort_order = sort_order + 3 where player_id = 'a0000001-0000-0000-0000-000000000007';
  insert into public.career_seasons (player_id, season, club, goals, assists, appearances, market_value, sort_order) values
    ('a0000001-0000-0000-0000-000000000007', '2009-2010', 'Al Mokawloon', 0, null, 5, 0, 0),
    ('a0000001-0000-0000-0000-000000000007', '2010-2011', 'Al Mokawloon', 5, null, 25, 0, 1),
    ('a0000001-0000-0000-0000-000000000007', '2011-2012', 'Al Mokawloon', 7, null, 15, 0, 2);

  -- Federico Valverde: 2015-2016 Peñarol, 2017-2018 Deportivo La Coruña before 2018-2019 Real Madrid
  select count(*) into n from public.career_players where id = 'a0000001-0000-0000-0000-000000000044' and player_name = 'Federico Valverde';
  if n <> 1 then raise exception 'Federico Valverde: expected one career_players row at a0000001-0000-0000-0000-000000000044, found %', n; end if;
  select count(*) into n from public.career_seasons where player_id = 'a0000001-0000-0000-0000-000000000044';
  if n <> 7 then raise exception 'Federico Valverde: expected 7 season rows, found %', n; end if;
  select count(*) into n from public.career_seasons where player_id = 'a0000001-0000-0000-0000-000000000044' and sort_order = 0 and season = '2018-2019' and club = 'Real Madrid';
  if n <> 1 then raise exception 'Federico Valverde: the path no longer opens at 2018-2019 Real Madrid'; end if;
  select count(*) into n from public.career_seasons where player_id = 'a0000001-0000-0000-0000-000000000044' and (season, club) in (('2015-2016', 'Peñarol'), ('2017-2018', 'Deportivo La Coruña'));
  if n <> 0 then raise exception 'Federico Valverde: % of the rows to add are already there', n; end if;
  update public.career_seasons set sort_order = sort_order + 2 where player_id = 'a0000001-0000-0000-0000-000000000044';
  insert into public.career_seasons (player_id, season, club, goals, assists, appearances, market_value, sort_order) values
    ('a0000001-0000-0000-0000-000000000044', '2015-2016', 'Peñarol', 0, null, 13, 0, 0),
    ('a0000001-0000-0000-0000-000000000044', '2017-2018', 'Deportivo La Coruña', 0, null, 25, 0, 1);

  -- Harry Kane: 2010-2011 Leyton Orient before 2011-2012 Tottenham
  select count(*) into n from public.career_players where id = 'a0000001-0000-0000-0000-000000000008' and player_name = 'Harry Kane';
  if n <> 1 then raise exception 'Harry Kane: expected one career_players row at a0000001-0000-0000-0000-000000000008, found %', n; end if;
  select count(*) into n from public.career_seasons where player_id = 'a0000001-0000-0000-0000-000000000008';
  if n <> 14 then raise exception 'Harry Kane: expected 14 season rows, found %', n; end if;
  select count(*) into n from public.career_seasons where player_id = 'a0000001-0000-0000-0000-000000000008' and sort_order = 0 and season = '2011-2012' and club = 'Tottenham';
  if n <> 1 then raise exception 'Harry Kane: the path no longer opens at 2011-2012 Tottenham'; end if;
  select count(*) into n from public.career_seasons where player_id = 'a0000001-0000-0000-0000-000000000008' and (season, club) in (('2010-2011', 'Leyton Orient'));
  if n <> 0 then raise exception 'Harry Kane: % of the rows to add are already there', n; end if;
  update public.career_seasons set sort_order = sort_order + 1 where player_id = 'a0000001-0000-0000-0000-000000000008';
  insert into public.career_seasons (player_id, season, club, goals, assists, appearances, market_value, sort_order) values
    ('a0000001-0000-0000-0000-000000000008', '2010-2011', 'Leyton Orient', 5, null, 18, 0, 0);

  -- Kevin De Bruyne: 2008-2009 Genk, 2009-2010 Genk, 2010-2011 Genk, 2011-2012 Genk before 2012-2013 Chelsea
  select count(*) into n from public.career_players where id = 'a0000001-0000-0000-0000-000000000011' and player_name = 'Kevin De Bruyne';
  if n <> 1 then raise exception 'Kevin De Bruyne: expected one career_players row at a0000001-0000-0000-0000-000000000011, found %', n; end if;
  select count(*) into n from public.career_seasons where player_id = 'a0000001-0000-0000-0000-000000000011';
  if n <> 14 then raise exception 'Kevin De Bruyne: expected 14 season rows, found %', n; end if;
  select count(*) into n from public.career_seasons where player_id = 'a0000001-0000-0000-0000-000000000011' and sort_order = 0 and season = '2012-2013' and club = 'Chelsea';
  if n <> 1 then raise exception 'Kevin De Bruyne: the path no longer opens at 2012-2013 Chelsea'; end if;
  select count(*) into n from public.career_seasons where player_id = 'a0000001-0000-0000-0000-000000000011' and (season, club) in (('2008-2009', 'Genk'), ('2009-2010', 'Genk'), ('2010-2011', 'Genk'), ('2011-2012', 'Genk'));
  if n <> 0 then raise exception 'Kevin De Bruyne: % of the rows to add are already there', n; end if;
  update public.career_seasons set sort_order = sort_order + 4 where player_id = 'a0000001-0000-0000-0000-000000000011';
  insert into public.career_seasons (player_id, season, club, goals, assists, appearances, market_value, sort_order) values
    ('a0000001-0000-0000-0000-000000000011', '2008-2009', 'Genk', 0, null, 2, 0, 0),
    ('a0000001-0000-0000-0000-000000000011', '2009-2010', 'Genk', 3, null, 40, 0, 1),
    ('a0000001-0000-0000-0000-000000000011', '2010-2011', 'Genk', 6, null, 35, 0, 2),
    ('a0000001-0000-0000-0000-000000000011', '2011-2012', 'Genk', 8, null, 36, 0, 3);

  -- Victor Osimhen: 2016-2017 VfL Wolfsburg, 2017-2018 VfL Wolfsburg, 2018-2019 Charleroi before 2019-2020 Lille
  select count(*) into n from public.career_players where id = 'a0000001-0000-0000-0000-000000000057' and player_name = 'Victor Osimhen';
  if n <> 1 then raise exception 'Victor Osimhen: expected one career_players row at a0000001-0000-0000-0000-000000000057, found %', n; end if;
  select count(*) into n from public.career_seasons where player_id = 'a0000001-0000-0000-0000-000000000057';
  if n <> 6 then raise exception 'Victor Osimhen: expected 6 season rows, found %', n; end if;
  select count(*) into n from public.career_seasons where player_id = 'a0000001-0000-0000-0000-000000000057' and sort_order = 0 and season = '2019-2020' and club = 'Lille';
  if n <> 1 then raise exception 'Victor Osimhen: the path no longer opens at 2019-2020 Lille'; end if;
  select count(*) into n from public.career_seasons where player_id = 'a0000001-0000-0000-0000-000000000057' and (season, club) in (('2016-2017', 'VfL Wolfsburg'), ('2017-2018', 'VfL Wolfsburg'), ('2018-2019', 'Charleroi'));
  if n <> 0 then raise exception 'Victor Osimhen: % of the rows to add are already there', n; end if;
  update public.career_seasons set sort_order = sort_order + 3 where player_id = 'a0000001-0000-0000-0000-000000000057';
  insert into public.career_seasons (player_id, season, club, goals, assists, appearances, market_value, sort_order) values
    ('a0000001-0000-0000-0000-000000000057', '2016-2017', 'VfL Wolfsburg', 0, null, 3, 0, 0),
    ('a0000001-0000-0000-0000-000000000057', '2017-2018', 'VfL Wolfsburg', 0, null, 13, 0, 1),
    ('a0000001-0000-0000-0000-000000000057', '2018-2019', 'Charleroi', 20, null, 36, 0, 2);

  -- Cristiano Ronaldo: 2002-2003 Sporting CP before 2003-2004 Manchester United
  select count(*) into n from public.career_players where id = 'a0000001-0000-0000-0000-000000000001' and player_name = 'Cristiano Ronaldo';
  if n <> 1 then raise exception 'Cristiano Ronaldo: expected one career_players row at a0000001-0000-0000-0000-000000000001, found %', n; end if;
  select count(*) into n from public.career_seasons where player_id = 'a0000001-0000-0000-0000-000000000001';
  if n <> 21 then raise exception 'Cristiano Ronaldo: expected 21 season rows, found %', n; end if;
  select count(*) into n from public.career_seasons where player_id = 'a0000001-0000-0000-0000-000000000001' and sort_order = 0 and season = '2003-2004' and club = 'Manchester United';
  if n <> 1 then raise exception 'Cristiano Ronaldo: the path no longer opens at 2003-2004 Manchester United'; end if;
  select count(*) into n from public.career_seasons where player_id = 'a0000001-0000-0000-0000-000000000001' and (season, club) in (('2002-2003', 'Sporting CP'));
  if n <> 0 then raise exception 'Cristiano Ronaldo: % of the rows to add are already there', n; end if;
  update public.career_seasons set sort_order = sort_order + 1 where player_id = 'a0000001-0000-0000-0000-000000000001';
  insert into public.career_seasons (player_id, season, club, goals, assists, appearances, market_value, sort_order) values
    ('a0000001-0000-0000-0000-000000000001', '2002-2003', 'Sporting CP', 5, null, 31, 0, 0);

  -- Eden Hazard: 2007-2008 Lille, 2008-2009 Lille before 2009-2010 Lille
  select count(*) into n from public.career_players where id = 'a0000001-0000-0000-0000-000000000014' and player_name = 'Eden Hazard';
  if n <> 1 then raise exception 'Eden Hazard: expected one career_players row at a0000001-0000-0000-0000-000000000014, found %', n; end if;
  select count(*) into n from public.career_seasons where player_id = 'a0000001-0000-0000-0000-000000000014';
  if n <> 14 then raise exception 'Eden Hazard: expected 14 season rows, found %', n; end if;
  select count(*) into n from public.career_seasons where player_id = 'a0000001-0000-0000-0000-000000000014' and sort_order = 0 and season = '2009-2010' and club = 'Lille';
  if n <> 1 then raise exception 'Eden Hazard: the path no longer opens at 2009-2010 Lille'; end if;
  select count(*) into n from public.career_seasons where player_id = 'a0000001-0000-0000-0000-000000000014' and (season, club) in (('2007-2008', 'Lille'), ('2008-2009', 'Lille'));
  if n <> 0 then raise exception 'Eden Hazard: % of the rows to add are already there', n; end if;
  update public.career_seasons set sort_order = sort_order + 2 where player_id = 'a0000001-0000-0000-0000-000000000014';
  insert into public.career_seasons (player_id, season, club, goals, assists, appearances, market_value, sort_order) values
    ('a0000001-0000-0000-0000-000000000014', '2007-2008', 'Lille', 0, null, 4, 0, 0),
    ('a0000001-0000-0000-0000-000000000014', '2008-2009', 'Lille', 6, null, 35, 0, 1);

  -- Florian Wirtz: 2019-2020 Bayer Leverkusen before 2020-2021 Bayer Leverkusen
  select count(*) into n from public.career_players where id = 'a0000001-0000-0000-0000-000000000056' and player_name = 'Florian Wirtz';
  if n <> 1 then raise exception 'Florian Wirtz: expected one career_players row at a0000001-0000-0000-0000-000000000056, found %', n; end if;
  select count(*) into n from public.career_seasons where player_id = 'a0000001-0000-0000-0000-000000000056';
  if n <> 5 then raise exception 'Florian Wirtz: expected 5 season rows, found %', n; end if;
  select count(*) into n from public.career_seasons where player_id = 'a0000001-0000-0000-0000-000000000056' and sort_order = 0 and season = '2020-2021' and club = 'Bayer Leverkusen';
  if n <> 1 then raise exception 'Florian Wirtz: the path no longer opens at 2020-2021 Bayer Leverkusen'; end if;
  select count(*) into n from public.career_seasons where player_id = 'a0000001-0000-0000-0000-000000000056' and (season, club) in (('2019-2020', 'Bayer Leverkusen'));
  if n <> 0 then raise exception 'Florian Wirtz: % of the rows to add are already there', n; end if;
  update public.career_seasons set sort_order = sort_order + 1 where player_id = 'a0000001-0000-0000-0000-000000000056';
  insert into public.career_seasons (player_id, season, club, goals, assists, appearances, market_value, sort_order) values
    ('a0000001-0000-0000-0000-000000000056', '2019-2020', 'Bayer Leverkusen', 1, null, 9, 0, 0);

  -- Jamal Musiala: 2019-2020 Bayern Munich before 2020-2021 Bayern Munich
  select count(*) into n from public.career_players where id = 'a0000001-0000-0000-0000-000000000055' and player_name = 'Jamal Musiala';
  if n <> 1 then raise exception 'Jamal Musiala: expected one career_players row at a0000001-0000-0000-0000-000000000055, found %', n; end if;
  select count(*) into n from public.career_seasons where player_id = 'a0000001-0000-0000-0000-000000000055';
  if n <> 5 then raise exception 'Jamal Musiala: expected 5 season rows, found %', n; end if;
  select count(*) into n from public.career_seasons where player_id = 'a0000001-0000-0000-0000-000000000055' and sort_order = 0 and season = '2020-2021' and club = 'Bayern Munich';
  if n <> 1 then raise exception 'Jamal Musiala: the path no longer opens at 2020-2021 Bayern Munich'; end if;
  select count(*) into n from public.career_seasons where player_id = 'a0000001-0000-0000-0000-000000000055' and (season, club) in (('2019-2020', 'Bayern Munich'));
  if n <> 0 then raise exception 'Jamal Musiala: % of the rows to add are already there', n; end if;
  update public.career_seasons set sort_order = sort_order + 1 where player_id = 'a0000001-0000-0000-0000-000000000055';
  insert into public.career_seasons (player_id, season, club, goals, assists, appearances, market_value, sort_order) values
    ('a0000001-0000-0000-0000-000000000055', '2019-2020', 'Bayern Munich', 0, null, 1, 0, 0);

  -- Raheem Sterling: 2011-2012 Liverpool before 2012-2013 Liverpool
  select count(*) into n from public.career_players where id = 'a0000001-0000-0000-0000-000000000073' and player_name = 'Raheem Sterling';
  if n <> 1 then raise exception 'Raheem Sterling: expected one career_players row at a0000001-0000-0000-0000-000000000073, found %', n; end if;
  select count(*) into n from public.career_seasons where player_id = 'a0000001-0000-0000-0000-000000000073';
  if n <> 13 then raise exception 'Raheem Sterling: expected 13 season rows, found %', n; end if;
  select count(*) into n from public.career_seasons where player_id = 'a0000001-0000-0000-0000-000000000073' and sort_order = 0 and season = '2012-2013' and club = 'Liverpool';
  if n <> 1 then raise exception 'Raheem Sterling: the path no longer opens at 2012-2013 Liverpool'; end if;
  select count(*) into n from public.career_seasons where player_id = 'a0000001-0000-0000-0000-000000000073' and (season, club) in (('2011-2012', 'Liverpool'));
  if n <> 0 then raise exception 'Raheem Sterling: % of the rows to add are already there', n; end if;
  update public.career_seasons set sort_order = sort_order + 1 where player_id = 'a0000001-0000-0000-0000-000000000073';
  insert into public.career_seasons (player_id, season, club, goals, assists, appearances, market_value, sort_order) values
    ('a0000001-0000-0000-0000-000000000073', '2011-2012', 'Liverpool', 0, null, 3, 0, 0);

  -- Rodri: 2015-2016 Villarreal before 2016-2017 Villarreal
  select count(*) into n from public.career_players where id = 'a0000001-0000-0000-0000-000000000033' and player_name = 'Rodri';
  if n <> 1 then raise exception 'Rodri: expected one career_players row at a0000001-0000-0000-0000-000000000033, found %', n; end if;
  select count(*) into n from public.career_seasons where player_id = 'a0000001-0000-0000-0000-000000000033';
  if n <> 9 then raise exception 'Rodri: expected 9 season rows, found %', n; end if;
  select count(*) into n from public.career_seasons where player_id = 'a0000001-0000-0000-0000-000000000033' and sort_order = 0 and season = '2016-2017' and club = 'Villarreal';
  if n <> 1 then raise exception 'Rodri: the path no longer opens at 2016-2017 Villarreal'; end if;
  select count(*) into n from public.career_seasons where player_id = 'a0000001-0000-0000-0000-000000000033' and (season, club) in (('2015-2016', 'Villarreal'));
  if n <> 0 then raise exception 'Rodri: % of the rows to add are already there', n; end if;
  update public.career_seasons set sort_order = sort_order + 1 where player_id = 'a0000001-0000-0000-0000-000000000033';
  insert into public.career_seasons (player_id, season, club, goals, assists, appearances, market_value, sort_order) values
    ('a0000001-0000-0000-0000-000000000033', '2015-2016', 'Villarreal', 0, null, 6, 0, 0);

  -- Declan Rice: 2016-2017 West Ham before 2017-2018 West Ham
  select count(*) into n from public.career_players where id = 'a0000001-0000-0000-0000-000000000032' and player_name = 'Declan Rice';
  if n <> 1 then raise exception 'Declan Rice: expected one career_players row at a0000001-0000-0000-0000-000000000032, found %', n; end if;
  select count(*) into n from public.career_seasons where player_id = 'a0000001-0000-0000-0000-000000000032';
  if n <> 8 then raise exception 'Declan Rice: expected 8 season rows, found %', n; end if;
  select count(*) into n from public.career_seasons where player_id = 'a0000001-0000-0000-0000-000000000032' and sort_order = 0 and season = '2017-2018' and club = 'West Ham';
  if n <> 1 then raise exception 'Declan Rice: the path no longer opens at 2017-2018 West Ham'; end if;
  select count(*) into n from public.career_seasons where player_id = 'a0000001-0000-0000-0000-000000000032' and (season, club) in (('2016-2017', 'West Ham'));
  if n <> 0 then raise exception 'Declan Rice: % of the rows to add are already there', n; end if;
  update public.career_seasons set sort_order = sort_order + 1 where player_id = 'a0000001-0000-0000-0000-000000000032';
  insert into public.career_seasons (player_id, season, club, goals, assists, appearances, market_value, sort_order) values
    ('a0000001-0000-0000-0000-000000000032', '2016-2017', 'West Ham', 0, null, 1, 0, 0);

  -- Alisson: 2016 Internacional appearances 28 to 20
  select count(*) into n from public.career_seasons where player_id = 'a0000001-0000-0000-0000-000000000040' and season = '2016' and club = 'Internacional' and appearances = 28;
  if n <> 1 then raise exception 'Alisson: 2016 Internacional does not carry 28 appearances as expected'; end if;
  update public.career_seasons set appearances = 20 where player_id = 'a0000001-0000-0000-0000-000000000040' and season = '2016' and club = 'Internacional' and appearances = 28;

  -- Alisson Becker: 2016 Internacional appearances 28 to 20
  select count(*) into n from public.career_seasons where player_id = 'a0000001-0000-0000-0000-000000000066' and season = '2016' and club = 'Internacional' and appearances = 28;
  if n <> 1 then raise exception 'Alisson Becker: 2016 Internacional does not carry 28 appearances as expected'; end if;
  update public.career_seasons set appearances = 20 where player_id = 'a0000001-0000-0000-0000-000000000066' and season = '2016' and club = 'Internacional' and appearances = 28;

  select count(*) into n from public.career_seasons;
  if n <> 3640 then raise exception 'expected 3640 career_seasons rows after this migration, found %', n; end if;
end
$migration$;
