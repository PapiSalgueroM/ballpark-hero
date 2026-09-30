-- Round 733 (2026-09-30): public.golf_majors verified row by row.
--
-- UNAPPLIED. Written for review; the lead applies it. Nothing here was run on the
-- live database: the table was only read, with SELECT (the Supabase MCP on the check
-- date, and again through the public REST endpoint during the fix: 526 rows, the
-- read hash reproduced). scripts/simGolfMajors.mjs replays every statement below on
-- the record's rows with the predicates as written here and requires the result to
-- be the record's end state, with the hash the last block expects, on every run.
--
-- WHAT IT DOES. The record is scripts/data/golfMajorsVerified2026-09.json: every
-- one of the 526 rows read, with its verified value, two source URLs and the
-- check date. scripts/simGolfMajors.mjs holds this file's end state to that record.
--   25 rows deleted. Each is a placeholder whose player is a single dash
--      character, standing for a year the championship was not played. Any count
--      of golfers counted the dash as one golfer with 25 majors. Both sources say
--      each of these years was not played:
--      Masters Tournament: 1943 (id 10), 1944 (id 11), 1945 (id 12).
--        sources: https://www.masters.com/en_US/news/articles/2019-04-09/when_war_interrupted.html and https://www.espn.com/golf/story/_/id/39894241/who-won-masters-all-augusta-winners-list
--      PGA Championship: 1917 (id 95), 1918 (id 96), 1943 (id 121).
--        sources: https://www.pgachampionship.com/news-media/articles/pga-championship-winners-venues and https://www.espn.com/golf/story/_/id/45126481/who-won-pga-championship-all-winners-list
--      U.S. Open (golf): 1917 (id 227), 1918 (id 228), 1942 (id 252), 1943 (id 253), 1944 (id 254), 1945 (id 255).
--        sources: https://www.usga.org/content/usga/home-page/media/online-media-center/usga-records/u-s--open-results--1895-to-present.html and https://www.espn.com/golf/story/_/id/40330713/who-won-us-open-winners-year-golf-major
--      The Open Championship: 1871 (id 347), 1915 (id 391), 1916 (id 392), 1917 (id 393), 1918 (id 394), 1919 (id 395), 1940 (id 416), 1941 (id 417), 1942 (id 418), 1943 (id 419), 1944 (id 420), 1945 (id 421), 2020 (id 496).
--        sources: https://www.theopen.com/latest/champion-golfers-list and https://www.espn.com/golf/story/_/id/45753605/who-won-open-championship-all-golf-champions
--   3 rows corrected. A double dagger footnote mark (chr(8225)), copied from a
--      scraped table where it marked an amateur, was part of the stored name:
--      id 223, 1913 U.S. Open (golf): "Francis Ouimet" plus the mark, becomes "Francis Ouimet".
--        sources: https://www.usga.org/content/usga/home-page/media/online-media-center/usga-records/u-s--open-results--1895-to-present.html and https://www.espn.com/golf/story/_/id/40330713/who-won-us-open-winners-year-golf-major (printed "a-Francis Ouimet" and "(a)-Francis Ouimet*")
--      id 233, 1923 U.S. Open (golf): "Bobby Jones" plus the mark, becomes "Bobby Jones".
--        sources: https://www.usga.org/content/usga/home-page/media/online-media-center/usga-records/u-s--open-results--1895-to-present.html and https://www.espn.com/golf/story/_/id/40330713/who-won-us-open-winners-year-golf-major (printed "a-Robert T. Jones Jr." and "(a)-Bob Jones*")
--      id 239, 1929 U.S. Open (golf): "Bobby Jones" plus the mark, becomes "Bobby Jones".
--        sources: https://www.usga.org/content/usga/home-page/media/online-media-center/usga-records/u-s--open-results--1895-to-present.html and https://www.espn.com/golf/story/_/id/40330713/who-won-us-open-winners-year-golf-major (printed "a-Robert T. Jones Jr." and "(a)-Bob Jones*")
--      With the mark, Bobby Jones was two people in the table (5 rows plain, 2 marked),
--      which is how src/data/golfLegends.ts once shipped him with 5 majors, not 7.
--   3 rows added: the 2026 champions the table was missing.
--      2026 U.S. Open (golf): Wyndham Clark (United States).
--        sources: https://www.usopen.com/2026/galleries/126th-us-open-photos-salute-champ-wyndham-clark.html and https://www.espn.com/golf/story/_/id/40330713/who-won-us-open-winners-year-golf-major
--        nationality: https://www.pgatour.com/article/news/daily-wrapup/2026/06/21/round-4-us-open-shinnecock-hills-2026-major-championship-scores-leaderboard-recap-wyndham-clark-scottie-scheffler and https://www.espn.com/golf/player/_/id/11119/wyndham-clark
--      2026 The Open Championship: Ryan Fox (New Zealand).
--        sources: https://www.theopen.com/latest/champion-golfers-list and https://www.espn.com/golf/story/_/id/45753605/who-won-open-championship-all-golf-champions
--        nationality: https://www.theopen.com/latest/ryan-fox-wins-the-open-day-four-report and https://www.espn.com/golf/story/_/id/49401078/ryan-fox-birdies-72nd-hole-capture-open-championship
--      2026 Women's British Open: Shiho Kuwaki (Japan).
--        sources: https://www.lpga.com/tournaments/aigwomensopen/past-winners and https://www.espn.com/golf/story/_/id/49513981/shiho-kuwaki-wins-women-british-open-second-playoff-hole
--        nationality: https://www.lpga.com/tournaments/aigwomensopen/past-winners and https://www.espn.com/golf/story/_/id/49513981/shiho-kuwaki-wins-women-british-open-second-playoff-hole
--      score and venue follow the column use of that championship's existing rows
--      (the course in score, the town in venue), copied from the last row the table
--      holds at the same course: id 328 (2018, Shinnecock Hills), id 493 (2017,
--      Royal Birkdale) and id 519 (2018, Royal Lytham). The record's filled entries
--      carry the copied values under copiedFrom. 'Southport , England' keeps its
--      stray space on purpose: all ten Open rows at Royal Birkdale store it that
--      way, and the fence fails if the INSERT and the record disagree. No game
--      reads either column.
--   498 rows verified and left as they are, the 2026 Masters (Rory McIlroy) and the
--      2026 PGA Championship (Aaron Rai) among them.
--
-- GUARDS. The first block raises unless the table holds exactly what Round 733
-- read: 526 rows whose id, year, tournament and player_name hash to the value below.
-- A row that moved since, or one added or removed, and nothing is written. The last
-- block raises unless the end state is exactly the record's: 504 rows whose year,
-- tournament and player_name hash to the record's end hash. Raising inside the
-- transaction rolls every statement back.
--
-- APPLY. Run the whole file, its own begin and commit included, through the Supabase
-- MCP execute_sql. Then read select count(*) from public.golf_majors (expect 504) and
-- run node scripts/simGolfMajors.mjs and node scripts/simSportsFacts.mjs.

