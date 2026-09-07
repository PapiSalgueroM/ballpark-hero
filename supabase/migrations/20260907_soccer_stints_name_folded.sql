-- Round 498: the soccer stint lookup stops being blind to accents and punctuation.
--
-- Two shipped functions read soccer_player_club_stints by name and BOTH do it
-- with .ilike against the RAW player_name column:
--   soccer-grid-validate  the full name lookup and the surname fallback
--   football-connect4-validate  the Round 497 confirm-only club pass
-- So a player typed in plain letters never reaches a stored name that carries
-- an accent, and this is the same defect Round 486 fixed for the NBA table.
-- One column serves both functions, which is the repo's own rule: a new sport
-- is data, not a new engine, and a bug found in one place is checked in every
-- sibling that shares the shape.
--
-- MEASURED 2026-09-07 over all 80,586 rows and 27,851 distinct player names:
--   6,270 distinct names (22.5 percent) change under folding, so no plain
--     spelling can reach them. 18,833 of the 80,586 rows.
--   313 of those contain a letter with NO canonical decomposition (Turkish
--     dotless i, Danish ae and slashed o, Polish barred l), so NFD alone still
--     misses them and the transliteration table is required, not optional.
--   Proved against the live endpoint rather than argued: ilike with the folded
--     spelling returned no rows for 5 of 5 sampled names.
--
-- IT IS NOT ONLY ACCENTS, and calling it an accent fix would under-describe it.
-- The fold flattens anything that is not a letter or a digit to a space, so
-- "Aaron Wan-Bissaka" is unreachable by typing "aaron wan bissaka" with no
-- accent involved anywhere. The hyphen alone does it.
--
-- The fold mirrors the functions' own norm(): lowercase, accents stripped,
-- anything not a letter or digit flattened to a space, runs of space collapsed,
-- trimmed. It has to match exactly, or the column is a second opinion rather
-- than an index. Round 486 learned that the hard way: Postgres unaccent handles
-- the no-decomposition letters and the JS did not, so the two folds disagreed
-- and no typed spelling could reach the player. The DATABASE was right and the
-- functions are corrected to match, with an explicit transliteration table.
-- simSoccerStintNameFold compares the two folds row by row so they cannot drift.
--
-- Backfilled rather than GENERATED: unaccent is STABLE, not IMMUTABLE, so a
-- generated column cannot call it. The fence is what catches a re-import that
-- forgets to refill it.
create extension if not exists unaccent;

alter table public.soccer_player_club_stints
  add column if not exists name_folded text;

update public.soccer_player_club_stints
   set name_folded = btrim(regexp_replace(
         regexp_replace(lower(unaccent(player_name)), '[^a-z0-9 ]+', ' ', 'g'),
         '\s+', ' ', 'g'));

create index if not exists idx_soccer_stints_name_folded
  on public.soccer_player_club_stints (name_folded);
