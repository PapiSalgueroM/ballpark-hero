-- Round 734: f1_driver_standings verified row by row. NOT APPLIED. Apply only by hand after review.
--
-- Every one of the 3,095 rows was read on 2026-09-30 through the Supabase MCP and checked against
-- formula1.com (official results archive) and the Jolpica F1 API (the documented dataset the table
-- was imported from); ESPN and Motor Sport magazine's database settled each disagreement. The full
-- record, one entry per row with its sources, is scripts/data/f1ChampionsVerified2026-09.json and
-- scripts/simF1Champions.mjs holds this file to it.
--
-- Changes (19 field changes on 18 rows, plus 11 inserted rows, no deletes):
--   1950 id 2 fangio: driver_name "Juan Fangio" to "Juan Manuel Fangio". Sources: https://www.formula1.com/en/results/1950/drivers and https://www.motorsportmagazine.com/database/championships/1950-f1-world-championship/
--   1951 id 82 fangio: driver_name "Juan Fangio" to "Juan Manuel Fangio". Sources: https://www.formula1.com/en/results/1951/drivers and https://www.motorsportmagazine.com/database/championships/1951-f1-world-championship/
--   1953 id 267 fangio: driver_name "Juan Fangio" to "Juan Manuel Fangio". Sources: https://www.formula1.com/en/results/1953/drivers and https://www.motorsportmagazine.com/database/championships/1953-f1-world-championship/
--   1953 id 267 fangio: points 28 to 27.5. Sources: https://www.formula1.com/en/results/1953/drivers and https://www.motorsportmagazine.com/database/championships/1953-f1-world-championship/
--   1954 id 366 fangio: driver_name "Juan Fangio" to "Juan Manuel Fangio". Sources: https://www.formula1.com/en/results/1954/drivers and https://www.motorsportmagazine.com/database/championships/1954-f1-world-championship/
--   1955 id 462 fangio: driver_name "Juan Fangio" to "Juan Manuel Fangio". Sources: https://www.formula1.com/en/results/1955/drivers and https://www.motorsportmagazine.com/database/championships/1955-f1-world-championship/
--   1955 id 465 trintignant: points 10 to 11.33. Sources: https://www.formula1.com/en/results/1955/drivers and https://www.motorsportmagazine.com/database/championships/1955-f1-world-championship/
--   1955 id 466 farina: points 9 to 10.33. Sources: https://www.formula1.com/en/results/1955/drivers and https://www.motorsportmagazine.com/database/championships/1955-f1-world-championship/
--   1956 id 545 fangio: driver_name "Juan Fangio" to "Juan Manuel Fangio". Sources: https://www.formula1.com/en/results/1956/drivers and https://www.motorsportmagazine.com/database/championships/1956-f1-world-championship/
--   1957 id 630 fangio: driver_name "Juan Fangio" to "Juan Manuel Fangio". Sources: https://www.formula1.com/en/results/1957/drivers and https://www.motorsportmagazine.com/database/championships/1957-f1-world-championship/
--   1958 id 719 fangio: driver_name "Juan Fangio" to "Juan Manuel Fangio". Sources: https://www.formula1.com/en/results/1958/drivers and https://www.motorsportmagazine.com/database/championships/1958-f1-world-championship/
--   1967 id 1242 jack_brabham: points 48 to 46. Sources: https://www.formula1.com/en/results/1967/drivers and https://www.espn.com/f1/standings/_/season/1967
--   1976 id 1637 hunt: points 66 to 69. Sources: https://www.formula1.com/en/results/1976/drivers and https://api.jolpi.ca/ergast/f1/1976/driverstandings.json
--   1976 id 1638 lauda: points 64 to 68. Sources: https://www.formula1.com/en/results/1976/drivers and https://api.jolpi.ca/ergast/f1/1976/driverstandings.json
--   1976 id 1639 scheckter: points 48 to 49. Sources: https://www.formula1.com/en/results/1976/drivers and https://api.jolpi.ca/ergast/f1/1976/driverstandings.json
--   1977 id 1684 lauda: points 70 to 72. Sources: https://www.formula1.com/en/results/1977/drivers and https://www.espn.com/f1/standings/_/season/1977
--   1977 id 1687 reutemann: points 41 to 42. Sources: https://www.formula1.com/en/results/1977/drivers and https://www.espn.com/f1/standings/_/season/1977
--   2013 id 2825 garde: position 21 to 22. Sources: https://www.formula1.com/en/results/2013/drivers and https://www.espn.com/f1/standings/_/season/2013
--   2013 id 2826 kovalainen: position 22 to 21. Sources: https://www.formula1.com/en/results/2013/drivers and https://www.espn.com/f1/standings/_/season/2013
--   1952 insert miller (Chet Miller, Kurtis Kraft), unranked on 0 points. Sources: https://www.formula1.com/en/results/1952/races/110/indianapolis/race-result and https://api.jolpi.ca/ergast/f1/1952/driverstandings.json
--   1952 insert ball (Bobby Ball, Stevens), unranked on 0 points. Sources: https://www.formula1.com/en/results/1952/races/110/indianapolis/race-result and https://api.jolpi.ca/ergast/f1/1952/driverstandings.json
--   1952 insert linden (Andy Linden, Kurtis Kraft), unranked on 0 points. Sources: https://www.formula1.com/en/results/1952/races/110/indianapolis/race-result and https://api.jolpi.ca/ergast/f1/1952/driverstandings.json
--   1953 insert crook (Tony Crook, Cooper), unranked on 0 points. Sources: https://www.formula1.com/en/results/1953/races/122/great-britain/race-result and https://api.jolpi.ca/ergast/f1/1953/driverstandings.json
--   1953 insert fitzau (Theo Fitzau, AFM), unranked on 0 points. Sources: https://www.formula1.com/en/results/1953/races/123/germany/race-result and https://api.jolpi.ca/ergast/f1/1953/driverstandings.json
--   1953 insert adolff (Kurt Adolff, Ferrari), unranked on 0 points. Sources: https://www.formula1.com/en/results/1953/races/123/germany/race-result and https://api.jolpi.ca/ergast/f1/1953/driverstandings.json
--   1953 insert fitch (John Fitch, HWM), unranked on 0 points. Sources: https://www.formula1.com/en/results/1953/races/125/italy/race-result and https://api.jolpi.ca/ergast/f1/1953/driverstandings.json
--   1953 insert bechem (Günther Bechem, AFM), unranked on 0 points. Sources: https://www.formula1.com/en/results/1953/races/123/germany/race-result and https://api.jolpi.ca/ergast/f1/1953/driverstandings.json
--   1953 insert niday (Cal Niday, Kurtis Kraft), unranked on 0 points. Sources: https://www.formula1.com/en/results/1953/races/118/indianapolis/race-result and https://api.jolpi.ca/ergast/f1/1953/driverstandings.json
--   1953 insert bauer (Erwin Bauer, Veritas), unranked on 0 points. Sources: https://www.formula1.com/en/results/1953/races/123/germany/race-result and https://api.jolpi.ca/ergast/f1/1953/driverstandings.json
--   1953 insert loof (Ernst Loof, Veritas), unranked on 0 points. Sources: https://www.formula1.com/en/results/1953/races/123/germany/race-result and https://api.jolpi.ca/ergast/f1/1953/driverstandings.json
--
-- Why: 1976 held the standings before the last race was counted (Hunt 66, Lauda 64, Scheckter 48);
-- 1953, 1955, 1967 and 1977 hold Jolpica values that formula1.com and a third source both contradict;
-- the champion of 1951 and 1954 to 1957 was shown as "Juan Fangio"; 2013 ordered two scoreless drivers
-- the opposite way from all three other sources; and the import read only the first 100 rows of
-- 1952 and 1953, so 11 scoreless starters were missing.
--
-- Fail closed. Every season this touches must still fingerprint exactly as it did when it was read
-- (the md5 of its rows, the same digest the record keeps), every update names the row by id and by
-- the old value and must hit exactly one row, and each touched season must fingerprint as the
-- record's end state afterwards. Any miss raises, and the whole block changes nothing.

