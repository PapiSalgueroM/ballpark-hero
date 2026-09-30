-- Round 707 (2026-09-30): soccer_player_club_stints loses its exact copies.
--
-- UNAPPLIED. Written for review; the release manager applies it, in any order
-- with the other two Round 707 files (they touch different rows). Run the whole
-- file through the Supabase MCP. Afterwards scripts/simSoccerStints.mjs reports
-- "would delete 0" for this file.
--
-- MEASURED 2026-09-30, read only SELECTs over all 80,586 rows:
--   1,423 groups of rows that agree on EVERY column but id (player_name, club,
--   first_year, last_year, seasons, nationality, position, debut_year,
--   debut_age, person_key, name_folded), holding 2,888 rows, so 1,465 of them
--   are surplus copies. Rodri at FC Cartagena 2011 twice (ids 65969 and 65970)
--   is one. They most likely come from the market value table's own exact
--   copies (3,838 name, year and club repeats there, Carvajal 2018 twice), which
--   this file does NOT touch.
--   The 2026-09-19 audit said 1,425 groups: it grouped on name, club and years
--   only. The two extra groups differ in `seasons` (Alex Pritchard at
--   Huddersfield 2018 to 2021 as 3 and as 2 seasons, Thomas Murg at PAOK 2021 to
--   2024 likewise), so they are not copies, and they stay: which count is right
--   is a question for the market rows, not a delete.
--
-- WHAT IS KEPT. The lowest id of each group. A surplus copy carries nothing its
-- kept twin does not, so no reader loses a fact: every reader goes by name and
-- club, and a copy only ever doubled a count.
--
-- FAIL CLOSED. The group and surplus counts must be exactly the measured ones,
-- or it raises and deletes nothing. After the delete it proves no exact copy is
-- left and that the table shrank by exactly the surplus.
--
-- UNDO. Each deleted row is an exact copy of a row that stays, so the table can
-- be rebuilt from the kept rows, but there is no reason to: nothing reads a copy.

do $migration$
declare
  expected_groups constant integer := 1423;
  expected_surplus constant integer := 1465;
  groups_found integer;
  surplus_found integer;
  total_before bigint;
  total_after bigint;
  n integer;
begin
  select count(*), coalesce(sum(c - 1), 0)
    into groups_found, surplus_found
  from (
    select count(*) as c
    from public.soccer_player_club_stints
    group by player_name, club, first_year, last_year, seasons, nationality,
             position, debut_year, debut_age, person_key, name_folded
    having count(*) > 1
  ) d;
  if groups_found <> expected_groups or surplus_found <> expected_surplus then
    raise exception 'Round 707: expected % copy groups and % surplus rows, found % and %. The table has moved since 2026-09-30; re-measure first. Nothing was deleted.',
      expected_groups, expected_surplus, groups_found, surplus_found;
  end if;

  select count(*) into total_before from public.soccer_player_club_stints;

  delete from public.soccer_player_club_stints t
  using (
    select id,
           row_number() over (
             partition by player_name, club, first_year, last_year, seasons, nationality,
                          position, debut_year, debut_age, person_key, name_folded
             order by id) as rn
    from public.soccer_player_club_stints
  ) d
  where t.id = d.id and d.rn > 1;
  get diagnostics n = row_count;
  if n <> expected_surplus then
    raise exception 'Round 707: deleted % rows, expected %. Rolled back.', n, expected_surplus;
  end if;

  select count(*) into n
  from (
    select 1
    from public.soccer_player_club_stints
    group by player_name, club, first_year, last_year, seasons, nationality,
             position, debut_year, debut_age, person_key, name_folded
    having count(*) > 1
  ) d;
  if n <> 0 then
    raise exception 'Round 707: % copy groups remain after the delete. Rolled back.', n;
  end if;

  select count(*) into total_after from public.soccer_player_club_stints;
  if total_before - total_after <> expected_surplus then
    raise exception 'Round 707: the table shrank by %, expected %. Rolled back.', total_before - total_after, expected_surplus;
  end if;

  raise notice 'Round 707: % exact copies deleted, % rows before, % after.', expected_surplus, total_before, total_after;
end
$migration$;
