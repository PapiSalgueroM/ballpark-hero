-- Round 484: the armband comes out of the player's name and becomes a fact.
-- APPLIED 2026-09-06.
--
-- national_team_squads stored captains as "Lionel Messi ( captain )". Measured
-- 2026-09-06: exactly 102 of the 2,784 rows carry it and it is the ONLY
-- parenthetical in the table, so the repair is unambiguous.
--
-- It matters because it lands on precisely the men a player is most likely to
-- type. Round 482 made the Build Your XI validator strip it before comparing,
-- which fixed the verdict but not the string, so anything that DISPLAYS a squad
-- name (the suggestion ranking this table now feeds) would have shown
-- "Lionel Messi ( captain )".
--
-- The captaincy is real information and is kept, in a column, rather than being
-- thrown away with the parentheses. simValidatePlayerRecords section 6 holds
-- both halves: the names stay clean AND the validator keeps stripping anyway,
-- because this cleaning lives in a migration and a re-import would undo it.
-- Control: VPR_CONTROL=captain.
--
-- NOT REPAIRED HERE, and deliberately: 2,724 of the 2,784 rows are shifted a
-- column, so `club` holds a birth date and `position` holds a shirt number. The
-- true club is not recoverable from what was stored, so nothing here pretends
-- to fix it. Only `country`, `player_name` and now `is_captain` are trustworthy,
-- and those are the only three columns any shipped code reads.
alter table public.national_team_squads
  add column if not exists is_captain boolean not null default false;

update public.national_team_squads
   set is_captain = true,
       player_name = regexp_replace(player_name, '\s*\(\s*captain\s*\)\s*$', '')
 where player_name ~ '\s*\(\s*captain\s*\)\s*$';
