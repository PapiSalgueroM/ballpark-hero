-- Round 706: cfb_rb_stats, the placeholder names.
--
-- NOT APPLIED. Written 2026-09-30 from read only SELECTs; the desktop lane applies it through the
-- Supabase MCP. Fence: scripts/simCollegeTables.mjs reads the constants and the rk list out of this
-- block's code and requires them to agree (rows before minus the list is rows after), runs both
-- copies of the placeholder name rule over the names this file deletes, and, when the host answers,
-- requires the live row count to be the one this file was measured at or the one it leaves.
--
-- No foreign key points at this table (checked in pg_constraint), so nothing is repointed. The
-- natural key, player_slug, is already unique (14,800 rows, 14,800 slugs).
--
-- THE RULE. A row whose player_name starts with "_" carries a placeholder where the first name
-- should be, because the leaderboard it was scraped from never had one (its slug is the surname
-- alone). That reference site cannot be the second source for a first name, and none of the 13 could
-- be two sourced, so they are deleted rather than guessed. Their rows, for anyone who can source
-- them against the school's athletics site and a reference site (rushing yards, rushing TD):
--     rk 10242  _ Sullivan        UTEP               2012  240 yds  2  (also in cfb_qb_stats)
--     rk 11565  _ Debacco         Bowling Green      2001   64 yds  1
--     rk 11574  _ Delancellotti   Texas State        2012   29 yds  1
--     rk 11864  _ Eonte           New Mexico         2001   53 yds  1
--     rk 12048  _ Green           Cincinnati         2012   70 yds  1
--     rk 12105  _ Hawkins         Texas State        2012  113 yds  1  (also in cfb_qb_stats)
--     rk 13117  _ Lowe            Texas State        2012   76 yds  1
--     rk 13514  _ Murphy          Appalachian State  1981   26 yds  1
--     rk 13602  _ Oduah           Memphis            2002   12 yds  1
--     rk 13612  _ Ordione         San Diego State    2002    1 yd   1
--     rk 13700  _ Polamalu        Navy               2012   39 yds  1
--     rk 13760  _ Ratliff         North Texas        1981   50 yds  1
--     rk 13778  _ Reese           Georgia            1995   23 yds  1
-- No game deals from this table at runtime, and the College Grid key skips placeholders
-- (scripts/genCollegeGridData.mjs). The key does not move.
--
-- ALSO KNOWN, NOT TOUCHED: two pairs share a name, a school and seasons under two different source
-- slugs with the same rushing line: Bentavious Thompson (UCF 2018 to 2020, rk 2586 and 2587, 189
-- carries, 1,136 yards, 13 TD; 30 and 35 games) and Chris Johnson (Southern Mississippi 2004 to 2007,
-- rk 7567 and 7568, identical in every column). By the natural key they are two players; whether the
-- source split one man in two needs a source, so neither row is deleted here. The table is also a
-- truncated leaderboard (14,800 rows exactly, nothing before 1980).
--
-- FAILS CLOSED. Any count that differs from its measured constant raises, and nothing changes.

do $migration$
declare
  expected_rows_before   constant integer := 14800;
  expected_placeholders  constant integer := 13;
  expected_rows_after    constant integer := 14787;
  n integer;
begin
  select count(*) into n from public.cfb_rb_stats;
  if n <> expected_rows_before then
    raise exception 'Round 706: cfb_rb_stats holds % rows, measured %. Nothing was changed.', n, expected_rows_before;
  end if;

  delete from public.cfb_rb_stats
   where player_name ~ '^\s*_'
     and rk in (10242, 11565, 11574, 11864, 12048, 12105, 13117, 13514, 13602, 13612, 13700, 13760, 13778);
  get diagnostics n = row_count;
  if n <> expected_placeholders then
    raise exception 'Round 706: deleted % placeholder rows, measured %. Nothing was changed.', n, expected_placeholders;
  end if;

  select count(*) into n from public.cfb_rb_stats where player_name ~ '^\s*_';
  if n <> 0 then raise exception 'Round 706: % placeholder rows remain. Nothing was changed.', n; end if;

  select count(*) into n from public.cfb_rb_stats;
  if n <> expected_rows_after then
    raise exception 'Round 706: cfb_rb_stats ends at % rows, expected %. Nothing was changed.', n, expected_rows_after;
  end if;
end
$migration$;
