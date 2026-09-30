-- Round 706: cbb_programs, three schools filed twice.
--
-- NOT APPLIED. Written 2026-09-30 from read only SELECTs; the desktop lane applies it through the
-- Supabase MCP. Fence: scripts/simCollegeTables.mjs runs the game's own rule (src/lib/cbbPrograms.ts
-- dedupePrograms) on a pull of the live table and requires it to hide exactly the rows this file
-- deletes and to merge exactly the common names this file writes.
--
-- cbb_daily.program_id has no foreign key and cbb_daily is empty (0 rows); the block below refuses to
-- run if any cbb_daily row points at a row it deletes.
--
-- THE RULE (the same in src/lib/cbbPrograms.ts). Two rows are one program when their names fold alike
-- (lower case, letters and digits only), or when they name the same place and the same home court
-- (region_hint folded, and mascot_hint read after its last "play at" or "plays at", a leading "the"
-- dropped, folded). Measured over all 281 rows: exactly three pairs.
--   Loyola Chicago (fc98aa58, 2026-06-23) and the dashed spelling of the same name (996c65ec,
--     2026-07-03). The dashed row said "0 national titles through 2025"; Loyola won the 1963 title
--     (scripts/simCbbPrograms.mjs's champion list, two sourced 2026-09-11), which the kept row says.
--   Loyola (LA) (58952bad, 2026-07-03) and Loyola Marymount (5a1ce2ab, 2026-07-04): one school, the
--     same Gersten Pavilion, Los Angeles.
--   Seattle (c8187d90, 2026-07-03) and Seattle University (aa3cc051, 2026-07-04): one school, the
--     same Redhawk Center, Seattle.
-- The row kept is the one its twin lists among its common names, else the earliest created (a uuid
-- has no "lowest"). So Loyola Chicago (both list each other once folded; it is the earlier), Loyola
-- Marymount (Loyola (LA) lists it) and Seattle (neither lists the other; it is the earlier). The kept
-- row takes over its twin's common names and its twin's own name where it lacks them, so "Seattle U",
-- "Sister Jean's Ramblers" and "Loyola (LA)" (the name the site itself showed until this round) still
-- find the program. Nothing else in any kept row changes.
--
-- WHAT THE GAME SEES. The page has hidden these rows since Round 706's code and its search already
-- offers the merged names, so this file writes exactly the names the code merges and deletes exactly
-- the rows it hides. The daily pick is pool[date % pool.length] over the rows ordered by id, and the
-- page keeps that index over the rows as they arrive (a twin's slot deals its kept row), so the code
-- moved no daily; this file shortens the pool from 281 to 278 and so moves the daily once, which is
-- why it is applied at 00:00 America/New_York, together with the ncaa migration and Round 653.
--
-- FAILS CLOSED. Every statement checks the value it replaces; any difference raises, and nothing
-- changes.

do $migration$
declare
  expected_rows_before constant integer := 281;
  expected_rows_after  constant integer := 278;
  dashed constant text := U&'Loyola\2013Chicago';
  n integer;
begin
  select count(*) into n from public.cbb_programs;
  if n <> expected_rows_before then
    raise exception 'Round 706: cbb_programs holds % rows, measured %. Nothing was changed.', n, expected_rows_before;
  end if;

  -- The rule, rerun here: exactly the three pairs, nothing else.
  with f as (
    select id, lower(regexp_replace(school_name, '[^A-Za-z0-9]+', '', 'g')) as name_key,
           lower(regexp_replace(region_hint, '[^A-Za-z0-9]+', '', 'g')) as place,
           lower(regexp_replace(regexp_replace(regexp_replace(mascot_hint, '^.*\mplays? at\s+', '', 'i'), '^the\s+', '', 'i'), '[^A-Za-z0-9]+', '', 'g')) as court
      from public.cbb_programs
  ),
  pairs as (
    select least(a.id::text, b.id::text) as x, greatest(a.id::text, b.id::text) as y
      from f a join f b on a.id < b.id
     where a.name_key = b.name_key
        or (a.place <> '' and a.court <> '' and a.place = b.place and a.court = b.court)
  )
  select count(*) into n from pairs
   where (x, y) not in (
     ('996c65ec-0c78-4b26-be7a-60528dba07e7', 'fc98aa58-42a1-405e-b722-d61938832ae1'),
     ('58952bad-10c4-415c-8ec3-30dc25012c7f', '5a1ce2ab-d589-449b-b1ba-4b22f6e2ab36'),
     ('aa3cc051-60f8-42f8-afad-7174afb58416', 'c8187d90-638d-4a1a-b6de-5222eb277e5e'));
  if n <> 0 then raise exception 'Round 706: % program pairs beyond the three measured. Nothing was changed.', n; end if;

  select count(*) into n from public.cbb_daily
   where program_id in ('996c65ec-0c78-4b26-be7a-60528dba07e7', '58952bad-10c4-415c-8ec3-30dc25012c7f', 'aa3cc051-60f8-42f8-afad-7174afb58416');
  if n <> 0 then raise exception 'Round 706: cbb_daily points at a row this deletes. Nothing was changed.'; end if;

  -- Loyola Chicago takes the dashed twin's one extra name.
  update public.cbb_programs
     set common_names = array['Loyola Chicago', 'Loyola-Chicago', 'Ramblers', 'Loyola', 'Sister Jean''s Ramblers']
   where id = 'fc98aa58-42a1-405e-b722-d61938832ae1'
     and school_name = 'Loyola Chicago'
     and championships_hint = '1 national title (1963)'
     and common_names = array['Loyola Chicago', 'Loyola-Chicago', 'Ramblers', 'Loyola'];
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'Round 706: Loyola Chicago: expected to update 1 row, updated %. Nothing was changed.', n; end if;

  -- Seattle takes Seattle University's two extra names.
  update public.cbb_programs
     set common_names = array['Seattle', 'Redhawks', 'SU', 'Seattle U', 'Seattle University']
   where id = 'c8187d90-638d-4a1a-b6de-5222eb277e5e'
     and school_name = 'Seattle'
     and common_names = array['Seattle', 'Redhawks', 'SU'];
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'Round 706: Seattle: expected to update 1 row, updated %. Nothing was changed.', n; end if;

  -- Loyola Marymount takes its twin's own name, the spelling the site showed until this round.
  update public.cbb_programs
     set common_names = array['Loyola Marymount', 'LMU', 'Lions', 'Loyola (LA)']
   where id = '5a1ce2ab-d589-449b-b1ba-4b22f6e2ab36'
     and school_name = 'Loyola Marymount'
     and common_names = array['Loyola Marymount', 'LMU', 'Lions'];
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'Round 706: Loyola Marymount: expected to update 1 row, updated %. Nothing was changed.', n; end if;

  delete from public.cbb_programs where id = '996c65ec-0c78-4b26-be7a-60528dba07e7'
     and school_name = dashed and championships_hint = '0 national titles through 2025';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'Round 706: the dashed Loyola Chicago: expected to delete 1 row, deleted %. Nothing was changed.', n; end if;

  delete from public.cbb_programs where id = '58952bad-10c4-415c-8ec3-30dc25012c7f'
     and school_name = 'Loyola (LA)';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'Round 706: Loyola (LA): expected to delete 1 row, deleted %. Nothing was changed.', n; end if;

  delete from public.cbb_programs where id = 'aa3cc051-60f8-42f8-afad-7174afb58416'
     and school_name = 'Seattle University';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'Round 706: Seattle University: expected to delete 1 row, deleted %. Nothing was changed.', n; end if;

  select count(*) into n from public.cbb_programs;
  if n <> expected_rows_after then
    raise exception 'Round 706: cbb_programs ends at % rows, expected %. Nothing was changed.', n, expected_rows_after;
  end if;
end
$migration$;
