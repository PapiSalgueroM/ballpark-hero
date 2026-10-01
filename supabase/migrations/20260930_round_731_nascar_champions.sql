-- Round 731: public.nascar_champions verified row by row. UNAPPLIED.
--
-- Read with SELECT on 2026-09-30: 77 rows, one per Cup Series season from
-- 1949 to 2025, no duplicate year, no placeholder row, no missing season.
-- Every row was checked against nascar.com (champion, manufacturer, wins)
-- and Racing Reference (car owner, the make of every start, wins), with ESPN
-- for every champion's name and Fox Sports for every team. The full record,
-- two source URLs per row, is scripts/data/nascarChampionsVerified2026-09.json.
-- 71 rows were right as stored. This migration changes the other 6 and
-- nothing else. It inserts no row and deletes no row.
--
-- Shown fields (team is printed by the Guess The NASCAR Driver "Title car"
-- clue). None of these three drivers is in that game's pool today, so no
-- shipped clue changes:
--   1961 Ned Jarrett    team 'Bee Gee Holloway' -> 'B.G. Holloway'
--        Racing Reference https://www.racing-reference.info/driver-season-stats/jarrene01/1961/W
--        Fox Sports       https://www.foxsports.com/stories/nascar/nascar-champions-complete-list-winners-year
--   1968 David Pearson  team 'Holman Moody' -> 'Holman-Moody'
--        Racing Reference https://www.racing-reference.info/driver-season-stats/pearsda01/1968/W
--        Fox Sports       (same list as above)
--   1969 David Pearson  team 'Holman Moody' -> 'Holman-Moody'
--        Racing Reference https://www.racing-reference.info/driver-season-stats/pearsda01/1969/W
--        Fox Sports       (same list as above)
--
-- Not shown anywhere (no file in src, supabase or scripts reads
-- wins_that_season), but the table asserts it, so it was checked too. Where
-- the league's own list and the reference site disagree the number cannot be
-- called verified, so it becomes NULL rather than one side's guess:
--   1953 Herb Thomas    wins 11 -> NULL  (nascar.com 11, Racing Reference 12)
--   1959 Lee Petty      wins 10 -> NULL  (nascar.com 10, Racing Reference 11,
--                                          International Motorsports Hall of Fame 12)
--   1966 David Pearson  wins 14 -> NULL  (nascar.com 14, Racing Reference 15)
--        nascar.com       https://www.nascar.com/news-media/2020/08/13/all-time-nascar-cup-series-champions/
--        Racing Reference https://www.racing-reference.info/driver-season-stats/<driver>/<year>/W
--
-- Left alone on purpose: points is NULL on every row and read by nothing. The
-- table has no car number column. The team column mixes owner names (Rick
-- Hendrick) and team names (Team Penske); both are true of the same
-- organisation, so the stored form stays wherever it is true.
--
-- FAIL CLOSED. Nothing changes unless the whole table is still exactly the
-- 77 rows read on 2026-09-30 (an md5 over every column of every row, ordered
-- by year). Each update also names the old value it replaces and must hit
-- exactly one row, and the finished table must hash to the verified end
-- state. Any miss raises, and the block rolls back as a whole.
-- scripts/simNascarChampions.mjs checks both hashes against the record.

do $migration$
declare
  before_md5 constant text := '32408421179ab38fbec11829574354f2';
  after_md5 constant text := '93ab9ecb87af54a52d8aafc828887fe7';
  n integer;
  years integer;
  fp text;
begin
  lock table public.nascar_champions in share row exclusive mode;

  select count(*), count(distinct year) into n, years from public.nascar_champions;
  if n <> 77 or years <> 77 then
    raise exception 'Round 731: expected 77 rows over 77 seasons, found % rows over % seasons. Nothing was changed.', n, years;
  end if;

  select md5(string_agg(concat_ws('|', year::text, coalesce(driver_name, '~'), coalesce(team, '~'), coalesce(manufacturer, '~'), coalesce(wins_that_season::text, '~'), coalesce(points::text, '~')), E'\n' order by year))
    into fp from public.nascar_champions;
  if fp is distinct from before_md5 then
    raise exception 'Round 731: the table changed since it was read on 2026-09-30 (md5 % not %). Nothing was changed.', fp, before_md5;
  end if;

  update public.nascar_champions set team = 'B.G. Holloway' where year = 1961 and driver_name = 'Ned Jarrett' and team = 'Bee Gee Holloway';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'Round 731: 1961 team matched % rows, expected 1.', n; end if;

  update public.nascar_champions set team = 'Holman-Moody' where year = 1968 and driver_name = 'David Pearson' and team = 'Holman Moody';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'Round 731: 1968 team matched % rows, expected 1.', n; end if;

  update public.nascar_champions set team = 'Holman-Moody' where year = 1969 and driver_name = 'David Pearson' and team = 'Holman Moody';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'Round 731: 1969 team matched % rows, expected 1.', n; end if;

  update public.nascar_champions set wins_that_season = null where year = 1953 and driver_name = 'Herb Thomas' and wins_that_season = 11;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'Round 731: 1953 wins matched % rows, expected 1.', n; end if;

  update public.nascar_champions set wins_that_season = null where year = 1959 and driver_name = 'Lee Petty' and wins_that_season = 10;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'Round 731: 1959 wins matched % rows, expected 1.', n; end if;

  update public.nascar_champions set wins_that_season = null where year = 1966 and driver_name = 'David Pearson' and wins_that_season = 14;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'Round 731: 1966 wins matched % rows, expected 1.', n; end if;

  select md5(string_agg(concat_ws('|', year::text, coalesce(driver_name, '~'), coalesce(team, '~'), coalesce(manufacturer, '~'), coalesce(wins_that_season::text, '~'), coalesce(points::text, '~')), E'\n' order by year))
    into fp from public.nascar_champions;
  if fp is distinct from after_md5 then
    raise exception 'Round 731: the end state hashes to %, not the verified %. Rolled back.', fp, after_md5;
  end if;
end
$migration$;