begin;

do $$
begin
  if (select count(*) from public.golf_majors) <> 526 then
    raise exception 'golf_majors no longer has the 526 rows Round 733 read; nothing written';
  end if;
  if (select md5(string_agg(id || '|' || year || '|' || tournament || '|' || player_name, E'\n' order by id)) from public.golf_majors)
     <> '4e5157a877017fa7283bc7389f619cf1' then
    raise exception 'golf_majors moved since Round 733 read it; nothing written';
  end if;
end $$;

delete from public.golf_majors where player_name = chr(8212) and id in (10, 11, 12, 95, 96, 121, 227, 228, 252, 253, 254, 255, 347, 391, 392, 393, 394, 395, 416, 417, 418, 419, 420, 421, 496);

update public.golf_majors set player_name = 'Francis Ouimet' where id in (223) and player_name = 'Francis Ouimet ' || chr(8225);
update public.golf_majors set player_name = 'Bobby Jones' where id in (233, 239) and player_name = 'Bobby Jones ' || chr(8225);

insert into public.golf_majors (year, tournament, tour, rank, player_name, nationality, score, venue) values
  (2026, 'U.S. Open (golf)', 'PGA', 1, 'Wyndham Clark', 'United States', 'Shinnecock Hills', 'Shinnecock Hills, New York'),
  (2026, 'The Open Championship', 'PGA', 1, 'Ryan Fox', 'New Zealand', 'Royal Birkdale', 'Southport , England'),
  (2026, 'Women''s British Open', 'LPGA', 1, 'Shiho Kuwaki', 'Japan', 'Royal Lytham & St Annes G.C.', 'Lytham St Annes');

do $$
begin
  if (select count(*) from public.golf_majors) <> 504 then
    raise exception 'golf_majors end state is not the 504 rows of the Round 733 record; rolled back';
  end if;
  if (select md5(string_agg(year || '|' || tournament || '|' || player_name, E'\n' order by tournament collate "C", year)) from public.golf_majors)
     <> '8a97bd0b4272f02a0581bafd2b6d552b' then
    raise exception 'golf_majors end state disagrees with the Round 733 record; rolled back';
  end if;
end $$;

commit;
