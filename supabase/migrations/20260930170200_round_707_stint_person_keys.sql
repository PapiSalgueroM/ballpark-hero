-- Round 707 (2026-09-30): stint rows take the person_key their market rows carry.
--
-- UNAPPLIED. Written for review; the release manager applies it, in any order
-- with the other two Round 707 files. It is safe to run again at any time, and
-- it is meant to be: whenever a later identity round writes person_key onto
-- player_market_values, running this file carries the split into the stints.
--
-- WHY. One name in soccer_player_club_stints can be several men. "Rodri" holds
-- a Barcelona centre-back aged 21 in 2006, a Betis right midfielder, a Huesca
-- left midfielder and the Manchester City one, all as one career, so the grid
-- accepted Rodri for any of their clubs and his debut year is another man's.
-- Round 668 settled who a row is (src/lib/playerSearch.ts, personKeyOf): its
-- person_key when it carries one, else its stored spelling, and within one
-- spelling a history row is the same man only if its age walks with its year
-- (isSameMan). This file applies the first half of that rule to the stints:
-- a stint row belongs to person K when every market row behind it (same name,
-- same club, a year inside the stint) carries person_key K. Mixed or unkeyed
-- evidence tags nothing, so no row is ever given an identity it cannot prove.
--
-- MEASURED 2026-09-30, read only SELECTs:
--   person_key is NULL on all 141,916 market rows, so today this updates 0 rows
--   and says so. There is nothing to split by person_key yet.
--   The merges it cannot split are listed for the identity round instead. Of the
--   5,496 names with a 2026 market row, 227 carry rows whose birth year (year
--   minus age) jumps by 3 or more between two rows, which is two or more men:
--   Rodri, Gabriel, Joao Pedro, Reece James, Ederson, Wesley, Diogo Costa,
--   Rodrigo Mora, Evanilson, Romulo, Jesus Rodriguez, Gonzalo Garcia, Marquinhos,
--   Fabio Silva, Luis Suarez, Javi Guerra, Luiz Henrique, Nico Gonzalez, Danilo,
--   Lucas Hernandez, Toti, Vanderson, Beto, Pablo and Dodo lead them by 2026
--   value. isSameMan's own one year tolerance flags 774, but 547 of those are a
--   jump of exactly 2, which is how the dataset's ages drift (the 2026 rows hold
--   autumn 2025 ages), so 227 is the honest count of merged names.
--   Not touched here either: Messi has no 2008 market row, so his Barcelona
--   stints carry a one year hole; the market row is the thing to fix, and that
--   belongs to a data round with a source for it.
--
-- NOT A MERGE FIX FOR THE 9 ROWS THAT ALREADY HAVE A KEY. Luis Suarez's nine
-- hand written rows ('luis suarez 1987', short club spellings) keep their key;
-- only rows with a null person_key are considered.

do $migration$
declare
  n integer;
begin
  with evidence as (
    select s.id,
           count(distinct m.person_key) as keys,
           count(*) filter (where m.person_key is null) as unkeyed,
           min(m.person_key) as person_key
    from public.soccer_player_club_stints s
    join public.player_market_values m
      on m.player_name = s.player_name
     and m.club = s.club
     and m.year between s.first_year and s.last_year
    where s.person_key is null
    group by s.id
  )
  update public.soccer_player_club_stints s
     set person_key = e.person_key
    from evidence e
   where e.id = s.id
     and e.keys = 1
     and e.unkeyed = 0;
  get diagnostics n = row_count;
  raise notice 'Round 707: % stint rows took a person_key from their market rows.', n;
end
$migration$;
