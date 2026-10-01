-- Round 706: cfb_qb_stats, the placeholder names.
--
-- NOT APPLIED. Written 2026-09-30 from read only SELECTs; the desktop lane applies it through the
-- Supabase MCP. Fence: scripts/simCollegeTables.mjs reads the constants and the rk list out of this
-- block's code and requires them to agree (rows before minus the list is rows after), runs both
-- copies of the placeholder name rule over the names this file deletes, and, when the host answers,
-- requires the live row count to be the one this file was measured at or the one it leaves.
--
-- No foreign key points at this table (checked in pg_constraint), so nothing is repointed. The
-- natural key, player_slug, is already unique (5,800 rows, 5,800 slugs), and no two rows share a
-- name, school list and seasons, so there is nothing to dedupe.
--
-- THE RULE. A row whose player_name starts with "_" carries a placeholder where the first name
-- should be, because the leaderboard it was scraped from never had one (its slug is the surname
-- alone, "sullivan-1"). That reference site cannot be the second source for a first name, and none
-- of the three could be two sourced, so they are deleted rather than guessed. Their rows, for anyone
-- who can source them against the school's athletics site and a reference site:
--     rk 4151  _ Sullivan  UTEP         2012  390 passing yards  2 TD  (also in cfb_rb_stats)
--     rk 4749  _ Gonzalez  North Texas  2002  10 games   65 passing yards  1 TD
--     rk 4770  _ Hawkins   Texas State  2012   47 passing yards  1 TD  (also in cfb_rb_stats)
-- No game deals from this table at runtime; CFB Higher or Lower's static file (src/data/cfbHLPlayers.ts)
-- was copied from named rows only, and the College Grid key skips placeholders
-- (scripts/genCollegeGridData.mjs, src/lib/placeholderName.ts's rule). The key does not move.
--
-- ALSO KNOWN, NOT TOUCHED: the table is a truncated leaderboard (5,800 rows exactly, nothing before
-- 1980), so absence here proves nothing.
--
-- FAILS CLOSED. Any count that differs from its measured constant raises, and nothing changes.

do $migration$
declare
  expected_rows_before   constant integer := 5800;
  expected_placeholders  constant integer := 3;
  expected_rows_after    constant integer := 5797;
  n integer;
begin
  select count(*) into n from public.cfb_qb_stats;
  if n <> expected_rows_before then
    raise exception 'Round 706: cfb_qb_stats holds % rows, measured %. Nothing was changed.', n, expected_rows_before;
  end if;

  delete from public.cfb_qb_stats
   where player_name ~ '^\s*_'
     and rk in (4151, 4749, 4770);
  get diagnostics n = row_count;
  if n <> expected_placeholders then
    raise exception 'Round 706: deleted % placeholder rows, measured %. Nothing was changed.', n, expected_placeholders;
  end if;

  select count(*) into n from public.cfb_qb_stats where player_name ~ '^\s*_';
  if n <> 0 then raise exception 'Round 706: % placeholder rows remain. Nothing was changed.', n; end if;

  select count(*) into n from public.cfb_qb_stats;
  if n <> expected_rows_after then
    raise exception 'Round 706: cfb_qb_stats ends at % rows, expected %. Nothing was changed.', n, expected_rows_after;
  end if;
end
$migration$;
