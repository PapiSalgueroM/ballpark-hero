-- Round 706: ncaa_player_stats, the players loaded twice and the placeholder names.
--
-- NOT APPLIED. Written 2026-09-30 from read only SELECTs; the desktop lane applies it through the
-- Supabase MCP. Fence: scripts/simCollegeTables.mjs reads the constants out of this block's code and
-- requires them to add up, runs both copies of the placeholder name rule over the three names step 2
-- deletes, and, when the host answers, requires the live row count to be the one this file was
-- measured at or the one it leaves. It does not pull the rows; the block's own checks do that.
--
-- No foreign key points at this table (checked in pg_constraint), so nothing is repointed.
--
-- STEP 1, PLAYERS LOADED TWICE. The natural key is player_slug (the source's own player id). 1,600
--   slugs hold exactly two rows, and every pair is identical in every column but id and created_at
--   (rk included; measured, and checked again below before anything is deleted). The lowest id stays.
--   Sample checks: Aamir McCleary keeps 22833 and loses 23233, Zion Williamson keeps 15491 and loses
--   16691, Bradley Beal keeps 22955 and loses 23355, Ignas Brazdeikis keeps 22887 and loses 23287.
--
-- STEP 2, PLACEHOLDER NAMES. Three rows carry "_" where the first name should be, because the source
--   never had it (their slugs are "_-johnston-3", "_-ford-4" and "_-eldredge-1" on the source site
--   itself, so that reference site cannot be the second source for a first name). None could be two
--   sourced, so they are deleted rather than guessed. Their rows, for anyone who can source them:
--     21867  _ Johnston   New Hampshire           1985-86 to 1986-87  56 games  578 points  G
--     32408  _ Ford       Maryland Eastern Shore  1988-89             25 games  324 points  no position
--     41595  _ Eldredge   Hofstra                 1991-92 to 1994-95  29 games  159 points  G
--   The site stopped offering them in search with Round 706's code (src/lib/placeholderName.ts).
--
-- WHAT THE GAMES SEE. The College Basketball Grid derives its school pool from this table: a school is
-- eligible when every achievement has at least 10 players there. Counted once each, UNC Greensboro,
-- Marshall and Rutgers fall below 10 on some achievement (they reached 10 only through rows counted
-- twice), so the pool goes from 106 schools to 103 and every daily board from the day this lands is
-- dealt from the smaller pool. Step 2 alone moves nothing (measured).
--   APPLY AT 00:00 America/New_York, so no board changes in the middle of a day. HOLD IT until a
--   round owns the College Basketball Grid archive's side of it. Round 653's archive is already live
--   (Release J, origin/main 84d81619) and records the 106 school pool; the pool is indexed by
--   position, so from the day this lands the live game deals different boards for the dates that
--   archive shows, and scripts/simGridArchive.mjs section 5 goes red listing UNC Greensboro, Marshall
--   and Rutgers. Nothing on Round 706's branch regenerates or re-pins that recorded pool, so whoever
--   applies this file regenerates or re-pins the archive in the same 00:00 step, or leaves this file
--   unapplied. The archive also lists "_ Eldredge" as an answer (2026-08-24), which this file
--   deletes. cbb_programs (20260930120400) does not depend on this file and can go first.
--
-- FAILS CLOSED. Every count is checked against the constant it was measured at; any difference
-- raises, and the whole block changes nothing.

do $migration$
declare
  expected_rows_before   constant integer := 43800;
  expected_twin_rows     constant integer := 1600;
  expected_placeholders  constant integer := 3;
  expected_rows_after    constant integer := 42197;
  n integer;
begin
  select count(*) into n from public.ncaa_player_stats;
  if n <> expected_rows_before then
    raise exception 'Round 706: ncaa_player_stats holds % rows, measured %. Nothing was changed.', n, expected_rows_before;
  end if;

  select count(*) into n from public.ncaa_player_stats where player_slug is null;
  if n <> 0 then raise exception 'Round 706: % rows have no player_slug. Nothing was changed.', n; end if;

  -- Every slug held more than once must be the same row, column for column.
  select count(*) into n from (
    select player_slug from public.ncaa_player_stats group by player_slug
    having count(*) > 1 and count(distinct (rk, player_name, points, year_from, year_to, games, games_started, minutes,
      fg, fga, two_p, two_pa, three_p, three_pa, ft, fta, orb, drb, trb, ast, stl, blk, tov, pf,
      fg_pct, two_pct, three_pct, ft_pct, ts_pct, efg_pct, position, schools)) > 1
  ) g;
  if n <> 0 then
    raise exception 'Round 706: % slugs hold rows that differ, so they are not copies. Nothing was changed.', n;
  end if;

  -- STEP 1
  delete from public.ncaa_player_stats d
   using public.ncaa_player_stats k
   where k.player_slug = d.player_slug and k.id < d.id;
  get diagnostics n = row_count;
  if n <> expected_twin_rows then
    raise exception 'Round 706: step 1 deleted % twin rows, measured %. Nothing was changed.', n, expected_twin_rows;
  end if;

  -- STEP 2
  delete from public.ncaa_player_stats where player_name ~ '^\s*_';
  get diagnostics n = row_count;
  if n <> expected_placeholders then
    raise exception 'Round 706: step 2 deleted % placeholder rows, measured %. Nothing was changed.', n, expected_placeholders;
  end if;

  -- The sample checks, read back.
  select count(*) into n from public.ncaa_player_stats where id in (22833, 15491, 22955, 22887);
  if n <> 4 then raise exception 'Round 706: a kept sample row is gone. Nothing was changed.'; end if;
  select count(*) into n from public.ncaa_player_stats where id in (23233, 16691, 23355, 23287, 21867, 32408, 41595);
  if n <> 0 then raise exception 'Round 706: a deleted sample row is still there. Nothing was changed.'; end if;

  select count(*) into n from public.ncaa_player_stats;
  if n <> expected_rows_after then
    raise exception 'Round 706: ncaa_player_stats ends at % rows, expected %. Nothing was changed.', n, expected_rows_after;
  end if;
end
$migration$;