do $migration$
declare
  n integer;
  h text;
begin
  -- 1. the table is still as read on 2026-09-30
  select md5(string_agg(r, E'\n' order by md5(r))) into h from (select concat_ws('|', driver_id, driver_name, constructor_id, constructor_name, coalesce(position::text, '-'), points::text, wins::text) as r from public.f1_driver_standings where season = 1950) s;
  if h is distinct from 'd79dc4b860558f70a0c88ef73d1eee9c' then raise exception 'Round 734: season 1950 moved since it was read on 2026-09-30 (fingerprint %). Nothing was changed.', h; end if;
  select md5(string_agg(r, E'\n' order by md5(r))) into h from (select concat_ws('|', driver_id, driver_name, constructor_id, constructor_name, coalesce(position::text, '-'), points::text, wins::text) as r from public.f1_driver_standings where season = 1951) s;
  if h is distinct from '7c3d65a14d88d40c633ae968bd6240d9' then raise exception 'Round 734: season 1951 moved since it was read on 2026-09-30 (fingerprint %). Nothing was changed.', h; end if;
  select md5(string_agg(r, E'\n' order by md5(r))) into h from (select concat_ws('|', driver_id, driver_name, constructor_id, constructor_name, coalesce(position::text, '-'), points::text, wins::text) as r from public.f1_driver_standings where season = 1952) s;
  if h is distinct from '4d86389ce97fd2288d36e7c45709df6f' then raise exception 'Round 734: season 1952 moved since it was read on 2026-09-30 (fingerprint %). Nothing was changed.', h; end if;
  select md5(string_agg(r, E'\n' order by md5(r))) into h from (select concat_ws('|', driver_id, driver_name, constructor_id, constructor_name, coalesce(position::text, '-'), points::text, wins::text) as r from public.f1_driver_standings where season = 1953) s;
  if h is distinct from '3bdaf6f91fce957670f09bb729ddf52e' then raise exception 'Round 734: season 1953 moved since it was read on 2026-09-30 (fingerprint %). Nothing was changed.', h; end if;
  select md5(string_agg(r, E'\n' order by md5(r))) into h from (select concat_ws('|', driver_id, driver_name, constructor_id, constructor_name, coalesce(position::text, '-'), points::text, wins::text) as r from public.f1_driver_standings where season = 1954) s;
  if h is distinct from 'ee95e1c4181e892bd94ecd6b97f164a6' then raise exception 'Round 734: season 1954 moved since it was read on 2026-09-30 (fingerprint %). Nothing was changed.', h; end if;
  select md5(string_agg(r, E'\n' order by md5(r))) into h from (select concat_ws('|', driver_id, driver_name, constructor_id, constructor_name, coalesce(position::text, '-'), points::text, wins::text) as r from public.f1_driver_standings where season = 1955) s;
  if h is distinct from 'e52a44350da9e2808c667376f1cf3a9c' then raise exception 'Round 734: season 1955 moved since it was read on 2026-09-30 (fingerprint %). Nothing was changed.', h; end if;
  select md5(string_agg(r, E'\n' order by md5(r))) into h from (select concat_ws('|', driver_id, driver_name, constructor_id, constructor_name, coalesce(position::text, '-'), points::text, wins::text) as r from public.f1_driver_standings where season = 1956) s;
  if h is distinct from '11f63ba6fa187e72b1a23afbe80c6ab9' then raise exception 'Round 734: season 1956 moved since it was read on 2026-09-30 (fingerprint %). Nothing was changed.', h; end if;
  select md5(string_agg(r, E'\n' order by md5(r))) into h from (select concat_ws('|', driver_id, driver_name, constructor_id, constructor_name, coalesce(position::text, '-'), points::text, wins::text) as r from public.f1_driver_standings where season = 1957) s;
  if h is distinct from 'ed7d7d2e0217e14f79eab23e96de92dd' then raise exception 'Round 734: season 1957 moved since it was read on 2026-09-30 (fingerprint %). Nothing was changed.', h; end if;
  select md5(string_agg(r, E'\n' order by md5(r))) into h from (select concat_ws('|', driver_id, driver_name, constructor_id, constructor_name, coalesce(position::text, '-'), points::text, wins::text) as r from public.f1_driver_standings where season = 1958) s;
  if h is distinct from '4c5b0f286cf2f0c5b5965ff7273c6858' then raise exception 'Round 734: season 1958 moved since it was read on 2026-09-30 (fingerprint %). Nothing was changed.', h; end if;
  select md5(string_agg(r, E'\n' order by md5(r))) into h from (select concat_ws('|', driver_id, driver_name, constructor_id, constructor_name, coalesce(position::text, '-'), points::text, wins::text) as r from public.f1_driver_standings where season = 1967) s;
  if h is distinct from '81ec1396986bd634b85c8e9a412cca56' then raise exception 'Round 734: season 1967 moved since it was read on 2026-09-30 (fingerprint %). Nothing was changed.', h; end if;
  select md5(string_agg(r, E'\n' order by md5(r))) into h from (select concat_ws('|', driver_id, driver_name, constructor_id, constructor_name, coalesce(position::text, '-'), points::text, wins::text) as r from public.f1_driver_standings where season = 1976) s;
  if h is distinct from 'a937a34d80684c968e6cd1d3d3828c09' then raise exception 'Round 734: season 1976 moved since it was read on 2026-09-30 (fingerprint %). Nothing was changed.', h; end if;
  select md5(string_agg(r, E'\n' order by md5(r))) into h from (select concat_ws('|', driver_id, driver_name, constructor_id, constructor_name, coalesce(position::text, '-'), points::text, wins::text) as r from public.f1_driver_standings where season = 1977) s;
  if h is distinct from 'ca45e07c2cfb0c3fa90846b3924448f8' then raise exception 'Round 734: season 1977 moved since it was read on 2026-09-30 (fingerprint %). Nothing was changed.', h; end if;
  select md5(string_agg(r, E'\n' order by md5(r))) into h from (select concat_ws('|', driver_id, driver_name, constructor_id, constructor_name, coalesce(position::text, '-'), points::text, wins::text) as r from public.f1_driver_standings where season = 2013) s;
  if h is distinct from 'c029e4ae02de3aef1e58d6f599430884' then raise exception 'Round 734: season 2013 moved since it was read on 2026-09-30 (fingerprint %). Nothing was changed.', h; end if;
  -- 2. corrections
  update public.f1_driver_standings set driver_name = 'Juan Manuel Fangio' where id = 2 and season = 1950 and driver_id = 'fangio' and driver_name = 'Juan Fangio';
  get diagnostics n = row_count; if n <> 1 then raise exception 'Round 734: row 2 (1950 fangio) was not as read. Nothing was changed.'; end if;
  update public.f1_driver_standings set driver_name = 'Juan Manuel Fangio' where id = 82 and season = 1951 and driver_id = 'fangio' and driver_name = 'Juan Fangio';
  get diagnostics n = row_count; if n <> 1 then raise exception 'Round 734: row 82 (1951 fangio) was not as read. Nothing was changed.'; end if;
  update public.f1_driver_standings set driver_name = 'Juan Manuel Fangio', points = 27.5 where id = 267 and season = 1953 and driver_id = 'fangio' and driver_name = 'Juan Fangio' and points = 28;
  get diagnostics n = row_count; if n <> 1 then raise exception 'Round 734: row 267 (1953 fangio) was not as read. Nothing was changed.'; end if;
  update public.f1_driver_standings set driver_name = 'Juan Manuel Fangio' where id = 366 and season = 1954 and driver_id = 'fangio' and driver_name = 'Juan Fangio';
  get diagnostics n = row_count; if n <> 1 then raise exception 'Round 734: row 366 (1954 fangio) was not as read. Nothing was changed.'; end if;
  update public.f1_driver_standings set driver_name = 'Juan Manuel Fangio' where id = 462 and season = 1955 and driver_id = 'fangio' and driver_name = 'Juan Fangio';
  get diagnostics n = row_count; if n <> 1 then raise exception 'Round 734: row 462 (1955 fangio) was not as read. Nothing was changed.'; end if;
  update public.f1_driver_standings set points = 11.33 where id = 465 and season = 1955 and driver_id = 'trintignant' and points = 10;
  get diagnostics n = row_count; if n <> 1 then raise exception 'Round 734: row 465 (1955 trintignant) was not as read. Nothing was changed.'; end if;
  update public.f1_driver_standings set points = 10.33 where id = 466 and season = 1955 and driver_id = 'farina' and points = 9;
  get diagnostics n = row_count; if n <> 1 then raise exception 'Round 734: row 466 (1955 farina) was not as read. Nothing was changed.'; end if;
  update public.f1_driver_standings set driver_name = 'Juan Manuel Fangio' where id = 545 and season = 1956 and driver_id = 'fangio' and driver_name = 'Juan Fangio';
  get diagnostics n = row_count; if n <> 1 then raise exception 'Round 734: row 545 (1956 fangio) was not as read. Nothing was changed.'; end if;
  update public.f1_driver_standings set driver_name = 'Juan Manuel Fangio' where id = 630 and season = 1957 and driver_id = 'fangio' and driver_name = 'Juan Fangio';
  get diagnostics n = row_count; if n <> 1 then raise exception 'Round 734: row 630 (1957 fangio) was not as read. Nothing was changed.'; end if;
  update public.f1_driver_standings set driver_name = 'Juan Manuel Fangio' where id = 719 and season = 1958 and driver_id = 'fangio' and driver_name = 'Juan Fangio';
  get diagnostics n = row_count; if n <> 1 then raise exception 'Round 734: row 719 (1958 fangio) was not as read. Nothing was changed.'; end if;
  update public.f1_driver_standings set points = 46 where id = 1242 and season = 1967 and driver_id = 'jack_brabham' and points = 48;
  get diagnostics n = row_count; if n <> 1 then raise exception 'Round 734: row 1242 (1967 jack_brabham) was not as read. Nothing was changed.'; end if;
  update public.f1_driver_standings set points = 69 where id = 1637 and season = 1976 and driver_id = 'hunt' and points = 66;
  get diagnostics n = row_count; if n <> 1 then raise exception 'Round 734: row 1637 (1976 hunt) was not as read. Nothing was changed.'; end if;
  update public.f1_driver_standings set points = 68 where id = 1638 and season = 1976 and driver_id = 'lauda' and points = 64;
  get diagnostics n = row_count; if n <> 1 then raise exception 'Round 734: row 1638 (1976 lauda) was not as read. Nothing was changed.'; end if;
  update public.f1_driver_standings set points = 49 where id = 1639 and season = 1976 and driver_id = 'scheckter' and points = 48;
  get diagnostics n = row_count; if n <> 1 then raise exception 'Round 734: row 1639 (1976 scheckter) was not as read. Nothing was changed.'; end if;
  update public.f1_driver_standings set points = 72 where id = 1684 and season = 1977 and driver_id = 'lauda' and points = 70;
  get diagnostics n = row_count; if n <> 1 then raise exception 'Round 734: row 1684 (1977 lauda) was not as read. Nothing was changed.'; end if;
  update public.f1_driver_standings set points = 42 where id = 1687 and season = 1977 and driver_id = 'reutemann' and points = 41;
  get diagnostics n = row_count; if n <> 1 then raise exception 'Round 734: row 1687 (1977 reutemann) was not as read. Nothing was changed.'; end if;
  update public.f1_driver_standings set position = 22 where id = 2825 and season = 2013 and driver_id = 'garde' and position = 21;
  get diagnostics n = row_count; if n <> 1 then raise exception 'Round 734: row 2825 (2013 garde) was not as read. Nothing was changed.'; end if;
  update public.f1_driver_standings set position = 21 where id = 2826 and season = 2013 and driver_id = 'kovalainen' and position = 22;
  get diagnostics n = row_count; if n <> 1 then raise exception 'Round 734: row 2826 (2013 kovalainen) was not as read. Nothing was changed.'; end if;
  -- 3. the rows the import cut off
  insert into public.f1_driver_standings (season, position, points, wins, driver_id, driver_name, constructor_id, constructor_name) values (1952, null, 0, 0, 'miller', 'Chet Miller', 'kurtis_kraft', 'Kurtis Kraft');
  get diagnostics n = row_count; if n <> 1 then raise exception 'Round 734: insert of 1952 miller failed. Nothing was changed.'; end if;
  insert into public.f1_driver_standings (season, position, points, wins, driver_id, driver_name, constructor_id, constructor_name) values (1952, null, 0, 0, 'ball', 'Bobby Ball', 'stevens', 'Stevens');
  get diagnostics n = row_count; if n <> 1 then raise exception 'Round 734: insert of 1952 ball failed. Nothing was changed.'; end if;
  insert into public.f1_driver_standings (season, position, points, wins, driver_id, driver_name, constructor_id, constructor_name) values (1952, null, 0, 0, 'linden', 'Andy Linden', 'kurtis_kraft', 'Kurtis Kraft');
  get diagnostics n = row_count; if n <> 1 then raise exception 'Round 734: insert of 1952 linden failed. Nothing was changed.'; end if;
  insert into public.f1_driver_standings (season, position, points, wins, driver_id, driver_name, constructor_id, constructor_name) values (1953, null, 0, 0, 'crook', 'Tony Crook', 'cooper', 'Cooper');
  get diagnostics n = row_count; if n <> 1 then raise exception 'Round 734: insert of 1953 crook failed. Nothing was changed.'; end if;
  insert into public.f1_driver_standings (season, position, points, wins, driver_id, driver_name, constructor_id, constructor_name) values (1953, null, 0, 0, 'fitzau', 'Theo Fitzau', 'afm', 'AFM');
  get diagnostics n = row_count; if n <> 1 then raise exception 'Round 734: insert of 1953 fitzau failed. Nothing was changed.'; end if;
  insert into public.f1_driver_standings (season, position, points, wins, driver_id, driver_name, constructor_id, constructor_name) values (1953, null, 0, 0, 'adolff', 'Kurt Adolff', 'ferrari', 'Ferrari');
  get diagnostics n = row_count; if n <> 1 then raise exception 'Round 734: insert of 1953 adolff failed. Nothing was changed.'; end if;
  insert into public.f1_driver_standings (season, position, points, wins, driver_id, driver_name, constructor_id, constructor_name) values (1953, null, 0, 0, 'fitch', 'John Fitch', 'hwm', 'HWM');
  get diagnostics n = row_count; if n <> 1 then raise exception 'Round 734: insert of 1953 fitch failed. Nothing was changed.'; end if;
  insert into public.f1_driver_standings (season, position, points, wins, driver_id, driver_name, constructor_id, constructor_name) values (1953, null, 0, 0, 'bechem', U&'G\00FCnther Bechem', 'afm', 'AFM');
  get diagnostics n = row_count; if n <> 1 then raise exception 'Round 734: insert of 1953 bechem failed. Nothing was changed.'; end if;
  insert into public.f1_driver_standings (season, position, points, wins, driver_id, driver_name, constructor_id, constructor_name) values (1953, null, 0, 0, 'niday', 'Cal Niday', 'kurtis_kraft', 'Kurtis Kraft');
  get diagnostics n = row_count; if n <> 1 then raise exception 'Round 734: insert of 1953 niday failed. Nothing was changed.'; end if;
  insert into public.f1_driver_standings (season, position, points, wins, driver_id, driver_name, constructor_id, constructor_name) values (1953, null, 0, 0, 'bauer', 'Erwin Bauer', 'veritas', 'Veritas');
  get diagnostics n = row_count; if n <> 1 then raise exception 'Round 734: insert of 1953 bauer failed. Nothing was changed.'; end if;
  insert into public.f1_driver_standings (season, position, points, wins, driver_id, driver_name, constructor_id, constructor_name) values (1953, null, 0, 0, 'loof', 'Ernst Loof', 'veritas', 'Veritas');
  get diagnostics n = row_count; if n <> 1 then raise exception 'Round 734: insert of 1953 loof failed. Nothing was changed.'; end if;
  -- 4. the end state is the record's
  select md5(string_agg(r, E'\n' order by md5(r))) into h from (select concat_ws('|', driver_id, driver_name, constructor_id, constructor_name, coalesce(position::text, '-'), points::text, wins::text) as r from public.f1_driver_standings where season = 1950) s;
  if h is distinct from '9c8f5854ef39a8b400ecedff92d18819' then raise exception 'Round 734: season 1950 did not land on the recorded end state (fingerprint %). Nothing was changed.', h; end if;
  select md5(string_agg(r, E'\n' order by md5(r))) into h from (select concat_ws('|', driver_id, driver_name, constructor_id, constructor_name, coalesce(position::text, '-'), points::text, wins::text) as r from public.f1_driver_standings where season = 1951) s;
  if h is distinct from 'ac286a3e3b392875a59e5c2ce3844453' then raise exception 'Round 734: season 1951 did not land on the recorded end state (fingerprint %). Nothing was changed.', h; end if;
  select md5(string_agg(r, E'\n' order by md5(r))) into h from (select concat_ws('|', driver_id, driver_name, constructor_id, constructor_name, coalesce(position::text, '-'), points::text, wins::text) as r from public.f1_driver_standings where season = 1952) s;
  if h is distinct from '4914366be1cb2f4c14d230117ce04d64' then raise exception 'Round 734: season 1952 did not land on the recorded end state (fingerprint %). Nothing was changed.', h; end if;
  select md5(string_agg(r, E'\n' order by md5(r))) into h from (select concat_ws('|', driver_id, driver_name, constructor_id, constructor_name, coalesce(position::text, '-'), points::text, wins::text) as r from public.f1_driver_standings where season = 1953) s;
  if h is distinct from '84d55a05fa8701e470390cf6190b373e' then raise exception 'Round 734: season 1953 did not land on the recorded end state (fingerprint %). Nothing was changed.', h; end if;
  select md5(string_agg(r, E'\n' order by md5(r))) into h from (select concat_ws('|', driver_id, driver_name, constructor_id, constructor_name, coalesce(position::text, '-'), points::text, wins::text) as r from public.f1_driver_standings where season = 1954) s;
  if h is distinct from '7c5dc9cdf54ea3f8fbe89803698bed2d' then raise exception 'Round 734: season 1954 did not land on the recorded end state (fingerprint %). Nothing was changed.', h; end if;
  select md5(string_agg(r, E'\n' order by md5(r))) into h from (select concat_ws('|', driver_id, driver_name, constructor_id, constructor_name, coalesce(position::text, '-'), points::text, wins::text) as r from public.f1_driver_standings where season = 1955) s;
  if h is distinct from '25177a4823fc3f9e93c82d7f675bb80f' then raise exception 'Round 734: season 1955 did not land on the recorded end state (fingerprint %). Nothing was changed.', h; end if;
  select md5(string_agg(r, E'\n' order by md5(r))) into h from (select concat_ws('|', driver_id, driver_name, constructor_id, constructor_name, coalesce(position::text, '-'), points::text, wins::text) as r from public.f1_driver_standings where season = 1956) s;
  if h is distinct from 'c092425dc5f20d9687a78fbcb0c1fc23' then raise exception 'Round 734: season 1956 did not land on the recorded end state (fingerprint %). Nothing was changed.', h; end if;
  select md5(string_agg(r, E'\n' order by md5(r))) into h from (select concat_ws('|', driver_id, driver_name, constructor_id, constructor_name, coalesce(position::text, '-'), points::text, wins::text) as r from public.f1_driver_standings where season = 1957) s;
  if h is distinct from '6c0928f3307959fa01d47e434c241f73' then raise exception 'Round 734: season 1957 did not land on the recorded end state (fingerprint %). Nothing was changed.', h; end if;
  select md5(string_agg(r, E'\n' order by md5(r))) into h from (select concat_ws('|', driver_id, driver_name, constructor_id, constructor_name, coalesce(position::text, '-'), points::text, wins::text) as r from public.f1_driver_standings where season = 1958) s;
  if h is distinct from '09b4a172e4c81ce365bec5bf4a4a265d' then raise exception 'Round 734: season 1958 did not land on the recorded end state (fingerprint %). Nothing was changed.', h; end if;
  select md5(string_agg(r, E'\n' order by md5(r))) into h from (select concat_ws('|', driver_id, driver_name, constructor_id, constructor_name, coalesce(position::text, '-'), points::text, wins::text) as r from public.f1_driver_standings where season = 1967) s;
  if h is distinct from 'c73c716a834ab86cd76b2064d946ff0d' then raise exception 'Round 734: season 1967 did not land on the recorded end state (fingerprint %). Nothing was changed.', h; end if;
  select md5(string_agg(r, E'\n' order by md5(r))) into h from (select concat_ws('|', driver_id, driver_name, constructor_id, constructor_name, coalesce(position::text, '-'), points::text, wins::text) as r from public.f1_driver_standings where season = 1976) s;
  if h is distinct from 'ac838ffa5866a98de7998a9e130525d5' then raise exception 'Round 734: season 1976 did not land on the recorded end state (fingerprint %). Nothing was changed.', h; end if;
  select md5(string_agg(r, E'\n' order by md5(r))) into h from (select concat_ws('|', driver_id, driver_name, constructor_id, constructor_name, coalesce(position::text, '-'), points::text, wins::text) as r from public.f1_driver_standings where season = 1977) s;
  if h is distinct from '3d63f6de7f1e5be3797bb3ade8a9826f' then raise exception 'Round 734: season 1977 did not land on the recorded end state (fingerprint %). Nothing was changed.', h; end if;
  select md5(string_agg(r, E'\n' order by md5(r))) into h from (select concat_ws('|', driver_id, driver_name, constructor_id, constructor_name, coalesce(position::text, '-'), points::text, wins::text) as r from public.f1_driver_standings where season = 2013) s;
  if h is distinct from '252583f2b6a2167b179bc15b40daf3cf' then raise exception 'Round 734: season 2013 did not land on the recorded end state (fingerprint %). Nothing was changed.', h; end if;
end
$migration$;
