-- Round 668 fix: the row literally named 'Pepê (dup)'.
--
-- The adversarial review of Round 668 found the soccer search offering a
-- "player" called 'Pepê (dup)' (Gremio, 2023), right beside the Pepe, Pepê
-- and Pêpê rows the round had just split apart. Read on 2026-09-28 through
-- the public REST endpoint:
--   id 156902  'Pepê (dup)'  2023  Grêmio Foot-Ball Porto Alegrense
--              Central Midfield, age 24, Brazil, 3,000,000 USD
--   id 156887  'Pepê'        2023  the same club, position, age,
--              nationality and value
-- So the '(dup)' row is a leftover copy of a row that is still there, and
-- deleting it loses nothing. The code already refuses any name carrying
-- '(dup)' (src/lib/playerSearch.ts, DUP_MARK), so the search does not wait
-- on this migration.
--
-- Fail closed. The row is removed only if it is exactly the one row read
-- above AND another row of the same man duplicates it (the plain name 'Pepê',
-- same club, year and value, and the same age, position and nationality).
-- Otherwise nothing is deleted, nothing is renamed, and the block raises.
-- 'Pepê' is written with a Unicode escape (U+00EA, the precomposed letter the
-- table stores, checked code point by code point) so the file's encoding
-- cannot change what it matches.
--
-- Not in scope here, seen on the same read: 14 more '(dup)' rows, all 2023,
-- each with an exact twin under the plain name. The code hides them too.

do $migration$
declare
  dup_name constant text := U&'Pep\00EA (dup)';
  plain_name constant text := U&'Pep\00EA';
  dup_id constant bigint := 156902;
  n integer;
  twins integer;
begin
  select count(*) into n from public.player_market_values where player_name = dup_name;
  if n <> 1 then
    raise exception 'Round 668: expected exactly one row named %, found %. Nothing was changed.', dup_name, n;
  end if;

  select count(*) into n from public.player_market_values where id = dup_id and player_name = dup_name;
  if n <> 1 then
    raise exception 'Round 668: the row named % is not id %. Nothing was changed.', dup_name, dup_id;
  end if;

  select count(*) into twins
  from public.player_market_values d
  join public.player_market_values t
    on t.id <> d.id
   and t.player_name = plain_name
   and t.club = d.club
   and t.year = d.year
   and t.market_value_usd = d.market_value_usd
   and t.age = d.age
   and t.position = d.position
   and t.nationality = d.nationality
  where d.id = dup_id;
  if twins < 1 then
    raise exception 'Round 668: % (id %) duplicates no % row with the same club, year and value. Nothing was changed.', dup_name, dup_id, plain_name;
  end if;

  delete from public.player_market_values where id = dup_id and player_name = dup_name;
  get diagnostics n = row_count;
  if n <> 1 then
    raise exception 'Round 668: expected to delete one row, deleted %.', n;
  end if;
end
$migration$;
