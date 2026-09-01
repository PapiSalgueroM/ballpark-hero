-- Round 389, applied 2026-09-01 through the Supabase MCP as
-- round_389_world_cup_2014_2018_dedupe. Kept here so the change is readable
-- from the repo; the deployed database is the source of truth.
--
-- world_cup_players held every 2014 squad row three times and every 2018 row
-- twice: 2,208 rows for 736 (player, nation) pairs in 2014 and 1,472 for 736
-- in 2018. Checked before deleting: within every duplicated group the copies
-- agree on position, squad number, date of birth, caps, goals and club (0
-- groups with a differing copy), so the surplus carries no information. The
-- lowest id in each group stays.
delete from public.world_cup_players a
using public.world_cup_players b
where a.world_cup_year in (2014, 2018)
  and b.world_cup_year = a.world_cup_year
  and b.player_name = a.player_name
  and b.nationality is not distinct from a.nationality
  and b.id < a.id;

-- Expected: 1,472 rows removed for 2014 and 736 for 2018, leaving 736 each.
-- Rollback: the removed rows were exact copies; there is nothing to restore
-- that the remaining row does not already say.
